#!/usr/bin/env node
// Player-stage gameplay hardening regressions for Solo Realms V21.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','Solo_Realms_V18_Main.html'),'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
if(scripts.length!==1)throw new Error('Expected one self-contained application script');
function el(id=''){return {id,innerHTML:'',textContent:'',value:'',checked:false,dataset:{},style:{},attrs:{},files:[],classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},remove(){},appendChild(){},setAttribute(k,v){this.attrs[k]=String(v)},getAttribute(k){return this.attrs[k]??null},click(){},querySelector(){return null},querySelectorAll(){return []},focus(){}};}
const app=el('app'),body=el('body'),head=el('head'),toast=el('toast');
const document={title:'',body,head,getElementById(id){return id==='app'?app:id==='toast'?toast:null;},querySelector(){return null;},querySelectorAll(){return [];},createElement(tag){return el(tag);},addEventListener(){}};
const storage=new Map(),session=new Map();const math=Object.create(Math);math.random=()=>.999999;
const context={console,document,window:{},location:{protocol:'https:',search:'',href:'https://example.invalid/Solo_Realms_V18_Main.html'},
 localStorage:{getItem(k){return storage.has(k)?storage.get(k):null;},setItem(k,v){storage.set(k,String(v));},removeItem(k){storage.delete(k);}},
 sessionStorage:{getItem(k){return session.has(k)?session.get(k):null;},setItem(k,v){session.set(k,String(v));},removeItem(k){session.delete(k);}},
 URLSearchParams,URL,Blob,FileReader:function(){},setTimeout,clearTimeout,Math:math,Date,JSON,Map,Set,Array,Object,String,Number,Boolean,RegExp,Error,Promise,Intl,
 performance:{now:()=>0},navigator:{onLine:true},crypto:require('node:crypto').webcrypto,AbortController,fetch:async()=>{throw Error('Unexpected network request in V21 gameplay test')}
};
context.globalThis=context;vm.runInNewContext(scripts[0],context,{timeout:45000,filename:'Solo_Realms_V21'});
const T=context.__SR21_TEST;if(!T||T.version!=='21.0.0')throw new Error('V21 hardening layer was not built into the game');
const checks=[],assert=(name,pass,detail='')=>checks.push({name,pass:!!pass,detail});
const hero={name:'Test Rogue',classId:'Rogue',level:5,hp:30,maxHp:30,stats:{STR:10,DEX:16,CON:12,INT:14,WIS:12,CHA:10},proficiencies:['Stealth','Investigation','Deception'],expertise:['Stealth'],inventory:[{name:'Rations',type:'supply',count:4},{name:'Waterskin',type:'supply',count:4}]};
T.state={character:hero,campaign:{day:1,region:'Ashen Vale',location:'Old Road',npcs:[{name:'Town Guard',faction:'Town Watch'}],companions:[],sideQuests:[],mainQuest:{title:'Find the map',goal:'Recover the map from the ruined watchtower',progress:0,target:2}},log:[],combat:null,view:'adventure'};
const g=context.__SR20_TEST.ensure();T.ensure();
assert('V21 state migrates additively without replacing legacy campaign fields',T.version==='21.0.0'&&T.state.campaign.mainQuest.title==='Find the map'&&g.version==='20.0.0');
T.state.character.level=1;const guide=T.tutorial();T.state.character.level=5;
assert('New players receive an optional first-session guide',guide.includes('First-session guide')&&guide.includes('Look closely'));
assert('Dialogue mentioning a guard is classified as social',T.inferMode('I talk to the guard about the missing cart')==='social');
assert('Sneaking past a guard is exploration rather than combat',T.inferMode('I sneak past the guard without being seen')==='exploration');
assert('Explicit attack intent is tactical',T.inferMode('I attack the guard and take cover')==='tactical');
assert('Skill summary includes Expertise, proficiency and class identity modifiers',T.skillBonus(hero,'Stealth').total===10&&T.skillBonus(hero,'Stealth').expertise===3);
assert('Automatic DC is situation-based rather than level-based',T.situationDC('I inspect the watchtower','exploration',null)===12&&T.situationDC('I inspect the expertly guarded watchtower while pursued','exploration',null)===15);
const guard=T.resolve('I talk to the guard about the missing cart',{mode:'auto',target:'Town Guard',roll:18});
assert('Guard conversation updates NPC relationship and faction reputation',guard.mode==='social'&&guard.skill==='Persuasion'&&T.state.campaign.npcs[0].sr20.relationship===1&&T.state.campaign.sr21.reputation['Town Watch']===1);
const advantage=T.resolve('I inspect the watchtower for a hidden route',{mode:'exploration',roll:17,secondRoll:5,advantage:true});
assert('Advantage resolves using the higher d20 result',advantage.die===17&&advantage.die2===5&&advantage.advantage);
const disadvantage=T.resolve('I investigate the old ledger',{mode:'exploration',roll:3,secondRoll:17,disadvantage:true,dc:30});
assert('Disadvantage resolves using the lower d20 result',disadvantage.die===3&&disadvantage.die2===17&&disadvantage.disadvantage);
const one=T.resolve('I solve a simple puzzle',{mode:'campaign',roll:1,dc:5});
const twenty=T.resolve('I solve an impossible puzzle',{mode:'campaign',roll:20,dc:30});
assert('Natural 1 and natural 20 retain the established ability-check rules',one.die===1&&!one.success&&twenty.die===20&&twenty.success);
const expert=T.resolve('I quietly move through the hallway',{mode:'exploration',skill:'Stealth',roll:10,dc:30});
assert('Action resolution includes Expertise, proficiency, ability and class modifiers',expert.bonus.total>=10&&!expert.success);
const watch=g.clock.watch;
T.resolve('I ask the guard about the bridge',{mode:'social',target:'Town Guard',roll:15});
T.resolve('I inspect the old bridge supports',{mode:'exploration',roll:15});
assert('Ordinary actions do not advance the travel-watch clock',g.clock.watch===watch);
const rationBefore=T.state.character.inventory.find(x=>x.name==='Rations').count;
T.resolve('We travel onward for one watch',{mode:'travel',roll:15});
assert('Each travel watch consumes one ration and one water and increments time once',g.clock.watch===watch+1&&T.state.character.inventory.find(x=>x.name==='Rations').count===rationBefore-1&&g.survival.exposure===1);
const restWatch=g.clock.watch,momentum=g.momentum;
T.resolve('We make camp and rest for the night',{mode:'survival'});
assert('Overnight rest advances eight watches without creating campaign momentum',g.clock.watch===restWatch+8&&g.momentum===momentum);
T.setObjective('Locate the hidden cistern','Search the old watchtower and question its keeper',2);
const objective=g.objectives.find(x=>x.title==='Locate the hidden cistern');
T.resolve('I search the old watchtower for the cistern',{mode:'exploration',objectiveId:objective.id,roll:18});
T.resolve('I search the old watchtower for the cistern',{mode:'exploration',objectiveId:objective.id,roll:18});
assert('Objectives require multiple distinct progress actions and resist same-day farming',objective.progress===1&&objective.status==='active');
T.state.campaign.day++;
T.resolve('I question the keeper about the hidden cistern',{mode:'social',target:'Town Guard',objectiveId:objective.id,roll:18});
assert('Distinct relevant actions complete multi-step objectives',objective.progress===2&&objective.status==='completed');
const panel=T.panel();
assert('Adventure view exposes skill, difficulty, roll-mode and objective controls',panel.includes('sr21-skill')&&panel.includes('sr21-difficulty')&&panel.includes('sr21-roll-mode')&&panel.includes('sr21-objective'));
assert('Player-created objectives expose a configurable progress-step count',panel.includes('sr21-objective-goal'));
T.state.character.level=20;const reward=T.awardLegacy(1500,'Objective completed','legacy-test-award');
assert('Level-20 characters receive separate legacy XP without exceeding level 20',reward.gained===1500&&T.state.character.level===20&&T.legacy().rank===1);
assert('Legacy rank grants a title without increasing combat statistics',T.legacy().title==='Road-Worn Hero'&&T.state.character.stats.DEX===16);
const archive=T.archive();
assert('Campaign archive preserves campaign history and active save data',!!archive&&T.legacy().archivedCampaigns.length===1&&T.state.campaign.sr21.archived&&T.state.character.name==='Test Rogue');
const saveSnapshot=typeof context.__SR18_TEST?.snapshot==='function'?context.__SR18_TEST.snapshot('V21 test'):null;
assert('V21 legacy, reputation and chronicle data remain in the existing character/campaign save structure',!!T.state.character.sr21Legacy&&!!T.state.campaign.sr21.reputation&&!!T.state.campaign.sr20&&!!saveSnapshot);
for(const c of checks)console.log((c.pass?'PASS ':'FAIL ')+c.name+(c.detail?' — '+c.detail:''));
console.log('\nRESULT '+checks.filter(x=>x.pass).length+'/'+checks.length+' V21 playtest hardening assertions passed');
if(checks.some(x=>!x.pass))process.exitCode=1;
