/* SOLO REALMS V22 — exact, persistent legacy-reward deduplication.
 * The visible milestone list remains a compact 100-entry history. This separate
 * ledger retains every claimed ID across saves and JSON export/import.
 */
const SR22LegacyLedger = (() => {
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const MAX_ID_LENGTH = 180;

  function normalizeMap(map) {
    const normalized = Object.create(null);
    if (isRecord(map)) {
      for (const key of Object.keys(map)) {
        if (key && key.length <= MAX_ID_LENGTH && map[key] === true) normalized[key] = true;
      }
    }
    return normalized;
  }

  function ensure(character, version = '22.0.0') {
    if (!isRecord(character)) return null;
    let legacy = isRecord(character.sr21Legacy) ? character.sr21Legacy : {};
    character.sr21Legacy = legacy;
    legacy.version = legacy.version || version;
    legacy.xp = Math.max(0, Math.floor(Number(legacy.xp) || 0));
    legacy.milestones = Array.isArray(legacy.milestones) ? legacy.milestones : [];
    legacy.archivedCampaigns = Array.isArray(legacy.archivedCampaigns) ? legacy.archivedCampaigns : [];
    legacy.reputation = isRecord(legacy.reputation) ? legacy.reputation : {};

    if (legacy.awardLedgerVersion !== 1) {
      const migrated = normalizeMap(legacy.awardedIds);
      for (const milestone of legacy.milestones) {
        const id = typeof milestone?.id === 'string' ? milestone.id.trim() : '';
        if (id && id.length <= MAX_ID_LENGTH) migrated[id] = true;
      }
      legacy.awardedIds = migrated;
      legacy.awardLedgerVersion = 1;
    } else if (!isRecord(legacy.awardedIds) || Object.getPrototypeOf(legacy.awardedIds) !== null) {
      legacy.awardedIds = normalizeMap(legacy.awardedIds);
    }
    return legacy;
  }

  function claim(legacy, id) {
    if (!isRecord(legacy)) return false;
    const key = String(id ?? '').trim();
    if (!key || key.length > MAX_ID_LENGTH) return false;
    if (!isRecord(legacy.awardedIds) || Object.getPrototypeOf(legacy.awardedIds) !== null) {
      legacy.awardedIds = normalizeMap(legacy.awardedIds);
    }
    if (own(legacy.awardedIds, key)) return false;
    legacy.awardedIds[key] = true;
    return true;
  }

  return Object.freeze({ version: '22.0.0', ensure, claim });
})();

globalThis.__SR22_TEST = {
  version: '22.0.0',
  validateSave: (value, schema) => SR22SaveGuard.validate(value, schema),
  ensureLegacy: (character, version) => SR22LegacyLedger.ensure(character, version),
  claimLegacy: (legacy, id) => SR22LegacyLedger.claim(legacy, id)
};
