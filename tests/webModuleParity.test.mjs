import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { test } from "node:test";
import ts from "typescript";

// The web build swaps in a module's .web.ts twin. A name the web code imports
// that only the phone version exports is undefined on the web, and the call
// fails there at run time (Delete account broke this way on the web).

const ROOTS = ["src", "app"];

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith(".d.ts") ? [path] : [];
  });
}

const files = ROOTS.flatMap(sourceFiles);
const webTwinOf = (path) => [".web.ts", ".web.tsx"].map((ext) => path.replace(/\.tsx?$/, ext)).find(existsSync);
// Phone files with a web twin never run on the web; everything else does.
const runsOnWeb = files.filter((path) => /\.web\.tsx?$/.test(path) || !webTwinOf(path));

function parse(path) {
  return ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
}

function exportedNames(path) {
  const source = parse(path);
  const names = new Set();
  for (const statement of source.statements) {
    const exported = ts.getModifiers?.(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
    if (ts.isExportDeclaration(statement) && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
      for (const element of statement.exportClause.elements) names.add(element.name.text);
    } else if (exported && ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) names.add(declaration.name.getText(source));
    } else if (exported && statement.name) {
      names.add(statement.name.text);
    }
  }
  return names;
}

// The phone file a relative import points at, when it has a web twin.
function swappedModule(fromFile, specifier) {
  if (!specifier.startsWith(".")) return null;
  const base = normalize(join(dirname(fromFile), specifier));
  const native = [".ts", ".tsx"].map((ext) => base + ext).find(existsSync);
  return native && webTwinOf(native) ? native : null;
}

// Value imports only: a type import is gone by the time the code runs.
function importsOfSwappedModules(path) {
  const found = [];
  for (const statement of parse(path).statements) {
    if (!ts.isImportDeclaration(statement) || statement.importClause?.isTypeOnly) continue;
    const native = swappedModule(path, statement.moduleSpecifier.text);
    const bindings = statement.importClause?.namedBindings;
    if (!native || !bindings || !ts.isNamedImports(bindings)) continue;
    for (const element of bindings.elements) {
      if (!element.isTypeOnly) found.push({ native, name: (element.propertyName ?? element.name).text });
    }
  }
  return found;
}

test("the web code imports from modules with a web twin", () => {
  assert.ok(runsOnWeb.some((path) => importsOfSwappedModules(path).length > 0));
});

for (const path of runsOnWeb) {
  const imports = importsOfSwappedModules(path);
  if (imports.length === 0) continue;
  test(`${path} imports only names the web twins export`, () => {
    const missing = imports
      .filter(({ native, name }) => !exportedNames(webTwinOf(native)).has(name))
      .map(({ native, name }) => `${name} (${webTwinOf(native)})`);
    assert.deepEqual(missing, []);
  });
}
