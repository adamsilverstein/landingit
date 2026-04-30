#!/usr/bin/env node

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const distDir = resolve(__dirname, '..', 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
};

function openBrowser(url) {
  const cmd =
    process.platform === 'darwin'  ? `open "${url}"` :
    process.platform === 'win32'   ? `start "" "${url}"` :
                                     `xdg-open "${url}"`;
  exec(cmd, () => {});
}

function parseArgs() {
  const args = process.argv.slice(2);
  let port = 4173;
  let noBrowser = false;

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--port' || args[i] === '-p') && args[i + 1]) {
      const p = parseInt(args[i + 1], 10);
      if (!Number.isNaN(p) && p > 0 && p < 65536) port = p;
      i++;
    } else if (args[i] === '--no-open') {
      noBrowser = true;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
  landingit — GitHub PR dashboard

  Usage:
    npx landingit [options]

  Options:
    -p, --port <number>  Port to listen on (default: 4173)
    --no-open            Don't open the browser automatically
    -h, --help           Show this help message
`);
      process.exit(0);
    }
  }
  return { port, noBrowser };
}

const { port, noBrowser } = parseArgs();

const server = createServer(async (req, res) => {
  let pathname = new URL(req.url, `http://localhost:${port}`).pathname;

  // Serve index.html for the root and any non-file paths (SPA fallback)
  if (pathname === '/' || !extname(pathname)) {
    pathname = '/index.html';
  }

  const filePath = join(distDir, pathname);

  // Prevent path traversal
  if (!filePath.startsWith(distDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const data = await readFile(filePath);
    const ext = extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch {
    // SPA fallback: serve index.html for missing routes
    try {
      const data = await readFile(join(distDir, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end('Not Found');
    }
  }
});

server.listen(port, () => {
  const url = `http://localhost:${port}`;
  console.log(`\n  🚀 LandinGit is running at ${url}\n`);
  console.log(`  Press Ctrl+C to stop.\n`);
  if (!noBrowser) openBrowser(url);
});
