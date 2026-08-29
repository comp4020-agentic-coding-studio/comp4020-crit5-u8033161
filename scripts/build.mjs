#!/usr/bin/env node
// Bare stack: no bundler. Copies the static site as-is into dist/, mirroring
// the template's Vite rule that every .html file is a page and everything in
// public/ lands at the root of dist/ --- so add pages, link them, ship.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const SKIP = new Set(["node_modules", "dist", ".git", "spec", "scripts", "reflections", "public"]);
const SITE_EXT = [".html", ".css", ".js", ".json", ".svg", ".ico"];

function siteFiles(dir = ".") {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith(".") || SKIP.has(entry.name)) return [];
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return siteFiles(path);
    return SITE_EXT.some((ext) => entry.name.endsWith(ext)) ? [path] : [];
  });
}

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });

const files = siteFiles();
for (const file of files) {
  const dest = join("dist", file);
  mkdirSync(join(dest, ".."), { recursive: true });
  cpSync(file, dest);
}

if (existsSync("public")) {
  cpSync("public", "dist", { recursive: true });
}

console.log(`built ${files.length} file(s) into dist/`);
