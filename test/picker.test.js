import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { format } from "../lib/picker.js";

describe("wsl_picker", () => {
  it("formats", () => {
    assert.match(format({ ok: true }), /ok/i);
  });
});
