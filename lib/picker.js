import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";

export function notWsl() {
  return { ok: false, error: "not running in WSL", entries: [] };
}

export function parameters(config = {}) {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      path: {
        type: "string",
        description: "Directory to list (default /). Quick chips: /, /home, /mnt, /mnt/c, /mnt/d.",
      },
      showHidden: { type: "boolean", description: "Include dotfiles (default false)." },
    },
  };
}

export function outputSchema() {
  return {
    type: "object",
    additionalProperties: true,
    properties: {
      ok: { type: "boolean" },
      path: { type: "string" },
      parent: { type: "string" },
      chips: { type: "array", items: { type: "string" } },
      entries: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            path: { type: "string" },
            type: { type: "string" },
          },
        },
      },
      truncated: { type: "boolean" },
      error: { type: "string" },
    },
  };
}

export function format(v) {
  const lines = [`wsl_picker path=${v.path || "?"} ok=${v.ok}`];
  if (v.chips) lines.push(`chips: ${v.chips.join(" ")}`);
  if (v.parent) lines.push(`parent: ${v.parent}`);
  for (const e of v.entries || []) lines.push(`${e.type === "dir" ? "[dir]" : "[file]"} ${e.path}`);
  if (v.truncated) lines.push("(truncated)");
  if (v.error) lines.push(`error: ${v.error}`);
  return lines.join("\n");
}

const CHIPS = ["/", "/home", "/mnt", "/mnt/c", "/mnt/d", "/mnt/e"];

export async function execute(args, config = {}) {
  const maxEntries = Number(config.maxEntries) > 0 ? Number(config.maxEntries) : 200;
  const showHidden = args?.showHidden === true;
  const raw = typeof args?.path === "string" && args.path.trim() ? args.path.trim() : "/";
  const abs = resolve(raw.startsWith("/") ? raw : `/${raw}`);
  if (!abs.startsWith("/")) return { ok: false, path: abs, entries: [], error: "absolute path required" };
  if (!existsSync(abs)) return { ok: false, path: abs, entries: [], chips: CHIPS, error: "path not found" };
  let st;
  try {
    st = statSync(abs);
  } catch (err) {
    return { ok: false, path: abs, entries: [], error: err.message };
  }
  if (!st.isDirectory()) return { ok: false, path: abs, entries: [], error: "not a directory" };
  let names = [];
  try {
    names = readdirSync(abs);
  } catch (err) {
    return { ok: false, path: abs, entries: [], error: err.message };
  }
  if (!showHidden) names = names.filter((n) => !n.startsWith("."));
  names.sort((a, b) => a.localeCompare(b));
  const truncated = names.length > maxEntries;
  names = names.slice(0, maxEntries);
  const entries = [];
  for (const name of names) {
    const p = join(abs, name);
    let type = "file";
    try {
      type = statSync(p).isDirectory() ? "dir" : "file";
    } catch {
      type = "other";
    }
    entries.push({ name, path: p, type });
  }
  const parent = abs === "/" ? "/" : resolve(abs, "..");
  return { ok: true, path: abs, parent, chips: CHIPS.filter((c) => existsSync(c) || c === "/"), entries, truncated };
}
