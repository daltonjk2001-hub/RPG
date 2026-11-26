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
DIRECTOR = ROOT / "source" / "SR23_DUNGEON_MASTER.js"
CUSTOM_AI_DM = ROOT / "source" / "SR24_CUSTOM_AI_DM.js"
RULES_CONTRACT = ROOT / "source" / "SR25_RULES_CONTRACT.js"
CONDITION_ENGINE = ROOT / "source" / "SR29_CONDITION_ENGINE.js"
GRAPPLE_GAMEPLAY = ROOT / "source" / "SR29_GRAPPLE_GAMEPLAY.js"
SAVE_GUARD = ROOT / "source" / "SR22_SAVE_GUARD.js"
LEGACY_LEDGER = ROOT / "source" / "SR22_LEGACY_LEDGER.js"
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
    director = DIRECTOR.read_text(encoding="utf-8").rstrip()
    custom_ai_dm = CUSTOM_AI_DM.read_text(encoding="utf-8").rstrip()
    rules_contract = RULES_CONTRACT.read_text(encoding="utf-8").rstrip()
    condition_engine = CONDITION_ENGINE.read_text(encoding="utf-8").rstrip()
    grapple_gameplay = GRAPPLE_GAMEPLAY.read_text(encoding="utf-8").rstrip()
    save_guard = SAVE_GUARD.read_text(encoding="utf-8").rstrip()
    legacy_ledger = LEGACY_LEDGER.read_text(encoding="utf-8").rstrip()

    if not base.rstrip().endswith("})();"):
        raise SystemExit("Unexpected V17 IIFE wrapper; refusing unsafe concatenation.")

    # Remove only the final wrapper close so the additive systems layer remains
    # inside the same application scope.
    base = base.rstrip()[:-5].rstrip() + "\n\n"

    # V29: retain each condition application independently and expire it through
    # the canonical per-instance engine at the round boundary.
    legacy_expiry = "if(e.conditions?.length)e.conditions=e.conditions.filter(x=>{if(typeof x==='string')return false;if(Number.isFinite(x.duration)){x.duration--;return x.duration>0;}return true;});"
    if base.count(legacy_expiry) != 1:
        raise SystemExit("Expected exactly one legacy round-end condition expiry block; inspect V10 before migrating.")
    base = base.replace(legacy_expiry, "if(e.conditions?.length)sr29Tick(e,{phase:'round',cycle:b.round});")

    # Long rests reduce Exhaustion once, not once in each stacked legacy wrapper;
    # they do not silently erase every condition instance.
    legacy_exhaustion_rest = "c.exhaustion=Math.max(0,c.exhaustion-1);"
    if base.count(legacy_exhaustion_rest) != 3:
        raise SystemExit("Expected one cleanse and two legacy Long Rest Exhaustion decrements; inspect before patching.")
    base = base.replace(legacy_exhaustion_rest, "c.exhaustion=Math.max(0,c.exhaustion-1);", 1)
    base = base.replace(legacy_exhaustion_rest, "/* V29: Exhaustion is reduced once by the final Long Rest adapter. */", 2)
    long_rest_condition = "c.featureUses=c.featureMax;c.conditions=[];c.tempHP=0;c.deathSaves=0;"
    if base.count(long_rest_condition) != 2:
        raise SystemExit("Expected two legacy base Long Rest condition clears.")
    base = base.replace(long_rest_condition, long_rest_condition.replace("c.conditions=[];", ""))
    v7_long_rest_condition = "sr7RecalcSlots(c,true);c.conditions=[];c.concentration=null;"
    if base.count(v7_long_rest_condition) != 1:
        raise SystemExit("Expected one V7 Long Rest condition clear.")
    base = base.replace(v7_long_rest_condition, v7_long_rest_condition.replace("c.conditions=[];", ""))

    # Correct direct initiative enemy attack modifiers for Exhaustion.
    enemy_attack_bonus = "r+(Number(e.attack)||0)"
    if base.count(enemy_attack_bonus) != 2:
        raise SystemExit("Expected two direct enemy attack totals in the initiative combat adapter.")
    base = base.replace(enemy_attack_bonus, "r+(Number(e.attack)||0)-2*(Number(e.exhaustion)||0)")

    # Unconscious implies Prone, but that derived state is not itself the Rogue
    # Sneak Attack trigger. Use actual attack Advantage (or an adjacent ally).
    sneak_prone = "||sr11Has(e,'prone')||c.hidden"
    if base.count(sneak_prone) != 2:
        raise SystemExit("Expected two legacy Rogue Sneak Attack prone shortcuts.")
    base = base.replace(sneak_prone, "||roll.adv||c.hidden")

    # The V13.7 Rogue regression now includes Sneak Attack because an Unconscious
    # target grants Advantage; keep its expected damage aligned with the 2024 rule.
    old_unconscious_rogue_assertion = "damageBefore===20&&sleeping.hp===12"
    if base.count(old_unconscious_rogue_assertion) != 1:
        raise SystemExit("Expected one legacy Unconscious Rogue attack assertion.")
    base = base.replace(old_unconscious_rogue_assertion, "damageBefore===20&&sleeping.hp===2&&state.log.some(x=>/critical hit/.test(x.msg))&&state.log.some(x=>/Sneak Attack adds critical extra damage/.test(x.msg))")

    # V10 initiative must skip Petrified actors as well as other incapacitating conditions.
    enemy_skip = "['stunned','paralyzed','unconscious','incapacitated']"
    if base.count(enemy_skip) != 1:
        raise SystemExit("Expected one legacy initiative incapacitation list.")
    base = base.replace(enemy_skip, "['stunned','paralyzed','petrified','unconscious','incapacitated']")

    # V7 extra critical die is additional only when the melee attacker is within 5 ft;
    # natural 20 already adds its extra die in the adjacent branch.
    old_critical = "if(sr7HasCondition(c,'paralyzed')||sr7HasCondition(c,'unconscious'))damage+=rollDice(e.damage||'1d6');"
    if base.count(old_critical) != 1:
        raise SystemExit("Expected one V7 condition-based critical-damage expression.")
    base = base.replace(old_critical, "if(d20!==20&&(Number(e.distance)||5)<=5&&sr29CriticalOnHit(c,{hit:true,distance:Number(e.distance)||5}))damage+=rollDice(e.damage||'1d6');")

    # V11 grid attack criticals also include the 2024 paralyzed/unconscious close-melee rule.
    old_grid_critical = "if(roll.r===20||(automaticCritical&&hit))dmg+=rollDice(w.damage);"
    if base.count(old_grid_critical) != 1:
        raise SystemExit("Expected one V11 grid-attack critical-damage expression.")
    base = base.replace(old_grid_critical, "if(roll.r===20||(automaticCritical&&hit)||sr29CriticalOnHit(e,{hit,distance:dist}))dmg+=rollDice(w.damage);")

    # The player-facing grid Attack action also uses an earlier automatic-critical
    # shortcut. Route it through the 2024 condition helper so Paralyzed as well as
    # Unconscious targets are covered, including ranged attack rolls from within 5 ft.
    old_player_automatic_critical = "automaticCritical=!ranged&&dist<=5&&sr11Has(e,'unconscious')"
    if base.count(old_player_automatic_critical) != 1:
        raise SystemExit("Expected one player grid automatic-critical expression.")
    base = base.replace(
        old_player_automatic_critical,
        "automaticCritical=sr29CriticalOnHit(e,{hit:true,distance:dist})",
    )

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

    # Route the retained V17/V11/V12 attack-vs-AC call sites through the V25
    # typed attack resolver. The legacy roll function still owns condition,
    # advantage/disadvantage and feature bonuses; this adapter owns the final
    # hit/critical/miss rule against the already computed AC.
    attack_checks = [
        ("roll.r===20||(roll.r!==1&&roll.total>=ac)", "sr25AttackSuccess(roll,ac)", 4),
        ("roll.r===20||(roll.r!==1&&roll.total>=e.ac)", "sr25AttackSuccess(roll,e.ac)", 2),
        ("r.r===20||(r.r!==1&&r.total>=ac)", "sr25AttackSuccess(r,ac)", 3),
        ("r.r===20||(r.r!==1&&r.total>=e.ac)", "sr25AttackSuccess(r,e.ac)", 3),
        ("r.r!==1&&(r.r===20||r.total>=e.ac)", "sr25AttackSuccess(r,e.ac)", 1),
    ]
    for old_check, new_check, expected_count in attack_checks:
        actual_count = base.count(old_check)
        if actual_count != expected_count:
            raise SystemExit(
                f"Expected {expected_count} legacy attack checks for {old_check!r}, "
                f"found {actual_count}; inspect V17 call sites before rebuilding."
            )
        base = base.replace(old_check, new_check)

    # Migrate direct-die companion and class-feature attack totals which do not
    # use sr11RollAttack. These expressions include the selected d20 plus the
    # exact modifier already calculated by their caller.
    direct_attack_checks = [
        ("let r=die(20)+p.attack;if(r>=enemy.ac)",
         "let r=die(20)+p.attack;if(sr25AttackTotalSuccess(r,p.attack,enemy.ac))", 2),
        ("let r=die(20)+p.attack+(c.nextAttackBonus||0);if(r>=enemy.ac)",
         "let r=die(20)+p.attack+(c.nextAttackBonus||0);if(sr25AttackTotalSuccess(r,p.attack+(c.nextAttackBonus||0),enemy.ac))", 1),
        ("const r=die(20)+p.attack;if(r>=e.ac)",
         "const r=die(20)+p.attack;if(sr25AttackTotalSuccess(r,p.attack,e.ac))", 2),
        ("const r=die(20)+ally.attack;if(r>=target.ac)",
         "const r=die(20)+ally.attack;if(sr25AttackTotalSuccess(r,ally.attack,target.ac))", 1),
        ("const r=die(20)+(p.attack||0);if(r>=target.ac)",
         "const r=die(20)+(p.attack||0);if(sr25AttackTotalSuccess(r,(p.attack||0),target.ac))", 1),
        ("const r=die(20)+p.attack;if(r>=enemy.ac)",
         "const r=die(20)+p.attack;if(sr25AttackTotalSuccess(r,p.attack,enemy.ac))", 1),
        ("const r=die(20)+mod(c.stats.DEX)+profBonus();if(r>=e.ac)",
         "const r=die(20)+mod(c.stats.DEX)+profBonus();if(sr25AttackTotalSuccess(r,mod(c.stats.DEX)+profBonus(),e.ac))", 1),
        ("const r=die(20)+(Number(p.attack)||0);if(r>=e.ac)",
         "const r=die(20)+(Number(p.attack)||0);if(sr25AttackTotalSuccess(r,(Number(p.attack)||0),e.ac))", 1),
    ]
    for old_check, new_check, expected_count in direct_attack_checks:
        actual_count = base.count(old_check)
        if actual_count != expected_count:
            raise SystemExit(
                f"Expected {expected_count} direct-die attack checks for {old_check!r}, "
                f"found {actual_count}; inspect V17 companion/feature paths before rebuilding."
            )
        base = base.replace(old_check, new_check)

    # Route ordinary target saving throws through the V25 typed save resolver.
    # Death saves remain dedicated procedures because their natural 1/20 rules
    # are different from ordinary saving throws.
    saving_throw_checks = [
        ("const save=die(20)+sr12SaveBonus(e,ability),success=save>=dc;",
         "const d20=die(20),saveBonus=sr12SaveBonus(e,ability),save=d20+saveBonus,saveResult=sr25ResolveCreatureSavingThrow(e,ability,[d20],saveBonus,dc,{useLegendaryResistance:true}),success=saveResult.success;", 1),
        ("const save=die(20)+sr12SaveBonus(e,sp.save||'WIS');if(save>=sr12SpellDC(c)){",
         "const saveAbility=sp.save||'WIS',saveRoll=die(20),saveBonus=sr12SaveBonus(e,saveAbility),save=saveRoll+saveBonus,saveResult=sr25ResolveCreatureSavingThrow(e,saveAbility,[saveRoll],saveBonus,sr12SpellDC(c),{useLegendaryResistance:true});if(saveResult.success){", 1),
        ("const saveTarget=(e,ability)=>{const b=sr12SaveBonus(e,ability),r=die(20)+b,success=r>=dc;return {success,total:r,dc,ability};};",
         "const saveTarget=(e,ability)=>{const d20=die(20),b=sr12SaveBonus(e,ability),r=d20+b,result=sr25ResolveCreatureSavingThrow(e,ability,[d20],b,dc,{useLegendaryResistance:true});return {success:result.success,total:r,dc,ability,roll:d20,autoFail:result.autoFail};};", 1),
        ("const saveTarget=(e,ab)=>{const bonus=sr12SaveBonus(e,ab),r=die(20)+bonus;return {success:r>=dc,total:r,dc,ability:ab};};",
         "const saveTarget=(e,ab)=>{const d20=die(20),bonus=sr12SaveBonus(e,ab),r=d20+bonus,result=sr25ResolveCreatureSavingThrow(e,ab,[d20],bonus,dc,{useLegendaryResistance:true});return {success:result.success,total:r,dc,ability:ab,roll:d20,autoFail:result.autoFail};};", 1),
        ("const save=chosen+sr12SaveBonus(enemy,ability)+cover;saved=save>=dc;",
         "const saveBonus=sr12SaveBonus(enemy,ability)+cover,save=chosen+saveBonus,saveResult=sr25ResolveCreatureSavingThrow(enemy,ability,ability==='DEX'&&enemy.dodging?[d1,d2]:[d1],saveBonus,dc,{advantage:ability==='DEX'&&!!enemy.dodging,useLegendaryResistance:true});saved=saveResult.success;", 1),
        ("const dc=8+sr14Prof(c.level)+sr14AbilityMod(c.stats.WIS),save=die(20)+sr14AbilityMod(e.stats?.WIS||10);if(save<dc){",
         "const dc=8+sr14Prof(c.level)+sr14AbilityMod(c.stats.WIS),saveRoll=die(20),saveBonus=sr14AbilityMod(e.stats?.WIS||10),save=saveRoll+saveBonus,saveResult=sr25ResolveCreatureSavingThrow(e,'WIS',[saveRoll],saveBonus,dc,{useLegendaryResistance:true});if(!saveResult.success){", 1),
    ]
    for old_check, new_check, expected_count in saving_throw_checks:
        actual_count = base.count(old_check)
        if actual_count != expected_count:
            raise SystemExit(
                f"Expected {expected_count} legacy saving-throw paths for {old_check!r}, "
                f"found {actual_count}; inspect before routing to V25."
            )
        base = base.replace(old_check, new_check)

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

    combined = base + save_guard + "\n\n" + legacy_ledger + "\n\n" + layer + "\n\n" + studio + "\n\n" + behavior + "\n\n" + gameplay + "\n\n" + screen_layout + "\n\n" + playtest_hardening + "\n\n" + director + "\n\n" + custom_ai_dm + "\n\n" + rules_contract + "\n\n" + condition_engine + "\n\n" + grapple_gameplay + "\n})();\n"
    required_contracts = {
        "six four-hour watches per calendar day": "const SR18_WATCHES_PER_DAY=6;",
        "V21 four-hour watch integration": "const SR21_WORLD_CLOCK_CONTRACT='four-hour-watches-v1';",
        "namespaced save validation module": "const SR22SaveGuard = (() => {",
        "namespaced legacy reward ledger": "const SR22LegacyLedger = (() => {",
        "V23 Director-first gameplay module": "const SR23_VERSION = '23.0.0';",
        "V24 custom AI Dungeon Master module": "const SR24_VERSION = '24.0.0';",
        "V25 campaign rules and d20 contract": "const SR25_VERSION = '25.0.0';",
        "V29 canonical condition engine": "const SR29_VERSION = '29.0.0';",
        "V29.1 live grapple gameplay adapter": "const SR29_GRAPPLE_GAMEPLAY_VERSION='29.1.0';",
    }
    missing = [label for label, marker in required_contracts.items() if marker not in combined]
    if missing:
        raise SystemExit("Refusing to build an incomplete runtime; missing: " + ", ".join(missing))
    return combined


def main() -> None:
    for path in (SRC, SAVE_GUARD, LEGACY_LEDGER, LAYER, STUDIO, BEHAVIOR, GAMEPLAY, SCREEN_LAYOUT, PLAYTEST_HARDENING, DIRECTOR, CUSTOM_AI_DM, RULES_CONTRACT, CONDITION_ENGINE, GRAPPLE_GAMEPLAY, THEME_CSS, BASE_HTML, MANIFEST, SERVICE_WORKER):
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
        cache_digest.update(bytes([0]))
        cache_digest.update(asset.read_bytes())
        cache_digest.update(bytes([0]))
    cache_name = f"solo-realms-systems-v29-{cache_digest.hexdigest()[:16]}"

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
    print("Assembled V18 rules, V19 Director/world, V20 gameplay/layout, V21 hardening, V23 Director-first gameplay, and V24 The Chronicler custom AI Director, V25 campaign ruleset contract, and V29 canonical condition engine and V29.1 live grapple gameplay adapters.")


if __name__ == "__main__":
    main()
