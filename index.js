import { detectWsl } from "./lib/wsl-host.js";
import { formatPicker, listDir, roots } from "./lib/picker.js";

export const name = "dsh-wsl-picker";
export const inject = ["tools", "systemPrompt"];

export function apply(ctx, config = {}) {
  const timeoutMs = positive(config.timeoutMs, 15_000);
  const maxEntries = positive(config.maxEntries, 200);
  const wsl = detectWsl();

  ctx.systemPrompt.section({
    name: "tool:wsl_picker",
    order: 115,
    text: [
      "Use wsl_picker to browse Linux directories (including /mnt drives) when choosing a workspace path.",
      "Only absolute paths under / are allowed; path traversal is rejected.",
      "Prefer Linux-home folders over /mnt/c for project roots.",
    ].join(" "),
  });

  ctx.tools.register({
    name: "wsl_picker",
    description: "Browse Linux directory roots and listings (files/dirs), including /mnt drives.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["action"],
      properties: {
        action: {
          type: "string",
          enum: ["roots", "list"],
          description: "roots = Home,/,/mnt,/mnt/[c-z]; list = directory entries",
        },
        path: {
          type: "string",
          description: "Absolute Linux path for action=list.",
        },
        showHidden: {
          type: "boolean",
          description: "Include dotfiles (default false).",
        },
      },
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: true,
        properties: {
          ok: { type: "boolean" },
          wsl: { type: "boolean" },
          action: { type: "string" },
          roots: { type: "array" },
          entries: { type: "array" },
          error: { type: "string" },
        },
      },
      render: (_args, value) => [{ type: "text", text: formatPicker(value) }],
    },
    timeoutMs,
    isConcurrencySafe: () => true,
    async execute(args) {
      const action = String(args?.action || "").toLowerCase();
      if (!wsl) {
        return { ok: false, wsl: false, action, error: "not running in WSL" };
      }
      if (action === "roots") {
        const result = roots();
        return { wsl: true, action, ...result };
      }
      if (action === "list") {
        const result = listDir(String(args?.path || "").trim(), {
          maxEntries,
          showHidden: Boolean(args?.showHidden),
        });
        return { wsl: true, action, ...result };
      }
      return { ok: false, wsl: true, action, error: "unknown action" };
    },
    presentCall: () => ({ card: "generic", title: "WSL picker" }),
    presentResult: (_args, result) => (
      result.isError
        ? { card: "generic", title: "WSL picker failed", content: result.content }
        : { card: "generic", title: "WSL picker", content: result.content }
    ),
  });
}

function positive(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
