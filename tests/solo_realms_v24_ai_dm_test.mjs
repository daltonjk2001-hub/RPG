import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

const root = path.resolve('.');
const html = fs.readFileSync(path.join(root, 'Solo_Realms_V18_Main.html'), 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1].trim());
if (scripts.length !== 1) throw new Error('Expected one self-contained game runtime.');
const nodes = new Map();
function element(id = '') {
  return {
    id, value: '', checked: false, dataset: {}, style: {}, children: [],
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {}, removeEventListener() {}, appendChild(child) { this.children.push(child); },
    setAttribute() {}, getAttribute() { return null; }, focus() {}, closest() { return null; },
    querySelector() { return null; }, querySelectorAll() { return []; }, click() {}, remove() {}
  };
}
const app = element('app');
nodes.set('app', app);
const document = {
  title: '', body: element('body'), head: element('head'),
  getElementById(id) { return nodes.get(id) || null; },
  querySelector() { return null; }, querySelectorAll() { return []; },
  createElement(tag) { return element(tag); }, addEventListener() {}
};
const storage = new Map(), session = new Map();
const context = {
  console, document, window: {}, location: { protocol: 'https:', search: '', href: 'https://example.invalid/' },
  localStorage: {
    getItem(key) { return storage.get(key) || null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); }
  },
  sessionStorage: {
    getItem(key) { return session.get(key) || null; },
    setItem(key, value) { session.set(key, String(value)); },
    removeItem(key) { session.delete(key); }
  },
  URLSearchParams, URL, Blob, FileReader: function() {}, setTimeout, clearTimeout,
  Math, Date, JSON, Map, Set, Array, Object, String, Number, Boolean, RegExp, Error, Promise, Intl,
  performance: { now: () => 0 }, navigator: { onLine: true },
  crypto: webcrypto, AbortController, Response, TextEncoder,
  fetch: async () => { throw Error('Unexpected network use in test.'); }
};
context.globalThis = context;
vm.runInNewContext(scripts[0], context, { timeout: 60000, filename: 'Solo_Realms_V24_Custom_AI_DM' });
const T = context.__SR24_TEST;
const T23 = context.__SR23_TEST;
if (!T || !T23) throw new Error('V23/V24 test interfaces are missing.');
let passed = 0;
function assert(name, value) {
  if (!value) throw new Error('FAIL ' + name);
  passed++;
  console.log('PASS ' + name);
}
const storageKey = 'solo-realms-ai-provider-v1';
assert('V24 module is installed', T.version === '24.0.0');
assert('Blank gateway is rejected', T.validateEndpoint('').ok === false);
assert('HTTPS gateway is accepted', T.validateEndpoint('https://chronicler.example/api/director').ok === true);
assert('Remote HTTP gateway is rejected', T.validateEndpoint('http://chronicler.example/api/director').ok === false);
assert('Local development HTTP gateway is accepted', T.validateEndpoint('http://127.0.0.1:8787/api/director').ok === true);
assert('Unrelated endpoint path is rejected', T.validateEndpoint('https://chronicler.example/v1/responses').ok === false);
assert('Gateway credentials in URL are rejected', T.validateEndpoint('https://user:pass@chronicler.example/api/director').ok === false);
assert('Query strings on gateway URL are rejected', T.validateEndpoint('https://chronicler.example/api/director?key=secret').ok === false);
assert('Settings form shows a gateway URL and no browser API key input',
  T.settingsForm().includes('id="srAIEndpoint"') && !T.settingsForm().includes('id="srAIKey"'));
assert('Settings form explains server-side provider key storage', T.settingsForm().includes('provider API key stays on that server'));
assert('No configured gateway keeps offline mode active', T.connectionAvailable() === false);
assert('Offline call returns safely without fetch', await T.call('conversation', 'hello') === null);
assert('Unsupported task names are rejected', await T.call('unknown-task', 'hello').then(() => false, () => true));

const sampleState = {
  character: {
    name: 'Director Tester', classId: 'Rogue', ancestry: 'Human', level: 5, hp: 30, maxHp: 30,
    stats: { STR: 10, DEX: 16, CON: 12, INT: 14, WIS: 12, CHA: 10 },
    proficiencies: ['Stealth', 'Investigation', 'Persuasion', 'Survival'], expertise: ['Stealth'],
    inventory: [{ name: 'Rations', type: 'supply', count: 8 }], spells: [], conditions: [], activeEffects: []
  },
  campaign: {
    day: 1, chapter: 1, region: 'Ashen Vale', location: 'Old Road', title: 'The Lost Cistern',
    npcs: [{ id: 'mara', name: 'Mara Venn', role: 'Innkeeper', relationship: 0 }],
    companions: [], sideQuests: [],
    mainQuest: { title: 'Find the hidden cistern', progress: 0, target: 2 }
  },
  log: [], combat: null, view: 'adventure'
};
T23.state = sampleState;
T23.ensure();
context.localStorage.setItem(storageKey, JSON.stringify({ version: '24.0.0', gatewayEndpoint: 'https://chronicler.example/api/director' }));
assert('Stored gateway endpoint enables connected mode', T.connectionAvailable() === true);
let captured = null;
context.fetch = async (url, options) => {
  captured = { url: String(url), options, body: JSON.parse(options.body) };
  return new Response(JSON.stringify({ ok: true, output: '{"reply":"The guard watches the road."}' }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  });
};
const output = await T.call('conversation', 'Can Mara explain the silver key?');
assert('Browser posts to configured AI gateway', captured.url === 'https://chronicler.example/api/director');
assert('Gateway request identifies the V24 task contract', captured.body.version === '24.0.0' && captured.body.kind === 'conversation');
assert('Browser sends no provider credentials', captured.options.credentials === 'omit' && !('Authorization' in captured.options.headers));
assert('Gateway call returns structured output', output.includes('The guard watches the road.'));
context.fetch = async () => new Response(JSON.stringify({
  ok: true,
  output: JSON.stringify({ mode: 'social', requiresCheck: true, skill: 'Persuasion', dc: 15, reason: 'The keeper is reluctant.' })
}), { status: 200, headers: { 'Content-Type': 'application/json' } });
const plan = await T.requestPlan('I persuade Mara Venn to share what she knows.');
assert('Connected AI plan passes through V23 schema validation', plan.source === 'connected-model' && plan.skill === 'Persuasion' && plan.dc === 15);
context.fetch = async () => new Response(JSON.stringify({
  ok: true,
  output: JSON.stringify({ mode: 'social', requiresCheck: true, skill: 'NotARealSkill', dc: 99, reason: 'invalid' })
}), { status: 200, headers: { 'Content-Type': 'application/json' } });
const safePlan = await T.requestPlan('I persuade Mara Venn to share what she knows.');
assert('Invalid model plan is rejected in favor of local ruling', safePlan.source !== 'connected-model');
console.log('RESULT V24 client tests passed: ' + passed + '/' + passed);
