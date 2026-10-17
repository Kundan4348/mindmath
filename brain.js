/* MindMath brain module — imagining and creative-thinking exercises.
   Pure functions, no DOM. Works in the browser (window.Brain) and in Node (module.exports).
   Every exercise returns a task object; graded tasks carry an answer the UI checks with Brain.check(). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Brain = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // kind -> how it is shown and counted. group: 'imagine' or 'create' (the two non-math slots of the daily mix)
  const META = {
    picture: { label: 'Picture builder', emoji: '🧊', group: 'imagine', graded: true, maxLevel: 7, blurb: 'Build a scene in your head one piece at a time, then answer a question only the picture can answer.' },
    rotate:  { label: 'Rotate & fold',   emoji: '🔄', group: 'imagine', graded: true, maxLevel: 6, blurb: 'Turn a shape in your mind, or unfold a punched paper.' },
    walk:    { label: 'Walk in your head', emoji: '🧭', group: 'imagine', graded: true, maxLevel: 7, blurb: 'Follow directions with nothing on screen, then point home.' },
    palace:  { label: 'Memory walk',     emoji: '🏠', group: 'imagine', graded: true, maxLevel: 8, blurb: 'Place words in the rooms of your home, then recall them.' },
    mathpic: { label: 'Math as pictures', emoji: '🟦', group: 'imagine', graded: true, maxLevel: 3, blurb: 'See the sum as an area or a number line, then do it without the picture.' },
    uses:    { label: 'Other uses',      emoji: '🧱', group: 'create',  graded: false, maxLevel: 1, blurb: 'One object, 60 seconds, as many uses as you can.' },
    links:   { label: 'Three words, one link', emoji: '🔗', group: 'create', graded: true, maxLevel: 1, blurb: 'Find the one word that joins all three.' },
    combine: { label: 'Force a combination', emoji: '⚡', group: 'create', graded: false, maxLevel: 1, blurb: 'Two unrelated things: invent one product or story in 90 seconds.' },
    whatif:  { label: 'What if…',        emoji: '🌀', group: 'create',  graded: false, maxLevel: 1, blurb: 'One odd prompt a day, three consequences.' }
  };
  const KINDS = Object.keys(META);
  const GROUP = { imagine: KINDS.filter(k => META[k].group === 'imagine'), create: KINDS.filter(k => META[k].group === 'create') };

  // ---------- word lists ----------
  const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'white', 'black'];
  const SHAPES = ['cube', 'ball', 'ring', 'star', 'cone', 'box', 'disc', 'egg'];
  const ROOMS = ['front door', 'hallway', 'kitchen', 'fridge', 'dining table', 'living room sofa', 'TV', 'window', 'stairs', 'bedroom', 'wardrobe', 'bathroom mirror', 'balcony', 'desk'];
  const NOUNS = ['umbrella', 'candle', 'ladder', 'violin', 'pineapple', 'helmet', 'kettle', 'parrot', 'mirror', 'compass', 'blanket', 'bucket', 'rocket', 'bicycle', 'lantern',
    'camel', 'anchor', 'feather', 'trumpet', 'cactus', 'hammer', 'pillow', 'tractor', 'telescope', 'sandwich', 'scissors', 'balloon', 'glove', 'piano', 'teapot',
    'penguin', 'drum', 'crown', 'whistle', 'carpet', 'mushroom', 'suitcase', 'magnet', 'octopus', 'saddle', 'needle', 'tomato', 'barrel', 'kite', 'scarf',
    'robot', 'coconut', 'spoon', 'lighthouse', 'bell', 'tiger', 'ribbon', 'hourglass', 'cabbage', 'guitar', 'sponge', 'wallet', 'dolphin', 'basket', 'medal',
    'bridge', 'jacket', 'rope', 'owl', 'mango', 'wheel', 'notebook', 'volcano', 'spider', 'fountain', 'toothbrush', 'cannon', 'apron', 'snail', 'battery',
    'goat', 'envelope', 'cherry', 'tent', 'flute', 'shovel', 'eagle', 'pencil', 'turtle', 'cloud', 'brick', 'carrot', 'camera', 'zebra', 'bottle',
    'ticket', 'lemon', 'puzzle', 'sofa', 'jar', 'kangaroo', 'map', 'onion', 'bench', 'donut', 'fence', 'yacht', 'calendar', 'ladle', 'frog'];
  const OBJECTS = ['a brick', 'a paper clip', 'a shoe', 'a spoon', 'an old newspaper', 'a rubber band', 'a plastic bottle', 'a sock', 'a pencil', 'a coffee mug',
    'a bedsheet', 'a bucket', 'a belt', 'a coat hanger', 'a cardboard box', 'a tennis ball', 'a mirror', 'a candle', 'a ladder', 'a chair',
    'an umbrella', 'a bar of soap', 'a key', 'a towel', 'a balloon', 'a broom', 'a rope', 'a tyre', 'a glass jar', 'a safety pin',
    'a book', 'a blanket', 'a brick wall', 'a USB cable', 'a toothbrush', 'a plate', 'a hat', 'a pillow', 'a shopping bag', 'an ice cube',
    'a stapler', 'a water bottle cap', 'a bicycle wheel', 'a wooden plank', 'a fork', 'a magnet', 'a sticky note', 'a curtain', 'a banana peel', 'a phone charger'];
  const WHATIF = ['What if shops had no prices and you paid what you thought was fair?', 'What if everyone could hear each other\'s thoughts for one hour a day?',
    'What if gravity switched off for ten minutes every afternoon?', 'What if money expired after 30 days?', 'What if you could only speak 100 words a day?',
    'What if cities were built underground?', 'What if nobody needed sleep?', 'What if every job paid the same?', 'What if cars did not exist?',
    'What if you could pause time, but only when standing still?', 'What if trees could talk, slowly?', 'What if the sea was fresh water?',
    'What if everyone had to change careers every five years?', 'What if your memory reset every Monday?', 'What if there were no clocks or calendars?',
    'What if it rained only at night?', 'What if children ran the government for one month a year?', 'What if houses could move like caravans?',
    'What if plastic dissolved in rain?', 'What if we each had a personal robot that could only do one task?', 'What if school lasted your whole life, two hours a day?',
    'What if the internet switched off every Sunday?', 'What if food was free but only one dish per day for everyone?', 'What if you could taste colours?',
    'What if all meetings had to happen while walking?', 'What if every building had to grow its own food on the roof?', 'What if the sun set at 3 pm all year?',
    'What if you aged backwards after 40?', 'What if nothing could be owned, only borrowed?', 'What if music was illegal?',
    'What if everyone had the same salary but different hours?', 'What if you could send one message to your past self each year?', 'What if there were no mirrors?',
    'What if every road was a river?', 'What if animals could vote?', 'What if lying was physically impossible?', 'What if all humans were the same height?',
    'What if there was a 25th hour that only you could use?', 'What if electricity cost 100 times more?', 'What if you had to move house every year?',
    'What if people could photosynthesise like plants?', 'What if the alphabet had only ten letters?', 'What if dreams were recorded and could be replayed?',
    'What if there were no secrets?', 'What if everyone worked only three days a week?', 'What if books vanished after one reading?',
    'What if you could swap bodies with anyone for a day, once?', 'What if there was no night-time lighting anywhere?', 'What if every decision had to be made by coin toss?',
    'What if kitchens disappeared and all food came from shared street kitchens?'];
  // Remote-associates style triplets: the answer forms a common phrase or compound with each word
  const TRIPLETS = [['cottage', 'swiss', 'cake', 'cheese'], ['cream', 'skate', 'water', 'ice'], ['loser', 'throat', 'spot', 'sore'], ['show', 'life', 'row', 'boat'],
    ['night', 'wrist', 'stop', 'watch'], ['duck', 'fold', 'dollar', 'bill'], ['rocking', 'wheel', 'high', 'chair'], ['dew', 'comb', 'bee', 'honey'],
    ['fountain', 'baking', 'pop', 'soda'], ['preserve', 'ranger', 'tropical', 'forest'], ['aid', 'rubber', 'wagon', 'band'], ['flake', 'mobile', 'cone', 'snow'],
    ['cracker', 'fly', 'fighter', 'fire'], ['safety', 'cushion', 'point', 'pin'], ['cane', 'daddy', 'plum', 'sugar'], ['dream', 'break', 'light', 'day'],
    ['fish', 'mine', 'rush', 'gold'], ['political', 'surprise', 'line', 'party'], ['measure', 'worm', 'video', 'tape'], ['high', 'district', 'house', 'school'],
    ['sense', 'courtesy', 'place', 'common'], ['worm', 'shelf', 'end', 'book'], ['piece', 'mind', 'dating', 'game'], ['flower', 'friend', 'scout', 'girl'],
    ['river', 'note', 'account', 'bank'], ['print', 'berry', 'bird', 'blue'], ['pie', 'luck', 'belly', 'pot'], ['date', 'alley', 'fold', 'blind'],
    ['opera', 'hand', 'dish', 'soap'], ['cadet', 'capsule', 'ship', 'space'], ['fur', 'rack', 'tail', 'coat'], ['stick', 'maker', 'point', 'match'],
    ['hound', 'pressure', 'shot', 'blood'], ['fox', 'man', 'peep', 'hole'], ['sleeping', 'bean', 'trash', 'bag'], ['dust', 'cereal', 'fish', 'bowl'],
    ['light', 'birthday', 'stick', 'candle'], ['food', 'forward', 'break', 'fast'], ['shine', 'beam', 'struck', 'moon'], ['peach', 'arm', 'tar', 'pit'],
    ['water', 'mine', 'shaker', 'salt'], ['palm', 'shoe', 'house', 'tree'], ['basket', 'eight', 'snow', 'ball'], ['wheel', 'hand', 'shopping', 'cart'],
    ['right', 'cat', 'carbon', 'copy'], ['home', 'sea', 'bed', 'sick'], ['nuclear', 'feud', 'album', 'family'], ['sandwich', 'house', 'golf', 'club'],
    ['cross', 'rain', 'tie', 'bow'], ['sage', 'paint', 'hair', 'brush'], ['french', 'car', 'shoe', 'horn'], ['boot', 'summer', 'ground', 'camp'],
    ['chamber', 'staff', 'box', 'music'], ['mill', 'tooth', 'dust', 'saw'], ['main', 'sweeper', 'light', 'street'], ['pike', 'coat', 'signal', 'turn'],
    ['office', 'mail', 'hat', 'box'], ['fly', 'clip', 'wall', 'paper'], ['age', 'mile', 'sand', 'stone'], ['catcher', 'food', 'hot', 'dog'],
    ['wagon', 'break', 'radio', 'station'], ['tank', 'hill', 'secret', 'top'], ['health', 'taker', 'less', 'care'], ['lick', 'sprinkle', 'mines', 'salt'],
    ['time', 'hair', 'stretch', 'long'], ['trip', 'house', 'goal', 'field'], ['man', 'glue', 'star', 'super'], ['fence', 'card', 'master', 'post'],
    ['test', 'runner', 'map', 'road'], ['board', 'magic', 'death', 'black'], ['way', 'ground', 'weather', 'fair'], ['mouse', 'bear', 'sauce', 'house'],
    ['cat', 'number', 'phone', 'call'], ['bump', 'egg', 'step', 'goose'], ['guy', 'rain', 'down', 'fall'], ['wise', 'work', 'tower', 'clock'],
    ['chocolate', 'fortune', 'tin', 'cookie'], ['walker', 'main', 'sweeper', 'street'], ['bass', 'complex', 'sleep', 'deep'], ['dress', 'dial', 'flower', 'sun']];

  // ---------- random helpers ----------
  function makeRand(rng) {
    const r = rng || Math.random;
    return {
      int: (lo, hi) => lo + Math.floor(r() * (hi - lo + 1)),
      pick: (arr) => arr[Math.floor(r() * arr.length)],
      chance: (p) => r() < p,
      shuffle: (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
    };
  }
  // deterministic rng from a string (used so "today's mix" is the same all day)
  function seeded(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    let a = h >>> 0;
    return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

  // ---------- 1. Picture builder ----------
  // Scene = piles on a table, left to right; each pile is a stack bottom -> top. Objects have a unique colour and shape.
  function genPicture(R, level) {
    // objects per level: L1 2, L2-3 3, L4-5 4, L6 5, L7 6 (plus moves from L3)
    const count = Math.min(7, 2 + Math.floor(level / 2) + (level >= 7 ? 1 : 0));
    const colors = R.shuffle(COLORS).slice(0, count), shapes = R.shuffle(SHAPES).slice(0, count);
    const objs = colors.map((c, i) => ({ id: i, name: `${c} ${shapes[i]}`, short: shapes[i] }));
    const piles = [[0]];
    const steps = [`Picture a ${objs[0].name} on a table.`];
    for (let i = 1; i < count; i++) {
      const o = objs[i];
      const mode = R.pick(piles.length >= 3 ? ['top', 'top'] : ['top', 'left', 'right']);
      if (mode === 'top') { const p = R.int(0, piles.length - 1); const under = objs[piles[p][piles[p].length - 1]]; piles[p].push(i); steps.push(`Put a ${o.name} on top of the ${under.short}.`); }
      else if (mode === 'left') { const ref = objs[piles[0][0]]; piles.unshift([i]); steps.push(`Place a ${o.name} on the table to the left of the ${ref.short}.`); }
      else { const ref = objs[piles[piles.length - 1][0]]; piles.push([i]); steps.push(`Place a ${o.name} on the table to the right of the ${ref.short}.`); }
    }
    // moves at higher levels: move a top object onto another pile, or swap two whole piles
    const moves = level >= 3 ? Math.min(level - 2, 3) : 0;
    for (let m = 0; m < moves; m++) {
      const tops = piles.map((p, idx) => idx).filter(idx => piles[idx].length > 0);
      if (piles.length >= 2 && R.chance(0.6)) {
        const from = R.pick(tops); let to = R.pick(tops.filter(t => t !== from)); if (to === undefined) continue;
        const o = piles[from].pop(); const target = objs[piles[to][piles[to].length - 1]];
        piles[to].push(o);
        steps.push(`Move the ${objs[o].short} onto the ${target.short}.`);
        if (piles[from].length === 0) piles.splice(from, 1);
      } else if (piles.length >= 2) {
        const a = R.int(0, piles.length - 2), b = a + 1;
        [piles[a], piles[b]] = [piles[b], piles[a]];
        steps.push(`Swap the two piles: the ${objs[piles[a][0]].short} pile and the ${objs[piles[b][0]].short} pile change places.`);
      }
    }
    // question
    const flat = piles.flat();
    const qs = [];
    for (const p of piles) for (let i = 0; i < p.length; i++) {
      const o = objs[p[i]];
      qs.push({ q: `What is on top of the ${o.short}?`, a: i + 1 < p.length ? objs[p[i + 1]].name : 'nothing', opts: 'objects+nothing' });
      qs.push({ q: `What is under the ${o.short}?`, a: i > 0 ? objs[p[i - 1]].name : 'the table', opts: 'objects+table' });
    }
    qs.push({ q: 'How many objects are touching the table?', a: String(piles.length), opts: 'numbers' });
    const heights = piles.map(p => p.length), maxH = Math.max(...heights);
    if (heights.filter(h => h === maxH).length === 1 && maxH > 1) qs.push({ q: 'Which object is the highest up?', a: objs[piles[heights.indexOf(maxH)].slice(-1)[0]].name, opts: 'objects' });
    if (piles.length >= 2) {
      qs.push({ q: 'Which object is at the bottom of the left-most pile?', a: objs[piles[0][0]].name, opts: 'objects' });
      qs.push({ q: 'Which object is at the bottom of the right-most pile?', a: objs[piles[piles.length - 1][0]].name, opts: 'objects' });
      const o = objs[R.pick(flat)]; const pi = piles.findIndex(p => p.includes(o.id));
      qs.push({ q: `Counting piles from the left, which pile is the ${o.short} in?`, a: String(pi + 1), opts: 'numbers' });
    }
    const pick = R.pick(qs);
    let options;
    if (pick.opts === 'numbers') { const n = Number(pick.a); options = [...new Set([n, Math.max(1, n - 1), n + 1, n + 2, Math.max(1, n - 2)])].slice(0, 4).map(String); }
    else { options = R.shuffle(objs.map(o => o.name).filter(x => x !== pick.a)).slice(0, 3); if (pick.opts === 'objects+nothing' && pick.a !== 'nothing' && R.chance(0.5)) options[2] = 'nothing'; if (pick.opts === 'objects+table' && pick.a !== 'the table' && R.chance(0.5)) options[2] = 'the table'; options.push(pick.a); }
    options = R.shuffle([...new Set(options)]);
    const scene = piles.map(p => p.map(i => objs[i].name));
    return { kind: 'picture', level, steps, question: pick.q, answer: pick.a, options, scene, parts: count, points: 10 + 6 * level,
      explain: 'Final picture, left to right (bottom → top): ' + scene.map(p => p.join(' → ')).join('  |  ') };
  }

  // ---------- 3. Walk in your head ----------
  const DIRS = ['north', 'east', 'south', 'west'];
  const DVEC = { north: [0, 1], east: [1, 0], south: [0, -1], west: [-1, 0] };
  function compass(dx, dy) {
    if (!dx && !dy) return 'here';
    const ns = dy > 0 ? 'north' : dy < 0 ? 'south' : '', ew = dx > 0 ? 'east' : dx < 0 ? 'west' : '';
    if (!ns) return ew; if (!ew) return ns;
    return ns + '-' + ew;
  }
  function genWalk(R, level) {
    const n = Math.min(3 + level, 10);
    const relative = level >= 4;                   // some steps become "turn left/right, go N"
    let x = 0, y = 0, facing = 0, steps = [];      // facing index into DIRS
    for (let i = 0; i < n; i++) {
      const k = R.int(1, level >= 3 ? 4 : 3);
      if (relative && i > 0 && R.chance(0.5)) {
        const turn = R.pick(['left', 'right', 'around']);
        facing = (facing + (turn === 'left' ? 3 : turn === 'right' ? 1 : 2)) % 4;
        steps.push(`Turn ${turn} and walk ${plural(k, 'block')}.`);
      } else {
        facing = R.int(0, 3);
        steps.push(`${i === 0 ? 'Leave home and walk' : 'Walk'} ${plural(k, 'block')} ${DIRS[facing]}.`);
      }
      x += DVEC[DIRS[facing]][0] * k; y += DVEC[DIRS[facing]][1] * k;
    }
    // where is home from where you stand? (opposite of your position)
    const answer = compass(-x, -y);
    const dist = Math.abs(x) + Math.abs(y);
    return { kind: 'walk', level, steps, question: 'From where you stand now, which direction is home?', answer,
      options: ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'here'], pos: [x, y], dist, points: 10 + 5 * level,
      explain: dist === 0 ? 'You walked in a loop — you are standing at home.' : `You ended ${Math.abs(x) ? plural(Math.abs(x), 'block') + ' ' + (x > 0 ? 'east' : 'west') : ''}${Math.abs(x) && Math.abs(y) ? ' and ' : ''}${Math.abs(y) ? plural(Math.abs(y), 'block') + ' ' + (y > 0 ? 'north' : 'south') : ''} of home, so home is to the ${answer}.` };
  }

  // ---------- 2. Rotate & fold ----------
  // grids are arrays of [x,y] cells on an N×N board; serialised as sorted "x,y" strings for comparison
  const key = (cells) => cells.map(c => c.join(',')).sort().join(';');
  function normalize(cells) { const mx = Math.min(...cells.map(c => c[0])), my = Math.min(...cells.map(c => c[1])); return cells.map(([x, y]) => [x - mx, y - my]); }
  function rot(cells, times) { let c = cells; for (let i = 0; i < times; i++) c = normalize(c.map(([x, y]) => [y, -x])); return c; }
  function mirror(cells) { return normalize(cells.map(([x, y]) => [-x, y])); }
  function polyomino(R, n) {
    for (let tries = 0; tries < 50; tries++) {
      const cells = [[0, 0]]; const has = new Set(['0,0']);
      while (cells.length < n) {
        const [x, y] = R.pick(cells); const [dx, dy] = R.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
        const k = `${x + dx},${y + dy}`; if (!has.has(k)) { has.add(k); cells.push([x + dx, y + dy]); }
      }
      const norm = normalize(cells);
      // reject shapes with rotational symmetry (rotations would be indistinguishable) and mirror-symmetric ones (mirror distractor would equal the answer)
      const k0 = key(norm);
      if ([1, 2, 3].some(t => key(rot(norm, t)) === k0)) continue;
      if ([0, 1, 2, 3].some(t => key(rot(mirror(norm), t)) === k0)) continue;
      return norm;
    }
    return normalize([[0, 0], [1, 0], [2, 0], [2, 1], [0, 1], [0, 2]]);  // asymmetric fallback
  }
  function genRotate(R, level) {
    const n = Math.min(4 + Math.floor((level - 1) / 2), 7);            // cells: L1-2 4, L3-4 5, L5-6 6
    const shape = polyomino(R, n);
    const turns = R.pick(level >= 3 ? [1, 2, 3] : [1, 3]);
    const answer = rot(shape, turns);
    const wrong = new Set([key(answer)]);
    const cands = [];
    const push = (c) => { const k = key(c); if (!wrong.has(k)) { wrong.add(k); cands.push(c); } };
    // distractors: the mirror image at four angles (never a rotation of the shape); from level 4 one "wrong angle" rotation joins in
    push(rot(mirror(shape), turns)); push(rot(mirror(shape), (turns + 1) % 4)); push(rot(mirror(shape), (turns + 2) % 4)); push(rot(mirror(shape), (turns + 3) % 4));
    const picked = R.shuffle(cands).slice(0, level >= 4 ? 2 : 3);
    if (level >= 4) picked.push(rot(shape, (turns + 2) % 4));
    const options = R.shuffle([answer, ...picked]);
    const deg = turns * 90;
    return { kind: 'rotate', mode: 'rotate', level, shape, question: `Turn this shape ${deg === 180 ? 'half way round (180°)' : deg + '° ' + (turns === 1 ? 'clockwise' : turns === 3 ? 'anticlockwise' : '')}. Which one is it?`.replace(/\s+\./, '.'),
      options: options.map(key), answer: key(answer), optionCells: options, points: 12 + 6 * level,
      explain: 'A mirror image is never a rotation — if a shape looks right but flipped, it is the wrong one.' };
  }
  // paper folding: 4×4 paper, fold 1-2 times, punch 1-2 holes, unfold
  function genFold(R, level) {
    const N = 4;
    const nFolds = level >= 3 ? 2 : 1, nHoles = level >= 5 ? 2 : 1;
    const folds = [];
    let region = { x0: 0, x1: N - 1, y0: 0, y1: N - 1 };    // visible paper after folds
    const kinds = R.shuffle(['right-over-left', 'left-over-right', 'top-down', 'bottom-up']);
    for (let i = 0; i < nFolds; i++) {
      const f = kinds[i];
      folds.push(f);
      if (f === 'right-over-left') region.x1 = region.x0 + (region.x1 - region.x0 - 1) / 2;
      if (f === 'left-over-right') region.x0 = region.x1 - (region.x1 - region.x0 - 1) / 2;
      if (f === 'top-down') region.y1 = region.y0 + (region.y1 - region.y0 - 1) / 2;      // top half folds down: bottom half stays visible
      if (f === 'bottom-up') region.y0 = region.y1 - (region.y1 - region.y0 - 1) / 2;
    }
    const cellsIn = []; for (let x = region.x0; x <= region.x1; x++) for (let y = region.y0; y <= region.y1; y++) cellsIn.push([x, y]);
    const holes = R.shuffle(cellsIn).slice(0, nHoles);
    // unfold in reverse: each fold mirrors the current holes across its line
    let all = holes.slice();
    const mirrorX = (c, lo, hi) => [lo + hi - c[0], c[1]], mirrorY = (c, lo, hi) => [c[0], lo + hi - c[1]];
    let reg = { ...region };
    for (let i = folds.length - 1; i >= 0; i--) {
      const f = folds[i];
      if (f === 'right-over-left') { const w = reg.x1 - reg.x0 + 1; const nx1 = reg.x1 + w; all = all.concat(all.map(c => mirrorX(c, reg.x0, nx1))); reg.x1 = nx1; }
      if (f === 'left-over-right') { const w = reg.x1 - reg.x0 + 1; const nx0 = reg.x0 - w; all = all.concat(all.map(c => mirrorX(c, nx0, reg.x1))); reg.x0 = nx0; }
      if (f === 'top-down') { const h = reg.y1 - reg.y0 + 1; const ny1 = reg.y1 + h; all = all.concat(all.map(c => mirrorY(c, reg.y0, ny1))); reg.y1 = ny1; }
      if (f === 'bottom-up') { const h = reg.y1 - reg.y0 + 1; const ny0 = reg.y0 - h; all = all.concat(all.map(c => mirrorY(c, ny0, reg.y1))); reg.y0 = ny0; }
    }
    const answer = [...new Set(all.map(c => c.join(',')))].map(s => s.split(',').map(Number));
    // distractors: only the punched holes (forgot to unfold), mirrored across the wrong axis, answer with one hole shifted
    const wrongSet = new Set([key(answer)]); const cands = [];
    const push = (c) => { const k = key(c); if (c.length && !wrongSet.has(k)) { wrongSet.add(k); cands.push(c); } };
    push(holes);
    push([...new Set(holes.concat(holes.map(c => [c[0], N - 1 - c[1]])).map(c => c.join(',')))].map(s => s.split(',').map(Number)));
    push([...new Set(holes.concat(holes.map(c => [N - 1 - c[0], c[1]])).map(c => c.join(',')))].map(s => s.split(',').map(Number)));
    push(answer.map((c, i) => i === 0 ? [(c[0] + 1) % N, c[1]] : c));
    push(answer.map((c, i) => i === answer.length - 1 ? [c[0], (c[1] + 1) % N] : c));
    push(answer.slice(1));
    const options = R.shuffle([answer, ...R.shuffle(cands).slice(0, 3)]);
    const say = { 'right-over-left': 'Fold the right half over onto the left.', 'left-over-right': 'Fold the left half over onto the right.', 'top-down': 'Fold the top half down over the bottom.', 'bottom-up': 'Fold the bottom half up over the top.' };
    return { kind: 'rotate', mode: 'fold', level, N, folds, holes, region, question: 'Now unfold the paper. Where are the holes?', steps: folds.map(f => say[f]).concat([`Punch ${nHoles === 1 ? 'a hole' : 'two holes'} through all the layers where the dots are.`]),
      options: options.map(key), answer: key(answer), optionCells: options, points: 12 + 6 * level,
      explain: `Each fold doubles the holes: ${nHoles} ${nHoles === 1 ? 'hole' : 'holes'} × ${nFolds === 1 ? '2' : '2 × 2'} = ${answer.length} holes when opened.` };
  }

  // ---------- 4. Memory walk ----------
  function genPalace(R, level) {
    const n = Math.min(3 + level, 12);                         // L1 4 words … L8 11
    const words = R.shuffle(NOUNS).slice(0, n);
    const rooms = R.shuffle(ROOMS).slice(0, n);
    const perWordSec = level <= 2 ? 5 : level <= 5 ? 4 : 3;
    return { kind: 'palace', level, words, rooms, perWordSec, points: 4 * n,
      steps: words.map((w, i) => `${cap(rooms[i])}: a ${w}`),
      tip: 'Walk through your own home in the order shown. Make each object big, odd or moving — a giant pineapple blocking the front door is easier to find again than a small one on a shelf.' };
  }
  // recall grading: typed words vs the list; accepts one-letter slips and plurals
  function lev1(a, b) {
    if (a === b) return true;
    if (Math.abs(a.length - b.length) > 1) return false;
    let i = 0, j = 0, edits = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++edits > 1) return false;
      if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
    }
    return edits + (a.length - i) + (b.length - j) <= 1;
  }
  function gradeRecall(words, typed) {
    const norm = (s) => s.toLowerCase().replace(/[^a-z]/g, '').replace(/s$/, '');
    const left = words.map(norm); const got = [];
    for (const t of typed.map(norm).filter(Boolean)) {
      const idx = left.findIndex(w => w && lev1(w, t));
      if (idx >= 0) { got.push(words[idx]); left[idx] = null; }
    }
    return { got, missed: words.filter((w, i) => left[i] !== null), score: got.length };
  }

  // ---------- 5. Math as pictures ----------
  function genMathPic(R, level) {
    // L1: picture with numbers, L2: picture without numbers, L3: no picture (imagine it)
    if (R.chance(0.5)) {
      const a = R.int(12, 29), b = R.int(11, 19);
      const a1 = Math.floor(a / 10) * 10, a2 = a - a1, b1 = Math.floor(b / 10) * 10, b2 = b - b1;
      const parts = [[a1 * b1, a1, b1], [a2 * b1, a2, b1], [a1 * b2, a1, b2], [a2 * b2, a2, b2]];
      return { kind: 'mathpic', level, pic: 'area', text: `${a} × ${b}`, a, b, split: { a: [a1, a2], b: [b1, b2] }, parts, answer: a * b, points: 14 + 8 * level,
        caption: `${a} × ${b} is a ${a}-by-${b} rectangle. Cut it into four easy pieces and add them.`,
        steps: parts.map(p => `${p[1]} × ${p[2]} = ${p[0]}`).concat([`${parts.map(p => p[0]).join(' + ')} = ${a * b}`]) };
    }
    const a = R.int(26, 88), b = R.int(14, 59), sum = R.chance(0.5);
    if (sum) {
      const toTen = (10 - a % 10) % 10 || 10, rest = b - toTen;
      const jumps = rest > 0 ? [[a, a + toTen, toTen], [a + toTen, a + b, rest]] : [[a, a + b, b]];
      return { kind: 'mathpic', level, pic: 'line', text: `${a} + ${b}`, a, b, jumps, answer: a + b, points: 10 + 6 * level,
        caption: `Jump to the next ten first, then the rest.`, steps: jumps.map(j => `${j[0]} → ${j[1]} (+${j[2]})`) };
    }
    const big = Math.max(a, b), small = Math.min(a, b) === big ? big - R.int(3, 9) : Math.min(a, b);
    const toTen = small % 10 ? 10 - small % 10 : 0;             // count up from the small number to the big one
    const first = small + toTen, jumps = [];
    if (first >= big) jumps.push([small, big, big - small]);      // same ten: one short jump
    else { if (toTen) jumps.push([small, first, toTen]); jumps.push([first, big, big - first]); }
    return { kind: 'mathpic', level, pic: 'line', text: `${big} − ${small}`, a: big, b: small, jumps, answer: big - small, points: 10 + 6 * level,
      caption: `Count up from ${small} to ${big}: the jumps add up to the difference.`, steps: jumps.map(j => `${j[0]} → ${j[1]} (+${j[2]})`).concat([`${jumps.map(j => j[2]).join(' + ')} = ${big - small}`]) };
  }

  // ---------- 6-9. creative ----------
  function genUses(R) { return { kind: 'uses', level: 1, object: R.pick(OBJECTS), seconds: 60, points: 0 }; }
  function genLinks(R) { const t = R.pick(TRIPLETS); return { kind: 'links', level: 1, words: t.slice(0, 3), answer: t[3], points: 25, hint: `Starts with "${t[3][0].toUpperCase()}", ${t[3].length} letters.` }; }
  function genCombine(R) { const [a, b] = R.shuffle(NOUNS).slice(0, 2); return { kind: 'combine', level: 1, words: [a, b], seconds: 90, points: 15, prompt: `Invent one product, service or short story that needs BOTH a ${a} and a ${b}. Two lines is enough.` }; }
  function genWhatIf(R, level, dayKey) { const r = dayKey ? makeRand(seeded('whatif:' + dayKey)) : R; return { kind: 'whatif', level: 1, prompt: r.pick(WHATIF), points: 15, ask: 'Write three things that would change. Push the third one further than feels comfortable.' }; }

  // ---------- entry points ----------
  function generate(kind, level, rng, dayKey) {
    const R = makeRand(rng); const L = Math.max(1, Math.min(level || 1, META[kind].maxLevel));
    switch (kind) {
      case 'picture': return genPicture(R, L);
      case 'rotate': return R.chance(0.5) ? genRotate(R, L) : genFold(R, L);
      case 'walk': return genWalk(R, L);
      case 'palace': return genPalace(R, L);
      case 'mathpic': return genMathPic(R, L);
      case 'uses': return genUses(R);
      case 'links': return genLinks(R);
      case 'combine': return genCombine(R);
      case 'whatif': return genWhatIf(R, L, dayKey);
    }
    throw new Error('unknown kind ' + kind);
  }
  function check(task, given) {
    if (task.kind === 'mathpic') return Number(String(given).replace(/[^\d.-]/g, '')) === task.answer;
    if (task.kind === 'links') return String(given).trim().toLowerCase() === task.answer;
    return String(given) === String(task.answer);
  }
  // normalised idea text for novelty checks (lowercase, letters only, articles stripped)
  function normIdea(s) { return String(s).toLowerCase().replace(/\b(a|an|the|as|for|to|of)\b/g, ' ').replace(/[^a-z ]/g, '').trim().replace(/\s+/g, ' '); }
  // today's mix: one imagine kind and one create kind, same all day
  function dailyPick(dayKey) {
    const R = makeRand(seeded('mix:' + dayKey));
    return { imagine: R.pick(GROUP.imagine), create: R.pick(GROUP.create) };
  }
  // level adaptation for graded kinds: up after 2 correct in a row at this level, down after 2 wrong in a row
  function nextLevel(kind, level, recent) {
    const max = META[kind].maxLevel; const last2 = recent.slice(-2);
    if (last2.length === 2 && last2.every(Boolean) && level < max) return level + 1;
    if (last2.length === 2 && last2.every(x => !x) && level > 1) return level - 1;
    return level;
  }

  return { META, KINDS, GROUP, generate, check, gradeRecall, normIdea, dailyPick, nextLevel, seeded, key, WHATIF, TRIPLETS, OBJECTS, NOUNS, ROOMS };
});
