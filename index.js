import { detectWsl } from "./lib/wsl-host.js";
import * as core from "./lib/picker.js";

export const name = "dsh-wsl-picker";
export const inject = ["tools", "systemPrompt"];

export function apply(ctx, config = {}) {
  const timeoutMs = positive(config.timeoutMs, 15_000);
  const wsl = detectWsl();

  ctx.systemPrompt.section({
    name: "tool:wsl_picker",
    order: 111,
    text: "Use wsl_picker for WSL/Windows interop: Browse WSL directories from / and /mnt drives for workspace picking.",
  });

  ctx.tools.register({
    name: "wsl_picker",
    description: "Browse WSL directories from / and /mnt drives for workspace picking.",
    parameters: core.parameters(config),
    output: {
      schema: core.outputSchema(),
      render: (_args, value) => [{ type: "text", text: core.format(value) }],
    },
    timeoutMs,
    isConcurrencySafe: () => true,
    async execute(args) {
      if (!wsl) return core.notWsl ? core.notWsl() : { ok: false, error: "not running in WSL" };
      return core.execute(args, config);
    },
    presentCall: () => ({ card: "generic", title: "wsl_picker" }),
    presentResult: (_args, result) => (
      result.isError
        ? { card: "generic", title: "wsl_picker failed", content: result.content }
        : { card: "generic", title: "wsl_picker", content: result.content }
    ),
  });
}

function positive(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
