import { existsSync, realpathSync, writeFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import process from "node:process";

const root = "C:\\mxc-lab\\whole-gateway";
const nodePath = "C:\\Program Files\\nodejs\\node.exe";
const openClawRoot = `${root}\\app\\node_modules\\openclaw`;
const openClawEntry = `${openClawRoot}\\openclaw.mjs`;
const peerLink = `${root}\\state\\npm\\projects\\openclaw-codex-8902d781d4__openclaw-generation__g-49fd4dbfde2c5057\\node_modules\\@openclaw\\codex\\node_modules\\openclaw`;

if (!existsSync(`${peerLink}\\package.json`)) {
  throw new Error(`Codex peer payload is missing: ${peerLink}`);
}

process.stdout.write(`BOOTSTRAP_PID=${process.pid}\n`);
process.stdout.write(`CODEX_PEER_LINK=${peerLink}\n`);
process.stdout.write(`CODEX_PEER_PAYLOAD=${realpathSync(peerLink)}\n`);

const gateway = spawn(
  nodePath,
  [openClawEntry, "gateway", "run", "--port", "19789", "--bind", "loopback", "--verbose"],
  {
    cwd: `${root}\\workspace`,
    env: process.env,
    stdio: "inherit",
    windowsHide: true,
  },
);

process.stdout.write(`GATEWAY_PID=${gateway.pid ?? "unknown"}\n`);

let stopping = false;
function stop(signal) {
  if (stopping) return;
  stopping = true;
  if (gateway.exitCode === null) gateway.kill(signal);
}

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));
gateway.on("error", (error) => {
  process.stderr.write(`${error.stack ?? error.toString()}\n`);
  process.exitCode = 1;
});
gateway.on("exit", (code, signal) => {
  process.stdout.write(`GATEWAY_EXIT_CODE=${code ?? "null"}\n`);
  process.stdout.write(`GATEWAY_EXIT_SIGNAL=${signal ?? "none"}\n`);
  process.exitCode = code ?? (signal ? 1 : 0);
});

function runCli(label, args, timeout = 120_000) {
  const result = spawnSync(nodePath, [openClawEntry, ...args], {
    cwd: `${root}\\workspace`,
    env: process.env,
    encoding: "utf8",
    timeout,
    windowsHide: true,
  });
  const record = [
    `label=${label}`,
    `pid=${result.pid ?? "unknown"}`,
    `status=${result.status ?? "null"}`,
    `signal=${result.signal ?? "none"}`,
    `error=${result.error?.stack ?? result.error?.toString() ?? "none"}`,
    "--- stdout ---",
    result.stdout ?? "",
    "--- stderr ---",
    result.stderr ?? "",
  ].join("\n");
  writeFileSync(`${root}\\logs\\internal-${label}.txt`, `${record}\n`, "utf8");
  process.stdout.write(`INTERNAL_COMMAND=${label} STATUS=${result.status ?? "null"}\n`);
  return result;
}

if (process.env.WHOLE_GATEWAY_RUN_EXPERIMENTS === "1") {
  await new Promise((resolve) => setTimeout(resolve, 20_000));
  runCli("gateway-health", ["gateway", "health", "--json"]);
  runCli("devices-list-before", ["devices", "list", "--json"]);
  runCli("devices-approve-latest", ["devices", "approve", "--latest", "--json"]);
  runCli("devices-list-after", ["devices", "list", "--json"]);
  runCli("gateway-probe", ["gateway", "probe", "--json"]);
  runCli("tools-catalog", ["gateway", "call", "tools.catalog", "--params", JSON.stringify({ agentId: "whole-gateway", includePlugins: true }), "--json"]);
  runCli("tools-invoke-direct", ["gateway", "call", "tools.invoke", "--params", JSON.stringify({ name: "direct_fs_probe", agentId: "whole-gateway", args: {} }), "--json"]);
  runCli(
    "agent-exec",
    [
      "agent",
      "--agent",
      "whole-gateway",
      "--session-id",
      `whole-gateway-exec-${Date.now()}`,
      "--message-file",
      `${root}\\config\\exec-prompt.txt`,
      "--json",
      "--verbose",
      "on",
      "--timeout",
      "600",
    ],
    660_000,
  );
  runCli(
    "agent-direct-tool",
    [
      "agent",
      "--agent",
      "whole-gateway",
      "--session-id",
      `whole-gateway-direct-${Date.now()}`,
      "--message-file",
      `${root}\\config\\direct-tool-prompt.txt`,
      "--json",
      "--verbose",
      "on",
      "--timeout",
      "600",
    ],
    660_000,
  );
  process.stdout.write("INTERNAL_EXPERIMENTS_COMPLETE=true\n");
}
