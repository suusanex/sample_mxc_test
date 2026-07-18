import { readFileSync, realpathSync } from "node:fs";

const paths = [
  "C:\\mxc-lab\\whole-gateway\\app\\node_modules\\openclaw",
  "C:\\mxc-lab\\whole-gateway\\state\\npm\\projects\\openclaw-codex-8902d781d4__openclaw-generation__g-49fd4dbfde2c5057\\node_modules\\@openclaw\\codex",
  "C:\\mxc-lab\\whole-gateway\\state\\npm\\projects\\openclaw-codex-8902d781d4__openclaw-generation__g-49fd4dbfde2c5057\\node_modules\\@openclaw\\codex\\node_modules\\openclaw",
  "C:\\mxc-lab\\whole-gateway\\plugin",
  "C:\\mxc-lab\\whole-gateway\\state",
  "C:\\mxc-lab\\whole-gateway\\state\\.codex",
  "C:\\mxc-lab\\whole-gateway\\workspace",
  "C:\\mxc-lab\\whole-gateway\\temp",
];

for (const path of paths) {
  try {
    process.stdout.write(`REALPATH SUCCESS ${path} => ${realpathSync(path)}\n`);
  } catch (error) {
    const value = error;
    process.stdout.write(`REALPATH FAILURE ${path} code=${value.code ?? "UNKNOWN"} message=${value.message ?? String(error)}\n`);
  }

  try {
    const packagePath = `${path}\\package.json`;
    const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
    process.stdout.write(`READ SUCCESS ${packagePath} name=${packageJson.name ?? "unknown"} version=${packageJson.version ?? "unknown"}\n`);
  } catch (error) {
    const value = error;
    process.stdout.write(`READ FAILURE ${path} code=${value.code ?? "UNKNOWN"} message=${value.message ?? String(error)}\n`);
  }
}
