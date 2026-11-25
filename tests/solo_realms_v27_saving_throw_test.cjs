#!/usr/bin/env node
// V27: typed saving throws, missing ability scores, condition auto-failure and legacy save routing.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','Solo_Realms_V18_Main.html'),'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
if(scripts.length!==1)throw new Error('Expected one self-contained game runtime.');
function el(id=''){
 return {id,innerHTML:'',textContent:'',value:'',checked:false,dataset:{},style:{},attrs:{},files:[],
  classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},removeEventListener(){},
  appendChild(){},setAttribute(k,v){this.attrs[k]=String(v);},getAttribute(k){return this.attrs[k]??null;},
  click(){},querySelector(){return null},querySelectorAll(){return []},focus(){},closest(){return null;}};
}
const app=el('app'),body=el('body'),head=el('head'),toast=el('toast');
const nodes=new Map([['app',app],['toast',toast]]);
const document={title:'',body,head,getElementById(id){return nodes.get(id)||null;},querySelector(){return null;},querySelectorAll(){return [];},createElement(tag){return el(tag);},addEventListener(){}};
const storage=new Map(),session=new Map(),math=Object.create(Math);math.random=()=>.5;
const context={
 console,document,window:{},location:{protocol:'https:',search:'',href:'https://example.invalid/'},
 localStorage:{getItem(k){return storage.has(k)?storage.get(k):null;},setItem(k,v){storage.set(k,String(v));},removeItem(k){storage.delete(k);}},
 sessionStorage:{getItem(k){return session.has(k)?session.get(k):null;},setItem(k,v){session.set(k,String(v));},removeItem(k){session.delete(k);}},
 URLSearchParams,URL,Blob,FileReader:function(){},setTimeout,clearTimeout,Math:math,Date,JSON,Map,Set,Array,Object,String,Number,Boolean,RegExp,Error,Promise,Intl,
 performance:{now:()=>0},navigator:{onLine:true},crypto:require('node:crypto').webcrypto,AbortController,
 fetch:async()=>{throw Error('Unexpected network request in V27 saving throw tests.');}
};
context.globalThis=context;
vm.runInNewContext(scripts[0],context,{timeout:60000,filename:'Solo_Realms_V27_Saving_Throws'});
const T25=context.__SR25_TEST,T14=context.__SR14_TEST,T18=context.__SR18_TEST;
if(!T25||!T14||!T18||typeof T25.resolveCreatureSavingThrow!=='function'||typeof T25.heroSave!=='function') {
 throw new Error('V25/V27 typed save interfaces are missing.');
}
const checks=[];
function assert(name,value,detail=''){checks.push({name,pass:!!value,detail:String(detail||'')});}
function creature(classId='Fighter',stats={STR:10,DEX:10,CON:10,INT:10,WIS:10,CHA:10}){
 return {id:'save-target',name:'Save Target',classId,level:5,classLevels:{[classId]:5},stats,
  hp:30,maxHp:30,conditions:[],activeEffects:[],proficiencies:[],inventory:[]};
}
try{
 const normal20=T25.resolveSavingThrow([20],0,21);
 const normal1=T25.resolveSavingThrow([1],10,11);
 assert('Ordinary natural 20 does not bypass a saving throw DC',normal20.die===20&&!normal20.success&&!normal20.autoFail);
 assert('Ordinary natural 1 can succeed when the modified total meets the DC',normal1.die===1&&normal1.total===11&&normal1.success);

 const missingWisdom=creature('Wizard',{STR:10,DEX:10,CON:10,INT:16,CHA:10});
 const missingScore=T25.resolveCreatureSavingThrow(missingWisdom,'WIS',[20],10,5);
 assert('A creature missing the required ability score automatically fails the save even on a natural 20',missingScore.autoFail&&!missingScore.success);
 assert('The creature-save adapter recognizes a present ability score',T25.hasSaveAbility(creature(),'WIS'));
 assert('The creature-save adapter rejects an absent ability score',!T25.hasSaveAbility(missingWisdom,'WIS'));

 const present=T25.resolveCreatureSavingThrow(creature(),'WIS',[14],3,17);
 assert('A creature with the required score resolves against its DC normally',!present.autoFail&&present.total===17&&present.success);
 const adv=T25.resolveCreatureSavingThrow(creature(),'DEX',[3,18],0,15,{advantage:true});
 const dis=T25.resolveCreatureSavingThrow(creature(),'DEX',[3,18],0,15,{disadvantage:true});
 assert('Advantage on saving throws uses the higher d20 result',adv.die===18&&adv.success);
 assert('Disadvantage on saving throws uses the lower d20 result',dis.die===3&&!dis.success);
 const forced=T25.resolveSavingThrow([20],10,10,{autoFail:true});
 assert('An explicit condition-based auto-failure overrides an otherwise successful save',forced.autoFail&&!forced.success&&forced.total===30);
 const notSave=T25.resolveD20({mechanic:'attack',roll:20,modifier:0,targetNumber:30,autoFail:true});
 assert('Saving-throw auto-failure does not alter attack-roll critical rules',notSave.success&&notSave.critical);
 const direct=T25.resolveSavingThrowTotal(17,5,18);
 assert('Legacy save totals are normalized to a d20 result and modifier',direct.die===12&&direct.modifier===5&&!direct.success);
 const directAuto=T25.resolveSavingThrowTotal(20,0,5,{autoFail:true});
 assert('Direct-total save adapter preserves explicit automatic failure',directAuto.autoFail&&!directAuto.success);

 const paralyzed=creature('Fighter');
 paralyzed.conditions=['paralyzed'];
 const paralyzedSave=T25.withD20Rolls([20],()=>T25.heroSave(paralyzed,'STR',null,{saveDC:5}));
 assert('Paralyzed creatures automatically fail Strength saves even on a natural 20',paralyzedSave.autoFail&&!paralyzedSave.success&&paralyzedSave.total===-Infinity);
 const unconscious=creature('Rogue');
 unconscious.conditions=[{name:'unconscious'}];
 const unconsciousSave=T25.withD20Rolls([20],()=>T25.heroSave(unconscious,'DEX',null,{saveDC:5}));
 assert('Unconscious creatures automatically fail Dexterity saves',unconsciousSave.autoFail&&!unconsciousSave.success);
 const missingPlayer=creature('Wizard',{STR:10,DEX:10,CON:10,INT:16,CHA:10});
 const missingPlayerSave=T25.withD20Rolls([20],()=>T25.heroSave(missingPlayer,'WIS',null,{saveDC:5}));
 assert('Player-side monster saves automatically fail when the required score is missing',missingPlayerSave.autoFail&&!missingPlayerSave.success);
 const strongWisdom=creature('Cleric',{STR:10,DEX:10,CON:10,INT:10,WIS:30,CHA:10});
 const naturalOneSuccess=T25.withD20Rolls([1],()=>T25.heroSave(strongWisdom,'WIS',null,{saveDC:12}));
 assert('Player-side ordinary natural 1 can succeed when proficiency and modifiers meet the DC',naturalOneSuccess.d1===1&&naturalOneSuccess.total>=12&&naturalOneSuccess.success);

 const wizard=creature('Wizard');
 wizard.activeEffects=[{name:'Spellward',bonusType:'save',bonus:4,rounds:2}];
 const effectSave=T25.withD20Rolls([11],()=>T14.savingThrow(wizard,'WIS',18));
 assert('V18 temporary saving-throw bonuses are adjudicated by the typed save resolver',effectSave.total===18&&effectSave.success);

 const liveCreature=creature('Fighter');
 const player=creature('Wizard');
 const oldState=T21SafeState();
 assert('Player-facing save adapter remains callable after V27 integration',typeof T14.savingThrow==='function'&&typeof T25.heroSave==='function');
 function T21SafeState(){return {character:player,campaign:{day:1,region:'Test Reach',companions:[],npcs:[],sideQuests:[]},log:[],combat:null,view:'adventure'};}

 const creatureSaveCalls=html.split('sr25ResolveCreatureSavingThrow(').length-1;
 assert('Build routes the six inventoried monster/target save paths through V25',creatureSaveCalls>=7,`observed typed calls including function declaration=${creatureSaveCalls}`);
 assert('Build no longer retains the legacy grapple/shove total-vs-DC save expression',!html.includes('const save=die(20)+sr12SaveBonus(e,ability),success=save>=dc;'));
 assert('Build no longer retains the legacy area save-control comparison',!html.includes("const save=die(20)+sr12SaveBonus(e,sp.save||'WIS');if(save>=sr12SpellDC(c)){"));
 assert('Build no longer retains the legacy spell save-target closures',!html.includes('const saveTarget=(e,ability)=>{const b=sr12SaveBonus(e,ability),r=die(20)+b,success=r>=dc;')&&!html.includes('const saveTarget=(e,ab)=>{const bonus=sr12SaveBonus(e,ab),r=die(20)+bonus;'));
 assert('Build no longer retains the legacy spell-damage save comparison',!html.includes('const save=chosen+sr12SaveBonus(enemy,ability)+cover;saved=save>=dc;'));
 assert('Build no longer retains the legacy Turn Undead save comparison',!html.includes('save=die(20)+sr14AbilityMod(e.stats?.WIS||10);if(save<dc)'));

 const deathAt=html.indexOf('function sr12DeathSave');
 const death=deathAt>=0?html.slice(deathAt,deathAt+1700):'';
 assert('Death saving throws retain their specialized natural-20 recovery and natural-1 two-failure procedure',death.includes('if(r===20)')&&death.includes('else if(r===1)')&&!death.includes('sr25ResolveCreatureSavingThrow'));
}catch(error){
 assert('V27 saving-throw suite completes without uncaught runtime errors',false,error?.stack||String(error));
}
for(const check of checks)console.log((check.pass?'PASS ':'FAIL ')+check.name+(check.detail?' — '+check.detail:''));
const passed=checks.filter(x=>x.pass).length;
console.log('\nRESULT '+passed+'/'+checks.length+' V27 saving-throw assertions passed');
if(passed!==checks.length)process.exitCode=1;
