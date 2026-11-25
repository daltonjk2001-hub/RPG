# V28 — Special Saving-Throw Rules

## Scope

V28 extends the V25/V27 typed save pipeline with two 2024 rules requirements:

- A creature can choose to fail a saving throw without rolling.
- A creature with Legendary Resistance can choose to succeed after failing a saving throw, subject to its limited uses.

Primary rules references:
- [2024 Basic Rules — Playing the Game, Saving Throws](https://www.dndbeyond.com/sources/dnd/br-2024/playing-the-game)
- [2024 Basic Rules — How to Use a Monster, Limited Usage](https://www.dndbeyond.com/sources/dnd/br-2024/how-to-use-a-monster)
- [SRD 5.2.1, CC-BY 4.0](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf)

## Voluntary failure

The typed d20 resolver accepts \`chooseToFail: true\` only for saving throws. It returns a failed save with no die, dice, or total, matching the no-roll rule. It does not convert attack rolls or ability checks into voluntary failures.

A creature can also be given a one-shot choice through \`sr25SetNextSavingThrowChoice(creature, 'fail')\`. The next save adapter consumes that choice. This supports direct typed-save requests and the existing legacy character-save adapter. The V28 API exposes the setter for later player-facing controls. The in-game UI does not yet present a dedicated “choose to fail” prompt or button; that remains an explicit coverage gap rather than an implied completion.

## Legendary Resistance

The typed creature-save resolver tracks Legendary Resistance when the calling path explicitly enables it. Six migrated monster-save call sites now pass \`useLegendaryResistance: true\`; player-side saves do not spend the resource by default.

Trait discovery checks structured and text stat-block locations, including \`special_abilities\`, \`specialAbilities\`, \`traits\`, and equivalent nested \`statBlock\` / \`statblock\` fields. It supports explicit resource objects and text such as \`Legendary Resistance (3/Day, or 4/Day in Lair)\`.

The creature receives a persisted \`_sr25LegendaryResistance\` state containing maximum, remaining, and used uses. A failed save spends exactly one use and changes the outcome to success. Successful saves, voluntary failures, disabled policy, and exhausted resources do not spend a use. The status helper reports the current counter. The reset helper restores the full allotment when a creature completes a Long Rest.

The reset operation is exposed as a deterministic service. Solo Realms does not yet have a complete persistent lifecycle for monsters taking Long Rests between encounters; callers that model such a rest must invoke the reset helper. The current game AI uses the resistance automatically for failed saves at the explicitly enabled monster call sites; nuanced Director tactics for deciding which failures justify spending a scarce use remain future work.

## Regression evidence

\`tests/solo_realms_v28_special_saving_throw_test.cjs\` covers no-roll voluntary failure, rejection on non-save mechanics, queued one-shot choices, trait and structured-resource discovery, normal and lair use limits, exact resource consumption, no spending on success or voluntary failure, disabled and exhausted states, resource persistence, Long Rest reset, and continued use of the V27 creature-save integration points.

Run the complete regression suite with \`bash tests/run_v18.sh\`.

## Remaining acceptance criteria

V28 does not claim complete saving-throw parity. The player-facing voluntary-failure control, creature Long Rest lifecycle integration, tactical Legendary Resistance selection, and remaining saving-throw call-site/feature audit are still open.
