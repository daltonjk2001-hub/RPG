#!/usr/bin/env node
// V28: voluntary saving-throw failure and tracked Legendary Resistance.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','Solo_Realms_V18_Main.html'),'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
if(scripts.length!==1)throw new Error('Expected one self-contained game runtime.');
function el(id=''){return {id,innerHTML:'',textContent:'',value:'',checked:false,dataset:{},style:{},attrs:{},files:[],
 classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},removeEventListener(){},
 appendChild(){},setAttribute(k,v){this.attrs[k]=String(v);},getAttribute(k){return this.attrs[k]??null;},
 click(){},querySelector(){return null},querySelectorAll(){return []},focus(){},closest(){return null;}};}
const app=el('app'),body=el('body'),head=el('head'),toast=el('toast'),nodes=new Map([['app',app],['toast',toast]]);
const document={title:'',body,head,getElementById(id){return nodes.get(id)||null;},querySelector(){return null;},querySelectorAll(){return [];},createElement(tag){return el(tag);},addEventListener(){}};
const storage=new Map(),session=new Map(),math=Object.create(Math);math.random=()=>.5;
const context={console,document,window:{},location:{protocol:'https:',search:'',href:'https://example.invalid/'},
 localStorage:{getItem(k){return storage.has(k)?storage.get(k):null;},setItem(k,v){storage.set(k,String(v));},removeItem(k){storage.delete(k);}},
 sessionStorage:{getItem(k){return session.has(k)?session.get(k):null;},setItem(k,v){session.set(k,String(v));},removeItem(k){session.delete(k);}},
 URLSearchParams,URL,Blob,FileReader:function(){},setTimeout,clearTimeout,Math:math,Date,JSON,Map,Set,Array,Object,String,Number,Boolean,RegExp,Error,Promise,Intl,
 performance:{now:()=>0},navigator:{onLine:true},crypto:require('node:crypto').webcrypto,AbortController,
 fetch:async()=>{throw Error('Unexpected network request in V28 saving throw tests.');}};
context.globalThis=context;
vm.runInNewContext(scripts[0],context,{timeout:60000,filename:'Solo_Realms_V28_Special_Saving_Throws'});
const T25=context.__SR25_TEST,T14=context.__SR14_TEST;
if(!T25||!T14||typeof T25.resolveCreatureSavingThrow!=='function')throw new Error('V28 rules services are missing.');
const checks=[];function assert(name,value,detail=''){checks.push({name,pass:!!value,detail:String(detail||'')});}
function creature(extra={}){return {id:'v28-target',name:'V28 Target',stats:{STR:10,DEX:10,CON:10,INT:10,WIS:10,CHA:10},conditions:[],activeEffects:[],...extra};}
try{
 const voluntary=T25.resolveSavingThrow([],0,15,{chooseToFail:true});
 assert('Voluntary failure resolves without rolling',voluntary.chosenToFail&&!voluntary.success&&voluntary.dice.length===0&&voluntary.die===null&&voluntary.total===null);
 let rejected=false;try{T25.resolveD20({mechanic:'attack',roll:20,modifier:0,targetNumber:30,chooseToFail:true});}catch(e){rejected=true;}
 assert('Voluntary-failure option is rejected for non-saving-throw mechanics',rejected);
 const noTrait=creature();
 const normalFail=T25.resolveCreatureSavingThrow(noTrait,'WIS',[4],0,15);
 assert('Ordinary creature failure remains a failure without Legendary Resistance',!normalFail.success&&!normalFail.legendaryResistanceUsed);
 const boss=creature({statBlock:{special_abilities:[{name:'Legendary Resistance (3/Day, or 4/Day in Lair)',desc:'If the creature fails a saving throw, it can choose to succeed instead.'}]}});
 const first=T25.resolveCreatureSavingThrow(boss,'WIS',[2],0,18,{useLegendaryResistance:true});
 assert('First failed save consumes one Legendary Resistance use and succeeds',first.success&&first.legendaryResistanceUsed&&first.legendaryResistanceRemaining===2);
 const second=T25.resolveCreatureSavingThrow(boss,'DEX',[3],0,18,{useLegendaryResistance:true});
 const third=T25.resolveCreatureSavingThrow(boss,'CON',[4],0,18,{useLegendaryResistance:true});
 assert('Legendary Resistance counter decrements across repeated failed saves',second.success&&second.legendaryResistanceRemaining===1&&third.success&&third.legendaryResistanceRemaining===0);
 const exhausted=T25.resolveCreatureSavingThrow(boss,'STR',[1],0,18,{useLegendaryResistance:true});
 assert('Exhausted Legendary Resistance cannot convert a later failure',!exhausted.success&&!exhausted.legendaryResistanceUsed);
 const restored=T25.resetLegendaryResistance(boss);
 assert('Long-rest reset restores all Legendary Resistance uses',restored.reset&&restored.remainingUses===3&&restored.usedUses===0);
 const noSpendOnSuccess=T25.resolveCreatureSavingThrow(boss,'WIS',[20],0,10,{useLegendaryResistance:true});
 assert('Successful save does not consume Legendary Resistance',noSpendOnSuccess.success&&!noSpendOnSuccess.legendaryResistanceUsed&&T25.legendaryResistanceStatus(boss).remainingUses===3);
 const disabled=T25.resolveCreatureSavingThrow(boss,'WIS',[1],0,20,{useLegendaryResistance:false});
 assert('Caller can preserve a failed save without allowing Legendary Resistance',!disabled.success&&T25.legendaryResistanceStatus(boss).remainingUses===3);
 const lair=T25.legendaryResistanceStatus(boss,{inLair:true});
 assert('Lair-mode resistance profile uses the stat block’s larger daily allotment',lair.maxUses===4&&lair.remainingUses===3);
 const explicit=creature({legendaryResistance:{maxUses:2,remainingUses:1}});
 const explicitStatus=T25.legendaryResistanceStatus(explicit);
 assert('Explicit structured Legendary Resistance resources are recognized',explicitStatus.maxUses===2&&explicitStatus.remainingUses===1);
 const persisted=creature({statBlock:{traits:['Legendary Resistance (2/Day)']}});
 T25.resolveCreatureSavingThrow(persisted,'WIS',[1],0,20,{useLegendaryResistance:true});
 assert('Legendary Resistance usage is persisted on the creature record',persisted._sr25LegendaryResistance.remainingUses===1);
 const choice=creature();
 T25.setNextSavingThrowChoice(choice,'fail');
 const chosen=T25.resolveCreatureSavingThrow(choice,'WIS',[19],99,1);
 assert('A creature’s queued choice causes voluntary failure without a d20 result',chosen.chosenToFail&&!chosen.success&&chosen.die===null&&!choice._sr25NextSaveChoice);
 const direct=T25.resolveCreatureSavingThrow(boss,'WIS',[19],99,1,{chooseToFail:true,useLegendaryResistance:true});
 assert('Legendary Resistance does not override a creature’s deliberate choice to fail',direct.chosenToFail&&!direct.success&&!direct.legendaryResistanceUsed);
 const legacyChoice=creature();
 T25.setNextSavingThrowChoice(legacyChoice,'fail');
 const legacy=T14.savingThrow(legacyChoice,'DEX',10);
 assert('Legacy character saving-throw adapter honors a queued voluntary failure without rolling',legacy.chosenToFail&&!legacy.success&&legacy.roll===null);
 const heroChoice=creature();
 T25.setNextSavingThrowChoice(heroChoice,'fail');
 const heroResult=T25.heroSave(heroChoice,'CON',null,{saveDC:15});
 assert('Player-versus-monster save adapter supports an explicit no-roll voluntary failure',heroResult.chosenToFail&&!heroResult.success&&heroResult.d1===null);
 const invalidChoiceRejected=(()=>{try{T25.setNextSavingThrowChoice(creature(),'succeed');return false;}catch(e){return true;}})();
 assert('Queued save-choice API rejects unsupported choices',invalidChoiceRejected);
 const integration=html.split('sr25ResolveCreatureSavingThrow(').length-1;
 assert('Built runtime retains the unified creature-save pipeline across V17 callers',integration>=7,'found '+integration+' resolver references including declaration');
 assert('Build routes six monster saving-throw sites through explicit Legendary Resistance policy',
   html.includes('useLegendaryResistance:true') && (html.match(/useLegendaryResistance:true/g)||[]).length>=6);
}catch(error){assert('V28 suite completes without uncaught runtime errors',false,error?.stack||String(error));}
for(const check of checks)console.log((check.pass?'PASS ':'FAIL ')+check.name+(check.detail?' — '+check.detail:''));
console.log('\nRESULT '+checks.filter(x=>x.pass).length+'/'+checks.length+' V28 special saving-throw assertions passed');
if(checks.some(x=>!x.pass))process.exitCode=1;
