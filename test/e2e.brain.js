// Browser test for the Brain tab, all nine exercises and the daily mix. Paste into the console / playwright eval; returns a results object.
(async () => {
  const $ = (id) => document.getElementById(id);
  const mm = window.__mm, BU = window.BrainUI, B = window.Brain;
  const w = (ms) => new Promise(r => setTimeout(r, ms));
  const out = { errors: [] };
  window.addEventListener('error', e => out.errors.push(e.message));
  const fresh = JSON.parse(JSON.stringify(mm.state));
  fresh.days = {}; fresh.totalScore = 0; fresh.history = []; fresh.brain = { level: {}, recent: {}, usesSeen: {}, journal: [], bestParts: 0 };
  fresh.settings.goal = 3; fresh.settings.mix = true; fresh.settings.level = 'easy';
  mm.state = fresh; mm.render();
  const clickAct = (a) => { const b = document.querySelector(`#bx [data-act="${a}"]`); if (!b) throw new Error('no button ' + a); b.click(); };
  const today = mm.todayKey();
  const dayB = () => (mm.state.days[today] || {}).brain || { imagine: 0, create: 0 };

  // --- home shows today's mix with 3 rows and the Brain tab lists 9 exercises ---
  out.mixRows = document.querySelectorAll('#mixBox .row-m').length;                       // 3
  mm.show('brain');
  out.exerciseCards = document.querySelectorAll('#brain .ex').length;                       // 9
  out.navHasBrain = !!document.querySelector('nav button[data-view="brain"]');

  // --- picture builder: step through, answer correctly via the task object ---
  BU.start('picture');
  let bx = BU.current; out.pictureSteps = bx.task.steps.length;
  out.pictureFirstStepShown = $('bxStage').textContent.includes(bx.task.steps[0]);
  for (let i = 0; i < bx.task.steps.length; i++) clickAct('next');
  out.pictureQuestionShown = $('bxStage').textContent.includes(bx.task.question);
  out.pictureOptionCount = document.querySelectorAll('#bx .opts button').length;
  document.querySelector(`#bx .opts button[data-v="${bx.task.answer}"]`).click();
  out.pictureRightFeedback = $('bxStage').textContent.includes('✓ Right');
  out.pictureCountedImagine = dayB().imagine === 1;
  out.pictureBestParts = mm.state.brain.bestParts;
  // wrong answer path on the next one -> no extra imagine count, level unchanged
  clickAct('again'); bx = BU.current;
  for (let i = 0; i < bx.task.steps.length; i++) clickAct('next');
  const wrong = [...document.querySelectorAll('#bx .opts button')].find(b => b.dataset.v !== bx.task.answer); wrong.click();
  out.pictureWrongFeedback = $('bxStage').textContent.includes('Not this time');
  out.pictureWrongNotCounted = dayB().imagine === 1;
  // two right in a row -> level 2
  for (let k = 0; k < 2; k++) { clickAct('again'); bx = BU.current; for (let i = 0; i < bx.task.steps.length; i++) clickAct('next'); document.querySelector(`#bx .opts button[data-v="${bx.task.answer}"]`).click(); }
  out.pictureLevelAfter2Right = mm.state.brain.level.picture;                             // 2

  // --- walk ---
  BU.start('walk'); bx = BU.current;
  for (let i = 0; i < bx.task.steps.length; i++) clickAct('next');
  out.walkCompassButtons = document.querySelectorAll('#bx .opts.compass button').length;  // 9
  document.querySelector(`#bx .opts button[data-v="${bx.task.answer}"]`).click();
  out.walkRight = $('bxStage').textContent.includes('✓ Right');

  // --- rotate: force both modes by regenerating until each is seen ---
  for (const mode of ['rotate', 'fold']) {
    for (let tries = 0; tries < 30; tries++) { BU.start('rotate'); if (BU.current.task.mode === mode) break; }
    bx = BU.current; if (bx.task.mode !== mode) { out['rotate_' + mode] = 'not generated'; continue; }
    if (mode === 'fold') { for (let i = 0; i < bx.task.steps.length; i++) clickAct('next'); }
    out['rotate_' + mode + '_grids'] = document.querySelectorAll('#bx .opts.grids button .grid').length;   // 4
    out['rotate_' + mode + '_answerCellsOn'] = document.querySelector(`#bx .opts button[data-v="${bx.task.answer}"]`).querySelectorAll(mode === 'rotate' ? 'i.on' : 'i.hole').length === bx.task.answer.split(';').length;
    document.querySelector(`#bx .opts button[data-v="${bx.task.answer}"]`).click();
    out['rotate_' + mode + '_right'] = $('bxStage').textContent.includes('✓ Right');
  }

  // --- palace: start, let two words auto-advance on the timer, skip the rest with Got it, recall all but one ---
  BU.start('palace'); bx = BU.current;
  out.palaceIntro = $('bxStage').textContent.includes('Start the walk') || !!document.querySelector('#bx [data-act="palaceGo"]');
  clickAct('palaceGo');
  const w0 = bx.task.words[0];
  out.palaceShowsRoomAndWord = $('bxStage').textContent.includes(w0) && $('bxStage').textContent.toLowerCase().includes(bx.task.rooms[0]);
  await w(bx.task.perWordSec * 1000 + 300);
  out.palaceAutoAdvanced = bx.step === 1;
  while (bx.step < bx.task.words.length) clickAct('next');
  out.palaceRecallBox = !!$('bxText');
  $('bxText').value = bx.task.words.slice(0, -1).map(x => x.toUpperCase()).join('\n') + '\nnotaword';
  clickAct('palaceCheck');
  out.palaceResult = $('bxStage').textContent.match(/(\d+) of (\d+) recalled/)?.slice(1, 3);
  out.palaceCountedImagine = dayB().imagine >= 2;

  // --- mathpic: correct answer auto-checks on the last digit; also the wrong-twice path ---
  BU.start('mathpic'); bx = BU.current;
  out.mathpicHasPicture = !!document.querySelector('#bx svg.pic');
  const inp = $('bxNum'); inp.value = String(bx.task.answer); inp.dispatchEvent(new Event('input'));
  out.mathpicAutoChecked = $('bxStage').textContent.includes('✓ Right');
  out.mathpicStepsShown = $('bxStage').textContent.includes(bx.task.steps[0]);
  clickAct('again'); bx = BU.current;
  for (let k = 0; k < 2; k++) { const i2 = $('bxNum'); i2.value = String(bx.task.answer + 1); clickAct('mathCheck'); await w(10); }
  out.mathpicWrongTwiceEnds = $('bxStage').textContent.includes('Not this time') && $('bxStage').textContent.includes(String(bx.task.answer));

  // --- uses: add 4 ideas (one duplicate), finish early; second run on same object marks repeats ---
  BU.start('uses'); bx = BU.current; const obj = bx.task.object;
  for (const t of ['door stop', 'Door Stop!', 'paperweight', 'tiny table for a mouse']) { $('bxIdea').value = t; clickAct('addIdea'); }
  out.usesChipsAfterDup = document.querySelectorAll('#bxIdeas span').length;              // 3
  await w(350); out.usesTimerRunning = /\d+s/.test($('bxTimer').textContent);
  clickAct('usesDone');
  out.usesSummary = $('bxStage').textContent.match(/(\d+) ideas · (\d+) new/)?.slice(1, 3); // 3, 3
  out.usesCountedCreate = dayB().create === 1;
  out.usesJournal = mm.state.brain.journal.length === 1;
  out.usesSeenStored = (mm.state.brain.usesSeen[obj] || []).length === 3;

  // --- links: wrong, hint, right ---
  BU.start('links'); bx = BU.current;
  $('bxWord').value = 'zzz'; clickAct('linkCheck'); out.linksWrongFb = $('bxLinkFb').textContent.includes('does not fit');
  clickAct('linkHint'); out.linksHint = $('bxLinkFb').textContent.includes('Starts with');
  $('bxWord').value = bx.task.answer.toUpperCase(); clickAct('linkCheck');
  out.linksRightWithHintPts = $('bxStage').textContent.includes('+12 pts');

  // --- combine: too short refused, then saved with rating 3 ---
  BU.start('combine'); bx = BU.current;
  $('bxText').value = 'short'; clickAct('writeDone'); out.combineShortRefused = !BU.current.done;
  $('bxText').value = 'A folding umbrella that doubles as a calendar: each rib is a month and you open it to plan.'; document.querySelector('#bxStars button[data-v="3"]').click(); clickAct('writeDone');
  out.combineSaved = $('bxStage').textContent.includes('Saved · +25 pts');   // 15 + 5*(3-1)

  // --- what if: today's prompt is stable; "another prompt" gives a different one ---
  BU.start('whatif'); const p1 = BU.current.task.prompt; BU.start('whatif'); out.whatifStable = BU.current.task.prompt === p1;
  $('bxText').value = '1. nobody would be late\n2. shops open all night\n3. clocks become jewellery'; clickAct('writeDone');
  clickAct('again'); out.whatifAnotherDiffers = BU.current.task.prompt !== p1 || B.WHATIF.length < 2;
  BU.end();

  // --- daily mix & streak: math goal (3) not yet met -> day not locked although imagine+create done ---
  out.dayMetBeforeMath = window.__mmHooks.dayMet(today);           // false
  mm.startSession('free');
  for (let i = 0; i < 3; i++) { const p = mm.currentProblem(); for (const ch of String(p.answer)) mm.key(ch); await w(700); }
  mm.endSession();
  out.dayMetAfterMath = window.__mmHooks.dayMet(today);            // true
  out.streakNow = window.__mmHooks.streak().current;              // 1
  mm.show('home');
  out.mixRowsDone = document.querySelectorAll('#mixBox .row-m.done').length;   // 3
  out.goalRightText = $('goalRight').textContent;
  // mix off -> only math counts
  const keepBrain = mm.state.days[today].brain;
  mm.state.settings.mix = false; mm.state.days[today].brain = { imagine: 0, create: 0, kinds: {} };
  out.dayMetMixOff = window.__mmHooks.dayMet(today);               // true
  mm.state.settings.mix = true; out.dayMetMixOnNoBrain = window.__mmHooks.dayMet(today);   // false
  mm.state.days[today].brain = keepBrain;

  // --- stats renders brain table with Total row ---
  mm.show('stats');
  out.brainTableRows = document.querySelectorAll('#brainTable tr').length;
  out.brainTableTotal = !!document.querySelector('#brainTable tr.total');
  out.brainTotals = $('brainTotals').textContent.replace(/\s+/g, ' ').slice(0, 160);
  return out;
})();
