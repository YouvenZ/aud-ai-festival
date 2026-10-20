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

## Credits

Logos: Dubai AI Festival and American University in Dubai (School of Engineering), used for the AUD showcase at the festival. Project figures and photos (EV station, MRI, hippocampus viewer, HVAC building, ship, SKMC building, MSAI flyer) come from the students' own slides and papers.

Background photos from Wikimedia Commons:

- `pv-solar.webp`: USAF, Public domain, <https://commons.wikimedia.org/wiki/File:Nellis_AFB_Solar_panels.jpg>
- `eeg-cap.webp`: Laurens R. Krol, CC BY 4.0, <https://commons.wikimedia.org/wiki/File:Brain-computer_interface_experiment.jpg>
- `eye-tracker.webp`: Jan Bambach, CC BY-SA 3.0, <https://commons.wikimedia.org/wiki/File:Eye_See_You_(131557467).jpeg>
- `ckd-lab.webp`: U.S. Air Force photo by Airman 1st Class David S. Calcote, Public domain, <https://commons.wikimedia.org/wiki/File:374_MDG_enhances_operational_readiness_at_Yokota_(9003485).jpg>
- `ecg-echo.webp`: Petty Officer 1st Class James Stenberg, Public domain, <https://commons.wikimedia.org/wiki/File:Vital_signs_monitor_display.jpg>
- `mangroves-uae.webp`: Sendamuse, CC BY-SA 4.0, <https://commons.wikimedia.org/wiki/File:Jubail_Horizon_at_the_Park.jpg>
- `dxb-aircraft.webp`: Andy Mabbett, CC BY-SA 4.0, <https://commons.wikimedia.org/wiki/File:Dubai_International_Airport_-_2024-10-24_-_Andy_Mabbett_-_54.jpg>
- `cctv-camera.webp`: EFF, CC BY 3.0, <https://commons.wikimedia.org/wiki/File:A_close-up_of_the_cameras_and_sensors_of_a_Remote_Video_Surveillance_System_(RVSS)_in_Nogales,_AZ_(2).jpg>
- `container-port-jebelali.webp`: Imre Solt, CC BY-SA 3.0, <https://commons.wikimedia.org/wiki/File:Jebel_Ali_Port_2_Imresolt.jpg>
- `ev-charging.webp`: Ivan Radic, CC BY 2.0, <https://commons.wikimedia.org/wiki/File:Electric_car_charging_(9213).jpg>

Fonts: Archivo, IBM Plex Sans and IBM Plex Mono (SIL Open Font License), self-hosted via Fontsource.

## Presentation video (USB / TV)

`npm run video` renders the deck to `video/aud-ai-festival-showcase.mp4`: 1920×1080, 30 fps, H.264 with a silent audio track, so it plays on TVs, laptops and projectors. `npm run video:usb` writes a version where the deck plays three times in a row, for TVs that don't loop.

The page runs on a virtual clock (timers, animation frames and CSS animations all advance exactly one frame at a time), so the video is smooth even on a slow machine. A full render takes about 15 minutes. Options: `--fps 60`, `--size 3840x2160`, `--loops N`, `--seconds N` (short test), `--out path.mp4`.

Automatic: `.github/workflows/video.yml` re-renders the video whenever the slides change and publishes it at
<https://github.com/YouvenZ/aud-ai-festival/releases/download/presentation-video/aud-ai-festival-showcase.mp4>
(it can also be started by hand from the Actions tab, with a loop count).
