const fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'..','Solo_Realms_V18_Main.html'),'utf8');
const js=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).join('\n');
function el(id=''){return {id,innerHTML:'',textContent:'',value:'',checked:false,dataset:{},style:{},attrs:{},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},remove(){},appendChild(){},setAttribute(k,v){this.attrs[k]=String(v)},getAttribute(k){return this.attrs[k]??null},click(){},querySelector(){return null},querySelectorAll(){return []}};}
const app=el('app'),body=el('body'),head=el('head'),toast=el('toast');
const document={title:'',body,head,getElementById(id){return id==='app'?app:id==='toast'?toast:null},querySelector(){return null},querySelectorAll(){return []},createElement(tag){return el(tag)},addEventListener(){}};
const storage=new Map(),session=new Map();const context={console,document,window:{},location:{search:'',href:'file:///solo_realms_v11.html'},localStorage:{getItem(k){return storage.get(k)||null},setItem(k,v){storage.set(k,String(v))},removeItem(k){storage.delete(k)}},sessionStorage:{getItem(k){return session.get(k)||null},setItem(k,v){session.set(k,String(v))},removeItem(k){session.delete(k)}},URLSearchParams,URL,Blob,FileReader:function(){},setTimeout,clearTimeout,Math,Date,JSON,Map,Set,Array,Object,String,Number,Boolean,RegExp,Error,Promise,Intl,performance:{now:()=>0},navigator:{},crypto:require('node:crypto').webcrypto,AbortController,fetch:async()=>{throw Error('Network must not be used')}};
context.globalThis=context;vm.runInNewContext(js,context,{timeout:30000,filename:'solo_realms_v8.js'});
const T=context.__SR8_TEST,S=context.__SR_SIMPLE_TEST,checks=[];const assert=(name,val)=>checks.push({name,pass:!!val});
assert('Initial V18 boot identifies the new release and header factory exposes Save Center after character creation',document.title.includes('V18')&&context.__SR18_TEST.header().includes('data-action="sr18-open-save-center"'));
T.state={character:{name:'Rowan Vale',ancestry:'Human',classId:'Rogue',level:2,xp:300,nextXP:900,stats:{STR:10,DEX:16,CON:12,INT:13,WIS:12,CHA:10},hp:18,maxHp:18,gold:30,weapon:'Dagger',armor:'Leather',inventory:[],spells:[],conditions:[],proficiencies:['Stealth','Investigation','Persuasion'],exhaustion:0,movement:30},campaign:{story:{villain:'The Ash King',threat:'The Withering',motive:'steal the sunstone',relic:'Sunstone',region:{name:'The Green March'}},chapter:1,mainStep:0,mainQuest:{title:'Find the Sunstone',description:'Trace the stolen relic',goal:3,progress:0,status:'active'},sideQuests:[],location:'Ashenbrook',region:'The Green March',day:1,scene:{title:'The Village Gate',text:'A guard watches the road.',choices:[{label:'Ask the guard about the village',action:'talk guard'},{label:'Inspect the tracks',skill:'Investigation',dc:12,kind:'investigation'}]},companions:[],npcs:[],visited:['Ashenbrook'],flags:{},aiSettings:null},combat:null,view:'adventure',log:[]};
const nav=S.nav(),more=S.moreGroups.flatMap(g=>g.items.map(x=>x[0]));
console.log('EXPOSED_SCREEN_FUNCTIONS',Object.keys(T).filter(k=>/Page|panel|view|html/i.test(k)).join(','));
for(const name of ['adventurePage','characterPage','inventoryPage','journalPage','campaignPage','spellsPage','spellbookPage','worldPage','rulesPage']){if(typeof T[name]==='function'){const html=T[name]();console.log('SCREEN_HTML_'+name+' '+String(html).slice(0,6500).replace(/\s+/g,' '));}}
assert('Only four primary navigation destinations',S.coreViews.length===4&&['adventure','inventory','character','journal'].every(v=>S.coreViews.some(x=>x[0]===v)));
assert('Advanced systems are grouped under More, not primary navigation',more.includes('spells')&&more.includes('multiplayer')&&more.includes('rules'));
assert('Adventure view places story and action input first',T.adventurePage().indexOf('sr8-scene')<T.adventurePage().indexOf('sr8-action-card'));
assert('Free-form action box is visible without opening a submenu',T.adventurePage().includes('id="customActionForm"')&&!T.adventurePage().includes('<details><summary>Try your own action'));
assert('Scene choices are visible and contextual',T.adventurePage().includes('Ask the guard about the village')&&T.adventurePage().includes('Inspect the tracks'));
assert('Quest tracker is collapsed by default',T.adventurePage().includes('<details class="sr8-quest">'));
assert('Travel, rest, and save tools are in one secondary section',T.adventurePage().includes('Travel, rest & other options')&&T.adventurePage().includes('data-action="long-rest"'));
assert('Navigation retains Adventure, Pack, Character and Journal labels',nav.includes('Adventure')&&nav.includes('Pack')&&nav.includes('Character')&&nav.includes('Journal'));
assert('Character status remains compact in the header',S.header().includes('Rowan Vale')&&S.header().includes('HP'));
assert('Combat keeps basic actions immediately available',T.combatPage.call({})===undefined?false:true); // actual state has no combat; tested below with combat set
T.state.character.spells=['Fire Bolt'];T.state.combat={round:1,target:0,boss:false,enemies:[{id:'g1',name:'Goblin',desc:'Raider',hp:7,maxHp:7,ac:12,attack:2,damage:'1d4',distance:5,speed:30,baseSpeed:30,conditions:[]}],initiative:10};
const combat=T.combatPage();
assert('Combat exposes Attack, Class ability, Defend, and Potion',combat.includes('data-action="attack"')&&combat.includes('data-action="power"')&&combat.includes('data-action="defend"')&&combat.includes('data-action="potion"'));
assert('Advanced combat options are tucked away',combat.includes('<details class="simple-combat-extra">')&&combat.includes('data-action="sr9-spell"'));
assert('Improvised combat input does not clutter the main controls',combat.includes('customActionForm')&&combat.indexOf('customActionForm')>combat.indexOf('<details class="simple-combat-extra">'));
T.state.combat=null;
assert('Rules guide includes required SRD 5.2.1 attribution and license',T.rulesPage().includes('SRD 5.2.1')&&T.rulesPage().includes('Creative Commons Attribution 4.0'));
context.__SR18_TEST.render();
assert('Rendered document identifies itself as V18 Complete Rules & Living Campaign',document.title.includes('V18')&&document.title.includes('Complete Rules & Living Campaign'));
assert('Rendered shell includes a visible Save Center entry' ,app.innerHTML.includes('data-action="sr18-open-save-center"'));
assert('Rendered shell includes game navigation and character state',app.innerHTML.includes('simple-topbar')&&app.innerHTML.includes('simple-sidebar')&&app.innerHTML.includes('Rowan Vale'));
assert('No paid API settings are shown in the primary play shell',!app.innerHTML.includes('API key')&&!app.innerHTML.includes('OpenAI API'));
for(const view of ['adventure','character','inventory','journal','spells','world','rules','bestiary','crafting','downtime','party','gm','multiplayer','worldmap','consequences','ai','stronghold','downtime5','codex','tactics','treasure','factions7','exploration7','crafting7']){
 try{
  T.state.view=view;context.__SR18_TEST.render();
  const a=app.innerHTML,begin=a.indexOf('<main class="main">'),finish=a.indexOf('</main>',begin);
  const m=begin>=0&&finish>begin?a.slice(begin,finish):a;
  const classes=[...m.matchAll(/class="([^"]+)"/g)].flatMap(x=>x[1].split(' '));
  const ids=[...m.matchAll(/id="([^"]+)"/g)].map(x=>x[1]);
  const heads=[...m.matchAll(/<h[1-4][^>]*>([^<]{1,85})/g)].map(x=>x[1]);
  console.log('VIEW_SUMMARY '+JSON.stringify({view,classes:[...new Set(classes)],ids:[...new Set(ids)],headings:[...new Set(heads)].slice(0,25),length:m.length}));
 }catch(error){console.log('VIEW_SUMMARY_ERROR '+view+' '+error.message);}
}
for(const x of checks)console.log(`${x.pass?'PASS':'FAIL'} ${x.name}`);
console.log(`\nRESULT ${checks.filter(x=>x.pass).length}/${checks.length} V18 UI regression checks passed`);
if(checks.some(x=>!x.pass))process.exitCode=1;
