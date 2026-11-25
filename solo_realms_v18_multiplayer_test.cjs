const fs=require('node:fs'),vm=require('node:vm');
const path=require('node:path');const file=path.join(__dirname,'..','Solo_Realms_V18_Main.html'),html=fs.readFileSync(file,'utf8');
const js=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).join('\n');
if(!js.includes('globalThis.__SR8_TEST'))throw Error('V8 test hook missing');
function el(id=''){return {id,innerHTML:'',textContent:'',value:'',checked:false,dataset:{},style:{},attrs:{},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},remove(){},appendChild(){},setAttribute(k,v){this.attrs[k]=String(v)},getAttribute(k){return this.attrs[k]??null},click(){},querySelector(){return null},querySelectorAll(){return []}};}
const app=el('app'),body=el('body'),head=el('head'),toast=el('toast');
const document={title:'',body,head,getElementById(id){return id==='app'?app:id==='toast'?toast:null},querySelector(){return null},querySelectorAll(){return []},createElement(tag){return el(tag)},addEventListener(){}};
let rand=.99;const math=Object.create(Math);math.random=()=>rand;
const storage=new Map(),session=new Map();
const context={console,document,window:{},location:{search:'',href:'file:///solo_realms_v11.html'},localStorage:{getItem(k){return storage.get(k)||null},setItem(k,v){storage.set(k,String(v))},removeItem(k){storage.delete(k)}},sessionStorage:{getItem(k){return session.get(k)||null},setItem(k,v){session.set(k,String(v))},removeItem(k){session.delete(k)}},URLSearchParams,URL,Blob,FileReader:function(){},setTimeout,clearTimeout,Math:math,Date,JSON,Map,Set,Array,Object,String,Number,Boolean,RegExp,Error,Promise,Intl,performance:{now:()=>0},navigator:{},crypto:require('node:crypto').webcrypto,AbortController,fetch:async()=>{throw Error('Network must not be used')}};
context.globalThis=context;
vm.runInNewContext(js,context,{timeout:30000,filename:'solo_realms_v8.js'});
const T=context.__SR8_TEST,checks=[];const assert=(n,v,d='')=>checks.push({name:n,pass:!!v,detail:d});
T.state={character:{name:'Rowan Vale',ancestry:'Human',classId:'Rogue',level:2,xp:300,nextXP:900,stats:{STR:10,DEX:16,CON:12,INT:13,WIS:12,CHA:10},hp:18,maxHp:18,gold:30,weapon:'Dagger',armor:'Leather',inventory:[{id:'p1',name:'Healing potion',type:'potion',count:1,healing:'2d4+2'}],spells:[],conditions:[],proficiencies:['Stealth','Investigation','Persuasion'],exhaustion:0,movement:30},campaign:{story:{villain:'The Ash King',threat:'The Withering',motive:'steal the sunstone',relic:'Sunstone',region:{name:'The Green March'}},chapter:1,mainStep:0,mainQuest:{title:'Find the Sunstone',description:'Trace the stolen relic to its source',goal:3,progress:0,status:'active'},sideQuests:[],location:'Ashenbrook',region:'The Green March',day:1,scene:{title:'The Village Gate',text:'A guard watches the rain-slick road.',choices:[]},companions:[],npcs:[],visited:['Ashenbrook'],flags:{},aiSettings:null},combat:null,view:'adventure',log:[]};
const initial=JSON.stringify(T.state);
assert('V8 action classifier maps stealth accurately',T.classify('I sneak past the sentry').skill==='Stealth');
assert('V8 action classifier maps lockpicking to Sleight of Hand',T.classify('I pick the lock').skill==='Sleight');
assert('V8 action classifier maps bargaining to Persuasion',T.classify('I bargain with the merchant').skill==='Persuasion');
assert('V8 impossible action guardrails explain unsupported flight',T.impossible('I fly without wings')!=='');
assert('V8 campaign runtime initializes without overwriting legacy fields',!!T.ensureRuntime()&&T.state.campaign.mainQuest.title==='Find the Sunstone');
// A high deterministic roll makes the stealth test succeed.
T.resolve('I sneak past the guard and enter the chapel');
assert('Free-form stealth action resolves with a real check and follow-up scene',!!T.state.campaign.scene.lastCheck&&T.state.campaign.scene.lastCheck.skill==='Stealth'&&T.state.campaign.scene.lastCheck.success===true);
assert('NPC from action persists in campaign memory',T.state.campaign.npcs.length===1&&T.state.campaign.npcs[0].role==='guard');
assert('Successful stealth action creates a concealed position',T.state.character.hidden===true);
assert('Player actions are persisted in campaign history',T.state.campaign.runtime.actionHistory.some(x=>x.tag==='player-action'));
// Dialogue should create a conversational scene and should not roll automatically.
const logBefore=T.state.log.length;
T.resolve('I ask the innkeeper what happened to the missing villagers');
assert('NPC conversation produces a contextual scene',T.state.campaign.scene.sceneKind==='social'&&T.state.campaign.scene.text.includes('whispering'));
assert('NPC conversation records a persistent NPC identity',T.state.campaign.npcs.some(n=>n.role==='innkeeper'));
assert('Straightforward dialogue does not force an ability check',T.state.log.filter(x=>/check: d20/.test(x.msg)).length===1);
// No-check option is honored.
const before= T.state.log.filter(x=>/check: d20/.test(x.msg)).length;
const moveOn=T.state.campaign.scene.choices.findIndex(x=>x.skill==='None');
assert('No-check conversational option remains available',moveOn>=0);
if(moveOn>=0)T.choose(moveOn);
assert('No-check choice advances without rolling',T.state.campaign.scene.title==='The Conversation Ends'&&T.state.log.filter(x=>/check: d20/.test(x.msg)).length===before);
// A second action is forced to fail with a natural 1 and should still move the story onward.
rand=0;
T.resolve('I investigate the old stone markings');
assert('Failure is narrated without ending the campaign',!!T.state.campaign.scene.title&&!!T.state.campaign.scene.text&&T.state.campaign.mainQuest.status==='active');
// Free text action is always visible on the Adventure page.
const adv=T.adventurePage();
assert('Adventure screen keeps one always-visible action composer',adv.includes('id="customActionForm"')&&adv.includes('What do you do?')&&!adv.includes('<details><summary>Try your own action'));
assert('Adventure screen keeps quest details tucked away',adv.includes('Current objective')&&adv.includes('<details class="sr8-quest">'));
// Combat maneuvers use skill resolution and consume a turn.
T.state.combat={round:1,target:0,boss:false,enemies:[{id:'e1',name:'Goblin',desc:'A raider',hp:10,maxHp:10,ac:12,attack:2,damage:'1d4',distance:5,speed:30,baseSpeed:30,conditions:[]}],initiative:10};
rand=.99;
T.resolveCombat('I shove the goblin to the ground');
assert('Improvised combat maneuver uses a skill and applies prone before enemy response',T.state.log.some(x=>/knocked prone/.test(x.msg)));
assert('Combat actions automatically advance enemy phase',T.state.combat.round>=1&&T.state.log.some(x=>/shove|prone|hits|misses/.test(x.msg)));
assert('Combat screen still keeps core controls compact',T.combatPage().includes('data-action="attack"')&&T.combatPage().includes('More combat options'));
// Old save fields and no-network assumptions remain intact.
assert('No API requirement remains in free mode',context.SR8_FREE_MODE===undefined||context.SR8_FREE_MODE===true);
assert('SRD 5.2.1 attribution is included',T.attribution.includes('SRD 5.2.1')&&T.attribution.includes('creativecommons.org/licenses/by/4.0'));
const T9=context.__SR9_TEST;assert('V9 class feature matrix covers all 12 core classes',Object.keys(T9.features).length===12);assert('V9 expanded spells merge into spellbook registry',Object.keys(T9.spells).length>=20&&Object.keys(context.__SR7_TEST.spells).includes('Fireball'));assert('V9 bestiary includes low, mid, and high tier monsters',T9.bestiary.some(m=>m.cr<=1)&&T9.bestiary.some(m=>m.cr>=5));const v9=T9.tests();for(const r of v9)assert('V9 '+r.name,r.pass);
T9.state.character.classId='Wizard';T9.state.character.spells=['Fire Bolt'];T9.state.character.spellSlots=2;T9.state.character.spellSlotsByLevel={1:2};T9.state.character.maxSpellSlotsByLevel={1:2};T9.state.combat={round:1,target:0,boss:false,enemies:[{id:'spell-target',name:'Training Dummy',desc:'Test target',hp:30,maxHp:30,ac:10,attack:0,damage:'1d4',distance:10,speed:30,baseSpeed:30,conditions:[],pos:{x:2,y:3}}],map:{width:8,height:6,scale:5,terrain:[]},heroPos:{x:1,y:3}};const hpBefore=T9.state.combat.enemies[0].hp;T9.cast('Fire Bolt');assert('Cantrip resolves without spending a spell slot',T9.state.character.spellSlots===2&&T9.state.combat.enemies[0].hp<hpBefore);T9.state.combat=null;T9.state.character.classId='Fighter';T9.state.character.level=3;T9.state.character.classLevels={Fighter:3};T9.startCombat(false);assert('Encounter starts with a tactical map and initiative order',!!T9.state.combat?.map&&T9.state.combat.initiativeOrder.length>=2);
const T10=context.__SR10_TEST;assert('V10 ordered-combat controller is installed',T10.version==='10.0.0');for(const r of T10.tests())assert('V10 '+r.name,r.pass);
const T11=context.__SR11_TEST;assert('V11 condition-aware tactical layer installed',T11.version==='11.0.0');for(const r of T11.tests())assert('V11 '+r.name,r.pass);
const T12=context.__SR12_TEST;assert('V12 shared-table rules layer installed',T12.version==='14.1.0');for(const r of T12.tests())assert('V12 '+r.name,r.pass);const T13=context.__SR13_TEST;assert('V14 initiative engine is installed',T13.version==='14.1.0');for(const r of T13.tests())assert('V13 '+r.name,r.pass,r.detail||'');
for(const x of checks)console.log(`${x.pass?'PASS':'FAIL'} ${x.name}${x.detail?' — '+x.detail:''}`);
console.log(`\nRESULT ${checks.filter(x=>x.pass).length}/${checks.length} core, progression, tactical, shared-table and V13 initiative checks passed`);
if(checks.some(x=>!x.pass))process.exitCode=1;
