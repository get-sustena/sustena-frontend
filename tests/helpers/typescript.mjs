// Load the real application modules with TypeScript's normal type erasure.
// Node's built-in stripping cannot resolve their extensionless imports or inferred type-only imports.
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import ts from "typescript";

const sourceRoot = new URL("../../src/", import.meta.url).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (error.code !== "ERR_MODULE_NOT_FOUND" || !specifier.startsWith(".")) throw error;
      return nextResolve(`${specifier}.ts`, context);
    }
  },
  load(url, context, nextLoad) {
    if (!url.startsWith(sourceRoot) || !url.endsWith(".ts")) return nextLoad(url, context);
    return {
      format: "module",
      source: ts.transpileModule(readFileSync(new URL(url), "utf8"), {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      }).outputText,
      shortCircuit: true,
    };
  },
});
