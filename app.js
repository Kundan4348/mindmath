/* MindMath app — UI, session loop, persistence. Depends on engine.js (window.Engine). */
(function () {
  'use strict';
  const E = window.Engine;
  const $ = (id) => document.getElementById(id);
  const STORE_KEY = 'mindmath.v1';
  const SPRINT_SEC = 60;
  const SET_N = 10;            // "10 questions" mode
  const IDLE_CHECK_MS = 1500;  // auto-check a short answer after this pause

  // ---------- state ----------
  const defaults = () => ({
    settings: { goal: 10, theme: 'auto', haptics: true, op: 'mixed', level: 'auto' },
    autoLevel: 'easy',
    totalScore: 0,
    best10: {},        // op -> fastest seconds for a full 10-question set (all 10 answered, none skipped)
    days: {},          // 'YYYY-MM-DD': { solved, attempts, hints, seconds, score, ops: { add: {solved, attempts, seconds} } }
    history: []        // last 300 attempts: { t, op, level, text, answer, given, correct, sec, hint, pts }
  });
  let S = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return defaults();
      const d = defaults(), o = JSON.parse(raw);
      return Object.assign(d, o, { settings: Object.assign(d.settings, o.settings || {}) });
    } catch (e) { return defaults(); }
  }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* storage full or private mode */ } }
  const todayKey = () => E.dayKey(new Date());
  function dayRec(k) {
    if (!S.days[k]) S.days[k] = { solved: 0, attempts: 0, hints: 0, seconds: 0, score: 0, ops: {} };
    return S.days[k];
  }

  // ---------- theme ----------
  function applyTheme() {
    const t = S.settings.theme;
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
    const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.querySelector('meta[name=theme-color]').setAttribute('content', dark ? '#0f1420' : '#f3f5fa');
  }

  // ---------- navigation ----------
  function show(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === view));
    document.querySelectorAll('nav button').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    document.querySelector('nav').classList.toggle('hidden', view === 'practice');
    if (view === 'home') renderHome();
    if (view === 'stats') renderStats();
    if (view === 'settings') renderSettings();
    window.scrollTo(0, 0);
  }
  document.querySelectorAll('nav button').forEach(b => b.addEventListener('click', () => show(b.dataset.view)));

  // ---------- home ----------
  function streak() { return E.streakFrom(S.days, S.settings.goal, todayKey()); }
  function renderHome() {
    const st = streak(), d = S.days[todayKey()] || { solved: 0, seconds: 0 };
    $('hStreak').textContent = st.current;
    $('hToday').textContent = d.solved;
    $('hVel').textContent = d.solved ? (d.seconds / d.solved).toFixed(1) : '–';
    const pct = Math.min(100, Math.round(100 * d.solved / S.settings.goal));
    $('goalBar').style.width = pct + '%';
    $('goalText').textContent = `${d.solved} / ${S.settings.goal} today${st.todayMet ? ' ✓' : ''}`;
    $('goalRight').textContent = st.todayMet ? 'Streak safe for today' : `${Math.max(0, S.settings.goal - d.solved)} to go`;
    const h = new Date().getHours();
    $('greet').textContent = st.todayMet ? 'Goal done — keep rolling?' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    $('greetSub').textContent = st.current > 0 && !st.todayMet ? `Solve ${Math.max(0, S.settings.goal - d.solved)} more to keep your ${st.current}-day streak.`
      : st.current === 0 && Object.keys(S.days).length ? 'Start a new streak today.' : 'A few minutes a day keeps everyday numbers easy.';
    document.querySelectorAll('#opSeg button').forEach(b => b.classList.toggle('on', b.dataset.op === S.settings.op));
    document.querySelectorAll('#lvlSeg button').forEach(b => b.classList.toggle('on', b.dataset.lvl === S.settings.level));
    $('lvlNote').textContent = S.settings.level === 'auto'
      ? `Auto (currently ${S.autoLevel}): up after 5 quick correct in a row, down after 3 misses in 5.`
      : { easy: 'Easy: 2-digit sums, times tables, friendly percentages.', medium: 'Medium: 3-digit sums, 1×2-digit products, 5% steps.', hard: 'Hard: 4-digit sums, 2×2-digit products, awkward percentages.' }[S.settings.level];
    renderChips();
    renderCal();
  }
  function renderChips() {
    const st = streak();
    $('chipStreakV').textContent = st.current;
    $('chipStreak').classList.toggle('on', st.current > 0);
    $('chipScore').textContent = S.totalScore.toLocaleString('en-US');
  }
  function renderCal() {
    const cal = $('cal'); cal.innerHTML = '';
    const today = todayKey();
    const todayDate = new Date(); todayDate.setHours(12);
    const dow = (todayDate.getDay() + 6) % 7; // Monday = 0
    ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach(h => { const e = document.createElement('div'); e.className = 'h'; e.textContent = h; cal.appendChild(e); });
    const start = E.shiftDay(today, -(21 + dow));
    let k = start;
    for (let i = 0; i < 28; i++) {
      const d = S.days[k];
      const e = document.createElement('div');
      e.className = 'd' + (d && d.solved >= S.settings.goal ? ' met' : d && d.solved > 0 ? ' part' : '') + (k === today ? ' today' : '');
      e.textContent = Number(k.slice(-2));
      e.title = d ? `${k}: ${d.solved} solved` : k;
      cal.appendChild(e);
      k = E.shiftDay(k, 1);
    }
  }
  $('opSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; S.settings.op = b.dataset.op; save(); renderHome(); });
  $('lvlSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; S.settings.level = b.dataset.lvl; save(); renderHome(); });
  $('btnFree').addEventListener('click', () => startSession('free'));
  $('btnSet').addEventListener('click', () => startSession('set'));
  $('btnSprint').addEventListener('click', () => startSession('sprint'));

  // ---------- practice session ----------
  let sess = null, prob = null, input = '', tStart = 0, tick = null, hintShown = 0, locked = false, recent = [], idleT = null;

  function currentLevel() { return S.settings.level === 'auto' ? S.autoLevel : S.settings.level; }

  function startSession(mode) {
    sess = { mode, op: S.settings.op, start: Date.now(), done: 0, solved: 0, attempts: 0, hints: 0, seconds: 0, score: 0, fastest: null, misses: [], skipped: 0 };
    recent = [];
    $('pMode').textContent = mode === 'sprint' ? 'Sprint' : mode === 'set' ? `${SET_N} questions` : `${E.OP_LABEL[S.settings.op] || 'Mixed'}`;
    show('practice');
    nextProblem();
  }
  function nextProblem() {
    clearTimeout(idleT);
    prob = E.generate(S.settings.op, currentLevel());
    input = ''; hintShown = 0; locked = false;
    $('q').textContent = prob.text;
    $('q').classList.toggle('long', prob.text.length > 14);
    $('qLvl').textContent = `${prob.level} · ${E.OP_LABEL[prob.op].toLowerCase()}`;
    $('fb').textContent = ''; $('fb').className = 'feedback';
    $('hintbox').classList.add('hidden');
    $('ans').className = 'answer';
    renderInput();
    tStart = performance.now();
    clearInterval(tick); tick = setInterval(renderTimer, 100); renderTimer();
  }
  function elapsed() { return (performance.now() - tStart) / 1000; }
  function sessionSec() { return (Date.now() - sess.start) / 1000; }
  function fmtClock(sec) { const m = Math.floor(sec / 60), s = sec - m * 60; return m ? `${m}:${s.toFixed(1).padStart(4, '0')}` : `${s.toFixed(1)}s`; }
  function renderTimer() {
    if (!sess) return;
    if (sess.mode === 'sprint') {
      const left = Math.max(0, SPRINT_SEC - sessionSec());
      $('timer').textContent = `${left.toFixed(0)}s left`;
      $('timer').classList.toggle('slow', left < 10);
      if (left <= 0) { endSession(); return; }
    } else if (sess.mode === 'set') {
      $('timer').textContent = `${sess.done}/${SET_N} · ${fmtClock(sessionSec())}`;
      $('timer').classList.remove('slow');
    } else {
      const s = elapsed();
      $('timer').textContent = s.toFixed(1) + 's';
      $('timer').classList.toggle('slow', s > prob.targetSec);
    }
  }
  function renderInput() {
    const a = $('ans');
    if (!input) a.innerHTML = '<span class="ph">type your answer</span>';
    else a.textContent = input.replace(/^(-?\d+)(?=(\d{3})+(\.|$))/g, (m) => Number(m).toLocaleString('en-US'));
  }
  // No Check button: the answer is checked as soon as it has as many digits as the right answer,
  // or after a short pause if a shorter number was typed.
  function autoCheck() {
    clearTimeout(idleT);
    if (!input || locked) return;
    const typed = input.replace(/\D/g, '').replace(/^0+(?=\d)/, '').length;
    const need = String(Math.round(Math.abs(prob.answer))).length;
    if (typed >= need) submit();
    else idleT = setTimeout(() => { if (input && !locked) submit(); }, IDLE_CHECK_MS);
  }
  function key(k) {
    if (locked || !sess) return;
    if (k === 'del') input = input.slice(0, -1);
    else if (k === 'go') { renderInput(); return submit(); }
    else if (k === '.') { if (!input.includes('.')) input = (input || '0') + '.'; }
    else if (/^\d$/.test(k)) { if (input.replace('.', '').length < 9) input += k; }
    renderInput();
    autoCheck();
  }
  $('keypad').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) key(b.dataset.k); });
  document.addEventListener('keydown', (e) => {
    if (!sess || !$('practice').classList.contains('active')) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^\d$/.test(e.key)) key(e.key);
    else if (e.key === '.' || e.key === ',') key('.');
    else if (e.key === 'Backspace') key('del');
    else if (e.key === 'Enter') key('go');
    else if (e.key.toLowerCase() === 'h') showHint();
    else if (e.key.toLowerCase() === 's') skip();
    else if (e.key === 'Escape') endSession();
    else return;
    e.preventDefault();
  });

  function buzz(pattern) { if (S.settings.haptics && navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) {} } }

  function submit() {
    clearTimeout(idleT);
    if (!input || locked) return;
    const sec = elapsed();
    const correct = E.checkAnswer(prob, input);
    const usedHint = hintShown > 0;
    sess.attempts++;
    const d = dayRec(todayKey());
    d.attempts++;
    const opRec = d.ops[prob.op] || (d.ops[prob.op] = { solved: 0, attempts: 0, seconds: 0 });
    opRec.attempts++;
    if (correct) {
      locked = true;
      const pts = E.scoreFor(prob, sec, usedHint);
      sess.solved++; sess.seconds += sec; sess.score += pts;
      if (sess.fastest === null || sec < sess.fastest) sess.fastest = sec;
      if (usedHint) { sess.hints++; d.hints++; }
      d.solved++; d.seconds += sec; d.score += pts;
      opRec.solved++; opRec.seconds += sec;
      S.totalScore += pts;
      recent.push({ correct: true, fast: sec <= prob.targetSec && !usedHint });
      $('ans').classList.add('ok');
      $('fb').textContent = `✓ +${pts} pts · ${sec.toFixed(1)}s${usedHint ? ' (hint)' : sec <= prob.targetSec ? ' · fast!' : ''}`;
      $('fb').className = 'feedback ok';
      buzz(30);
      pushHistory(correct, sec, usedHint, pts);
      sess.done++;
      if (sess.mode === 'set') renderTimer(); else clearInterval(tick);   // set: keep the running clock visible
      // streak just completed?
      const st = streak();
      if (st.todayMet && d.solved === S.settings.goal) toast(`🔥 Daily goal done — streak ${st.current}`);
      if (sess.mode === 'set' && sess.done >= SET_N) { sess.finishedAt = Date.now(); clearInterval(tick); setTimeout(endSession, 650); }
      else setTimeout(nextProblem, 650);
    } else {
      recent.push({ correct: false, fast: false });
      $('ans').classList.remove('bad'); void $('ans').offsetWidth; $('ans').classList.add('bad');
      $('fb').textContent = 'Not quite — try again or tap Hint';
      $('fb').className = 'feedback bad';
      buzz([40, 40, 40]);
      pushHistory(false, sec, usedHint, 0);
      if (!sess.misses.some(m => m.text === prob.text)) sess.misses.push({ text: prob.text, answer: prob.answer, given: input, hint: prob.hint });
      input = ''; renderInput();
    }
    if (S.settings.level === 'auto') {
      const nl = E.nextLevel(S.autoLevel, recent);
      if (nl !== S.autoLevel) { S.autoLevel = nl; recent = []; toast(nl === 'hard' || (nl === 'medium' && prob.level === 'easy') ? `⬆ Level up: ${nl}` : `⬇ Easing off: ${nl}`); }
    }
    save();
  }
  function pushHistory(correct, sec, hint, pts) {
    S.history.push({ t: Date.now(), op: prob.op, level: prob.level, text: prob.text, answer: prob.answer, given: input, correct, sec: Math.round(sec * 10) / 10, hint, pts });
    if (S.history.length > 300) S.history.splice(0, S.history.length - 300);
  }
  function showHint() {
    if (locked) return;
    const box = $('hintbox');
    const steps = prob.hint.steps;
    if (box.classList.contains('hidden')) { hintShown = 1; box.classList.remove('hidden'); }
    else if (hintShown < steps.length) hintShown++;
    $('hintTitle').textContent = '💡 ' + prob.hint.title;
    const ol = $('hintSteps'); ol.innerHTML = '';
    steps.forEach((s, i) => { const li = document.createElement('li'); li.textContent = s; if (i >= hintShown) li.classList.add('locked'); ol.appendChild(li); });
    $('hintMore').classList.toggle('hidden', hintShown >= steps.length);
  }
  $('btnHint').addEventListener('click', showHint);
  $('hintMore').addEventListener('click', showHint);
  function skip() {
    if (locked) return;
    clearTimeout(idleT);
    sess.misses.push({ text: prob.text, answer: prob.answer, given: 'skipped', hint: prob.hint });
    sess.skipped++; sess.done++;
    if (sess.mode === 'set' && sess.done >= SET_N) { sess.finishedAt = Date.now(); endSession(); }
    else nextProblem();
  }
  $('btnSkip').addEventListener('click', skip);
  $('btnQuit').addEventListener('click', endSession);

  function endSession() {
    clearInterval(tick); clearTimeout(idleT);
    if (!sess) return show('home');
    const s = sess; sess = null;
    // 10-question set: total wall-clock time, and a personal best when all 10 were answered
    const isSet = s.mode === 'set';
    const total = ((s.finishedAt || Date.now()) - s.start) / 1000;
    const full = isSet && s.done >= SET_N && s.skipped === 0;
    let bestNote = '';
    if (full) {
      const prev = S.best10[s.op];
      if (prev === undefined || total < prev) { S.best10[s.op] = Math.round(total * 10) / 10; bestNote = prev === undefined ? 'Your first full set — this is the time to beat.' : `New best! Previous: ${fmtClock(prev)}`; }
      else bestNote = `Your best: ${fmtClock(prev)}`;
    } else if (isSet) {
      bestNote = s.done < SET_N ? `Ended early — ${s.done} of ${SET_N} done.` : `Answer all ${SET_N} without skipping to set a best time.`;
    }
    const wrong = s.attempts - s.solved;
    $('sTitle').textContent = isSet ? (s.done >= SET_N ? `${SET_N} questions done` : 'Set ended') : 'Session done';
    $('sTimeCard').classList.toggle('hidden', !isSet);
    $('sTime').textContent = fmtClock(total);
    $('sTimeSub').textContent = `${s.solved} right · ${wrong} wrong ${wrong === 1 ? 'try' : 'tries'} · ${s.skipped} skipped${bestNote ? ' — ' + bestNote : ''}`;
    save();
    $('sScore').textContent = s.score.toLocaleString('en-US');
    $('sSolved').textContent = s.solved;
    $('sAcc').textContent = s.attempts ? Math.round(100 * s.solved / s.attempts) + '%' : '–';
    $('sVel').textContent = s.solved ? (s.seconds / s.solved).toFixed(1) : '–';
    $('sFast').textContent = s.fastest !== null ? s.fastest.toFixed(1) + 's' : '–';
    $('sHints').textContent = s.hints;
    const st = streak();
    $('sStreak').textContent = st.todayMet ? `${st.current} day${st.current === 1 ? '' : 's'} 🔥` : `${Math.max(0, S.settings.goal - (S.days[todayKey()] || { solved: 0 }).solved)} more to lock today`;
    const miss = $('sMiss'); miss.innerHTML = '';
    $('sMissCard').classList.toggle('hidden', s.misses.length === 0);
    s.misses.slice(0, 6).forEach(m => {
      const div = document.createElement('div'); div.className = 'hintbox';
      div.innerHTML = `<div class="ht">${esc(m.text)} = <b>${E.fmt(m.answer)}</b> <span style="color:var(--muted);font-weight:500">(you: ${esc(m.given)})</span></div><div style="font-size:14px;color:var(--muted)">${esc(m.hint.title)}</div><ol>${m.hint.steps.map(x => `<li>${esc(x)}</li>`).join('')}</ol>`;
      miss.appendChild(div);
    });
    renderChips();
    show('summary');
    $('btnAgain').onclick = () => startSession(s.mode);
  }
  $('btnHome').addEventListener('click', () => show('home'));
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }

  // ---------- stats ----------
  function renderStats() {
    const today = todayKey();
    const keys = []; for (let i = 13; i >= 0; i--) keys.push(E.shiftDay(today, -i));
    const vel = keys.map(k => { const d = S.days[k]; return d && d.solved ? d.seconds / d.solved : null; });
    const cnt = keys.map(k => (S.days[k] || { solved: 0 }).solved);
    spark($('sparkVel'), vel, true);
    spark($('sparkCnt'), cnt, false, S.settings.goal);
    $('sparkL').textContent = keys[0].slice(5).replace('-', '/');
    // per-op table
    const agg = {}; let T = { solved: 0, attempts: 0, seconds: 0 };
    Object.values(S.days).forEach(d => Object.entries(d.ops || {}).forEach(([op, r]) => {
      const a = agg[op] || (agg[op] = { solved: 0, attempts: 0, seconds: 0 });
      a.solved += r.solved; a.attempts += r.attempts; a.seconds += r.seconds;
      T.solved += r.solved; T.attempts += r.attempts; T.seconds += r.seconds;
    }));
    const rows = E.OPS.filter(op => agg[op]).map(op => trow(E.OP_LABEL[op], agg[op]));
    $('opTable').innerHTML = rows.length
      ? `<tr><th>Operation</th><th class="n">Solved</th><th class="n">Accuracy</th><th class="n">Sec / problem</th></tr>${rows.join('')}${trow('Total', T, true)}`
      : '<tr><td class="empty">No practice yet — your first session will show up here.</td></tr>';
    const st = streak();
    const days = Object.values(S.days);
    const totSolved = days.reduce((a, d) => a + d.solved, 0), totHints = days.reduce((a, d) => a + d.hints, 0);
    $('totals').innerHTML = [
      ['Total score', S.totalScore.toLocaleString('en-US')],
      ['Problems solved', totSolved.toLocaleString('en-US')],
      ['Days practised', days.filter(d => d.solved > 0).length],
      ['Current streak', `${st.current} day${st.current === 1 ? '' : 's'}`],
      ['Best streak', `${st.best} day${st.best === 1 ? '' : 's'}`],
      ['Hints used', totHints]
    ].map(([k, v]) => `<span class="k">${k}</span><span class="v">${v}</span>`).join('');
  }
  function trow(label, r, total) {
    return `<tr${total ? ' class="total"' : ''}><td>${label}</td><td class="n">${r.solved}</td><td class="n">${r.attempts ? Math.round(100 * r.solved / r.attempts) + '%' : '–'}</td><td class="n">${r.solved ? (r.seconds / r.solved).toFixed(1) : '–'}</td></tr>`;
  }
  function spark(svg, vals, isLine, goal) {
    const W = Math.max(320, Math.round(svg.clientWidth || 320)), H = 110, pad = 8, n = vals.length;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const nums = vals.filter(v => v !== null);
    svg.innerHTML = '';
    if (!nums.length) { svg.innerHTML = `<text x="${W / 2}" y="60" text-anchor="middle" fill="var(--muted)" font-size="13">no data yet</text>`; return; }
    const max = Math.max(goal || 0, ...nums) * 1.15 || 1;
    const x = (i) => pad + i * (W - 2 * pad) / (n - 1);
    const y = (v) => H - pad - (v / max) * (H - 2 * pad);
    let out = '';
    if (goal) out += `<line x1="0" x2="${W}" y1="${y(goal)}" y2="${y(goal)}" stroke="var(--ok)" stroke-dasharray="4 4" stroke-width="1"/><text x="2" y="${y(goal) - 3}" fill="var(--ok)" font-size="10">goal ${goal}</text>`;
    if (isLine) {
      const pts = vals.map((v, i) => v === null ? null : `${x(i)},${y(v)}`).filter(Boolean);
      out += `<polyline fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" points="${pts.join(' ')}"/>`;
      vals.forEach((v, i) => { if (v !== null) out += `<circle cx="${x(i)}" cy="${y(v)}" r="3.5" fill="var(--accent)"/><text x="${x(i)}" y="${y(v) - 7}" text-anchor="middle" fill="var(--muted)" font-size="10">${v.toFixed(1)}</text>`; });
    } else {
      const bw = (W - 2 * pad) / n * 0.6;
      vals.forEach((v, i) => { if (v) out += `<rect x="${x(i) - bw / 2}" y="${y(v)}" width="${bw}" height="${H - pad - y(v)}" rx="3" fill="${goal && v >= goal ? 'var(--ok)' : 'var(--accent)'}"/><text x="${x(i)}" y="${y(v) - 4}" text-anchor="middle" fill="var(--muted)" font-size="10">${v}</text>`; });
    }
    svg.innerHTML = out;
  }

  // ---------- settings ----------
  function renderSettings() {
    $('goalV').textContent = S.settings.goal;
    document.querySelectorAll('#themeSeg button').forEach(b => b.classList.toggle('on', b.dataset.t === S.settings.theme));
    document.querySelectorAll('#hapticSeg button').forEach(b => b.classList.toggle('on', (b.dataset.h === '1') === !!S.settings.haptics));
    $('installHelp').textContent = isStandalone() ? 'Installed — you are running the app.' : 'Add to your home screen for full-screen, offline use.';
  }
  $('goalMinus').addEventListener('click', () => { S.settings.goal = Math.max(3, S.settings.goal - 1); save(); renderSettings(); });
  $('goalPlus').addEventListener('click', () => { S.settings.goal = Math.min(100, S.settings.goal + 1); save(); renderSettings(); });
  $('themeSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; S.settings.theme = b.dataset.t; save(); applyTheme(); renderSettings(); });
  $('hapticSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; S.settings.haptics = b.dataset.h === '1'; save(); renderSettings(); });
  $('btnReset').addEventListener('click', () => { if (confirm('Delete all MindMath progress on this device?')) { S = defaults(); save(); applyTheme(); toast('Progress reset'); show('home'); } });
  $('btnExport').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `mindmath-backup-${todayKey()}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
  $('btnImport').addEventListener('click', () => $('fileImport').click());
  $('fileImport').addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const o = JSON.parse(r.result);
        if (!o || typeof o !== 'object' || !o.days) throw new Error('not a MindMath backup');
        if (!confirm('Replace the progress on this device with the imported file?')) return;
        S = Object.assign(defaults(), o, { settings: Object.assign(defaults().settings, o.settings || {}) });
        save(); applyTheme(); toast('Progress imported'); show('home');
      } catch (err) { toast('Could not import: ' + err.message); }
    };
    r.readAsText(f); e.target.value = '';
  });

  // ---------- install ----------
  let deferredPrompt = null;
  function isStandalone() { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true || location.search.includes('source=pwa'); }
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; if (!isStandalone()) $('installBox').classList.add('show'); });
  window.addEventListener('appinstalled', () => { $('installBox').classList.remove('show'); toast('Installed — open MindMath from your home screen'); });
  async function install() {
    if (deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; return; }
    const ua = navigator.userAgent, ios = /iPhone|iPad|iPod/.test(ua), mac = /Macintosh/.test(ua) && !ios;
    const steps = ios
      ? ['Open this page in <b>Safari</b> (Chrome on iPhone cannot install it).', 'Tap the <b>Share</b> button (square with an arrow).', 'Scroll and tap <b>Add to Home Screen</b>, then <b>Add</b>.']
      : mac
        ? ['<b>Safari:</b> File → Add to Dock.', '<b>Chrome / Edge:</b> click the install icon at the right end of the address bar, or menu → Install MindMath.']
        : ['<b>Chrome / Edge:</b> menu ⋮ → <b>Install app</b> (or <b>Add to Home screen</b>).', '<b>Firefox / Samsung:</b> menu → Add to Home screen.'];
    $('installSteps').innerHTML = `<ol>${steps.map(s => `<li>${s}</li>`).join('')}</ol>`;
    $('installPop').classList.add('show');
  }
  $('btnInstall').addEventListener('click', install);
  $('btnInstall2').addEventListener('click', install);
  $('installClose').addEventListener('click', () => $('installPop').classList.remove('show'));
  $('installPop').addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.classList.remove('show'); });
  if (!isStandalone() && !/Android/.test(navigator.userAgent) && /iPhone|iPad|iPod/.test(navigator.userAgent)) $('installBox').classList.add('show');

  // ---------- toast ----------
  let toastT;
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }

  // ---------- boot ----------
  applyTheme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  window.addEventListener('resize', () => { if ($('stats').classList.contains('active')) renderStats(); });
  show('home');
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  // keep the day fresh if the app stays open past midnight
  let lastDay = todayKey();
  setInterval(() => { const k = todayKey(); if (k !== lastDay) { lastDay = k; if ($('home').classList.contains('active')) renderHome(); else renderChips(); } }, 30000);

  // test hooks (used by the browser smoke test only)
  window.__mm = { get state() { return S; }, set state(v) { S = v; save(); }, startSession, endSession, key, showHint, skip, currentProblem: () => prob, show, todayKey, render: renderHome };
})();
