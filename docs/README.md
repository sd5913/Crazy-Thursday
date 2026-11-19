# Project documentation

- [Expression inputs and gameplay](gameplay/expression-input.md) · [Full game rules and results](../GAME-RULES.md)
- Food content: edit [the catalogue](../food-assets/catalogue.json) and PNGs in `food-assets/`; [the build](../scripts/build.mjs) validates and stages runtime assets.
- [Recognition runtime and lifecycle](technical/face-runtime.md) · [Bundled offline resources and licenses](../src/vendor/README.md)
- [Baseline, player calibration and persistence](technical/calibration.md)
- [Current status](../CURRENT.md) · [Tasks and verification gaps](../TODO.md)
- [Team development log](../LOG.md)

These documents describe the current implementation, not every experiment in the weekly log. Numeric defaults are tuning values; source and saved baseline settings determine the actual runtime. Real-camera accuracy is not certified by unit tests.
