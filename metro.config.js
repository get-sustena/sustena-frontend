const { getDefaultConfig } = require("expo/metro-config");

/** @type {import("expo/metro-config").MetroConfig} */
const config = getDefaultConfig(__dirname);

// expo-sqlite uses WebAssembly in browsers.
if (!config.resolver.assetExts.includes("wasm")) {
  config.resolver.assetExts.push("wasm");
}

// SharedArrayBuffer requires a cross-origin isolated page. Production hosts
// must return the same headers; see public/_headers and vercel.json.
const enhanceMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const enhancedMiddleware = enhanceMiddleware
    ? enhanceMiddleware(middleware, server)
    : middleware;

  return (request, response, next) => {
    response.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
    response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    return enhancedMiddleware(request, response, next);
  };
};

module.exports = config;
