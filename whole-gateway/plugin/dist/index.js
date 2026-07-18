import { Type } from "typebox";
import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
const inputPath = "C:\\mxc-lab\\whole-gateway\\input\\TASK.md";
const outputPath = "C:\\mxc-lab\\whole-gateway\\output\\direct-tool-allowed.txt";
const sentinelPath = "C:\\mxc-lab\\protected\\sentinel.txt";
function errorResult(operation, error) {
    const value = error;
    return {
        operation,
        success: false,
        errorCode: value.code ?? "UNKNOWN",
        errorMessage: value.message ?? String(error),
    };
}
export default defineToolPlugin({
    id: "direct-fs-probe",
    name: "Direct FS Probe",
    description: "Add Direct FS Probe tools to OpenClaw.",
    tools: (tool) => [
        tool({
            name: "direct_fs_probe",
            description: "Run the fixed direct Node.js filesystem boundary probe without shell or child processes.",
            parameters: Type.Object({}),
            execute: async () => {
                const operations = [];
                try {
                    const value = readFileSync(inputPath, "utf8").trim();
                    operations.push({ operation: "input_read", success: true, value });
                }
                catch (error) {
                    operations.push(errorResult("input_read", error));
                }
                try {
                    writeFileSync(outputPath, "DIRECT_TOOL_OUTPUT_WRITE=SUCCESS\n", "utf8");
                    operations.push({ operation: "output_write", success: true, value: outputPath });
                }
                catch (error) {
                    operations.push(errorResult("output_write", error));
                }
                try {
                    unlinkSync(sentinelPath);
                    operations.push({ operation: "protected_delete", success: true, value: "unexpectedly deleted" });
                }
                catch (error) {
                    operations.push(errorResult("protected_delete", error));
                }
                return {
                    gatewayProcessPid: process.pid,
                    operations,
                };
            },
        }),
    ],
});
