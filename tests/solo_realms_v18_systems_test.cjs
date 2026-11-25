#!/usr/bin/env node
// V18 integration checks for rules application, typed combat, living world and save persistence.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','Solo_Realms_V18_Main.html'),'utf8');
const js=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).join('\n');
function el(id=''){
 const node={id,innerHTML:'',textContent:'',value:'',checked:false,dataset:{},style:{},attrs:{},files:[],classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},remove(){},appendChild(){},setAttribute(k,v){this.attrs[k]=String(v)},getAttribute(k){return this.attrs[k]??null},click(){node.clicked=true;},querySelector(){return null},querySelectorAll(){return []},focus(){},select(){}};
 return node;
}
const app=el('app'),body=el('body'),head=el('head'),toast=el('toast'),created=[];
const document={title:'',body,head,getElementById(id){return id==='app'?app:id==='toast'?toast:null;},querySelector(){return null;},querySelectorAll(){return [];},createElement(tag){const n=el(tag);created.push(n);return n;},addEventListener(){}};
const databases=new Map(),data=new Map();
const indexedDB={open(name,version=1){
 const req={};let meta=databases.get(name);if(!meta){meta={version:0,stores:new Set()};databases.set(name,meta);}
 const db={objectStoreNames:{contains(store){return meta.stores.has(store);}},createObjectStore(store){meta.stores.add(store);},close(){},transaction(storeName,mode){const tx={error:null};const bucketKey=`${name}/${storeName}`;let bucket=data.get(bucketKey);if(!bucket){bucket=new Map();data.set(bucketKey,bucket);}tx.objectStore=()=>({get(key){const r={};queueMicrotask(()=>{r.result=bucket.has(String(key))?bucket.get(String(key)):null;r.onsuccess?.({target:r});tx.oncomplete?.();});return r;},put(value,key){bucket.set(String(key),value);queueMicrotask(()=>tx.oncomplete?.());return key;},delete(key){bucket.delete(String(key));queueMicrotask(()=>tx.oncomplete?.());}});return tx;}};
 req.result=db;queueMicrotask(()=>{if(version>meta.version){meta.version=version;req.onupgradeneeded?.({target:req});}req.onsuccess?.({target:req});});return req;
}};
let random=.99;const math=Object.create(Math);math.random=()=>random;
const storage=new Map(),session=new Map(),downloads=[];const URLMock=URL;URLMock.createObjectURL=(blob)=>{downloads.push(blob);return 'blob:solo-realms-v18';};URLMock.revokeObjectURL=()=>{};
const context={console,document,window:{},location:{search:'',href:'https://example.invalid/Solo_Realms_V18_Main.html'},localStorage:{getItem(k){return storage.has(k)?storage.get(k):null;},setItem(k,v){storage.set(k,String(v));},removeItem(k){storage.delete(k);}},sessionStorage:{getItem(k){return session.has(k)?session.get(k):null;},setItem(k,v){session.set(k,String(v));},removeItem(k){session.delete(k);}},URLSearchParams,URL:URLMock,Blob,FileReader:function(){},setTimeout,clearTimeout,Math:math,Date,JSON,Map,Set,Array,Object,String,Number,Boolean,RegExp,Error,Promise,Intl,performance:{now:()=>0},navigator:{onLine:true},crypto:require('node:crypto').webcrypto,AbortController,confirm:()=>true,fetch:async()=>{throw Error('Unexpected network request in V18 systems test')}};
context.indexedDB=indexedDB;context.globalThis=context;vm.runInNewContext(js,context,{timeout:45000,filename:'Solo_Realms_V18_Main.html'});
const T=context.__SR18_TEST,checks=[];const assert=(name,pass,detail='')=>checks.push({name,pass:!!pass,detail});
const hero=(name='Ari Vale')=>({name,ancestry:'Human',classId:'Fighter',level:2,xp:300,nextXP:900,stats:{STR:14,DEX:14,CON:13,INT:10,WIS:12,CHA:10},hp:20,maxHp:20,gold:25,weapon:'Longsword',armor:'Chain shirt',inventory:[],spells:[],conditions:[],proficiencies:['Athletics','Perception'],resourcesByClass:{Fighter:{}},movement:30});
const campaign=()=>({chapter:1,day:1,location:'Ashenbrook',region:'Green March',companions:[],npcs:[],sideQuests:[],visited:['Ashenbrook'],flags:{},story:{villain:'The Ash King',threat:'The Withering',motive:'recover a stolen relic',relic:'Sunstone',region:{name:'Green March'}},mainQuest:{title:'Find the Sunstone',description:'Recover the missing relic',goal:3,progress:0,status:'active'},difficulty:'Normal',multiplayer:{active:false}});
const D=context.__SR19_TEST;
T.state={character:hero(),campaign:campaign(),log:[],combat:null,view:'adventure'};
assert('V19 Director Studio exposes nine DM personalities',D?.version==='19.0.0'&&D.profiles().length===9);
const normalized=D.normalize({story:30,trickster:5,tactical:18,mystery:10,merciless:5,explorer:17,horror:5,comedy:10});
assert('Personality mixer normalizes influence weights to 100',Object.values(normalized).reduce((n,v)=>n+v,0)===100);
assert('All personality profiles provide valid influence weights',D.profiles().every(name=>Object.values(D.profileMix(name)).every(v=>Number.isFinite(v)&&v>=0&&v<=100)));
assert('Selecting a personality stores a distinct campaign-level blend',D.applyProfile('Mischievous Trickster')&&D.settings().directorProfile==='Mischievous Trickster'&&D.settings().personalityMix.trickster===76);
D.settings().directorName='The Laughing Lantern';D.settings().directorCustomInstructions='Use recurring jokes but never erase serious consequences.';
const prompt=D.prompt();
assert('Generative DM prompt uses the chosen name and player instructions',prompt.includes('The Laughing Lantern')&&prompt.includes('recurring jokes'));
assert('Generative DM prompt includes the real weighted personality blend',prompt.includes('Mischievous Trickster 76%'));
D.settings().aiMemory=[{day:4,tag:'promise',text:'The guard remembers the silver apple joke.'}];
D.settings().aiChat=[{role:'user',text:'We will return at dawn.'},{role:'assistant',text:'I will remember.'}];
const context=D.context();
assert('Director context includes campaign memories and recent DM conversation',context.campaign.directorMemory.some(m=>m.text.includes('silver apple'))&&context.campaign.recentDMConversation.length===2);
const studio=D.settingsPage();
assert('Director Studio page exposes profile selection, all eight blend sliders and custom instructions',studio.includes('Director Studio')&&studio.includes('sr19-profile')&&studio.includes('data-sr19-mix="story"')&&studio.includes('data-sr19-mix="comedy"')&&studio.includes('sr19-instructions'));
assert('Director Studio page exposes narration, initiative, NPC depth and player agency',studio.includes('sr19-narration')&&studio.includes('sr19-initiative')&&studio.includes('sr19-depth')&&studio.includes('sr19-agency'));
const baseDecision={title:'The World Answers',narration:'A guard blocks the bridge.',skill:'Persuasion',dc:12,reward:'none',damageOnFailure:0,choices:[]};
D.settings().personalityMix={story:0,trickster:100,tactical:0,mystery:0,merciless:0,explorer:0,horror:0,comedy:0};
const trickster=D.offlineFlavor(baseDecision);
assert('Offline trickster narration is distinct without changing mechanics',trickster.narration.includes('mischievous detail')&&trickster.skill===baseDecision.skill&&trickster.dc===baseDecision.dc&&trickster.reward===baseDecision.reward);
D.settings().personalityMix={story:0,trickster:0,tactical:0,mystery:0,merciless:0,explorer:0,horror:100,comedy:0};
const horror=D.offlineFlavor(baseDecision);
assert('Offline horror narration differs from trickster without changing its check',horror.narration.includes('silence is wrong')&&horror.skill===baseDecision.skill&&horror.dc===baseDecision.dc);

(async()=>{
 assert('V18 rules layer exposes all five implementation systems',T?.version==='18.0.0'&&typeof T.inferSpell==='function'&&typeof T.monsterTurnSolo==='function'&&typeof T.classifyImprovisation==='function'&&typeof T.ensureWorld==='function'&&typeof T.storeSlot==='function');
 const inferred=T.inferSpell('Ember Burst',{description:'Each creature in a 15-foot cone makes a Dexterity saving throw, taking 4d6 fire damage on a failed save.',damage:'4d6',area:15,areaShape:'cone',save:true},{kind:'utility'});
 assert('Spell description infers save, area, damage dice and damage type',inferred.kind==='saveDamage'&&inferred.save==='DEX'&&inferred.area&&inferred.shape==='cone'&&inferred.type==='fire');
 const victim={hp:30,maxHp:30,immunities:['fire'],resistances:['cold'],vulnerabilities:['radiant']};
 assert('Spell and weapon damage helper respects immunity',T.typedDamage(victim,12,'fire')===0&&victim.hp===30);
 assert('Damage helper halves resistance and doubles vulnerability',T.typedDamage(victim,10,'cold')===5&&T.typedDamage(victim,5,'radiant')===10&&victim.hp===15);
 T.state={character:hero(),campaign:campaign(),log:[],combat:{mp:false,round:1,heroPos:{x:1,y:1},map:{width:8,height:6,scale:5,terrain:[]},enemies:[]},view:'adventure'};
 const combatEnemy={name:'Test Brute',type:'beast',hp:40,maxHp:40,ac:13,attack:20,pos:{x:1,y:2},speed:30,statBlock:{ability_scores:{int:4},legendary_actions_per_round:0},actions:[{name:'Multiattack',description:'The creature makes two Claw attacks and one Bite attack.'},{name:'Claw',attack_bonus:20,description:'Melee Attack Roll: +20, reach 5 ft. Hit: 1d6 slashing damage.',damage:[{dice:'1d6',type:'slashing'}]},{name:'Bite',attack_bonus:20,description:'Melee Attack Roll: +20, reach 5 ft. Hit: 1d8 piercing damage.',damage:[{dice:'1d8',type:'piercing'}]}]};
 T.state.combat.enemies=[combatEnemy];const hpBeforeMonsterTurn=T.state.character.hp;const monsterTurn=T.monsterTurnSolo({index:0});
 assert('Solo monster turn resolves its stat-block Multiattack against the hero',monsterTurn&&T.state.character.hp<hpBeforeMonsterTurn&&T.state.log.some(x=>String(x.msg).includes('Multiattack')));
 const spellHero=hero();const mage=T.applySpellUtility(spellHero,'Mage Armor',{description:'A protective magical force surrounds you.',duration:'8 hours'},{kind:'armor',durationRounds:-1});
 assert('Utility spell engine records persistent AC effect and duration',!!mage&&spellHero.activeEffects?.some(x=>x.name==='Mage Armor'&&x.acOverride===15));
 const t= T.expandMultiattack({actions:[{name:'Multiattack',description:'The creature makes two Claw attacks and one Bite attack.'},{name:'Claw',description:'Melee Attack Roll: +5, reach 5 ft. Hit: 1d6 slashing damage.',damage:[{dice:'1d6',type:'slashing'}]},{name:'Bite',description:'Melee Attack Roll: +4, reach 5 ft. Hit: 1d8 piercing damage.',damage:[{dice:'1d8',type:'piercing'}]}]});
 assert('Multiattack expands to the right named attack sequence',t?.length===3&&t[0].name==='Claw'&&t[1].name==='Claw'&&t[2].name==='Bite');
 const ranged=T.parseActionRange({description:'Ranged Weapon Attack Roll: +6, range 30/120 ft. Hit: 1d8 piercing damage.'});
 assert('Ranged monster attacks parse attack mode and both range bands',ranged.ranged&&ranged.normalRange===30&&ranged.longRange===120);
 const rangedHero=hero('Ranged Test Hero');rangedHero.reactions=[{name:'Parry',description:'adds 3 to its AC'}];rangedHero.reactionAvailable=true;
 T.state.character=rangedHero;T.state.combat={mp:false,round:1,heroPos:{x:1,y:1},map:{width:8,height:6,scale:5,terrain:[]},enemies:[]};
 const rangedEnemy={name:'Archer',hp:20,maxHp:20,attack:20,pos:{x:1,y:2},actions:[]};
 const rangedTarget={player:{id:'solo',name:rangedHero.name,character:rangedHero},pos:{x:1,y:1}};
 T.resolveMonsterAction(rangedEnemy,{name:'Longbow',attack_bonus:20,description:'Ranged Weapon Attack Roll: +20, range 30/120 ft. Hit: 1d8 piercing damage.',damage:[{dice:'1d8',type:'piercing'}]},rangedTarget);
 assert('Ranged monster attacks do not incorrectly consume a melee Parry reaction',rangedHero.reactionAvailable===true);
 const rechargeProbe={};T.markRechargeUsed(rechargeProbe,{name:'Fire Breath (Recharge 5–6)',description:'Recharge 5–6'});
 assert('Using a recharge ability marks it unavailable until it recharges',rechargeProbe._sr18Recharge?.['Fire Breath (Recharge 5–6)']===false);
 const choices=['I use a rope and pulley to lift the portcullis','I calm the frightened wolf with food','I combine two runes to disable the ward','I lie to the guard about my identity'];
 const typed=choices.map(x=>T.classifyImprovisation(x)?.id);
 assert('Improvisation distinguishes environment, animal, magic and deception',typed[0]==='environment'&&typed[1]==='animal'&&typed[2]==='arcaneimprov'&&typed[3]==='deception',typed.join(', '));
 T.state={character:hero(),campaign:campaign(),log:[],combat:null,view:'adventure'};
 const world=T.ensureWorld();T.addWorldEvent('test','The watch changes at midnight.');T.advanceWorld('travel',1);
 assert('Living world advances time and stores durable events',world.clock.day>=2&&world.events.some(x=>x.text.includes('watch changes')));
 const baseSave=T.snapshot('Test snapshot');
 assert('Portable campaign snapshot preserves living-world state',baseSave.schema==='solo-realms-v18-save-v1'&&baseSave.state.campaign.sr18?.factions?.length>=4);
 const slot=await T.storeSlot(1,'Unit test slot'),loaded=await T.readSlot(1);
 assert('Manual save slot round-trips a complete campaign through IndexedDB',slot.slot===1&&loaded?.state?.character?.name==='Ari Vale'&&loaded.state.campaign.sr18?.factions?.length>=4);
 T.state.character.name='Changed Hero';await T.writeRecovery('unit test recovery');const recovery=await T.latestRecovery();
 assert('Recovery ring writes and retrieves latest autosave separately from manual slots',recovery?.reason==='unit test recovery'&&recovery.state?.character?.name==='Changed Hero');
 T.state.character.name='Replacement Hero';await T.restore(loaded.state,'slot round-trip');
 assert('Restore loads the slot without losing character or world memory',T.state.character.name==='Ari Vale'&&T.state.campaign.sr18?.factions?.length>=4);
 // A failed recovery write must block destructive restore and preserve the active campaign.
 const recoveryDb=await T.openDB(),originalTransaction=recoveryDb.transaction,originalSetItem=context.localStorage.setItem;
 recoveryDb.transaction=function(store,mode){if(store==='recovery')throw new Error('simulated recovery archive write failure');return originalTransaction.call(this,store,mode);};
 context.localStorage.setItem=function(key,value){if(String(key).startsWith('sr18-recovery-'))throw new Error('simulated local recovery storage failure');return originalSetItem.call(this,key,value);};
 T.state.character.name='Protected Current Campaign';let restoreBlocked=false;
 try{await T.restore(loaded.state,'restore guard regression');}catch(error){restoreBlocked=/could not be backed up|cancelled to protect/i.test(String(error?.message||error));}
 recoveryDb.transaction=originalTransaction;context.localStorage.setItem=originalSetItem;
 assert('Restore refuses to replace the active campaign when recovery storage fails',restoreBlocked&&T.state.character.name==='Protected Current Campaign');
 T.state.character.name='Import Target';const importPayload=JSON.stringify(baseSave);const imported=await T.importFile({size:importPayload.length,text:async()=>importPayload});
 assert('JSON campaign import validates and restores a portable save',imported===true&&T.state.character.name==='Ari Vale'&&T.state.campaign.sr18?.factions?.length>=4);
 await T.storeSlot(2,'Delete test');await T.deleteSlot(2);assert('Manual save slots can be deleted independently',await T.readSlot(2)===null);
 const invalid=await T.importFile({size:10,text:async()=>'{"broken":true}'});
 assert('Invalid save import fails closed instead of overwriting the active campaign',invalid===false&&T.state.character.name==='Ari Vale');
 const report=T.tests();for(const r of report)assert('Built-in V18: '+r.name,r.pass,r.detail||'');
 const failures=checks.filter(x=>!x.pass);for(const c of checks)console.log(`${c.pass?'PASS':'FAIL'} ${c.name}${c.detail?' — '+c.detail:''}`);
 console.log(`\nRESULT ${checks.length-failures.length}/${checks.length} V18 integrated systems checks passed`);if(failures.length)process.exitCode=1;
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
