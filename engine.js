/* MindMath engine — problem generation, mental-math hints, scoring, streaks.
   Pure functions, no DOM. Works in the browser (window.Engine) and in Node (module.exports)
   so the logic can be unit-tested. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Engine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const OPS = ['add', 'sub', 'mul', 'div', 'pct'];
  const OP_LABEL = { add: 'Addition', sub: 'Subtraction', mul: 'Multiplication', div: 'Division', pct: 'Percentage' };
  const OP_SYMBOL = { add: '+', sub: '−', mul: '×', div: '÷', pct: '%' };
  const LEVELS = ['easy', 'medium', 'hard'];
  const BASE_POINTS = { easy: 10, medium: 20, hard: 35 };
  // "comfortable" seconds per problem; answering within this earns the full speed bonus
  const TARGET_SEC = {
    add: { easy: 6, medium: 12, hard: 25 },
    sub: { easy: 7, medium: 14, hard: 28 },
    mul: { easy: 6, medium: 14, hard: 30 },
    div: { easy: 6, medium: 12, hard: 25 },
    pct: { easy: 8, medium: 14, hard: 25 }
  };

  // ---------- random helpers ----------
  function makeRand(rng) {
    const r = rng || Math.random;
    return {
      int: (lo, hi) => lo + Math.floor(r() * (hi - lo + 1)),
      pick: (arr) => arr[Math.floor(r() * arr.length)],
      chance: (p) => r() < p
    };
  }

  function fmt(n) {
    // format a number for display: integers plain, decimals trimmed, thousands grouped
    if (Number.isInteger(n)) return n.toLocaleString('en-US');
    return parseFloat(n.toFixed(2)).toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  function roundTo(n, unit) { return Math.round(n / unit) * unit; }
  function digitsOf(n) { return String(Math.abs(Math.trunc(n))).length; }
  function nearestRoundUnit(n) {
    // round 38 -> 40 (unit 10), 380 -> 400 (unit 100), 3800 -> 4000
    const d = digitsOf(n);
    return d <= 2 ? 10 : d === 3 ? 100 : 1000;
  }

  // ---------- problem generators ----------
  function genAdd(R, level) {
    let a, b;
    if (level === 'easy') { a = R.int(10, 99); b = R.int(2, 99); }
    else if (level === 'medium') { a = R.int(100, 999); b = R.int(10, 999); }
    else { a = R.int(1000, 9999); b = R.int(100, 9999); }
    return { a, b, answer: a + b, text: `${fmt(a)} + ${fmt(b)}` };
  }

  function genSub(R, level) {
    let a, b;
    if (level === 'easy') { a = R.int(20, 99); b = R.int(2, a - 1); }
    else if (level === 'medium') { a = R.int(100, 999); b = R.int(10, a - 1); }
    else { a = R.int(1000, 9999); b = R.int(100, a - 1); }
    return { a, b, answer: a - b, text: `${fmt(a)} − ${fmt(b)}` };
  }

  function genMul(R, level) {
    let a, b;
    if (level === 'easy') {
      if (R.chance(0.7)) { a = R.int(2, 12); b = R.int(2, 12); }
      else { a = R.int(2, 9); b = R.int(11, 30); }
    } else if (level === 'medium') {
      const kind = R.pick(['1x2', '1x2', 'teen', 'special']);
      if (kind === '1x2') { a = R.int(3, 9); b = R.int(13, 99); }
      else if (kind === 'teen') { a = R.int(11, 19); b = R.int(11, 19); }
      else { a = R.int(12, 99); b = R.pick([5, 9, 11, 12, 15, 25, 50]); }
    } else {
      const kind = R.pick(['2x2', '2x2', '3x1', 'near']);
      if (kind === '2x2') { a = R.int(12, 99); b = R.int(12, 99); }
      else if (kind === '3x1') { a = R.int(101, 999); b = R.int(3, 9); }
      else { a = R.int(12, 99); b = R.pick([19, 21, 29, 31, 39, 41, 49, 51, 59, 61, 69, 71, 79, 81, 89, 91, 99, 101]); }
    }
    if (R.chance(0.5)) { const t = a; a = b; b = t; }
    return { a, b, answer: a * b, text: `${fmt(a)} × ${fmt(b)}` };
  }

  function genDiv(R, level) {
    let b, q;
    if (level === 'easy') { b = R.int(2, 12); q = R.int(2, 12); }
    else if (level === 'medium') {
      if (R.chance(0.6)) { b = R.int(2, 12); q = R.int(11, 99); }
      else { b = R.pick([2, 4, 5, 8, 10, 20, 25, 50]); q = R.int(11, 199); }
    } else {
      if (R.chance(0.5)) { b = R.int(11, 25); q = R.int(11, 99); }
      else { b = R.int(3, 9); q = R.int(100, 999); }
    }
    const a = b * q;
    return { a, b, answer: q, text: `${fmt(a)} ÷ ${fmt(b)}` };
  }

  // percentages that give whole-number answers for the chosen base
  function genPct(R, level) {
    let p, n, form = 'of';
    if (level === 'easy') {
      p = R.pick([10, 20, 25, 50, 5, 75, 30, 40, 60, 70, 80, 90, 15]);
      n = pickBase(R, p, 20, 200);
    } else if (level === 'medium') {
      p = R.pick([5, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50, 60, 65, 70, 75, 80, 85, 90, 95, 2, 4, 6, 8, 1, 3]);
      n = pickBase(R, p, 40, 800);
      if (R.chance(0.25)) form = 'what';
    } else {
      p = R.pick([2, 3, 4, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 24, 26, 27, 28, 32, 33, 34, 36, 37, 38, 42, 44, 46, 48, 52, 54, 55, 56, 58, 62, 64, 66, 68, 72, 74, 76, 78, 82, 84, 86, 88, 92, 94, 96, 98]);
      n = pickBase(R, p, 50, 2000);
      form = R.pick(['of', 'of', 'what', 'inc', 'dec']);
    }
    if (form === 'of') {
      return { a: p, b: n, form, answer: p * n / 100, text: `${p}% of ${fmt(n)}` };
    }
    if (form === 'what') {
      // "part is what % of n" — choose part = p% of n so the answer is p
      const part = p * n / 100;
      return { a: part, b: n, form, answer: p, text: `${fmt(part)} is what % of ${fmt(n)}?` };
    }
    if (form === 'inc') {
      return { a: n, b: p, form, answer: n + p * n / 100, text: `${fmt(n)} increased by ${p}%` };
    }
    return { a: n, b: p, form, answer: n - p * n / 100, text: `${fmt(n)} decreased by ${p}%` };
  }

  function pickBase(R, p, lo, hi) {
    // base n in [lo, hi] such that p% of n is a whole number; step = 100/gcd(p,100)
    const step = 100 / gcd(p, 100);
    const kLo = Math.ceil(lo / step), kHi = Math.floor(hi / step);
    return step * R.int(kLo, Math.max(kLo, kHi));
  }
  function gcd(a, b) { while (b) { [a, b] = [b, a % b]; } return a; }

  const GENERATORS = { add: genAdd, sub: genSub, mul: genMul, div: genDiv, pct: genPct };

  // ---------- hints ----------
  // Each hint = { title, steps: [string...] }. Steps use the real numbers; the LAST step states the answer.

  function hintAdd(a, b) {
    const unit = nearestRoundUnit(b);
    const r = roundTo(b, unit), d = r - b;
    // 1. units make a ten
    if (a % 10 + b % 10 === 10 && a % 10 !== 0) {
      return {
        title: 'Make a ten',
        steps: [
          `The last digits ${a % 10} and ${b % 10} make 10 — use that.`,
          `Take ${b % 10} from ${fmt(b)} and give it to ${fmt(a)}: ${fmt(a)} + ${b % 10} = ${fmt(a + b % 10)}.`,
          `Now add what is left of ${fmt(b)}: ${fmt(a + b % 10)} + ${fmt(b - b % 10)} = ${fmt(a + b)}.`
        ]
      };
    }
    // 2. round and adjust when b is within 3 (or 30/300) of a round number
    if (d !== 0 && Math.abs(d) <= unit * 0.3 && b >= 10) {
      const dir = d > 0 ? 'up' : 'down';
      return {
        title: 'Round, then fix it',
        steps: [
          `${fmt(b)} is close to ${fmt(r)}. Round it ${dir} to ${fmt(r)} first.`,
          `${fmt(a)} + ${fmt(r)} = ${fmt(a + r)}.`,
          d > 0
            ? `You added ${fmt(d)} too much, so take it back: ${fmt(a + r)} − ${fmt(d)} = ${fmt(a + b)}.`
            : `You added ${fmt(-d)} too little, so add it now: ${fmt(a + r)} + ${fmt(-d)} = ${fmt(a + b)}.`
        ]
      };
    }
    // 3. break the smaller number into place values
    const parts = placeParts(b);
    const steps = [`Keep ${fmt(a)} whole and split ${fmt(b)} into ${parts.map(fmt).join(' + ')}.`];
    let run = a;
    for (const p of parts) { steps.push(`${fmt(run)} + ${fmt(p)} = ${fmt(run + p)}.`); run += p; }
    steps[steps.length - 1] = steps[steps.length - 1].replace(/\.$/, ' — that is the answer.');
    return { title: 'Add in chunks, big to small', steps };
  }

  function placeParts(n) {
    // 4738 -> [4000, 700, 30, 8] (non-zero parts only)
    const out = []; let unit = 1;
    while (unit * 10 <= n) unit *= 10;
    while (unit >= 1) { const p = Math.floor(n / unit) % 10 * unit; if (p) out.push(p); unit /= 10; }
    return out;
  }

  function hintSub(a, b) {
    const unit = nearestRoundUnit(b);
    const r = roundTo(b, unit), d = r - b; // d>0 means b was rounded up
    // 1. same-change: add d to both when b is just under a round number (e.g. 85 − 38 -> 87 − 40)
    if (d > 0 && d <= unit * 0.3 && b >= 10) {
      return {
        title: 'Shift both numbers',
        steps: [
          `${fmt(b)} is ${fmt(d)} short of ${fmt(r)}. Add ${fmt(d)} to BOTH numbers — the gap stays the same.`,
          `${fmt(a)} − ${fmt(b)} becomes ${fmt(a + d)} − ${fmt(r)}.`,
          `${fmt(a + d)} − ${fmt(r)} = ${fmt(a - b)}.`
        ]
      };
    }
    // 2. round b down then subtract the extra
    if (d < 0 && -d <= unit * 0.3 && b >= 10) {
      return {
        title: 'Round, then fix it',
        steps: [
          `${fmt(b)} is just over ${fmt(r)}. Subtract ${fmt(r)} first: ${fmt(a)} − ${fmt(r)} = ${fmt(a - r)}.`,
          `You still owe ${fmt(-d)}: ${fmt(a - r)} − ${fmt(-d)} = ${fmt(a - b)}.`
        ]
      };
    }
    // 3. count up from b to a when they are close
    if (a - b <= Math.max(50, unit)) {
      const nextTen = Math.ceil(b / 10) * 10;
      if (nextTen < a && nextTen !== b) {
        return {
          title: 'Count up like giving change',
          steps: [
            `Start at ${fmt(b)} and climb to ${fmt(a)}.`,
            `${fmt(b)} → ${fmt(nextTen)} is ${fmt(nextTen - b)}.`,
            `${fmt(nextTen)} → ${fmt(a)} is ${fmt(a - nextTen)}.`,
            `Total climbed: ${fmt(nextTen - b)} + ${fmt(a - nextTen)} = ${fmt(a - b)}.`
          ]
        };
      }
    }
    // 4. place values
    const parts = placeParts(b);
    const steps = [`Keep ${fmt(a)} whole and take away ${fmt(b)} in pieces: ${parts.map(fmt).join(', ')}.`];
    let run = a;
    for (const p of parts) { steps.push(`${fmt(run)} − ${fmt(p)} = ${fmt(run - p)}.`); run -= p; }
    steps[steps.length - 1] = steps[steps.length - 1].replace(/\.$/, ' — that is the answer.');
    return { title: 'Subtract in chunks, big to small', steps };
  }

  function hintMul(a, b) {
    // put the "special" number in s, the other in o
    const specials = [10, 100, 5, 50, 25, 9, 11, 12, 15, 20, 4, 8, 2, 3, 6];
    let s = null, o = null;
    for (const sp of specials) {
      if (b === sp) { s = b; o = a; break; }
      if (a === sp) { s = a; o = b; break; }
    }
    const ans = a * b;
    if (s === 10 || s === 100) {
      return { title: `Times ${s}: just add zeros`, steps: [`Multiplying by ${s} moves every digit ${s === 10 ? 'one place' : 'two places'} left.`, `${fmt(o)} × ${s} = ${fmt(ans)}.`] };
    }
    if (s === 5) {
      return { title: 'Times 5 = times 10, then halve', steps: [`${fmt(o)} × 10 = ${fmt(o * 10)}.`, `Half of ${fmt(o * 10)} is ${fmt(ans)}.`] };
    }
    if (s === 50) {
      return { title: 'Times 50 = times 100, then halve', steps: [`${fmt(o)} × 100 = ${fmt(o * 100)}.`, `Half of ${fmt(o * 100)} is ${fmt(ans)}.`] };
    }
    if (s === 25) {
      return { title: 'Times 25 = times 100, then quarter', steps: [`${fmt(o)} × 100 = ${fmt(o * 100)}.`, `Halve it: ${fmt(o * 50)}. Halve again: ${fmt(ans)}.`] };
    }
    if (s === 9) {
      return { title: 'Times 9 = times 10, minus one copy', steps: [`${fmt(o)} × 10 = ${fmt(o * 10)}.`, `Take away one ${fmt(o)}: ${fmt(o * 10)} − ${fmt(o)} = ${fmt(ans)}.`] };
    }
    if (s === 11 && o >= 10 && o <= 99 && o % 10 + Math.floor(o / 10) < 10) {
      const t = Math.floor(o / 10), u = o % 10;
      return { title: 'Times 11: add the two digits in the middle', steps: [`Digits of ${o} are ${t} and ${u}; ${t} + ${u} = ${t + u}.`, `Write ${t}, then ${t + u}, then ${u}: ${fmt(ans)}.`] };
    }
    if (s === 11 || s === 12) {
      return { title: `Times ${s} = times 10, plus times ${s - 10}`, steps: [`${fmt(o)} × 10 = ${fmt(o * 10)}.`, `${fmt(o)} × ${s - 10} = ${fmt(o * (s - 10))}.`, `${fmt(o * 10)} + ${fmt(o * (s - 10))} = ${fmt(ans)}.`] };
    }
    if (s === 15) {
      return { title: 'Times 15 = times 10, plus half of that', steps: [`${fmt(o)} × 10 = ${fmt(o * 10)}.`, `Half of ${fmt(o * 10)} is ${fmt(o * 5)}.`, `${fmt(o * 10)} + ${fmt(o * 5)} = ${fmt(ans)}.`] };
    }
    if (s === 20) {
      return { title: 'Times 20 = double, then times 10', steps: [`Double ${fmt(o)}: ${fmt(o * 2)}.`, `${fmt(o * 2)} × 10 = ${fmt(ans)}.`] };
    }
    if (s === 4 || s === 8) {
      const steps = [`Double ${fmt(o)}: ${fmt(o * 2)}.`, `Double again: ${fmt(o * 4)}.`];
      if (s === 8) steps.push(`Double once more: ${fmt(ans)}.`);
      else steps[1] = `Double again: ${fmt(ans)}.`;
      return { title: `Times ${s} = double ${s === 4 ? 'twice' : 'three times'}`, steps };
    }
    if (s === 2) return { title: 'Times 2 = double it', steps: [`Double ${fmt(o)}: ${fmt(o)} + ${fmt(o)} = ${fmt(ans)}.`] };
    if (s === 3 || s === 6) {
      const steps = [`Double ${fmt(o)}: ${fmt(o * 2)}. Add one more ${fmt(o)}: ${fmt(o * 3)}.`];
      if (s === 6) steps.push(`Times 6 is double of times 3: ${fmt(o * 3)} × 2 = ${fmt(ans)}.`);
      else steps[0] = steps[0].replace(/\.$/, ' — that is the answer.');
      return { title: `Times ${s} = double, plus one more`, steps };
    }
    // near a round number: 47 × 19 = 47 × 20 − 47
    for (const [x, y] of [[a, b], [b, a]]) {
      const unit = nearestRoundUnit(y), r = roundTo(y, unit), d = r - y;
      if (y >= 11 && d !== 0 && Math.abs(d) <= 2) {
        return {
          title: 'Round one number, then fix it',
          steps: [
            `${fmt(y)} is almost ${fmt(r)}. Do ${fmt(x)} × ${fmt(r)} = ${fmt(x * r)} first.`,
            d > 0
              ? `That used ${fmt(d)} extra ${fmt(x)}${d > 1 ? 's' : ''}: ${fmt(x * r)} − ${fmt(x * d)} = ${fmt(ans)}.`
              : `That is ${fmt(-d)} ${fmt(x)}${-d > 1 ? 's' : ''} short: ${fmt(x * r)} + ${fmt(x * -d)} = ${fmt(ans)}.`
          ]
        };
      }
    }
    // double-and-halve: one even, other ends in 5
    if ((a % 2 === 0 && b % 10 === 5) || (b % 2 === 0 && a % 10 === 5)) {
      const ev = a % 2 === 0 ? a : b, fv = a % 2 === 0 ? b : a;
      return {
        title: 'Halve one, double the other',
        steps: [
          `Half of ${fmt(ev)} is ${fmt(ev / 2)}; double of ${fmt(fv)} is ${fmt(fv * 2)}. The product does not change.`,
          `${fmt(ev / 2)} × ${fmt(fv * 2)} = ${fmt(ans)}.`
        ]
      };
    }
    // small times table
    if (a <= 12 && b <= 12) {
      const big = Math.max(a, b), small = Math.min(a, b);
      if (small % 2 === 0 && small > 2) {
        return { title: 'Halve, then double back', steps: [`${fmt(big)} × ${fmt(small / 2)} = ${fmt(big * small / 2)}.`, `Double it: ${fmt(ans)}.`] };
      }
      return { title: 'Build from a fact you know', steps: [`${fmt(big)} × ${fmt(small - 1)} = ${fmt(big * (small - 1))}.`, `Add one more ${fmt(big)}: ${fmt(big * (small - 1))} + ${fmt(big)} = ${fmt(ans)}.`] };
    }
    // generic: split the second number into place values
    const [x, y] = digitsOf(a) >= digitsOf(b) ? [a, b] : [b, a];
    const parts = placeParts(y);
    const steps = [`Split ${fmt(y)} into ${parts.map(fmt).join(' + ')} and multiply ${fmt(x)} by each.`];
    const partials = parts.map(p => x * p);
    parts.forEach((p, i) => steps.push(`${fmt(x)} × ${fmt(p)} = ${fmt(partials[i])}.`));
    if (parts.length > 1) steps.push(`Add them: ${partials.map(fmt).join(' + ')} = ${fmt(ans)}.`);
    return { title: 'Split one number, multiply the pieces', steps };
  }

  function hintDiv(a, b) {
    const q = a / b;
    if (b === 10 || b === 100) return { title: `Divide by ${b}: drop zeros`, steps: [`Move every digit ${b === 10 ? 'one place' : 'two places'} right.`, `${fmt(a)} ÷ ${b} = ${fmt(q)}.`] };
    if (b === 2) return { title: 'Divide by 2 = halve it', steps: [`Half of ${fmt(a)} is ${fmt(q)}.`] };
    if (b === 4) return { title: 'Divide by 4 = halve twice', steps: [`Half of ${fmt(a)} is ${fmt(a / 2)}.`, `Half again: ${fmt(q)}.`] };
    if (b === 8) return { title: 'Divide by 8 = halve three times', steps: [`Half of ${fmt(a)} is ${fmt(a / 2)}.`, `Half again: ${fmt(a / 4)}.`, `Once more: ${fmt(q)}.`] };
    if (b === 5) return { title: 'Divide by 5 = double, then drop a zero', steps: [`Double ${fmt(a)}: ${fmt(a * 2)}.`, `Divide by 10: ${fmt(q)}.`] };
    if (b === 50) return { title: 'Divide by 50 = double, then drop two zeros', steps: [`Double ${fmt(a)}: ${fmt(a * 2)}.`, `Divide by 100: ${fmt(q)}.`] };
    if (b === 25) return { title: 'Divide by 25 = times 4, then drop two zeros', steps: [`${fmt(a)} × 4 = ${fmt(a * 4)}.`, `Divide by 100: ${fmt(q)}.`] };
    if (b === 20) return { title: 'Divide by 20 = halve, then drop a zero', steps: [`Half of ${fmt(a)} is ${fmt(a / 2)}.`, `Divide by 10: ${fmt(q)}.`] };
    // both even and b > 12: simplify
    if (a % 2 === 0 && b % 2 === 0 && b > 12) {
      return { title: 'Halve both numbers first', steps: [`${fmt(a)} ÷ ${fmt(b)} is the same as ${fmt(a / 2)} ÷ ${fmt(b / 2)}.`, `Now ask: ${fmt(b / 2)} × ? = ${fmt(a / 2)}. Answer: ${fmt(q)}.`] };
    }
    // chunking: take out tens of b
    if (q > 12) {
      const tens = Math.floor(q / 10) * 10;
      const chunk = b * tens;
      const rest = a - chunk;
      return {
        title: 'Think in multiplication, in chunks',
        steps: [
          `Ask: ${fmt(b)} × ? = ${fmt(a)}.`,
          `${fmt(b)} × ${fmt(tens)} = ${fmt(chunk)}, leaving ${fmt(a)} − ${fmt(chunk)} = ${fmt(rest)}.`,
          rest === 0 ? `Nothing left, so the answer is ${fmt(q)}.` : `${fmt(b)} × ${fmt(rest / b)} = ${fmt(rest)}. So ${fmt(tens)} + ${fmt(rest / b)} = ${fmt(q)}.`
        ]
      };
    }
    return { title: 'Think in multiplication', steps: [`Ask: ${fmt(b)} × ? = ${fmt(a)}.`, `${fmt(b)} × 10 = ${fmt(b * 10)}; ${fmt(a)} is ${a > b * 10 ? 'more' : 'less'}, so try nearby: ${fmt(b)} × ${fmt(q)} = ${fmt(a)}.`, `So the answer is ${fmt(q)}.`] };
  }

  function hintPct(prob) {
    const { form } = prob;
    if (form === 'of') return pctOfHint(prob.a, prob.b, prob.answer);
    if (form === 'what') {
      const part = prob.a, n = prob.b, p = prob.answer;
      const one = n / 100;
      return {
        title: 'Find 1% first, then count',
        steps: [
          `1% of ${fmt(n)} is ${fmt(one)} (divide by 100).`,
          `How many ${fmt(one)}s fit in ${fmt(part)}? ${fmt(part)} ÷ ${fmt(one)} = ${fmt(p)}.`,
          `So ${fmt(part)} is ${fmt(p)}% of ${fmt(n)}.`
        ]
      };
    }
    const n = prob.a, p = prob.b, delta = p * n / 100;
    const inner = pctOfHint(p, n, delta);
    const steps = [`First find ${p}% of ${fmt(n)}.`].concat(inner.steps);
    steps.push(form === 'inc'
      ? `Add it on: ${fmt(n)} + ${fmt(delta)} = ${fmt(prob.answer)}.`
      : `Take it off: ${fmt(n)} − ${fmt(delta)} = ${fmt(prob.answer)}.`);
    return { title: `Find the ${p}% first, then ${form === 'inc' ? 'add it' : 'subtract it'}`, steps };
  }

  function pctOfHint(p, n, ans) {
    const ten = n / 10, one = n / 100, five = n / 20;
    if (p === 50) return { title: '50% = half', steps: [`Half of ${fmt(n)} is ${fmt(ans)}.`] };
    if (p === 25) return { title: '25% = a quarter (halve twice)', steps: [`Half of ${fmt(n)} is ${fmt(n / 2)}.`, `Half again: ${fmt(ans)}.`] };
    if (p === 75) return { title: '75% = three quarters', steps: [`A quarter of ${fmt(n)} is ${fmt(n / 4)}.`, `Three of them: ${fmt(n / 4)} × 3 = ${fmt(ans)}.`] };
    if (p === 10) return { title: '10% = move the decimal one place', steps: [`${fmt(n)} → ${fmt(ans)}.`] };
    if (p === 1) return { title: '1% = move the decimal two places', steps: [`${fmt(n)} → ${fmt(ans)}.`] };
    if (p === 5) return { title: '5% = half of 10%', steps: [`10% of ${fmt(n)} is ${fmt(ten)}.`, `Half of that: ${fmt(ans)}.`] };
    if (p === 20) return { title: '20% = divide by 5 (or double 10%)', steps: [`10% of ${fmt(n)} is ${fmt(ten)}.`, `Double it: ${fmt(ans)}.`] };
    // swap trick when n is a "nice" percent and p is not
    if ([10, 20, 25, 50, 100].includes(n) && p % 10 !== 0) {
      return { title: 'Swap them: p% of n = n% of p', steps: [`${p}% of ${n} is the same as ${n}% of ${p}.`, `${n}% of ${p} = ${fmt(ans)}.`] };
    }
    if (p % 10 === 0) {
      return { title: 'Start from 10%', steps: [`10% of ${fmt(n)} is ${fmt(ten)}.`, `${p}% is ${p / 10} of those: ${fmt(ten)} × ${p / 10} = ${fmt(ans)}.`] };
    }
    if (p % 5 === 0) {
      const tens = Math.floor(p / 10);
      return {
        title: 'Build from 10% and 5%',
        steps: [
          `10% of ${fmt(n)} is ${fmt(ten)}, so ${tens * 10}% is ${fmt(ten * tens)}.`,
          `5% is half of 10%: ${fmt(five)}.`,
          `${tens * 10}% + 5% = ${fmt(ten * tens)} + ${fmt(five)} = ${fmt(ans)}.`
        ]
      };
    }
    if (p < 10) {
      if (p >= 6) {
        return { title: 'Start at 10% and step down by 1%', steps: [`10% of ${fmt(n)} is ${fmt(ten)}; 1% is ${fmt(one)}.`, `${p}% = 10% − ${10 - p} × 1% = ${fmt(ten)} − ${fmt(one * (10 - p))} = ${fmt(ans)}.`] };
      }
      return { title: 'Count 1%s', steps: [`1% of ${fmt(n)} is ${fmt(one)}.`, `${p}% = ${p} × ${fmt(one)} = ${fmt(ans)}.`] };
    }
    // general: tens + ones (or tens+1 minus ones)
    const tens = Math.floor(p / 10), ones = p % 10;
    if (ones >= 6) {
      return {
        title: 'Go to the next 10%, then step back',
        steps: [
          `10% of ${fmt(n)} is ${fmt(ten)}, so ${(tens + 1) * 10}% is ${fmt(ten * (tens + 1))}.`,
          `1% is ${fmt(one)}; step back ${10 - ones} of them: ${fmt(one * (10 - ones))}.`,
          `${fmt(ten * (tens + 1))} − ${fmt(one * (10 - ones))} = ${fmt(ans)}.`
        ]
      };
    }
    if (ones === 5) {
      return {
        title: 'Build from 10% and 5%',
        steps: [
          `10% of ${fmt(n)} is ${fmt(ten)}, so ${tens * 10}% is ${fmt(ten * tens)}.`,
          `5% is ${fmt(five)}.`,
          `${fmt(ten * tens)} + ${fmt(five)} = ${fmt(ans)}.`
        ]
      };
    }
    return {
      title: 'Build from 10% and 1%',
      steps: [
        `10% of ${fmt(n)} is ${fmt(ten)}, so ${tens * 10}% is ${fmt(ten * tens)}.`,
        `1% is ${fmt(one)}, so ${ones}% is ${fmt(one * ones)}.`,
        `${fmt(ten * tens)} + ${fmt(one * ones)} = ${fmt(ans)}.`
      ]
    };
  }

  function hintFor(prob) {
    switch (prob.op) {
      case 'add': return hintAdd(prob.a, prob.b);
      case 'sub': return hintSub(prob.a, prob.b);
      case 'mul': return hintMul(prob.a, prob.b);
      case 'div': return hintDiv(prob.a, prob.b);
      case 'pct': return hintPct(prob);
    }
  }

  // ---------- public: generate ----------
  function generate(op, level, rng) {
    const R = makeRand(rng);
    if (op === 'mixed' || !OPS.includes(op)) op = R.pick(OPS);
    if (!LEVELS.includes(level)) level = 'easy';
    const base = GENERATORS[op](R, level);
    const prob = Object.assign({ op, level }, base);
    prob.hint = hintFor(prob);
    prob.targetSec = TARGET_SEC[op][level];
    return prob;
  }

  // ---------- answers & scoring ----------
  function parseInput(str) {
    const s = String(str).replace(/,/g, '').trim();
    if (!/^-?\d*\.?\d+$/.test(s)) return null;
    return parseFloat(s);
  }
  function checkAnswer(prob, input) {
    const v = typeof input === 'number' ? input : parseInput(input);
    if (v === null || Number.isNaN(v)) return false;
    return Math.abs(v - prob.answer) < 0.005;
  }
  function scoreFor(prob, seconds, usedHint) {
    const base = BASE_POINTS[prob.level] || 10;
    if (usedHint) return Math.round(base / 2);
    const t = prob.targetSec;
    // full bonus (=base) at or under target, fading to 0 at 3x target
    const frac = Math.max(0, Math.min(1, (3 * t - seconds) / (2 * t)));
    return base + Math.round(base * frac);
  }

  // ---------- adaptive level ----------
  function nextLevel(level, recent) {
    // recent = last results [{correct, fast}] newest last; up after 5 straight fast+correct, down after 3 wrong in last 5
    const i = LEVELS.indexOf(level);
    const last5 = recent.slice(-5);
    if (last5.length === 5 && last5.every(r => r.correct && r.fast) && i < LEVELS.length - 1) return LEVELS[i + 1];
    if (last5.filter(r => !r.correct).length >= 3 && i > 0) return LEVELS[i - 1];
    return level;
  }

  // ---------- days & streaks ----------
  function dayKey(d) {
    const dt = d instanceof Date ? d : new Date(d);
    const y = dt.getFullYear(), m = String(dt.getMonth() + 1).padStart(2, '0'), day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  function shiftDay(key, delta) {
    const [y, m, d] = key.split('-').map(Number);
    const dt = new Date(y, m - 1, d + delta);
    return dayKey(dt);
  }
  /** days: { 'YYYY-MM-DD': { solved, ... } }, goal: solves needed per day, today: 'YYYY-MM-DD'
      returns { current, best, todayMet, alive } — alive = streak is not yet broken (today may still be pending) */
  function streakFrom(days, goal, today) {
    const met = (k) => !!(days[k] && days[k].solved >= goal);
    let current = 0;
    let k = today;
    if (!met(k)) k = shiftDay(k, -1); // today not done yet: streak alive if yesterday met
    while (met(k)) { current++; k = shiftDay(k, -1); }
    // best streak over all history
    const keys = Object.keys(days).filter(met).sort();
    let best = 0, run = 0, prev = null;
    for (const key of keys) {
      run = (prev && shiftDay(prev, 1) === key) ? run + 1 : 1;
      if (run > best) best = run;
      prev = key;
    }
    return { current, best: Math.max(best, current), todayMet: met(today), alive: current > 0 };
  }

  return {
    OPS, OP_LABEL, OP_SYMBOL, LEVELS, BASE_POINTS, TARGET_SEC,
    generate, hintFor, checkAnswer, parseInput, scoreFor, nextLevel,
    dayKey, shiftDay, streakFrom, fmt
  };
});
