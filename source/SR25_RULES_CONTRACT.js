/* SOLO REALMS V25 — versioned campaign ruleset contract and typed d20 services.
 * Additive compatibility layer. V24 saves are migrated without silently changing their house rules.
 */
const SR25_VERSION = '25.0.0';
const SR25_RULESET_SCHEMA = 'solo-realms-campaign-rules-v1';
const SR25_REQUEST_SCHEMA = 'solo-realms-mechanic-request-v1';
const SR25_RESULT_SCHEMA = 'solo-realms-mechanic-result-v1';
const SR25_D20_MECHANICS = Object.freeze(['ability-check', 'saving-throw', 'attack']);
const SR25_MECHANICS = Object.freeze([
  'none', 'ability-check', 'saving-throw', 'attack', 'contest',
  'spell', 'resource-time', 'clarification', 'unsupported'
]);
const SR25_ABILITIES = Object.freeze(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']);
const SR25_HOUSE_RULES = Object.freeze([
  'classIdentityEdge', 'coverACBonus', 'flankingACBonus', 'travelFatiguePenalty', 'customDCPresets'
]);
const SR25_DC_LADDER = Object.freeze([
  Object.freeze({ dc: 5, label: 'Very easy' }),
  Object.freeze({ dc: 10, label: 'Easy' }),
  Object.freeze({ dc: 15, label: 'Medium' }),
  Object.freeze({ dc: 20, label: 'Hard' }),
  Object.freeze({ dc: 25, label: 'Very hard' }),
  Object.freeze({ dc: 30, label: 'Nearly impossible' })
]);
const SR25_PROFILE_DEFAULTS = Object.freeze({
  'dnd-2024-srd-5.2.1': Object.freeze({
    id: 'dnd-2024-srd-5.2.1',
    edition: '2024',
    sourceName: 'Dungeons & Dragons Systems Reference Document',
    sourceVersion: '5.2.1',
    dcScale: '2024-typical',
    houseRules: Object.freeze({
      classIdentityEdge: false,
      coverACBonus: false,
      flankingACBonus: false,
      travelFatiguePenalty: false,
      customDCPresets: false
    })
  }),
  'solo-realms-v24-enhanced': Object.freeze({
    id: 'solo-realms-v24-enhanced',
    edition: '2024-compatible',
    sourceName: 'Solo Realms V24 enhanced rules profile',
    sourceVersion: '24.0.0',
    dcScale: 'solo-realms-custom',
    houseRules: Object.freeze({
      classIdentityEdge: true,
      coverACBonus: true,
      flankingACBonus: true,
      travelFatiguePenalty: true,
      customDCPresets: true
    })
  })
});
const SR25_OLD_CUSTOM_DC_PRESETS = Object.freeze({
  trivial: 5, routine: 8, standard: 12, hard: 16, expert: 20, legendary: 25
});

function sr25IsRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function sr25ClampString(value, maximum, label, required = false) {
  const result = String(value ?? '').trim();
  if (required && !result) throw new Error(label + ' is required.');
  if (result.length > maximum) throw new Error(label + ' exceeds ' + maximum + ' characters.');
  return result;
}
function sr25FiniteInteger(value, label, minimum, maximum) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw new Error(label + ' must be an integer from ' + minimum + ' to ' + maximum + '.');
  }
  return number;
}
function sr25ProfileDefaults(id) {
  const source = SR25_PROFILE_DEFAULTS[id];
  if (!source) throw new Error('Unsupported campaign ruleset: ' + id);
  return {
    schema: SR25_RULESET_SCHEMA,
    id: source.id,
    edition: source.edition,
    sourceName: source.sourceName,
    sourceVersion: source.sourceVersion,
    dcScale: source.dcScale,
    houseRules: { ...source.houseRules }
  };
}
function sr25NormalizeProfile(value, fallbackId) {
  if (!sr25IsRecord(value)) return sr25ProfileDefaults(fallbackId);
  const id = String(value.id || fallbackId);
  const normalized = sr25ProfileDefaults(id);
  if (value.houseRules !== undefined && !sr25IsRecord(value.houseRules)) {
    throw new Error('Campaign house rules must be a plain object.');
  }
  if (value.schema !== undefined && value.schema !== SR25_RULESET_SCHEMA) {
    throw new Error('Campaign ruleset schema is not supported.');
  }
  for (const key of SR25_HOUSE_RULES) {
    if (value.houseRules && Object.prototype.hasOwnProperty.call(value.houseRules, key)) {
      if (typeof value.houseRules[key] !== 'boolean') {
        throw new Error('Campaign house-rule flag ' + key + ' must be true or false.');
      }
      normalized.houseRules[key] = value.houseRules[key];
    }
  }
  return normalized;
}
function sr25EnsureCampaignRules(campaign, options = {}) {
  if (!sr25IsRecord(campaign)) throw new Error('A campaign is required to establish its ruleset.');
  let profile = campaign.ruleset;
  if (!profile) {
    const hasPriorV20Rules = !!(campaign.sr20 && campaign.sr20.version);
    const legacy = options.legacy === true || (options.legacy === undefined && hasPriorV20Rules);
    const id = legacy ? 'solo-realms-v24-enhanced' : 'dnd-2024-srd-5.2.1';
    profile = sr25ProfileDefaults(id);
  } else {
    const fallback = String(profile.id || 'dnd-2024-srd-5.2.1');
    profile = sr25NormalizeProfile(profile, fallback);
  }
  campaign.ruleset = profile;
  return profile;
}
function sr25MigrateSaveState(value) {
  if (!sr25IsRecord(value) || !sr25IsRecord(value.campaign)) {
    throw new Error('Save is missing a campaign for ruleset migration.');
  }
  const hadV20Profile = !!(value.campaign.sr20 && value.campaign.sr20.version);
  sr25EnsureCampaignRules(value.campaign, { legacy: hadV20Profile });
  return value;
}
function sr25SetCampaignProfile(campaign, profileId) {
  if (!Object.prototype.hasOwnProperty.call(SR25_PROFILE_DEFAULTS, profileId)) {
    throw new Error('Choose a supported rules profile.');
  }
  campaign.ruleset = sr25ProfileDefaults(profileId);
  return campaign.ruleset;
}
function sr25SetHouseRule(campaign, key, enabled) {
  if (!SR25_HOUSE_RULES.includes(key)) throw new Error('Unknown house-rule option: ' + key);
  if (typeof enabled !== 'boolean') throw new Error('House-rule selection must be true or false.');
  const profile = sr25EnsureCampaignRules(campaign);
  profile.houseRules[key] = enabled;
  return profile;
}
function sr25HouseRuleEnabled(key, campaign = state?.campaign) {
  if (!SR25_HOUSE_RULES.includes(key) || !sr25IsRecord(campaign)) return false;
  try {
    return sr25EnsureCampaignRules(campaign).houseRules[key] === true;
  } catch (error) {
    return false;
  }
}
function sr25DCReference() {
  return SR25_DC_LADDER.map(item => ({ dc: item.dc, label: item.label }));
}
function sr25DCSource(options = {}) {
  if (options.dcSource) return String(options.dcSource);
  if (options.difficulty && options.difficulty !== 'auto') return 'solo-realms-custom-preset';
  if (options.challenge && options.challenge !== 'standard') return 'solo-realms-custom-offset';
  return '2024-typical-or-director';
}

function sr25ValidateMechanicRequest(value) {
  try {
    if (!sr25IsRecord(value)) throw new Error('Mechanic request must be an object.');
    if (value.schema !== SR25_REQUEST_SCHEMA) throw new Error('Mechanic request schema is not supported.');
    const mechanic = String(value.mechanic || '');
    if (!SR25_MECHANICS.includes(mechanic)) throw new Error('Mechanic type is not supported.');
    const actorId = sr25ClampString(value.actorId, 120, 'Actor ID', true);
    const action = sr25ClampString(value.action, 500, 'Action', true);
    const targetId = sr25ClampString(value.targetId, 120, 'Target ID');
    const rulesetId = String(value.rulesetId || '');
    if (!Object.prototype.hasOwnProperty.call(SR25_PROFILE_DEFAULTS, rulesetId)) {
      throw new Error('Mechanic request must identify a supported campaign ruleset.');
    }
    const campaignRevision = sr25FiniteInteger(value.campaignRevision ?? 0, 'Campaign revision', 0, 2147483647);
    const ability = value.ability == null || value.ability === '' ? null : String(value.ability).toUpperCase();
    if (ability && !SR25_ABILITIES.includes(ability)) throw new Error('Ability must be one of the six ability scores.');
    const skill = value.skill == null || value.skill === '' ? null : sr25ClampString(value.skill, 40, 'Skill');
    const actionCost = value.actionCost == null ? null : value.actionCost;
    if (actionCost !== null) {
      if (!sr25IsRecord(actionCost) || !['action', 'bonus-action', 'reaction', 'movement', 'free', 'spell', 'resource', 'time'].includes(String(actionCost.kind))) {
        throw new Error('Action cost is not a supported structured cost.');
      }
    }
    const context = value.context == null ? {} : value.context;
    if (!sr25IsRecord(context)) throw new Error('Mechanic context must be a plain object.');
    const contextText = JSON.stringify(context);
    if (contextText.length > 20000) throw new Error('Mechanic context exceeds 20,000 characters.');
    return {
      ok: true,
      request: {
        schema: SR25_REQUEST_SCHEMA,
        id: sr25ClampString(value.id || 'request', 120, 'Request ID', true),
        mechanic, actorId, targetId, action, ability, skill, actionCost,
        rulesetId, campaignRevision, context: JSON.parse(contextText)
      }
    };
  } catch (error) {
    return { ok: false, reason: String(error?.message || error) };
  }
}
function sr25CreateMechanicRequest(input, campaign = state?.campaign) {
  try {
    if (!sr25IsRecord(input)) throw new Error('Mechanic request input must be an object.');
    const profile = sr25EnsureCampaignRules(campaign);
    const candidate = {
      schema: SR25_REQUEST_SCHEMA,
      id: input.id || (typeof sr20Id === 'function' ? sr20Id() : 'request'),
      mechanic: input.mechanic,
      actorId: input.actorId || state?.character?.id || state?.character?.name || 'player',
      targetId: input.targetId || '',
      action: input.action,
      ability: input.ability || null,
      skill: input.skill || null,
      actionCost: input.actionCost ?? null,
      rulesetId: input.rulesetId || profile.id,
      campaignRevision: input.campaignRevision ?? campaign.revision ?? 0,
      context: input.context || {}
    };
    return sr25ValidateMechanicRequest(candidate);
  } catch (error) {
    return { ok: false, reason: String(error?.message || error) };
  }
}
function sr25ResolveD20(input) {
  if (!sr25IsRecord(input)) throw new Error('A typed d20 resolution request is required.');
  const mechanic = String(input.mechanic || '');
  if (!SR25_D20_MECHANICS.includes(mechanic)) {
    throw new Error('The d20 resolver supports ability checks, saving throws and attack rolls only.');
  }
  const targetNumber = Number(input.targetNumber);
  const modifier = Number(input.modifier ?? 0);
  if (!Number.isFinite(targetNumber) || targetNumber < 0 || targetNumber > 1000) {
    throw new Error('Target number must be a finite value from 0 to 1000.');
  }
  if (!Number.isFinite(modifier) || Math.abs(modifier) > 1000) {
    throw new Error('Modifier must be a finite value between -1000 and 1000.');
  }
  const advantage = !!input.advantage && !input.disadvantage;
  const disadvantage = !!input.disadvantage && !input.advantage;
  let rolls = input.rolls;
  if (!Array.isArray(rolls)) rolls = input.roll === undefined ? [] : [input.roll];
  const required = advantage || disadvantage ? 2 : 1;
  if (rolls.length !== required) {
    throw new Error((required === 2 ? 'Advantage or disadvantage requires exactly two d20 results.' : 'A normal d20 test requires exactly one d20 result.'));
  }
  rolls = rolls.map((roll, index) => sr25FiniteInteger(roll, 'd20 result ' + (index + 1), 1, 20));
  const die = advantage ? Math.max(...rolls) : disadvantage ? Math.min(...rolls) : rolls[0];
  if (input.autoFail !== undefined && typeof input.autoFail !== 'boolean') {
    throw new Error('Automatic save failure must be a boolean.');
  }
  const autoFail = mechanic === 'saving-throw' && input.autoFail === true;
  const total = die + modifier;
  const critical = mechanic === 'attack' && die === 20;
  const automaticMiss = mechanic === 'attack' && die === 1;
  const success = mechanic === 'attack'
    ? critical || (!automaticMiss && total >= targetNumber)
    : !autoFail && total >= targetNumber;
  return {
    schema: SR25_RESULT_SCHEMA,
    mechanic,
    dice: rolls.slice(),
    die,
    modifier,
    total,
    targetNumber,
    targetType: mechanic === 'attack' ? 'armor-class' : 'difficulty-class',
    success,
    critical,
    automaticMiss,
    autoFail,
    natural: die
  };
}
function sr25ResolveAbilityCheck(rolls, modifier, dc, options = {}) {
  return sr25ResolveD20({ ...options, mechanic: 'ability-check', rolls, modifier, targetNumber: dc });
}
function sr25ResolveSavingThrow(rolls, modifier, dc, options = {}) {
  return sr25ResolveD20({ ...options, mechanic: 'saving-throw', rolls, modifier, targetNumber: dc });
}
function sr25HasSaveAbility(target, ability) {
  const key = String(ability || '').toUpperCase();
  const stats = target?.stats || target?.abilityScores;
  return SR25_ABILITIES.includes(key) && sr25IsRecord(stats) &&
    Object.prototype.hasOwnProperty.call(stats, key) &&
    Number.isFinite(Number(stats[key])) && Number(stats[key]) >= 1 && Number(stats[key]) <= 30;
}
function sr25ResolveCreatureSavingThrow(target, ability, rolls, modifier, dc, options = {}) {
  const autoFail = options.autoFail === true || !sr25HasSaveAbility(target, ability);
  return sr25ResolveSavingThrow(rolls, modifier, dc, { ...options, autoFail });
}
function sr25ResolveSavingThrowTotal(total, modifier, dc, options = {}) {
  const normalizedTotal = Number(total);
  const normalizedModifier = Number(modifier);
  if (!Number.isFinite(normalizedTotal) || !Number.isFinite(normalizedModifier)) return null;
  try {
    return sr25ResolveSavingThrow([normalizedTotal - normalizedModifier], normalizedModifier, dc, options);
  } catch (error) {
    return null;
  }
}
function sr25SavingThrowTotalSuccess(total, modifier, dc, options = {}) {
  return sr25ResolveSavingThrowTotal(total, modifier, dc, options)?.success === true;
}
function sr25ResolveAttack(rolls, modifier, ac, options = {}) {
  return sr25ResolveD20({ ...options, mechanic: 'attack', rolls, modifier, targetNumber: ac });
}

function sr25ResolveAttackRecord(rollRecord, armorClass) {
  if (!sr25IsRecord(rollRecord)) throw new Error('An attack roll record is required.');
  const die = Number(rollRecord.r ?? rollRecord.roll ?? rollRecord.die);
  const total = Number(rollRecord.total);
  if (!Number.isFinite(total)) throw new Error('Attack roll total must be finite.');
  return sr25ResolveAttack([die], total - die, armorClass);
}
function sr25AttackSuccess(rollRecord, armorClass) {
  return sr25ResolveAttackRecord(rollRecord, armorClass).success;
}
function sr25ResolveAttackTotal(total, modifier, armorClass) {
  const normalizedTotal = Number(total);
  const normalizedModifier = Number(modifier);
  if (!Number.isFinite(normalizedTotal) || !Number.isFinite(normalizedModifier)) return null;
  try {
    return sr25ResolveAttack([normalizedTotal - normalizedModifier], normalizedModifier, armorClass);
  } catch (error) {
    return null;
  }
}
function sr25AttackTotalSuccess(total, modifier, armorClass) {
  return sr25ResolveAttackTotal(total, modifier, armorClass)?.success === true;
}
function sr25AbilityModifier(score) {
  const value = Number(score ?? 10);
  return Math.floor(((Number.isFinite(value) ? value : 10) - 10) / 2);
}
function sr25ProficiencyBonus(level) {
  const normalized = Math.max(1, Math.min(20, Math.floor(Number(level) || 1)));
  return 2 + Math.floor((normalized - 1) / 4);
}
function sr25SkillBonus(character, skill, options = {}) {
  if (!sr25IsRecord(character)) throw new Error('A character is required for skill bonus calculation.');
  const normalize = value => String(value || '').toLowerCase().replace(/[^a-z]/g, '');
  const key = normalize(skill);
  if (!key) throw new Error('A skill is required for skill bonus calculation.');
  const ability = SR20_SKILL_ABILITIES?.[key] || 'INT';
  const includes = values => Array.isArray(values) && values.some(item =>
    normalize(typeof item === 'string' ? item : item?.name) === key
  );
  const expert = includes(character.expertise) || includes(character.skillExpertise) ||
    includes(character.expertiseSkills) || includes(character.skills?.expertise);
  const trained = includes(character.proficiencies) || includes(character.skillProficiencies) ||
    includes(character.skills?.proficient) || expert;
  const proficiencyBonus = sr25ProficiencyBonus(character.level);
  const abilityMod = sr25AbilityModifier(character.stats?.[ability] ?? character.stats?.[ability.toLowerCase()] ?? 10);
  const houseRules = sr25IsRecord(options.houseRules) ? options.houseRules : {};
  const className = String(character.classId || character.class || character.className || '').toLowerCase();
  const classKey = Object.keys(SR20_CLASS_EDGES || {}).find(name => className.includes(name));
  const classEdge = houseRules.classIdentityEdge === true && !!classKey &&
    (SR20_CLASS_EDGES[classKey] || []).includes(key) ? 1 : 0;
  const proficiency = trained ? proficiencyBonus : 0;
  const expertiseBonus = expert ? proficiencyBonus : 0;
  return {
    ability: abilityMod,
    proficiency,
    expertise: expertiseBonus,
    expertiseBonus,
    classEdge,
    total: abilityMod + proficiency + expertiseBonus + classEdge,
    trained,
    expert,
    edge: classEdge > 0
  };
}
function sr25NormalizeLegacyD20Result(result, targetNumber, mechanic, options = {}) {
  if (!sr25IsRecord(result)) return result;
  const die = Number(result.roll ?? result.r ?? result.die ?? result.d20 ?? result.r1);
  if (!Number.isInteger(die) || die < 1 || die > 20) return result;
  const dc = Number(targetNumber);
  const total = Number(result.total);
  const bonus = Number.isFinite(total) ? total - die : Number(result.bonus || 0);
  const autoFail = mechanic === 'saving-throw' && options.autoFail === true;
  const canonical = sr25ResolveD20({
    mechanic, roll: die, modifier: bonus, targetNumber: dc, autoFail
  });
  return {
    ...result,
    roll: die,
    total: canonical.total,
    success: canonical.success,
    autoFail: canonical.autoFail,
    mechanic,
    targetNumber: dc,
    natural: die,
    critical: canonical.critical
  };
}

// Legacy saves with V20/V21 campaign records retain their documented Enhanced profile.
// New campaigns and pre-V20 saves default to the strict 2024 SRD 5.2.1 profile.
if (typeof sr20EnsureCampaign === 'function') {
  const sr25EnsureCampaignBase = sr20EnsureCampaign;
  sr20EnsureCampaign = function() {
    const hadV20 = !!(state?.campaign?.sr20 && state.campaign.sr20.version);
    const result = sr25EnsureCampaignBase();
    if (state?.campaign) sr25EnsureCampaignRules(state.campaign, { legacy: hadV20 });
    return result;
  };
}
if (typeof sr21EnsureCampaign === 'function') {
  const sr25EnsurePlayerCampaignBase = sr21EnsureCampaign;
  sr21EnsureCampaign = function() {
    const campaignBefore = state?.campaign;
    const hadExplicitRuleset = !!campaignBefore?.ruleset;
    const hadPriorV20Rules = !!(campaignBefore?.sr20 && campaignBefore.sr20.version);
    const result = sr25EnsurePlayerCampaignBase();
    if (state?.campaign) {
      sr25EnsureCampaignRules(state.campaign, {
        legacy: hadExplicitRuleset ? undefined : hadPriorV20Rules
      });
    }
    return result;
  };
}
if (typeof sr21SkillBonus === 'function') {
  sr21SkillBonus = function(character, skill) {
    const profile = state?.campaign
      ? sr25EnsureCampaignRules(state.campaign)
      : sr25ProfileDefaults('dnd-2024-srd-5.2.1');
    return sr25SkillBonus(character, skill, { houseRules: profile.houseRules });
  };
}
if (typeof sr20SkillBonus === 'function') {
  sr20SkillBonus = function(character, skill) {
    const profile = state?.campaign
      ? sr25EnsureCampaignRules(state.campaign)
      : sr25ProfileDefaults('dnd-2024-srd-5.2.1');
    return sr25SkillBonus(character, skill, { houseRules: profile.houseRules });
  };
}
if (typeof sr20ClassEdge === 'function') {
  const sr25ClassEdgeBase = sr20ClassEdge;
  sr20ClassEdge = function(skill, character) {
    if (!sr25HouseRuleEnabled('classIdentityEdge')) return false;
    return sr25ClassEdgeBase(skill, character);
  };
}

if (typeof sr20CoverIsActive === 'function') {
  const sr25CoverIsActiveBase = sr20CoverIsActive;
  sr20CoverIsActive = function() {
    return sr25HouseRuleEnabled('coverACBonus') && sr25CoverIsActiveBase();
  };
}
if (typeof sr21ExplicitDifficulty === 'function') {
  const sr25ExplicitDifficultyBase = sr21ExplicitDifficulty;
  sr21ExplicitDifficulty = function(value) {
    return sr25HouseRuleEnabled('customDCPresets')
      ? sr25ExplicitDifficultyBase(value)
      : null;
  };
  sr21DifficultyOptions = function() {
    if (!sr25HouseRuleEnabled('customDCPresets')) {
      return '<option value="auto" selected>Automatic · 2024 typical DC guidance</option>';
    }
    return '<option value="auto" selected>Automatic · Director / 2024 typical DC</option>' +
      Object.entries(SR25_OLD_CUSTOM_DC_PRESETS).map(([key, dc]) =>
        '<option value="' + key + '">Solo Realms custom · ' +
        key.charAt(0).toUpperCase() + key.slice(1) + ' · DC ' + dc + '</option>'
      ).join('');
  };
}

if (typeof sr20ChallengeDC === 'function') {
  const sr25ChallengeDCBase = sr20ChallengeDC;
  sr20ChallengeDC = function(baseDC, challenge) {
    return sr25HouseRuleEnabled('customDCPresets')
      ? sr25ChallengeDCBase(baseDC, challenge)
      : Math.max(5, Math.min(30, Number(baseDC) || 12));
  };
}
if (typeof sr21SituationDC === 'function') {
  const sr25SituationDCBase = sr21SituationDC;
  sr21SituationDC = function(text, mode, decision) {
    if (sr25HouseRuleEnabled('customDCPresets')) {
      return sr25SituationDCBase(text, mode, decision);
    }
    const suggested = Number(decision?.dc);
    if (Number.isFinite(suggested) && suggested >= 5 && suggested <= 30) return suggested;
    const action = String(text || '').toLowerCase();
    if (/\b(nearly impossible|impossible|impossible feat)\b/.test(action)) return 30;
    if (/\b(very hard|extremely hard|legendary|masterwork|ancient ward)\b/.test(action)) return 25;
    if (/\b(hard|difficult|dangerous|under fire|while pursued|during a storm|deadly|fortified|expertly guarded|unstable|collapsing|time is running out|one chance)\b/.test(action)) return 20;
    if (/\b(very easy|obvious|unlocked|unopposed|at leisure)\b/.test(action)) return 5;
    if (/\b(easy|simple|routine|familiar|ordinary)\b/.test(action)) return 10;
    return 15;
  };
}
if (typeof sr21ResolveOptions === 'function') {
  const sr25ResolveOptionsBase = sr21ResolveOptions;
  sr21ResolveOptions = function(options = {}) {
    const resolved = sr25ResolveOptionsBase(options);
    if (resolved.dcSource) return resolved;
    if (Number.isFinite(Number(resolved.dc)) && Number(resolved.dc) >= 5 && Number(resolved.dc) <= 30) {
      resolved.dcSource = 'manual-override';
    } else if (String(resolved.difficulty || 'auto') !== 'auto') {
      resolved.dcSource = 'solo-realms-custom-preset';
    } else {
      resolved.dcSource = 'director-typical';
    }
    return resolved;
  };
}
function sr25RulesetPanel() {
  const campaign = state?.campaign;
  if (!campaign) return '';
  const profile = sr25EnsureCampaignRules(campaign);
  const labels = {
    classIdentityEdge: 'Class identity edge (+1)',
    coverACBonus: 'Cover grants +2 AC',
    flankingACBonus: 'Successful flank grants −2 enemy AC',
    travelFatiguePenalty: 'High fatigue gives −2 travel/survival checks',
    customDCPresets: 'Solo Realms custom DC presets'
  };
  const toggles = SR25_HOUSE_RULES.map(key =>
    '<label class="item-row" style="justify-content:space-between;gap:12px">' +
    '<span>' + labels[key] + '</span>' +
    '<input type="checkbox" data-sr25-house-rule="' + key + '"' +
    (profile.houseRules[key] ? ' checked' : '') + '></label>'
  ).join('');
  return '<section class="card" id="sr25-ruleset-panel">' +
    '<div class="eyebrow">V25 · Campaign rules</div>' +
    '<h3>Rules profile</h3>' +
    '<div class="field"><label for="sr25-profile">Ruleset</label>' +
    '<select id="sr25-profile">' +
    '<option value="dnd-2024-srd-5.2.1"' + (profile.id === 'dnd-2024-srd-5.2.1' ? ' selected' : '') + '>2024 SRD 5.2.1 · Core profile</option>' +
    '<option value="solo-realms-v24-enhanced"' + (profile.id === 'solo-realms-v24-enhanced' ? ' selected' : '') + '>Solo Realms Enhanced · Legacy-compatible</option>' +
    '</select></div>' +
    '<p class="muted smalltext">2024 typical DCs: 5, 10, 15, 20, 25, 30. Enhanced options are explicit Solo Realms house rules and are saved with this campaign.</p>' +
    '<div class="eyebrow">House-rule switches</div>' + toggles +
    '<p class="muted smalltext">Changing the profile or a switch affects future resolutions; it does not rewrite previous rolls or combat outcomes.</p>' +
    '</section>';
}
if (typeof sr20GameplayPanel === 'function') {
  const sr25GameplayPanelBase = sr20GameplayPanel;
  sr20GameplayPanel = function() {
    return sr25GameplayPanelBase() + sr25RulesetPanel();
  };
}
if (typeof srAIContext === 'function') {
  const sr25AIContextBase = srAIContext;
  srAIContext = function() {
    const context = sr25AIContextBase();
    if (!state?.campaign) return context;
    const profile = sr25EnsureCampaignRules(state.campaign);
    context.campaign = context.campaign || {};
    context.campaign.ruleset = {
      id: profile.id,
      edition: profile.edition,
      sourceName: profile.sourceName,
      sourceVersion: profile.sourceVersion,
      dcScale: profile.dcScale,
      houseRules: { ...profile.houseRules }
    };
    return context;
  };
}
if (typeof app !== 'undefined' && app?.addEventListener) {
  app.addEventListener('change', function(event) {
    const target = event?.target;
    if (!target) return;
    if (target.id === 'sr25-profile') {
      try {
        sr25SetCampaignProfile(state.campaign, String(target.value || ''));
        save();
        render();
      } catch (error) {
        if (typeof toast === 'function') toast(String(error?.message || error));
      }
      return;
    }
    const key = target.getAttribute?.('data-sr25-house-rule');
    if (!key) return;
    try {
      sr25SetHouseRule(state.campaign, key, !!target.checked);
      save();
      render();
    } catch (error) {
      if (typeof toast === 'function') toast(String(error?.message || error));
    }
  }, true);
}
if (typeof sr14AbilityCheck === 'function') {
  const sr25AbilityCheckBase = sr14AbilityCheck;
  sr14AbilityCheck = function(character, skill, dc, options = {}) {
    return sr25NormalizeLegacyD20Result(
      sr25AbilityCheckBase(character, skill, dc, options), dc, 'ability-check'
    );
  };
}
if (typeof sr14SavingThrow === 'function') {
  const sr25SavingThrowBase = sr14SavingThrow;
  sr14SavingThrow = function(character, ability, dc, options = {}) {
    const key = String(ability || '').toUpperCase();
    const conditions = Array.isArray(character?.conditions)
      ? character.conditions.map(item => String(typeof item === 'string' ? item : item?.name || '').toLowerCase())
      : [];
    const autoFail = !sr25HasSaveAbility(character, key) ||
      (['STR', 'DEX'].includes(key) && (conditions.includes('paralyzed') || conditions.includes('unconscious')));
    return sr25NormalizeLegacyD20Result(
      sr25SavingThrowBase(character, ability, dc, options), dc, 'saving-throw', { autoFail }
    );
  };
}
if (typeof sr133HeroSave === 'function') {
  const sr25HeroSaveBase = sr133HeroSave;
  sr133HeroSave = function(character, ability, player, attacker) {
    const result = sr25HeroSaveBase(character, ability, player, attacker);
    const key = String(ability || '').toUpperCase();
    const rolls = result.advantage || result.disadvantage
      ? [result.d1, result.d2]
      : [result.d1];
    const autoFail = !!result.autoFail || !sr25HasSaveAbility(character, key);
    const dc = Number(attacker?.saveDC) || 0;
    const canonical = sr25ResolveSavingThrow(rolls, Number(result.bonus || 0) + Number(result.cover || 0),
      dc, {
        advantage: !!result.advantage,
        disadvantage: !!result.disadvantage,
        autoFail
      });
    return {
      ...result,
      dc,
      total: autoFail ? -Infinity : canonical.total,
      success: canonical.success,
      autoFail: canonical.autoFail
    };
  };
}

// The imported-save validator is pure. Migrate only its normalized copy, never the caller's object.
if (typeof sr18ValidateSave === 'function') {
  const sr25ValidateSaveBase = sr18ValidateSave;
  sr18ValidateSave = function(value) {
    const result = sr25ValidateSaveBase(value);
    if (!result?.ok) return result;
    try {
      sr25MigrateSaveState(result.state);
      return result;
    } catch (error) {
      return { ok: false, reason: String(error?.message || error) };
    }
  };
}
if (typeof globalThis.__SR14_TEST === 'object' && globalThis.__SR14_TEST) {
  globalThis.__SR14_TEST.abilityCheck = sr14AbilityCheck;
  globalThis.__SR14_TEST.savingThrow = sr14SavingThrow;
  if (typeof globalThis.__SR14_TEST.tests === 'function') {
    const sr25LegacyV14Tests = globalThis.__SR14_TEST.tests;
    globalThis.__SR14_TEST.tests = function() {
      const results = sr25LegacyV14Tests();
      if (!Array.isArray(results)) return results;
      return results.map(result => {
        const name = String(result?.name || '');
        const isTwenty = /natural\s*20/i.test(name);
        const isOne = /natural\s*1/i.test(name);
        const ability = /ability check/i.test(name);
        const save = /saving throw/i.test(name);
        if ((!isTwenty && !isOne) || (!ability && !save) || !/automatic|automatically/i.test(name)) return result;
        const die = isTwenty ? 20 : 1;
        const dc = isTwenty ? 99 : 1;
        const character = {
          classId: 'Fighter', level: 1,
          stats: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
          proficiencies: [], expertise: []
        };
        const originalRandom = Math.random;
        let actual;
        try {
          Math.random = () => isTwenty ? 0.999999 : 0;
          actual = ability
            ? sr14AbilityCheck(character, 'Athletics', dc)
            : sr14SavingThrow(character, 'DEX', dc);
        } finally {
          Math.random = originalRandom;
        }
        const actualDie = Number(actual?.roll ?? actual?.r ?? actual?.r1);
        const expectedSuccess = isOne;
        const pass = actualDie === die && !!actual?.success === expectedSuccess &&
          (isTwenty ? Number(actual?.total) < dc : Number(actual?.total) >= dc);
        return {
          ...result,
          name: isTwenty
            ? (ability ? 'Natural 20 does not auto-succeed on an ability check' : 'Natural 20 does not auto-succeed on a saving throw')
            : (ability ? 'Natural 1 can succeed on an ability check when the total meets the DC' : 'Natural 1 can succeed on a saving throw when the total meets the DC'),
          pass,
          detail: 'Updated by V25: resolve the modified total against the DC.'
        };
      });
    };
  }
}
if (typeof globalThis.__SR18_TEST === 'object' && globalThis.__SR18_TEST) {
  globalThis.__SR18_TEST.validateSave = sr18ValidateSave;
}
if (typeof globalThis.__SR21_TEST === 'object' && globalThis.__SR21_TEST) {
  globalThis.__SR21_TEST.ensure = sr21EnsureCampaign;
  globalThis.__SR21_TEST.skillBonus = sr21SkillBonus;
}
globalThis.__SR25_TEST = {
  version: SR25_VERSION,
  rulesetSchema: SR25_RULESET_SCHEMA,
  ensureCampaignRules: sr25EnsureCampaignRules,
  migrateSaveState: sr25MigrateSaveState,
  setProfile: sr25SetCampaignProfile,
  setHouseRule: sr25SetHouseRule,
  houseRuleEnabled: sr25HouseRuleEnabled,
  dcReference: sr25DCReference,
  customDCPresets: { ...SR25_OLD_CUSTOM_DC_PRESETS },
  mechanics: SR25_MECHANICS.slice(),
  createRequest: sr25CreateMechanicRequest,
  validateRequest: sr25ValidateMechanicRequest,
  resolveD20: sr25ResolveD20,
  resolveAbilityCheck: sr25ResolveAbilityCheck,
  resolveSavingThrow: sr25ResolveSavingThrow,
  resolveCreatureSavingThrow: sr25ResolveCreatureSavingThrow,
  resolveSavingThrowTotal: sr25ResolveSavingThrowTotal,
  savingThrowTotalSuccess: sr25SavingThrowTotalSuccess,
  hasSaveAbility: sr25HasSaveAbility,
  heroSave: sr133HeroSave,
  resolveAttack: sr25ResolveAttack,
  withD20Rolls: function(rolls, action) {
    if (!Array.isArray(rolls) || typeof action !== 'function' || !rolls.length) {
      throw new Error('A d20 roll sequence and callback are required.');
    }
    const queue = rolls.slice();
    const original = Math.random;
    Math.random = function() {
      if (!queue.length) return original();
      const die = Number(queue.shift());
      if (!Number.isInteger(die) || die < 1 || die > 20) throw new Error('Mock d20 results must be integers from 1 to 20.');
      return (die - 0.000001) / 20;
    };
    try { return action(); } finally { Math.random = original; }
  },
  resolveAttackRecord: sr25ResolveAttackRecord,
  attackSuccess: sr25AttackSuccess,
  resolveAttackTotal: sr25ResolveAttackTotal,
  attackTotalSuccess: sr25AttackTotalSuccess,
  normalizeLegacyResult: sr25NormalizeLegacyD20Result,
  abilityModifier: sr25AbilityModifier,
  proficiencyBonus: sr25ProficiencyBonus,
  skillBonus: sr25SkillBonus,
  profileDefaults: sr25ProfileDefaults,
  rulesetProfiles: Object.keys(SR25_PROFILE_DEFAULTS),
  houseRules: SR25_HOUSE_RULES.slice(),
  challengeDC: sr20ChallengeDC,
  explicitDifficulty: sr21ExplicitDifficulty,
  difficultyOptions: sr21DifficultyOptions,
  situationDC: sr21SituationDC,
  rulesetPanel: sr25RulesetPanel,
  directorContext: srAIContext,
  withAttackRoll: function(mockRoll, action) {
    if (typeof mockRoll !== 'function' || typeof action !== 'function' || typeof sr11RollAttack !== 'function') {
      throw new Error('A mock attack roll and callback are required.');
    }
    const original = sr11RollAttack;
    sr11RollAttack = mockRoll;
    try { return action(); } finally { sr11RollAttack = original; }
  }
};
try {
  if (state?.campaign) sr25EnsureCampaignRules(state.campaign);
  if (typeof render === 'function') render();
} catch (error) {
  console.warn('V25 rules profile initialization:', error);
}
