import { build } from "vite";

const configModule = await import("../vite.config.js");
const configExport = configModule.default;
const mode = process.env.NODE_ENV || "production";
const config = typeof configExport === "function"
  ? await configExport({ command: "build", mode })
  : configExport;

await build({
  ...config,
  configFile: false,
});
