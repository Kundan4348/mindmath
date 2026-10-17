// Browser test for: no Check button (auto-check) and the 10-question timed set.
// Run in the page console / playwright eval; returns a results object.
(async () => {
  const $ = (id) => document.getElementById(id);
  const mm = window.__mm;
  const w = (ms) => new Promise(r => setTimeout(r, ms));
  const out = {};
  mm.state = Object.assign(JSON.parse(JSON.stringify(mm.state)), { days: {}, totalScore: 0, history: [], autoLevel: 'easy', best10: {} });
  mm.state.settings.goal = 50; mm.state.settings.op = 'mixed'; mm.state.settings.level = 'easy';
  mm.render();

  // --- keypad has no Check button, 3 columns ---
  out.keypadButtons = [...document.querySelectorAll('#keypad button')].map(b => b.dataset.k).join(' ');
  out.keypadCols = getComputedStyle($('keypad')).gridTemplateColumns.split(' ').length;
  out.homeHasSetButton = !!$('btnSet');

  // --- auto-check: typing exactly the right digits advances with no Enter ---
  mm.startSession('free');
  let p = mm.currentProblem();
  for (const ch of String(p.answer)) mm.key(ch);
  out.autoCorrectFeedback = $('fb').textContent;           // expect "✓ ..."
  await w(800);
  out.movedOnWithoutEnter = mm.currentProblem().text !== p.text;

  // --- auto-check: wrong answer of the same length is checked immediately ---
  p = mm.currentProblem();
  const wrongSameLen = String(p.answer).replace(/\d$/, d => String((Number(d) + 1) % 10));
  for (const ch of wrongSameLen) mm.key(ch);
  out.wrongSameLenFeedback = $('fb').textContent;           // expect "Not quite ..."
  out.inputClearedAfterWrong = $('ans').textContent.includes('type your answer');

  // --- auto-check: shorter guess is checked after the idle pause (1.5 s) ---
  if (String(p.answer).length > 1) {
    mm.key(String(p.answer)[0]);                           // one digit only
    out.shortNotCheckedYet = $('fb').textContent.startsWith('Not quite') && $('ans').textContent.trim() === String(p.answer)[0];
    await w(1700);
    out.shortCheckedAfterPause = mm.state.history.length === 3; // 1 ok + 2 wrong tries logged
    out.shortGiven = mm.state.history[2] && mm.state.history[2].given;
  }
  // mid-typing pause must NOT fire when the full answer is then typed within 1.5 s
  for (const ch of String(p.answer)) mm.key(ch);
  out.finallyCorrect = $('fb').textContent.startsWith('✓');
  await w(800);
  mm.endSession();

  // --- 10-question set ---
  mm.startSession('set');
  out.setModeLabel = $('pMode').textContent;
  out.setTimerStart = $('timer').textContent;              // "0/10 · 0.0s"
  const t0 = performance.now();
  for (let i = 0; i < 10; i++) {
    const q = mm.currentProblem();
    if (i === 3) { const wrong = String(q.answer).replace(/\d$/, d => String((Number(d) + 1) % 10)); for (const ch of wrong) mm.key(ch); } // one wrong try
    for (const ch of String(q.answer)) mm.key(ch);
    if (i === 4) out.setTimerMid = $('timer').textContent;  // after 5th correct -> "5/10 · ..."
    await w(720);
  }
  const wall = (performance.now() - t0) / 1000;
  out.setAutoEnded = $('summary').classList.contains('active');
  out.setTitle = $('sTitle').textContent;
  out.setTimeShown = !$('sTimeCard').classList.contains('hidden');
  out.setTime = $('sTime').textContent;
  out.setTimeSub = $('sTimeSub').textContent;
  out.setWallApprox = wall.toFixed(1) + 's';
  out.setSummary = { solved: $('sSolved').textContent, acc: $('sAcc').textContent };
  out.best10 = JSON.stringify(mm.state.best10);

  // --- second set, slower, so the best is kept; one skip -> no best ---
  mm.startSession('set');
  for (let i = 0; i < 10; i++) {
    const q = mm.currentProblem();
    if (i === 2) { mm.skip(); continue; }
    for (const ch of String(q.answer)) mm.key(ch);
    await w(720);
  }
  out.set2Sub = $('sTimeSub').textContent;
  out.best10After = JSON.stringify(mm.state.best10);

  // --- early end of a set ---
  mm.startSession('set');
  for (const ch of String(mm.currentProblem().answer)) mm.key(ch);
  await w(720);
  mm.endSession();
  out.earlySub = $('sTimeSub').textContent; out.earlyTitle = $('sTitle').textContent;

  // --- free/sprint summaries hide the time card ---
  mm.startSession('free'); mm.endSession();
  out.freeHidesTime = $('sTimeCard').classList.contains('hidden');
  mm.show('home');
  return out;
})()
