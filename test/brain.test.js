// node test/brain.test.js — generates thousands of brain tasks and checks every answer against an independent simulation
const B = require('../brain.js');
let fails = 0, n = 0;
const fail = (m, t) => { fails++; if (fails < 15) console.log('FAIL', m, JSON.stringify(t).slice(0, 300)); };
const assert = (c, m, t) => { n++; if (!c) fail(m, t); };

// --- picture: re-simulate the steps from the sentences and compare with the scene ---
function simulate(steps) {
  const piles = [];
  const find = (short) => { for (let p = 0; p < piles.length; p++) { const i = piles[p].findIndex(o => o.endsWith(' ' + short)); if (i >= 0) return [p, i]; } throw new Error('no ' + short); };
  for (const s of steps) {
    let m;
    if ((m = s.match(/^Picture a (\w+ \w+) on a table/))) piles.push([m[1]]);
    else if ((m = s.match(/^Put a (\w+ \w+) on top of the (\w+)\./))) { const [p] = find(m[2]); piles[p].push(m[1]); }
    else if ((m = s.match(/^Place a (\w+ \w+) on the table to the left of the (\w+)\./))) { const [p] = find(m[2]); if (p !== 0) throw new Error('left ref not leftmost'); piles.unshift([m[1]]); }
    else if ((m = s.match(/^Place a (\w+ \w+) on the table to the right of the (\w+)\./))) { const [p] = find(m[2]); if (p !== piles.length - 1) throw new Error('right ref not rightmost'); piles.push([m[1]]); }
    else if ((m = s.match(/^Move the (\w+) onto the (\w+)\./))) { const [p, i] = find(m[1]); if (i !== piles[p].length - 1) throw new Error('moved object not on top'); const o = piles[p].pop(); const [q, j] = find(m[2]); if (j !== piles[q].length - 1) throw new Error('target not on top'); piles[q].push(o); if (!piles[p].length) piles.splice(p, 1); }
    else if ((m = s.match(/^Swap the two piles: the (\w+) pile and the (\w+) pile change places\./))) { const [p] = find(m[1]), [q] = find(m[2]); if (Math.abs(p - q) !== 1) throw new Error('swap not adjacent'); [piles[p], piles[q]] = [piles[q], piles[p]]; }
    else throw new Error('unparsed step: ' + s);
  }
  return piles;
}
function answerFor(piles, q) {
  let m;
  const all = piles.flat();
  const find = (short) => { for (let p = 0; p < piles.length; p++) { const i = piles[p].findIndex(o => o.endsWith(' ' + short)); if (i >= 0) return [p, i]; } };
  if ((m = q.match(/^What is on top of the (\w+)\?/))) { const [p, i] = find(m[1]); return piles[p][i + 1] || 'nothing'; }
  if ((m = q.match(/^What is under the (\w+)\?/))) { const [p, i] = find(m[1]); return i ? piles[p][i - 1] : 'the table'; }
  if (q === 'How many objects are touching the table?') return String(piles.length);
  if (q === 'Which object is the highest up?') { const h = piles.map(p => p.length), mx = Math.max(...h); return piles[h.indexOf(mx)].slice(-1)[0]; }
  if (q === 'Which object is at the bottom of the left-most pile?') return piles[0][0];
  if (q === 'Which object is at the bottom of the right-most pile?') return piles[piles.length - 1][0];
  if ((m = q.match(/^Counting piles from the left, which pile is the (\w+) in\?/))) return String(find(m[1])[0] + 1);
  throw new Error('unknown q ' + q);
}
const partsSeen = {};
for (let i = 0; i < 4000; i++) {
  const L = 1 + (i % 7), t = B.generate('picture', L);
  let piles; try { piles = simulate(t.steps); } catch (e) { fail('picture steps: ' + e.message, t); continue; }
  assert(JSON.stringify(piles) === JSON.stringify(t.scene), 'picture scene mismatch', { steps: t.steps, scene: t.scene, piles });
  assert(answerFor(piles, t.question) === t.answer, 'picture answer', t);
  assert(t.options.includes(t.answer) && new Set(t.options).size === t.options.length && t.options.length >= 2, 'picture options', t);
  const names = piles.flat(); assert(new Set(names).size === names.length && new Set(names.map(x => x.split(' ')[1])).size === names.length, 'picture unique names', t);
  partsSeen[L] = t.parts;
}
console.log('picture objects per level', partsSeen);

// --- walk: re-simulate ---
const VEC = { north: [0, 1], east: [1, 0], south: [0, -1], west: [-1, 0] }, ORDER = ['north', 'east', 'south', 'west'];
for (let i = 0; i < 4000; i++) {
  const t = B.generate('walk', 1 + (i % 7));
  let x = 0, y = 0, f = 0;
  for (const s of t.steps) {
    let m;
    if ((m = s.match(/walk (\d+) blocks? (north|east|south|west)\./i))) { f = ORDER.indexOf(m[2]); x += VEC[m[2]][0] * +m[1]; y += VEC[m[2]][1] * +m[1]; }
    else if ((m = s.match(/^Turn (left|right|around) and walk (\d+) blocks?\./))) { f = (f + (m[1] === 'left' ? 3 : m[1] === 'right' ? 1 : 2)) % 4; x += VEC[ORDER[f]][0] * +m[2]; y += VEC[ORDER[f]][1] * +m[2]; }
    else { fail('walk unparsed: ' + s, t); }
  }
  const dx = -x, dy = -y;
  const exp = !dx && !dy ? 'here' : ((dy > 0 ? 'north' : dy < 0 ? 'south' : '') + (dy && dx ? '-' : '') + (dx > 0 ? 'east' : dx < 0 ? 'west' : ''));
  assert(exp === t.answer, 'walk answer', { steps: t.steps, exp, got: t.answer, pos: t.pos });
  assert(t.options.includes(t.answer), 'walk option present', t);
}

// --- rotate / fold ---
const parse = (k) => k.split(';').map(s => s.split(',').map(Number));
const norm = (c) => { const mx = Math.min(...c.map(p => p[0])), my = Math.min(...c.map(p => p[1])); return c.map(([x, y]) => [x - mx, y - my]).map(p => p.join(',')).sort().join(';'); };
const rotOnce = (c) => c.map(([x, y]) => [y, -x]);
let rotN = 0, foldN = 0;
for (let i = 0; i < 4000; i++) {
  const t = B.generate('rotate', 1 + (i % 6));
  assert(t.options.includes(t.answer) && new Set(t.options).size === 4, 'rotate options', t);
  if (t.mode === 'rotate') {
    rotN++;
    // the answer must be some rotation of the shape; the wrong options must not be
    const rots = new Set(); let c = t.shape; for (let r = 0; r < 4; r++) { rots.add(norm(c)); c = rotOnce(c); }
    assert(rots.has(t.answer), 'rotate answer is a rotation', t);
    const rotDistractors = t.options.filter(o => o !== t.answer && rots.has(o)).length;
    assert(rotDistractors <= (t.level >= 4 ? 1 : 0), 'rotate distractor is itself a rotation (ambiguous)', t);
    assert(!/\.\s*\./.test(t.question) && /clockwise|anticlockwise|180/.test(t.question), 'rotate question text', t);
  } else {
    foldN++;
    // independent fold simulation: fold the paper physically as layers (sets of mapped cells), punch, unfold
    const N = t.N; let layers = [[]]; // each layer: map from visible cell -> original cell; start: identity for all cells
    let cells = []; for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) cells.push([x, y]);
    let region = { x0: 0, x1: N - 1, y0: 0, y1: N - 1 };
    // map: visible position key -> list of original cells stacked there
    let stack = new Map(cells.map(c => [c.join(','), [c]]));
    for (const f of t.folds) {
      const next = new Map();
      for (const [k, origs] of stack) {
        const [x, y] = k.split(',').map(Number); let nx = x, ny = y;
        if (f === 'right-over-left') { const mid = (region.x0 + region.x1) / 2; if (x > mid) nx = region.x0 + region.x1 - x; }
        if (f === 'left-over-right') { const mid = (region.x0 + region.x1) / 2; if (x < mid) nx = region.x0 + region.x1 - x; }
        if (f === 'top-down') { const mid = (region.y0 + region.y1) / 2; if (y > mid) ny = region.y0 + region.y1 - y; }
        if (f === 'bottom-up') { const mid = (region.y0 + region.y1) / 2; if (y < mid) ny = region.y0 + region.y1 - y; }
        const nk = `${nx},${ny}`; next.set(nk, (next.get(nk) || []).concat(origs));
      }
      stack = next;
      if (f === 'right-over-left') region.x1 = (region.x0 + region.x1 - 1) / 2; if (f === 'left-over-right') region.x0 = (region.x0 + region.x1 + 1) / 2;
      if (f === 'top-down') region.y1 = (region.y0 + region.y1 - 1) / 2; if (f === 'bottom-up') region.y0 = (region.y0 + region.y1 + 1) / 2;
    }
    const expected = new Set();
    for (const h of t.holes) { const origs = stack.get(h.join(',')); if (!origs) { fail('fold hole outside visible paper', t); continue; } origs.forEach(c => expected.add(c.join(','))); }
    assert([...expected].sort().join(';') === t.answer, 'fold answer', { folds: t.folds, holes: t.holes, exp: [...expected].sort(), got: t.answer });
  }
}
console.log('rotate', rotN, 'fold', foldN);

// --- palace recall grading ---
for (let i = 0; i < 500; i++) {
  const t = B.generate('palace', 1 + (i % 8));
  assert(t.words.length === Math.min(3 + t.level, 12) && new Set(t.words).size === t.words.length, 'palace words', t);
  const typed = t.words.map((w, j) => j % 3 === 0 ? w.toUpperCase() + 's' : j % 3 === 1 ? w.slice(0, -1) + (w.slice(-1) === 'a' ? 'e' : 'a') : w);
  const g = B.gradeRecall(t.words, typed.slice(0, -1).concat(['zzzz']));
  assert(g.score === t.words.length - 1 && g.missed.length === 1, 'palace grading tolerant', { typed, g });
}

// --- mathpic ---
for (let i = 0; i < 3000; i++) {
  const t = B.generate('mathpic', 1 + (i % 3));
  if (t.pic === 'area') { assert(t.parts.reduce((a, p) => a + p[0], 0) === t.answer && t.a * t.b === t.answer, 'area parts', t); t.parts.forEach(p => assert(p[1] * p[2] === p[0], 'area part product', t)); }
  else {
    assert(t.jumps.every(j => j[1] - j[0] === j[2] && j[2] > 0), 'line jumps consistent', t);
    for (let k = 1; k < t.jumps.length; k++) assert(t.jumps[k][0] === t.jumps[k - 1][1], 'line jumps chain', t);
    const total = t.jumps.reduce((a, j) => a + j[2], 0);
    if (t.text.includes('+')) assert(t.jumps[0][0] === t.a && t.jumps.slice(-1)[0][1] === t.answer && total === t.b, 'add line', t);
    else assert(t.jumps[0][0] === t.b && t.jumps.slice(-1)[0][1] === t.a && total === t.answer, 'sub line', t);
  }
  assert(B.check(t, String(t.answer)) && !B.check(t, String(t.answer + 1)), 'mathpic check', t);
}

// --- creative ---
for (let i = 0; i < 300; i++) {
  const l = B.generate('links'); assert(l.words.length === 3 && B.check(l, ' ' + l.answer.toUpperCase() + ' ') && !B.check(l, 'x'), 'links', l);
  const c = B.generate('combine'); assert(c.words[0] !== c.words[1] && c.prompt.includes(c.words[0]), 'combine', c);
  const u = B.generate('uses'); assert(/^an? /.test(u.object) && u.seconds === 60, 'uses', u);
}
const w1 = B.generate('whatif', 1, null, '2026-10-17'), w2 = B.generate('whatif', 1, null, '2026-10-17'), w3 = B.generate('whatif', 1, null, '2026-10-18');
assert(w1.prompt === w2.prompt, 'whatif stable per day', [w1, w2]);
assert(B.WHATIF.includes(w3.prompt), 'whatif from list', w3);
const p1 = B.dailyPick('2026-10-17'), p2 = B.dailyPick('2026-10-17');
assert(p1.imagine === p2.imagine && p1.create === p2.create && B.GROUP.imagine.includes(p1.imagine) && B.GROUP.create.includes(p1.create), 'daily pick stable', [p1, p2]);
const picks = {}; for (let d = 1; d <= 60; d++) { const p = B.dailyPick('2026-11-' + String(d).padStart(2, '0')); picks[p.imagine] = (picks[p.imagine] || 0) + 1; picks[p.create] = (picks[p.create] || 0) + 1; }
assert(Object.keys(picks).length >= 8, 'daily pick covers kinds over 60 days', picks);
console.log('daily pick spread over 60 days', picks);
assert(B.nextLevel('picture', 2, [true, true]) === 3 && B.nextLevel('picture', 2, [false, false]) === 1 && B.nextLevel('picture', 2, [true, false]) === 2 && B.nextLevel('picture', 7, [true, true]) === 7, 'nextLevel');
assert(B.normIdea('A door-stop!') === 'doorstop' && B.normIdea(' the Door stop ') === 'door stop', 'normIdea');

console.log(`${n} checks, ${fails} failures`);
process.exit(fails ? 1 : 0);
