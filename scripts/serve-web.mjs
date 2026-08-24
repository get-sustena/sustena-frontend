import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const outputDirectory = resolve(process.argv[2] ?? "dist");
const port = Number(process.argv[3] ?? process.env.PORT ?? 4173);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".wasm": "application/wasm",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

await access(join(outputDirectory, "index.html"));

const server = createServer(async (request, response) => {
  setBrowserHeaders(response);

  const requestPath = decodeURIComponent(
    new URL(request.url ?? "/", "http://localhost").pathname
  );
  const normalizedPath = normalize(requestPath).replace(/^[/\\]+/, "");
  const candidate = resolve(outputDirectory, normalizedPath);
  const safeCandidate = candidate.startsWith(`${outputDirectory}/`)
    ? candidate
    : join(outputDirectory, "index.html");
  const filePath = await existingFile(safeCandidate)
    ? safeCandidate
    : join(outputDirectory, "index.html");

  response.statusCode = 200;
  response.setHeader(
    "Content-Type",
    contentTypes[extname(filePath)] ?? "application/octet-stream"
  );
  createReadStream(filePath).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Sustena web preview: http://localhost:${port}`);
});

async function existingFile(filePath) {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

function setBrowserHeaders(response) {
  response.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
}
