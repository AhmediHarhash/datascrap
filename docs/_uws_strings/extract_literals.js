const fs = require('fs');

if (process.argv.length < 4) {
  console.error('usage: node extract_literals.js <input> <output> [mode]');
  process.exit(1);
}

const [,, inputPath, outputPath, mode = 'default'] = process.argv;
const src = fs.readFileSync(inputPath, 'utf8');
const regex = /(?:'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)")/g;

function decode(s) {
  return s
    .replace(/\\n/g, ' ')
    .replace(/\\r/g, ' ')
    .replace(/\\t/g, ' ')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .trim();
}

function keep(v) {
  if (v.length < 2 || v.length > 140) return false;
  if (!/[A-Za-z]/.test(v)) return false;
  if (/[\u0000-\u001F]/.test(v)) return false;
  if (/^[A-Za-z0-9_.:-]+$/.test(v) && !v.includes(' ')) return false;
  if (/^(https?:|\/)/.test(v)) return false;
  if (/[{}<>]/.test(v)) return false;

  if (mode === 'ui') {
    if (v.length < 3 || v.length > 120) return false;
    if (/^(className|children|style|type|value|onClick|onChange|disabled|target|tabId|selector)$/i.test(v)) return false;
    if (/\.(js|css|png|svg|jpg|jpeg|webp)$/i.test(v)) return false;
  }

  return true;
}

const set = new Set();
let m;
while ((m = regex.exec(src)) !== null) {
  const raw = (m[1] ?? m[2] ?? '');
  const v = decode(raw);
  if (keep(v)) set.add(v);
}

const out = [...set].sort((a, b) => a.localeCompare(b));
fs.writeFileSync(outputPath, out.join('\n'));
console.log(out.length);
