#!/usr/bin/env python3
"""Rebuild the Solo Realms V18 standalone and PWA files from packaged sources.

The canonical V17 HTML shell is intentionally kept in build-inputs/ as the immutable
base template. The game runtime is assembled from source/ and injected into
that shell, so rebuilding never depends on a previously generated V18 file.
"""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "source" / "solo_realms_v17.js"
LAYER = ROOT / "source" / "SR18_SYSTEMS_LAYER.js"
STUDIO = ROOT / "source" / "SR19_DIRECTOR_STUDIO.js"
BEHAVIOR = ROOT / "source" / "SR19_REACTIVE_WORLD.js"
GAMEPLAY = ROOT / "source" / "SR20_GAMEPLAY_ENGINE.js"
SCREEN_LAYOUT = ROOT / "source" / "SR20_SCREEN_LAYOUT.js"
PLAYTEST_HARDENING = ROOT / "source" / "SR21_PLAYTEST_HARDENING.js"
THEME_CSS = ROOT / "source" / "SR20_UI_THEME.css"
BASE_HTML = ROOT / "build-inputs" / "Solo_Realms_V17_Main.html"
MAIN_HTML = ROOT / "Solo_Realms_V18_Main.html"
PWA_DIR = ROOT / "pwa"
PWA_HTML = PWA_DIR / "index.html"
DOCS_DIR = ROOT / "docs"
MANIFEST = ROOT / "pwa" / "manifest.webmanifest"
SERVICE_WORKER = ROOT / "pwa" / "sw.js"

SCRIPT_PATTERN = re.compile(r"<script\b[^>]*>[\s\S]*?</script>", re.IGNORECASE)


def require_file(path: Path) -> None:
    if not path.is_file():
        raise SystemExit(f"Required build input is missing: {path.relative_to(ROOT)}")


def inject_single_app_script(template: str, combined: str, label: str) -> str:
    matches = list(SCRIPT_PATTERN.finditer(template))
    if len(matches) != 1:
        raise SystemExit(
            f"Expected exactly one script in the {label} HTML template; found {len(matches)}."
        )
    return SCRIPT_PATTERN.sub(lambda _match: "<script>\n" + combined + "\n</script>", template, count=1)


def inject_ui_theme(template: str, css: str) -> str:
    if 'id="sr20-ui-theme"' in template:
        raise SystemExit("UI theme is already present in the HTML template.")
    if "</head>" not in template.lower():
        raise SystemExit("Could not inject UI theme: closing </head> not found.")
    style = '\n<style id="sr20-ui-theme">\n' + css.rstrip() + "\n</style>\n"
    match = re.search(r"</head>", template, re.IGNORECASE)
    return template[:match.start()] + style + template[match.start():]


def build_runtime() -> str:
    base = SRC.read_text(encoding="utf-8")
    layer = LAYER.read_text(encoding="utf-8").rstrip()
    studio = STUDIO.read_text(encoding="utf-8").rstrip()
    behavior = BEHAVIOR.read_text(encoding="utf-8").rstrip()
    gameplay = GAMEPLAY.read_text(encoding="utf-8").rstrip()
    screen_layout = SCREEN_LAYOUT.read_text(encoding="utf-8").rstrip()
    playtest_hardening = PLAYTEST_HARDENING.read_text(encoding="utf-8").rstrip()

    if not base.rstrip().endswith("})();"):
        raise SystemExit("Unexpected V17 IIFE wrapper; refusing unsafe concatenation.")

    # Remove only the final wrapper close so the additive systems layer remains
    # inside the same application scope.
    base = base.rstrip()[:-5].rstrip() + "\n\n"

    # Route both solo spell-damage call sites through the typed-damage helper.
    old_damage = "(e.hp=Math.max(0,e.hp-amount),amount)"
    damage_count = base.count(old_damage)
    if damage_count != 2:
        raise SystemExit(
            f"Expected exactly two V17 spell-damage bypasses, found {damage_count}; inspect before patching."
        )
    base = base.replace(
        old_damage,
        "sr12ApplyDamage(e,amount,effect.type||sp.damageType||'force')",
    )

    # Advance the multiplayer handshake while leaving the independent V15
    # resource protocol's own version marker intact.
    replacements = [
        ("const SR12_VERSION = '16.0.0';", "const SR12_VERSION = '18.0.0';"),
        ("protocol:19", "protocol:20"),
        ("protocol===19", "protocol===20"),
        ("protocol!==19", "protocol!==20"),
        ("'sr19'+code.toLowerCase()", "'sr20'+code.toLowerCase()"),
    ]
    for old, new in replacements:
        if old not in base:
            raise SystemExit(f"Expected V17 build marker not found: {old}")
        base = base.replace(old, new)

    base = base.replace("version:'16.0.0'", "version:'18.0.0'")
    base = base.replace("x.version==='16.0.0'", "x.version==='18.0.0'")
    base = base.replace("Solo Realms V17", "Solo Realms V18")
    base = base.replace("SOLO REALMS V17", "SOLO REALMS V18")
    base = base.replace("reliable-v17", "systems-v18")
    base = base.replace("Solo Realms V17 character and client.", "Solo Realms V18 character and client.")

    return base + layer + "\n\n" + studio + "\n\n" + behavior + "\n\n" + gameplay + "\n\n" + screen_layout + "\n\n" + playtest_hardening + "\n\n})();\n"


def main() -> None:
    for path in (SRC, LAYER, STUDIO, BEHAVIOR, GAMEPLAY, SCREEN_LAYOUT, PLAYTEST_HARDENING, THEME_CSS, BASE_HTML, MANIFEST, SERVICE_WORKER):
        require_file(path)

    combined = build_runtime()
    (ROOT / "source" / "solo_realms_v18.js").write_text(combined, encoding="utf-8")

    # Build the standalone release from the retained V17 HTML shell, not from
    # a generated V18 artifact.
    base_template = BASE_HTML.read_text(encoding="utf-8")
    main_template = inject_single_app_script(base_template, combined, "standalone")
    main_template = inject_ui_theme(main_template, THEME_CSS.read_text(encoding="utf-8"))
    main_template = main_template.replace(
        "Solo Realms V17 — Reliable Free Edition",
        "Solo Realms V18 — Complete Rules & Living Campaign",
    )
    main_template = main_template.replace("Solo Realms V17", "Solo Realms V18")
    main_template = main_template.replace("reliable-v17", "systems-v18")
    main_template = main_template.replace(
        "SRD 5.2.1 · RELIABLE LIBRARY",
        "SRD 5.2.1 · COMPLETE RULES SYSTEMS",
    )
    MAIN_HTML.write_text(main_template, encoding="utf-8")

    # Derive the PWA from the same standalone output, then add only its web-app
    # metadata and service-worker registration. This guarantees identical game
    # runtime bytes in both entry points.
    pwa_template = main_template.replace(
        "</head>",
        "\n<meta name=\"mobile-web-app-capable\" content=\"yes\">\n"
        "<meta name=\"apple-mobile-web-app-capable\" content=\"yes\">\n"
        "<meta name=\"apple-mobile-web-app-status-bar-style\" content=\"black-translucent\">\n"
        "<link rel=\"manifest\" href=\"./manifest.webmanifest\">\n"
        "<link rel=\"icon\" type=\"image/png\" sizes=\"192x192\" href=\"./icons/icon-192.png\">\n"
        "</head>",
        1,
    )
    if pwa_template == main_template:
        raise SystemExit("Could not insert PWA metadata: closing </head> not found.")
    registration = (
        "<script>\n"
        "if ('serviceWorker' in navigator && (location.protocol === 'https:' || "
        "location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {\n"
        "  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js')"
        ".catch(err => console.warn('Offline cache unavailable:', err)));\n"
        "}\n"
        "</script>\n"
    )
    if "</body>" not in pwa_template:
        raise SystemExit("Could not insert service-worker registration: closing </body> not found.")
    pwa_template = pwa_template.replace("</body>", registration + "</body>", 1)
    PWA_HTML.write_text(pwa_template, encoding="utf-8")

    manifest_data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    manifest_data["name"] = "Solo Realms — Complete Rules & Living Campaign · V18"
    manifest_data["short_name"] = "Solo Realms V18"
    manifest_data["description"] = (
        "Free offline-first tabletop RPG with expanded 2024 SRD spell resolution, "
        "stat-block monster tactics, flexible action adjudication, a persistent living "
        "campaign, a seven-system player-facing gameplay loop, eight manual save slots and automatic recovery."
    )
    MANIFEST.write_text(
        json.dumps(manifest_data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    # Version the offline cache from the exact app shell and all precached assets.
    # A changed build therefore changes sw.js, activates a fresh cache, and removes
    # the old Solo Realms cache instead of leaving installed clients on stale HTML.
    core_assets = (
        PWA_HTML,
        MANIFEST,
        PWA_DIR / "icons" / "icon-192.png",
        PWA_DIR / "icons" / "icon-512.png",
    )
    cache_digest = hashlib.sha256()
    for asset in core_assets:
        require_file(asset)
        cache_digest.update(asset.relative_to(PWA_DIR).as_posix().encode("utf-8"))
        cache_digest.update(b"\\0")
        cache_digest.update(asset.read_bytes())
        cache_digest.update(b"\\0")
    cache_name = f"solo-realms-systems-v18-{cache_digest.hexdigest()[:16]}"

    sw_text = SERVICE_WORKER.read_text(encoding="utf-8")
    cache_pattern = re.compile(r"(?m)^const CACHE_NAME = .+;$")
    cache_matches = list(cache_pattern.finditer(sw_text))
    if len(cache_matches) != 1:
        raise SystemExit(
            f"Expected exactly one service-worker CACHE_NAME declaration; found {len(cache_matches)}."
        )
    sw_text = cache_pattern.sub(f"const CACHE_NAME = '{cache_name}';", sw_text, count=1)
    SERVICE_WORKER.write_text(sw_text, encoding="utf-8")

    print(f"Built {MAIN_HTML.relative_to(ROOT)} ({MAIN_HTML.stat().st_size:,} bytes)")
    print(f"Built source/solo_realms_v18.js ({len(combined.encode('utf-8')):,} bytes)")
    # GitHub Pages publishes /docs. Keep it as a generated mirror of the
    # canonical PWA directory so the live site cannot silently lag behind a
    # successful build. docs/ is reserved for deployable PWA assets.
    if DOCS_DIR.exists():
        shutil.rmtree(DOCS_DIR)
    shutil.copytree(PWA_DIR, DOCS_DIR)

    print(f"Built {PWA_HTML.relative_to(ROOT)} ({PWA_HTML.stat().st_size:,} bytes)")
    print(f"Synchronized {DOCS_DIR.relative_to(ROOT)}/ from {PWA_DIR.relative_to(ROOT)}/")
    print("Assembled V18 rules, V19 Director, V20 gameplay/layout, and V21 player-stage hardening.")


if __name__ == "__main__":
    main()
