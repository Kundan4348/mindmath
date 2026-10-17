/* MindMath brain UI — runs the imagining / creative exercises from brain.js inside the app shell (app.js). */
(function () {
  'use strict';
  const B = window.Brain, H = window.__mmHooks;
  const $ = (id) => document.getElementById(id);
  const esc = H.esc;
  const S = () => H.S;

  // ---------- per-kind progress ----------
  function lvl(kind) { return S().brain.level[kind] || 1; }
  function allTime() {
    const agg = {}; let imagine = 0, create = 0;
    Object.values(S().days).forEach(d => {
      const b = d.brain; if (!b) return; imagine += b.imagine || 0; create += b.create || 0;
      Object.entries(b.kinds || {}).forEach(([k, r]) => { const a = agg[k] || (agg[k] = {}); Object.entries(r).forEach(([f, v]) => { a[f] = (a[f] || 0) + v; }); });
    });
    return { agg, imagine, create };
  }
  function dayBrain() {
    const d = H.dayRec(H.todayKey());
    if (!d.brain) d.brain = { imagine: 0, create: 0, kinds: {} };
    return d.brain;
  }
  // record a finished exercise: counts toward the day's mix, points toward the score
  // counts: extra numeric counters summed per kind (seconds, ideas, novel, shown, recalled)
  function record(kind, { right, points, counts }) {
    const b = dayBrain(), m = B.META[kind];
    const r = b.kinds[kind] || (b.kinds[kind] = { done: 0, right: 0 });
    r.done++; if (right) r.right++; Object.entries(counts || {}).forEach(([f, v]) => { r[f] = (r[f] || 0) + v; });
    const before = H.dayMet(H.todayKey());
    if (right || !m.graded) b[m.group]++;
    const d = H.dayRec(H.todayKey()); d.score += points; S().totalScore += points;
    if (m.graded) {
      const rec = S().brain.recent[kind] || (S().brain.recent[kind] = []);
      rec.push(!!right); if (rec.length > 6) rec.shift();
      const cur = lvl(kind), nl = B.nextLevel(kind, cur, rec);
      if (nl !== cur) { S().brain.level[kind] = nl; S().brain.recent[kind] = []; setTimeout(() => H.toast(`${nl > cur ? '⬆' : '⬇'} ${m.label}: level ${nl}`), 400); }
    }
    H.save(); H.renderChips();
    const st = H.streak();
    if (!before && H.dayMet(H.todayKey())) setTimeout(() => H.toast(`🔥 Day locked — streak ${st.current}`), 900);
  }

  // ---------- Brain tab ----------
  function card(kind) {
    const m = B.META[kind], a = allTime().agg[kind];
    const pill = m.graded && m.maxLevel > 1 ? `<span class="pill">Level ${lvl(kind)} / ${m.maxLevel}</span>` : `<span class="pill off">${a ? a.done + ' done' : 'new'}</span>`;
    return `<button class="ex" data-kind="${kind}"><span class="e">${m.emoji}</span><span class="t"><b>${m.label}</b><span>${m.blurb}</span></span>${pill}</button>`;
  }
  function renderList() {
    $('exImagine').innerHTML = B.GROUP.imagine.map(card).join('');
    $('exCreate').innerHTML = B.GROUP.create.map(card).join('');
    const j = S().brain.journal.slice(-30).reverse();
    $('journalCard').classList.toggle('hidden', j.length === 0);
    $('journal').innerHTML = j.map(e => `<details><summary><span>${esc(e.title)}</span><small>${new Date(e.t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}${e.rating ? ' · ' + '★'.repeat(e.rating) : ''}</small></summary><p>${esc(e.text)}</p></details>`).join('');
  }
  $('exImagine').addEventListener('click', (e) => { const b = e.target.closest('.ex'); if (b) start(b.dataset.kind); });
  $('exCreate').addEventListener('click', (e) => { const b = e.target.closest('.ex'); if (b) start(b.dataset.kind); });

  // ---------- today's mix (home card) ----------
  function renderMix() {
    const box = $('mixBox'); if (!box) return;
    if (!S().settings.mix) { box.innerHTML = ''; return; }
    const d = S().days[H.todayKey()] || {}, b = d.brain || { imagine: 0, create: 0 }, pick = B.dailyPick(H.todayKey());
    const row = (emoji, title, sub, done, kind) => `<div class="row-m${done ? ' done' : ''}"><span class="e">${emoji}</span><span class="l"><b>${title}</b><span>${sub}</span></span>${done ? '<span class="go">✓</span>' : `<button class="go" data-kind="${kind}">Start</button>`}</div>`;
    const mathDone = (d.solved || 0) >= S().settings.goal;
    box.innerHTML = `<div class="bxsub" style="text-align:left;font-weight:600">Today's mix</div>`
      + row('🔢', 'Math', `${d.solved || 0} / ${S().settings.goal} solved`, mathDone, 'math')
      + row(B.META[pick.imagine].emoji, 'Imagine: ' + B.META[pick.imagine].label, b.imagine ? `${b.imagine} done today` : 'or any other imagining exercise', b.imagine >= 1, pick.imagine)
      + row(B.META[pick.create].emoji, 'Create: ' + B.META[pick.create].label, b.create ? `${b.create} done today` : 'or any other creative exercise', b.create >= 1, pick.create);
  }
  $('mixBox').addEventListener('click', (e) => { const b = e.target.closest('button.go'); if (!b) return; if (b.dataset.kind === 'math') $('btnFree').click(); else start(b.dataset.kind); });

  // ---------- stats ----------
  function renderStats() {
    const { agg } = allTime();
    const rows = B.KINDS.filter(k => agg[k]).map(k => { const a = agg[k], m = B.META[k];
      const mid = k === 'palace' ? `${a.recalled || 0} of ${a.shown || 0} words` : k === 'uses' ? `${a.ideas || 0} ideas` : m.graded ? Math.round(100 * (a.right || 0) / a.done) + '%' : `${a.done} written`;
      return `<tr><td>${m.emoji} ${m.label}</td><td class="n">${a.done}</td><td class="n">${mid}</td><td class="n">${m.graded && m.maxLevel > 1 ? lvl(k) : '–'}</td></tr>`; });
    const T = Object.values(agg).reduce((t, a) => t + a.done, 0);
    $('brainTable').innerHTML = rows.length
      ? `<tr><th>Exercise</th><th class="n">Done</th><th class="n">Right / ideas</th><th class="n">Level</th></tr>${rows.join('')}<tr class="total"><td>Total</td><td class="n">${T}</td><td class="n">–</td><td class="n">–</td></tr>`
      : '<tr><td class="empty">No brain exercises yet — find them in the Brain tab.</td></tr>';
    const uses = agg.uses, pal = agg.palace;
    $('brainTotals').innerHTML = [
      ['Parts held in one picture', S().brain.bestParts ? `${S().brain.bestParts} objects` : '–'],
      ['Ideas per minute (Other uses)', uses && uses.seconds ? (60 * (uses.ideas || 0) / uses.seconds).toFixed(1) : '–'],
      ['Words recalled (Memory walk)', pal && pal.shown ? `${Math.round(100 * (pal.recalled || 0) / pal.shown)}%` : '–'],
      ['Journal entries', S().brain.journal.length]
    ].map(([k, v]) => `<span class="k">${k}</span><span class="v">${v}</span>`).join('');
  }

  // ---------- runner scaffolding ----------
  let bx = null, tick = null;
  const stage = () => $('bxStage'), foot = () => $('bxFoot');
  function start(kind, from) {
    const task = B.generate(kind, lvl(kind), null, H.todayKey());
    const active = document.querySelector('.view.active');
    bx = { kind, task, t0: performance.now(), step: 0, done: false, hinted: false, data: {}, from: from || (active && active.id !== 'bx' ? active.id : 'home') };
    $('bxMode').textContent = `${B.META[kind].emoji} ${B.META[kind].label}`;
    $('bxTimer').textContent = B.META[kind].graded && kind !== 'links' ? `Level ${task.level}` : '';
    $('bxTimer').classList.remove('slow');
    H.show('bx');
    clearInterval(tick);
    RENDER[kind]();
  }
  function end() { clearInterval(tick); const back = bx ? bx.from : 'home'; bx = null; H.show(back === 'brain' ? 'brain' : 'home'); }
  $('bxQuit').addEventListener('click', end);
  function elapsed() { return (performance.now() - bx.t0) / 1000; }
  function setFoot(buttons) { foot().innerHTML = buttons.map(b => `<button class="btn ${b.cls === undefined ? 'secondary' : b.cls}" data-act="${b.act}"${b.primary ? ' data-primary="1"' : ''}>${b.label}</button>`).join(''); }
  foot().addEventListener('click', (e) => { const b = e.target.closest('button[data-act]'); if (b && bx) ACT[b.dataset.act](); });
  stage().addEventListener('click', (e) => { const b = e.target.closest('button[data-act]'); if (b && bx) ACT[b.dataset.act](b); });
  document.addEventListener('keydown', (e) => {
    if (!bx || !$('bx').classList.contains('active')) return;
    const ae = document.activeElement, typing = !!ae && /^(INPUT|TEXTAREA)$/.test(ae.tagName);
    if (e.key === 'Escape') { end(); e.preventDefault(); return; }
    if (e.key === 'Enter' && (!typing || ae.tagName === 'INPUT')) { const p = document.querySelector('#bx [data-primary]'); if (p) { p.click(); e.preventDefault(); } }
  });
  function dots(i, n) { return `<div class="bxprog">${Array.from({ length: n }, (_, k) => `<i${k <= i ? ' class="on"' : ''}></i>`).join('')}</div>`; }
  // after a graded answer: feedback, explanation, next / done
  function finishGraded(right, givenLabel) {
    const t = bx.task, m = B.META[bx.kind];
    bx.done = true;
    const sec = elapsed();
    record(bx.kind, { right, points: right ? t.points : 0, counts: { seconds: sec } });
    if (bx.kind === 'picture' && right && t.parts > (S().brain.bestParts || 0)) { S().brain.bestParts = t.parts; H.save(); }
    H.buzz(right ? 30 : [40, 40, 40]);
    const ans = t.kind === 'rotate' ? '' : ` — the answer was <b>${esc(String(t.answer))}</b>`;
    stage().insertAdjacentHTML('beforeend', `<div class="bxbig ${right ? 'ok' : 'bad'}" style="min-height:0;padding:6px">${right ? `✓ Right · +${t.points} pts · ${sec.toFixed(1)}s` : `✗ Not this time${ans}`}</div>`
      + (t.explain ? `<div class="explain"><b>Why:</b> ${esc(t.explain)}</div>` : '')
      + (t.scene ? `<div class="bxsub">${right ? 'Next time the scene has one more piece after two in a row.' : 'Try building the picture again more slowly — lock each piece before adding the next.'}</div>` : ''));
    setFoot([{ act: 'end', label: 'Done' }, { act: 'again', label: 'Next one →', cls: '', primary: true }]);
    window.scrollTo(0, document.body.scrollHeight);
  }
  const ACT = {
    end, again: () => start(bx.kind),
    next: () => { bx.step++; RENDER[bx.kind](); },
    back: () => { bx.step = Math.max(0, bx.step - 1); RENDER[bx.kind](); },
    pick: (b) => { if (bx.done) return; const given = b.dataset.v; const right = B.check(bx.task, given); document.querySelectorAll('#bx .opts button').forEach(x => { x.disabled = true; if (x.dataset.v === String(bx.task.answer)) x.classList.add('ok'); else if (x.dataset.v === given) x.classList.add('bad'); }); finishGraded(right, given); }
  };
  const RENDER = {};

  // ---------- shared: one instruction at a time, then a question with options ----------
  function stepper(intro, onLast) {
    const t = bx.task, n = t.steps.length, i = bx.step;
    if (i < n) {
      stage().innerHTML = `<div class="bxcard"><div class="bxsub">${intro}</div><div class="bxbig">${esc(t.steps[i])}</div>${dots(i, n)}<div class="bxsub">${i === 0 ? 'Close your eyes if it helps. Nothing is shown — build it in your head.' : 'Add this to the picture you already have, then continue.'}</div></div>`;
      setFoot([...(i > 0 ? [{ act: 'back', label: '← Back' }] : []), { act: 'next', label: i === n - 1 ? 'I have the picture →' : 'Next →', cls: '', primary: true }]);
    } else onLast();
  }
  function optionButtons(opts, cls) { return `<div class="opts ${cls || ''}">${opts.map(o => `<button data-act="pick" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div>`; }

  RENDER.picture = () => stepper(`Level ${bx.task.level} · ${bx.task.parts} objects`, () => {
    stage().innerHTML = `<div class="bxcard"><div class="bxsub">Keep the picture. Do not scroll back.</div><div class="bxbig q">${esc(bx.task.question)}</div>${optionButtons(bx.task.options)}</div>`;
    setFoot([{ act: 'back', label: '← I lost it, show the steps' }]);
  });

  RENDER.walk = () => stepper(`Level ${bx.task.level} · ${bx.task.steps.length} moves`, () => {
    const o = bx.task.options, grid = ['north-west', 'north', 'north-east', 'west', 'here', 'east', 'south-west', 'south', 'south-east'];
    stage().innerHTML = `<div class="bxcard"><div class="bxbig q">${esc(bx.task.question)}</div><div class="opts compass">${grid.map(v => `<button data-act="pick" data-v="${v}">${v === 'here' ? 'I am home' : v.replace('-', '-\u200b')}</button>`).join('')}</div><div class="bxsub" style="margin-top:8px">North is up.</div></div>`;
    setFoot([{ act: 'back', label: '← Show the moves again' }]);
    void o;
  });

  // grids: cells are [x,y] with y = 0 at the BOTTOM
  function gridHTML(cells, w, h, extra) {
    const on = new Set(cells.map(c => c.join(',')));
    let out = `<div class="grid ${extra && extra.big ? 'big' : ''}" style="grid-template-columns:repeat(${w},var(--cell))">`;
    for (let y = h - 1; y >= 0; y--) for (let x = 0; x < w; x++) {
      const k = `${x},${y}`; let cls = on.has(k) ? 'on' : '';
      if (extra && extra.paper) { const inR = x >= extra.region.x0 && x <= extra.region.x1 && y >= extra.region.y0 && y <= extra.region.y1; cls = (inR ? 'paper' : 'away') + (on.has(k) ? ' hole' : ''); }
      if (extra && extra.holes) cls = 'paper' + (on.has(k) ? ' hole' : '');
      out += `<i class="${cls}"></i>`;
    }
    return out + '</div>';
  }
  const parseKey = (k) => k.split(';').map(s => s.split(',').map(Number));
  RENDER.rotate = () => {
    const t = bx.task;
    const dim = t.mode === 'rotate' ? Math.max(3, ...[t.shape, ...t.optionCells].flat().flat()) + 1 : t.N;
    const gridOpts = () => `<div class="opts grids">${t.options.map(k => `<button data-act="pick" data-v="${k}">${t.mode === 'rotate' ? gridHTML(parseKey(k), dim, dim) : gridHTML(parseKey(k), t.N, t.N, { holes: true })}</button>`).join('')}</div>`;
    if (t.mode === 'rotate') {
      stage().innerHTML = `<div class="bxcard"><div class="bxsub">Level ${t.level}</div>${gridHTML(t.shape, dim, dim, { big: true })}<div class="bxbig q" style="min-height:0;padding:8px">${esc(t.question)}</div>${gridOpts()}</div>`;
      setFoot([{ act: 'end', label: 'End' }]);
      return;
    }
    // fold: instructions one at a time; the last step shows the folded paper with the punch marks
    const n = t.steps.length, i = bx.step;
    if (i < n - 1) {
      stage().innerHTML = `<div class="bxcard"><div class="bxsub">Level ${t.level} · a square sheet of paper, 4 × 4</div>${i === 0 ? gridHTML([], t.N, t.N, { paper: true, region: { x0: 0, x1: t.N - 1, y0: 0, y1: t.N - 1 }, big: true }) : ''}<div class="bxbig">${esc(t.steps[i])}</div>${dots(i, n)}<div class="bxsub">Imagine the fold. The folded part lands on top of the other half.</div></div>`;
      setFoot([...(i > 0 ? [{ act: 'back', label: '← Back' }] : []), { act: 'next', label: 'Next →', cls: '', primary: true }]);
    } else if (i === n - 1) {
      stage().innerHTML = `<div class="bxcard"><div class="bxsub">The paper now looks like this (faded part is folded away)</div>${gridHTML(t.holes, t.N, t.N, { paper: true, region: t.region, big: true })}<div class="bxbig" style="min-height:0">${esc(t.steps[i])}</div>${dots(i, n)}</div>`;
      setFoot([{ act: 'back', label: '← Back' }, { act: 'next', label: 'Punched. Now unfold →', cls: '', primary: true }]);
    } else {
      stage().innerHTML = `<div class="bxcard"><div class="bxbig q" style="min-height:0;padding:8px">${esc(t.question)}</div>${gridOpts()}</div>`;
      setFoot([{ act: 'back', label: '← Show the folds again' }]);
    }
  };

  // ---------- memory walk: show words on a timer, then recall ----------
  RENDER.palace = () => {
    const t = bx.task, n = t.words.length;
    if (bx.step === 0 && !bx.data.started) {
      stage().innerHTML = `<div class="bxcard"><div class="bxsub">Level ${t.level} · ${n} words · ${t.perWordSec}s each</div><div class="bxbig" style="font-size:20px">${esc(t.tip)}</div><div class="bxsub">The places are a walk through a home: ${esc(t.rooms.join(' → '))}.</div></div>`;
      setFoot([{ act: 'palaceGo', label: 'Start the walk →', cls: '', primary: true }]);
      return;
    }
    if (bx.step < n) {
      stage().innerHTML = `<div class="bxcard"><div class="wordshow"><small>${esc(t.rooms[bx.step])}</small>${esc(t.words[bx.step])}</div>${dots(bx.step, n)}<div class="bxsub" style="margin-top:8px">Picture it there — huge, moving or absurd.</div></div>`;
      setFoot([{ act: 'next', label: 'Got it →', cls: '', primary: true }]);
      return;
    }
    clearInterval(tick); $('bxTimer').textContent = `Level ${t.level}`;
    stage().innerHTML = `<div class="bxcard"><div class="bxbig q" style="min-height:0">Walk back through the home. Which objects did you leave?</div><textarea class="bxin" id="bxText" placeholder="one word per line, any order" rows="6" autocapitalize="none"></textarea><div class="bxsub" style="margin-top:8px">${n} words were shown. Small spelling slips are fine.</div></div>`;
    setFoot([{ act: 'palaceCheck', label: 'Check my recall', cls: '', primary: true }]);
    setTimeout(() => { const el = $('bxText'); if (el) el.focus(); }, 50);
  };
  ACT.palaceGo = () => {
    bx.data.started = true; bx.step = 0; RENDER.palace();
    let left = bx.task.perWordSec;
    clearInterval(tick);
    tick = setInterval(() => {
      if (!bx || bx.step >= bx.task.words.length) { clearInterval(tick); return; }
      left -= 0.1; $('bxTimer').textContent = `${Math.max(0, left).toFixed(0)}s`;
      if (left <= 0) { bx.step++; left = bx.task.perWordSec; RENDER.palace(); }
    }, 100);
  };
  ACT.next = () => { if (bx.kind === 'palace' && bx.data.started) { bx.step++; RENDER.palace(); return; } bx.step++; RENDER[bx.kind](); };
  ACT.palaceCheck = () => {
    if (bx.done) return;
    const t = bx.task, typed = $('bxText').value.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    const g = B.gradeRecall(t.words, typed);
    const right = g.score >= Math.ceil(t.words.length * 0.75);        // 3 of 4 counts as a pass for the level
    bx.done = true;
    const pts = Math.round(t.points * g.score / t.words.length);
    record('palace', { right, points: pts, counts: { shown: t.words.length, recalled: g.score, seconds: elapsed() } });
    H.buzz(right ? 30 : [40, 40, 40]);
    stage().innerHTML = `<div class="bxcard"><div class="bxbig ${right ? 'ok' : 'bad'}">${g.score} of ${t.words.length} recalled · +${pts} pts</div>
      <div class="bxsub">${right ? 'That is a pass — two passes in a row add a word.' : 'Under three quarters — same length next time. Make the pictures bigger and stranger.'}</div>
      <div class="explain" style="margin-top:10px"><b>Found:</b> ${esc(g.got.join(', ') || '—')}<br><b>Missed:</b> ${g.missed.map((w) => `${esc(t.rooms[t.words.indexOf(w)])}: <b>${esc(w)}</b>`).join(' · ') || '—'}</div></div>`;
    setFoot([{ act: 'end', label: 'Done' }, { act: 'again', label: 'Next one →', cls: '', primary: true }]);
  };

  // ---------- math as pictures ----------
  function areaSVG(t, labels) {
    // display widths: keep proportions roughly, but never let a piece get thinner than 22% so its number fits
    const vis = (p, q) => { const tot = p + q, m = 0.22 * tot; return [Math.max(p, m), Math.max(q, m)]; };
    const [a1, a2] = vis(t.split.a[0], t.split.a[1]), [b1, b2] = vis(t.split.b[0], t.split.b[1]), W = 360, H = 220, pad = 34;
    const A = t.split.a, Bv = t.split.b;
    const sx = (W - pad - 10) / (a1 + a2), sy = (H - pad - 10) / (b1 + b2);
    const rect = (x, y, w, h, v, fill) => `<rect x="${pad + x * sx}" y="${10 + y * sy}" width="${w * sx}" height="${h * sy}" fill="${fill}" stroke="var(--bg)" stroke-width="2" rx="4"/>` + (labels ? `<text x="${pad + (x + w / 2) * sx}" y="${10 + (y + h / 2) * sy + 5}" text-anchor="middle" font-size="15" font-weight="700" fill="#fff">${v}</text>` : '');
    const lab = (x, y, s) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="13" fill="var(--muted)" font-weight="600">${s}</text>`;
    return `<svg class="pic" viewBox="0 0 ${W} ${H}">${rect(0, 0, a1, b1, A[0] * Bv[0], 'var(--accent)')}${rect(a1, 0, a2, b1, A[1] * Bv[0], 'var(--hint)')}${rect(0, b1, a1, b2, A[0] * Bv[1], 'var(--ok)')}${rect(a1, b1, a2, b2, A[1] * Bv[1], 'var(--warn)')}`
      + lab(pad + a1 * sx / 2, H - 6, A[0]) + lab(pad + (a1 + a2 / 2) * sx, H - 6, A[1]) + `<text x="12" y="${10 + b1 * sy / 2 + 5}" text-anchor="middle" font-size="13" fill="var(--muted)" font-weight="600">${Bv[0]}</text><text x="12" y="${10 + (b1 + b2 / 2) * sy + 5}" text-anchor="middle" font-size="13" fill="var(--muted)" font-weight="600">${Bv[1]}</text></svg>`;
  }
  function lineSVG(t, labels) {
    const start = t.jumps[0][0], end = t.jumps[t.jumps.length - 1][1], W = 360, H = 120, pad = 24;
    const x = (v) => pad + (v - start) * (W - 2 * pad) / Math.max(1, end - start);
    let out = `<svg class="pic" viewBox="0 0 ${W} ${H}"><line x1="${pad}" x2="${W - pad}" y1="80" y2="80" stroke="var(--line)" stroke-width="3"/>`;
    t.jumps.forEach((j, i) => { const x1 = x(j[0]), x2 = x(j[1]), mid = (x1 + x2) / 2; out += `<path d="M${x1} 78 Q ${mid} ${i ? 25 : 35} ${x2} 78" fill="none" stroke="${i ? 'var(--ok)' : 'var(--accent)'}" stroke-width="3"/>` + (labels ? `<text x="${mid}" y="${i ? 22 : 32}" text-anchor="middle" font-size="14" font-weight="700" fill="${i ? 'var(--ok)' : 'var(--accent)'}">+${j[2]}</text>` : ''); });
    const ticks = [start, ...t.jumps.map(j => j[1])];
    ticks.forEach((v, i) => { out += `<circle cx="${x(v)}" cy="80" r="5" fill="var(--text)"/><text x="${x(v)}" y="104" text-anchor="middle" font-size="14" font-weight="700" fill="var(--text)">${labels || i === 0 ? v : '?'}</text>`; });
    return out + '</svg>';
  }
  RENDER.mathpic = () => {
    const t = bx.task, L = t.level;
    const pic = L === 3 ? `<div class="bxsub" style="padding:14px 0">No picture this time — <b>see</b> the ${t.pic === 'area' ? 'rectangle cut into four pieces' : 'number line with its jumps'} in your head.</div>` : (t.pic === 'area' ? areaSVG(t, L === 1) : lineSVG(t, L === 1));
    stage().innerHTML = `<div class="bxcard"><div class="bxsub">Level ${L} · ${L === 1 ? 'picture with numbers' : L === 2 ? 'picture, you fill the numbers' : 'imagine the picture'}</div><div class="bxbig">${esc(t.text)}</div>${pic}<div class="bxsub">${esc(t.caption)}</div>
      <input class="bxin num" id="bxNum" inputmode="numeric" pattern="[0-9]*" placeholder="?" autocomplete="off" style="margin-top:12px"></div>`;
    setFoot([{ act: 'mathCheck', label: 'Check', cls: '', primary: true }]);
    const inp = $('bxNum'); inp.focus();
    inp.addEventListener('input', () => { if (inp.value.replace(/\D/g, '').length >= String(t.answer).length) ACT.mathCheck(); });
  };
  ACT.mathCheck = () => {
    if (bx.done) return;
    const inp = $('bxNum'), v = inp.value.trim(); if (!v) return;
    const right = B.check(bx.task, v);
    if (!right) { inp.classList.remove('bad'); void inp.offsetWidth; inp.classList.add('bad'); inp.style.borderColor = 'var(--bad)'; bx.data.wrong = (bx.data.wrong || 0) + 1; H.buzz([40, 40, 40]); setTimeout(() => { inp.value = ''; inp.style.borderColor = ''; }, 350); if (bx.data.wrong < 2) return; }
    inp.disabled = true;
    const t = bx.task;
    stage().insertAdjacentHTML('beforeend', `<div class="bxcard"><div class="bxsub" style="text-align:left;font-weight:600">The picture, in steps</div>${t.pic === 'area' ? areaSVG(t, true) : lineSVG(t, true)}<ol style="margin:8px 0 0;padding-left:20px">${t.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>`);
    finishGraded(right && (bx.data.wrong || 0) < 2, v);
  };

  // ---------- other uses (60 s, count + novelty) ----------
  RENDER.uses = () => {
    const t = bx.task;
    bx.data.ideas = []; bx.data.left = t.seconds;
    const seen = new Set(S().brain.usesSeen[t.object] || []);
    stage().innerHTML = `<div class="bxcard"><div class="bxsub">${t.seconds} seconds · as many different uses as you can</div><div class="bxbig"><span>What else could you do with <b>${esc(t.object)}</b>?</span></div>
      <input class="bxin" id="bxIdea" placeholder="type a use, press Enter or Add" autocomplete="off" autocapitalize="sentences"><div class="ideas" id="bxIdeas"></div>
      <div class="bxsub" style="margin-top:8px">${seen.size ? `You have given ${seen.size} uses for this before — new ones earn a bonus (marked green).` : 'First time with this object: every use is new.'}</div></div>`;
    setFoot([{ act: 'addIdea', label: 'Add', cls: '', primary: true }, { act: 'usesDone', label: 'Finish early' }]);
    $('bxIdea').focus();
    clearInterval(tick);
    tick = setInterval(() => { if (!bx) return clearInterval(tick); bx.data.left -= 0.1; $('bxTimer').textContent = `${Math.max(0, bx.data.left).toFixed(0)}s`; $('bxTimer').classList.toggle('slow', bx.data.left < 10); if (bx.data.left <= 0) ACT.usesDone(); }, 100);
  };
  ACT.addIdea = () => {
    const inp = $('bxIdea'); if (!inp || bx.done) return;
    const raw = inp.value.trim(), n = B.normIdea(raw); inp.value = ''; inp.focus();
    if (!n || bx.data.ideas.some(i => i.n === n)) return;
    const novel = !(S().brain.usesSeen[bx.task.object] || []).includes(n);
    bx.data.ideas.push({ raw, n, novel });
    $('bxIdeas').insertAdjacentHTML('afterbegin', `<span class="${novel ? 'new' : ''}">${esc(raw)}</span>`);
  };
  ACT.usesDone = () => {
    if (bx.done) return;
    const pending = $('bxIdea') && $('bxIdea').value.trim(); if (pending) ACT.addIdea();
    clearInterval(tick); bx.done = true;
    const ideas = bx.data.ideas, novel = ideas.filter(i => i.novel).length, used = bx.task.seconds - Math.max(0, bx.data.left);
    const pts = 2 * ideas.length + 3 * novel;
    const seen = S().brain.usesSeen[bx.task.object] || (S().brain.usesSeen[bx.task.object] = []);
    ideas.forEach(i => { if (!seen.includes(i.n)) seen.push(i.n); });
    record('uses', { right: true, points: pts, counts: { ideas: ideas.length, novel, seconds: Math.max(1, Math.round(used)) } });
    if (ideas.length) S().brain.journal.push({ t: Date.now(), kind: 'uses', title: `Uses for ${bx.task.object}`, text: ideas.map(i => i.raw).join('\n') });
    H.save();
    const all = allTime().agg.uses, avg = all && all.seconds ? (60 * all.ideas / all.seconds).toFixed(1) : null;
    stage().innerHTML = `<div class="bxcard"><div class="bxbig ok">${ideas.length} ${ideas.length === 1 ? 'idea' : 'ideas'} · ${novel} new · +${pts} pts</div>
      <div class="bxsub">${(60 * ideas.length / Math.max(1, used)).toFixed(1)} ideas per minute${avg ? ` · your average ${avg}` : ''}</div>
      <div class="explain" style="margin-top:10px"><b>Push further next time:</b> change the scale (a tiny version, a giant one), the material (what if it were soft, liquid, hollow), who uses it (a child, a sailor, a cat) or break it into parts. Odd ideas count as much as sensible ones.</div>
      <div class="ideas">${ideas.map(i => `<span class="${i.novel ? 'new' : ''}">${esc(i.raw)}</span>`).join('')}</div></div>`;
    setFoot([{ act: 'end', label: 'Done' }, { act: 'again', label: 'Another object →', cls: '', primary: true }]);
  };

  // ---------- three words, one link ----------
  RENDER.links = () => {
    const t = bx.task;
    stage().innerHTML = `<div class="bxcard"><div class="bxsub">One word goes with all three (before or after them)</div><div class="bxbig" style="letter-spacing:.5px">${t.words.map(w => esc(w)).join(' &nbsp;·&nbsp; ')}</div>
      <input class="bxin" id="bxWord" placeholder="the linking word" autocomplete="off" autocapitalize="none" style="text-align:center;font-weight:700;font-size:22px"><div class="bxsub" id="bxLinkFb" style="margin-top:8px;min-height:20px"></div></div>`;
    setFoot([{ act: 'linkHint', label: '💡 Hint' }, { act: 'linkCheck', label: 'Check', cls: '', primary: true }, { act: 'linkGiveUp', label: 'Show answer' }]);
    $('bxWord').focus();
    clearInterval(tick); tick = setInterval(() => { if (bx && !bx.done) $('bxTimer').textContent = elapsed().toFixed(0) + 's'; }, 250);
  };
  ACT.linkHint = () => { bx.hinted = true; $('bxLinkFb').textContent = bx.task.hint; };
  ACT.linkCheck = () => {
    if (bx.done) return;
    const inp = $('bxWord'), v = inp.value.trim(); if (!v) return;
    if (B.check(bx.task, v)) { clearInterval(tick); inp.disabled = true; bx.task.points = bx.hinted ? 12 : 25; finishGraded(true, v); }
    else { $('bxLinkFb').textContent = `"${v}" does not fit all three — try again.`; inp.classList.remove('bad'); void inp.offsetWidth; inp.style.borderColor = 'var(--bad)'; setTimeout(() => { inp.style.borderColor = ''; }, 350); inp.select(); H.buzz([40, 40, 40]); }
  };
  ACT.linkGiveUp = () => { if (bx.done) return; clearInterval(tick); $('bxWord').disabled = true; finishGraded(false, ''); };

  // ---------- force a combination / what if (journal + self-rating) ----------
  function writingTask(title, prompt, ask, placeholder, seconds) {
    bx.data.rating = 0;
    stage().innerHTML = `<div class="bxcard"><div class="bxsub">${seconds ? seconds + ' seconds — a soft limit, you can finish your sentence' : 'Take your time'}</div><div class="bxbig" style="font-size:clamp(19px,4.6vw,24px)"><span>${prompt}</span></div><div class="bxsub">${esc(ask)}</div>
      <textarea class="bxin" id="bxText" placeholder="${esc(placeholder)}" rows="5" style="margin-top:10px"></textarea>
      <div class="bxsub" style="margin-top:10px">How far out of the box did you go?</div><div class="stars" id="bxStars">${[1, 2, 3].map(n => `<button data-act="rate" data-v="${n}" title="${['', 'safe and sensible', 'a bit unusual', 'genuinely odd'][n]}">★</button>`).join('')}</div><div class="bxsub" id="bxRateT">1 = sensible · 2 = a bit unusual · 3 = genuinely odd</div></div>`;
    setFoot([{ act: 'writeDone', label: 'Save it', cls: '', primary: true }]);
    $('bxText').focus();
    if (seconds) { bx.data.left = seconds; clearInterval(tick); tick = setInterval(() => { if (!bx || bx.done) return clearInterval(tick); bx.data.left -= 0.1; $('bxTimer').textContent = bx.data.left > 0 ? `${bx.data.left.toFixed(0)}s` : 'time — finish up'; $('bxTimer').classList.toggle('slow', bx.data.left < 15); }, 100); }
  }
  ACT.rate = (b) => { bx.data.rating = Number(b.dataset.v); document.querySelectorAll('#bxStars button').forEach(x => x.classList.toggle('on', Number(x.dataset.v) <= bx.data.rating)); $('bxRateT').textContent = ['', 'Safe and sensible — fine, now try to twist it.', 'A bit unusual.', 'Genuinely odd — that is the muscle we want.'][bx.data.rating]; };
  ACT.writeDone = () => {
    if (bx.done) return;
    const text = $('bxText').value.trim();
    if (text.length < 12) { $('bxText').style.borderColor = 'var(--bad)'; setTimeout(() => { $('bxText').style.borderColor = ''; }, 400); H.toast('Write at least a line or two first'); return; }
    clearInterval(tick); bx.done = true;
    const t = bx.task, rating = bx.data.rating || 1, pts = t.points + 5 * (rating - 1);
    S().brain.journal.push({ t: Date.now(), kind: t.kind, title: t.kind === 'combine' ? `${t.words[0]} + ${t.words[1]}` : t.prompt, text, rating });
    if (S().brain.journal.length > 200) S().brain.journal.splice(0, S().brain.journal.length - 200);
    record(t.kind, { right: true, points: pts, counts: { seconds: Math.round(elapsed()), rating } });
    stage().innerHTML = `<div class="bxcard"><div class="bxbig ok">Saved · +${pts} pts</div><div class="bxsub">${'★'.repeat(rating)} · it is in <b>Brain → Your ideas</b>. Read old ones back now and then — ideas you thought were odd often look obvious later, which means you have moved.</div>
      <div class="explain" style="margin-top:10px"><b>Next time, try one of these:</b> reverse it (what if the opposite happened), exaggerate it ten times, give it to a completely different person, or ask what breaks first.</div></div>`;
    setFoot([{ act: 'end', label: 'Done' }, { act: 'again', label: t.kind === 'whatif' ? 'Another prompt →' : 'Another pair →', cls: '', primary: true }]);
  };
  RENDER.combine = () => writingTask('Force a combination', `<b>${esc(bx.task.words[0])}</b> &nbsp;+&nbsp; <b>${esc(bx.task.words[1])}</b>`, bx.task.prompt, 'e.g. a product, a shop, a scene from a story…', bx.task.seconds);
  RENDER.whatif = () => writingTask('What if', esc(bx.task.prompt), bx.task.ask, '1.\n2.\n3.', 0);
  // "another prompt" for what-if must not re-serve today's fixed prompt
  ACT.again = () => { if (bx.kind === 'whatif') { let t = B.generate('whatif', 1); for (let i = 0; i < 5 && t.prompt === bx.task.prompt; i++) t = B.generate('whatif', 1); bx = { kind: 'whatif', task: t, t0: performance.now(), step: 0, done: false, data: {}, from: bx.from }; $('bxTimer').textContent = ''; RENDER.whatif(); return; } start(bx.kind, bx.from); };

  // ---------- boot ----------
  window.BrainUI = { renderList, renderMix, renderStats, start, end, get current() { return bx; }, act: (a, el) => ACT[a](el) };
  renderMix();
})();
