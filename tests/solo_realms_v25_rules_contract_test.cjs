#!/usr/bin/env node
// V25: campaign rules profiles, house-rule gates, typed mechanics and d20 contract.
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
 fetch:async()=>{throw Error('Unexpected network request in V25 rules-contract tests.');}
};
context.globalThis=context;
vm.runInNewContext(scripts[0],context,{timeout:60000,filename:'Solo_Realms_V25_Rules_Contract'});
const T25=context.__SR25_TEST,T18=context.__SR18_TEST,T20=context.__SR20_TEST,T21=context.__SR21_TEST;
if(!T25||!T18||!T20||!T21)throw new Error('V18/V20/V21/V25 test APIs are missing.');
const checks=[];
function assert(name,value,detail=''){checks.push({name,pass:!!value,detail:String(detail||'')});}
function hero(classId='Fighter'){
 return {id:'hero-1',name:'Contract Tester',classId,ancestry:'Human',level:5,classLevels:{[classId]:5},
  stats:{STR:10,DEX:16,CON:12,INT:10,WIS:10,CHA:10},hp:30,maxHp:30,gold:20,xp:0,
  proficiencies:['Stealth'],expertise:['Stealth'],inventory:[{name:'Rations',type:'supply',count:8},{name:'Waterskin',type:'supply',count:8}],
  spells:[],conditions:[],activeEffects:[]};
}
function campaign(includeV20=false){
 const value={day:1,chapter:1,region:'Test Reach',location:'Old Road',npcs:[],companions:[],sideQuests:[],
  mainQuest:{title:'Find the hidden cistern',goal:'Search the watchtower',progress:0,target:2}};
 if(includeV20)value.sr20={version:'20.0.0'};
 return value;
}
function freshState(cls='Fighter',withV20=false){
 return {character:hero(cls),campaign:campaign(withV20),log:[],combat:null,view:'adventure'};
}
try{
 assert('V25 rules-contract module is installed',T25.version==='25.0.0'&&T25.rulesetSchema==='solo-realms-campaign-rules-v1');
 assert('Official 2024 DC ladder is 5, 10, 15, 20, 25 and 30',JSON.stringify(T25.dcReference().map(x=>x.dc))===JSON.stringify([5,10,15,20,25,30]));
 assert('Legacy Solo Realms preset values remain distinct and documented',JSON.stringify(Object.values(T25.customDCPresets))===JSON.stringify([5,8,12,16,20,25]));
 const fresh={campaign:campaign(false)};const freshProfile=T25.ensureCampaignRules(fresh.campaign);
 assert('A new campaign defaults to the 2024 SRD 5.2.1 core profile',freshProfile.id==='dnd-2024-srd-5.2.1'&&freshProfile.houseRules.classIdentityEdge===false);
 const old={campaign:campaign(true)};const oldProfile=T25.ensureCampaignRules(old.campaign);
 assert('An existing V20 campaign defaults to Enhanced to preserve its established play rules',oldProfile.id==='solo-realms-v24-enhanced'&&oldProfile.houseRules.coverACBonus===true);
 T25.setProfile(fresh.campaign,'solo-realms-v24-enhanced');
 assert('Switching to Enhanced enables the legacy house-rule package',T25.houseRuleEnabled('classIdentityEdge',fresh.campaign)&&T25.houseRuleEnabled('coverACBonus',fresh.campaign)&&T25.houseRuleEnabled('flankingACBonus',fresh.campaign)&&T25.houseRuleEnabled('travelFatiguePenalty',fresh.campaign)&&T25.houseRuleEnabled('customDCPresets',fresh.campaign));
 T25.setProfile(fresh.campaign,'dnd-2024-srd-5.2.1');
 assert('Switching back to the 2024 core profile disables the legacy house-rule package',T25.houseRules.every(key=>!T25.houseRuleEnabled(key,fresh.campaign)));
 T25.setHouseRule(fresh.campaign,'classIdentityEdge',true);
 assert('Individual house rules can be enabled and persisted independently of the profile',T25.houseRuleEnabled('classIdentityEdge',fresh.campaign));
 let invalidHouseRule=false;try{T25.setHouseRule(fresh.campaign,'unknownRule',true);}catch(e){invalidHouseRule=true;}
 assert('Unknown house-rule keys are rejected',invalidHouseRule);

 const v20Save={character:hero(),campaign:campaign(true),log:[]};
 const validatedV20=T18.validateSave(v20Save);
 assert('V20 save validation migrates a normalized copy to Enhanced',validatedV20.ok&&validatedV20.state.campaign.ruleset.id==='solo-realms-v24-enhanced'&&!v20Save.campaign.ruleset);
 const v18Save={character:hero(),campaign:campaign(false),log:[]};
 const validatedV18=T18.validateSave(v18Save);
 assert('Pre-V20 save validation adds the 2024 core profile without mutating the source',validatedV18.ok&&validatedV18.state.campaign.ruleset.id==='dnd-2024-srd-5.2.1'&&!v18Save.campaign.ruleset);

 const requestCampaign=campaign(false);T25.ensureCampaignRules(requestCampaign);
 const request=T25.createRequest({id:'request-1',mechanic:'ability-check',actorId:'hero-1',action:'I inspect the old tracks',ability:'WIS',skill:'Survival',actionCost:{kind:'action'},context:{location:'Old Road'}},requestCampaign);
 assert('Typed ability-check requests are created with a ruleset and campaign revision',request.ok&&request.request.mechanic==='ability-check'&&request.request.rulesetId==='dnd-2024-srd-5.2.1'&&request.request.campaignRevision===0);
 assert('Typed mechanic request passes its validation contract',T25.validateRequest(request.request).ok);
 assert('Unsupported mechanic names are rejected',!T25.validateRequest({...request.request,mechanic:'teleport'}).ok);
 assert('Unknown ruleset IDs are rejected',!T25.validateRequest({...request.request,rulesetId:'unknown-edition'}).ok);
 assert('Invalid ability abbreviations are rejected',!T25.validateRequest({...request.request,ability:'LCK'}).ok);
 assert('Negative campaign revisions are rejected',!T25.validateRequest({...request.request,campaignRevision:-1}).ok);
 assert('Oversized mechanic context is rejected',!T25.validateRequest({...request.request,context:{notes:'x'.repeat(20001)}}).ok);
 assert('Unstructured action-cost values are rejected',!T25.validateRequest({...request.request,actionCost:'action'}).ok);

 assert('Ability modifier service follows the score-to-modifier formula',T25.abilityModifier(8)===-1&&T25.abilityModifier(10)===0&&T25.abilityModifier(16)===3);
 assert('Proficiency service follows the level 1–20 progression',[[1,2],[5,3],[9,4],[13,5],[17,6],[20,6]].every(([level,bonus])=>T25.proficiencyBonus(level)===bonus));
 const pureSkill=T25.skillBonus(hero('Rogue'),'Stealth',{houseRules:{classIdentityEdge:false}});
 const enhancedPureSkill=T25.skillBonus(hero('Rogue'),'Stealth',{houseRules:{classIdentityEdge:true}});
 assert('Pure skill service stacks ability, proficiency and expertise without a class-edge house rule',pureSkill.ability===3&&pureSkill.proficiency===3&&pureSkill.expertiseBonus===3&&pureSkill.classEdge===0&&pureSkill.total===9);
 assert('Pure skill service applies a class-edge only when the ruleset explicitly enables it',enhancedPureSkill.classEdge===1&&enhancedPureSkill.total===10);
 const nat20Check=T25.resolveAbilityCheck([20],0,21);
 const nat1Check=T25.resolveAbilityCheck([1],10,11);
 assert('Natural 20 on an ability check still compares the modified total to the DC',nat20Check.die===20&&!nat20Check.success&&!nat20Check.critical);
 assert('Natural 1 on an ability check can succeed when its total meets the DC',nat1Check.die===1&&nat1Check.total===11&&nat1Check.success);
 const nat20Save=T25.resolveSavingThrow([20],0,21);
 const nat1Save=T25.resolveSavingThrow([1],10,11);
 assert('Natural 20 on a saving throw does not bypass its DC',nat20Save.die===20&&!nat20Save.success);
 assert('Natural 1 on a saving throw can succeed when its total meets the DC',nat1Save.die===1&&nat1Save.success);
 const crit=T25.resolveAttack([20],-10,30);
 const miss=T25.resolveAttack([1],100,10);
 assert('Natural 20 on an attack automatically hits and is critical',crit.success&&crit.critical&&crit.targetType==='armor-class');
 assert('Natural 1 on an attack automatically misses despite a high modifier',!miss.success&&miss.automaticMiss);
 const protectedHelper=T25.resolveAbilityCheck([20],0,21,{mechanic:'attack',targetNumber:1});
 assert('Typed ability-check helper cannot be overridden into an attack or a different target number',protectedHelper.mechanic==='ability-check'&&protectedHelper.targetNumber===21&&!protectedHelper.success);
 const attackCharacter=hero('Fighter');attackCharacter.hp=40;attackCharacter.maxHp=40;
 T21.state={character:attackCharacter,campaign:campaign(false),log:[],combat:null,view:'adventure'};T21.ensure();
 const enemy={name:'Test Ogre',attack:0},claw={name:'Claw',description:'Melee Weapon Attack: +0 to hit, reach 5 ft.',damage:[{dice:'1d4',type:'slashing'}]};
 const attackTarget={player:{name:attackCharacter.name,character:attackCharacter},pos:null};
 T25.withAttackRoll(()=>({r:20,total:-50}),()=>T18.resolveMonsterAction(enemy,claw,attackTarget));
 assert('Live monster attack path uses typed natural-20 auto-hit and critical damage',attackCharacter.hp<40);
 attackCharacter.hp=40;
 T25.withAttackRoll(()=>({r:1,total:100}),()=>T18.resolveMonsterAction(enemy,claw,attackTarget));
 assert('Live monster attack path uses typed natural-1 automatic miss',attackCharacter.hp===40);
 const advantage=T25.resolveD20({mechanic:'ability-check',rolls:[4,18],advantage:true,modifier:0,targetNumber:15});
 const disadvantage=T25.resolveD20({mechanic:'ability-check',rolls:[4,18],disadvantage:true,modifier:0,targetNumber:15});
 assert('Advantage keeps the higher of two d20 rolls',advantage.die===18&&advantage.success);
 assert('Disadvantage keeps the lower of two d20 rolls',disadvantage.die===4&&!disadvantage.success);
 let invalidRollCount=false;try{T25.resolveD20({mechanic:'ability-check',rolls:[4,18],modifier:0,targetNumber:15});}catch(e){invalidRollCount=true;}
 assert('A normal roll rejects two d20 results unless advantage or disadvantage is declared',invalidRollCount);
 const legacyCheck=T25.normalizeLegacyResult({roll:20,total:20,success:true},99,'ability-check');
 const legacySave=T25.normalizeLegacyResult({roll:1,total:11,success:false},11,'saving-throw');
 assert('Legacy ability-check results are normalized to total-vs-DC semantics',legacyCheck.total===20&&!legacyCheck.success);
 assert('Legacy saving-throw results are normalized to total-vs-DC semantics',legacySave.total===11&&legacySave.success);

 T21.state=freshState('Rogue',false);T21.ensure();
 const strictSkill=T21.skillBonus(T21.state.character,'Stealth');
 assert('Core profile disables the legacy +1 class-identity bonus',strictSkill.classEdge===0);
 T25.setProfile(T21.state.campaign,'solo-realms-v24-enhanced');
 const enhancedSkill=T21.skillBonus(T21.state.character,'Stealth');
 assert('Enhanced profile restores the documented +1 class-identity house rule',enhancedSkill.classEdge===1);

 T21.state=freshState('Wizard',false);T21.ensure();T20.ensure();
 let travel=T21.state.campaign.sr20;travel.survival.fatigue=5;
 const strictTravel=T21.resolve('We travel down the old road for one watch',{mode:'travel',roll:15,dc:14});
 T25.setProfile(T21.state.campaign,'solo-realms-v24-enhanced');
 travel=T21.state.campaign.sr20;travel.survival.fatigue=5;
 const enhancedTravel=T21.resolve('We travel down the old road for one watch',{mode:'travel',roll:15,dc:14});
 assert('Core profile does not apply the Enhanced high-fatigue −2 check penalty',strictTravel.total===15&&strictTravel.success);
 assert('Enhanced profile applies the high-fatigue −2 check penalty',enhancedTravel.total===13&&!enhancedTravel.success);

 T21.state=freshState('Fighter',false);T21.state.combat={round:1,enemies:[{name:'Training Dummy',hp:20,ac:15}]};T21.ensure();
 T21.resolve('I flank the nearest enemy',{mode:'tactical',skill:'Athletics',target:'Training Dummy',roll:20,dc:5});
 assert('Core profile does not apply the legacy −2 AC flanking modifier',T21.state.combat.enemies[0].ac===15);
 T25.setProfile(T21.state.campaign,'solo-realms-v24-enhanced');
 T21.state.combat={round:1,enemies:[{name:'Training Dummy',hp:20,ac:15}]};
 T21.resolve('I flank the nearest enemy',{mode:'tactical',skill:'Athletics',target:'Training Dummy',roll:20,dc:5});
 assert('Enhanced profile applies the legacy −2 AC flanking modifier',T21.state.combat.enemies[0].ac===13);

 T25.setProfile(T21.state.campaign,'dnd-2024-srd-5.2.1');
 T21.state.combat={round:1,sr20Tactics:{stance:'cover',lastCheck:'opening',round:1},enemies:[]};
 assert('Core profile does not apply the legacy +2 AC cover benefit',T20.coverActive()===false);
 T25.setProfile(T21.state.campaign,'solo-realms-v24-enhanced');
 assert('Enhanced profile applies the legacy +2 AC cover benefit',T20.coverActive()===true);

 assert('Custom DC presets are disabled under the 2024 core profile',T25.explicitDifficulty('routine')===null&&T25.challengeDC(12,'difficult')===12);
 assert('Core profile fallback covers all six typical DC bands',T25.situationDC('I inspect the watchtower','exploration',null)===15&&T25.situationDC('I attempt a very easy task','exploration',null)===5&&T25.situationDC('I complete an easy task','exploration',null)===10&&T25.situationDC('I cross the collapsing bridge while pursued','exploration',null)===20&&T25.situationDC('I complete a very hard task','exploration',null)===25&&T25.situationDC('I attempt a nearly impossible feat','exploration',null)===30);
 assert('Custom DC presets remain available under the Enhanced profile',T25.explicitDifficulty('routine')===8&&T25.challengeDC(12,'difficult')===17&&T25.situationDC('I inspect the watchtower','exploration',null)===12);
 T25.setProfile(T21.state.campaign,'dnd-2024-srd-5.2.1');
 assert('Core-profile Adventure UI presents the Director DC option without custom preset values',T25.difficultyOptions().includes('2024 typical DC')&&!T25.difficultyOptions().includes('Routine'));
 T25.setProfile(T21.state.campaign,'solo-realms-v24-enhanced');
 assert('Enhanced Adventure UI visibly labels custom DC presets as Solo Realms options',T25.difficultyOptions().includes('Solo Realms custom'));
 assert('Adventure campaign controls expose the current profile and explicit house-rule toggles',T25.rulesetPanel().includes('id="sr25-profile"')&&T25.rulesetPanel().includes('data-sr25-house-rule="flankingACBonus"'));
 const directorContext=T25.directorContext();
 assert('Director context receives the active ruleset and persisted house-rule flags',directorContext.campaign.ruleset?.id==='solo-realms-v24-enhanced'&&directorContext.campaign.ruleset.houseRules.coverACBonus===true);
}catch(error){
 assert('V25 rules-contract suite completes without uncaught runtime errors',false,error?.stack||String(error));
}
for(const check of checks)console.log((check.pass?'PASS ':'FAIL ')+check.name+(check.detail?' — '+check.detail:''));
const passed=checks.filter(x=>x.pass).length;
console.log('\nRESULT '+passed+'/'+checks.length+' V25 rules-contract assertions passed');
if(passed!==checks.length)process.exitCode=1;
