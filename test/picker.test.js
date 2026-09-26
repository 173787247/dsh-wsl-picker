import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { format, imWorkspaceRoot, resolveStart } from "../lib/picker.js";

describe("wsl_picker", () => {
  it("formats", () => {
    assert.match(format({ ok: true }), /ok/i);
  });

  it("resolves start=im to im-workspace", () => {
    const { abs, quick } = resolveStart({ start: "im" });
    assert.equal(quick, "im");
    assert.equal(abs, imWorkspaceRoot());
  });

  it("resolves empty start to im-workspace", () => {
    const { abs, quick } = resolveStart({ start: "" });
    assert.equal(quick, "im");
    assert.equal(abs, imWorkspaceRoot());
  });

  it("defaults to / when start omitted", () => {
    const { abs, quick } = resolveStart({});
    assert.equal(abs, "/");
    assert.equal(quick, null);
  });
});
