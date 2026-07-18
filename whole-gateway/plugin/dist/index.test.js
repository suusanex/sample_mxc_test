import { describe, expect, it } from "vitest";
import entry from "./index.js";
import { getToolPluginMetadata } from "openclaw/plugin-sdk/tool-plugin";
describe("direct-fs-probe", () => {
    it("declares tool metadata", () => {
        expect(getToolPluginMetadata(entry)?.tools.map((tool) => tool.name)).toEqual(["direct_fs_probe"]);
    });
});
