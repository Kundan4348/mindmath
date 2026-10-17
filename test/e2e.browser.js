// drives the real UI through the test hooks and reads the DOM back
const $ = (id) => document.getElementById(id);
const out = {};
const mm = window.__mm;
mm.state = Object.assign(JSON.parse(JSON.stringify(mm.state)), { days: {}, totalScore: 0, history: [], autoLevel: 'easy' });
mm.state.settings.goal = 3; mm.state.settings.op = 'mixed'; mm.state.settings.level = 'auto';
mm.render();
mm.startSession('free');
out.practiceVisible = $('practice').classList.contains('active');
function typeAnswer(v) { for (const ch of String(v)) mm.key(ch); mm.key('go'); }
// 1) wrong answer
let p = mm.currentProblem();
typeAnswer(p.answer + 1);
out.wrongFeedback = $('fb').textContent; out.wrongClass = $('ans').className;
out.sameProblemAfterWrong = mm.currentProblem().text === p.text;
// 2) hint reveal
mm.showHint();
out.hintTitle = $('hintTitle').textContent;
out.hintStepsTotal = $('hintSteps').children.length; out.hintLocked = $('hintSteps').querySelectorAll('.locked').length;
mm.showHint();
out.hintLockedAfter2 = $('hintSteps').querySelectorAll('.locked').length;
// 3) correct answer with hint
typeAnswer(p.answer);
out.okFeedback = $('fb').textContent;
const w = (ms) => new Promise(r => setTimeout(r, ms));
return (async () => {
  await w(800);
  // 4) two more correct without hint -> daily goal 3 met
  for (let i = 0; i < 2; i++) { const q = mm.currentProblem(); typeAnswer(q.answer); await w(800); }
  const day = mm.state.days[mm.todayKey()];
  out.day = { solved: day.solved, attempts: day.attempts, hints: day.hints, score: day.score };
  out.totalScore = mm.state.totalScore;
  out.history = mm.state.history.map(h => `${h.text} given=${h.given} ${h.correct ? 'OK' : 'X'} ${h.pts}pts hint=${h.hint}`);
  // 5) skip then end
  mm.skip();
  mm.endSession();
  out.summaryVisible = $('summary').classList.contains('active');
  out.summary = { score: $('sScore').textContent, solved: $('sSolved').textContent, acc: $('sAcc').textContent, vel: $('sVel').textContent, hints: $('sHints').textContent, streak: $('sStreak').textContent, missCount: $('sMiss').children.length };
  mm.show('home');
  out.home = { streak: $('hStreak').textContent, today: $('hToday').textContent, vel: $('hVel').textContent, goal: $('goalText').textContent, chipStreak: $('chipStreakV').textContent, chipScore: $('chipScore').textContent, calMet: document.querySelectorAll('#cal .d.met').length };
  // 6) fake a streak: yesterday + day before met -> streak 3
  const y1 = Engine.shiftDay(mm.todayKey(), -1), y2 = Engine.shiftDay(mm.todayKey(), -2);
  const st = mm.state; st.days[y1] = { solved: 3, attempts: 3, hints: 0, seconds: 10, score: 30, ops: {} }; st.days[y2] = { solved: 5, attempts: 6, hints: 1, seconds: 20, score: 50, ops: {} }; mm.state = st;
  mm.render();
  out.homeAfterFakeStreak = { streak: $('hStreak').textContent, calMet: document.querySelectorAll('#cal .d.met').length };
  // 7) stats page
  mm.show('stats');
  out.stats = { opRows: $('opTable').querySelectorAll('tr').length, totalRow: $('opTable').querySelector('tr.total') && $('opTable').querySelector('tr.total').textContent, totals: $('totals').textContent, velPoints: $('sparkVel').querySelectorAll('circle').length, cntBars: $('sparkCnt').querySelectorAll('rect').length };
  // 8) reload persists
  out.persisted = JSON.parse(localStorage.getItem('mindmath.v1')).totalScore;
  out.sw = !!(navigator.serviceWorker && (await navigator.serviceWorker.getRegistration()));
  return JSON.stringify(out, null, 1);
})();
