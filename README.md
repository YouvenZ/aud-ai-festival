# AUD AI Festival 2026

Two static pages, no build step:

- `site/presentation/`: auto-playing showcase of 15 student AI projects, alternating graduate (MSAI) and undergraduate work. Built on reveal.js, which is vendored so it runs offline.
- `site/activities/`: three booth challenges (readiness quiz, prompt builder, AI-or-not). Drag and drop works with touch, and every drag also has a tap fallback. The page resets itself after 2 minutes idle.
- `site/index.html`: landing page linking both.

## Run locally
    npm run serve          # http://127.0.0.1:8765
    npm test               # in a second terminal (needs `npm install` once; uses system Chrome)

Presentation keys: ← → browse · A pause/resume autoplay · F fullscreen · Esc overview.
Direct links: `activities/#quiz`, `#prompt`, `#ainot`; `presentation/#/5` jumps to slide 6.

## Publish
Push this folder to a GitHub repo, then go to Settings → Pages → Source: **GitHub Actions**.
`.github/workflows/pages.yml` deploys `site/` on every push to `main`.

## Editing
- Slide text: `site/presentation/index.html` (one `<section>` per slide; `data-autoslide` = ms on screen)
- Slide animations: `site/presentation/deck.js` (one function per `data-viz`)
- Quiz questions, prompt blocks, AI-or-not cards: arrays at the top of each section in `site/activities/activities.js`
