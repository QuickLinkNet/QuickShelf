// Lists every t('…') key used in src/ and checks that src/i18n/en.ts has a translation for it.
//   node scripts/i18n-keys.mjs          -> prints missing keys, exit code 1 if any
//   node scripts/i18n-keys.mjs --all    -> prints all keys as JSON
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..', 'src');
const keys = new Set();

const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      walk(p);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(name) || /\.test\./.test(name) || p.includes(join('src', 'i18n'))) continue;
    const sf = ts.createSourceFile(p, readFileSync(p, 'utf8'), ts.ScriptTarget.Latest, true, name.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const visit = (node) => {
      if (ts.isCallExpression(node) && /^(t|tl)$/.test(node.expression.getText(sf)) && node.arguments[0]) {
        const a = node.arguments[0];
        if (ts.isStringLiteralLike(a)) keys.add(a.text);
        else if (ts.isTemplateExpression(a)) keys.add(a.getText(sf).slice(1, -1));
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
};
walk(root);

if (process.argv.includes('--all')) {
  console.log(JSON.stringify([...keys].sort(), null, 1));
  process.exit(0);
}

const en = readFileSync(join(root, 'i18n', 'en.ts'), 'utf8');
const dictKeys = new Set();
for (const m of en.matchAll(/^\s*("(?:[^"\\]|\\.)*"):/gm)) dictKeys.add(JSON.parse(m[1]));
const missing = [...keys].filter((k) => !dictKeys.has(k)).sort();
console.log(missing.join('\n'));
console.error(`\n${keys.size} keys, ${missing.length} without English translation`);
process.exit(missing.length ? 1 : 0);
