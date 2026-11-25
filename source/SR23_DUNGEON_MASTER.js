/* SOLO REALMS V23 — DIRECTOR-FIRST ACTION ADJUDICATION.
 * The player states intent. The Director chooses whether a roll is warranted,
 * selects the relevant skill/DC, and records a bounded continuity event.
 * The deterministic rules engine remains authoritative for dice and state.
 */
const SR23_VERSION = '23.0.0';
const SR23_EVENT_LIMIT = 240;
const SR23_MEMORY_LIMIT = 8;

const SR23_INTENT_RULES = [
  { mode: 'social', pattern: /\b(?:persuad\w*|convinc\w*|negotia\w*|bargain\w*|deceiv\w*|lie|bluff\w*|intimidat\w*|threaten\w*|bribe\w*|interrogat\w*|apologiz\w*|plead\w*|parley|talk|speak|ask|question)\b/gi },
  { mode: 'tactical', pattern: /\b(?:attack\w*|fight\w*|strike\w*|shoot\w*|stab\w*|slash\w*|ambush\w*|flank\w*|parry\w*|disarm\w*|grapple\w*|retreat\w*|withdraw\w*|defend\w*|take cover|dodge\w*|charge\w*)\b/gi },
  { mode: 'survival', pattern: /\b(?:make camp|camp|take a rest|short rest|long rest|rest(?!\s+of)|sleep|forage\w*|hunt\w*|fish\w*|gather\w*|cook\w*|repair\w*|craft\w*|treat wounds|purify|boil water|collect water)\b/gi },
  { mode: 'travel', pattern: /\b(?:travel\w*|journey\w*|march\w*|hike\w*|cross\w*|sail\w*|ride\w*|set out|move camp|navigate\w*)\b/gi },
  { mode: 'exploration', pattern: /\b(?:search\w*|explor\w*|scout\w*|track\w*|inspect\w*|investigat\w*|discover\w*|examin\w*|map\w*|survey\w*|listen\w*|look around|look for|look at|sneak\w*|hide\w*|pick the lock|open|close|read|study|watch|observe)\b/gi }
];

function sr23Normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function sr23IsNegated(text, index) {
  const prefix = String(text || '').slice(Math.max(0, index - 42), index);
  return /\b(?:do not|don't|never|avoid|instead of|rather than|not)\s+(?:(?:try|attempt|want|plan|intend)\s+to\s+)?(?:\w+\s+){0,2}$/i.test(prefix);
}

function sr23FindIntent(text) {
  const action = String(text || '');
  const matches = [];
  for (const rule of SR23_INTENT_RULES) {
    rule.pattern.lastIndex = 0;
    for (const match of action.matchAll(rule.pattern)) {
      if (!sr23IsNegated(action, match.index)) {
        matches.push({ mode: rule.mode, index: match.index, verb: match[0].toLowerCase() });
      }
    }
  }
  matches.sort((a, b) => a.index - b.index);
  if (matches.length) return matches[0];
  return { mode: typeof sr21InferMode === 'function' ? sr21InferMode(action) : 'campaign', index: -1, verb: '' };
}

function sr23IsRest(action) {
  return /\b(?:make camp|camp|take a rest|short rest|long rest|rest(?!\s+of)|sleep|sleep for the night)\b/i.test(String(action || ''));
}

function sr23HasMeaningfulRisk(action, mode) {
  const text = String(action || '').toLowerCase();
  const explicit = /\b(?:under fire|while pursued|during a storm|blizzard|flood|raging river|deadly|dangerous|unstable|collapsing|one chance|time is running out|guarded|watched|sentinels?|sentries|trapped|trap|locked|sealed|hidden|secret|concealed|contested|resist\w*|force open|break down|escape|steal|pick the lock|disarm|sneak|hide from|avoid detection|track|trail|forage|hunt|fish|climb|leap|swim|cross|persuad\w*|convinc\w*|negotia\w*|lie|deceiv\w*|bluff\w*|intimidat\w*|threaten\w*|bribe|interrogat\w*|repair|craft|treat wounds)\b/.test(text);
  if (mode === 'travel') return explicit;
  if (mode === 'social') return explicit || /\b(?:make them|get him to|get her to|win over|change their mind|reveal|confess)\b/.test(text);
  if (mode === 'exploration') return explicit || /\b(?:search|investigat\w*|inspect|examin\w*|study|look for|find out|identify|decipher|notice|spot|listen for)\b/.test(text);
  if (mode === 'survival') return explicit || /\b(?:forage|hunt|fish|gather|repair|craft|treat|purify|boil)\b/.test(text);
  if (mode === 'tactical') return true;
  return explicit;
}

function sr23SkillFor(mode, action, chosen) {
  const supplied = String(chosen || '').trim();
  if (supplied && supplied.toLowerCase() !== 'auto') return supplied;
  const text = String(action || '').toLowerCase();
  if (mode === 'social') {
    if (/\b(?:lie|deceiv\w*|bluff\w*|pretend|fake|disguise)\b/.test(text)) return 'Deception';
    if (/\b(?:threaten|intimidat\w*|coerce|scare)\b/.test(text)) return 'Intimidation';
    if (/\b(?:read|sense|motive|notice.*lie|tell if.*lying)\b/.test(text)) return 'Insight';
    if (/\b(?:sing|perform|entertain|play music|act out)\b/.test(text)) return 'Performance';
    return 'Persuasion';
  }
  if (mode === 'travel') {
    if (/\b(?:horse|mount|beast|animal|wolf)\b/.test(text)) return 'Animal Handling';
    if (/\b(?:climb|lift|push|haul|force)\b/.test(text)) return 'Athletics';
    if (/\b(?:sneak|unseen|quietly)\b/.test(text)) return 'Stealth';
    return 'Survival';
  }
  if (mode === 'survival') {
    if (/\b(?:wound|injur|poison|ill|sick|treat)\b/.test(text)) return 'Medicine';
    if (/\b(?:plant|herb|weather|poison|identify.*fungus)\b/.test(text)) return 'Nature';
    if (/\b(?:climb|lift|push|haul|force)\b/.test(text)) return 'Athletics';
    return 'Survival';
  }
  if (mode === 'tactical') {
    if (/\b(?:sneak|hide|ambush|shadow|unseen)\b/.test(text)) return 'Stealth';
    if (/\b(?:dodge|balance|acrobat|leap|tumble)\b/.test(text)) return 'Acrobatics';
    if (/\b(?:notice|watch|spot|read the enemy)\b/.test(text)) return 'Perception';
    return 'Athletics';
  }
  if (mode === 'exploration') {
    if (/\b(?:follow|track|trace)\s+(?:the\s+)?(?:tracks?|trail|footprints?|scent)|\b(?:navigate|wilderness|forage)\b/.test(text)) return 'Survival';
    if (/\b(?:listen|hear|spot|watch|notice|see|observe)\b/.test(text)) return 'Perception';
    if (/\b(?:sneak|hide|quiet|unseen)\b/.test(text)) return 'Stealth';
    if (/\b(?:lock|latch|mechanism|palm|lift the key|disarm)\b/.test(text)) return 'Sleight of Hand';
    if (/\b(?:rune|spell|arcane|magic|ward|enchant)\b/.test(text)) return 'Arcana';
    if (/\b(?:history|ancient|chronicle|historical|remember who)\b/.test(text)) return 'History';
    if (/\b(?:motive|read the guard|read the merchant|tell if)\b/.test(text)) return 'Insight';
    if (/\b(?:inspect|examine|search|investigat|clue|evidence|deduction|stonework|tracks?)\b/.test(text)) return 'Investigation';
    return 'Investigation';
  }
  return typeof sr21SkillFor === 'function' ? sr21SkillFor(mode, action, null, null) : 'Investigation';
}

function sr23DifficultyDC(action) {
  const text = String(action || '').toLowerCase();
  if (/\b(?:nearly impossible|impossible|mythic|legendary|perfectly concealed|unbreakable)\b/.test(text)) return 30;
  if (/\b(?:very hard|masterwork|masterfully|expertly guarded|ancient ward|heavily fortified)\b/.test(text)) return 25;
  if (/\b(?:hard|difficult|dangerous|under fire|while pursued|during a storm|raging river|collapsing|time is running out|sentinels|sentries|trapped)\b/.test(text)) return 20;
  if (/\b(?:easy|simple|uncomplicated|weak lock|poorly guarded)\b/.test(text)) return 10;
  if (/\b(?:very easy|obvious|unlocked|unopposed|at leisure)\b/.test(text)) return 5;
  return 15;
}

function sr23PlanAction(text, options = {}) {
  const action = String(text || '').trim().slice(0, 500);
  if (!action) throw new Error('Describe what your character is trying to do.');
  const detected = sr23FindIntent(action);
  const requestedMode = String(options.mode || 'auto');
  const mode = ['exploration', 'social', 'travel', 'tactical', 'survival', 'campaign'].includes(requestedMode) && requestedMode !== 'auto'
    ? requestedMode : detected.mode;
  const rest = mode === 'survival' && sr23IsRest(action);
  const requiresCheck = !rest && sr23HasMeaningfulRisk(action, mode);
  const target = typeof sr20FindNPC === 'function' ? sr20FindNPC(options.target, action) : null;
  const skill = requiresCheck ? sr23SkillFor(mode, action, options.skill) : null;
  const dc = requiresCheck ? sr23DifficultyDC(action) : null;
  let finalMode = mode;
  let finalTarget = target?.name || String(options.target || '');
  if (!requiresCheck && (mode === 'social' || mode === 'exploration')) {
    finalMode = 'campaign';
    finalTarget = '';
  }
  const reason = rest
    ? 'Resting is a time-and-resource activity; it does not call for an ability check by default.'
    : requiresCheck
      ? 'The outcome is uncertain and a meaningful consequence is at stake.'
      : mode === 'travel'
        ? 'The route has no stated hazard; ordinary travel advances time and uses supplies without a check.'
        : 'The action is straightforward or unopposed; no roll is needed.';
  return {
    version: SR23_VERSION, action, detectedMode: detected.mode, mode: finalMode,
    skill, dc, requiresCheck, noRoll: !requiresCheck, reason,
    target: finalTarget, checkType: requiresCheck ? 'ability-check' : 'none',
    intent: detected.verb || 'freeform', explicitMode: finalMode !== detected.mode
  };
}

function sr23EnsureCampaign() {
  const campaign = state?.campaign;
  if (!campaign) return null;
  campaign.sr23 = campaign.sr23 && typeof campaign.sr23 === 'object' ? campaign.sr23 : {};
  const data = campaign.sr23;
  data.version = SR23_VERSION;
  data.events = Array.isArray(data.events) ? data.events.slice(-SR23_EVENT_LIMIT) : [];
  data.lastRuling = data.lastRuling && typeof data.lastRuling === 'object' ? data.lastRuling : null;
  return data;
}

function sr23TagsFor(action) {
  const text = String(action || '').toLowerCase();
  const tags = [];
  if (/\b(?:promise|swear|vow|owe you|repay)\b/.test(text)) tags.push('promise');
  if (/\b(?:suspect|believe|think|hypothesis|might be|could be)\b/.test(text)) tags.push('player-hypothesis');
  if (/\b(?:clue|evidence|tracks|symbol|letter|map|rune|footprint)\b/.test(text)) tags.push('evidence-reference');
  if (/\b(?:help|aid|rescue|save|protect)\b/.test(text)) tags.push('aid');
  if (/\b(?:betray|threaten|accuse|insult|steal|attack)\b/.test(text)) tags.push('conflict');
  return tags;
}

function sr23RecordEvent(outcome, plan) {
  const data = sr23EnsureCampaign();
  if (!data || !outcome || !plan) return null;
  const event = {
    id: String(outcome.id || (typeof sr20Id === 'function' ? sr20Id() : Date.now())),
    day: Math.max(1, Number(outcome.day) || 1),
    location: String(state.campaign.location || '').slice(0, 100),
    target: String(outcome.target || plan.target || '').slice(0, 80),
    mode: String(outcome.mode || plan.mode || 'campaign'),
    action: String(outcome.action || plan.action || '').slice(0, 500),
    tags: sr23TagsFor(outcome.action || plan.action),
    checkType: outcome.noRoll ? 'none' : 'ability-check',
    skill: String(outcome.skill || plan.skill || ''),
    dc: Number.isFinite(Number(outcome.dc)) ? Number(outcome.dc) : null,
    total: Number.isFinite(Number(outcome.total)) ? Number(outcome.total) : null,
    success: outcome.noRoll ? null : !!outcome.success,
    noRoll: !!outcome.noRoll,
    recordedAt: String(outcome.createdAt || new Date().toISOString())
  };
  data.events.push(event);
  if (data.events.length > SR23_EVENT_LIMIT) data.events.splice(0, data.events.length - SR23_EVENT_LIMIT);
  data.lastRuling = {
    id: event.id, day: event.day, mode: event.mode, action: event.action,
    skill: event.skill, dc: event.dc, success: event.success, noRoll: event.noRoll
  };
  return event;
}

function sr23RetrieveMemories(query, limit = SR23_MEMORY_LIMIT) {
  const data = sr23EnsureCampaign();
  if (!data) return [];
  const words = new Set(sr23Normalize(query).split(' ').filter(x => x.length >= 3));
  const events = data.events.map((event, index) => {
    const haystack = sr23Normalize([event.action, event.location, event.target, ...(event.tags || [])].join(' '));
    let score = Math.max(0, index / Math.max(1, data.events.length));
    for (const word of words) if (haystack.includes(word)) score += word.length >= 6 ? 3 : 1;
    if (query && event.target && sr23Normalize(query).includes(sr23Normalize(event.target))) score += 5;
    return { event, score };
  });
  return events.sort((a, b) => b.score - a.score || b.event.day - a.event.day)
    .slice(0, Math.max(1, Math.min(20, Number(limit) || SR23_MEMORY_LIMIT)))
    .map(({ event }) => ({
      day: event.day, location: event.location, target: event.target, mode: event.mode,
      action: event.action, tags: (event.tags || []).slice(), result: event.noRoll ? 'no-check' : (event.success ? 'success' : 'complication'),
      skill: event.skill, dc: event.dc
    }));
}

function sr23RulingText(plan, outcome) {
  if (outcome.noRoll) return 'Director ruling: no check. ' + plan.reason;
  return 'Director ruling: ' + String(outcome.skill || plan.skill) + ' ability check, DC ' +
    String(outcome.dc || plan.dc) + '. ' + plan.reason;
}

function sr23OfflineNarration(plan, outcome) {
  if (outcome.noRoll) {
    if (outcome.mode === 'travel') return 'The party follows the open route. The journey advances, and carried supplies are consumed as time passes.';
    if (outcome.mode === 'survival') return 'The party settles into camp. Rest advances the world clock and eases the journey’s accumulated strain.';
    return 'The action is straightforward. You carry it out without a roll, and the scene remains open for what you do next.';
  }
  const success = !!outcome.success;
  const lines = {
    exploration: success
      ? 'You examine the details methodically and make a useful breakthrough in the investigation.'
      : 'The details resist a clear answer. The attempt costs time or exposes a complication, but the investigation remains open.',
    social: success
      ? 'You make your case convincingly. The other side has reason to consider what you have said.'
      : 'Your approach meets resistance. The conversation is still yours to continue, but the other side is less receptive.',
    travel: success
      ? 'You negotiate the difficult stretch of the journey and keep the party moving.'
      : 'The route proves hazardous. Progress comes at a cost, and the party must account for the setback.',
    tactical: success
      ? 'Your maneuver creates a tactical opening that can shape the next exchange.'
      : 'The opposition reads your maneuver. You have not gained the opening you wanted, and the position remains dangerous.',
    survival: success
      ? 'Your practical knowledge gets the better of the conditions.'
      : 'The conditions make the task harder than expected. The party must adapt rather than assume the attempt worked.',
    campaign: success
      ? 'Your approach creates an opening in the current situation.'
      : 'The plan meets resistance. The setback changes the situation without closing off other choices.'
  };
  return lines[outcome.mode] || lines.campaign;
}

function sr23TakeField(html, id) {
  const marker = 'for="' + id + '"';
  const position = html.indexOf(marker);
  if (position < 0) return { html, field: '' };
  const start = html.lastIndexOf('<div class="field">', position);
  const end = html.indexOf('</div>', position);
  if (start < 0 || end < 0) return { html, field: '' };
  const field = html.slice(start, end + 6);
  return { html: html.slice(0, start) + html.slice(end + 6), field };
}

function sr23DirectorPanel() {
  let html = typeof sr21GameplayPanel === 'function' ? sr21GameplayPanel() : '';
  if (!html) return html;
  html = html.replace(
    'Describe an action in your own words. The Director classifies the approach, your character’s training shapes the check, and the world remembers the result.',
    'Tell the Director what your character is trying to do. The Director decides whether a roll is needed, which ability or skill fits, and how difficult the task is. Your character’s training and the established campaign guide the ruling.'
  );
  html = html.replace(
    'Choose an approach, or let the Director decide.',
    'Describe what your character tries. The Director handles the rules and the roll.'
  );

  const moved = [];
  for (const id of ['sr20-action-mode', 'sr20-challenge', 'sr20-skill', 'sr20-roll-state', 'sr20-action-target']) {
    const result = sr23TakeField(html, id);
    html = result.html;
    if (result.field) moved.push(result.field);
  }

  let controls = '';
  const start = html.indexOf('<div class="two-col"><div class="field"><label for="sr21-skill">');
  if (start >= 0) {
    const end = html.indexOf('<div class="field"><label for="sr20-action-text">', start);
    if (end > start) {
      controls = html.slice(start, end);
      html = html.slice(0, start) + html.slice(end);
    }
  }

  const details = '<details class="card" id="sr23-advanced" style="margin:8px 0"><summary>Advanced controls · override the Director (optional)</summary>' +
    '<p class="muted smalltext">Leave these set to Automatic for normal play. Overrides are intended for house rules, accessibility, or a specific table ruling.</p>' +
    moved.join('') + controls + '</details>';
  const form = '<form id="sr20-action-form"';
  const formStart = html.indexOf(form);
  const openEnd = formStart >= 0 ? html.indexOf('>', formStart) + 1 : -1;
  if (openEnd > 0) html = html.slice(0, openEnd) + details + html.slice(openEnd);
  html = html.replace('>Resolve action</button>', '>Ask the Director</button>');
  html = html.replace('Your character’s action', 'What do you do?');
  html = html.replace('Example: I study the muddy tracks beside the old road, looking for how many riders passed and where they went.', 'Describe your intent, approach, and anything your character uses. Example: I study the muddy tracks to learn how many riders passed and where they went.');
  return html;
}

function sr23ConfiguredAI() {
  if (typeof srAIKey !== 'undefined' && srAIKey) return true;
  try {
    return !!(typeof SR_AI_STORAGE !== 'undefined' && localStorage.getItem(SR_AI_STORAGE) && typeof srAIHasConnection === 'function' && srAIHasConnection());
  } catch (error) {
    return false;
  }
}

function sr23NarrateWithModel(outcome, plan) {
  if (!sr23ConfiguredAI() || typeof srAICall !== 'function') return;
  const eventId = String(outcome.id || '');
  const context = typeof srAIContext === 'function' ? srAIContext() : {};
  const prompt = [
    'The rules engine has already resolved this player action. Your only job is to narrate the result.',
    'Do not make a new ruling, call for another roll, alter any numbers, award rewards, change inventory, add damage, create NPCs, or advance a quest.',
    'Use established campaign facts and the event memory below. Treat player hypotheses as hypotheses, not confirmed facts.',
    'Do not narrate the player character’s private thoughts, emotions, dialogue, or decisions.',
    'Do not invent a clue, object, person, location, injury, or consequence that is not supported by the supplied scene and result.',
    'Write 2–4 vivid but restrained sentences, then leave the player with a natural opening to act.',
    'Return only JSON in the existing conversation format: {"reply":"..."}',
    'Player action: ' + outcome.action,
    'Rules result: ' + JSON.stringify({ mode: outcome.mode, noRoll: outcome.noRoll, skill: outcome.skill, dc: outcome.dc, roll: outcome.die, total: outcome.total, success: outcome.success, ruling: outcome.ruling }),
    'Director plan: ' + JSON.stringify(plan),
    'Campaign context: ' + JSON.stringify(context)
  ].join('\n');
  Promise.resolve().then(() => srAICall('conversation', prompt)).then(raw => {
    const parsed = typeof srAIParseJSON === 'function' ? srAIParseJSON(raw) : null;
    const narration = String(parsed?.reply || raw || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, 1000);
    if (!narration || !state?.campaign?.sr20?.lastOutcome || String(state.campaign.sr20.lastOutcome.id) !== eventId) return;
    const current = state.campaign.sr20.lastOutcome;
    current.narrative = narration + '\n\n' + String(current.ruling || '');
    current.narrationSource = 'connected-model';
    const data = sr23EnsureCampaign();
    if (data?.lastRuling?.id === eventId) data.lastRuling.narrationSource = 'connected-model';
    try { save(); render(); } catch (error) { console.warn('Director narration could not be saved:', error); }
  }).catch(error => {
    console.warn('Connected Director narration unavailable; keeping the rules-based result:', error);
  });
}

function sr23ResolvePlayerAction(text, options = {}) {
  const action = String(text || '').trim().slice(0, 500);
  if (!action) throw new Error('Describe what your character is trying to do.');
  if (!state?.character || !state?.campaign) throw new Error('Start a campaign before taking a gameplay action.');

  const resolved = typeof sr21ResolveOptions === 'function' ? sr21ResolveOptions(options) : { ...(options || {}) };
  const explicitMode = String(resolved.mode || 'auto') !== 'auto';
  const explicitSkill = String(resolved.skill || 'auto') !== 'auto';
  const explicitDifficulty = String(resolved.difficulty || 'auto') !== 'auto';
  const explicitDC = Number.isFinite(Number(resolved.dc)) && Number(resolved.dc) >= 5 && Number(resolved.dc) <= 30;
  const plan = sr23PlanAction(action, {
    mode: explicitMode ? resolved.mode : 'auto',
    skill: explicitSkill ? resolved.skill : 'auto',
    target: resolved.target || options.target || ''
  });

  resolved.mode = plan.mode;
  if (!explicitSkill && plan.skill) resolved.skill = plan.skill;
  if (!explicitDifficulty && !explicitDC) {
    resolved.difficulty = 'auto';
    resolved.dc = plan.dc;
    resolved.challenge = 'standard';
  } else if (explicitDifficulty) {
    delete resolved.dc;
  }
  resolved.noRoll = plan.noRoll && !explicitDifficulty && !explicitDC;
  if (resolved.noRoll) resolved.objectiveId = '__sr23_no_automatic_progress__';
  if (!plan.target) resolved.target = '';
  else resolved.target = plan.target;

  const outcome = sr21ResolvePlayerAction(action, resolved);
  outcome.directorVersion = SR23_VERSION;
  outcome.ruling = sr23RulingText(plan, outcome);
  outcome.narrative = sr23OfflineNarration(plan, outcome) + '\n\n' + outcome.ruling;
  outcome.narrationSource = 'offline-rules';
  const data = sr23EnsureCampaign();
  sr23RecordEvent(outcome, plan);
  if (data?.events?.length) {
    const lastEvent = data.events[data.events.length - 1];
    if (lastEvent?.id === outcome.id) lastEvent.narrationSource = outcome.narrationSource;
  }
  try { save(); } catch (error) { console.warn('Director event memory could not be saved:', error); }
  sr23NarrateWithModel(outcome, plan);
  return outcome;
}

const sr23GameplayBase = sr20GameplayPanel;
sr20GameplayPanel = function() { return sr23DirectorPanel(); };
sr20ResolvePlayerAction = function(text, options = {}) { return sr23ResolvePlayerAction(text, options); };

const sr23ContextBase = srAIContext;
srAIContext = function() {
  const context = sr23ContextBase();
  if (!state?.campaign) return context;
  const data = sr23EnsureCampaign();
  context.campaign = context.campaign || {};
  context.campaign.gameplayV23 = {
    version: SR23_VERSION,
    recentActions: data.events.slice(-12).map(event => ({
      day: event.day, location: event.location, target: event.target, mode: event.mode,
      action: event.action, result: event.noRoll ? 'no-check' : (event.success ? 'success' : 'complication')
    })),
    recalledEvents: sr23RetrieveMemories('', SR23_MEMORY_LIMIT),
    memoryPolicy: 'Recorded player actions and outcomes; player hypotheses are not established world facts.'
  };
  return context;
};

globalThis.__SR23_TEST = {
  version: SR23_VERSION,
  inferIntent: sr23FindIntent,
  needsCheck: sr23HasMeaningfulRisk,
  skillFor: sr23SkillFor,
  dcFor: sr23DifficultyDC,
  plan: sr23PlanAction,
  ensure: sr23EnsureCampaign,
  record: sr23RecordEvent,
  retrieve: sr23RetrieveMemories,
  context: () => srAIContext(),
  resolve: sr23ResolvePlayerAction,
  panel: sr23DirectorPanel,
  get state() { return state; },
  set state(value) { state = value; }
};
