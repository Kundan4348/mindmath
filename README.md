# MindMath

A small installable web app (PWA) for daily mental-math practice: addition, subtraction, multiplication, division and percentages, with a plain-English hint for every problem, speed and score tracking, and a daily streak. Works on phone and laptop, offline, no account. Progress is stored on the device.

## Run locally
    ./serve.sh            # http://localhost:8098

## Test
    node test/engine.test.js     # generates 45,000 problems and checks answers, hints, scoring, streak logic
    test/e2e.browser.js and test/e2e.autocheck.js are browser scripts: open the app, paste one into the console (or playwright eval) and read the returned object.

## Answering
There is no Check / Enter button. Every answer is a whole number, so the app checks the moment you have typed as many digits as the answer has. A shorter number is checked after a 1.5 s pause. Wrong -> shake, input clears, try again or tap Hint. Enter still works on a keyboard if pressed.

## Modes
- **Practice (endless)** — go until you tap End.
- **10 questions — how fast?** — ten problems, the clock runs from the first to the tenth; the summary shows the total time and keeps your best time per operation (only when all ten were answered, no skips).
- **60-second sprint** — as many as you can in a minute.

## Files
- `index.html` — UI (home, practice, summary, progress, settings)
- `app.js` — session loop, persistence (localStorage key `mindmath.v1`), charts, install flow
- `engine.js` — problem generator, hint strategies, scoring, adaptive level, streak maths (also runs in Node)
- `sw.js`, `manifest.webmanifest`, `icons/` — PWA shell

## How scoring works
- Base points: easy 10, medium 20, hard 35.
- Answer at or under the comfortable time for that problem type → double points; the bonus fades to zero at three times that time.
- Using a hint → half the base points.
- Daily goal (default 10 solves) locks the day for the streak. Streak breaks after a missed day; best streak is kept.
