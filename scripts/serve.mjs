#!/usr/bin/env node
// Bare stack: no dev-server framework. Serves the repo root (or dist/ with
// PREVIEW=1) over plain HTTP so relative paths and the AudioContext/module
// script behave like they will on GitHub Pages --- opening index.html via
// file:// breaks module scripts and the autoplay-gesture flow alike.
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const rootDir = resolve(process.env.PREVIEW ? "dist" : ".");
const port = Number(process.env.PORT ?? 5173);

const TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  let path = resolve(rootDir, "." + decodeURIComponent(url.pathname));
  if (path !== rootDir && !path.startsWith(rootDir + "/")) {
    res.writeHead(403);
    return res.end();
  }
  if (existsSync(path) && statSync(path).isDirectory()) path = join(path, "index.html");
  if (!existsSync(path)) {
    res.writeHead(404);
    return res.end("not found");
  }
  res.writeHead(200, { "Content-Type": TYPES[extname(path)] ?? "application/octet-stream" });
  createReadStream(path).pipe(res);
}).listen(port, () => {
  console.log(`serving ${rootDir}/ at http://localhost:${port}/`);
});
