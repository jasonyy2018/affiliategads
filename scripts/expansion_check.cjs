const p = require('../data/products.json');
const m = require('../data/matrix.json');
const fs = require('fs');
const ex = new Set(fs.readdirSync(__dirname + '/../content/pages').map((f) => f.replace('.json', '')));
const excl = new Set(m.excluded_combinations.map((e) => e.category + '|' + e.use_case));

const cnt = {};
for (const x of p) {
  for (const u of x.use_cases) {
    for (const b of m.price_bands) {
      if (x.price >= b.min && x.price <= b.max) {
        const k = x.category + '|' + u + '|' + b.label;
        cnt[k] = (cnt[k] || 0) + 1;
      }
    }
  }
}

const ready = [];
const nearMiss = new Map();
for (const k in cnt) {
  const parts = k.split('|');
  const slug = 'best-' + parts[0].replace(/\s+/g, '-') + '-for-' + parts[1].replace(/\s+/g, '-') + '-' + parts[2].replace(/[^a-z0-9]+/g, '-');
  if (ex.has(slug) || excl.has(parts[0] + '|' + parts[1])) continue;
  if (cnt[k] >= 3) ready.push(slug + ' (' + cnt[k] + ')');
  else if (cnt[k] === 2) {
    const key = parts[0] + '|' + parts[1];
    nearMiss.set(key, (nearMiss.get(key) || 0) + 1);
  }
}

console.log('READY combos now:', ready.length);
ready.forEach((r) => console.log(' ', r));
console.log('\nRemaining near-miss (need 1 more product each):');
for (const [k, v] of nearMiss) console.log(' ', k, '->', v, 'pages');
