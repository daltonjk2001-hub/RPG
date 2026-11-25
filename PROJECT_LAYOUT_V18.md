# V18.1 project layout

- `Solo_Realms_V18_Main.html` is the standalone browser entry point.
- `pwa/` contains the installable PWA entry point, manifest, service worker, and icons. Publish its contents to an HTTPS static host.
- `source/` contains the V17 base runtime, V18 additive systems layer, and assembled V18 runtime.
- `build-inputs/Solo_Realms_V17_Main.html` is the single retained HTML shell required to reproduce the build. Historical V12–V16 backups and archived V16/V17 documentation are not part of this repository package.
- `tools/build_v18.py` rebuilds the standalone HTML, assembled runtime, and PWA from the tracked inputs.
- `tests/` contains nine V18 regression suites, their shared bootstrap, and the runner.
- The root `V18_*.md` files document setup, attribution, design, changes, and test status.
