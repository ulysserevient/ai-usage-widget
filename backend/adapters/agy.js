import { runAgyUsagePty } from "../agyPty.js";
import { classifyCliFailure } from "../cliFailure.js";
import { parseAgyUsage } from "../parser.js";
import { readyProvider, stateFromFailureKind, unavailableProvider } from "../providerState.js";

export async function getAgyUsage(options = {}) {
  const result = await runAgyUsagePty({ timeoutMs: 35_000, cwd: options.cwd });

  if (!result.ok) {
    return summarizeAgyFailure(result.stderr || result.stdout, result.debugLogPath);
  }

  const usage = parseAgyUsage(result.stdout);
  return usage ? readyProvider("agy", usage) : summarizeAgyFailure(result.stdout, result.debugLogPath);
}

function summarizeAgyFailure(message = "", logPath = "") {
  const normalized = String(message).trim();
  if (!normalized) {
    return unavailableProvider("agy", "no_usage_capability", {
      status: "Antigravity CLI detected; /usage unavailable",
      logPath
    });
  }

  const classified = classifyCliFailure("agy", normalized);
  if (classified.kind !== "unavailable") {
    return unavailableProvider("agy", stateFromFailureKind(classified.kind), {
      status: classified.status,
      detail: normalized,
      logPath
    });
  }

  if (/prompt not ready/i.test(normalized)) {
    return unavailableProvider("agy", "prompt_not_ready", {
      status: "Antigravity CLI detected; prompt not ready",
      detail: normalized,
      logPath
    });
  }

  if (/no output captured/i.test(normalized)) {
    return unavailableProvider("agy", "no_output", {
      status: "Antigravity CLI detected; no /usage output",
      detail: normalized,
      logPath
    });
  }

  return unavailableProvider("agy", "parse_error", {
    status: "Antigravity CLI detected; unexpected output",
    detail: normalized,
    logPath
  });
}
