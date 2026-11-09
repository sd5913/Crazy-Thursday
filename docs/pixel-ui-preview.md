# Pixel UI / 3D ward — local design preview

Open `http://localhost:8000/ui-preview.html` after `npm start`.
The current local review server is running at `http://127.0.0.1:8013/ui-preview.html`.
The original camera game remains at `/index.html`. No camera code or detection thresholds are changed.

## Asset checklist

| Asset | Available now | Remaining art work |
| --- | --- | --- |
| 3D hospital and nurse | `src/assets/bg.jpg` | Clean background without a baked-in cactus/spoon, then separate nurse/arm layers for consistent item switching |
| Spoon | `src/assets/spoon.png` | Align with separated nurse arm; match perspective |
| Food / foreign objects | Eight existing SVG placeholders | Replace with matching 3D-style transparent PNGs, consistent angle, padding and lighting |
| Panels, buttons, meters, alerts | CSS, no image needed | Review colours and border scale |
| Mouth action icons | Temporary text glyphs | Optional original pixel sprites: open / closed / tongue / no face |
| Typography | Bundled Press Start 2P and VT323 TTF fonts, with OFL licences in `src/assets/fonts/` | Optional WOFF2 conversion for smaller downloads |
| Audio | Not included | Optional button, correct answer, alert and rescue sounds with licences |

## Implemented preview

- Main menu; intake/tutorial; feeding; rescue overlay; pause; patient report; handbook and credits dialogs.
- Shared item catalogue, scoring, nausea and difficulty functions from `logic.js`.
- Keyboard demo: hold S accept, hold F refuse, fresh V press during rescue.
- First two bites teach food then foreign object; following items are random.
- Pause freezes timers; focus loss pauses. Escape opens pause. End session previews the report.
- CSS stepped panel entry, pressed buttons, approaching item and warning pulse. Motion toggle and OS reduced-motion support.
- Static 3D artwork, not a real-time 3D scene. Food appears as a temporary separate overlay: the cactus already painted into the background is still visible.
- Optional mirrored camera window in the upper left, with live mouth-open / mouth-closed / smile estimates from the existing face model. Camera activation is explicit; leaving gameplay stops tracks. Permission/model errors retain keyboard play.
- Camera recognition is a display-only, uncalibrated estimate; gameplay remains S/F/V. Tongue detection is not implemented or claimed. The existing camera game's smile/frown/gag implementation is unchanged.
- Food now uses a circular display window, with the earlier transparent congee, pudding and cactus PNGs copied into `assets/ui-food/`; other items still use placeholders. Camera, stats, food, input and dialogue are independent panels. Recovery briefly shakes only the central alert frame; the camera monitor remains stable and keeps its normal title colour. Reduced-motion mode retains a static warning.
- Separate component gallery: `/ui-components.html`, using the same CSS. Its labels and numbers are illustrative, not live recognition.

## Next implementation steps after visual review

1. Confirm spacing, palette, typography and layout in this preview.
2. Supply clean/separated scene assets and final item PNGs.
3. Reuse these UI components in the existing `game.js` flow, rather than keeping two game controllers.
4. Agree and verify open/closed/tongue detection with the integration owner, including tracking loss behaviour.
5. Verify camera permissions, calibration, keyboard controls, rescue and end report on target devices.

GitHub main was re-read through the connector and confirmed at `1d3530a`, matching the local base. No commits or pushes were made.

## Full operation-screen layouts

Open `/ui-flow.html` to review complete screens in order, with a sidebar and a standalone link for each screen. This replaces the component gallery as the main review entry.

| Order | Screen | Standalone URL |
| --- | --- | --- |
| 01 | Main menu | `/ui-preview.html?layout=menu` |
| 02 | Camera setup and instructions | `/ui-preview.html?layout=prepare` |
| 03 | Feeding | `/ui-preview.html?layout=feeding` |
| 04 | Accepted food | `/ui-preview.html?layout=accepted` |
| 05 | Refused foreign object | `/ui-preview.html?layout=rejected` |
| 06 | Wrong bite and recovery | `/ui-preview.html?layout=rescue` |
| 07 | Successful recovery | `/ui-preview.html?layout=recovered` |
| 08 | Pause | `/ui-preview.html?layout=paused` |
| 09 | Session report | `/ui-preview.html?layout=report` |

All layout routes use fixed illustrative data and do not start a game timer or request a camera automatically. The setup layout describes the intended facial controls, explicitly distinguished from the current keyboard implementation. The existing interactive demo remains `/ui-preview.html` without a query string. Feedback and recovery are full-scene state previews; the added next-state buttons are for review navigation.

Shared HTML/CSS are reused for menu, gameplay and report. Review fixtures and navigation are in `ui-layouts.js`; the standalone review shell is `ui-flow.html`, `ui-flow.css`, `ui-flow.js`. Background limitations (baked-in cactus/spoon) remain.

## Validation

- `npm ci`, `npm test` (10/10), and `npm run build` completed.
- Headless Edge: menu/handbook, intake, accept score, wrong-bite recovery, successful rescue, paused timer, report totals, restart navigation and mobile viewport checked; no page JavaScript errors.
- Screenshots reviewed at 1440×900 and 390×844. Camera hardware and target Android devices were not tested in this UI pass.
- Window revision: synthetic camera/video and stubbed detector verified preview, expression readout and video-track shutdown; mobile camera/stats separation and the component gallery checked. These checks do not validate real camera/model accuracy.


Compact UI revision: horizontal camera and readout, horizontal score/time strip, small input badge and translucent nurse subtitle. Browser checks at 1440px, 760px, 390px passed; npm test (10/10) and build passed.

## Team composition revision

`ui-redesign.css` applies the supplied feeding mockup across all nine layout routes and the interactive demo: bright 3D background, enlarged central food circle, item name/time beneath, top-right camera/readout with merged nausea, left settings/sound/pause controls, wide translucent nurse captions. Score/input clutter is hidden during play; report totals remain. Short result cards and a compact recovery alert share the central action region. The camera stays still. Preparation reuses the actual top-right monitor; the separate sample camera card is hidden. Camera input remains display-only; intended tongue controls are not implemented by this layout pass.

Validation: npm ci, 10/10 repository tests and build passed. All nine routes checked at 1440 and 390 widths with no horizontal overflow or page errors; flow navigation and continuous demo passed. Additional checks confirmed top-right monitor placement, merged nausea, hidden score, settings motion toggle and interface sound toggle. No commits or pushes.
