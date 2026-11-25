#!/usr/bin/env python3
"""Rebuild the Solo Realms V18 standalone and PWA files from packaged sources."""
from __future__ import annotations
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
PLAYTEST_HARDENING = ROOT / "source" / "SR21_PLAYTEST_HARDENING.js"
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
        raise SystemExit(f"Expected exactly one script in the {label} HTML template; found {len(matches)}.")
    return SCRIPT_PATTERN.sub(lambda _match: "<script>\n" + combined + "\n</script>", template, count=1)


def build_runtime() -> str:
    base = SRC.read_text(encoding="utf-8")
    layer = LAYER.read_text(encoding="utf-8").rstrip()
    studio = STUDIO.read_text(encoding="utf-8").rstrip()
    behavior = BEHAVIOR.read_text(encoding="utf-8").rstrip()
    gameplay = GAMEPLAY.read_text(encoding="utf-8").rstrip()
    playtest_hardening = PLAYTEST_HARDENING.read_text(encoding="utf-8").rstrip()
    if not base.rstrip().endswith("})();"):
        raise SystemExit("Unexpected V17 IIFE wrapper; refusing unsafe concatenation.")
    base = base.rstrip()[:-5].rstrip() + "\n\n"

    old_damage = "(e.hp=Math.max(0,e.hp-amount),amount)"
    damage_count = base.count(old_damage)
    if damage_count != 2:
        raise SystemExit(f"Expected exactly two V17 spell-damage bypasses, found {damage_count}; inspect before patching.")
    base = base.replace(old_damage, "sr12ApplyDamage(e,amount,effect.type||sp.damageType||'force')")

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
    return base + layer + "\n\n" + studio + "\n\n" + behavior + "\n\n" + gameplay + "\n\n" + playtest_hardening + "\n\n})();\n"


def main() -> None:
    for path in (SRC, LAYER, STUDIO, BEHAVIOR, GAMEPLAY, PLAYTEST_HARDENING, BASE_HTML, MANIFEST, SERVICE_WORKER):
        require_file(path)
    combined = build_runtime()
    (ROOT / "source" / "solo_realms_v18.js").write_text(combined, encoding="utf-8")

    base_template = BASE_HTML.read_text(encoding="utf-8")
    main_template = inject_single_app_script(base_template, combined, "standalone")
    main_template = main_template.replace("Solo Realms V17 — Reliable Free Edition", "Solo Realms V18 — Complete Rules & Living Campaign")
    main_template = main_template.replace("Solo Realms V17", "Solo Realms V18")
    main_template = main_template.replace("reliable-v17", "systems-v18")
    main_template = main_template.replace("SRD 5.2.1 · RELIABLE LIBRARY", "SRD 5.2.1 · COMPLETE RULES SYSTEMS")
    MAIN_HTML.write_text(main_template, encoding="utf-8")

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
    PWA_HTML.write_text(pwa_template.replace("</body>", registration + "</body>", 1), encoding="utf-8")

    manifest_data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    manifest_data["name"] = "Solo Realms — Complete Rules & Living Campaign · V18"
    manifest_data["short_name"] = "Solo Realms V18"
    manifest_data["description"] = (
        "Free offline-first tabletop RPG with expanded 2024 SRD spell resolution, "
        "stat-block monster tactics, player-stage onboarding, skill and challenge controls, "
        "a persistent campaign, legacy chronicle, eight manual save slots and automatic recovery."
    )
    MANIFEST.write_text(json.dumps(manifest_data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    sw_text = SERVICE_WORKER.read_text(encoding="utf-8").replace("solo-realms-reliable-v17", "solo-realms-systems-v18")
    SERVICE_WORKER.write_text(sw_text, encoding="utf-8")

    print(f"Built {MAIN_HTML.relative_to(ROOT)} ({MAIN_HTML.stat().st_size:,} bytes)")
    print(f"Built source/solo_realms_v18.js ({len(combined.encode('utf-8')):,} bytes)")
    if DOCS_DIR.exists():
        shutil.rmtree(DOCS_DIR)
    shutil.copytree(PWA_DIR, DOCS_DIR)
    print(f"Built {PWA_HTML.relative_to(ROOT)} ({PWA_HTML.stat().st_size:,} bytes)")
    print(f"Synchronized {DOCS_DIR.relative_to(ROOT)}/ from {PWA_DIR.relative_to(ROOT)}/")
    print("Assembled V18 rules, V19 Director, V20 gameplay, and V21 player-stage hardening.")


if __name__ == "__main__":
    main()
