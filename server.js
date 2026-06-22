"use strict";

/*
 * Servidor estático zero-dependência para o EventSnap.
 * Usa apenas módulos nativos do Node. Necessário porque a Canvas API
 * (getImageData) exige origem HTTP — abrir via file:// "contamina" o canvas
 * e bloqueia a leitura de pixels.
 *
 * Uso: node server.js   (ou npm start)   →   http://localhost:8501
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8501;
const ROOT = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const server = http.createServer((req, res) => {
  // Normaliza e impede path traversal (../) para fora do ROOT.
  const urlPath = decodeURIComponent(req.url.split("?")[0]);
  let relPath = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
  const filePath = path.normalize(path.join(ROOT, relPath));

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("403 Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`EventSnap rodando em http://localhost:${PORT}`);
});
