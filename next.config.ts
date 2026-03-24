import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import { execSync } from "child_process";
import crypto from "crypto";

let revision: string;
try {
  revision = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
} catch {
  revision = crypto.randomUUID();
}

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: [{ url: "/~offline", revision }],
});

const nextConfig: NextConfig = {
  output: "standalone",
};

export default withSerwist(nextConfig);
