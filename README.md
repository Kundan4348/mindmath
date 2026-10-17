# MindMath

A small installable web app (PWA) for daily mental-math practice: addition, subtraction, multiplication, division and percentages, with a plain-English hint for every problem, speed and score tracking, and a daily streak. Works on phone and laptop, offline, no account. Progress is stored on the device.

## Run locally
    ./serve.sh            # http://localhost:8098

## Test
    node test/engine.test.js     # generates 45,000 problems and checks answers, hints, scoring, streak logic
    node test/brain.test.js      # re-simulates thousands of picture / walk / rotate / fold tasks and checks every answer
    test/e2e.browser.js, test/e2e.autocheck.js and test/e2e.brain.js are browser scripts: open the app, paste one into the console (or playwright eval) and read the returned object.

## Answering
There is no Check / Enter button. Every answer is a whole number, so the app checks the moment you have typed as many digits as the answer has. A shorter number is checked after a 1.5 s pause. Wrong -> shake, input clears, try again or tap Hint. Enter still works on a keyboard if pressed.

## Modes
- **Practice (endless)** — go until you tap End.
- **10 questions — how fast?** — ten problems, the clock runs from the first to the tenth; the summary shows the total time and keeps your best time per operation (only when all ten were answered, no skips).
- **60-second sprint** — as many as you can in a minute.

## Brain tab — imagining and out-of-the-box exercises
Imagining (graded, levels go up after two right in a row, down after two wrong):
- **Picture builder** — one instruction at a time ("a red cube… put a blue ball on it… move the ring onto the cube"), nothing on screen, then a question only the picture answers. Level = number of objects (2 to 6) and moves.
- **Rotate & fold** — which option is this shape turned 90°/180°/270°? Or: fold a 4×4 paper once or twice, punch holes, where are they when unfolded?
- **Walk in your head** — "walk 2 blocks north, turn left, walk 3…", then point to home on a compass.
- **Memory walk** — place 4-11 words in the rooms of a home (shown on a timer), then recall them. 3 of 4 counts as a pass.
- **Math as pictures** — 2-digit multiplication as an area cut into four pieces, add/subtract as jumps on a number line. Level 1 shows the numbers, level 2 the picture only, level 3 nothing (imagine it).

Creative (not graded for quality, counted and journaled):
- **Other uses** — one object, 60 seconds, as many uses as you can. Count + novelty bonus against your own earlier answers for that object.
- **Three words, one link** — find the word that joins all three (cottage, swiss, cake → cheese). Hint halves the points.
- **Force a combination** — two random nouns, 90 seconds (soft), invent one product or story. Rate yourself 1-3 for oddness.
- **What if…** — one prompt a day (same all day), three consequences. "Another prompt" gives a random one.
Combination and what-if entries are kept in **Brain → Your ideas**.

## Daily mix (Settings → Daily mix, on by default)
The day locks for the streak when the math goal is met **and** one imagining and one creative exercise were done (any of each group; the home card suggests one of each per day). With the mix off, only the math goal counts.

## Files
- `index.html` — UI (home, practice, summary, brain, exercise runner, progress, settings)
- `app.js` — session loop, persistence (localStorage key `mindmath.v1`), charts, install flow
- `engine.js` — problem generator, hint strategies, scoring, adaptive level, streak maths (also runs in Node)
- `brain.js` — generators and checking for the nine brain exercises, daily mix pick (also runs in Node)
- `brain-ui.js` — the exercise runner, Brain tab, mix card and brain stats
- `sw.js`, `manifest.webmanifest`, `icons/` — PWA shell

## How scoring works
- Base points: easy 10, medium 20, hard 35.
- Answer at or under the comfortable time for that problem type → double points; the bonus fades to zero at three times that time.
- Using a hint → half the base points.
- Daily goal (default 10 solves) locks the day for the streak. Streak breaks after a missed day; best streak is kept.
