# Read QR by Eye (اقرأ الـQR بعينك)

**Live site: https://murtadha203.github.io/qr-manual-reader/**

English by default, with a full Arabic version one click away (the language button in the top bar; the choice is remembered per browser). Every lesson, step, widget and message exists in both languages, kept side by side in the same files so they cannot drift apart.

A visual, step-by-step guide to decoding a QR code by hand. Every step is drawn on the code itself: the region being explained is boxed, its bits are labelled with their values and reading order, and the panel beside it works through what those bits mean.

## Fundamentals first

Before reading any code, eleven short interactive lessons explain every concept the reader uses: bits and bytes, XOR, grid coordinates, the parts of a code, versions and sizes, error correction (break a code and watch when it stops scanning), format information and the fixed pattern (switch it off and see the all-white strip), the mask (compare all eight rules and their penalties), encoding modes and message layout, and reading order with block interleaving, ending with a one-page reading map. Each page has a widget, most have a small task, and each lesson ends with a quiz; progress is kept in the browser.

Underlined terms in the reader link to the lesson that explains them, and the lesson offers a button back to the same step.

## Timed practice

A random code at three levels: Easy (version 1, digits or capitals), Common (versions 2 to 4, a short link or phrase) and Hard (version 4 and up, interleaved blocks). The code stays hidden until the timer starts. The level and mask can be checked on the way for split times; a wrong message says how many leading characters are right. Optional aids (dim fixed parts, mask dots, reading path) are recorded with the time, modules can be tapped to mark progress, and the code can be downloaded large with row and column numbers for pen and paper. Best times and recent attempts are kept per level in the browser. Every code comes from a seed in the address (`#practice=medium&seed=4242`), so it can be shared or replayed, and a finished code links to its own step-by-step walkthrough.

## What a code walkthrough covers

1. Structure: finder, timing and alignment patterns, the dark module, reserved areas, the data region.
2. Format information: where to read the 15 bits, removing the fixed XOR pattern (shown on the grid), error-correction level, mask number, BCH check bits.
3. Version information (version 7 and up).
4. The mask: all eight rules, the rule in use, a worked example on two cells, an animation applying it with a before/after toggle.
5. Reading order: the two-column snake, the first byte bit by bit, every codeword outlined.
6. Blocks and error correction: data vs. correction bytes, interleaving across blocks, reassembly, Reed-Solomon check (damaged bytes highlighted and corrected).
7. The message: mode indicator, character count, then every character decoded (numeric groups, alphanumeric pairs with the 45-symbol table, bytes including multi-byte UTF-8, Kanji via Shift JIS, ECI), terminator and padding.
8. Result, with the whole grid coloured by what each part turned out to be.

## Input

- Twelve examples that together cover all 8 masks, all 4 error-correction levels, every mode, mixed segments, single and multi-block layouts, uneven blocks, version information, a code damaged by a logo, and a tilted photo.
- Any typed text, with version, level, mask and mode forced or automatic.
- A photo or screenshot (file, drag and drop, paste). jsQR only locates the code; the grid is sampled here and the lesson starts from that grid.

## Run

It is a static page with no build step. Open `index.html` directly, or serve the folder:

```bash
python -m http.server 8765
```

Any step can be linked: `index.html#s=arabic&step=28`.

## Tests

```bash
npm install
node test/run-tests.js
```

Cross-checks against two independent libraries: node-qrcode's matrices for every version 1 to 40 at every level decode correctly and match this encoder module for module; jsQR reads this encoder's output; Reed-Solomon correction with random errors; damaged format and version information; step generation for every example.

```bash
node test/visual.js <output-folder>
```

Drives the page in headless Edge (server on 127.0.0.1:8765): walks every step of every example, fails on console errors, broken text, blank canvases or horizontal overflow, tests typed text, a real file upload and an image with no code, and saves screenshots for desktop and mobile.

## Layout

| File | Role |
|---|---|
| `js/gf.js` | GF(256) arithmetic, Reed-Solomon encode and decode |
| `js/tables.js` | Spec tables and geometry shared by encoder and decoder |
| `js/encoder.js` | Text or segments to a module matrix |
| `js/decoder.js` | Instrumented decoder: records which modules every value came from |
| `js/steps.js` | Turns a decode into the lesson (Arabic text, boxes, tints, zoom) |
| `js/renderer.js` | Canvas grid view |
| `js/image.js` | Photo to grid |
| `js/samples.js` | The examples |
| `js/widgets.js` | Interactive widgets for the lessons |
| `js/lessons.js` | Lesson content, tasks and quizzes |
| `js/app.js` | Page wiring, routing, lesson progress |

```bash
node test/lessons-visual.js <output-folder>
```

```bash
node test/phone.js <output-folder>
```

Phone layout at 390 and 360 pixels wide, in English and Arabic: the walkthrough grid stays pinned under the top bar while the explanation scrolls, the step title is on the first screen, the bottom navigation stays in view, swiping the grid changes step (direction flips in Arabic), lessons show the explanation before the widget, nothing overflows sideways, no touch target is under 32px, and the desktop layout is unchanged.

```bash
node test/practice-visual.js <output-folder>
```

Timed practice end to end: hidden code before start, the timer, aids and marks, wrong then right checkpoints, the finished result and saved best time, the walkthrough link rebuilding the same code, giving up, a language switch mid-run, and the phone layout (code and a small timer stay pinned while the answer boxes scroll).

```bash
node test/lessons-visual.js <output-folder>
```

Walks all eleven lessons in headless Edge, performs every task and answers every quiz (a wrong answer first), checks progress, deep links, and the reader to lesson and back flow, with desktop and mobile screenshots.

Not yet supported: Micro QR, rMQR, English interface.
