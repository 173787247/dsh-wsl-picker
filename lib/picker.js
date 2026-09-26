import { existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";

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
        description: "Directory to list (default /). Quick chips: /, /home, /mnt, /mnt/c, /mnt/d, im.",
      },
      start: {
        type: "string",
        description: "Starting directory (preferred over path). Empty or 'im' lists ~/.dsh/im-workspace/* quick entries.",
      },
      filter: {
        type: "string",
        description: "Case-insensitive substring filter on entry names.",
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
  if (v.filter) lines.push(`filter: ${v.filter}`);
  for (const e of v.entries || []) lines.push(`${e.type === "dir" ? "[dir]" : "[file]"} ${e.path}`);
  if (v.truncated) lines.push("(truncated)");
  if (v.error) lines.push(`error: ${v.error}`);
  return lines.join("\n");
}

const CHIPS = ["/", "/home", "/mnt", "/mnt/c", "/mnt/d", "/mnt/e", "im"];

export function imWorkspaceRoot() {
  return join(homedir(), ".dsh", "im-workspace");
}

/** Resolve list root from start/path. Empty start or 'im' → ~/.dsh/im-workspace. */
export function resolveStart(args = {}) {
  const hasStart = typeof args.start === "string";
  const startRaw = hasStart ? args.start.trim() : null;
  const pathRaw = typeof args.path === "string" && args.path.trim() ? args.path.trim() : null;

  if (hasStart && (startRaw === "" || startRaw.toLowerCase() === "im")) {
    return { abs: imWorkspaceRoot(), quick: "im" };
  }
  if (startRaw) {
    if (startRaw.toLowerCase() === "im") return { abs: imWorkspaceRoot(), quick: "im" };
    const abs = resolveAbs(startRaw);
    return { abs, quick: null };
  }
  if (pathRaw) {
    if (pathRaw.toLowerCase() === "im") return { abs: imWorkspaceRoot(), quick: "im" };
    return { abs: resolveAbs(pathRaw), quick: null };
  }
  return { abs: "/", quick: null };
}

function resolveAbs(raw) {
  if (raw.startsWith("~/")) return `${homedir()}${raw.slice(1)}`;
  if (raw.startsWith("/")) return resolve(raw);
  return resolve(`/${raw}`);
}

function buildChips() {
  const im = imWorkspaceRoot();
  const chips = CHIPS.filter((c) => {
    if (c === "im") return existsSync(im);
    return existsSync(c) || c === "/";
  });
  return chips;
}

export async function execute(args, config = {}) {
  const maxEntries = Number(config.maxEntries) > 0 ? Number(config.maxEntries) : 200;
  const showHidden = args?.showHidden === true;
  const filterRaw = typeof args?.filter === "string" ? args.filter.trim() : "";
  const filterLc = filterRaw ? filterRaw.toLowerCase() : "";
  const { abs, quick } = resolveStart(args);
  const chips = buildChips();

  if (!abs.startsWith("/")) return { ok: false, path: abs, entries: [], chips, error: "absolute path required" };
  if (!existsSync(abs)) {
    if (quick === "im") {
      return {
        ok: true,
        path: abs,
        parent: resolve(abs, ".."),
        chips,
        entries: [],
        truncated: false,
        filter: filterRaw || undefined,
        hint: "im-workspace not created yet; install/start dsh-wsl-im or mkdir ~/.dsh/im-workspace",
      };
    }
    return { ok: false, path: abs, entries: [], chips, error: "path not found" };
  }
  let st;
  try {
    st = statSync(abs);
  } catch (err) {
    return { ok: false, path: abs, entries: [], chips, error: err.message };
  }
  if (!st.isDirectory()) return { ok: false, path: abs, entries: [], chips, error: "not a directory" };
  let names = [];
  try {
    names = readdirSync(abs);
  } catch (err) {
    return { ok: false, path: abs, entries: [], chips, error: err.message };
  }
  if (!showHidden) names = names.filter((n) => !n.startsWith("."));
  if (filterLc) names = names.filter((n) => n.toLowerCase().includes(filterLc));
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
  return {
    ok: true,
    path: abs,
    parent,
    chips,
    entries,
    truncated,
    filter: filterRaw || undefined,
    quick: quick || undefined,
  };
}
