import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatPicker,
  isSafeBrowsePath,
  listDir,
  resolveJailPath,
  roots,
} from "../lib/picker.js";

describe("wsl_picker", () => {
  it("jails unsafe paths", () => {
    assert.equal(isSafeBrowsePath("/home/a"), true);
    assert.equal(isSafeBrowsePath("rel"), false);
    assert.equal(isSafeBrowsePath("/a\0b"), false);
    assert.equal(resolveJailPath("/tmp/../etc/passwd").ok, false);
  });

  it("roots include Home / /mnt", () => {
    const r = roots({
      home: "/home/dev",
      exists: (p) => p === "/mnt" || p === "/mnt/c",
      readDir: (p) => (p === "/mnt" ? ["c", "wsl"] : []),
    });
    assert.equal(r.ok, true);
    const paths = r.roots.map((x) => x.path);
    assert.ok(paths.includes("/home/dev"));
    assert.ok(paths.includes("/"));
    assert.ok(paths.includes("/mnt"));
    assert.ok(paths.includes("/mnt/c"));
  });

  it("lists files and dirs with maxEntries", () => {
    const root = "/home/dev/proj";
    const tree = {
      [root]: { dir: true, children: ["a.txt", "sub", ".hidden"] },
      [`${root}/a.txt`]: { dir: false },
      [`${root}/sub`]: { dir: true, children: [] },
      [`${root}/.hidden`]: { dir: false },
    };
    const deps = {
      exists: (p) => Boolean(tree[p]),
      realpath: (p) => p,
      stat: (p) => ({ isDirectory: () => Boolean(tree[p]?.dir) }),
      readDir: (p) => tree[p]?.children || [],
    };
    const listed = listDir(root, { ...deps, maxEntries: 200, showHidden: false });
    assert.equal(listed.ok, true);
    assert.ok(listed.entries.some((e) => e.name === "a.txt" && e.type === "file"));
    assert.ok(listed.entries.some((e) => e.name === "sub" && e.type === "dir"));
    assert.ok(!listed.entries.some((e) => e.name === ".hidden"));
    const withHidden = listDir(root, { ...deps, showHidden: true });
    assert.ok(withHidden.entries.some((e) => e.name === ".hidden"));
    const capped = listDir(root, { ...deps, maxEntries: 1 });
    assert.equal(capped.entries.length, 1);
    assert.equal(capped.truncated, true);
  });

  it("formats", () => {
    assert.match(
      formatPicker({ ok: true, action: "roots", roots: [{ label: "Home", path: "/home/a" }] }),
      /Home/,
    );
  });
});
