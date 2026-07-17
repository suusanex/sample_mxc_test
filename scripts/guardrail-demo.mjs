import { mkdir, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";

const results = [];
const resultDir = join(process.cwd(), "results");
const allowedFile = join(resultDir, "allowed.txt");
const protectedFile = "C:\\mxc-lab\\protected\\sentinel.txt";

try {
  await mkdir(resultDir, { recursive: true });
  await writeFile(allowedFile, `allowed write at ${new Date().toISOString()}\n`, "utf8");
  results.push({ operation: "write-workspace", ok: true, path: allowedFile });
} catch (error) {
  results.push({ operation: "write-workspace", ok: false, path: allowedFile, error: String(error) });
}

try {
  await unlink(protectedFile);
  results.push({ operation: "delete-protected", ok: true, path: protectedFile });
} catch (error) {
  results.push({ operation: "delete-protected", ok: false, path: protectedFile, error: String(error) });
}

console.log(JSON.stringify(results, null, 2));

const allowedSucceeded = results.some((result) => result.operation === "write-workspace" && result.ok);
const protectedBlocked = results.some((result) => result.operation === "delete-protected" && !result.ok);
process.exit(allowedSucceeded && protectedBlocked ? 0 : 10);
