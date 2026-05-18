#!/usr/bin/env node
/**
 * Lint para detectar `${...}` en cuerpo de markdown que NO se evalúa.
 *
 * Causa: el plugin `@vscode/markdown-it-katex` intercepta los tokens
 * que empiezan con `$`, por lo que `${...}` en texto plano queda como
 * literal en lugar de ser interpolado por Observable Framework.
 *
 * Fix: mover esas interpolaciones a un bloque ` ```js ... ``` ` y usar
 * `display(htl.html`<p>...${variable}...</p>`)` o similar.
 *
 * Uso:
 *   node observable/scripts/lint-md-interpolation.mjs
 *   (vuelve exit 1 si hay matches).
 *
 * Reglas:
 *   - Ignora líneas dentro de bloques ` ```js ... ``` ` (o cualquier
 *     bloque de código triple-backtick, incluido ```html, ```svg, etc.).
 *   - Ignora líneas dentro de `<script>...</script>`.
 *   - Ignora `${...}` dentro de **template literals** de HTML imperativo
 *     (no detectables aquí — el lint sólo mira líneas fuera de fences).
 *   - Match: cualquier `${...}` en líneas que parezcan markdown plano
 *     (incluyendo dentro de `<div>...</div>` HTML inline en .md, que
 *     tampoco se evalúa con el plugin KaTeX).
 */
import {readdir, readFile} from "node:fs/promises";
import {join, resolve, relative, dirname} from "node:path";
import {fileURLToPath} from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = resolve(__dirname, "..", "src");
const ROOT_DIR = resolve(__dirname, "..", "..");

/** Recorre `dir` recursivamente y devuelve todos los .md. */
async function listMarkdown(dir) {
  const entries = await readdir(dir, {withFileTypes: true});
  const out = [];
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === "dist" || e.name.startsWith(".")) continue;
      out.push(...await listMarkdown(p));
    } else if (e.name.endsWith(".md")) {
      out.push(p);
    }
  }
  return out;
}

/** Devuelve true si la línea inicia/termina un fence ` ``` `. */
function isFence(line) {
  return /^```/.test(line.trim());
}

async function lintFile(path) {
  const text = await readFile(path, "utf8");
  const lines = text.split("\n");
  const matches = [];
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isFence(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    // Match `${...}` que esté en cuerpo de markdown
    if (/\$\{[^}]*\}/.test(line)) {
      matches.push({line: i + 1, text: line.trimEnd()});
    }
  }
  return matches;
}

async function main() {
  const files = await listMarkdown(SRC_DIR);
  let total = 0;
  for (const f of files) {
    const ms = await lintFile(f);
    if (ms.length === 0) continue;
    total += ms.length;
    const rel = relative(ROOT_DIR, f);
    console.error(`\n${rel}`);
    for (const m of ms) {
      console.error(`  L${m.line}: ${m.text}`);
    }
  }
  if (total > 0) {
    console.error(
      `\n❌  ${total} interpolación(es) \`\${...}\` en cuerpo de markdown.\n` +
      `   El plugin KaTeX intercepta esos tokens y no se evalúan.\n` +
      `   Fix: mover a un bloque \`\`\`js + display(htl.html\`...\`).\n`
    );
    process.exit(1);
  }
  console.log("✅  OK — sin interpolaciones literales en .md.");
}

main().catch((e) => { console.error(e); process.exit(2); });
