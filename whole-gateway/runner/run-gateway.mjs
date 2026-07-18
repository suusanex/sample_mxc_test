import {
  appendFileSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import process from "node:process";
import {
  createConfigFromPolicy,
  getPlatformSupport,
  spawnSandboxFromConfig,
} from "../app/node_modules/@microsoft/mxc-sdk/dist/index.js";

const root = "C:\\mxc-lab\\whole-gateway";
const policyPath = `${root}\\config\\mxc-policy.json`;
const logPath = `${root}\\logs\\runner.log`;
const metadataPath = `${root}\\evidence-private\\runner-metadata.json`;
const gatewayTokenPath = `${root}\\state\\gateway-token.txt`;
const nodePath = "C:\\Program Files\\nodejs\\node.exe";
const openClawEntry = `${root}\\app\\node_modules\\openclaw\\openclaw.mjs`;
const containerId = `whole-gateway-${Date.now()}`;
const dryRun = process.argv.includes("--dry-run");
const nodeProbe = process.argv.includes("--node-probe");
const filesystemProbe = process.argv.includes("--filesystem-probe");
const runExperiments = process.argv.includes("--run-experiments");

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  process.stdout.write(line);
  appendFileSync(logPath, line, "utf8");
}

function formatError(error) {
  return error instanceof Error ? error.stack ?? error.toString() : String(error);
}

const policy = JSON.parse(readFileSync(policyPath, "utf8"));
const support = getPlatformSupport();
const config = createConfigFromPolicy(policy, "process", containerId);
config.process.commandLine = nodeProbe
  ? `"${nodePath}" --version`
  : filesystemProbe
    ? `"${nodePath}" "${root}\\runner\\filesystem-probe.mjs"`
    : `"${nodePath}" "${root}\\runner\\gateway-bootstrap.mjs"`;
config.process.cwd = `${root}\\workspace`;
config.process.timeout = 0;
config.processContainer ??= {};
config.processContainer.leastPrivilege = false;

const experimentEnvironment = {
  SystemRoot: "C:\\Windows",
  ComSpec: "C:\\Windows\\System32\\cmd.exe",
  PATH: "C:\\Program Files\\nodejs;C:\\Windows\\System32;C:\\Windows",
  HOME: `${root}\\state`,
  USERPROFILE: `${root}\\state`,
  APPDATA: `${root}\\state\\AppData\\Roaming`,
  LOCALAPPDATA: `${root}\\state\\AppData\\Local`,
  TEMP: `${root}\\temp`,
  TMP: `${root}\\temp`,
  OPENCLAW_STATE_DIR: `${root}\\state`,
  OPENCLAW_CONFIG_PATH: `${root}\\config\\openclaw.json`,
  OPENCLAW_GATEWAY_PORT: "19789",
  OPENCLAW_GATEWAY_TOKEN: readFileSync(gatewayTokenPath, "utf8").trim(),
  CODEX_HOME: `${root}\\state\\.codex`,
  NO_COLOR: "1",
  WHOLE_GATEWAY_RUN_EXPERIMENTS: runExperiments ? "1" : "0",
};

writeFileSync(
  metadataPath,
  `${JSON.stringify({
    capturedAt: new Date().toISOString(),
    runnerPid: process.pid,
    containerId,
    requestedContainment: "process",
    selectedIsolationTier: support.isolationTier ?? null,
    isolationWarnings: support.isolationWarnings ?? [],
    platformSupport: support,
    gatewayEntryPoint: openClawEntry,
    gatewayCommand: config.process.commandLine,
    leastPrivilege: config.processContainer.leastPrivilege,
    usePty: false,
    dryRun,
    nodeProbe,
    filesystemProbe,
    runExperiments,
    fallbackImplemented: false,
    environment: {
      ...experimentEnvironment,
      OPENCLAW_GATEWAY_TOKEN: "<redacted>",
    },
    config,
  }, null, 2)}\n`,
  "utf8",
);

log(`runnerPid=${process.pid}`);
log(`containerId=${containerId}`);
log(`selectedIsolationTier=${support.isolationTier ?? "unknown"}`);
log(`gatewayEntryPoint=${openClawEntry}`);
log(`leastPrivilege=${config.processContainer.leastPrivilege}`);
log(`dryRun=${dryRun}`);
log("fallbackImplemented=false");

let child;
let stopping = false;

function stop(reason) {
  if (stopping) return;
  stopping = true;
  log(`stopReason=${reason}`);
  if (child && child.exitCode === null) {
    child.kill();
  }
}

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));
process.on("exit", () => {
  if (child && child.exitCode === null) child.kill();
});

try {
  child = spawnSandboxFromConfig(
    config,
    {
      usePty: false,
      dryRun,
      debug: true,
      experimental: true,
      logDir: `${root}\\logs`,
    },
    `${root}\\workspace`,
    experimentEnvironment,
  );
  log(`executorPid=${child.pid ?? "unknown"}`);
  child.stdout?.on("data", (chunk) => {
    const value = chunk.toString();
    process.stdout.write(value);
    appendFileSync(logPath, value, "utf8");
  });
  child.stderr?.on("data", (chunk) => {
    const value = chunk.toString();
    process.stderr.write(value);
    appendFileSync(logPath, value, "utf8");
  });
  child.on("error", (error) => {
    log(`childError=${formatError(error)}`);
  });
  child.on("exit", (code, signal) => {
    log(`executorExitCode=${code ?? "null"}`);
    log(`executorExitSignal=${signal ?? "none"}`);
    process.exitCode = code ?? (signal ? 1 : 0);
  });
} catch (error) {
  log(`runnerError=${formatError(error)}`);
  process.exitCode = 1;
}
