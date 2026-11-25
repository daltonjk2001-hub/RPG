#!/usr/bin/env node
// V22 data-integrity, compatibility and module-boundary regression tests.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','Solo_Realms_V18_Main.html'),'utf8');
const scripts=[...html.matchAll(/<script\\b[^>]*>([\\s\\S]*?)<\\/script>/gi)].map(m=>m[1]);
if(scripts.length!==1)throw Error('Expected one self-contained runtime');
function el(id=''){return {id,innerHTML:'',textContent:'',value:'',dataset:{},style:{},attrs:{},files:[],classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},remove(){},appendChild(){},setAttribute(k,v){this.attrs[k]=String(v)},getAttribute(k){return this.attrs[k]??null},click(){},querySelector(){return null},querySelectorAll(){return []},focus(){},closest(){return null}}}
const app=el('app'),body=el('body'),head=el('head'),toast=el('toast');
const nodes=new Map([['app',app],['toast',toast]]);
const document={title:'',body,head,getElementById(id){return nodes.get(id)||null;},querySelector(){return null;},querySelectorAll(){return [];},createElement(tag){return el(tag);},addEventListener(){}};
const storage=new Map(),session=new Map(),math=Object.create(Math);math.random=()=>.49;
const context={console,document,window:{},location:{protocol:'https:',search:'',href:'https://example.invalid/'},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},sessionStorage:{getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,String(v)),removeItem:k=>session.delete(k)},URLSearchParams,URL,Blob,FileReader:function(){},setTimeout,clearTimeout,Math:math,Date,JSON,Map,Set,Array,Object,String,Number,Boolean,RegExp,Error,Promise,Intl,performance:{now:()=>0},navigator:{onLine:true},crypto:require('node:crypto').webcrypto,AbortController,fetch:async()=>{throw Error('Network disabled in V22 tests')}};
context.globalThis=context;vm.runInNewContext(scripts[0],context,{timeout:60000,filename:'Solo_Realms_V22_DataIntegrity'});
const T18=context.__SR18_TEST,T21=context.__SR21_TEST,T22=context.__SR22_TEST;
if(!T18||!T21||!T22)throw Error('V18/V21/V22 test interfaces missing');
const checks=[],assert=(name,pass,detail='')=>checks.push({name,pass:!!pass,detail:String(detail||'')});
const hero=(level=5)=>({name:'Integrity Tester',classId:'Fighter',ancestry:'Human',level,classLevels:{Fighter:level},stats:{STR:14,DEX:12,CON:14,INT:10,WIS:12,CHA:10},hp:24,maxHp:24,gold:30,xp:0,inventory:[{name:'Rations',type:'supply',count:2}],spells:[],proficiencies:['Athletics','Perception'],conditions:[],activeEffects:[]});
const campaign=()=>({day:1,chapter:1,region:'Test Reach',location:'Stonebridge',companions:[],npcs:[],sideQuests:[],mainQuest:{title:'Find the bridge key',goal:'Search the old bridge',progress:0}});
const save=()=>({character:hero(),campaign:campaign(),log:[{day:1,msg:'A valid legacy save.'}]});
const clone=value=>JSON.parse(JSON.stringify(value));
try{
 assert('V22 data modules expose versioned namespaced APIs',T22.version==='22.0.0'&&typeof T22.validateSave==='function'&&typeof T22.ensureLegacy==='function'&&typeof T22.claimLegacy==='function');
 let valid=save();const result=T18.validateSave(valid);
 assert('Valid V18 save passes bounded validation',result.ok&&result.state.character.level===5);
 assert('Validation returns a copy rather than mutating the source',result.ok&&valid.character.stats.STR===14&&result.state!==valid&&result.state.character!==valid.character);
 let wrapped={schema:'solo-realms-v18-save-v1',game:'Solo Realms',version:'18.0.0',state:save()};
 assert('Versioned V18 export envelope remains accepted',T18.validateSave(wrapped).ok);

 let oldV17=save();delete oldV17.campaign.companions;delete oldV17.campaign.npcs;delete oldV17.campaign.sideQuests;delete oldV17.log;
 const oldResult=T18.validateSave(oldV17);
 assert('Unwrapped V3/V17-style saves with optional historical fields remain readable',oldResult.ok&&Array.isArray(oldResult.state.campaign.companions)&&Array.isArray(oldResult.state.campaign.npcs)&&Array.isArray(oldResult.state.campaign.sideQuests)&&Array.isArray(oldResult.state.log));

 let stringScore=save();stringScore.character.stats.STR='16';
 const normalizedScore=T18.validateSave(stringScore);
 assert('Numeric-string ability scores are normalized without mutating the imported object',normalizedScore.ok&&normalizedScore.state.character.stats.STR===16&&stringScore.character.stats.STR==='16');
 let highAbility=save();highAbility.character.stats.WIS=31;
 assert('Out-of-range ability scores are rejected',!T18.validateSave(highAbility).ok);
 let lowAbility=save();lowAbility.character.stats.CON=0;
 assert('Zero ability scores are rejected',!T18.validateSave(lowAbility).ok);
 let impossibleLevel=save();impossibleLevel.character.level=21;
 assert('Levels outside the supported range are rejected',!T18.validateSave(impossibleLevel).ok);
 let fractionalLevel=save();fractionalLevel.character.level=2.5;
 assert('Fractional character levels are rejected',!T18.validateSave(fractionalLevel).ok);
 let unsafeClass=save();unsafeClass.character.classId='__proto__';
 assert('Prototype property names cannot masquerade as valid classes',!T18.validateSave(unsafeClass).ok);

 let tooMuchInventory=save();tooMuchInventory.character.inventory=Array.from({length:2001},(_,i)=>({name:'Item '+i}));
 assert('Oversized inventory is rejected before restoration',!T18.validateSave(tooMuchInventory).ok);
 let tooManyNPCs=save();tooManyNPCs.campaign.npcs=Array.from({length:2001},(_,i)=>({name:'NPC '+i}));
 assert('Oversized NPC rosters are rejected before restoration',!T18.validateSave(tooManyNPCs).ok);
 let badNestedList=save();badNestedList.campaign.sr18={events:'not-an-array'};
 assert('Malformed nested world-simulation lists are rejected',!T18.validateSave(badNestedList).ok);
 let deep=save(),cursor=deep.campaign;for(let i=0;i<45;i++){cursor.next={};cursor=cursor.next;}
 assert('Excessively deep imported data is rejected',!T18.validateSave(deep).ok);
 let dangerous=save();Object.defineProperty(dangerous.campaign,'__proto__',{value:{polluted:true},enumerable:true});
 assert('Reserved object keys are rejected',!T18.validateSave(dangerous).ok);
 let circular=save();circular.campaign.loop=circular.campaign;
 assert('Circular in-memory save structures are rejected safely',!T18.validateSave(circular).ok);
 let nonFinite=save();nonFinite.character.gold=Number.POSITIVE_INFINITY;
 assert('Non-finite numbers are rejected',!T18.validateSave(nonFinite).ok);
 let veryLong=save();veryLong.campaign.notes='x'.repeat(500001);
 assert('Oversized text fields are rejected',!T18.validateSave(veryLong).ok);

 let brokenOptional=save();brokenOptional.campaign.companions='old-format-empty';brokenOptional.campaign.npcs=null;brokenOptional.campaign.sideQuests={};
 const optionalResult=T18.validateSave(brokenOptional);
 assert('Known optional V3/V17 campaign collections normalize to empty arrays',optionalResult.ok&&optionalResult.state.campaign.companions.length===0&&optionalResult.state.campaign.npcs.length===0&&optionalResult.state.campaign.sideQuests.length===0);
 let longLog=save();longLog.log=Array.from({length:350},(_,i)=>({day:1,msg:'event '+i}));
 const trimmedLog=T18.validateSave(longLog);
 assert('Accepted chronicle logs retain only the latest 300 entries',trimmedLog.ok&&trimmedLog.state.log.length===300&&trimmedLog.state.log[0].msg==='event 50');

 const priorState={character:{name:'Current Campaign'},campaign:{title:'Must remain active'}};
 T21.state={...priorState,log:[],combat:null,view:'adventure'};
 const targetName=T21.state.character.name;
 const importedPayload=JSON.stringify({character:{...hero(),classId:'NoSuchClass'},campaign:campaign(),log:[]});
 const invalidImport=await T18.importFile({size:importedPayload.length,text:async()=>importedPayload});
 assert('Invalid imports do not replace the currently active campaign',invalidImport===false&&T21.state.character.name===targetName&&T21.state.campaign.title==='Must remain active');
 const tooLargeImport=await T18.importFile({size:12000001,text:async()=>{throw Error('The file should be rejected before it is read.');}});
 assert('Oversized backup files are rejected before parsing',tooLargeImport===false&&T21.state.character.name===targetName);

 const oldLegacyCharacter={name:'Legacy Hero',sr21Legacy:{xp:0,milestones:[{id:'pre-ledger-award',reason:'old milestone',xp:10}]}};
 const migrated=T22.ensureLegacy(oldLegacyCharacter);
 assert('The exact IDs in an older 100-entry milestone history migrate into the permanent ledger',migrated.awardLedgerVersion===1&&migrated.awardedIds['reward:pre-ledger-award']===true&&!T22.claimLegacy(migrated,'pre-ledger-award'));
 assert('Reward IDs are stored in a namespaced, prototype-safe key space',T22.claimLegacy(migrated,'__proto__')&&T22.claimLegacy(migrated,'__proto__')===false&&migrated.awardedIds['reward:__proto__']===true);

 T21.state={character:hero(20),campaign:campaign(),log:[],combat:null,view:'adventure'};
 T21.ensure();
 let firstAward=true;
 for(let i=0;i<125;i++){
  const award=T21.awardLegacy(1,'Long chronicle milestone '+i,'stable-reward-'+i);
  if(!award)firstAward=false;
 }
 const longLegacy=T21.legacy();
 const xpAfter125=longLegacy.xp;
 assert('125 unique level-20 rewards are all claimed',firstAward&&xpAfter125===125);
 assert('Visible milestone history remains bounded at 100 records',longLegacy.milestones.length===100);
 assert('Deduplication ledger retains IDs removed from visible milestone history',longLegacy.awardedIds['reward:stable-reward-0']===true&&!longLegacy.milestones.some(x=>x.id==='stable-reward-0'));
 const persisted=T21.state=clone(T21.state);
 T21.ensure();
 const afterRoundTrip=T21.awardLegacy(999,'Attempt to replay an old reward','stable-reward-0');
 assert('Old reward IDs remain permanently deduplicated after JSON save/export/import',afterRoundTrip===false&&T21.legacy().xp===xpAfter125&&T21.legacy().awardedIds['reward:stable-reward-0']===true);
 assert('The persistent reward ledger itself survives a JSON round trip',JSON.parse(JSON.stringify(T21.legacy().awardedIds))['reward:stable-reward-124']===true);

 const fresh=T22.ensureLegacy({name:'Fresh Hero',sr21Legacy:{milestones:[],awardedIds:{'custom-old-id':true},awardLedgerVersion:1}});
 assert('Existing serialized reward ledger keys survive normalization',fresh.awardedIds['reward:custom-old-id']===true);
 const secondClaim=T22.claimLegacy(fresh,'custom-old-id');
 assert('A previously serialized reward ID cannot be claimed again',secondClaim===false);
 assert('New IDs can still be claimed exactly once',T22.claimLegacy(fresh,'new-stable-id')&&T22.claimLegacy(fresh,'new-stable-id')===false);
}catch(error){
 assert('V22 data-integrity suite completes without uncaught runtime errors',false,error?.stack||String(error));
}
for(const item of checks)console.log((item.pass?'PASS ':'FAIL ')+item.name+(item.detail?' — '+item.detail:''));
const passed=checks.filter(x=>x.pass).length;
console.log('\\nRESULT '+passed+'/'+checks.length+' V22 data-integrity assertions passed');
if(passed!==checks.length)process.exitCode=1;
