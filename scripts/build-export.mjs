import { spawnSync } from "node:child_process";

process.env.NEXT_OUTPUT_EXPORT = "true";
process.env.NEXT_PUBLIC_USE_DIRECT_API = "true";

if (!process.env.NEXT_PUBLIC_DIRECT_API_BASE_URL && process.env.API_BASE_URL) {
  process.env.NEXT_PUBLIC_DIRECT_API_BASE_URL = process.env.API_BASE_URL;
}

const command = process.platform === "win32" ? "cmd.exe" : "npx";
const args =
  process.platform === "win32"
    ? ["/c", "npx", "next", "build"]
    : ["next", "build"];
const result = spawnSync(command, args, {
  env: process.env,
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
}

process.exit(result.status ?? 1);
