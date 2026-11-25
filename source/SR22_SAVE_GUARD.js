/* SOLO REALMS V22 — bounded, compatibility-aware save validation.
 * Pure module: accepts a save plus its rules schema and returns a normalized copy.
 * It does not touch live game state or mutate the supplied object.
 */
const SR22SaveGuard = (() => {
  const LIMITS = Object.freeze({
    maxDepth: 40,
    maxNodes: 400000,
    maxArrayLength: 25000,
    maxProperties: 20000,
    maxKeyLength: 512,
    maxStringLength: 500000,
    maxTotalStringLength: 14000000,
    maxNumberMagnitude: Number.MAX_SAFE_INTEGER
  });
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

  function fail(reason) {
    return { ok: false, reason };
  }

  function inspectTree(root) {
    if (!isRecord(root)) return 'Save root is not a valid object.';
    const stack = [{ value: root, depth: 0, exit: false }];
    const active = new WeakSet();
    const visited = new WeakSet();
    let nodes = 0;
    let totalStringLength = 0;

    while (stack.length) {
      const entry = stack.pop();
      const value = entry.value;
      if (entry.exit) {
        active.delete(value);
        continue;
      }
      if (value === null || typeof value === 'boolean') continue;
      if (typeof value === 'string') {
        if (value.length > LIMITS.maxStringLength) return 'Save contains an oversized text field.';
        totalStringLength += value.length;
        if (totalStringLength > LIMITS.maxTotalStringLength) return 'Save contains too much text data.';
        continue;
      }
      if (typeof value === 'number') {
        if (!Number.isFinite(value) || Math.abs(value) > LIMITS.maxNumberMagnitude) {
          return 'Save contains an invalid numeric value.';
        }
        continue;
      }
      if (typeof value !== 'object') return 'Save contains a non-JSON data value.';
      if (entry.depth > LIMITS.maxDepth) return 'Save data is nested too deeply.';
      if (active.has(value)) return 'Save contains a circular data reference.';
      if (visited.has(value)) continue;
      visited.add(value);
      active.add(value);
      nodes++;
      if (nodes > LIMITS.maxNodes) return 'Save contains too many data records.';

      stack.push({ value, depth: entry.depth, exit: true });
      if (Array.isArray(value)) {
        if (value.length > LIMITS.maxArrayLength) return 'Save contains an oversized list.';
        for (let i = value.length - 1; i >= 0; i--) {
          stack.push({ value: value[i], depth: entry.depth + 1, exit: false });
        }
      } else {
        const keys = Object.keys(value);
        if (keys.length > LIMITS.maxProperties) return 'Save contains an oversized data record.';
        for (let i = keys.length - 1; i >= 0; i--) {
          const key = keys[i];
          if (key.length > LIMITS.maxKeyLength) return 'Save contains an oversized data-field name.';
          if (key === '__proto__' || key === 'prototype' || key === 'constructor') {
            return 'Save contains a reserved data-field name.';
          }
          totalStringLength += key.length;
          if (totalStringLength > LIMITS.maxTotalStringLength) return 'Save contains too much text data.';
          stack.push({ value: value[key], depth: entry.depth + 1, exit: false });
        }
      }
    }
    return null;
  }

  function checkArray(value, limit, label) {
    return Array.isArray(value) && value.length > limit
      ? label + ' contains too many entries (maximum ' + limit + ').'
      : null;
  }

  function validate(value, schema = {}) {
    let source = value?.schema === 'solo-realms-v18-save-v1' ? value.state : value;
    if (source && !source.character && source.state?.character && source.state?.campaign) {
      source = source.state;
    }
    const treeError = inspectTree(source);
    if (treeError) return fail(treeError);

    let state;
    try {
      state = JSON.parse(JSON.stringify(source));
    } catch (error) {
      return fail('Save could not be safely copied: ' + String(error?.message || error));
    }
    const character = state.character;
    const campaign = state.campaign;
    if (!isRecord(character) || !isRecord(campaign)) {
      return fail('Save is missing a character or campaign.');
    }
    if (!Array.isArray(campaign.companions)) campaign.companions = [];
    if (!Array.isArray(campaign.npcs)) campaign.npcs = [];
    if (!Array.isArray(campaign.sideQuests)) campaign.sideQuests = [];
    if (!isRecord(character.stats)) return fail('Save has incomplete ability scores.');

    const abilities = Array.isArray(schema.abilities) ? schema.abilities : [];
    for (const ability of abilities) {
      const score = Number(character.stats[ability]);
      if (!Number.isFinite(score) || score < 1 || score > 30) {
        return fail('Save has an invalid ' + ability + ' ability score (expected 1–30).');
      }
      character.stats[ability] = score;
    }

    if (!Array.isArray(character.inventory) || !Array.isArray(character.proficiencies)) {
      return fail('Save inventory or proficiencies are invalid.');
    }
    if (state.log !== undefined && state.log !== null && !Array.isArray(state.log)) {
      return fail('Save chronicle log is invalid.');
    }
    const classes = isRecord(schema.classes) ? schema.classes : {};
    const ancestries = isRecord(schema.ancestries) ? schema.ancestries : {};
    if (typeof character.classId !== 'string' || !own(classes, character.classId) ||
        typeof character.ancestry !== 'string' || !own(ancestries, character.ancestry)) {
      return fail('Save uses an unknown character class or ancestry.');
    }
    const level = Number(character.level);
    if (!Number.isInteger(level) || level < 1 || level > 20) {
      return fail('Character level is outside the supported range (1–20).');
    }
    character.level = level;

    const campaignArrays = [
      [character.inventory, 2000, 'Inventory'],
      [character.proficiencies, 300, 'Proficiencies'],
      [state.log, 5000, 'Chronicle log'],
      [campaign.companions, 200, 'Companions'],
      [campaign.npcs, 2000, 'NPC roster'],
      [campaign.sideQuests, 1000, 'Side quests'],
      [campaign.sr18?.factions, 200, 'World factions'],
      [campaign.sr18?.clocks, 200, 'World clocks'],
      [campaign.sr18?.events, 1000, 'World events'],
      [campaign.sr18?.rumors, 500, 'World rumors'],
      [campaign.sr18?.actionLedger, 2000, 'World action history'],
      [campaign.sr18?.deadlines, 500, 'World deadlines'],
      [campaign.sr20?.objectives, 200, 'Campaign objectives'],
      [campaign.sr20?.leads, 200, 'Campaign leads'],
      [campaign.sr20?.consequences, 200, 'Campaign consequences'],
      [campaign.sr20?.records, 1000, 'Recent action records'],
      [campaign.sr20?.archive, 5000, 'Archived action records'],
      [campaign.sr23?.events, 240, 'Director continuity events'],
      [character.sr21Legacy?.milestones, 500, 'Legacy milestone history'],
      [character.sr21Legacy?.archivedCampaigns, 50, 'Legacy campaign archive']
    ];
    for (const [array, limit, label] of campaignArrays) {
      if (array === undefined || array === null) continue;
      if (!Array.isArray(array)) return fail(label + ' is not a valid list.');
      const arrayError = checkArray(array, limit, label);
      if (arrayError) return fail(arrayError);
    }

    for (const field of ['hp', 'maxHp', 'gold', 'xp']) {
      if (character[field] === undefined || character[field] === null) continue;
      const number = Number(character[field]);
      if (!Number.isFinite(number) || Math.abs(number) > 1000000000) {
        return fail('Save contains an invalid character ' + field + ' value.');
      }
    }

    state.log = Array.isArray(state.log) ? state.log.slice(-300) : [];
    return { ok: true, state };
  }

  return Object.freeze({ version: '22.0.0', limits: LIMITS, validate });
})();
