const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'Solo_Realms_V18_Main.html'), 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1].trim());
if (scripts.length !== 1) throw new Error('Expected one self-contained game runtime.');
const pwaHtml = fs.readFileSync(path.join(root, 'pwa', 'index.html'), 'utf8');
const pagesHtml = fs.readFileSync(path.join(root, 'docs', 'index.html'), 'utf8');
const runtimeSource = fs.readFileSync(path.join(root, 'source', 'solo_realms_v18.js'), 'utf8');
const pwaServiceWorker = fs.readFileSync(path.join(root, 'pwa', 'sw.js'), 'utf8');
const pagesServiceWorker = fs.readFileSync(path.join(root, 'docs', 'sw.js'), 'utf8');

const nodes = new Map();
const documentListeners = [];
function element(id = '') {
  return {
    id, value: '', checked: false, dataset: {}, style: {}, children: [],
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {}, removeEventListener() {}, appendChild(child) { this.children.push(child); },
    setAttribute() {}, getAttribute() { return null; }, focus() {}, closest() { return null; },
    querySelector() { return null; }, querySelectorAll() { return []; },
    click() {}, remove() {}
  };
}
const app = element('app');
const body = element('body');
const head = element('head');
nodes.set('app', app);
const document = {
  title: '', body, head,
  getElementById(id) { return nodes.get(id) || null; },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  createElement(tag) { return element(tag); },
  addEventListener(type, callback, capture) { documentListeners.push({ type, callback, capture }); }
};
const storage = new Map();
const session = new Map();
const math = Object.create(Math);
math.random = () => 0.49;
const context = {
  console, document, window: {}, location: { protocol: 'https:', search: '', href: 'https://example.invalid/' },
  localStorage: { getItem(key) { return storage.get(key) || null; }, setItem(key, value) { storage.set(key, String(value)); }, removeItem(key) { storage.delete(key); } },
  sessionStorage: { getItem(key) { return session.get(key) || null; }, setItem(key, value) { session.set(key, String(value)); }, removeItem(key) { session.delete(key); } },
  URLSearchParams, URL, Blob, FileReader: function() {}, setTimeout, clearTimeout, Math: math, Date, JSON,
  Map, Set, Array, Object, String, Number, Boolean, RegExp, Error, Promise, Intl,
  performance: { now: () => 0 }, navigator: { onLine: true },
  crypto: require('node:crypto').webcrypto, AbortController,
  fetch: async () => { throw Error('Network disabled in V23 regression test'); }
};
context.globalThis = context;
vm.runInNewContext(scripts[0], context, { timeout: 60000, filename: 'Solo_Realms_V23_Director' });

const T = context.__SR23_TEST;
const T18 = context.__SR18_TEST;
const T20 = context.__SR20_TEST;
const T21 = context.__SR21_TEST;
if (!T || !T18 || !T20 || !T21) throw new Error('V18/V20/V21/V23 test interfaces missing.');

const checks = [];
const assert = (name, pass, detail = '') => checks.push({ name, pass: !!pass, detail });
const hero = (level = 5) => ({
  name: 'Director Tester', classId: 'Rogue', ancestry: 'Human', level,
  classLevels: { Rogue: level }, hp: 30, maxHp: 30, xp: 0, gold: 20,
  stats: { STR: 10, DEX: 16, CON: 12, INT: 14, WIS: 12, CHA: 10 },
  proficiencies: ['Stealth', 'Investigation', 'Deception', 'Persuasion', 'Survival'],
  expertise: ['Stealth'],
  inventory: [
    { name: 'Rations', type: 'supply', count: 8 },
    { name: 'Waterskin', type: 'supply', count: 8 }
  ],
  spells: [], conditions: [], activeEffects: []
});
const reset = () => {
  T.state = {
    character: hero(),
    campaign: {
      day: 1, chapter: 1, region: 'Ashen Vale', location: 'Old Road',
      title: 'The Lost Cistern',
      npcs: [{ id: 'mara', name: 'Mara Venn', role: 'Innkeeper', faction: 'Free Traders', relationship: 0 }],
      companions: [], sideQuests: [],
      mainQuest: { title: 'Find the hidden cistern', goal: 'Search the old watchtower and question its keeper', progress: 0, target: 2 }
    },
    log: [], combat: null, view: 'adventure'
  };
  T.ensure();
  T20.ensure();
};

try {
  reset();
  assert('V23 module version is present', T.version === '23.0.0');
  const modelFallback = T.plan('I persuade Mara Venn to reveal what she knows.');
  const nestedRuling = T.extractModelPlan(JSON.stringify({ reply: JSON.stringify({ mode: 'social', requiresCheck: true, skill: 'Persuasion', dc: 15, reason: 'The keeper is hesitant.' }) }));
  assert('Connected Director ruling parser unwraps the established conversation reply envelope', nestedRuling?.mode === 'social' && nestedRuling?.skill === 'Persuasion' && nestedRuling?.dc === 15);
  assert('Connected Director ruling parser rejects non-JSON reply text', T.extractModelPlan(JSON.stringify({ reply: 'I would ask for Persuasion.' })) === null);
  const modelPlan = T.validateModelPlan({ mode: 'social', requiresCheck: true, skill: 'Persuasion', dc: 20, reason: 'Mara has a reason to withhold the information.' }, 'I persuade Mara Venn to reveal what she knows.', modelFallback);
  assert('A valid connected-Director ruling is accepted as a structured plan', modelPlan.source === 'connected-model' && modelPlan.mode === 'social' && modelPlan.skill === 'Persuasion' && modelPlan.dc === 20);
  const invalidSkillPlan = T.validateModelPlan({ mode: 'social', requiresCheck: true, skill: 'Arcane Persuasion', dc: 20 }, 'I persuade Mara Venn to reveal what she knows.', modelFallback);
  assert('An invalid model skill is rejected in favor of the local ruling', invalidSkillPlan.source !== 'connected-model' && invalidSkillPlan.skill === modelFallback.skill);
  const invalidDCPlan = T.validateModelPlan({ mode: 'social', requiresCheck: true, skill: 'Persuasion', dc: 12 }, 'I persuade Mara Venn to reveal what she knows.', modelFallback);
  assert('A model DC outside the standard scale is rejected', invalidDCPlan.source !== 'connected-model' && invalidDCPlan.dc === modelFallback.dc);
  const rulingPrompt = T.buildRulingPrompt('I persuade Mara Venn to reveal what she knows.', modelFallback, { campaign: { title: 'The Lost Cistern' } });
  assert('The connected Director prompt forbids skill-check substitution for attacks and spell attacks', rulingPrompt.includes('weapon attack, spell attack, saving throw') && rulingPrompt.includes('Do not roll dice.'));
  const memoryPrompt = T.buildRulingPrompt('I ask Mara Venn about the silver key.', modelFallback, {}, [{ day: 2, target: 'Mara Venn', action: 'I promised Mara I would return the silver key.' }]);
  assert('Connected Director prompts include action-relevant continuity events', memoryPrompt.includes('Relevant prior events') && memoryPrompt.includes('silver key'));
  const restFallback = T.plan('We make camp and rest for the night.');
  const restModelPlan = T.validateModelPlan({ mode: 'survival', requiresCheck: true, skill: 'Survival', dc: 25 }, 'We make camp and rest for the night.', restFallback);
  assert('A model cannot turn a normal long rest into an ability check', restModelPlan.noRoll === true && restModelPlan.skill === null);
  assert('V23 Director module is included in the standalone runtime', scripts[0].includes("const SR23_VERSION = '23.0.0';"));
  assert('V23 Director module is included in the PWA runtime', pwaHtml.includes("const SR23_VERSION = '23.0.0';"));
  assert('V23 Director module is included in the GitHub Pages runtime', pagesHtml.includes("const SR23_VERSION = '23.0.0';"));
  assert('V23 Director source is included in the canonical assembled runtime', runtimeSource.includes("const SR23_VERSION = '23.0.0';"));
  assert('The PWA service worker uses a fresh V29 cache namespace', /solo-realms-systems-v29-[a-f0-9]+/.test(pwaServiceWorker));
  assert('GitHub Pages receives the same V25 service-worker cache namespace', pagesServiceWorker === pwaServiceWorker);
  assert('Negated attack is ignored when the player chooses persuasion instead', T.inferIntent("I don't attack the guard; I try to persuade him to let us pass.").mode === 'social');
  assert('A direct attack is classified as tactical', T.inferIntent('I attack the bandit').mode === 'tactical');
  assert('Weapon attacks are not adjudicated as ability checks in the free-form action form', T.requiresDedicatedCombatAction('I attack the bandit'));
  assert('Spell casts are routed to their dedicated resolver', T.requiresDedicatedCombatAction('I cast Fireball at the ogre'));
  assert('A negated attack does not force the combat resolver', !T.requiresDedicatedCombatAction("I don't attack the guard; I persuade him instead"));
  assert('Connected model adjudication is installed as a document-level capture handler', documentListeners.some(item => item.type === 'submit' && item.capture === true));
  assert('An investigation is classified as exploration', T.inferIntent('I investigate the muddy tracks').mode === 'exploration');
  assert('A safe road journey is classified as travel', T.plan('We travel along the open road to the next village').mode === 'travel');
  assert('A routine social question does not force a check', T.plan('I ask Mara Venn about the weather').noRoll === true);
  assert('The phrase “the rest of the map” is not mistaken for a rest action', T.plan('I ask Mara to show me the rest of the map').mode === 'campaign');
  assert('A persuasive request calls for an ability check', T.plan('I persuade the gate guard to let us pass').requiresCheck === true);
  assert('The Director selects the relevant Persuasion skill', T.plan('I persuade the gate guard to let us pass').skill === 'Persuasion');
  assert('Inspecting physical evidence selects Investigation, not wilderness tracking', T.skillFor('exploration', 'I inspect the broken stonework for concealed tracks') === 'Investigation');
  assert('Following a trail selects Survival', T.skillFor('exploration', 'I follow the tracks into the woods') === 'Survival');
  assert('A deception attempt calls for a check', T.plan('I lie to Mara Venn about the stolen keys').requiresCheck === true);
  assert('The Director selects Deception for a lie', T.plan('I lie to Mara Venn about the stolen keys').skill === 'Deception');
  assert('A dangerous river crossing calls for a check', T.plan('We cross a raging river during a storm').requiresCheck === true);
  assert('The 2024-style typical DC scale is used for a hard task', T.dcFor('I cross a dangerous, collapsing bridge') === 20);
  assert('A very easy task maps to DC 5 before the broad easy match', T.dcFor('I complete a very easy, obvious task') === 5);
  assert('An easy task maps to DC 10', T.dcFor('I complete an easy task') === 10);
  assert('A nearly impossible task receives DC 30', T.dcFor('I attempt a nearly impossible feat') === 30);
  assert('A simple unopposed action is not forced into an ability check', T.plan('I open the unlocked wooden door').noRoll === true);
  assert('An explicit player DC override can deliberately request a check', (() => {
    reset();
    const forced = T.resolve('I open the unlocked wooden door.', { dc: 20, roll: 15 });
    return forced.noRoll === false && forced.dc === 20;
  })());

  reset();
  let attackRejected = false;
  try { T.resolve('I attack the bandit'); } catch (error) { attackRejected = /dedicated Combat or Spells controls/.test(error.message); }
  assert('The local adjudicator refuses to fake an ability check for a weapon attack', attackRejected);

  reset();
  const safeTravel = T.resolve('We travel along the open road to the next village.');
  assert('Safe travel resolves without rolling', safeTravel.noRoll === true && safeTravel.die === null);
  assert('Safe travel still advances the journey clock', T.state.campaign.sr20.clock.watch === 1);
  assert('Safe travel does not falsely advance a quest objective', (T.state.campaign.sr20.objectives || []).every(item => item.progress === 0));

  reset();
  const shortTalk = T.resolve('I ask Mara Venn about the weather.');
  assert('Routine conversation resolves without an artificial social check', shortTalk.noRoll === true && shortTalk.mode === 'campaign');
  assert('Routine conversation does not farm NPC relationship points', Number(T.state.campaign.npcs[0].sr20?.relationship || 0) === 0);

  reset();
  const connectedPlan = T.validateModelPlan({ mode: 'social', requiresCheck: true, skill: 'Persuasion', dc: 20, reason: 'The keeper is reluctant.' }, 'I persuade Mara Venn to tell me what she saw.', T.plan('I persuade Mara Venn to tell me what she saw.'));
  const connectedOutcome = T.resolve('I persuade Mara Venn to tell me what she saw.', { directorPlan: connectedPlan, roll: 15 });
  assert('A valid connected ruling is passed into the deterministic rules resolver', connectedOutcome.rulingSource === 'connected-model' && connectedOutcome.dc === 20);

  reset();
  const check = T.resolve('I persuade Mara Venn to tell me what she saw.', { roll: 15 });
  assert('A meaningful social action uses a deterministic engine check', check.noRoll === false && check.skill === 'Persuasion' && Number.isFinite(check.dc));
  assert('Character proficiency is still applied by the existing rules engine', check.bonus.proficiency > 0);
  assert('The Director ruling is recorded with the action', String(check.ruling || '').includes('ability check'));
  assert('A structured continuity event is recorded', T.state.campaign.sr23.events.length === 1 && T.state.campaign.sr23.events[0].action === check.action);
  assert('Continuity records preserve the ruling source and rationale', T.state.campaign.sr23.events[0].rulingSource === 'local-rules' && !!T.state.campaign.sr23.events[0].reason);

  reset();
  T.state.campaign.sr20.objectives = [{
    id: 'tower', type: 'main', title: 'Look at the watchtower',
    detail: 'Go to the watchtower and look at its exterior', progress: 0, goal: 2, status: 'active'
  }];
  const freeAction = T.resolve('I look at the watchtower.');
  assert('A no-roll action does not advance an objective just because its words overlap', freeAction.noRoll === true && T.state.campaign.sr20.objectives[0].progress === 0);

  reset();
  const rest = T.resolve('We make camp and rest for the night.');
  assert('Rest remains a no-check activity', rest.noRoll === true && rest.die === null);
  assert('An eight-hour rest advances two four-hour watches', T.state.campaign.sr20.clock.watch === 2);

  reset();
  T.record({ id: 'memory-1', day: 1, action: 'I promised Mara Venn I would repay the lost silver.', target: 'Mara Venn', mode: 'social', noRoll: true }, { action: 'I promised Mara Venn I would repay the lost silver.', mode: 'campaign', noRoll: true, checkType: 'none' });
  T.record({ id: 'memory-2', day: 2, action: 'I found unusual tracks beside the northern road.', target: '', mode: 'exploration', noRoll: false, success: true, skill: 'Survival', dc: 15 }, { action: 'I found unusual tracks beside the northern road.', mode: 'exploration', checkType: 'ability-check' });
  const remembered = T.retrieve('Mara Venn promise');
  assert('Continuity retrieval prioritizes relevant past interactions', remembered.length > 0 && remembered[0].target === 'Mara Venn' && remembered[0].tags.includes('promise'));
  const contextMemory = T.context().campaign.gameplayV23;
  assert('AI context includes bounded V23 continuity and its evidence policy', contextMemory.version === '23.0.0' && contextMemory.memoryPolicy.includes('hypotheses'));

  reset();
  for (let i = 0; i < 270; i++) {
    T.record({ id: 'event-' + i, day: i + 1, action: 'Recorded event ' + i, mode: 'campaign', noRoll: true }, { action: 'Recorded event ' + i, mode: 'campaign', noRoll: true, checkType: 'none' });
  }
  assert('Continuity memory is bounded and keeps the newest 240 events', T.state.campaign.sr23.events.length === 240 && T.state.campaign.sr23.events[239].id === 'event-269');

  reset();
  const panel = T.panel();
  const detailsStart = panel.indexOf('<details class="card" id="sr23-advanced"');
  const detailsEnd = panel.indexOf('</details>', detailsStart);
  const modeIndex = panel.indexOf('id="sr20-action-mode"');
  const skillIndex = panel.indexOf('id="sr21-skill"');
  const actionIndex = panel.indexOf('id="sr20-action-text"');
  assert('Player-facing action panel uses an ask-the-Director submit action', panel.includes('>Ask the Director</button>'));
  assert('The primary action panel does not ask players to choose their own approach', !panel.includes('Choose an approach, or let the Director decide.'));
  assert('Manual mechanics controls are preserved inside collapsed advanced settings', detailsStart >= 0 && detailsEnd > detailsStart && modeIndex > detailsStart && modeIndex < detailsEnd && skillIndex > detailsStart && skillIndex < detailsEnd);
  assert('The free-form action description is the primary visible interaction', actionIndex > detailsEnd && panel.includes('Tell the Director what your character is trying to do.'));
  assert('Legacy manual controls are not duplicated in the primary action form', (panel.match(/id="sr21-skill"/g) || []).length === 1 && (panel.match(/id="sr20-action-mode"/g) || []).length === 1);

} catch (error) {
  console.error(error);
  process.exitCode = 1;
}

const failed = checks.filter(item => !item.pass);
for (const item of checks) console.log((item.pass ? 'PASS ' : 'FAIL ') + item.name + (item.detail ? ' · ' + item.detail : ''));
console.log('V23 RESULT ' + (checks.length - failed.length) + '/' + checks.length + ' assertions passed');
if (failed.length) process.exitCode = 1;
