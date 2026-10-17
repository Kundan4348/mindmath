# MindMath

A small installable web app (PWA) for daily mental-math practice: addition, subtraction, multiplication, division and percentages, with a plain-English hint for every problem, speed and score tracking, and a daily streak. Works on phone and laptop, offline, no account. Progress is stored on the device.

## Run locally
    ./serve.sh            # http://localhost:8098

## Test
    node test/engine.test.js     # generates 45,000 problems and checks answers, hints, scoring, streak logic

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
