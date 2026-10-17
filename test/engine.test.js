// node test/engine.test.js — exercises the problem generator, hints, scoring and streaks.
const assert = require('assert');
const E = require('../engine.js');

let seed = 12345;
function rng() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }

const RANGES = {
  add: { easy: [12, 198], medium: [110, 1998], hard: [1100, 19998] },
  sub: { easy: [1, 97], medium: [1, 989], hard: [1, 9899] },
  mul: { easy: [4, 270], medium: [39, 4950], hard: [144, 9999] },
  div: { easy: [2, 12], medium: [11, 199], hard: [11, 999] },
  pct: { easy: [1, 200], medium: [1, 800], hard: [1, 4000] }
};

// pull every number out of the last hint step; the answer must appear in it
function lastStepContainsAnswer(prob) {
  const last = prob.hint.steps[prob.hint.steps.length - 1];
  const want = E.fmt(prob.answer);
  return last.includes(want);
}

let checked = 0, perTitle = {};
for (const op of E.OPS) {
  for (const level of E.LEVELS) {
    for (let i = 0; i < 3000; i++) {
      const p = E.generate(op, level, rng);
      checked++;
      assert.strictEqual(p.op, op);
      assert.strictEqual(p.level, level);
      assert.ok(Number.isFinite(p.answer), `${op}/${level}: answer not finite: ${p.text}`);
      // whole-number answers everywhere (percent answers are built to be whole)
      assert.ok(Number.isInteger(p.answer), `${op}/${level}: non-integer answer ${p.answer} for ${p.text}`);
      assert.ok(p.answer > 0, `${op}/${level}: non-positive answer ${p.answer} for ${p.text}`);
      const [lo, hi] = RANGES[op][level];
      assert.ok(p.answer >= lo && p.answer <= hi, `${op}/${level}: answer ${p.answer} out of [${lo},${hi}] for ${p.text}`);
      // recompute from a,b to make sure text and answer agree
      const recomputed = op === 'add' ? p.a + p.b : op === 'sub' ? p.a - p.b : op === 'mul' ? p.a * p.b : op === 'div' ? p.a / p.b
        : p.form === 'of' ? p.a * p.b / 100 : p.form === 'what' ? p.a / p.b * 100 : p.form === 'inc' ? p.a + p.a * p.b / 100 : p.a - p.a * p.b / 100;
      assert.ok(Math.abs(recomputed - p.answer) < 1e-9, `${op}/${level}: answer mismatch ${p.text} -> ${p.answer} vs ${recomputed}`);
      // hint sanity
      assert.ok(p.hint && p.hint.title && p.hint.steps.length >= 1, `${op}/${level}: missing hint for ${p.text}`);
      assert.ok(lastStepContainsAnswer(p), `${op}/${level}: hint does not end with the answer.\n  ${p.text} = ${p.answer}\n  ${p.hint.title}\n  ${p.hint.steps.join('\n  ')}`);
      assert.ok(!p.hint.steps.some(s => /NaN|undefined|Infinity/.test(s)), `${op}/${level}: bad hint text for ${p.text}: ${p.hint.steps.join(' | ')}`);
      perTitle[`${op}: ${p.hint.title}`] = (perTitle[`${op}: ${p.hint.title}`] || 0) + 1;
      // checkAnswer accepts the right answer in several spellings and rejects others
      assert.ok(E.checkAnswer(p, String(p.answer)));
      assert.ok(E.checkAnswer(p, p.answer.toLocaleString('en-US')));
      assert.ok(!E.checkAnswer(p, String(p.answer + 1)));
      assert.ok(!E.checkAnswer(p, ''));
      assert.ok(!E.checkAnswer(p, 'abc'));
    }
  }
}
console.log(`generated + verified ${checked} problems`);
console.log('hint strategies used:');
Object.entries(perTitle).sort().forEach(([k, v]) => console.log(`  ${String(v).padStart(5)}  ${k}`));

// mixed picks every op over time
const seen = new Set();
for (let i = 0; i < 500; i++) seen.add(E.generate('mixed', 'easy', rng).op);
assert.deepStrictEqual([...seen].sort(), [...E.OPS].sort());

// variety: 200 easy additions should give many distinct problems
const texts = new Set();
for (let i = 0; i < 200; i++) texts.add(E.generate('add', 'easy', rng).text);
assert.ok(texts.size > 150, `too little variety: ${texts.size}`);

// scoring
const p = E.generate('add', 'medium', rng); // base 20, target 12s
assert.strictEqual(E.scoreFor(p, 5, false), 40, 'fast answer = double points');
assert.strictEqual(E.scoreFor(p, 12, false), 40, 'at target = double');
assert.strictEqual(E.scoreFor(p, 24, false), 30, 'half way to 3x target');
assert.strictEqual(E.scoreFor(p, 36, false), 20, 'slow = base only');
assert.strictEqual(E.scoreFor(p, 100, false), 20);
assert.strictEqual(E.scoreFor(p, 3, true), 10, 'hint = half base');

// adaptive level
const fast = { correct: true, fast: true };
assert.strictEqual(E.nextLevel('easy', [fast, fast, fast, fast, fast]), 'medium');
assert.strictEqual(E.nextLevel('easy', [fast, fast, fast, fast]), 'easy');
assert.strictEqual(E.nextLevel('hard', [fast, fast, fast, fast, fast]), 'hard');
const wrong = { correct: false, fast: false };
assert.strictEqual(E.nextLevel('medium', [fast, wrong, wrong, fast, wrong]), 'easy');
assert.strictEqual(E.nextLevel('easy', [wrong, wrong, wrong, wrong, wrong]), 'easy');

// streaks (fake dates)
assert.strictEqual(E.dayKey(new Date(2026, 9, 17, 23, 59)), '2026-10-17');
assert.strictEqual(E.shiftDay('2026-10-01', -1), '2026-09-30');
assert.strictEqual(E.shiftDay('2026-12-31', 1), '2027-01-01');
assert.strictEqual(E.shiftDay('2026-03-01', -1), '2026-02-28');
const days = {
  '2026-10-13': { solved: 10 }, '2026-10-14': { solved: 12 }, '2026-10-15': { solved: 10 }, '2026-10-16': { solved: 10 },
  '2026-10-05': { solved: 10 }, '2026-10-06': { solved: 10 }, '2026-10-07': { solved: 3 }
};
let s = E.streakFrom(days, 10, '2026-10-17');
assert.deepStrictEqual(s, { current: 4, best: 4, todayMet: false, alive: true }, 'today pending, 4 days behind it');
s = E.streakFrom(Object.assign({}, days, { '2026-10-17': { solved: 10 } }), 10, '2026-10-17');
assert.deepStrictEqual(s, { current: 5, best: 5, todayMet: true, alive: true });
s = E.streakFrom(days, 10, '2026-10-18'); // skipped the 17th
assert.deepStrictEqual(s, { current: 0, best: 4, todayMet: false, alive: false }, 'missed a day: broken, best kept');
s = E.streakFrom(days, 20, '2026-10-17'); // higher goal
assert.deepStrictEqual(s, { current: 0, best: 0, todayMet: false, alive: false });
s = E.streakFrom({}, 10, '2026-10-17');
assert.deepStrictEqual(s, { current: 0, best: 0, todayMet: false, alive: false });
s = E.streakFrom({ '2026-10-17': { solved: 10 } }, 10, '2026-10-17');
assert.deepStrictEqual(s, { current: 1, best: 1, todayMet: true, alive: true });
// year boundary
s = E.streakFrom({ '2025-12-31': { solved: 10 }, '2026-01-01': { solved: 10 } }, 10, '2026-01-02');
assert.strictEqual(s.current, 2);

// parseInput
assert.strictEqual(E.parseInput('1,234'), 1234);
assert.strictEqual(E.parseInput(' 12.5 '), 12.5);
assert.strictEqual(E.parseInput('12.'), null);
assert.strictEqual(E.parseInput(''), null);

console.log('ALL ENGINE TESTS PASSED');
