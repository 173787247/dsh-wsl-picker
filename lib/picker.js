import { existsSync, readdirSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";

function posixJoin(base, name) {
  if (base === "/") return `/${name}`;
  return `${base.replace(/\/+$/, "")}/${name}`;
}

export function isSafeBrowsePath(raw) {
  if (typeof raw !== "string") return false;
  const p = raw.trim();
  if (p.length < 1 || p.length > 1024) return false;
  if (p.includes("\0")) return false;
  if (p.includes("\\")) return false;
  if (!p.startsWith("/")) return false;
  if (p.includes("//")) return false;
  return true;
}

/** Reject path traversal / escaping the absolute Linux root jail. */
export function resolveJailPath(raw, { exists = existsSync, realpath = realpathSync } = {}) {
  if (!isSafeBrowsePath(raw)) {
    return { ok: false, error: "unsafe path (absolute Linux path required, no NUL)" };
  }
  const p = raw.trim();
  if (/(^|\/)\.\.(\/|$)/.test(p)) {
    return { ok: false, error: "path traversal rejected" };
  }
  try {
    if (exists(p)) {
      const real = realpath(p).replace(/\\/g, "/");
      if (!real.startsWith("/") || real.includes("\0")) {
        return { ok: false, error: "path traversal rejected" };
      }
      return { ok: true, path: real };
    }
  } catch {
    return { ok: false, error: "unreadable" };
  }
  return { ok: true, path: p };
}

export function listMntDrives({ exists = existsSync, readDir = readdirSync } = {}) {
  if (!exists("/mnt")) return [];
  let names = [];
  try {
    names = readDir("/mnt");
  } catch {
    return [];
  }
  return names
    .filter((name) => /^[c-zC-Z]$/.test(name))
    .filter((name) => exists(`/mnt/${name}`) || exists(`/mnt/${name.toLowerCase()}`))
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map((letter) => {
      const L = letter.toLowerCase();
      return { letter: L, path: `/mnt/${L}`, label: `${L.toUpperCase()}:` };
    });
}

export function roots({ home = homedir(), exists = existsSync, readDir = readdirSync } = {}) {
  const items = [
    { id: "home", label: "Home", path: home || "/" },
    { id: "root", label: "/", path: "/" },
    { id: "mnt", label: "/mnt", path: "/mnt" },
  ];
  for (const drive of listMntDrives({ exists, readDir })) {
    items.push({ id: `mnt-${drive.letter}`, label: drive.label, path: drive.path });
  }
  return { ok: true, roots: items };
}

export function listDir(
  abs,
  {
    exists = existsSync,
    realpath = realpathSync,
    stat = statSync,
    readDir = readdirSync,
    maxEntries = 200,
    showHidden = false,
  } = {},
) {
  const jailed = resolveJailPath(abs, { exists, realpath });
  if (!jailed.ok) return jailed;
  const path = jailed.path;
  if (!exists(path)) return { ok: false, error: "not found", path };
  let st;
  try {
    st = stat(path);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err), path };
  }
  if (!st.isDirectory()) return { ok: false, error: "not a directory", path };

  let names = [];
  try {
    names = readDir(path);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err), path };
  }

  const visible = names.filter((name) => {
    if (name === "." || name === ".." || name.includes("\0")) return false;
    if (!showHidden && name.startsWith(".")) return false;
    return true;
  });
  const sorted = [...visible].sort((a, b) => a.localeCompare(b));
  const entries = [];
  for (const name of sorted) {
    if (entries.length >= maxEntries) break;
    const child = posixJoin(path, name);
    let type = "file";
    try {
      type = stat(child).isDirectory() ? "dir" : "file";
    } catch {
      continue;
    }
    entries.push({ name, type, path: child });
  }

  return {
    ok: true,
    path,
    entries,
    truncated: visible.length > entries.length,
    maxEntries,
  };
}

export function formatPicker(value) {
  if (!value.ok) return `wsl_picker failed: ${value.error || "denied"}`;
  const lines = [`wsl_picker ${value.action || "result"}`];
  if (Array.isArray(value.roots)) {
    lines.push(`roots: ${value.roots.length}`);
    for (const r of value.roots) lines.push(`- ${r.label}: ${r.path}`);
  }
  if (value.path) lines.push(`path: ${value.path}`);
  if (Array.isArray(value.entries)) {
    lines.push(`entries: ${value.entries.length}${value.truncated ? " (truncated)" : ""}`);
    for (const e of value.entries.slice(0, 40)) {
      lines.push(`- ${e.type === "dir" ? `${e.name}/` : e.name}`);
    }
    if (value.entries.length > 40) lines.push(`… ${value.entries.length - 40} more`);
  }
  return lines.join("\n");
}
