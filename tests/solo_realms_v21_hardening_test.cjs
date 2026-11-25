#!/usr/bin/env node
// Simulated first-time, developing, experienced, veteran and legacy player journeys.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','Solo_Realms_V18_Main.html'),'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
if(scripts.length!==1)throw Error('Expected a self-contained runtime');
const nodes=new Map();
function el(id=''){return {id,innerHTML:'',textContent:'',value:'',dataset:{},style:{},attrs:{},files:[],classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},remove(){},appendChild(){},setAttribute(k,v){this.attrs[k]=String(v);},getAttribute(k){return this.attrs[k]??null;},click(){},querySelector(){return null;},querySelectorAll(){return [];},focus(){},closest(){return null;}};}
const app=el('app'),body=el('body'),head=el('head'),toast=el('toast');nodes.set('app',app);nodes.set('toast',toast);
const document={title:'',body,head,getElementById(id){if(!nodes.has(id))nodes.set(id,el(id));return nodes.get(id);},querySelector(){return null;},querySelectorAll(){return [];},createElement(tag){return el(tag);},addEventListener(){}};
const storage=new Map(),session=new Map(),math=Object.create(Math);math.random=()=>.49;
const context={console,document,window:{},location:{protocol:'https:',search:'',href:'https://example.invalid/'},localStorage:{getItem(k){return storage.get(k)||null;},setItem(k,v){storage.set(k,String(v));},removeItem(k){storage.delete(k);}},sessionStorage:{getItem(k){return session.get(k)||null;},setItem(k,v){session.set(k,String(v));},removeItem(k){session.delete(k);}},URLSearchParams,URL,Blob,FileReader:function(){},setTimeout,clearTimeout,Math:math,Date,JSON,Map,Set,Array,Object,String,Number,Boolean,RegExp,Error,Promise,Intl,performance:{now:()=>0},navigator:{onLine:true},crypto:require('node:crypto').webcrypto,AbortController,fetch:async()=>{throw Error('Network disabled in stage simulation');}};
context.globalThis=context;vm.runInNewContext(scripts[0],context,{timeout:60000,filename:'Solo_Realms_V21_Stage'});
const T=context.__SR21_TEST,T18=context.__SR18_TEST,T20=context.__SR20_TEST;
if(!T||!T18||!T20)throw Error('V18/V20/V21 test interfaces missing');
const checks=[],assert=(n,p,d='')=>checks.push({name:n,pass:!!p,detail:d});
const hero=(level=1,cls='Rogue')=>({name:'Stage Tester',classId:cls,ancestry:'Human',level,classLevels:{[cls]:level},hp:30,maxHp:30,xp:0,gold:20,stats:{STR:10,DEX:16,CON:12,INT:14,WIS:12,CHA:10},proficiencies:['Stealth','Investigation','Deception','Persuasion','Survival'],expertise:['Stealth'],inventory:[{name:'Rations',type:'supply',count:8},{name:'Waterskin',type:'supply',count:8}],spells:[],conditions:[],activeEffects:[]});
const reset=(level=1,cls='Rogue')=>{T.state={character:hero(level,cls),campaign:{day:1,chapter:1,region:'Ashen Vale',location:'Old Road',title:'The Lost Cistern',npcs:[{name:'Town Guard',faction:'Town Watch'}],companions:[],sideQuests:[],mainQuest:{title:'Find the hidden cistern',goal:'Search the old watchtower and question its keeper',progress:0,target:2}},log:[],combat:null,view:'adventure'};T.ensure();T20.ensure();};
try{
 reset();
 assert('V21 adds state without replacing V18/V20 campaign data',T.state.campaign.sr20.version==='20.0.0'&&T.state.campaign.sr21.version==='21.0.0'&&T.state.campaign.mainQuest.title==='Find the hidden cistern');
 for(const [level,stage] of [[1,'new'],[3,'learning'],[5,'developing'],[10,'experienced'],[15,'veteran'],[20,'expert']]){T.state.character.level=level;assert('Player-stage mapping · level '+level,T.playerStage()===stage);assert('Director stage context · level '+level,context.srAIContext().campaign.gameplayV21.playerStage===stage);}
 T.state.character.level=20;T.state.character.sr21Legacy={xp:1000};assert('Level-20 legacy stage is distinct from normal expert stage',T.playerStage()==='legacy');
 assert('Talk about a guard routes to social',T.inferMode('I talk to the guard about the missing cart')==='social');
 assert('Sneaking past a guard routes to exploration',T.inferMode('I sneak past the guard without being seen')==='exploration');
 assert('An attack routes to tactical',T.inferMode('I attack the guard and take cover')==='tactical');
 assert('First expressed intent determines mixed social/tactical actions',T.inferMode('I speak to the guard, then attack')==='social'&&T.inferMode('I attack first, then negotiate')==='tactical');
 assert('Travel to a campsite remains travel',T.inferMode('We travel to the campsite')==='travel');
 assert('Making camp is survival',T.inferMode('We make camp and rest for the night')==='survival');
 const b=T.skillBonus(hero(5,'Rogue'),'Stealth');assert('Expertise + proficiency + ability + class edge stack correctly',b.ability===3&&b.proficiency===3&&b.expertise===3&&b.expertiseBonus===3&&b.classEdge===1&&b.total===10,JSON.stringify(b));
 assert('Challenge presets map to stable DCs',T.explicitDifficulty('trivial')===5&&T.explicitDifficulty('routine')===8&&T.explicitDifficulty('standard')===12&&T.explicitDifficulty('hard')===16&&T.explicitDifficulty('expert')===20&&T.explicitDifficulty('legendary')===25);
 assert('Situational DC reflects risk cues without character-level scaling',T.situationDC('I inspect the watchtower','exploration',null)===12&&T.situationDC('I inspect the expertly guarded watchtower while pursued','exploration',null)===15);
 reset(5);
 const panel=T.panel();assert('Adventure action panel renders without recursive overflow',panel.includes('id="sr20-gameplay"')&&panel.includes('What do you do?'));
 assert('V21 control set is present',panel.includes('id="sr21-skill"')&&panel.includes('id="sr21-difficulty"')&&panel.includes('id="sr21-roll-mode"')&&panel.includes('id="sr21-objective"')&&panel.includes('id="sr21-objective-goal"'));
 assert('Duplicate legacy skill/difficulty/roll controls are removed',!panel.includes('id="sr20-skill"')&&!panel.includes('id="sr20-challenge"')&&!panel.includes('id="sr20-roll-state"'));
 nodes.get('sr21-skill').value='Stealth';nodes.get('sr21-difficulty').value='hard';nodes.get('sr21-roll-mode').value='advantage';nodes.get('sr21-objective').value='objective-123';
 const ui=T.resolveOptions({skill:'Arcana',advantage:false,disadvantage:false,objectiveId:'stale'});assert('V21 form selections override legacy submission fields',ui.skill==='Stealth'&&ui.difficulty==='hard'&&ui.advantage===true&&!ui.disadvantage&&ui.objectiveId==='objective-123',JSON.stringify(ui));
 nodes.get('sr21-skill').value='auto';nodes.get('sr21-difficulty').value='auto';nodes.get('sr21-roll-mode').value='normal';nodes.get('sr21-objective').value='auto';
 reset(5);
 const social=T.resolve('I talk to the guard about the missing cart',{mode:'auto',target:'Town Guard',skill:'Persuasion',roll:18,dc:12});
 assert('Social outcome persists NPC relationship and faction reputation',social.mode==='social'&&T.state.campaign.npcs[0].sr20.relationship===1&&T.state.campaign.sr21.reputation['Town Watch']===1);
 const watch=T.state.campaign.sr20.clock.watch;T.resolve('I inspect the old bridge supports',{mode:'exploration',roll:15,dc:12});assert('Non-travel actions do not consume watches',T.state.campaign.sr20.clock.watch===watch);
 const adv=T.resolve('I inspect the watchtower for a hidden route',{mode:'exploration',skill:'Investigation',roll:17,secondRoll:5,advantage:true,dc:12});assert('Advantage selects the higher die',adv.die===17&&adv.die2===5&&adv.advantage);
 const dis=T.resolve('I investigate the old ledger',{mode:'exploration',skill:'Investigation',roll:3,secondRoll:17,disadvantage:true,dc:30});assert('Disadvantage selects the lower die',dis.die===3&&dis.die2===17&&dis.disadvantage);
 const nat1=T.resolve('I use my expert stealth to bypass a trivial obstacle',{mode:'campaign',skill:'Stealth',roll:1,dc:5});assert('Natural 1 uses the final check total, not an automatic failure',nat1.total>=5&&nat1.success);
 T.state.character=hero(1,'Wizard');T.state.character.proficiencies=[];T.state.character.expertise=[];T.state.character.stats.INT=10;
 const nat20=T.resolve('I attempt an impossible animal handling check',{mode:'campaign',skill:'Animal Handling',roll:20,dc:30});assert('Natural 20 uses the final check total, not an automatic success',nat20.total<30&&!nat20.success);
 const campTalk=T.resolve('I ask the guard about a safe place to camp',{mode:'auto',target:'Town Guard',skill:'Persuasion',roll:15,dc:12});assert('Dialogue mentioning camp still requires a check',campTalk.mode==='social'&&!campTalk.noRoll);
 reset(5);
 const g=T.state.campaign.sr20,initialFood=8,initialWater=8;
 const travel=T.resolve('We travel onward for two watches',{mode:'auto',durationWatches:2,skill:'Survival',roll:18,dc:10});
 assert('Travel watches advance clock and consume carried provisions',travel.mode==='travel'&&g.clock.watch===2&&T.state.character.inventory.find(x=>x.name==='Rations').count===initialFood-2&&T.state.character.inventory.find(x=>x.name==='Waterskin').count===initialWater-2);
 const beforeRest=T.state.campaign.sr20.clock.watch,momentum=g.momentum;
 const rest=T.resolve('We make camp and rest for the night',{mode:'auto'});assert('An eight-hour rest advances two four-hour watches',rest.noRoll&&g.clock.watch===beforeRest+2);
 assert('Rest does not generate objective momentum and respects fatigue bounds',g.momentum===momentum&&g.survival.fatigue>=0&&g.survival.fatigue<=6);
 const dialogue=T.resolve('I ask the guard whether this is a safe campsite',{mode:'auto',target:'Town Guard',skill:'Persuasion',roll:15,dc:12});assert('Dialogue containing campsite language is not mistaken for rest',dialogue.mode==='social'&&!dialogue.noRoll&&g.clock.watch===beforeRest+2);
 T.state.character.inventory=[];const short=T.resolve('We travel through the dry pass for three watches',{mode:'auto',durationWatches:3,skill:'Survival',roll:18,dc:10});
 assert('Supply shortages increase bounded fatigue and counters',short.mode==='travel'&&g.clock.watch===beforeRest+5&&g.survival.foodShortages===3&&g.survival.waterShortages===3&&g.survival.fatigue===6);
 const afterShortage=T.resolve('We camp and sleep for the night',{mode:'auto'});assert('Rest after shortage recovers fatigue without underflow',afterShortage.noRoll&&g.survival.fatigue===5);
 reset(5);T.state.campaign.sr20.objectives=[];
 const obj=T.setObjective('Locate the hidden cistern','Search the old watchtower and question its keeper',2);
 const irrelevant=T.resolve('I practice a song by the fire',{mode:'campaign',objectiveId:obj.id,roll:18,dc:5});assert('Selecting an unrelated objective cannot farm progress',irrelevant.success&&obj.progress===0);
 const first=T.resolve('I search the old watchtower for the hidden cistern',{mode:'exploration',objectiveId:obj.id,roll:18,dc:5});T.resolve('I search the old watchtower for the hidden cistern',{mode:'exploration',objectiveId:obj.id,roll:18,dc:5});
 assert('Objective progress requires a relevant success and blocks exact same-day repeats',first.success&&obj.progress===1&&obj.status==='active');
 T.resolve('I question the keeper about the hidden cistern',{mode:'social',target:'Town Guard',objectiveId:obj.id,roll:18,dc:5});assert('A distinct relevant action completes a multi-step objective',obj.progress===2&&obj.status==='completed');
 T.resolve('I question the keeper about the hidden cistern',{mode:'social',target:'Town Guard',objectiveId:obj.id,roll:18,dc:5});assert('Completed objectives cannot be advanced twice',obj.progress===2&&obj.status==='completed');
 T.resolve('We make camp and rest for the night',{mode:'auto',objectiveId:obj.id});assert('Rest cannot progress objectives',obj.progress===2);
 for(let i=0;i<20;i++)T.setObjective('Side objective '+i,'Investigate region clue '+i,1);
 let limit=false;try{T.setObjective('Too many active objectives','Investigate a new region');}catch(e){limit=/Complete or resolve/.test(e.message);}
 assert('Active objective count is bounded by the existing journal capacity',limit&&T.state.campaign.sr20.objectives.filter(x=>x.status==='active').length===20);
 reset(20);const stats=JSON.stringify(T.state.character.stats);
 const award=T.awardLegacy(1000,'Objective completed','legacy-event-1'),duplicate=T.awardLegacy(5000,'Duplicate award','legacy-event-1');
 assert('Level-20 character earns separate legacy XP/rank without raising level',award.gained===1000&&T.state.character.level===20&&T.legacy().rank===1);
 assert('Legacy milestones are idempotent and do not change combat stats',duplicate===false&&T.legacy().xp===1000&&JSON.stringify(T.state.character.stats)===stats);
 const archive=T.archive();assert('Campaign archive preserves history and the active save',!!archive&&T.legacy().archivedCampaigns.length===1&&T.state.campaign.sr21.archived&&T.state.character.name==='Stage Tester');
 assert('Repeated archive is idempotent',T.archive()===false&&T.legacy().archivedCampaigns.length===1);
 assert('Director context recognizes legacy stage',context.srAIContext().campaign.gameplayV21.playerStage==='legacy');
 reset(5);const snap=T18.snapshot('V21 save test'),round=JSON.parse(JSON.stringify(snap)),valid=T18.validateSave(round.state);
 assert('V21 state survives the existing Save Center JSON snapshot and validation',!!valid.ok&&valid.state.campaign.sr21.version==='21.0.0'&&!!valid.state.character.sr21Legacy);
 reset(1);T.state.campaign.sr21.onboarding={step:0,complete:false,hidden:false};
 assert('New-player first-session guide is optional and visible',T.tutorial().includes('First-session guide'));
 for(const [i,[text,mode]] of ['I search the old tower for a clue','I talk to the guard about the bridge','We travel onward for one watch','We make camp and rest for the night'].entries().map((x,i)=>[i,[x,['exploration','social','travel','survival'][i]]])){
  T.resolve(text,{mode,roll:18,dc:5,target:mode==='social'?'Town Guard':undefined});
  assert('Tutorial stage '+(i+1)+' progresses after '+mode+' action',T.state.campaign.sr21.onboarding.step===i+1);
 }
 assert('Tutorial completes after all four modes',T.state.campaign.sr21.onboarding.complete===true);
}catch(e){assert('Player-stage journey completes without uncaught runtime errors',false,e?.stack||String(e));}
for(const c of checks)console.log((c.pass?'PASS ':'FAIL ')+c.name+(c.detail?' — '+c.detail:''));
const passed=checks.filter(x=>x.pass).length;console.log('\\nRESULT '+passed+'/'+checks.length+' V21 player-stage assertions passed');if(passed!==checks.length)process.exitCode=1;
