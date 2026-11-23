import pty from "node-pty";
import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { getPtyShellLaunch, augmentPath, isWindows } from "./platform.js";
import { parseAgyUsage } from "./parser.js";
import { preparePtyRuntime } from "./ptySupport.js";
import { closePtyChild } from "./ptyCleanup.js";

const ANSI_PATTERN = /\x1b\[[0-9;?=>]*[ -/]*[@-~]/g;
const OSC_PATTERN = /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;
const SINGLE_ESC_PATTERN = /\x1b[@-_]/g;
const CONPTY_NOISE_PATTERN = /C:\\.*node-pty\\lib\\conpty_console_list_agent\.js[\s\S]*$/i;

export function runAgyUsagePty(options = {}) {
  const timeoutMs = options.timeoutMs ?? 35_000;
  const settleAfterUsageMs = options.settleAfterUsageMs ?? 300;

  return new Promise((resolve) => {
    let output = "";
    let settled = false;
    let usageAttempted = false;
    let usageCommandCount = 0;
    let trustPromptAccepted = false;
    let settleTimer = null;
    const eventLog = [];
    let child;

    try {
      const env = augmentPath({ ...process.env });
      const command = isWindows()
        ? 'agy --settings "{\\"altScreenMode\\":\\"never\\"}"'
        : "agy --settings '{\"altScreenMode\":\"never\"}'";
      const launch = getPtyShellLaunch(command);
      preparePtyRuntime();
      child = pty.spawn(launch.file, launch.args, {
        cols: 120,
        rows: 34,
        cwd: options.cwd ?? process.cwd(),
        env,
        ...(isWindows() ? { hide: true } : {})
      });
      eventLog.push(`${timestamp()} SPAWN agy`);
    } catch (error) {
      const failureReason = error instanceof Error ? error.message : String(error);
      resolve({
        ok: false,
        stdout: "",
        stderr: failureReason,
        code: null,
        debugLogPath: writeDebugLog({
          ok: false,
          rawOutput: output,
          cleanedOutput: "",
          failureReason,
          eventLog
        })
      });
      return;
    }

    const finish = async (ok) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      usageRetryTimers.forEach(clearTimeout);
      if (settleTimer) {
        clearTimeout(settleTimer);
      }

      await closePtyChild(child, eventLog, {
        exitInput: "\u001b/quit\r",
        killDelayMs: 250,
        timestamp
      });

      const cleanedOutput = cleanTerminalOutput(output);
      const failureReason = ok ? "" : buildFailureReason(output, usageAttempted);

      resolve({
        ok,
        stdout: cleanedOutput,
        stderr: failureReason,
        code: ok ? 0 : null,
        debugLogPath: writeDebugLog({
          ok,
          rawOutput: output,
          cleanedOutput,
          failureReason,
          eventLog
        })
      });
    };

    const timer = setTimeout(() => finish(false), timeoutMs);
    const usageRetryTimers = [3_500, 7_000, 11_000, 16_000].map((delay) => setTimeout(() => {
      if (settled || hasAgyUsage(output)) {
        return;
      }

      const sent = trySendUsageCommand(child, output, usageCommandCount, eventLog);
      usageAttempted = sent || usageAttempted;
      if (sent) {
        usageCommandCount += 1;
      }
    }, delay));

    child.onData((chunk) => {
      eventLog.push(`${timestamp()} DATA ${truncate(chunk.replace(/\r/g, "\\r").replace(/\n/g, "\\n"), 220)}`);
      output += chunk;

      if (!trustPromptAccepted && isTrustPrompt(output)) {
        trustPromptAccepted = true;
        eventLog.push(`${timestamp()} EVENT accept-trust-prompt`);
        try {
          child.write("\r");
        } catch {
          // Let the normal timeout path report the failure.
        }
        return;
      }

      if (isReadyForUsageCommand(output) && !hasAgyUsage(output) && usageCommandCount === 0) {
        const sent = trySendUsageCommand(child, output, usageCommandCount, eventLog);
        usageAttempted = sent || usageAttempted;
        if (sent) {
          usageCommandCount += 1;
        }
      }

      if (hasAgyUsage(output)) {
        if (settleTimer) {
          clearTimeout(settleTimer);
        }

        settleTimer = setTimeout(() => {
          eventLog.push(`${timestamp()} EVENT agy-usage-settled`);
          finish(true);
        }, settleAfterUsageMs);
      }
    });

    child.onExit(() => {
      eventLog.push(`${timestamp()} EXIT`);
      finish(hasAgyUsage(output));
    });
  });
}

function isReadyForUsageCommand(output) {
  const cleaned = cleanTerminalOutput(output);
  if (isTrustPrompt(output)) {
    return false;
  }

  return /\?\s*for\s*shortcuts/i.test(cleaned)
    || (/Antigravity\s+CLI/i.test(cleaned) && />/i.test(cleaned));
}

function isTrustPrompt(output) {
  const cleaned = cleanTerminalOutput(output);
  return /do\s+you\s+trust\s+the\s+files\s+in\s+this\s+folder/i.test(cleaned)
    || /enter\s+to\s+confirm\s+.*esc\s+to\s+cancel/i.test(cleaned);
}

function hasAgyUsage(output) {
  const cleaned = cleanTerminalOutput(output);
  const parsed = parseAgyUsage(cleaned);
  return Boolean(parsed?.primary && parsed?.weekly) || parsed !== null;
}

function cleanTerminalOutput(value) {
  return value
    .replace(OSC_PATTERN, "")
    .replace(ANSI_PATTERN, "")
    .replace(SINGLE_ESC_PATTERN, "")
    .replace(CONPTY_NOISE_PATTERN, "")
    .replace(/\r/g, "\n")
    .replace(/[\u2500-\u257f]+/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function trySendUsageCommand(child, output, usageCommandCount, eventLog) {
  if (usageCommandCount >= 3 || !isReadyForUsageCommand(output)) {
    return false;
  }

  try {
    eventLog.push(`${timestamp()} WRITE /usage`);
    child.write("/usage\r");
    return true;
  } catch {
    return false;
  }
}

function buildFailureReason(output, usageAttempted) {
  const cleaned = cleanTerminalOutput(output).replace(/\s+/g, " ");
  if (!usageAttempted) {
    return cleaned ? `Prompt not ready: ${cleaned.slice(0, 140)}` : "Prompt not ready";
  }

  if (!cleaned) {
    return "No output captured";
  }

  return `Unexpected output: ${cleaned.slice(0, 160)}`;
}

function writeDebugLog({ ok, rawOutput, cleanedOutput, failureReason, eventLog }) {
  const logDir = path.join(os.tmpdir(), "ai-usage-widget");
  mkdirSync(logDir, { recursive: true });

  const logPath = path.join(logDir, "agy-debug.log");
  const body = [
    `timestamp=${new Date().toISOString()}`,
    `ok=${ok}`,
    `failure_reason=${failureReason || ""}`,
    "",
    "[events]",
    ...eventLog,
    "",
    "[cleaned_output]",
    cleanedOutput,
    "",
    "[raw_output]",
    rawOutput
  ].join("\n");

  writeFileSync(logPath, body, "utf8");
  return logPath;
}

function truncate(value, maxLength) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
}

function timestamp() {
  return new Date().toISOString();
}
