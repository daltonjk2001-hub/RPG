#!/usr/bin/env node
// V29: canonical condition definitions, independent instances, expiry and core rules integration.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','Solo_Realms_V18_Main.html'),'utf8');
const sw=fs.readFileSync(path.join(__dirname,'..','pwa','sw.js'),'utf8');
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
 fetch:async()=>{throw Error('Unexpected network request in V29 condition tests.');}};
context.globalThis=context;
vm.runInNewContext(scripts[0],context,{timeout:60000,filename:'Solo_Realms_V29_Condition_Engine'});
const T=context.__SR29_TEST,T25=context.__SR25_TEST,T21=context.__SR21_TEST,T18=context.__SR18_TEST,RV=context.__SR29_DEATH_TEST;
if(!T||!T25||T.version!=='29.0.0')throw new Error('V29 condition engine or typed-save integration is missing.');
const dragonbornTargetProbe=actor({id:'dragonborn-area-probe',name:'Dragonborn Area Probe',hp:20,maxHp:20,pos:{x:3,y:1},stats:{STR:10,DEX:10,CON:10,INT:10,WIS:10,CHA:10}});
const dragonbornCasterProbe=actor({id:'dragonborn-caster-probe',name:'Dragonborn Caster Probe',ancestry:'Dragonborn',stats:{STR:10,DEX:10,CON:14,INT:10,WIS:10,CHA:10}});
T18.state={character:dragonbornCasterProbe,campaign:{},combat:{heroPos:{x:1,y:1},enemies:[dragonbornTargetProbe],map:{width:8,height:6,terrain:[]}},log:[]};
for(const shape of ['cone','line']){
 const sp={area:true,areaShape:shape,range:'Self',description:shape==='cone'?'15-foot cone':'30-foot line 5 feet wide'};
 const effect={kind:'saveDamage',area:true,shape,size:shape==='cone'?15:30,save:'DEX',type:'fire'};
 let result=null,error=null;
 try{result=T18.targetList({id:'dragonborn-caster-probe',character:dragonbornCasterProbe},sp,effect,dragonbornTargetProbe,{x:1,y:1});}catch(e){error=String(e.stack||e);}
 console.log('DRAGONBORN_AREA '+shape+' '+JSON.stringify({result:result?.map(x=>x.name),error,area:T18.area(sp,sp.description)}));
}
const checks=[];
console.log('REINCARNATE_SCHEMA '+JSON.stringify({names:T18.ancestryNames,records:T18.ancestryData}));
for(const pattern of ['const ANCESTRIES','ANCESTRIES[data.ancestry]','ancestry.bonus','ancestry.trait','c.ancestry','state.character.ancestry','character.ancestry','raceTrait','ancestryTrait','racialTraits']){
 const hits=[];let from=0,index=-1;
 while((index=html.indexOf(pattern,from))>=0&&hits.length<4){
  hits.push({line:html.slice(0,index).split("\\n").length,excerpt:html.slice(Math.max(0,index-300),Math.min(html.length,index+1100)).replace(/\\s+/g," ")});
  from=index+pattern.length;
 }
 console.log("ANCESTRY_PIPELINE "+pattern+" "+JSON.stringify({count:hits.length,hits}));
for(const token of ["ancestry==='Dwarf'","ancestry==='Tiefling'","ancestry==='Aasimar'","ancestry==='Dragonkin'","ancestry==='Elf'","ancestry==='Halfling'","dragonBreathUsed","radiantTouchUsed","elfSense","flags.lucky","ancestry.bonus","maxHp+=2","maxHp =","levelUp"]){
 const hits=[];let from=0,index=-1;
 while((index=html.indexOf(token,from))>=0&&hits.length<12){
  hits.push({line:html.slice(0,index).split("\\n").length,excerpt:html.slice(Math.max(0,index-220),Math.min(html.length,index+850)).replace(/\\s+/g," ")});
  from=index+token.length;
 }
 console.log("ANCESTRY_RULE "+token+" "+JSON.stringify({count:hits.length,hits}));
}

}

function assert(name,value,detail=''){checks.push({name,pass:!!value,detail:String(detail||'')});}
function actor(extra={}){return {id:'v29-target',name:'V29 Target',hp:30,maxHp:30,baseSpeed:30,speed:30,
 stats:{STR:10,DEX:10,CON:10,INT:10,WIS:10,CHA:10},conditions:[],activeEffects:[],...extra};}
try{
 const revivalPriorRender=context.render;context.render=()=>{};
 const revivalCaster=actor({id:'revival-caster',name:'Revival Caster',classId:'Cleric',level:5,classLevels:{Cleric:5},spells:['Revivify'],preparedSpells:['Revivify'],spellSlotsByLevel:{3:1},actionSpent:false,bonusActionSpent:false,reactionAvailable:true,spellSlotSpentThisTurn:false});
 const revivalCasterPlayer={id:'revival-caster',name:'Revival Caster',connected:true,character:revivalCaster};
 const revivalTarget=actor({id:'revival-target',name:'Revival Target',hp:0,maxHp:24,mpDead:true,mpDowned:true,dead:true,stable:true,unconscious:true,deathAt:Date.now()-30000,deathSaves:3,deathSuccess:0,deathFailure:3,stableRecoveryHours:3,stableElapsedHours:2,conditions:[{name:'unconscious',duration:999}]});
 const revivalTargetPlayer={id:'revival-target',name:'Revival Target',connected:true,character:revivalTarget};
 T.gameplay.setSpellData('Revivify',{name:'Revivify',level:3,classes:['Cleric'],kind:'revive',range:'Touch',castingTime:'Action',components:'V, S',description:'Return the target to life.'});
 T18.state={character:revivalCaster,campaign:{day:1,region:'Revival Test',location:'Revival Test',visited:['Revival Test'],companions:[],npcs:[],sideQuests:[],story:{},flags:{},mainQuest:{kind:'test',title:'Revival Test',goal:'Validate multiplayer revival'},multiplayer:{active:true,players:[revivalCasterPlayer,revivalTargetPlayer]}},combat:{mp:{heroPositions:{'revival-caster':{x:1,y:1},'revival-target':{x:2,y:1}},turnOrder:[{kind:'hero',id:'revival-caster',faction:'hero'}],index:0},heroPos:{x:1,y:1},turnOrder:[],initiativeOrder:[],round:1,enemies:[],map:{width:8,height:6,terrain:[]}},log:[]};
 T18.setActivePlayerId('revival-caster');
 const revivalCast=T.gameplay.castSpell(revivalCasterPlayer,'Revivify','revival-target',true);
 assert('Revivify on a valid dead multiplayer target restores 1 HP and clears the prior death timestamp, stable timer, death saves, and unconscious condition',revivalCast===true&&revivalTarget.hp===1&&revivalTarget.mpDead===false&&revivalTarget.mpDowned===false&&revivalTarget.dead===false&&revivalTarget.stable===false&&revivalTarget.unconscious===false&&revivalTarget.deathSaves===0&&revivalTarget.deathSuccess===0&&revivalTarget.deathFailure===0&&!Object.prototype.hasOwnProperty.call(revivalTarget,'deathAt')&&!Object.prototype.hasOwnProperty.call(revivalTarget,'stableRecoveryHours')&&!Object.prototype.hasOwnProperty.call(revivalTarget,'stableElapsedHours')&&!revivalTarget.conditions.some(x=>(typeof x==='string'?x:x.name)==='unconscious'),JSON.stringify({revivalCast,target:revivalTarget,slots:revivalCaster.spellSlotsByLevel,actionSpent:revivalCaster.actionSpent}));
 revivalTarget.hp=0;revivalTarget.mpDead=true;revivalTarget.dead=true;revivalTarget.deathAt=Date.now()-61000;
 revivalCaster.spellSlotsByLevel[3]=1;revivalCaster.actionSpent=false;revivalCaster.spellSlotSpentThisTurn=false;
 const expiredRevivify=T.gameplay.castSpell(revivalCasterPlayer,'Revivify','revival-target',true);
 assert('Revivify rejects a death older than one minute before spending a spell slot or Action',expiredRevivify===false&&revivalTarget.hp===0&&revivalTarget.mpDead===true&&Number(revivalCaster.spellSlotsByLevel[3])===1&&revivalCaster.actionSpent===false,JSON.stringify({expiredRevivify,targetHp:revivalTarget.hp,dead:revivalTarget.mpDead,slots:revivalCaster.spellSlotsByLevel,actionSpent:revivalCaster.actionSpent}));
 revivalTarget.mpDead=false;revivalTarget.dead=false;revivalTarget.stable=true;revivalTarget.deathAt=Date.now()-1000;
 const stableNotDead=T.gameplay.castSpell(revivalCasterPlayer,'Revivify','revival-target',true);
 assert('Revivify does not treat a stable or unconscious 0-HP creature as dead',stableNotDead===false&&revivalTarget.hp===0&&revivalCaster.spellSlotsByLevel[3]===1&&revivalCaster.actionSpent===false);
 revivalTarget.mpDead=true;revivalTarget.dead=true;revivalTarget.stable=false;revivalTarget.deathAt=Date.now()-1000;
 T.gameplay.setSpellData('Healing Word',{name:'Healing Word',level:1,classes:['Cleric'],kind:'heal',range:'60 feet',castingTime:'Bonus Action',components:'V',description:'Restore hit points to a creature.'});
 revivalCaster.spells.push('Healing Word');revivalCaster.preparedSpells.push('Healing Word');revivalCaster.spellSlotsByLevel[1]=1;revivalCaster.bonusActionSpent=false;
 const healingDeadTarget=T.gameplay.castSpell(revivalCasterPlayer,'Healing Word','revival-target',true);
 assert('Ordinary healing cannot revive a character whose multiplayer death flag is set',healingDeadTarget===false&&revivalTarget.hp===0&&revivalTarget.mpDead===true&&revivalCaster.spellSlotsByLevel[1]===1&&revivalCaster.bonusActionSpent===false,JSON.stringify({healingDeadTarget,target:{hp:revivalTarget.hp,mpDead:revivalTarget.mpDead,dead:revivalTarget.dead},diagnostics:T.gameplay.spellDiagnostics(revivalCaster,'Healing Word'),toast:toast.textContent,slots:revivalCaster.spellSlotsByLevel,bonusActionSpent:revivalCaster.bonusActionSpent}));
 T18.state={character:actor(),campaign:{},combat:null,log:[]};
 context.render=revivalPriorRender;

 assert('Dragonborn is a distinct supported ancestry and is not merged with homebrew Dragonkin',T18.ancestryNames.includes('Dragonborn')&&T18.ancestryNames.includes('Dragonkin')&&T18.ancestryData.Dragonborn.creatureType==='Humanoid');
 const expectedReincarnateSpecies=['Aasimar','Dragonborn','Dwarf','Elf','Gnome','Goliath','Halfling','Human','Orc','Tiefling'];
 assert('The Reincarnate 1d10 table maps every official result to its 2024 species in order',expectedReincarnateSpecies.every((species,index)=>RV.reincarnateSpeciesFromRoll(index+1)===species)&&RV.reincarnateSpecies.every((species,index)=>species===expectedReincarnateSpecies[index]));
 assert('Invalid Reincarnate die results are rejected rather than silently remapped',RV.reincarnateSpeciesFromRoll(0)===null&&RV.reincarnateSpeciesFromRoll(11)===null&&RV.reincarnateSpeciesFromRoll(1.5)===null);
 const reincarnatedElf=actor({id:'reincarnated-elf',name:'Reincarnated Elf',ancestry:'Elf',classId:'Fighter',background:'Soldier',level:5,xp:1200,maxHp:42,hp:1,stats:{STR:10,DEX:16,CON:12,INT:10,WIS:10,CHA:12},spells:['Longsword Mastery'],feats:['Alert'],proficiencies:['Athletics','Perception'],revivalD20Penalty:0});
 const oldSpeciesFlags={elfSense:true,lucky:true,halfElfCharm:true,sceneTraitUses:{elf:true,gnome:true,halfelf:true}};
 T18.state={character:reincarnatedElf,campaign:{flags:oldSpeciesFlags},combat:null,log:[]};
 const tieflingTransformation=RV.applyReincarnateSpecies(reincarnatedElf,10);
 assert('Reincarnate replaces ancestry bonuses while retaining class, level, background, XP, skills, feats and unrelated capabilities',tieflingTransformation.ok&&reincarnatedElf.ancestry==='Tiefling'&&reincarnatedElf.stats.DEX===14&&reincarnatedElf.stats.CHA===14&&reincarnatedElf.classId==='Fighter'&&reincarnatedElf.background==='Soldier'&&reincarnatedElf.level===5&&reincarnatedElf.xp===1200&&reincarnatedElf.feats.includes('Alert')&&reincarnatedElf.proficiencies.includes('Athletics'),JSON.stringify({tieflingTransformation,character:reincarnatedElf}));
 assert('Tiefling ancestry grants Ember Bolt and clears the former Elf/Gnome/Halfling/Half-Elf trait-use flags',reincarnatedElf.spells.includes('Ember Bolt')&&reincarnatedElf.ancestryGrantedSpells?.includes('Ember Bolt')&&!oldSpeciesFlags.elfSense&&!oldSpeciesFlags.lucky&&!oldSpeciesFlags.halfElfCharm&&Object.keys(oldSpeciesFlags.sceneTraitUses).length===0);
 const humanToDragonborn=actor({ancestry:'Human',level:5,maxHp:40,stats:{STR:11,DEX:11,CON:11,INT:11,WIS:11,CHA:11},spells:[]});
 const dragonbornTransformation=RV.applyReincarnateSpecies(humanToDragonborn,2,null,'Red');
 assert('Reincarnate can create a Dragonborn body with its own draconic ancestry choice and no legacy Dragonkin ability-score bonus',dragonbornTransformation.ok&&humanToDragonborn.ancestry==='Dragonborn'&&humanToDragonborn.stats.STR===10&&humanToDragonborn.stats.DEX===10&&humanToDragonborn.draconicAncestryChoice==='Red'&&humanToDragonborn.dragonbornBreathUsesMax===3,JSON.stringify({dragonbornTransformation,character:humanToDragonborn}));
 const dragonbornDefense=actor({id:'dragonborn-defense',name:'Red-lineage Dragonborn',ancestry:'Dragonborn',level:5,hp:30,maxHp:30,stats:{STR:10,DEX:10,CON:14,INT:10,WIS:10,CHA:10},resistances:['necrotic']});
 const lineageSet=RV.setDraconicAncestry(dragonbornDefense,'Red');
 T18.state={character:dragonbornDefense,campaign:{},combat:{mp:false},log:[]};
 const dragonbornPlayer={id:'dragonborn-defense',name:dragonbornDefense.name,character:dragonbornDefense};
 const resistedFire=T18.monsterDamage({player:dragonbornPlayer},10,'fire',{name:'Fire attacker'});
 const ordinaryCold=T18.monsterDamage({player:dragonbornPlayer},10,'cold',{name:'Cold attacker'});
 assert('Dragonborn lineage resistance halves matching damage in the live monster damage path without changing unrelated damage or stored resistances',lineageSet&&resistedFire===5&&ordinaryCold===10&&dragonbornDefense.hp===15&&JSON.stringify(dragonbornDefense.resistances)===JSON.stringify(['necrotic']),JSON.stringify({lineageSet,resistedFire,ordinaryCold,hp:dragonbornDefense.hp,resistances:dragonbornDefense.resistances}));
 const creatorMarkup=RV.creatorMarkup();
 const supportedLineages=['Black','Blue','Brass','Bronze','Copper','Gold','Green','Red','Silver','White'];
 assert('The new-character creator presents a Draconic Ancestry selector containing all ten lineages',creatorMarkup.includes('name="draconicAncestryChoice"')&&supportedLineages.every(name=>creatorMarkup.includes(`value="${name}"`)),creatorMarkup.includes('id="draconicAncestryField"'));
 assert('Dragonborn creation requires a supported lineage and rejects blank or unknown choices',!RV.isValidDraconicAncestry('')&&!RV.isValidDraconicAncestry('Purple')&&supportedLineages.every(name=>RV.isValidDraconicAncestry(name)));
 const consumedDiamond=actor({inventory:[{id:'revivify-diamond',name:'Diamond',type:'gem',value:300,count:1}]});
 const consumedDiamondResult=RV.consumeMaterialComponent(consumedDiamond,{name:'Revivify',components:'V, S, M (diamond worth 300 gp, consumed)'});
 assert('A consumed material component is removed after a successful material check even when its consume marker exists only in components',consumedDiamondResult&&consumedDiamond.inventory.length===0);
 const reusableGem=actor({inventory:[{id:'reusable-gem',name:'Pearl',type:'gem',value:1000,count:2}]});
 const reusableGemResult=RV.consumeMaterialComponent(reusableGem,{name:'Focus Spell',components:'V, S, M (pearl worth 1,000 gp)'});
 assert('A priced but reusable material component is validated without reducing its quantity',reusableGemResult&&reusableGem.inventory.length===1&&reusableGem.inventory[0].count===2);
 const insufficientGem=actor({inventory:[{id:'cheap-diamond',name:'Diamond',type:'gem',value:299,count:1}]});
 const insufficientGemResult=RV.consumeMaterialComponent(insufficientGem,{name:'Revivify',components:'V, S, M (diamond worth at least 300 gp, consumed)'});
 assert('A material item below the spell minimum is rejected and remains in inventory',insufficientGemResult===false&&insufficientGem.inventory.length===1&&insufficientGem.inventory[0].count===1);
 const descriptionDiamond=actor({inventory:[{id:'description-diamond',name:'Diamond',type:'gem',value:1000,count:2}]});
 const descriptionDiamondResult=RV.consumeMaterialComponent(descriptionDiamond,{name:'Resurrection',components:'V, S, M (diamond)',description:'A diamond worth at least 1,000 gp is consumed by this spell.'});
 assert('Material value and consumption can also be read from the supported description fallback',descriptionDiamondResult&&descriptionDiamond.inventory[0].count===1&&RV.materialComponentCost({components:'M (diamond)',desc:'Diamond worth 1,000 gp.'})===1000);
 const humanToDragonkin=actor({ancestry:'Human',level:5,maxHp:40,stats:{STR:11,DEX:11,CON:11,INT:11,WIS:11,CHA:11},spells:[]});
 RV.applyReincarnateSpecies(humanToDragonkin,2,'Dragonkin');
 assert('A DM species override may choose another supported playable species while preserving the rolled 1d10 result',humanToDragonkin.ancestry==='Dragonkin'&&humanToDragonkin.dragonBreathUsed===false);
 const dwarfToElf=actor({ancestry:'Dwarf',level:4,maxHp:48,stats:{STR:10,DEX:10,CON:14,INT:10,WIS:10,CHA:10}});
 RV.applyReincarnateSpecies(dwarfToElf,4);
 assert('Leaving Dwarf removes the app’s ancestry-derived two-HP-per-level maximum bonus',dwarfToElf.ancestry==='Elf'&&dwarfToElf.maxHp===40&&dwarfToElf.stats.CON===12);
 const elfToDwarf=actor({ancestry:'Elf',level:4,maxHp:40,stats:{STR:10,DEX:12,CON:12,INT:10,WIS:10,CHA:10}});
 RV.applyReincarnateSpecies(elfToDwarf,3);
 assert('Becoming Dwarf applies the app’s ancestry-derived two-HP-per-level maximum bonus',elfToDwarf.ancestry==='Dwarf'&&elfToDwarf.maxHp===48&&elfToDwarf.stats.CON===14);
 const tieflingToElf=actor({ancestry:'Tiefling',classId:'Fighter',level:4,stats:{STR:10,DEX:10,CON:10,INT:10,WIS:10,CHA:12},spells:['Ember Bolt'],ancestryGrantedSpells:['Ember Bolt']});
 RV.applyReincarnateSpecies(tieflingToElf,4);
 assert('Leaving Tiefling removes only the ancestry-granted Ember Bolt from a non-caster',tieflingToElf.ancestry==='Elf'&&!tieflingToElf.spells.includes('Ember Bolt'));
 const tieflingCaster=actor({ancestry:'Tiefling',classId:'Sorcerer',level:4,stats:{STR:10,DEX:10,CON:10,INT:10,WIS:10,CHA:12},spells:['Ember Bolt']});
 RV.applyReincarnateSpecies(tieflingCaster,4);
 assert('Leaving Tiefling preserves Ember Bolt when it is also a native class spell',tieflingCaster.ancestry==='Elf'&&tieflingCaster.spells.includes('Ember Bolt'));
 const revivalClock=Date.UTC(2026,10,27,12,0,0);
 const revivalProbe=deathAt=>actor({hp:0,mpDead:true,creatureTypeAtDeath:'Humanoid',deathAt});
 const centuryCutoff=new Date(revivalClock);centuryCutoff.setUTCFullYear(centuryCutoff.getUTCFullYear()-100);
 const bicenturyCutoff=new Date(revivalClock);bicenturyCutoff.setUTCFullYear(bicenturyCutoff.getUTCFullYear()-200);
 const tenDays=10*24*60*60*1000;
 assert('Revivify eligibility includes the exact one-minute boundary and rejects one millisecond beyond it',RV.revivalEligibility(revivalProbe(revivalClock-60000),'Revivify',revivalClock).ok&&!RV.revivalEligibility(revivalProbe(revivalClock-60001),'Revivify',revivalClock).ok);
 assert('Raise Dead and Reincarnate eligibility includes the exact ten-day boundary',RV.revivalEligibility(revivalProbe(revivalClock-tenDays),'Raise Dead',revivalClock).ok&&RV.revivalEligibility(revivalProbe(revivalClock-tenDays),'Reincarnate',revivalClock).ok&&!RV.revivalEligibility(revivalProbe(revivalClock-tenDays-1),'Raise Dead',revivalClock).ok);
 T.gameplay.setSpellData('Reincarnate',{name:'Reincarnate',level:5,classes:['Druid'],kind:'utility',range:'Touch',castingTime:'1 hour',components:'V, S, M (rare oils worth 1,000+ GP)',description:'You touch a dead Humanoid or a piece of one. If the creature has been dead no longer than 10 days, the spell forms a new body for it and calls the soul to enter that body.'});
 const reincarnateDruid=actor({id:'reincarnate-druid',name:'Reincarnate Druid',classId:'Druid',level:9,classLevels:{Druid:9},spells:['Reincarnate'],preparedSpells:['Reincarnate'],spellSlotsByLevel:{5:1}});
 const reincarnateDiagnostics=T.gameplay.spellDiagnostics(reincarnateDruid,'Reincarnate');
 assert('Reincarnate enters the shared revival pipeline despite its new-body description',reincarnateDiagnostics.exists&&reincarnateDiagnostics.effect?.kind==='revive',JSON.stringify(reincarnateDiagnostics));
 T.gameplay.setSpellData('Raise Dead',{name:'Raise Dead',level:5,classes:['Cleric'],kind:'revive',range:'Touch',castingTime:'1 hour',components:'V, S',description:'Return a dead creature to life.'});
 const raiseCaster=actor({id:'raise-caster',name:'Raise Dead Cleric',classId:'Cleric',level:9,classLevels:{Cleric:9},spells:['Raise Dead'],preparedSpells:['Raise Dead'],spellSlotsByLevel:{5:1},spellSlotSpentThisTurn:false});
 const raiseCasterPlayer={id:'raise-caster',name:'Raise Dead Cleric',connected:true,character:raiseCaster};
 const raiseTarget=actor({id:'raise-target',name:'Raise Dead Target',hp:0,maxHp:40,mpDead:true,dead:true,deathAt:Date.now()-24*60*60*1000,deathFailure:3});
 const raiseTargetPlayer={id:'raise-target',name:'Raise Dead Target',connected:true,character:raiseTarget};
 T18.state={character:raiseCaster,campaign:{day:1,region:'Long Cast Revival',location:'Long Cast Revival',visited:['Long Cast Revival'],companions:[],npcs:[],sideQuests:[],story:{},flags:{},mainQuest:{kind:'test',title:'Long Cast Revival',goal:'Validate remote out-of-combat revival'},multiplayer:{active:true,players:[raiseCasterPlayer,raiseTargetPlayer]}},combat:null,log:[]};
 const raiseDeadCast=T.gameplay.castSpell(raiseCasterPlayer,'Raise Dead','raise-target',true);
 assert('Raise Dead can target a remote campaign member outside combat and applies the four-point return penalty',raiseDeadCast===true&&raiseTarget.hp===1&&raiseTarget.mpDead===false&&raiseTarget.revivalD20Penalty===4,JSON.stringify({raiseDeadCast,target:{hp:raiseTarget.hp,dead:raiseTarget.mpDead,penalty:raiseTarget.revivalD20Penalty},casterSlots:raiseCaster.spellSlotsByLevel}));
 T.gameplay.setSpellData('Reincarnate',{name:'Reincarnate',level:5,classes:['Druid'],kind:'revive',range:'Touch',castingTime:'1 hour',components:'V, S, M (rare oils worth 1,000+ GP)',description:'You touch a dead Humanoid or a piece of one. The spell forms a new body for it and calls the soul to enter that body.'});
 const castReincarnateCaster=actor({id:'cast-reincarnate-caster',name:'Reincarnate Druid',classId:'Druid',level:9,classLevels:{Druid:9},spells:['Reincarnate'],preparedSpells:['Reincarnate'],spellSlotsByLevel:{5:1},spellSlotSpentThisTurn:false,inventory:[{id:'reincarnate-oils',name:'Rare oils and unguents',type:'material',value:1000,count:1}]});
 const castReincarnatePlayer={id:'cast-reincarnate-caster',name:'Reincarnate Druid',connected:true,character:castReincarnateCaster};
 const castReincarnateTarget=actor({id:'cast-reincarnate-target',name:'Reincarnated Hero',ancestry:'Elf',hp:0,maxHp:42,stats:{STR:10,DEX:16,CON:12,INT:10,WIS:10,CHA:12},mpDead:true,dead:true,deathAt:Date.now()-24*60*60*1000,creatureTypeAtDeath:'Humanoid',deathFailure:3});
 const castReincarnateTargetPlayer={id:'cast-reincarnate-target',name:'Reincarnated Hero',connected:true,character:castReincarnateTarget};
 T18.state={character:castReincarnateCaster,campaign:{day:1,region:'Reincarnate Cast Test',location:'Reincarnate Cast Test',visited:['Reincarnate Cast Test'],companions:[],npcs:[],sideQuests:[],story:{},flags:{elfSense:true},mainQuest:{kind:'test',title:'Reincarnate Cast Test',goal:'Validate remote new-body transformation'},multiplayer:{active:true,players:[castReincarnatePlayer,castReincarnateTargetPlayer]}},combat:null,log:[]};
 const castReincarnate=T.gameplay.castSpell(castReincarnatePlayer,'Reincarnate','cast-reincarnate-target',true,{speciesRoll:10});
 assert('A successful remote out-of-combat Reincarnate cast applies the rolled species and restores the target with 1 HP',castReincarnate===true&&castReincarnateTarget.hp===1&&castReincarnateTarget.ancestry==='Tiefling'&&castReincarnateTarget.stats.DEX===14&&castReincarnateTarget.stats.CHA===14&&castReincarnateTarget.mpDead===false&&!Object.prototype.hasOwnProperty.call(castReincarnateTarget,'deathAt')&&castReincarnateTarget.spells.includes('Ember Bolt'),JSON.stringify({castReincarnate,target:castReincarnateTarget,casterSlots:castReincarnateCaster.spellSlotsByLevel}));
 const trueResEffectsTarget=actor({ancestry:'Elf',hp:0,dead:true,mpDead:true,creatureTypeAtDeath:'Undead',undeadAtDeath:true,preUndeadCreatureType:'Humanoid',bodyExists:false,conditions:[{name:'poisoned'},{name:'cursed'},{name:'frightened'}],poisons:[{name:'wyvern venom'}],magicalContagions:[{name:'arcane blight'}],curses:[{name:'geas'}],diseases:[{name:'ordinary fever',magical:false}],afflictions:[{type:'magical-contagion',name:'hex rot'},{type:'curse',name:'grave mark'},{type:'disease',name:'ordinary fever',magical:false}]});
 const trueResEffects=RV.applyTrueResurrectionEffects(trueResEffectsTarget,{spokenName:trueResEffectsTarget.name});
 assert('True Resurrection removes poison, magical contagions and curses while retaining unrelated conditions and nonmagical diseases',trueResEffects.ok&&trueResEffectsTarget.conditions.length===1&&trueResEffectsTarget.conditions[0].name==='frightened'&&trueResEffectsTarget.poisons.length===0&&trueResEffectsTarget.magicalContagions.length===0&&trueResEffectsTarget.curses.length===0&&trueResEffectsTarget.diseases.length===1&&trueResEffectsTarget.afflictions.length===1&&trueResEffectsTarget.afflictions[0].name==='ordinary fever',JSON.stringify({trueResEffects,conditions:trueResEffectsTarget.conditions,afflictions:trueResEffectsTarget.afflictions}));
 assert('True Resurrection restores an Undead target to its recorded non-Undead form',trueResEffects.wasUndead&&trueResEffects.restoredType==='Humanoid'&&trueResEffectsTarget.creatureType==='Humanoid'&&trueResEffectsTarget.undead===false&&trueResEffectsTarget.restoredFromUndead===true);
 assert('True Resurrection creates a replacement body when the original body no longer exists and records the name and ten-foot placement rule',trueResEffects.newBodyCreated&&trueResEffectsTarget.bodyExists===true&&trueResEffectsTarget.newBodyCreated===true&&trueResEffectsTarget.resurrectionBody.spokenName===trueResEffectsTarget.name&&trueResEffectsTarget.resurrectionBody.placement.withinFeet===10&&trueResEffectsTarget.resurrectionBody.placement.requiresUnoccupiedSpace===true);
 assert('True Resurrection 25,000+ GP diamond notation parses the 25,000 gp minimum',RV.materialComponentCost({components:'M (diamonds worth 25,000+ GP, which the spell consumes)'})===25000);
 const unnamedBodyTarget=actor({bodyExists:false,name:''});
 assert('True Resurrection refuses a no-body restoration when the creature’s name has not been spoken',!RV.applyTrueResurrectionEffects(unnamedBodyTarget).ok&&unnamedBodyTarget.bodyExists===false);
 T.gameplay.setSpellData('True Resurrection',{name:'True Resurrection',level:9,classes:['Druid'],kind:'revive',range:'Touch',castingTime:'1 hour',components:'V, S, M (diamonds worth 25,000+ GP, which the spell consumes)',description:'The creature returns with all its Hit Points. This spell neutralizes poison, cures magical contagions, lifts curses, restores a non-Undead form and can provide a new body if the original no longer exists.'});
 const trueResCaster=actor({id:'true-res-caster',name:'True Resurrection Druid',classId:'Druid',level:17,classLevels:{Druid:17},spells:['True Resurrection'],preparedSpells:['True Resurrection'],spellSlotsByLevel:{9:1},spellSlotSpentThisTurn:false,inventory:[{id:'true-res-diamond',name:'Diamond',type:'gem',value:25000,count:1}]});
 const trueResCasterPlayer={id:'true-res-caster',name:'True Resurrection Druid',connected:true,character:trueResCaster};
 const trueResTarget=actor({id:'true-res-target',name:'Restored Undead Hero',ancestry:'Elf',hp:0,maxHp:52,mpDead:true,dead:true,deathAt:Date.now()-2*24*60*60*1000,creatureTypeAtDeath:'Undead',undeadAtDeath:true,preUndeadCreatureType:'Humanoid',creatureType:'Undead',bodyExists:false,conditions:[{name:'poisoned'},{name:'cursed'},{name:'frightened'}],poisons:[{name:'death venom'}],magicalContagions:[{name:'arcane blight'}],curses:[{name:'soul chain'}],diseases:[{name:'ordinary fever',magical:false}]});
 const trueResTargetPlayer={id:'true-res-target',name:'Restored Undead Hero',connected:true,character:trueResTarget};
 T18.state={character:trueResCaster,campaign:{day:1,region:'True Resurrection Test',location:'True Resurrection Test',visited:['True Resurrection Test'],companions:[],npcs:[],sideQuests:[],story:{},flags:{},mainQuest:{kind:'test',title:'True Resurrection Test',goal:'Validate complete True Resurrection effects'},multiplayer:{active:true,players:[trueResCasterPlayer,trueResTargetPlayer]}},combat:null,log:[]};
 const trueResCast=T.gameplay.castSpell(trueResCasterPlayer,'True Resurrection','true-res-target',true);
 assert('A successful True Resurrection cast restores full HP, consumes its 25,000 gp diamond, cleanses the target and creates a named new body',trueResCast===true&&trueResTarget.hp===52&&trueResTarget.mpDead===false&&trueResTarget.creatureType==='Humanoid'&&trueResTarget.undead===false&&trueResTarget.bodyExists===true&&trueResTarget.resurrectionBody?.spokenName===trueResTarget.name&&trueResTarget.conditions.length===1&&trueResTarget.conditions[0].name==='frightened'&&trueResTarget.poisons.length===0&&trueResTarget.magicalContagions.length===0&&trueResTarget.curses.length===0&&trueResTarget.diseases.length===1&&trueResCaster.inventory.length===0,JSON.stringify({trueResCast,target:trueResTarget,casterInventory:trueResCaster.inventory,slots:trueResCaster.spellSlotsByLevel}));
 T18.state={character:actor(),campaign:{},combat:null,log:[]};
 const centuryEligibility=RV.revivalEligibility(revivalProbe(centuryCutoff.getTime()),'Resurrection',revivalClock),centuryBeforeEligibility=RV.revivalEligibility(revivalProbe(centuryCutoff.getTime()-1),'Resurrection',revivalClock);
 assert('Resurrection eligibility uses the exact 100-calendar-year boundary, including leap-year spans',centuryEligibility.ok&&!centuryBeforeEligibility.ok,JSON.stringify({cutoff:centuryCutoff.toISOString(),now:new Date(revivalClock).toISOString(),at:centuryEligibility,before:centuryBeforeEligibility,character:revivalProbe(centuryCutoff.getTime())}));
 const bicenturyEligibility=RV.revivalEligibility(revivalProbe(bicenturyCutoff.getTime()),'True Resurrection',revivalClock),bicenturyBeforeEligibility=RV.revivalEligibility(revivalProbe(bicenturyCutoff.getTime()-1),'True Resurrection',revivalClock);
 assert('True Resurrection eligibility uses the exact 200-calendar-year boundary, including leap-year spans',bicenturyEligibility.ok&&!bicenturyBeforeEligibility.ok,JSON.stringify({cutoff:bicenturyCutoff.toISOString(),now:new Date(revivalClock).toISOString(),at:bicenturyEligibility,before:bicenturyBeforeEligibility,character:revivalProbe(bicenturyCutoff.getTime())}));
 const oldAgeTarget=revivalProbe(revivalClock-1000);oldAgeTarget.causeOfDeath='old age';
 assert('Old-age deaths are rejected by Revivify, Resurrection and True Resurrection',!RV.revivalEligibility(oldAgeTarget,'Revivify',revivalClock).ok&&!RV.revivalEligibility(oldAgeTarget,'Resurrection',revivalClock).ok&&!RV.revivalEligibility(oldAgeTarget,'True Resurrection',revivalClock).ok);
 assert('Raise Dead and Reincarnate follow their printed eligibility text and do not inherit an unstated old-age exclusion',RV.revivalEligibility(oldAgeTarget,'Raise Dead',revivalClock).ok&&RV.revivalEligibility(oldAgeTarget,'Reincarnate',revivalClock).ok);
 const undeadTarget=revivalProbe(revivalClock-1000);undeadTarget.creatureTypeAtDeath='Undead';undeadTarget.undeadAtDeath=true;
 assert('Raise Dead and Resurrection reject a target that was Undead at death',!RV.revivalEligibility(undeadTarget,'Raise Dead',revivalClock).ok&&!RV.revivalEligibility(undeadTarget,'Resurrection',revivalClock).ok);
 assert('True Resurrection permits an Undead target and restores its eligibility',RV.revivalEligibility(undeadTarget,'True Resurrection',revivalClock).ok);
 assert('Reincarnate accepts a dead Humanoid or piece but rejects a creature whose type at death was not Humanoid',RV.revivalEligibility(revivalProbe(revivalClock-1000),'Reincarnate',revivalClock).ok&&!RV.revivalEligibility({...revivalProbe(revivalClock-1000),creatureTypeAtDeath:'Beast'},'Reincarnate',revivalClock).ok);
 const missingLimb=revivalProbe(revivalClock-1000);missingLimb.missingBodyParts=['left hand'];
 assert('Revivify rejects any recorded missing body part while Raise Dead and new-body Reincarnate do not restore that missing part',!RV.revivalEligibility(missingLimb,'Revivify',revivalClock).ok&&RV.revivalEligibility(missingLimb,'Raise Dead',revivalClock).ok&&RV.revivalEligibility(missingLimb,'Reincarnate',revivalClock).ok);
 const missingVital=revivalProbe(revivalClock-1000);missingVital.missingBodyParts=['head'];
 assert('Raise Dead automatically fails when a vital part such as the head is missing, while Resurrection can restore it',!RV.revivalEligibility(missingVital,'Raise Dead',revivalClock).ok&&RV.revivalEligibility(missingVital,'Resurrection',revivalClock).ok);
 const explicitlyMissingVital=revivalProbe(revivalClock-1000);explicitlyMissingVital.missingVitalParts=['heart'];
 assert('Raise Dead also rejects an explicitly missing integral organ',RV.hasMissingVitalParts(explicitlyMissingVital)&&!RV.revivalEligibility(explicitlyMissingVital,'Raise Dead',revivalClock).ok);
 const snapshotHuman=actor({ancestry:'Human',creatureType:'Humanoid',diedOfOldAge:true});
 const snapshotUndead=actor({ancestry:'Human',creatureType:'Undead'});
 RV.recordDeathSnapshot(snapshotHuman);RV.recordDeathSnapshot(snapshotUndead);
 assert('Death recording snapshots Humanoid type and an explicit old-age cause without guessing age from years lived',snapshotHuman.creatureTypeAtDeath==='Humanoid'&&snapshotHuman.causeOfDeath==='old-age'&&RV.isOldAgeDeath(snapshotHuman));
 assert('Death recording preserves explicit Undead type at the time of death rather than inferring it from ancestry',snapshotUndead.creatureTypeAtDeath==='Undead'&&snapshotUndead.undeadAtDeath===true&&RV.wasUndeadAtDeath(snapshotUndead));
 assert('An unconscious or stable creature at 0 HP is not classified as a dead resurrection target',!RV.revivalEligibility(actor({hp:0,mpDead:false,dead:false,deathAt:revivalClock-1000}),'Revivify',revivalClock).ok);
 assert('A missing or future death timestamp cannot satisfy revival eligibility',!RV.revivalEligibility(actor({hp:0,mpDead:true}),'Revivify',revivalClock).ok&&!RV.revivalEligibility(revivalProbe(revivalClock+1),'Revivify',revivalClock).ok);

 const raiseReturn=actor({hp:1}),resurrectionReturn=actor({hp:1}),revivifyReturn=actor({hp:1});
 assert('Raise Dead and Resurrection impose a four-point return penalty but Revivify does not',RV.setRevivalReturnPenalty(raiseReturn,'Raise Dead')&&RV.setRevivalReturnPenalty(resurrectionReturn,'Resurrection')&&RV.setRevivalReturnPenalty(revivifyReturn,'Revivify')===false&&raiseReturn.revivalD20Penalty===4&&resurrectionReturn.revivalD20Penalty===4&&!Object.prototype.hasOwnProperty.call(revivifyReturn,'revivalD20Penalty'));
 const penaltyCheckHero=actor({revivalD20Penalty:4});
 const penaltyCheck=RV.canonicalAbilityCheck(penaltyCheckHero,'Athletics',15,{roll:18,bonusOverride:0});
 assert('The Raise Dead/Resurrection penalty applies to canonical ability checks',penaltyCheck.roll===18&&penaltyCheck.bonus===-4&&penaltyCheck.total===14&&penaltyCheck.success===false&&penaltyCheck.d20?.success===false,JSON.stringify(penaltyCheck));
 const penaltySaveHero=actor({revivalD20Penalty:4});
 const priorPenaltySaveRandom=math.random;let penaltySave;try{math.random=()=>0.9;penaltySave=RV.savingThrow(penaltySaveHero,'CON',16);}finally{math.random=priorPenaltySaveRandom;}
 assert('The return penalty applies to saving throws after the natural roll',penaltySave.roll===19&&penaltySave.bonus===-4&&penaltySave.total===15&&penaltySave.success===false,JSON.stringify(penaltySave));
 const penaltyAttackHero=actor({revivalD20Penalty:4}),penaltyAttackTarget=actor({id:'penalty-attack-target',name:'Penalty Attack Target',ac:16});
 const priorPenaltyAttackRandom=math.random;let penaltyAttack;try{math.random=()=>0.9;penaltyAttack=RV.attackRoll(0,penaltyAttackHero,penaltyAttackTarget,false);}finally{math.random=priorPenaltyAttackRandom;}
 assert('The return penalty applies to weapon attack-roll totals',penaltyAttack.r===19&&penaltyAttack.total===15,JSON.stringify(penaltyAttack));
 const penaltyNaturalTwenty=actor({revivalD20Penalty:4}),penaltyHighAC=actor({id:'penalty-high-ac',name:'Penalty High AC',ac:25});
 const priorNaturalTwentyRandom=math.random;let naturalTwentyAttack;try{math.random=()=>0.999999;naturalTwentyAttack=RV.attackRoll(0,penaltyNaturalTwenty,penaltyHighAC,false);}finally{math.random=priorNaturalTwentyRandom;}
 assert('A natural 20 remains an automatic hit even when the return penalty lowers its total below AC',naturalTwentyAttack.r===20&&naturalTwentyAttack.total===16&&naturalTwentyAttack.success===true,JSON.stringify(naturalTwentyAttack));
 const resurrectionTaxCaster=actor({resurrectionCasterTax:true});
 const taxCheck=T.canonicalAbilityCheck(resurrectionTaxCaster,'Athletics',10,{roll:18,secondRoll:3,bonusOverride:0});
 assert('Resurrection caster tax imposes Disadvantage on canonical ability checks',taxCheck.roll===3&&taxCheck.disadvantage===true&&taxCheck.success===false,JSON.stringify(taxCheck));
 const taxAttackTarget=actor({id:'tax-attack-target',name:'Tax Attack Target',ac:10});
 const taxAttackRandom=math.random;let taxAttack;const taxAttackRolls=[0.9,0.1];
 try{math.random=()=>taxAttackRolls.shift()??0.1;taxAttack=RV.attackRoll(0,resurrectionTaxCaster,taxAttackTarget,false);}finally{math.random=taxAttackRandom;}
 assert('Resurrection caster tax imposes Disadvantage on weapon attacks',taxAttack.r===3&&taxAttack.dis===true&&taxAttack.total<taxAttackTarget.ac,JSON.stringify(taxAttack));
 const taxSaveRandom=math.random;let taxSave;const taxSaveRolls=[0.9,0.1];
 try{math.random=()=>taxSaveRolls.shift()??0.1;taxSave=RV.savingThrow(resurrectionTaxCaster,'CON',10);}finally{math.random=taxSaveRandom;}
 assert('Resurrection caster tax imposes Disadvantage on saving throws',taxSave.roll===3&&taxSave.disadvantage===true&&taxSave.success===false,JSON.stringify(taxSave));
 const resurrectionCasterProbe=actor(),resurrectionDayProbe=actor({hp:0,mpDead:true,deathAt:Date.now()-365*24*60*60*1000});
 assert('The Resurrection caster drawback begins at exactly 365 days and not one day earlier',RV.setResurrectionCasterTax(resurrectionCasterProbe,resurrectionDayProbe)&&resurrectionCasterProbe.resurrectionCasterTax===true&&!RV.setResurrectionCasterTax(actor(),{deathAt:Date.now()-364*24*60*60*1000},Date.now()));
 T.gameplay.setSpellData('Resurrection',{name:'Resurrection',level:7,classes:['Cleric'],kind:'revive',range:'Touch',castingTime:'1 hour',components:'V, S',description:'Return a dead creature to life.'});
 T.gameplay.setSpellData('Cure Wounds',{name:'Cure Wounds',level:1,classes:['Cleric'],kind:'heal',range:'Touch',castingTime:'Action',components:'V, S',description:'A creature regains hit points.'});
 const resurrectionCaster=actor({id:'resurrection-caster',name:'Resurrection Cleric',classId:'Cleric',level:13,classLevels:{Cleric:13},spells:['Resurrection','Cure Wounds'],preparedSpells:['Resurrection','Cure Wounds'],spellSlotsByLevel:{1:2,7:1},spellSlotSpentThisTurn:false});
 const resurrectionCasterPlayer={id:'resurrection-caster',name:'Resurrection Cleric',connected:true,character:resurrectionCaster};
 const resurrectionTarget=actor({id:'resurrection-target',name:'Resurrection Target',hp:0,maxHp:48,mpDead:true,dead:true,deathAt:Date.now()-365*24*60*60*1000,deathFailure:3,missingBodyParts:['left arm','heart'],missingVitalParts:['heart']});
 const resurrectionTargetPlayer={id:'resurrection-target',name:'Resurrection Target',connected:true,character:resurrectionTarget};
 T18.state={character:resurrectionCaster,campaign:{day:1,region:'Resurrection Tax Test',location:'Resurrection Tax Test',visited:['Resurrection Tax Test'],companions:[],npcs:[],sideQuests:[],story:{},flags:{},mainQuest:{kind:'test',title:'Resurrection Tax Test',goal:'Validate the caster tax'},multiplayer:{active:true,players:[resurrectionCasterPlayer,resurrectionTargetPlayer]}},combat:null,log:[]};
 const resurrectionCast=T.gameplay.castSpell(resurrectionCasterPlayer,'Resurrection','resurrection-target',true);
 assert('Resurrection of a target dead at least 365 days restores the target and taxes the caster',resurrectionCast===true&&resurrectionTarget.hp===48&&resurrectionTarget.revivalD20Penalty===4&&resurrectionTarget.missingBodyParts.length===0&&resurrectionTarget.missingVitalParts.length===0&&resurrectionCaster.resurrectionCasterTax===true,JSON.stringify({resurrectionCast,caster:resurrectionCaster,target:{hp:resurrectionTarget.hp,penalty:resurrectionTarget.revivalD20Penalty}}));
 const slotsBeforeTaxedCast={...resurrectionCaster.spellSlotsByLevel};
 const lockedCast=T.gameplay.castSpell(resurrectionCasterPlayer,'Cure Wounds',null,true);
 assert('A taxed Resurrection caster cannot cast another spell before a Long Rest',lockedCast===false&&JSON.stringify(resurrectionCaster.spellSlotsByLevel)===JSON.stringify(slotsBeforeTaxedCast),JSON.stringify({lockedCast,slots:resurrectionCaster.spellSlotsByLevel,toast:toast.textContent}));
 const taxRestedCompanion=actor({resurrectionCasterTax:true});
 RV.applyLongRestPenaltyRecovery({multiplayer:{players:[resurrectionCasterPlayer]},companions:[taxRestedCompanion]},resurrectionCaster);
 assert('The Long Rest recovery transaction clears the caster drawback for the whole resting party',!resurrectionCaster.resurrectionCasterTax&&!resurrectionTarget.resurrectionCasterTax&&!taxRestedCompanion.resurrectionCasterTax);
 T18.state={character:actor(),campaign:{},combat:null,log:[]};
 const penaltyRecoveryHero=actor({revivalD20Penalty:4});
 const firstPenaltyRecovery=RV.reduceRevivalPenaltyAfterLongRest(penaltyRecoveryHero),secondPenaltyRecovery=RV.reduceRevivalPenaltyAfterLongRest(penaltyRecoveryHero);
 const thirdPenaltyRecovery=RV.reduceRevivalPenaltyAfterLongRest(penaltyRecoveryHero),fourthPenaltyRecovery=RV.reduceRevivalPenaltyAfterLongRest(penaltyRecoveryHero);
 assert('Each completed Long Rest removes one point from the return penalty until it reaches zero',firstPenaltyRecovery===3&&secondPenaltyRecovery===2&&thirdPenaltyRecovery===1&&fourthPenaltyRecovery===0&&!Object.prototype.hasOwnProperty.call(penaltyRecoveryHero,'revivalD20Penalty'));
 const restedPenaltyHero=actor({id:'rested-penalty-hero',name:'Rested Penalty Hero',revivalD20Penalty:4});
 const remoteRestedHero=actor({id:'remote-rested-hero',name:'Remote Rested Hero',revivalD20Penalty:2});
 const restedCompanion=actor({id:'rested-companion',name:'Rested Companion',revivalD20Penalty:1});
 const restCampaign={multiplayer:{players:[{id:'remote-rested-hero',character:remoteRestedHero},{id:'host-duplicate',character:restedPenaltyHero}]},companions:[restedCompanion]};
 const reducedByRest=RV.applyLongRestPenaltyRecovery(restCampaign,restedPenaltyHero);
 assert('A completed Long Rest penalty transaction reduces host, remote-player and companion penalties exactly once',reducedByRest===3&&restedPenaltyHero.revivalD20Penalty===3&&remoteRestedHero.revivalD20Penalty===1&&!Object.prototype.hasOwnProperty.call(restedCompanion,'revivalD20Penalty'),JSON.stringify({reducedByRest,host:restedPenaltyHero.revivalD20Penalty,remote:remoteRestedHero.revivalD20Penalty,companion:restedCompanion.revivalD20Penalty}));
 assert('A rest with no return penalties makes no unnecessary state change',RV.applyLongRestPenaltyRecovery({multiplayer:{players:[]},companions:[]},actor())===0);

 assert('Registry contains all 15 SRD conditions',T.names.length===15&&['blinded','charmed','deafened','exhaustion','frightened','grappled','incapacitated','invisible','paralyzed','petrified','poisoned','prone','restrained','stunned','unconscious'].every(n=>T.names.includes(n)));

 assert('Monster displacement planner pushes the requested 10 feet',T18.displacementPlan({x:2,y:2},{x:0,y:2},'push',10,()=>true)?.to.x===4);
 assert('Monster displacement planner pulls toward the source',T18.displacementPlan({x:3,y:2},{x:0,y:2},'pull',5,()=>true)?.to.x===2);
 assert('Monster displacement planner stops before blocked or occupied squares',T18.displacementPlan({x:1,y:2},{x:0,y:2},'push',15,p=>p.x<3)?.to.x===2);
 const teleport=T18.teleportPlan({x:0,y:0},{x:10,y:0},30,p=>p.x===6&&p.y===0,()=>true);
 assert('Teleport destination selection respects the maximum range and chooses an open closer square',teleport?.to.x===6&&teleport.travelFeet<=30&&teleport.remainingFeet<50);
 assert('Teleport destination selection rejects blocked or occupied destinations',T18.teleportPlan({x:0,y:0},{x:10,y:0},30,()=>false,()=>true)===null);
 assert('Misty Step resolves to its 30-foot tactical range while unsupported teleport wording remains unguessed',T.gameplay.playerTeleportRange('Misty Step',{description:'Teleport a short distance in a flash.'})===30&&T.gameplay.playerTeleportRange('Dimension Door',{description:'Teleport yourself and an ally beyond a barrier.'})===null);
 const teleportTerrain=[];for(let x=0;x<8;x++)for(let y=0;y<6;y++)teleportTerrain.push({x,y,kind:'floor'});
 teleportTerrain.push({x:2,y:3,kind:'wall'});
 const teleportHero=actor({id:'teleport-hero',name:'Teleport Hero',pos:{x:1,y:3}});
 const teleportEnemy=actor({id:'teleport-enemy',name:'Teleport Enemy',hp:20,pos:{x:6,y:3}});
 const teleportPlayer={id:'teleport-hero',name:'Teleport Hero',connected:true,character:teleportHero};
 T18.state={character:teleportHero,campaign:{multiplayer:{players:[teleportPlayer]}},combat:{mp:{heroPositions:{'teleport-hero':{x:1,y:3}}},heroPos:{x:1,y:3},enemies:[teleportEnemy],map:{width:8,height:6,terrain:teleportTerrain}},log:[]};
 const legalPlayerTeleport=T.gameplay.playerTeleportPlan(teleportPlayer,30);
 assert('Player teleport planner stays within 30 feet, avoids occupied and blocked cells, and respects line of sight',!!legalPlayerTeleport&&legalPlayerTeleport.travelFeet<=30&&!(legalPlayerTeleport.to.x===teleportEnemy.pos.x&&legalPlayerTeleport.to.y===teleportEnemy.pos.y)&&!(legalPlayerTeleport.to.x===2&&legalPlayerTeleport.to.y===3)&&T18.state.combat.mp.heroPositions['teleport-hero'].x===1);
 T.apply(teleportEnemy,'grappled','permanent','Teleport Hero',{sourceId:'teleport-hero',grapplerId:'teleport-hero',grappleRange:5});
 const playerTeleportApplied=legalPlayerTeleport&&T.gameplay.applyPlayerTeleport(teleportPlayer,legalPlayerTeleport);
 assert('Applying player teleport updates the correct multiplayer hero position and combat origin and releases a grapple beyond reach',playerTeleportApplied&&T18.state.combat.mp.heroPositions['teleport-hero'].x===legalPlayerTeleport.to.x&&T18.state.combat.heroPos.x===legalPlayerTeleport.to.x&&!T.has(teleportEnemy,'grappled'));
 const soloTeleportHero=actor({id:'solo-teleport-hero',name:'Solo Teleport Hero'});
 T18.state={character:soloTeleportHero,campaign:{},combat:{mp:null,heroPos:{x:1,y:3},enemies:[{id:'solo-teleport-enemy',name:'Solo Teleport Enemy',hp:20,pos:{x:6,y:3}}],map:{width:8,height:6,terrain:teleportTerrain}},log:[]};
 const soloPlayerTeleport=T.gameplay.playerTeleportPlan({id:'solo',character:soloTeleportHero},30);
 const soloTeleportApplied=soloPlayerTeleport&&T.gameplay.applyPlayerTeleport({id:'solo',character:soloTeleportHero},soloPlayerTeleport);
 assert('Applying player teleport updates solo tactical position through the same movement transaction',soloTeleportApplied&&T18.state.combat.heroPos.x===soloPlayerTeleport.to.x&&T18.state.combat.heroPos.y===soloPlayerTeleport.to.y);
 T18.state={character:soloTeleportHero,campaign:{},combat:{mp:null,heroPos:{x:1,y:3},enemies:[{id:'sparse-teleport-enemy',name:'Sparse Teleport Enemy',hp:20,pos:{x:6,y:3}}],map:{width:8,height:6,terrain:[]}},log:[]};
 const sparseTeleportPlan=T.gameplay.playerTeleportPlan({id:'solo',character:soloTeleportHero},30);
 assert('Player teleport treats absent cells in sparse terrain maps as open floor',!!sparseTeleportPlan&&sparseTeleportPlan.travelFeet<=30);
 const mistyCaster=actor({id:'misty-caster',name:'Misty Caster',classId:'Wizard',level:3,classLevels:{Wizard:3},spells:['Misty Step'],preparedSpells:['Misty Step'],spellSlotsByLevel:{2:2},actionSpent:false,bonusActionSpent:false});
 const mistyEnemy=actor({id:'misty-enemy',name:'Misty Enemy',hp:20,pos:{x:6,y:3}});
 T18.state={character:mistyCaster,campaign:{day:1,region:'Teleport Test',location:'Teleport Test',visited:['Teleport Test'],companions:[],npcs:[],sideQuests:[],story:{},flags:{},mainQuest:{kind:'test',title:'Teleport Test',goal:'Validate Misty Step'}},combat:{mp:null,heroPos:{x:1,y:3},target:0,enemies:[mistyEnemy],map:{width:8,height:6,terrain:teleportTerrain}},log:[]};
 T.gameplay.setSpellData('Misty Step',{name:'Misty Step',level:2,classes:['Wizard'],kind:'utility',range:'Self',castingTime:'Bonus Action',description:'Teleport a short distance in a flash.'});
 const mistyPreflight=T.gameplay.spellDiagnostics(mistyCaster,'Misty Step');
 const mistyCast=T.gameplay.castSpell({id:'solo',name:'Misty Caster',character:mistyCaster},'Misty Step');
 const mistyDestination=T18.state.combat.heroPos;
 assert('Casting Misty Step uses a visible unoccupied destination within 30 feet, spends exactly one slot and its Bonus Action, and avoids the legacy zero-coordinate position',mistyCast&&Math.max(Math.abs(mistyDestination.x-1),Math.abs(mistyDestination.y-3))*5<=30&&(mistyDestination.x!==1||mistyDestination.y!==3)&&!(mistyDestination.x===mistyEnemy.pos.x&&mistyDestination.y===mistyEnemy.pos.y)&&!(mistyDestination.x===2&&mistyDestination.y===3)&&!Object.prototype.hasOwnProperty.call(mistyCaster,'position')&&Number(mistyCaster.spellSlotsByLevel[2])===1&&mistyCaster.bonusActionSpent===true&&mistyCaster.actionSpent!==true&&mistyCaster.spellSlotSpentThisTurn===true,JSON.stringify({mistyPreflight,mistyCast,mistyDestination,legacyPosition:mistyCaster.position,slots:mistyCaster.spellSlotsByLevel,actionSpent:mistyCaster.actionSpent,bonusActionSpent:mistyCaster.bonusActionSpent}));
 T.gameplay.setSpellData('Hold Person',{name:'Hold Person',level:2,classes:['Wizard'],kind:'control',range:'60 feet',castingTime:'Action',description:'The target must succeed on a Wisdom saving throw or be Paralyzed for the duration.'});
 mistyCaster.spells.push('Hold Person');mistyCaster.preparedSpells.push('Hold Person');
 const slotsBeforeSecondCast=Number(mistyCaster.spellSlotsByLevel[2]);
 const secondLeveledCast=T.gameplay.castSpell({id:'solo',name:'Misty Caster',character:mistyCaster},'Hold Person');
 assert('A second leveled spell is blocked in the same turn after Misty Step without spending another slot or Action',secondLeveledCast===false&&Number(mistyCaster.spellSlotsByLevel[2])===slotsBeforeSecondCast&&mistyCaster.actionSpent!==true&&mistyCaster.spellSlotSpentThisTurn===true,JSON.stringify({secondLeveledCast,slotsBeforeSecondCast,slotsAfter:Number(mistyCaster.spellSlotsByLevel[2]),actionSpent:mistyCaster.actionSpent,spellSlotSpentThisTurn:mistyCaster.spellSlotSpentThisTurn}));
 const scalarSlotCaster=actor({id:'scalar-slot-caster',name:'Scalar Slot Caster',classId:'Wizard',level:3,classLevels:{Wizard:3},spells:['Misty Step'],preparedSpells:['Misty Step'],spellSlots:6,actionSpent:false,bonusActionSpent:false});
 T18.state={character:scalarSlotCaster,campaign:{day:1,region:'Teleport Test',location:'Teleport Test',visited:['Teleport Test'],companions:[],npcs:[],sideQuests:[],story:{},flags:{},mainQuest:{kind:'test',title:'Teleport Test',goal:'Validate scalar slot spending'}},combat:{mp:null,heroPos:{x:1,y:3},target:0,enemies:[{id:'scalar-slot-enemy',name:'Scalar Slot Enemy',hp:20,pos:{x:6,y:3}}],map:{width:8,height:6,terrain:teleportTerrain}},log:[]};
 const scalarSlotCast=T.gameplay.castSpell({id:'solo',name:'Scalar Slot Caster',character:scalarSlotCaster},'Misty Step');
 const scalarSlotMapTotal=Object.values(scalarSlotCaster.spellSlotsByLevel||{}).reduce((sum,count)=>sum+(Number(count)||0),0);
 assert('Leveled spell casts using legacy scalar slots spend exactly one migrated level-specific slot and set the per-turn slot lock',scalarSlotCast&&scalarSlotCaster.spellSlots===5&&scalarSlotMapTotal===5&&scalarSlotCaster.spellSlotSpentThisTurn===true&&scalarSlotCaster.bonusActionSpent===true,JSON.stringify({scalarSlotCast,spellSlots:scalarSlotCaster.spellSlots,spellSlotMap:scalarSlotCaster.spellSlotsByLevel,scalarSlotMapTotal,spellSlotSpentThisTurn:scalarSlotCaster.spellSlotSpentThisTurn,bonusActionSpent:scalarSlotCaster.bonusActionSpent}));
 const dimensionCaster=actor({id:'dimension-caster',name:'Dimension Caster',classId:'Wizard',level:7,classLevels:{Wizard:7},spells:['Dimension Door'],preparedSpells:['Dimension Door'],spellSlotsByLevel:{4:1},actionSpent:false});
 T.gameplay.setSpellData('Dimension Door',{name:'Dimension Door',level:4,classes:['Wizard'],kind:'utility',range:'500 feet',castingTime:'Action',description:'Teleport yourself and an ally beyond a barrier.'});
 T18.state={character:dimensionCaster,campaign:{day:1,region:'Teleport Test',location:'Teleport Test',visited:['Teleport Test'],companions:[],npcs:[],sideQuests:[],story:{},flags:{},mainQuest:{kind:'test',title:'Teleport Test',goal:'Validate safe rejection'}},combat:{mp:null,heroPos:{x:1,y:3},target:0,enemies:[{id:'dimension-enemy',name:'Dimension Enemy',hp:20,pos:{x:6,y:3}}],map:{width:8,height:6,terrain:teleportTerrain}},log:[]};
 const dimensionCast=T.gameplay.castSpell({id:'solo',name:'Dimension Caster',character:dimensionCaster},'Dimension Door');
 assert('Unsupported companion/destination teleport is rejected before consuming an action or spell slot',dimensionCast===false&&dimensionCaster.actionSpent!==true&&Number(dimensionCaster.spellSlotsByLevel[4])===1&&T18.state.combat.heroPos.x===1&&!Object.prototype.hasOwnProperty.call(dimensionCaster,'position'),JSON.stringify({dimensionCast,slots:dimensionCaster.spellSlotsByLevel,actionSpent:dimensionCaster.actionSpent,position:dimensionCaster.position,heroPos:T18.state.combat.heroPos}));
 const beforeNonCombatTeleportState=T18.state;
 const nonCombatTeleportCaster=actor({id:'noncombat-teleporter',name:'Noncombat Teleporter',classId:'Wizard',level:3,classLevels:{Wizard:3},spells:['Misty Step'],preparedSpells:['Misty Step'],spellSlotsByLevel:{2:1},actionSpent:false,bonusActionSpent:false});
 T18.state={...beforeNonCombatTeleportState,character:nonCombatTeleportCaster,combat:null};
 const nonCombatTeleportCast=T.gameplay.castSpell({id:'solo',name:'Noncombat Teleporter',character:nonCombatTeleportCaster},'Misty Step');
 assert('Unsupported noncombat teleport is rejected before writing a fake origin or spending resources',nonCombatTeleportCast===false&&Number(nonCombatTeleportCaster.spellSlotsByLevel[2])===1&&nonCombatTeleportCaster.actionSpent!==true&&nonCombatTeleportCaster.bonusActionSpent!==true&&!Object.prototype.hasOwnProperty.call(nonCombatTeleportCaster,'position'));
 T18.state=beforeNonCombatTeleportState;
 const legacyTeleportCaster=actor({id:'legacy-teleporter',name:'Legacy Teleporter',classId:'Wizard',level:3,classLevels:{Wizard:3},spells:['Misty Step'],spellSlotsByLevel:{2:2},spellSlots:6,actionSpent:false,bonusActionSpent:false,spellSlotSpentThisTurn:false});
 const legacyTeleportPlayer={id:'legacy-teleporter',name:'Legacy Teleporter',connected:true,character:legacyTeleportCaster};
 T.gameplay.setLegacySpellData('Misty Step',{name:'Misty Step',level:2,classes:['Wizard'],kind:'teleport',range:30,castingTime:'Bonus Action',desc:'Teleport a short distance to an unoccupied space.'});
 T18.state={character:legacyTeleportCaster,campaign:{day:1,region:'Legacy Teleport Test',location:'Legacy Teleport Test',visited:['Legacy Teleport Test'],companions:[],npcs:[],sideQuests:[],story:{},flags:{},mainQuest:{kind:'test',title:'Legacy Teleport Test',goal:'Validate legacy cast path'},multiplayer:{players:[legacyTeleportPlayer]}},combat:{mp:{heroPositions:{'legacy-teleporter':{x:1,y:3}}},heroPos:{x:1,y:3},target:0,enemies:[{id:'legacy-teleport-enemy',name:'Legacy Teleport Enemy',hp:20,pos:{x:6,y:3}}],map:{width:8,height:6,terrain:teleportTerrain}},log:[]};
 const legacyTeleportCast=T.gameplay.castLegacySpell(legacyTeleportPlayer,'Misty Step');
 const legacyTeleportDestination=T18.state.combat.mp.heroPositions['legacy-teleporter'];
 assert('Legacy multiplayer teleport fallback uses V29 range/LOS/occupancy checks, consumes one structured slot, preserves Bonus Action timing, and reconciles position',legacyTeleportCast&&Math.max(Math.abs(legacyTeleportDestination.x-1),Math.abs(legacyTeleportDestination.y-3))*5<=30&&(legacyTeleportDestination.x!==1||legacyTeleportDestination.y!==3)&&!(legacyTeleportDestination.x===2&&legacyTeleportDestination.y===3)&&Number(legacyTeleportCaster.spellSlotsByLevel[2])===1&&legacyTeleportCaster.actionSpent===false&&legacyTeleportCaster.bonusActionSpent===true&&legacyTeleportCaster.spellSlotSpentThisTurn===true,JSON.stringify({legacyTeleportCast,legacyTeleportDestination,slots:legacyTeleportCaster.spellSlotsByLevel,actionSpent:legacyTeleportCaster.actionSpent,bonusActionSpent:legacyTeleportCaster.bonusActionSpent,spellSlotSpentThisTurn:legacyTeleportCaster.spellSlotSpentThisTurn}));
 const gridPriorState=T18.state;
 const gridHero=actor({id:'grid-hero',name:'Grid Hero',size:'medium',movement:30,movementSpent:0});
 const gridHeldEnemy=actor({id:'grid-held-enemy',name:'Grid Held Enemy',size:'medium',hp:20,pos:{x:2,y:3}});
 T18.state={character:gridHero,campaign:{day:1,region:'Grid Test',location:'Grid Test',visited:['Grid Test'],companions:[],npcs:[],sideQuests:[],story:{},flags:{},mainQuest:{kind:'test',title:'Grid Test',goal:'Validate solo tactical grapple movement'}},combat:{mp:null,heroPos:{x:1,y:3},enemies:[gridHeldEnemy],map:{width:8,height:6,terrain:teleportTerrain.filter(cell=>cell.kind!=='wall')},initiativeOrder:[{id:'hero',name:'Grid Hero',kind:'hero'},{id:'enemy-0',name:'Grid Held Enemy',kind:'enemy',index:0}],turnIndex:0,round:1,activeActor:'hero'},log:[]};
 T.apply(gridHeldEnemy,'grappled','permanent','Grid Hero',{sourceId:'grid-hero',grapplerId:'grid-hero',grappleRange:5});
 const soloGridDrag=T.gameplay.gridMove(-1,0);
 assert('Solo tactical grid movement drags one held enemy into the vacated square and charges doubled movement',soloGridDrag&&T18.state.combat.heroPos.x===0&&T18.state.combat.heroPos.y===3&&gridHeldEnemy.pos.x===1&&gridHeldEnemy.pos.y===3&&gridHero.movementSpent===10&&T.has(gridHeldEnemy,'grappled'),JSON.stringify({soloGridDrag,heroPos:T18.state.combat.heroPos,enemyPos:gridHeldEnemy.pos,movementSpent:gridHero.movementSpent,heroConditions:gridHero.conditions,enemyConditions:gridHeldEnemy.conditions,toastText:toast.textContent,toastHtml:toast.innerHTML}));
 const beforeFearGridState=T18.state,fearTerrain=[];for(let x=0;x<8;x++)for(let y=0;y<6;y++)fearTerrain.push({x,y,kind:'floor'});
 const fearGridHero=actor({id:'fear-grid-hero',name:'Fear Grid Hero',movement:30});
 const fearGridSource=actor({id:'fear-grid-source',name:'Visible Fear Source',hp:20,pos:{x:4,y:3}});
 T18.state={character:fearGridHero,campaign:{},combat:{mp:null,heroPos:{x:1,y:3},enemies:[fearGridSource],map:{width:8,height:6,terrain:fearTerrain},initiativeOrder:[{id:'hero',kind:'hero',name:'Fear Grid Hero',initiative:20},{id:'enemy-0',kind:'enemy',index:0,name:'Visible Fear Source',initiative:10}],turnIndex:0,round:1,activeActor:'hero'},log:[]};
 T.apply(fearGridHero,'frightened','permanent','Fear',{sourceId:'fear-grid-source',sourceVisible:true});
 const blockedFearGridMove=T.gameplay.gridMove(1,0);
 const allowedFearGridMove=!T.frightenedMovementBlocked(fearGridHero,{x:1,y:3},{x:0,y:3},T18.state);
 assert('Solo tactical movement blocks a willing step toward the visible Frightened source while allowing movement away',blockedFearGridMove===false&&T18.state.combat.heroPos.x===1&&allowedFearGridMove,JSON.stringify({blockedFearGridMove,allowedFearGridMove,heroPos:T18.state.combat.heroPos}));
 const fearMpHero=actor({id:'fear-mp-hero',name:'Fear Multiplayer Hero',movement:30});
 const fearMpPlayer={id:'fear-mp-hero',name:'Fear Multiplayer Hero',connected:true,character:fearMpHero};
 const fearMpSource=actor({id:'fear-mp-source',name:'Fear MP Source',hp:20,pos:{x:4,y:1}});
 T18.state={character:fearMpHero,campaign:{multiplayer:{players:[fearMpPlayer]}},combat:{mp:{heroPositions:{'fear-mp-hero':{x:2,y:1}}},heroPos:{x:2,y:1},enemies:[fearMpSource],map:{width:8,height:6,terrain:fearTerrain}},log:[]};
 T.apply(fearMpHero,'frightened','permanent','Fear',{sourceId:'fear-mp-source',sourceVisible:true});
 const blockedFearMpMove=T.gameplay.moveHero(fearMpPlayer,3,1);
 const allowedFearMpMove=!T.frightenedMovementBlocked(fearMpHero,{x:2,y:1},{x:1,y:1},T18.state);
 assert('Multiplayer tactical movement blocks a step toward the visible Frightened source and permits a step away',blockedFearMpMove===false&&T18.state.combat.mp.heroPositions['fear-mp-hero'].x===2&&allowedFearMpMove,JSON.stringify({blockedFearMpMove,allowedFearMpMove,position:T18.state.combat.mp.heroPositions['fear-mp-hero']}));
 const fearTeleportHero=actor({id:'fear-teleport-hero',name:'Fear Teleport Hero'});
 const fearTeleportSource=actor({id:'fear-teleport-source',name:'Visible Teleport Fear Source',hp:20,pos:{x:0,y:3}});
 const otherTeleportEnemy=actor({id:'other-teleport-enemy',name:'Other Teleport Enemy',hp:20,pos:{x:7,y:3}});
 T18.state={character:fearTeleportHero,campaign:{},combat:{mp:null,heroPos:{x:4,y:3},enemies:[fearTeleportSource,otherTeleportEnemy],map:{width:8,height:6,terrain:fearTerrain}},log:[]};
 T.apply(fearTeleportHero,'frightened','permanent','Fear',{sourceId:'fear-teleport-source',sourceVisible:true});
 const fearTeleportPlan=T.gameplay.playerTeleportPlan({id:'solo',character:fearTeleportHero},30);
 const fearOriginDistance=Math.max(Math.abs(4-fearTeleportSource.pos.x),Math.abs(3-fearTeleportSource.pos.y))*5;
 const fearDestinationDistance=fearTeleportPlan?Math.max(Math.abs(fearTeleportPlan.to.x-fearTeleportSource.pos.x),Math.abs(fearTeleportPlan.to.y-fearTeleportSource.pos.y))*5:0;
 assert('Voluntary player teleport planning excludes destinations closer to the visible Frightened source',!!fearTeleportPlan&&fearTeleportPlan.travelFeet<=30&&fearDestinationDistance>=fearOriginDistance,JSON.stringify({fearTeleportPlan,fearOriginDistance,fearDestinationDistance}));
 const forcedFearHero=actor({id:'forced-fear-hero',name:'Forced Fear Hero'});
 const forcedFearSource={id:'forced-fear-source',name:'Forced Fear Source',distance:10,hp:20};
 T18.state={character:forcedFearHero,campaign:{},combat:{mp:null,enemies:[forcedFearSource],heroPos:{x:1,y:3}},log:[]};
 T.apply(forcedFearHero,'frightened','permanent','Fear',{sourceId:'forced-fear-source',sourceVisible:true});
 const forcedFearPull=T18.displaceCombatant({player:{id:'solo',name:'Forced Fear Hero'}},forcedFearSource,'The target is pulled 5 feet toward the monster.');
 assert('Forced movement can still move a Frightened creature closer to its source',forcedFearPull===true&&forcedFearSource.distance===5);
 const soloFearMonster=actor({id:'solo-fear-monster',name:'Frightened Solo Monster',hp:20,pos:{x:1,y:3},distance:15});
 const soloFearSource=actor({id:'solo-fear-source',name:'Solo Fear Source',pos:{x:4,y:3}});
 T18.state={character:soloFearSource,campaign:{},combat:{mp:null,heroPos:{x:4,y:3},enemies:[soloFearMonster],map:{width:8,height:6,terrain:fearTerrain}},log:[]};
 T.apply(soloFearMonster,'frightened','permanent','Fear',{sourceId:'solo-fear-source',sourceVisible:true});
 const soloFearMonsterMove=T.gameplay.enemyMove(soloFearMonster);
 assert('Solo monster AI cannot advance toward the visible source of its Frightened condition',soloFearMonsterMove===false&&soloFearMonster.pos.x===1&&soloFearMonster.pos.y===3);
 const mpFearMonster=actor({id:'mp-fear-monster',name:'Frightened MP Monster',hp:20,pos:{x:1,y:1}});
 const mpFearSource=actor({id:'mp-fear-source',name:'MP Fear Source',pos:{x:4,y:1}});
 const mpFearPlayer={id:'mp-fear-source',name:'MP Fear Source',connected:true,character:mpFearSource};
 T18.state={character:mpFearSource,campaign:{multiplayer:{players:[mpFearPlayer]}},combat:{mp:{heroPositions:{'mp-fear-source':{x:4,y:1}}},heroPos:{x:4,y:1},enemies:[mpFearMonster],map:{width:8,height:6,terrain:fearTerrain}},log:[]};
 T.apply(mpFearMonster,'frightened','permanent','Fear',{sourceId:'mp-fear-source',sourceVisible:true});
 const mpFearMonsterMove=T.gameplay.enemyStep(mpFearMonster,{x:4,y:1});
 assert('Multiplayer monster pathing cannot step toward the visible Frightened source',mpFearMonsterMove===false&&mpFearMonster.pos.x===1&&mpFearMonster.pos.y===1);
 const soloFearTeleportMonster=actor({id:'solo-fear-teleport-monster',name:'Frightened Solo Teleporter',hp:20,distance:30});
 const soloFearTeleportHero=actor({id:'solo-fear-teleport-hero',name:'Solo Teleport Fear Source'});
 T18.state={character:soloFearTeleportHero,campaign:{},combat:{mp:null,heroPos:{x:4,y:3},enemies:[soloFearTeleportMonster]},log:[]};
 T.apply(soloFearTeleportMonster,'frightened','permanent','Fear',{sourceId:'solo-fear-teleport-hero',sourceVisible:true});
 const soloFearTeleport=T18.teleportMonster(soloFearTeleportMonster,{player:{id:'solo',name:'Solo Teleport Fear Source',character:soloFearTeleportHero},pos:{x:4,y:3}},'The monster teleports 30 feet closer.');
 assert('Solo monster teleport cannot move a Frightened creature closer to its visible source',soloFearTeleport===false&&soloFearTeleportMonster.distance===30);
 const mpFearTeleportMonster=actor({id:'mp-fear-teleport-monster',name:'Frightened MP Teleporter',hp:20,pos:{x:1,y:3}});
 const mpFearTeleportHero=actor({id:'mp-fear-teleport-hero',name:'MP Teleport Fear Source'});
 const mpFearTeleportPlayer={id:'mp-fear-teleport-hero',name:'MP Teleport Fear Source',connected:true,character:mpFearTeleportHero};
 T18.state={character:mpFearTeleportHero,campaign:{multiplayer:{players:[mpFearTeleportPlayer]}},combat:{mp:{heroPositions:{'mp-fear-teleport-hero':{x:4,y:3}}},heroPos:{x:4,y:3},enemies:[mpFearTeleportMonster],map:{width:8,height:6,terrain:fearTerrain}},log:[]};
 T.apply(mpFearTeleportMonster,'frightened','permanent','Fear',{sourceId:'mp-fear-teleport-hero',sourceVisible:true});
 const mpFearTeleport=T18.teleportMonster(mpFearTeleportMonster,{player:mpFearTeleportPlayer,pos:{x:4,y:3}},'The monster teleports 30 feet closer.');
 assert('Multiplayer monster teleport cannot move a Frightened creature closer to its visible source',mpFearTeleport===false&&mpFearTeleportMonster.pos.x===1&&mpFearTeleportMonster.pos.y===3);
 T18.state=beforeFearGridState;
 T.apply(gridHero,'grappled','permanent','Grid Held Enemy',{sourceId:'grid-held-enemy',grapplerId:'grid-held-enemy',grappleRange:5});
 const blockedGrappledGridMove=T.gameplay.gridMove(0,-1);
 assert('Solo tactical grid movement rejects voluntary movement by a Grappled hero',blockedGrappledGridMove===false&&T18.state.combat.heroPos.x===0&&T18.state.combat.heroPos.y===3&&gridHero.movementSpent===10);
 const phaseHero=actor({id:'phase-hero',name:'Phase Hero',hp:30,maxHp:30});
 const phaseEnemy=actor({id:'phase-enemy',name:'Phase Enemy',hp:20,pos:{x:4,y:3}});
 T18.state={character:phaseHero,campaign:{day:1,region:'Grid Test',location:'Grid Test',visited:['Grid Test'],companions:[],npcs:[],sideQuests:[],story:{},flags:{},mainQuest:{kind:'test',title:'Grid Test',goal:'Validate enemy movement grapple release'}},combat:{mp:null,heroPos:{x:1,y:3},enemies:[phaseEnemy],map:{width:8,height:6,terrain:teleportTerrain.filter(cell=>cell.kind!=='wall')}},log:[]};
 T.apply(phaseHero,'grappled','permanent','Phase Enemy',{sourceId:'phase-enemy',grapplerId:'phase-enemy',grappleRange:5});
 T.gameplay.gridEnemyPhase();
 assert('Solo grid enemy movement reconciles and releases a grapple when the grappler moves beyond reach',phaseEnemy.pos.x===3&&!T.has(phaseHero,'grappled'),JSON.stringify({enemyPos:phaseEnemy.pos,heroConditions:phaseHero.conditions}));
 T18.state=gridPriorState;
 const priorState=T18.state;
 const soloMonster={id:'solo-displacer',name:'Solo Displacer',distance:10,hp:20};
 T18.state={character:actor(),log:[],combat:{mp:null,enemies:[soloMonster],heroPos:{x:1,y:3}}};
 const soloPush=T18.displaceCombatant({player:{id:'solo',name:'Solo Hero'}},soloMonster,'The target is pushed 10 feet away.');
 assert('Monster Push changes theater-of-the-mind solo combat distance',soloPush&&soloMonster.distance===20);
 const soloPull=T18.displaceCombatant({player:{id:'solo',name:'Solo Hero'}},soloMonster,'The target is pulled 15 feet toward the monster.');
 assert('Monster Pull changes theater-of-the-mind solo combat distance',soloPull&&soloMonster.distance===5);
 soloMonster.distance=5;
 const soloPullClamp=T18.displaceCombatant({player:{id:'solo',name:'Solo Hero'}},soloMonster,'The target is pulled 10 feet.');
 assert('Solo Pull never produces a negative separation',soloPullClamp&&soloMonster.distance===0);
 soloMonster.distance=60;
 const soloTeleport=T18.teleportMonster(soloMonster,{player:{id:'solo',name:'Solo Hero'}},'The monster teleports up to 30 feet to an unoccupied space it can see.');
 assert('Monster teleport changes solo abstract separation by its stated range',soloTeleport&&soloMonster.distance===30);
 assert('Actions without teleport wording do not move the monster',!T18.teleportMonster(soloMonster,{player:{id:'solo'}},'The monster makes a claw attack.')&&soloMonster.distance===30);
 const teleportAction={name:'Teleport',description:'The monster teleports up to 30 feet to an unoccupied space it can see.'};
 const actionMonster={id:'teleporter',name:'Teleporter',distance:60,hp:20,attack:100,actions:[teleportAction]};
 const actionHero=actor({hp:30,maxHp:30,ac:10});
 const actionTarget={player:{id:'solo',name:'Solo Hero',character:actionHero},pos:{x:1,y:3}};
 T18.state={character:actionHero,log:[],combat:{mp:null,enemies:[actionMonster],heroPos:{x:1,y:3}}};
 const selectedTeleport=T18.chooseMonsterAction(actionMonster,actionTarget);
 const teleportActionResolved=T18.resolveMonsterAction(actionMonster,teleportAction,actionTarget);
 assert('Monster action selection includes a teleport-only stat-block action',selectedTeleport===teleportAction);
 assert('A teleport-only monster action relocates and consumes the action without making a default attack',teleportActionResolved&&actionMonster.distance===30&&actionHero.hp===30,JSON.stringify({resolved:teleportActionResolved,distance:actionMonster.distance,heroHp:actionHero.hp,selected:selectedTeleport?.name}));
 T18.state=priorState;
 const stacked=actor();
 const first=T.apply(stacked,'poisoned',1,'venom A'),second=T.apply(stacked,'poisoned',3,'venom B');
 assert('Repeated condition applications retain independent instance IDs',first.instance.id!==second.instance.id&&T.entries(stacked).length===2);
 assert('Same condition has one effective status rather than stacking its penalties',T.namesFor(stacked).filter(n=>n==='poisoned').length===1);
 const tick=T.tick(stacked);
 assert('Each condition instance expires on its own duration',tick.expired===1&&T.entries(stacked).length===1&&T.entries(stacked)[0].rounds===2&&T.has(stacked,'poisoned'));
 const holdRepeat=T.gameplay.parseRepeatSave('Choose a Humanoid that you can see within range. The target must succeed on a Wisdom saving throw or have the Paralyzed condition for the duration. At the end of each of its turns, the target repeats the save, ending the spell on itself on a success.');
 const dominateRepeat=T.gameplay.parseRepeatSave('One Humanoid you can see within range must succeed on a Wisdom saving throw or have the Charmed condition for the duration. Whenever the target takes damage, it repeats the save, ending the spell on itself on a success.');
 const nonEndingRepeat=T.gameplay.parseRepeatSave('At the start of each of its turns, the target must succeed on a Wisdom saving throw or take the Dodge action.');
 assert('Repeat-save parser distinguishes end-turn and damage triggers and ignores non-ending recurring saves',holdRepeat?.trigger==='end-turn'&&holdRepeat.endsOnSuccess&&holdRepeat.ability==='WIS'&&dominateRepeat?.trigger==='damage'&&nonEndingRepeat===null);
 const holdSpellData={kind:'control',classes:['Wizard'],desc:'Paralyze a humanoid foe with binding magic.'};
 const holdSpellEffect=T.gameplay.spellEffectComplete('Hold Person',holdSpellData);
 const holdSpellRule=T.gameplay.repeatSaveSpecForSpell('Hold Person',holdSpellData);
 assert('Hold Person is enriched with its 2024 Paralyzed condition, Wisdom save, one-minute duration, concentration, and end-turn repeat save',holdSpellEffect?.condition==='paralyzed'&&holdSpellEffect.save==='WIS'&&holdSpellEffect.durationRounds===10&&holdSpellData.concentration===true&&holdSpellRule?.trigger==='end-turn'&&holdSpellRule.ability==='WIS');
 const priorRepeatState=T18.state;
 const repeatTarget=actor({id:'repeat-target',name:'Repeat Target',classId:'Wizard',level:1});
 T18.state={character:repeatTarget,combat:{round:1},campaign:{},log:[]};
 T.apply(repeatTarget,'paralyzed',10,'Hold Person');
 const holdAttached=T.gameplay.attachRepeatSave(repeatTarget,'paralyzed','Hold Person',repeatTarget,'WIS',10,holdRepeat);
 const repeatFailure=T.processRepeatSaves(repeatTarget,'end-turn','round-1:repeat-target',[1]);
 const retainedAfterFailure=T.has(repeatTarget,'paralyzed');
 const duplicateRepeat=T.processRepeatSaves(repeatTarget,'end-turn','round-1:repeat-target',[20]);
 const retainedAfterDuplicate=T.has(repeatTarget,'paralyzed');
 const repeatSuccess=T.processRepeatSaves(repeatTarget,'end-turn','round-2:repeat-target',[20]);
 const removedAfterSuccess=!T.has(repeatTarget,'paralyzed');
 const repeatSaveDetails={holdAttached,repeatFailure,retainedAfterFailure,duplicateRepeat,retainedAfterDuplicate,repeatSuccess,removedAfterSuccess,conditions:repeatTarget.conditions};
 assert('End-of-turn repeat saves retain a failed condition, prevent duplicate rolls in one turn, and end it on a later success',holdAttached&&repeatFailure.failed===1&&retainedAfterFailure&&duplicateRepeat.skipped===1&&duplicateRepeat.attempted===0&&retainedAfterDuplicate&&repeatSuccess.ended===1&&removedAfterSuccess,JSON.stringify(repeatSaveDetails));
 const dominatedTarget=actor({id:'dominated-target',name:'Dominated Target',classId:'Wizard',level:1});
 T18.state={character:dominatedTarget,combat:{round:1},campaign:{},log:[]};
 T.apply(dominatedTarget,'charmed',10,'Dominate Person');
 const dominateAttached=T.gameplay.attachRepeatSave(dominatedTarget,'charmed','Dominate Person',dominatedTarget,'WIS',12,dominateRepeat);
 const wrongTrigger=T.processRepeatSaves(dominatedTarget,'end-turn','dominated-end',[20]);
 const damageTrigger=T.processRepeatSaves(dominatedTarget,'damage','dominated-damage',[20]);
 assert('Damage-triggered repeat saves resolve only on damage and remove the affected condition on success',dominateAttached&&wrongTrigger.attempted===0&&damageTrigger.ended===1&&!T.has(dominatedTarget,'charmed'));
 const concentrationCaster=actor({id:'concentration-caster',name:'Concentration Caster',concentration:{spell:'Dominate Person'},activeEffects:[{name:'Dominate Person',concentration:true}]});
 const dominatedFirst=actor({id:'dominated-first',name:'Dominated First'}),dominatedSecond=actor({id:'dominated-second',name:'Dominated Second'});
 T18.state={character:concentrationCaster,combat:{round:1,enemies:[dominatedFirst,dominatedSecond]},campaign:{},log:[]};
 for(const target of [dominatedFirst,dominatedSecond]){
   T.apply(target,'charmed',10,'Dominate Person');
   T.gameplay.attachRepeatSave(target,'charmed','Dominate Person',concentrationCaster,'WIS',12,dominateRepeat,'concentration-caster');
 }
 const firstDominateRelease=T.processRepeatSaves(dominatedFirst,'damage','dominate-first-damage',[20]);
 const concentrationRetained=concentrationCaster.concentration?.spell==='Dominate Person';
 const concentrationEffectRetained=concentrationCaster.activeEffects.some(x=>x.name==='Dominate Person'&&x.concentration===true);
 const secondTargetStillAffected=T.has(dominatedSecond,'charmed');
 assert('Ending one target of a multi-target concentration spell keeps concentration while another target remains',firstDominateRelease.ended===1&&concentrationRetained&&concentrationEffectRetained&&secondTargetStillAffected);
 const secondDominateRelease=T.processRepeatSaves(dominatedSecond,'damage','dominate-second-damage',[20]);
 assert('Ending the final target of a concentration spell clears the caster concentration and its matching concentration effect',secondDominateRelease.ended===1&&concentrationCaster.concentration===null&&!concentrationCaster.activeEffects.some(x=>x.name==='Dominate Person'));
 const monsterRepeatTarget=actor({id:'monster-repeat-target',name:'Monster Repeat Target',classId:'Fighter',level:1,hp:100,maxHp:100});
 const repeatMonster={id:'repeat-monster-id',name:'Gloom Stalker',attack:0,actions:[]};
 const repeatMonsterAction={name:'Dreadful Glare',description:'The target must succeed on a DC 13 Wisdom saving throw or be frightened. At the end of each of its turns, it repeats the saving throw, ending the effect on itself on a success.'};
 assert('Monster repeat-save test description resolves the Frightened condition',T18.condition(repeatMonsterAction.description)==='frightened',T18.condition(repeatMonsterAction.description));
 const repeatMonsterPlayer={id:'solo',name:'Monster Repeat Target',character:monsterRepeatTarget};
 const priorMonsterRandom=math.random;math.random=()=>0;
 T18.state={character:monsterRepeatTarget,combat:{mp:null,enemies:[repeatMonster],round:1,heroPos:{x:1,y:3}},campaign:{},log:[]};
 let monsterRepeatActionResult=false;
 try{monsterRepeatActionResult=T18.resolveMonsterAction(repeatMonster,repeatMonsterAction,{player:repeatMonsterPlayer,pos:{x:1,y:3}});}finally{math.random=priorMonsterRandom;}
 const monsterRepeatInstance=T.entries(monsterRepeatTarget).find(item=>item.name==='frightened');
 const monsterRepeatAttached=monsterRepeatInstance?.repeatSave?.trigger==='end-turn'&&monsterRepeatInstance.repeatSave.ability==='WIS'&&monsterRepeatInstance.repeatSave.dc===13&&monsterRepeatInstance.repeatSave.sourceId==='repeat-monster-id';
 const monsterRepeatSuccess=T.processRepeatSaves(monsterRepeatTarget,'end-turn','monster-repeat-target-turn',[20]);
 assert('Monster save-based conditions attach a source-linked end-of-turn repeat save and end on a later success',monsterRepeatActionResult===true&&monsterRepeatAttached&&monsterRepeatSuccess.ended===1&&!T.has(monsterRepeatTarget,'frightened'),JSON.stringify({monsterRepeatActionResult,monsterRepeatInstance,monsterRepeatSuccess,conditions:monsterRepeatTarget.conditions,log:T18.state.log}));
 const persistedHero=actor({id:'persisted-hero',name:'Persisted Hero',classId:'Fighter',ancestry:'Human',level:1,inventory:[],proficiencies:[]});
 const persistedGrapple=T.apply(persistedHero,'grappled','permanent','Persistence Monster',{sourceId:'persistence-monster',grapplerId:'persistence-monster',grappleRange:10});
 // Grapple reconciliation normalizes condition records; reacquire the live instance before
 // attaching gameplay metadata, matching the production grapple-start adapters.
 const persistedGrappleInstance=T.entries(persistedHero).find(item=>item.name==='grappled');
 persistedGrappleInstance.escapeDC=15;persistedGrappleInstance.handSlot='monster-appendage-2';
 persistedGrappleInstance.repeatSave={trigger:'end-turn',endsOnSuccess:true,ability:'WIS',dc:14,sourceSpell:'Dreadful Glare',sourceId:'persistence-monster',sourceName:'Persistence Monster'};
 const priorPersistenceState=T18.state;
 T18.state={character:persistedHero,campaign:{day:1,region:'Persistence Test',location:'Persistence Test',companions:[],npcs:[],sideQuests:[],story:{},sr14:{factions:{}}},log:[],combat:null,view:'journal'};
 const persistenceSnapshot=T18.snapshot('V29 grapple metadata round-trip');
 const normalizedPersistence=T18.normalizeImport(persistenceSnapshot);
 const validatedPersistence=T18.validateSave(normalizedPersistence);
 const originalGrapple=persistedHero.conditions?.find(item=>item.name==='grappled');
 const snapshotGrapple=persistenceSnapshot.state?.character?.conditions?.find(item=>item.name==='grappled');
 const normalizedGrapple=normalizedPersistence.character?.conditions?.find(item=>item.name==='grappled');
 const restoredGrapple=validatedPersistence.state?.character?.conditions?.find(item=>item.name==='grappled');
 assert('Live grapple instance retains escape DC, appendage slot, and repeat-save metadata before export',originalGrapple?.escapeDC===15&&originalGrapple.handSlot==='monster-appendage-2'&&originalGrapple.repeatSave?.dc===14);
 assert('V18 snapshot export preserves V29 grapple metadata',snapshotGrapple?.escapeDC===15&&snapshotGrapple.handSlot==='monster-appendage-2'&&snapshotGrapple.repeatSave?.dc===14);
 assert('Import normalization preserves V29 grapple metadata',normalizedGrapple?.escapeDC===15&&normalizedGrapple.handSlot==='monster-appendage-2'&&normalizedGrapple.repeatSave?.dc===14);
 assert('Save validation preserves grapple source, reach, escape DC, appendage slot, and repeat-save metadata',validatedPersistence.ok&&restoredGrapple?.grapplerId==='persistence-monster'&&restoredGrapple.grappleRange===10&&restoredGrapple.escapeDC===15&&restoredGrapple.handSlot==='monster-appendage-2'&&restoredGrapple.repeatSave?.dc===14&&restoredGrapple.repeatSave?.sourceId==='persistence-monster',JSON.stringify({valid:validatedPersistence.ok,reason:validatedPersistence.reason,originalGrapple,snapshotGrapple,normalizedGrapple,restoredGrapple}));
 T18.state=priorPersistenceState;
 const damageHookTarget=actor({id:'damage-hook-target',name:'Damage Hook Target',classId:'Wizard',level:1});
 T18.state={character:damageHookTarget,combat:{round:1},campaign:{},log:[]};
 T.apply(damageHookTarget,'charmed',10,'Dominate Person');
 T.gameplay.attachRepeatSave(damageHookTarget,'charmed','Dominate Person',damageHookTarget,'WIS',1,dominateRepeat);
 T.gameplay.repeatSaveAfterDamage(damageHookTarget,4,[20]);
 assert('A positive damage event invokes its attached repeat-save resolver',!T.has(damageHookTarget,'charmed'));
 const soloDamageTarget=actor({id:'solo-damage-target',name:'Solo Damage Target',classId:'Wizard',level:1});
 T18.state={character:soloDamageTarget,combat:{round:1},campaign:{},log:[]};
 T.apply(soloDamageTarget,'charmed',10,'Dominate Person');
 T.gameplay.attachRepeatSave(soloDamageTarget,'charmed','Dominate Person',soloDamageTarget,'WIS',1,dominateRepeat);
 const soloDamageActual=T.gameplay.damagePlayer(4);
 assert('Solo HP damage automatically triggers its attached repeat save after mitigation',soloDamageActual===4&&soloDamageTarget.hp===26&&!T.has(soloDamageTarget,'charmed'));
 const tempDamageTarget=actor({id:'temp-damage-target',name:'Temporary HP Damage Target',tempHP:4});
 T18.state={character:tempDamageTarget,combat:{round:1},campaign:{},log:[]};
 T.apply(tempDamageTarget,'charmed',10,'Dominate Person');
 T.gameplay.attachRepeatSave(tempDamageTarget,'charmed','Dominate Person',tempDamageTarget,'WIS',1,dominateRepeat);
 const tempDamageActual=T.gameplay.damagePlayer(4);
 assert('Damage absorbed by temporary HP still triggers a damage-based repeat save',tempDamageActual===0&&tempDamageTarget.hp===30&&tempDamageTarget.tempHP===0&&!T.has(tempDamageTarget,'charmed'));
 const guardedDamageTarget=actor({id:'guarded-damage-target',name:'Guarded Damage Target',guard:4});
 T18.state={character:guardedDamageTarget,combat:{round:1},campaign:{},log:[]};
 T.apply(guardedDamageTarget,'charmed',10,'Dominate Person');
 T.gameplay.attachRepeatSave(guardedDamageTarget,'charmed','Dominate Person',guardedDamageTarget,'WIS',1,dominateRepeat);
 const guardedDamageActual=T.gameplay.damagePlayer(4);
 assert('Damage fully prevented by Guard does not trigger a damage-based repeat save',guardedDamageActual===0&&guardedDamageTarget.hp===30&&T.has(guardedDamageTarget,'charmed'));
 const mpDamageTarget=actor({id:'mp-damage-target',name:'MP Damage Target',classId:'Wizard',level:1});
 const mpDamagePlayer={id:'mp-damage-target',name:'MP Damage Target',connected:true,character:mpDamageTarget};
 T18.state={character:mpDamageTarget,campaign:{multiplayer:{players:[mpDamagePlayer]}},combat:{round:1,mp:{}},log:[]};
 T.apply(mpDamageTarget,'charmed',10,'Dominate Person');
 T.gameplay.attachRepeatSave(mpDamageTarget,'charmed','Dominate Person',mpDamageTarget,'WIS',1,dominateRepeat);
 const mpDamageActual=T.gameplay.damageHero(mpDamagePlayer,4,'psychic');
 assert('Multiplayer hero damage automatically triggers its attached repeat save after mitigation',mpDamageActual===4&&mpDamageTarget.hp===26&&!T.has(mpDamageTarget,'charmed'));
 const creatureDamageTarget=actor({id:'creature-damage-target',name:'Creature Damage Target',hp:20,maxHp:20});
 T18.state={character:actor({id:'damage-source',name:'Damage Source'}),combat:{round:1},campaign:{},log:[]};
 T.apply(creatureDamageTarget,'charmed',10,'Dominate Person');
 T.gameplay.attachRepeatSave(creatureDamageTarget,'charmed','Dominate Person',T18.state.character,'WIS',1,dominateRepeat);
 const creatureDamageActual=T.gameplay.damageEnemy(creatureDamageTarget,4,'psychic');
 assert('Creature damage through the typed damage adapter automatically triggers its attached repeat save',creatureDamageActual===4&&creatureDamageTarget.hp===16&&!T.has(creatureDamageTarget,'charmed'));
 const directFeatureTarget=actor({id:'direct-feature-target',name:'Direct Feature Target',hp:20,maxHp:20});
 const featureCaster=actor({id:'direct-feature-caster',name:'Direct Feature Caster',classId:'Druid',level:2,classLevels:{Druid:2},actionSpent:false});
 T18.state={character:featureCaster,campaign:{story:{faction:'Test Faction',motive:'Test Motive',complication:'Test Complication',personalBond:'Test Bond',villain:'Test Villain',relic:'Test Relic',region:{name:'Test Region'},twist:'Test Twist'},mainStep:0,mainQuest:{kind:'test'},companions:[],npcs:[],flags:{},visited:['Test Region'],location:'Test Region'},combat:{round:1,mp:null,target:0,enemies:[directFeatureTarget]},log:[]};
 T.apply(directFeatureTarget,'charmed',10,'Dominate Person');
 T.gameplay.attachRepeatSave(directFeatureTarget,'charmed','Dominate Person',featureCaster,'WIS',1,dominateRepeat);
 const directFeatureResult=T.gameplay.runFeature({id:'solo',name:'Direct Feature Caster',character:featureCaster},'landAid');
 assert('Legacy solo class-feature damage is routed through the typed adapter and triggers repeat saves',directFeatureResult===true&&directFeatureTarget.hp<20&&!T.has(directFeatureTarget,'charmed'));
 const blastTarget=actor({id:'blast-repeat-target',name:'Blast Repeat Target',hp:100,maxHp:100,ac:1});
 const blastCaster=actor({id:'blast-repeat-caster',name:'Blast Repeat Caster',classId:'Warlock',level:5,classLevels:{Warlock:5},stats:{STR:10,DEX:10,CON:10,INT:10,WIS:10,CHA:16},actionSpent:false});
 T18.state={character:blastCaster,campaign:{day:1,region:'Test Region',location:'Test Region',visited:['Test Region'],companions:[],npcs:[],sideQuests:[],story:{faction:'Test Faction',motive:'Test Motive',complication:'Test Complication',personalBond:'Test Bond',villain:'Test Villain',relic:'Test Relic',region:{name:'Test Region'},twist:'Test Twist'},flags:{},mainQuest:{kind:'test',title:'Test',goal:1}},combat:{round:1,mp:null,target:0,enemies:[blastTarget]},log:[]};
 T.apply(blastTarget,'charmed',10,'Dominate Person');
 T.gameplay.attachRepeatSave(blastTarget,'charmed','Dominate Person',blastCaster,'WIS',100,dominateRepeat);
 const blastResult=T.gameplay.runFeature({id:'solo',name:'Blast Repeat Caster',character:blastCaster},'eldritchBlast');
 const blastRepeatCount=T18.state.log.filter(entry=>String(entry.msg||'').includes('Blast Repeat Target repeats WIS save for Dominate Person')).length;
 assert('Each Eldritch Blast beam is routed through typed damage and triggers its own repeat save',blastResult===true&&blastRepeatCount===2&&blastTarget.hp<100&&T.has(blastTarget,'charmed'),JSON.stringify({blastResult,blastRepeatCount,hp:blastTarget.hp,repeatSave:blastTarget.conditions[0]?.repeatSave}));
 const turnHookTarget=actor({id:'turn-hook-target',name:'Turn Hook Target',classId:'Wizard',level:1});
 const otherTurnPlayer=actor({id:'other-turn-player',name:'Other Turn Player'});
 const turnPlayer={id:'turn-hook-target',name:'Turn Hook Target',connected:true,character:turnHookTarget};
 const otherPlayer={id:'other-turn-player',name:'Other Turn Player',connected:true,character:otherTurnPlayer};
 T18.state={character:turnHookTarget,campaign:{multiplayer:{players:[turnPlayer,otherPlayer]},companions:[]},combat:{round:1,enemies:[],mp:{turnOrder:[{kind:'hero',id:'turn-hook-target'},{kind:'hero',id:'other-turn-player'}],index:0,heroPositions:{'turn-hook-target':{x:1,y:1},'other-turn-player':{x:2,y:1}}}},log:[]};
 T.apply(turnHookTarget,'paralyzed',10,'Hold Person');
 T.gameplay.attachRepeatSave(turnHookTarget,'paralyzed','Hold Person',turnHookTarget,'WIS',1,holdRepeat);
 T.gameplay.advanceIndex();
 assert('Multiplayer turn advancement resolves end-of-turn repeat saves for the actor whose turn just ended',!T.has(turnHookTarget,'paralyzed')&&T18.state.combat.mp.index===1);
 const timedCondition=actor({id:'timed-condition',name:'Timed Condition'});
 T18.state={character:timedCondition,combat:{round:1},campaign:{},log:[]};
 T.apply(timedCondition,'poisoned',2,'two-round effect');
 const sameRoundTick=T.tick(timedCondition,{phase:'round',cycle:1});
 T18.state.combat.round=2;
 const firstRoundTick=T.tick(timedCondition,{phase:'round',cycle:2});
 const duplicateRoundTick=T.tick(timedCondition,{phase:'round',cycle:2});
 T18.state.combat.round=3;
 const afterDuplicateRoundCount=T.entries(timedCondition)[0]?.rounds;
 const finalRoundTick=T.tick(timedCondition,{phase:'round',cycle:3});
 const durationDetails={sameRoundTick,firstRoundTick,duplicateRoundTick,afterDuplicateRoundCount,finalRoundTick,conditions:timedCondition.conditions};
 assert('Combat condition durations wait for a later round and decrement only once per round',sameRoundTick.skipped===1&&firstRoundTick.expired===0&&duplicateRoundTick.skipped===1&&afterDuplicateRoundCount===1&&finalRoundTick.expired===1&&!T.has(timedCondition,'poisoned'),JSON.stringify(durationDetails));
 T18.state=priorRepeatState;
 const legacy=actor({conditions:['blinded']});
 T.tick(legacy);
 assert('Legacy string conditions migrate as permanent and do not vanish at turn expiry',T.has(legacy,'blinded')&&T.entries(legacy)[0].permanent);
 const immune=actor();
 T.apply(immune,'petrified','permanent','medusa');
 const poison=T.apply(immune,'poisoned',2,'venom');
 assert('Petrified grants Poisoned condition immunity',poison.immune&&T.isImmune(immune,'poisoned'));
 const explicitImmune=actor({conditionImmunities:['frightened']});
 assert('Explicit creature condition immunity is enforced',T.apply(explicitImmune,'frightened',2).immune);
 const unsteady=actor();
 T.apply(unsteady,'unconscious',2,'sleep');
 assert('Unconscious also imposes Prone and Incapacitated',T.has(unsteady,'prone')&&T.has(unsteady,'incapacitated'));
 T.remove(unsteady,'unconscious');
 assert('Prone persists after Unconscious ends',T.has(unsteady,'prone'));
 const incapacitated=actor();T.apply(incapacitated,'paralyzed',2,'ghoul');
 assert('Incapacitated blocks action, bonus action and reaction',!T.canAct(incapacitated,'action')&&!T.canAct(incapacitated,'bonus')&&!T.canAct(incapacitated,'reaction'));
 assert('Action eligibility normalizes bonus-action aliases without permitting an incapacitated creature to bypass the gate',!T.canUseAction(incapacitated,'bonus_action')&&!T.canUseAction(incapacitated,'bonus action')&&!T.canUseAction(incapacitated,'bonus-action'));
 assert('Unrestricted creatures remain eligible for actions, bonus actions and reactions',T.canUseAction(actor(),'action')&&T.canUseAction(actor(),'bonus action')&&T.canUseAction(actor(),'reaction'));
 assert('V18 monster action and reaction adapters defer to the canonical V29 condition engine',T18.canUseAction(incapacitated)===false&&T18.canUseReaction(incapacitated)===false&&T18.canUseReaction(actor())===true);
 const paralyzedReaction=actor({hp:20,ac:10,reactions:[{name:'Parry',description:'adds 3 to its AC'}],reactionAvailable:true});
 T.apply(paralyzedReaction,'paralyzed',2,'test');
 const parryAttempt=T18.attackRoll(15,actor(),paralyzedReaction,true);
 assert('An Incapacitated monster cannot spend a Parry reaction to turn a hit into a miss',paralyzedReaction.reactionAvailable===true&&!paralyzedReaction._sr18ParryUsed&&parryAttempt.total>=10);
 const stunnedReducer=actor({hp:20,reactions:[{name:'Damage Reduction',description:'Reduce damage by 1d6.'}],reactionAvailable:true});
 T.apply(stunnedReducer,'stunned',2,'test');
 const hpBeforeReduction=stunnedReducer.hp;
 T18.typedDamage(stunnedReducer,8,'physical');
 assert('An Incapacitated monster cannot use a damage-reduction reaction',stunnedReducer.reactionAvailable===true&&!stunnedReducer._sr18ReductionUsed&&stunnedReducer.hp===hpBeforeReduction-8);
 assert('Conditions that set Speed to zero block movement',!T.canMove(incapacitated));
 for(const name of ['grappled','petrified','restrained','unconscious']){
   const x=actor();T.apply(x,name,'permanent','test');
   assert(name+' sets Speed to zero',T.status(x).speedOverride===0);
 }
 const fatigue=actor();
 T.changeExhaustion(fatigue,2);
 assert('Exhaustion applies -2 per level to D20 tests and -5 ft Speed per level',T.status(fatigue).d20Penalty===4&&T.status(fatigue).speedPenalty===10&&T.status(fatigue).effectiveSpeed===20);
 const speedBuffedFatigue=actor({id:'speed-buffed-fatigue',baseMovement:30,movementBonus:10,movement:40,exhaustion:2});
 assert('Exhaustion reduces base Speed while preserving independent movement bonuses',T.status(speedBuffedFatigue).effectiveSpeed===30);
 const beforeSoloFatigueTurn=T18.state;
 T18.state={character:speedBuffedFatigue,campaign:{},combat:{mp:null,heroPos:{x:1,y:1},enemies:[]},log:[]};
 T.gameplay.resetHeroTurn();
 assert('Solo hero turn movement allowance uses Exhaustion-adjusted Speed',speedBuffedFatigue.movement===30&&speedBuffedFatigue.movementSpent===0);
 const mpFatigueHero=actor({id:'mp-fatigue-hero',name:'MP Fatigue Hero',speed:30,baseMovement:30,exhaustion:2});
 const mpFatiguePlayer={id:'mp-fatigue-hero',name:'MP Fatigue Hero',connected:true,character:mpFatigueHero};
 T18.state={character:mpFatigueHero,campaign:{multiplayer:{players:[mpFatiguePlayer]}},combat:{mp:{heroPositions:{'mp-fatigue-hero':{x:1,y:1}}},heroPos:{x:1,y:1},enemies:[]},log:[]};
 T.gameplay.beginHeroTurn(mpFatiguePlayer);
 assert('Multiplayer hero turn movement allowance uses Exhaustion-adjusted Speed',mpFatigueHero.movement===20&&mpFatigueHero.movementSpent===0);
 const dashRogue=actor({id:'dash-rogue',name:'Dash Rogue',classId:'Rogue',classLevels:{Rogue:2},level:2,baseMovement:30,movementBonus:0,movement:20,speed:30,exhaustion:2,bonusActionSpent:false});
 const dashRoguePlayer={id:'dash-rogue',name:'Dash Rogue',connected:true,character:dashRogue};
 T18.state={character:dashRogue,campaign:{day:1,region:'Dash Test',location:'Dash Test',visited:[],companions:[],npcs:[],sideQuests:[],story:{},flags:{},mainQuest:{kind:'test',title:'Dash Test',goal:'Validate exhaustion speed'},multiplayer:{players:[dashRoguePlayer]}},combat:{mp:{turnOrder:[{id:'dash-rogue',kind:'hero'}],index:0,heroPositions:{'dash-rogue':{x:1,y:1}}},heroPos:{x:1,y:1},enemies:[],round:1},log:[]};
 T.gameplay.beginHeroTurn(dashRoguePlayer);
 const exhaustedCunningDash=T.gameplay.cunningAction(dashRoguePlayer,'dash');
 assert('Cunning Action Dash adds the Exhaustion-adjusted Speed, not the unmodified base Speed',exhaustedCunningDash===true&&dashRogue.movement===40&&dashRogue.speed===30);
 const windMonk=actor({id:'wind-monk',name:'Wind Monk',classId:'Monk',classLevels:{Monk:2},level:2,baseMovement:30,movementBonus:0,movement:20,speed:30,exhaustion:2,focus:2,focusMax:2,resourcesByClass:{Monk:{focus:2}},bonusActionSpent:false});
 const windMonkPlayer={id:'wind-monk',name:'Wind Monk',connected:true,character:windMonk};
 T18.state={character:windMonk,campaign:{day:1,region:'Wind Test',location:'Wind Test',visited:[],companions:[],npcs:[],sideQuests:[],story:{},flags:{},mainQuest:{kind:'test',title:'Wind Test',goal:'Validate Step of the Wind'},multiplayer:{players:[windMonkPlayer]}},combat:{mp:{turnOrder:[{id:'wind-monk',kind:'hero'}],index:0,heroPositions:{'wind-monk':{x:1,y:1}}},heroPos:{x:1,y:1},enemies:[],map:{width:8,height:6,terrain:[]},initiativeOrder:[],round:1},log:[]};
 T.gameplay.beginHeroTurn(windMonkPlayer);
 const exhaustedStepOfWind=T.gameplay.runFeature(windMonkPlayer,'stepOfWind','dash');
 assert('Step of the Wind Dash adds the Exhaustion-adjusted Speed and restores base movement metadata',exhaustedStepOfWind===true&&windMonk.movement===40&&windMonk.baseMovement===30&&windMonk.resourcesByClass.Monk.focus===1,JSON.stringify({exhaustedStepOfWind,movement:windMonk.movement,baseMovement:windMonk.baseMovement,focus:windMonk.resourcesByClass?.Monk?.focus,bonusActionSpent:windMonk.bonusActionSpent,speed:windMonk.speed}));

 const fatigueMonster=actor({id:'fatigue-monster',name:'Fatigued Monster',pos:{x:1,y:1},baseSpeed:30,speed:30,exhaustion:2,speedPenalty:5});
 const fatigueMonsterHero=actor({id:'fatigue-monster-target',name:'Fatigue Monster Target'});
 const fatigueTerrain=[];for(let x=0;x<8;x++)for(let y=0;y<6;y++)fatigueTerrain.push({x,y,kind:'floor'});
 T18.state={character:fatigueMonsterHero,campaign:{},combat:{mp:null,heroPos:{x:7,y:1},enemies:[fatigueMonster],map:{width:8,height:6,terrain:fatigueTerrain}},log:[]};
 T.gameplay.enemyMove(fatigueMonster);
 assert('Monster Exhaustion and an independent slow penalty both reduce tactical movement speed',fatigueMonster.speed===15&&fatigueMonster.pos.x===4);
 const exhaustionSix=actor({id:'exhaustion-six',baseMovement:30,exhaustion:6});
 assert('Exhaustion level six leaves no movement available',T.status(exhaustionSix).effectiveSpeed===0&&!T.canMove(exhaustionSix));
 T18.state=beforeSoloFatigueTurn;
 const rest=T.longRestExhaustion(fatigue);
 assert('Long Rest reduces Exhaustion by exactly one level',rest.before===2&&rest.after===1);
 const lethal=T.changeExhaustion(fatigue,5);
 assert('Exhaustion caps at six and level six causes death',lethal.after===6&&lethal.dead&&fatigue.hp===0&&fatigue.dead===true);
 const saves=actor();T.apply(saves,'stunned',2,'impact');
 for(const ability of ['STR','DEX']){
   const r=T25.resolveCreatureSavingThrow(saves,ability,[20],0,1);
   assert('Stunned automatically fails '+ability+' saves',r.autoFail&&!r.success);
 }
 const con=T25.resolveCreatureSavingThrow(saves,'CON',[20],0,1);
 assert('Stunned does not automatically fail Constitution saves',con.success&&!con.autoFail);
 assert('Stunned prevents actions but does not reduce Speed to 0',!T.canAct(saves,'action')&&T.status(saves).speedOverride===null&&T.canMove(saves));
 const petrified=actor({exhaustion:1});T.apply(petrified,'petrified','permanent','stone');
 assert('Petrified exposes resistance to every damage type through the canonical damage multiplier',T.damageMultiplier(petrified,'fire')===0.5&&T.damageMultiplier(petrified,'psychic')===0.5);
 const soloPetrifiedHero=actor({id:'solo-petrified-hero',name:'Solo Petrified Hero'});
 T.apply(soloPetrifiedHero,'petrified','permanent','stone');
 const beforePetrifiedDamageState=T18.state;
 const soloDamageAttacker={id:'petrified-attacker',name:'Petrified Attacker'};
 const soloControlHero=actor({id:'solo-control-hero',name:'Solo Control Hero'});
 T18.state={character:soloControlHero,campaign:{},combat:{mp:null,enemies:[]},log:[]};
 const soloControlDamage=T.applyMonsterDamage({player:{id:'solo',name:'Solo Control Hero',character:soloControlHero}},10,'fire',soloDamageAttacker);
 T18.state={character:soloPetrifiedHero,campaign:{},combat:{mp:null,enemies:[]},log:[]};
 const soloPetrifiedDamage=T.applyMonsterDamage({player:{id:'solo',name:'Solo Petrified Hero',character:soloPetrifiedHero}},10,'fire',soloDamageAttacker);
 assert('Petrified resistance halves monster damage against the solo player without persisting a synthetic resistance',soloControlDamage>0&&soloPetrifiedDamage===Math.floor(soloControlDamage/2)&&soloPetrifiedHero.hp===30-soloPetrifiedDamage&&!Array.isArray(soloPetrifiedHero.resistances),JSON.stringify({soloControlDamage,soloPetrifiedDamage,hp:soloPetrifiedHero.hp,resistances:soloPetrifiedHero.resistances}));
 T18.state=beforePetrifiedDamageState;
 const exhaustionSave=T25.resolveCreatureSavingThrow(petrified,'CON',[12],5,15);
 assert('Exhaustion applies its -2 per level modifier to creature saves',exhaustionSave.total===15);
 const restrainedSave=actor();T.apply(restrainedSave,'restrained',2,'net');
 const restrainedDex=T25.resolveCreatureSavingThrow(restrainedSave,'DEX',[18],0,15);
 assert('Restrained imposes Disadvantage on Dexterity saves',restrainedDex.dice.length===2&&restrainedDex.die===11);
 const restrainedAdv=T25.resolveCreatureSavingThrow(restrainedSave,'DEX',[18,4],0,15,{advantage:true});
 assert('Restrained cancels Advantage on Dexterity saves',restrainedAdv.dice.length===1&&restrainedAdv.die===18);
 assert('Petrified auto-fails Strength and Dexterity saves',T.autoFailSave(petrified,'STR')&&T.autoFailSave(petrified,'DEX'));
 const attacker=actor(),target=actor({id:'target-2'});
 T.apply(target,'paralyzed',2,'ghoul');
 assert('Attacks against Paralyzed targets have Advantage',T.attackState(attacker,target,{melee:true,distance:5}).mode==='advantage');
 const grappled=actor();T.apply(grappled,'grappled',2,'grab',{grapplerId:'grappler-1'});
 assert('Grappled sets Speed to zero',T.status(grappled).speedOverride===0);
 assert('Grappled does not impose Disadvantage on attacks against other creatures',T.attackState(grappled,actor({id:'another-target'}),{melee:true,distance:5}).mode==='normal');
 assert('Grappled does not impose Disadvantage on attacks against its grappler',T.attackState(grappled,actor({id:'grappler-1'}),{melee:true,distance:5}).mode==='normal');

 const eligibleHolder=actor({id:'legal-holder',size:'medium'}),eligibleTarget=actor({id:'legal-target',size:'large'});
 assert('Grapple eligibility accepts a target one size larger with a free hand and valid reach',T.grappleEligibility(eligibleHolder,eligibleTarget,{grapplerSize:'medium',targetSize:'large',freeHands:1,activeGrapples:[],distance:5,reach:5}).legal);
 assert('Grapple eligibility rejects a target more than one size larger',T.grappleEligibility(eligibleHolder,actor(),{grapplerSize:'medium',targetSize:'huge',freeHands:1,distance:5,reach:5}).reason==='target-too-large');
 assert('Each active grapple consumes one free hand',T.grappleEligibility(eligibleHolder,eligibleTarget,{grapplerSize:'medium',targetSize:'large',freeHands:1,activeGrapples:[{grapplerId:'legal-holder'}],distance:5,reach:5}).reason==='no-free-hand');
 assert('Grapple eligibility rejects targets beyond reach',T.grappleEligibility(eligibleHolder,eligibleTarget,{grapplerSize:'medium',targetSize:'large',freeHands:1,distance:10,reach:5}).reason==='out-of-reach');
 assert('Grapple eligibility fails closed when size data is missing',T.grappleEligibility(eligibleHolder,actor(),{freeHands:1,distance:5,reach:5}).reason==='unknown-size');
 assert('Grapple eligibility fails closed when free-hand data is missing',T.grappleEligibility(eligibleHolder,eligibleTarget,{grapplerSize:'medium',targetSize:'large',distance:5,reach:5}).reason==='free-hands-unknown');
 const grappleHolder=actor({id:'grapple-starter',name:'Grapple Starter',size:'medium',stats:{STR:16,DEX:10,CON:10,INT:10,WIS:10,CHA:10},proficiencyBonus:3});
 const grappleVictim=actor({id:'grapple-victim',size:'large'});
 const noHit=T.startGrapple(grappleHolder,grappleVictim,{attackHit:false,grapplerSize:'medium',targetSize:'large',freeHands:1,activeGrapples:[],distance:5,reach:5});
 assert('A grapple cannot begin unless the initiating Unarmed Strike hits',!noHit.started&&noHit.reason==='grapple-attack-did-not-hit');
 const missingTargetSave=T.startGrapple(grappleHolder,grappleVictim,{attackHit:true,grapplerSize:'medium',targetSize:'large',freeHands:1,activeGrapples:[],distance:5,reach:5,proficiencyBonus:3});
 assert('Grapple initiation requires the target to make its choice of Strength or Dexterity save',!missingTargetSave.started&&missingTargetSave.reason==='target-save-required'&&!T.has(grappleVictim,'grappled'));
 const resisted=T.startGrapple(grappleHolder,grappleVictim,{attackHit:true,grapplerSize:'medium',targetSize:'large',freeHands:1,activeGrapples:[],distance:5,reach:5,proficiencyBonus:3,targetSave:{ability:'DEX',roll:12,bonus:2}});
 assert('A successful target saving throw prevents the grapple',!resisted.started&&resisted.reason==='target-saved'&&!T.has(grappleVictim,'grappled')&&resisted.escapeDC===14);
 const naturalOneTarget=actor({id:'grapple-natural-one'});
 const naturalOne=T.startGrapple(grappleHolder,naturalOneTarget,{attackHit:true,grapplerSize:'medium',targetSize:'medium',freeHands:1,activeGrapples:[],distance:5,reach:5,proficiencyBonus:3,targetSave:{ability:'STR',roll:1,bonus:30}});
 assert('A natural 1 can succeed on a grapple saving throw when its total meets the DC',!naturalOne.started&&naturalOne.reason==='target-saved'&&!T.has(naturalOneTarget,'grappled'));
 const naturalTwentyTarget=actor({id:'grapple-natural-twenty'});
 const naturalTwenty=T.startGrapple(grappleHolder,naturalTwentyTarget,{attackHit:true,grapplerSize:'medium',targetSize:'medium',freeHands:1,activeGrapples:[],distance:5,reach:5,proficiencyBonus:3,targetSave:{ability:'DEX',roll:20,bonus:-20}});
 assert('A natural 20 does not bypass the grapple saving throw DC',naturalTwenty.started&&T.has(naturalTwentyTarget,'grappled'));
 const canonicalAutoFailTarget=actor({id:'grapple-canonical-auto-fail'});T.apply(canonicalAutoFailTarget,'paralyzed','permanent','test');
 const canonicalAutoFail=T.startGrapple(grappleHolder,canonicalAutoFailTarget,{attackHit:true,grapplerSize:'medium',targetSize:'medium',freeHands:1,activeGrapples:[],distance:5,reach:5,proficiencyBonus:3,targetSave:{ability:'STR',roll:20,bonus:30,success:false}});
 assert('Canonical condition auto-failure overrides a numerically successful grapple save',canonicalAutoFail.started&&T.has(canonicalAutoFailTarget,'grappled'));

 const started=T.startGrapple(grappleHolder,grappleVictim,{attackHit:true,grapplerSize:'medium',targetSize:'large',freeHands:1,activeGrapples:[],distance:5,reach:5,proficiencyBonus:3,targetSave:{ability:'STR',roll:10,bonus:2}});
 assert('A failed target saving throw applies Grappled with source, reach, and escape DC',started.started&&T.has(grappleVictim,'grappled')&&started.escapeDC===14&&started.instance.grapplerId==='grapple-starter'&&started.instance.grappleRange===5&&started.save.success===false);
 const failedEscape=T.escapeGrapple(grappleVictim,{instanceId:started.instance.id,ability:'Athletics',roll:10,bonus:3});
 assert('An unsuccessful Athletics escape check leaves the grapple active',!failedEscape.escaped&&T.has(grappleVictim,'grappled')&&failedEscape.total===13&&failedEscape.dc===14,JSON.stringify({failedEscape,conditions:T.entries(grappleVictim)}));
 const escaped=T.escapeGrapple(grappleVictim,{instanceId:started.instance.id,ability:'Acrobatics',roll:12,bonus:2});
 assert('A successful Acrobatics escape check removes only the selected grapple instance',escaped.escaped&&!T.has(grappleVictim,'grappled'),JSON.stringify({escaped,conditions:T.entries(grappleVictim)}));
 const invalidEscapeTarget=actor({id:'invalid-escape-target'});T.apply(invalidEscapeTarget,'grappled','permanent','test',{grapplerId:'grapple-starter',escapeDC:10});
 const invalidEscape=T.escapeGrapple(invalidEscapeTarget,{ability:'Perception',roll:20,bonus:20,dc:1});
 assert('Grapple escape rejects skills other than Athletics or Acrobatics',!invalidEscape.escaped&&invalidEscape.reason==='invalid-escape-check'&&T.has(invalidEscapeTarget,'grappled'));
 const dragged=T.grappleMovementCost(grappleHolder,grappleVictim,20,{grapplerSize:'medium',targetSize:'large'});
 assert('Dragging a non-exempt grappled creature doubles movement cost',dragged.valid&&dragged.speedHalved&&dragged.movementCost===40);
 const tinyDrag=T.grappleMovementCost(grappleHolder,actor({size:'tiny'}),20,{grapplerSize:'medium',targetSize:'tiny'});
 assert('Dragging a Tiny creature does not halve the grappler speed',tinyDrag.valid&&!tinyDrag.speedHalved&&tinyDrag.movementCost===20);
 const smallDrag=T.grappleMovementCost(grappleHolder,actor({size:'small'}),20,{grapplerSize:'large',targetSize:'small'});
 assert('Dragging a creature two sizes smaller does not halve movement speed',smallDrag.valid&&!smallDrag.speedHalved&&smallDrag.movementCost===20);
 const heldAtReach=actor({id:'held-at-reach'}),holderAtReach=actor({id:'holder-at-reach'});
 const heldInstance=T.apply(heldAtReach,'grappled','permanent','claw',{grapplerId:'holder-at-reach',grappleRange:10});
 assert('Grappled instances preserve the source creature and its specific reach',heldInstance.instance.grapplerId==='holder-at-reach'&&heldInstance.instance.grappleRange===10);
 const atReach=T.reconcileGrapples([{actor:heldAtReach,pos:{x:0,y:0}},{actor:holderAtReach,pos:{x:1,y:0}}],{distance:()=>10});
 assert('A grapple remains active at exactly its recorded reach',atReach.count===0&&T.has(heldAtReach,'grappled'));
 const beyondReach=T.reconcileGrapples([{actor:heldAtReach,pos:{x:0,y:0}},{actor:holderAtReach,pos:{x:1,y:0}}],{distance:()=>10.1});
 assert('A grapple ends when the target moves beyond its recorded reach',beyondReach.count===1&&!T.has(heldAtReach,'grappled'));
 const heldByIncapacitated=actor({id:'held-by-incapacitated'}),stunnedGrappler=actor({id:'stunned-grappler'});
 T.apply(heldByIncapacitated,'grappled','permanent','monster hold',{grapplerId:'stunned-grappler',grappleRange:5});
 T.apply(stunnedGrappler,'stunned',2,'condition test');
 const incapRelease=T.reconcileGrapples([{actor:heldByIncapacitated,pos:{x:0,y:0}},{actor:stunnedGrappler,pos:{x:0,y:0}}],{distance:()=>0});
 assert('A grapple ends immediately when the grappler becomes Incapacitated through Stunned',incapRelease.count===1&&!T.has(heldByIncapacitated,'grappled'));
 const multiHeld=actor({id:'multi-held'}),incapHolder=actor({id:'incap-holder'}),activeHolder=actor({id:'active-holder'});
 T.apply(multiHeld,'grappled','permanent','first hold',{instanceId:'grapple-a',grapplerId:'incap-holder'});
 T.apply(multiHeld,'grappled','permanent','second hold',{instanceId:'grapple-b',grapplerId:'active-holder'});
 T.apply(incapHolder,'paralyzed',2,'condition test');
 const selectiveRelease=T.reconcileGrapples([{actor:multiHeld},{actor:incapHolder},{actor:activeHolder}],{distance:()=>0});
 assert('Releasing one incapacitated grappler preserves other independent grapple instances',selectiveRelease.count===1&&T.entries(multiHeld).length===1&&T.entries(multiHeld)[0].grapplerId==='active-holder');
 const unknownHolderTarget=actor({id:'unknown-holder-target'});
 T.apply(unknownHolderTarget,'grappled','permanent','unresolved legacy',{grapplerId:'not-loaded'});
 T.reconcileGrapples([{actor:unknownHolderTarget}]);
 assert('Legacy grapple remains unchanged when its grappler is not in the active participant set',T.has(unknownHolderTarget,'grappled'));
 const manualRelease=actor({id:'manual-release-target'});
 T.apply(manualRelease,'grappled','permanent','manual',{grapplerId:'manual-holder'});
 assert('The grapple release operation removes only the selected grapple instance',T.releaseGrapple(manualRelease,{grapplerId:'manual-holder'}).released&&!T.has(manualRelease,'grappled'));
 const uiGrappleWorld={character:actor({id:'ui-grapple-target'}),combat:{enemies:[actor({id:'ui-grappler'})]}};
 const uiGrapple=T.applyUiCondition(uiGrappleWorld,'player','grappled',2,false,'monster grab','ui-grappler',false,15);
 assert('Condition panel application stores custom Grappled source identity and reach',uiGrapple.applied&&T.entries(uiGrappleWorld.character)[0].grapplerId==='ui-grappler'&&T.entries(uiGrappleWorld.character)[0].grappleRange===15);
 const previousGrappleWorld=T21.state;
 const worldHeld=actor({id:'world-held'}),worldGrappler=actor({id:'world-grappler'});
 T.apply(worldHeld,'grappled','permanent','world grapple',{grapplerId:'world-grappler'});
 T.apply(worldGrappler,'incapacitated',2,'world test');
 T21.state={...(previousGrappleWorld||{}),character:worldHeld,combat:{heroPos:{x:0,y:0},enemies:[worldGrappler]}};
 const currentCombatRelease=T.reconcileCombatGrapples();
 T21.state=previousGrappleWorld;
 assert('Live combat participant reconciliation releases a grapple when its grappler is Incapacitated',currentCombatRelease.count===1&&!T.has(worldHeld,'grappled'));
 const invisible=actor();T.apply(invisible,'invisible',2,'spell');
 assert('Invisible attackers have Advantage',T.attackState(invisible,target,{melee:true,distance:5}).mode==='advantage');
 assert('Invisible attackers gain no Advantage against a target that can see them',T.attackState(invisible,actor(),{melee:true,distance:5,targetCanSeeInvisible:true}).mode==='normal');
 assert('Attack-state service reads the defender senses when checking Invisible attackers',T.attackState(invisible,actor({canSeeInvisible:true}),{melee:true,distance:5}).mode==='normal');
 const invisibleTarget=actor();T.apply(invisibleTarget,'invisible',2,'spell');
 assert('Attacks against Invisible targets have Disadvantage',T.attackState(attacker,invisibleTarget,{melee:true,distance:5}).mode==='disadvantage');
 assert('Seeing an Invisible target removes that Disadvantage',T.attackState(attacker,invisibleTarget,{melee:true,distance:5,canSeeInvisible:true}).mode==='normal');

 const frightenedAttacker=actor({id:'frightened-attacker'});T.apply(frightenedAttacker,'frightened',2,'dragon',{sourceId:'dragon',sourceVisible:true});
 const frightenedAttack=T.attackRoll(5,frightenedAttacker,actor({id:'frightened-target'}),true);
 assert('Actual attack rolls apply Frightened Disadvantage while the source is visible',frightenedAttack.dis&&!frightenedAttack.adv);
 const grappledAttacker=actor({id:'grappled-attacker'});T.apply(grappledAttacker,'grappled',2,'grab',{grapplerId:'grappler'});
 const grappleAttack=T.attackRoll(5,grappledAttacker,actor({id:'not-grappler'}),true);
 assert('Actual attack rolls do not add Disadvantage solely because the attacker is Grappled',!grappleAttack.dis&&!grappleAttack.adv);
 const closeProne=actor({id:'close-prone',distance:5});T.apply(closeProne,'prone',2,'trip');
 const closeProneAttack=T.attackRoll(5,actor(),closeProne,false);
 assert('Actual ranged attacks from within 5 feet gain Advantage against Prone targets',closeProneAttack.adv&&!closeProneAttack.dis);
 const farProne=actor({id:'far-prone',distance:15});T.apply(farProne,'prone',2,'trip');
 const farProneAttack=T.attackRoll(5,actor(),farProne,false);
 assert('Actual attacks from beyond 5 feet have Disadvantage against Prone targets',farProneAttack.dis&&!farProneAttack.adv);
 const invisibleAttacker=actor({id:'invisible-attacker'});T.apply(invisibleAttacker,'invisible',2,'spell');
 const invisibleAttack=T.attackRoll(5,invisibleAttacker,actor(),true);
 assert('Actual attacks by Invisible creatures gain Advantage',invisibleAttack.adv&&!invisibleAttack.dis);
 const visibleInvisible=actor({canSeeInvisible:true}),invisibleEnemy=actor({id:'invisible-enemy'});T.apply(invisibleEnemy,'invisible',2,'spell');
 const seeInvisibleAttack=T.attackRoll(5,visibleInvisible,invisibleEnemy,true);
 assert('Actual attacks against Invisible targets are normal when the attacker can see them',!seeInvisibleAttack.adv&&!seeInvisibleAttack.dis);
 const invisibleTargetCanSee=actor({canSeeInvisible:true}),hiddenInvisibleAttacker=actor({id:'hidden-invisible'});T.apply(hiddenInvisibleAttacker,'invisible',2,'spell');
 assert('Visibility helper detects a defender that can see Invisible creatures',T.canSeeInvisible(invisibleTargetCanSee)===true);
 const suppressedInvisibleAttack=T.attackRoll(5,hiddenInvisibleAttacker,invisibleTargetCanSee,true);
 assert('Invisible attackers gain no Advantage against targets that can see them',!suppressedInvisibleAttack.adv&&!suppressedInvisibleAttack.dis,JSON.stringify(suppressedInvisibleAttack)+'; canSee='+T.canSeeInvisible(invisibleTargetCanSee)+'; actorInvisible='+T.has(hiddenInvisibleAttacker,'invisible'));
 const hiddenAttacker=actor({hidden:true});
 const hiddenAttack=T.attackRoll(5,hiddenAttacker,actor(),true);
 assert('Hidden attackers gain Advantage in the actual attack-roll path',hiddenAttack.adv&&!hiddenAttack.dis);
 const dodgingTarget=actor({dodging:true});
 const dodgeAttack=T.attackRoll(5,actor(),dodgingTarget,true);
 assert('V29 condition projection preserves the earlier Dodge attack penalty',dodgeAttack.dis&&!dodgeAttack.adv);
 const outlinedTarget=actor({outlinedRounds:1});
 const outlineAttack=T.attackRoll(5,actor(),outlinedTarget,true);
 assert('V29 condition projection preserves the earlier Outlined attack Advantage',outlineAttack.adv&&!outlineAttack.dis);

 const prone=actor();T.apply(prone,'prone',2,'trip');
 assert('Prone targets grant Advantage to attacks from within 5 feet',T.attackState(attacker,prone,{melee:true,distance:5}).mode==='advantage');
 assert('Prone targets also grant Advantage to ranged attacks from within 5 feet',T.attackState(attacker,prone,{melee:false,distance:5}).mode==='advantage');
 assert('Prone targets impose Disadvantage on attacks from beyond 5 feet',T.attackState(attacker,prone,{melee:false,distance:30}).mode==='disadvantage');
 const poisonedAttacker=actor();T.apply(poisonedAttacker,'poisoned',2,'poison');
 assert('Poisoned attackers have Disadvantage',T.attackState(poisonedAttacker,actor(),{melee:true,distance:5}).mode==='disadvantage');
 const cancellation=actor();T.apply(cancellation,'poisoned',2,'poison');
 assert('Advantage and Disadvantage cancel rather than stack',T.attackState(cancellation,target,{melee:true,distance:5}).mode==='normal'&&T.attackState(cancellation,target,{melee:true,distance:5}).cancelled);
 const sight=actor();T.apply(sight,'blinded',2,'blindness');
 assert('Blinded automatically fails checks explicitly requiring sight',T.skillMode(sight,'Investigation',{requiresSight:true})==='auto-fail');
 assert('Blinded does not automatically fail hearing-based Perception checks',T.skillMode(sight,'Perception',{requiresHearing:true})==='normal');
 assert('Blinded does not assume every Perception check requires sight',T.skillMode(sight,'Perception')==='normal');
 const hearing=actor();T.apply(hearing,'deafened',2,'thunder');
 assert('Deafened automatically fails checks that require hearing',T.skillMode(hearing,'Listen')==='auto-fail');
 const fear=actor();T.apply(fear,'frightened',2,'dragon',{sourceVisible:true,sourceId:'dragon'});
 assert('Frightened imposes Disadvantage while its source is visible',T.skillMode(fear,'Perception')==='disadvantage');
 assert('Frightened prevents voluntarily moving closer to its source',!T.canMoveToward(fear,{id:'dragon',name:'Dragon'}));
 const away=actor();T.apply(away,'frightened',2,'dragon',{sourceVisible:false,sourceId:'dragon'});
 assert('Frightened source out of sight does not impose its visible-source penalty',T.skillMode(away,'Perception')==='normal'&&T.canMoveToward(away,{id:'dragon'}));
 const unknownFear=actor();T.apply(unknownFear,'frightened',2,'unknown source');
 assert('Frightened does not assume an unidentified source is in line of sight',T.skillMode(unknownFear,'Perception')==='normal'&&T.canMoveToward(unknownFear,{id:'unknown'}));
 const charmed=actor();T.apply(charmed,'charmed',2,'charm',{sourceId:'archmage'});
 assert('Charmed actor cannot harm its identified charmer',T.cannotHarm(charmed,{id:'archmage'})&&!T.cannotHarm(charmed,{id:'guard'}));
 const charmedTerrain=[];for(let x=0;x<8;x++)for(let y=0;y<6;y++)charmedTerrain.push({x,y,kind:'floor'});
 const charmedAttackHero=actor({id:'charmed-attack-hero',name:'Charmed Attack Hero',classId:'Fighter',level:1,weapon:'Longsword',actionSpent:false});
 const charmedAttackSource=actor({id:'charmed-attack-source',name:'Charmed Attack Source',hp:20,maxHp:20,ac:10,pos:{x:2,y:1}});
 T.apply(charmedAttackHero,'charmed',2,'Charm',{sourceId:'charmed-attack-source'});
 const charmedAttackPlayer={id:'charmed-attack-hero',name:'Charmed Attack Hero',connected:true,character:charmedAttackHero};
 T18.state={character:charmedAttackHero,campaign:{day:1,region:'Charmed Attack Test',location:'Charmed Attack Test',visited:['Charmed Attack Test'],companions:[],npcs:[],sideQuests:[],story:{},flags:{},mainQuest:{kind:'test',title:'Charmed Attack Test',goal:'Validate charmed target restrictions'},multiplayer:{players:[charmedAttackPlayer]}},combat:{mp:{heroPositions:{'charmed-attack-hero':{x:1,y:1}},turnOrder:[{kind:'hero',id:'charmed-attack-hero',faction:'hero'}],index:0},target:0,enemies:[charmedAttackSource],map:{width:8,height:6,terrain:charmedTerrain}},log:[]};
 const charmedAttackResult=T.gameplay.heroAttack(charmedAttackPlayer,charmedAttackSource,false);
 assert('A Charmed multiplayer hero cannot attack the identified charmer and spends no Action',charmedAttackResult===false&&charmedAttackSource.hp===20&&charmedAttackHero.actionSpent===false);
 const charmedSpellCaster=actor({id:'charmed-spell-caster',name:'Charmed Spell Caster',classId:'Wizard',level:3,classLevels:{Wizard:3},spells:['Hold Person'],preparedSpells:['Hold Person'],spellSlotsByLevel:{2:1},actionSpent:false});
 const charmedSpellSource=actor({id:'charmed-spell-source',name:'Charmed Spell Source',hp:20,maxHp:20,ac:10,pos:{x:2,y:1}});
 T.apply(charmedSpellCaster,'charmed',2,'Charm',{sourceId:'charmed-spell-source'});
 const charmedSpellPlayer={id:'charmed-spell-caster',name:'Charmed Spell Caster',connected:true,character:charmedSpellCaster};
 T.gameplay.setSpellData('Hold Person',{name:'Hold Person',level:2,classes:['Wizard'],kind:'control',range:'60 feet',castingTime:'Action',description:'The target must succeed on a Wisdom saving throw or be Paralyzed for the duration.'});
 T18.state={character:charmedSpellCaster,campaign:{day:1,region:'Charmed Spell Test',location:'Charmed Spell Test',visited:['Charmed Spell Test'],companions:[],npcs:[],sideQuests:[],story:{},flags:{},mainQuest:{kind:'test',title:'Charmed Spell Test',goal:'Validate harmful spell target restrictions'},multiplayer:{players:[charmedSpellPlayer]}},combat:{mp:{heroPositions:{'charmed-spell-caster':{x:1,y:1}},turnOrder:[{kind:'hero',id:'charmed-spell-caster',faction:'hero'}],index:0},target:0,enemies:[charmedSpellSource],map:{width:8,height:6,terrain:charmedTerrain}},log:[]};
 const charmedHoldPerson=T.gameplay.castSpell(charmedSpellPlayer,'Hold Person');
 assert('A Charmed multiplayer caster cannot target its charmer with a harmful control spell and spends no slot or Action',charmedHoldPerson===false&&Number(charmedSpellCaster.spellSlotsByLevel[2])===1&&charmedSpellCaster.actionSpent===false&&charmedSpellSource.hp===20);

 const socialTarget=actor();T.apply(socialTarget,'charmed',2,'charm',{sourceId:'bard'});
 assert('Charmer gains Advantage on social interaction checks',T.socialCheckAdvantage({id:'bard'},socialTarget));
 const priorSocialState=T18.state;
 const charmedSocialCaster=actor({id:'bard',name:'Bard',classId:'Bard',level:1,proficiencies:['Persuasion']});
 const charmedSocialGuard=actor({id:'charmed-social-guard',name:'Guard'});
 T.apply(charmedSocialGuard,'charmed','permanent','Charm Person',{sourceId:'bard'});
 T18.state={character:charmedSocialCaster,campaign:{day:1,region:'Social Condition Test',location:'Social Condition Test',visited:[],companions:[],npcs:[charmedSocialGuard],sideQuests:[],story:{},flags:{},mainQuest:{kind:'test',title:'Social Condition Test',goal:'Validate Charmed social Advantage'}},log:[]};
 const charmedSocialOutcome=T21.resolve('Persuade the guard to open the gate',{mode:'social',target:'Guard',skill:'Persuasion',dc:12,roll:5,secondRoll:18});
 assert('Charmed source receives Advantage on a real NPC social check, not just through the helper',charmedSocialOutcome?.advantage===true&&charmedSocialOutcome.die===18&&charmedSocialOutcome.success===true,JSON.stringify(charmedSocialOutcome));
 const unrelatedSocialGuard=actor({id:'unrelated-social-guard',name:'Guard'});
 T.apply(unrelatedSocialGuard,'charmed','permanent','Charm Person',{sourceId:'another-caster'});
 T18.state.campaign.npcs=[unrelatedSocialGuard];
 const unrelatedSocialOutcome=T21.resolve('Persuade the guard to open the gate',{mode:'social',target:'Guard',skill:'Persuasion',dc:12,roll:5,secondRoll:18});
 assert('Charmed Advantage is not granted when someone else is the charmer',unrelatedSocialOutcome?.advantage!==true&&unrelatedSocialOutcome.die===5,JSON.stringify(unrelatedSocialOutcome));
 T18.state=priorSocialState;
 assert('Any attack roll that hits a Paralyzed target within 5 feet is a critical hit',T.criticalOnHit(target,{hit:true,melee:false,distance:5}));
 assert('Hits from beyond 5 feet do not receive the automatic critical',!T.criticalOnHit(target,{hit:true,melee:false,distance:30}));
 const concentration=actor({concentration:{spell:'Hold Person'},activeEffects:[{name:'Hold Person',concentration:true}]});
 T.apply(concentration,'stunned',2,'shock');
 assert('Applying an incapacitating condition ends concentration and its linked effect',concentration.concentration===null&&concentration.activeEffects.length===0);
 const short=actor();T.apply(short,'poisoned',1,'first');T.apply(short,'poisoned',4,'second');
 T.remove(short,'poisoned',{source:'first'});
 assert('Removal can target one source instance without clearing the other',T.entries(short).length===1&&T.entries(short)[0].source==='second');

 const uiHero=actor({id:'hero-ui',name:'Hero'}),uiGoblin=actor({id:'goblin-ui',name:'Goblin'});
 T.apply(uiHero,'poisoned',2,'Spider venom');
 T.apply(uiGoblin,'paralyzed',3,'Ghoul');
 const uiAlly=actor({id:'remote-ally',name:'Mira'});
 const uiWorld={character:uiHero,campaign:{multiplayer:{players:[{id:'local-player',character:uiHero},{id:'remote-player',name:'Mira',character:uiAlly}]}},combat:{mp:{},enemies:[uiGoblin]}};
 const conditionPanel=T.conditionPanel(uiWorld);
 assert('Condition dashboard resolves the selected solo enemy',T.resolveUiTarget(uiWorld,'enemy:0')===uiGoblin);
 assert('Condition dashboard includes remote multiplayer party members without duplicating the local character',T.uiTargets(uiWorld).some(x=>x.key==='player:remote-player'&&x.actor===uiAlly)&&T.uiTargets(uiWorld).filter(x=>x.actor===uiHero).length===1);
 assert('Condition dashboard resolves a remote multiplayer participant by stable player ID',T.resolveUiTarget(uiWorld,'player:remote-player')===uiAlly);
 assert('Condition dashboard renders remote multiplayer participant status sections',T.conditionPanel(uiWorld).includes('Party · Mira'));
 const remoteCondition=T.applyUiCondition(uiWorld,'player:remote-player','poisoned',2,false,'Wyvern venom');
 assert('Condition dashboard applies a condition to a remote multiplayer participant',remoteCondition.applied&&T.has(uiAlly,'poisoned'));
 const remoteRemoved=T.removeUiCondition(uiWorld,'player:remote-player','poisoned',T.entries(uiAlly)[0]?.id);
 assert('Condition dashboard removes only the selected remote participant condition',remoteRemoved.removed===1&&!T.has(uiAlly,'poisoned'));
 assert('Condition dashboard renders for the player and solo combat enemies',conditionPanel.includes('sr29-condition-panel')&&conditionPanel.includes('You · Hero')&&conditionPanel.includes('Enemy · Goblin'));
 assert('Condition dashboard displays existing source and duration instances',conditionPanel.includes('Spider venom')&&conditionPanel.includes('2 rounds')&&conditionPanel.includes('Ghoul'));
 const uiApplied=T.applyUiCondition(uiWorld,'enemy:0','frightened',3,false,'Dragon fear','dragon-ui',true);
 const uiFear=T.entries(uiGoblin).find(x=>x.name==='frightened');
 assert('Condition dashboard application records source ID, line of sight and independent duration',uiApplied.applied&&uiFear?.sourceId==='dragon-ui'&&uiFear?.sourceVisible===true&&uiFear?.rounds===3);
 const uiRemoved=T.removeUiCondition(uiWorld,'enemy:0','frightened',uiFear?.id);
 assert('Condition dashboard removes only the selected condition instance',uiRemoved.removed===1&&!T.has(uiGoblin,'frightened')&&T.has(uiGoblin,'paralyzed'));
 T.applyUiCondition(uiWorld,'player','exhaustion',2,false,'Forced march','',false);
 assert('Condition dashboard applies cumulative Exhaustion levels',uiHero.exhaustion===2&&T.status(uiHero).d20Penalty===4);
 const uiReduce=T.removeUiCondition(uiWorld,'player','exhaustion');
 assert('Condition dashboard can reduce Exhaustion one level at a time',uiReduce.removed===0&&uiHero.exhaustion===1);


 const checkPoison=actor({id:'check-poison',level:5,stats:{STR:10,DEX:10,CON:10,INT:10,WIS:14,CHA:10}});
 T.apply(checkPoison,'poisoned',2,'venom');
 const poisonCheck=T21.canonicalCheck(checkPoison,'Perception',15,{roll:18,secondRoll:3});
 assert('Director ability checks apply Poisoned Disadvantage and select the lower die',poisonCheck.disadvantage&&poisonCheck.roll===3);
 const poisonAdvCheck=T21.canonicalCheck(checkPoison,'Perception',15,{roll:18,secondRoll:3,advantage:true});
 assert('Poisoned Disadvantage cancels a manually selected Advantage in Director checks',!poisonAdvCheck.advantage&&!poisonAdvCheck.disadvantage&&poisonAdvCheck.roll===18);
 const fearCheck=actor({id:'check-fear',level:5,stats:{STR:10,DEX:10,CON:10,INT:10,WIS:14,CHA:10}});
 T.apply(fearCheck,'frightened',2,'dragon',{sourceId:'dragon',sourceVisible:true});
 const fearRoll=T21.canonicalCheck(fearCheck,'Perception',15,{roll:18,secondRoll:3});
 assert('Director ability checks apply Frightened Disadvantage while its source is visible',fearRoll.disadvantage&&fearRoll.roll===3);
 fearCheck.conditions[0].sourceVisible=false;
 const hiddenFear=T21.canonicalCheck(fearCheck,'Perception',15,{roll:18,secondRoll:3});
 assert('Director ability checks do not penalize Frightened when the source is not visible',!hiddenFear.disadvantage&&hiddenFear.roll===18);
 const expertiseCheck=actor({id:'expert-check',level:5,classId:'Wizard',stats:{STR:10,DEX:10,CON:10,INT:14,WIS:10,CHA:10},proficiencies:['History'],expertise:['History'],exhaustion:2});
 const expectedExpertise=T21.skillBonus(expertiseCheck,'History').total-4;
 const actualExpertise=T21.canonicalCheck(expertiseCheck,'History',15,{roll:12});
 assert('Director checks apply Exhaustion once without erasing Expertise',actualExpertise.bonus===expectedExpertise);
 const sightCheck=actor();T.apply(sightCheck,'blinded',2,'blindness');
 const forcedSight=T21.canonicalCheck(sightCheck,'Investigation',15,{roll:20,requiresSight:true});
 assert('Director checks automatically fail when Blinded and sight is required',forcedSight.autoFail&&forcedSight.roll===null&&!forcedSight.success);
 const hearingCheck=actor();T.apply(hearingCheck,'deafened',2,'thunder');
 const forcedHearing=T21.canonicalCheck(hearingCheck,'Perception',15,{roll:20,requiresHearing:true});
 assert('Director checks automatically fail when Deafened and hearing is required',forcedHearing.autoFail&&forcedHearing.roll===null&&!forcedHearing.success);
 const stunnedSave=actor();T.apply(stunnedSave,'stunned',2,'shock');
 const forcedHeroSave=T.heroSave(stunnedSave,'STR',null,{saveDC:15});
 assert('Monster effects automatically fail STR saves against Stunned characters',forcedHeroSave.autoFail&&!forcedHeroSave.success&&forcedHeroSave.total===-Infinity);
 const petrifiedSave=actor({exhaustion:1});T.apply(petrifiedSave,'petrified','permanent','stone');
 const forcedPetrifiedSave=T.heroSave(petrifiedSave,'DEX',null,{saveDC:15});
 assert('Monster effects automatically fail DEX saves against Petrified characters',forcedPetrifiedSave.autoFail&&!forcedPetrifiedSave.success);
 const exhaustionHeroSave=actor({stats:{STR:10,DEX:10,CON:14,INT:10,WIS:10,CHA:10},exhaustion:2});
 const reducedHeroSave=T.heroSave(exhaustionHeroSave,'CON',null,{saveDC:15});
 assert('Monster-originated saving throws apply Exhaustion -2 per level',reducedHeroSave.bonus===-2);
 const stoneEnemy=actor({id:'stone-enemy',hp:20});T.apply(stoneEnemy,'petrified','permanent','stone');
 const stoneDamage=T.applyEnemyDamage(stoneEnemy,9,'physical');
 assert('Petrified enemies resist all damage with 2024 rounding',stoneDamage===4&&stoneEnemy.hp===16);
 const stoneVulnerable=actor({id:'stone-vulnerable',hp:20,vulnerabilities:['fire']});T.apply(stoneVulnerable,'petrified','permanent','stone');
 const stoneFire=T.applyEnemyDamage(stoneVulnerable,9,'fire');
 assert('Petrified resistance cancels matching vulnerability instead of stacking modifiers',stoneFire===9&&stoneVulnerable.hp===11);
 const stoneRedundant=actor({id:'stone-resistant',hp:20,resistances:['physical']});T.apply(stoneRedundant,'petrified','permanent','stone');
 const stoneResistant=T.applyEnemyDamage(stoneRedundant,9,'physical');
 assert('Petrified resistance does not stack with another resistance to the same damage',stoneResistant===4&&stoneRedundant.hp===16);
 const stonePlayer=actor({resistances:[],vulnerabilities:['fire']});T.apply(stonePlayer,'petrified','permanent','stone');
 assert('Petrified condition resistance cancels fire vulnerability in the effective damage multiplier',T.damageMultiplier(stonePlayer,'fire')===1);
 const oldWorld=T21.state;
 const multiplayerStone=actor({hp:30,maxHp:30,resistances:[],vulnerabilities:['fire']});T.apply(multiplayerStone,'petrified','permanent','stone');
 const multiplayerPlayer={id:'mp-stone',name:'Stone Hero',character:multiplayerStone};
 T21.state={...(oldWorld||{}),combat:{...((oldWorld||{}).combat||{}),mp:{}}};
 let multiplayerDamage=0;
 try{multiplayerDamage=T.applyMonsterDamage({player:multiplayerPlayer},9,'fire',{name:'Dragon'});}
 finally{T21.state=oldWorld;}
 assert('Multiplayer monster damage applies Petrified resistance and restores character resistances',multiplayerDamage===9&&multiplayerStone.hp===21&&!multiplayerStone.resistances.includes('all'));

 const integrity=html.includes("sr29Tick(e,{phase:'round',cycle:b.round})")&&html.includes('sr29CriticalOnHit')&&sw.includes('solo-realms-systems-v29-');
 assert('Generated player grid attack uses the V29 automatic-critical rule for Paralyzed and Unconscious targets within 5 feet',html.includes("automaticCritical=sr29CriticalOnHit(e,{hit:true,distance:dist})"));
 assert('Generated build records monster Grappled source IDs and parsed reach',html.includes("grappleRange=Math.max(5,Number(range.ranged?range.normalRange:range.reach)||5)"));
 assert('Condition panel exposes a grapple reach control',html.includes('id="sr29-grapple-range"'));
 assert('Generated build includes multiplayer condition dashboard target resolution',html.includes("const partyMatch=String(key||'').match(/^player:(.+)$/)")&&html.includes('Party · '));
 assert('Generated build contains canonical V18 reaction eligibility gates',html.includes('sr18CanUseReaction(target)')&&html.includes('sr18CanUseReaction(enemy)'));
 assert('Generated build gates solo and multiplayer monster actions through V29',html.includes('if(!sr18CanUseAction(enemy))'));
 assert('Generated build includes V29 tick, critical-hit and service-worker cache integration',integrity);
  assert('Generated build includes the live V29.1 grapple gameplay adapter',html.includes("const SR29_GRAPPLE_GAMEPLAY_VERSION='29.1.0';"));
  assert('Solo combat exposes the Unarmed Strike grapple action',html.includes('data-action="sr29-grapple"')&&html.includes('Unarmed Strike · Grapple'));
  assert('Solo combat exposes the action-based grapple escape control',html.includes('data-action="sr29-escape-grapple"')&&html.includes('Escape Grapple · Action'));
  assert('Live grapple flow resolves the Director-controlled target’s stronger STR/DEX save after a hit',html.includes('sr29SoloChooseTargetSaveAbility(e)')&&html.includes('targetSave:save')&&html.includes('sr25ResolveCreatureSavingThrow(saveTarget,key,[roll],bonus,dc'));
  assert('Live grapple flow uses canonical escape checks and source-linked conditions',html.includes('sr29EscapeGrapple(c,{instanceId:grapple.id')&&html.includes('sr29StartGrapple(c,e'));
  assert('Solo grapple movement charges doubled drag cost and keeps the held target adjacent',html.includes('cost.movementCost')&&html.includes('held.forEach(target=>{target.distance=5;})'));
  assert('Free-hand calculation accounts for unarmed, one-handed, off-hand weapons and equipped shields',T.gameplay?.freeHands?.({})===2&&T.gameplay.freeHands({weapon:'Unarmed Strike'})===2&&T.gameplay.freeHands({weapon:'Dagger'})===1&&T.gameplay.freeHands({weapon:'Dagger',offHandWeapon:'Shortsword'})===0&&T.gameplay.freeHands({weapon:'Dagger',shieldEquipped:true})===0);
  assert('Free-hand calculation recognizes two-handed weapons',T.gameplay.freeHands({weapon:'Greatsword'})===0&&T.gameplay.freeHands({weapon:'Longbow'})===0);
  assert('An unequipped shield inventory record does not occupy a hand',T.gameplay.freeHands({weapon:'Dagger',inventory:[{type:'shield',equipped:false}]})===1);
  assert('An equipped shield inventory record occupies the off hand',T.gameplay.freeHands({weapon:'Dagger',inventory:[{type:'shield',equipped:true}]})===0);
  assert('An explicitly unequipped equipment shield does not occupy a hand',T.gameplay.freeHands({weapon:'Dagger',equipment:{shield:{equipped:false}}})===1);
  assert('An equipped equipment shield occupies the off hand',T.gameplay.freeHands({weapon:'Dagger',equipment:{shield:{equipped:true}}})===0);
  assert('Custom equipped main-hand and off-hand slots are recognized',T.gameplay.freeHands({equipment:{mainHand:{name:'Dagger'},offHand:{name:'Shortsword'}}})===0);
  assert('A hand crossbow remains one-handed when weapon metadata does not specify otherwise',T.gameplay.freeHands({weapon:'Hand Crossbow'})===1);
 assert('Solo monster targets choose the stronger legal grapple save',T.gameplay.chooseTargetSave(actor({stats:{STR:10,DEX:16,CON:10,INT:10,WIS:10,CHA:10}}))==='DEX');
 assert('Restrained targets account for Dexterity-save disadvantage when choosing',T.gameplay.chooseTargetSave(actor({stats:{STR:10,DEX:16,CON:10,INT:10,WIS:10,CHA:10},conditions:['restrained']}))==='STR');
 assert('Multiplayer heroes use the V29 Unarmed Strike grapple adapter',typeof T.gameplay.multiplayerStartGrapple==='function'&&html.includes('sr29MpStartGrapple(player,targetId||null)'));
 assert('Multiplayer heroes can choose Athletics or Acrobatics for Escape',typeof T.gameplay.multiplayerEscapeGrapple==='function'&&html.includes('Escape · Athletics')&&html.includes('Escape · Acrobatics'));
 assert('Multiplayer grapple initiation accepts a selected remote hero target and records a pending saving-throw challenge',html.includes('function sr29MpStartGrapple(player,targetId=null)')&&html.includes('mp.grappleChallenges.push')&&html.includes("action:'grapple',targetId"));
 assert('Remote grapple saving throws are delivered only by the targeted hero and resolved through the canonical save resolver',typeof T.gameplay.multiplayerResolveGrappleSave==='function'&&html.includes("item.targetId===player.id")&&html.includes('sr25ResolveCreatureSavingThrow(target,ability,[roll],bonus,challenge.escapeDC'));
 assert('Pending multiplayer grapple challenges are cancelled if the grappler becomes Incapacitated or the pair moves beyond reach',(()=>{
   const attacker=actor({id:'range-attacker',hp:20});
   const target=actor({id:'range-target',hp:20});
   const incapacitated=actor({id:'incapacitated-attacker',hp:20,conditions:['incapacitated']});
   const heldTarget=actor({id:'incapacitated-target',hp:20});
   const players=[
     {id:'range-attacker',connected:true,character:attacker},
     {id:'range-target',connected:true,character:target},
     {id:'incapacitated-attacker',connected:true,character:incapacitated},
     {id:'incapacitated-target',connected:true,character:heldTarget}
   ];
   const snapshot={combat:{round:2,mp:{heroPositions:{
     'range-attacker':{x:1,y:1},'range-target':{x:4,y:1},
     'incapacitated-attacker':{x:2,y:2},'incapacitated-target':{x:3,y:2}
   },grappleChallenges:[
     {id:'out-of-range',attackerId:'range-attacker',targetId:'range-target',createdRound:2,reach:5},
     {id:'incapacitated',attackerId:'incapacitated-attacker',targetId:'incapacitated-target',createdRound:2,reach:5}
   ]}},campaign:{multiplayer:{players}}};
   const result=T.gameplay.multiplayerPruneGrappleChallenges(snapshot);
   return result.removed===2&&result.remaining===0&&result.reasons.some(x=>x.reason==='grapple-range-exceeded')&&result.reasons.some(x=>x.reason==='grappler-incapacitated');
 })());
 assert('Multiplayer grapple challenges recover from disconnects, defeated participants, and stale combat rounds',(()=>{
   const players=[
     {id:'attacker',connected:true,character:actor({hp:20})},
     {id:'live',connected:true,character:actor({hp:20})},
     {id:'gone',connected:false,character:actor({hp:20})},
     {id:'dead',connected:true,character:actor({hp:0})}
   ];
   const snapshot={combat:{round:4,mp:{grappleChallenges:[
     {id:'live-challenge',attackerId:'attacker',targetId:'live',createdRound:4},
     {id:'disconnect-challenge',attackerId:'attacker',targetId:'gone',createdRound:4},
     {id:'defeat-challenge',attackerId:'attacker',targetId:'dead',createdRound:4},
     {id:'stale-challenge',attackerId:'attacker',targetId:'live',createdRound:3}
   ]}},campaign:{multiplayer:{players}}};
   const result=T.gameplay.multiplayerPruneGrappleChallenges(snapshot);
   return result.removed===3&&result.remaining===1&&snapshot.combat.mp.grappleChallenges[0].id==='live-challenge'&&
     result.reasons.some(x=>x.reason==='participant-disconnected')&&result.reasons.some(x=>x.reason==='participant-defeated')&&result.reasons.some(x=>x.reason==='challenge-expired');
 })());
 assert('Solo voluntary movement is blocked while the player character is Grappled',html.includes("if(sr29Entries(c).some(item=>item.name==='grappled')){toast('You cannot move while Grappled.")&&html.includes('sr7Move=function(direction)'));
 const heldHero=actor({id:'held-hero'});T.apply(heldHero,'grappled','permanent','Monster',{grapplerId:'monster-1'});
 const freeHero=actor({id:'free-hero'});
 assert('Multiplayer Grappled heroes cannot use voluntary tactical movement',T.gameplay.multiplayerVoluntaryMovementEligibility({id:'held-hero',character:heldHero}).legal===false&&T.gameplay.multiplayerVoluntaryMovementEligibility({id:'free-hero',character:freeHero}).legal===true);
 assert('Multiplayer grapple dragging keeps a held hero adjacent and charges double movement for a same-size target',(()=>{
   const grappler=actor({id:'mp-grappler',name:'Grappler',size:'medium',movement:30});
   const held=actor({id:'mp-held',name:'Held Hero',size:'medium'});
   T.apply(held,'grappled','permanent','Grappler',{grapplerId:'mp-grappler',grappleRange:5});
   const snapshot={combat:{mp:{heroPositions:{'mp-grappler':{x:2,y:2},'mp-held':{x:3,y:2}}},enemies:[]},
     campaign:{multiplayer:{players:[{id:'mp-grappler',connected:true,character:grappler},{id:'mp-held',connected:true,character:held}]}}};
   const plan=T.gameplay.multiplayerGrappleMovePlan(snapshot.campaign.multiplayer.players[0],{x:2,y:2},{x:3,y:2},5,0,snapshot);
   return plan.legal&&plan.drag&&plan.multiplier===2&&plan.movementCost===10&&plan.target.player.id==='mp-held';
 })());
 assert('Multiplayer grapple dragging preserves normal movement cost for a Tiny target and refuses to overlap multiple held creatures',(()=>{
   const grappler=actor({id:'mp-grappler',name:'Grappler',size:'medium',movement:30});
   const tiny=actor({id:'mp-tiny',name:'Tiny',size:'tiny'});
   T.apply(tiny,'grappled','permanent','Grappler',{grapplerId:'mp-grappler',grappleRange:5});
   const player={id:'mp-grappler',connected:true,character:grappler},held={id:'mp-tiny',connected:true,character:tiny};
   const snapshot={combat:{mp:{heroPositions:{'mp-grappler':{x:2,y:2},'mp-tiny':{x:3,y:2}}},enemies:[]},campaign:{multiplayer:{players:[player,held]}}};
   const tinyPlan=T.gameplay.multiplayerGrappleMovePlan(player,{x:2,y:2},{x:3,y:2},5,0,snapshot);
   const second=actor({id:'mp-second',name:'Second',size:'medium'});
   T.apply(second,'grappled','permanent','Grappler',{grapplerId:'mp-grappler',grappleRange:5});
   snapshot.campaign.multiplayer.players.push({id:'mp-second',connected:true,character:second});
   snapshot.combat.mp.heroPositions['mp-second']={x:2,y:3};
   const multiPlan=T.gameplay.multiplayerGrappleMovePlan(player,{x:2,y:2},{x:3,y:2},5,0,snapshot);
   return tinyPlan.legal&&tinyPlan.movementCost===5&&!tinyPlan.speedHalved&&!multiPlan.legal&&multiPlan.reason==='multiple-targets';
 })());
 assert('Multiplayer combat exposes Strength and Dexterity save choices to the targeted hero',html.includes('data-action="sr29-mp-grapple-save"')&&html.includes('data-ability="STR"')&&html.includes('data-ability="DEX"'));
 assert('Multiplayer combat exposes connected party-member grapple targets within 5 feet',html.includes('data-action="sr29-mp-grapple"')&&html.includes('sr12Distance(sr12PlayerPos(me),sr12PlayerPos(p.id))>5'));
 assert('Grapple initiators cannot take another action until the remote target resolves the pending save',html.includes('Wait for the target to resolve the grapple saving throw.')&&html.includes("msg?.action==='grapple-save'"));
 assert('Multiplayer grappled monsters use their stored escape DC and release one grapple instance',html.includes('sr29EscapeGrapple(enemy,{instanceId:grapple.id')&&html.includes('grapple.escapeDC??enemy.grappleDC??12'));
 assert('Multiplayer grapple initiation uses source-linked V29 conditions and the canonical target save resolver',html.includes('sr29StartGrapple(grappler,e')&&html.includes('sr29SoloTargetSave(e,ability,escapeDC)'));
 const explicitSkillCheck=T.canonicalAbilityCheck(actor({stats:{STR:10,DEX:10,CON:10,INT:10,WIS:10,CHA:10}}),'Athletics',14,{roll:10,bonusOverride:5});
 assert('Canonical ability checks preserve explicit monster skill bonuses',explicitSkillCheck.total===15&&explicitSkillCheck.success===true);

 const priorSoloActionHooks={afterPlayerAction:context.afterPlayerAction,render:context.render,save:context.save};
 context.afterPlayerAction=()=>{};context.render=()=>{};context.save=()=>{};
 const priorShoveState=T18.state;
 const shoveHero=actor({id:'solo-shover',name:'Solo Shover',level:1,stats:{STR:16,DEX:10,CON:10,INT:10,WIS:10,CHA:10}});
 const shoveTarget=actor({id:'solo-shove-target',name:'Shove Target',distance:5,size:'medium',saves:{STR:0,DEX:0}});
 T.apply(shoveTarget,'grappled','permanent','Solo Shover',{grapplerId:'solo-shover',grappleRange:5,escapeDC:12});
 T18.state={character:shoveHero,combat:{mp:null,enemies:[shoveTarget]},log:[]};
 const soloShovePush=T.gameplay.soloShove('push');
 assert('Solo player Shove pushes a failed-save target 5 feet and reconciles the broken grapple',soloShovePush&&shoveTarget.distance===10&&!T.has(shoveTarget,'grappled'));
 T18.state=priorShoveState;
 const proneHero=actor({id:'solo-prone-shover',name:'Prone Shover',level:1,stats:{STR:16,DEX:10,CON:10,INT:10,WIS:10,CHA:10}});
 const proneTarget=actor({id:'solo-prone-target',name:'Prone Target',distance:5,size:'medium',saves:{STR:0,DEX:0}});
 T18.state={character:proneHero,combat:{mp:null,enemies:[proneTarget]},log:[]};
 const soloShoveProne=T.gameplay.soloShove('prone');
 assert('Solo player Shove can knock a failed-save target Prone',soloShoveProne&&T.has(proneTarget,'prone'));
 T18.state=priorShoveState;
 const resistHero=actor({id:'solo-resist-shover',name:'Resist Shover',level:1,stats:{STR:16,DEX:10,CON:10,INT:10,WIS:10,CHA:10}});
 const resistantTarget=actor({id:'solo-resistant-target',name:'Resistant Target',distance:5,size:'medium',saves:{STR:30,DEX:30}});
 T18.state={character:resistHero,combat:{mp:null,enemies:[resistantTarget]},log:[]};
 const resistedShove=T.gameplay.soloShove('push');
 assert('Solo player Shove leaves a target in place when its chosen save succeeds',resistedShove&&resistantTarget.distance===5&&!T.has(resistantTarget,'prone'));
 T18.state=priorShoveState;
 context.afterPlayerAction=priorSoloActionHooks.afterPlayerAction;context.render=priorSoloActionHooks.render;context.save=priorSoloActionHooks.save;

 const pushSpell=T.gameplay.parseForcedDisplacement('On a failed save, the target is pushed up to 10 feet away.');
 const pullSpell=T.gameplay.parseForcedDisplacement('The creature is pulled 15 feet toward the caster.');
 assert('Player spell displacement parser extracts Push and Pull direction and distance',pushSpell?.mode==='push'&&pushSpell.feet===10&&pullSpell?.mode==='pull'&&pullSpell.feet===15);
 const descOnlyDisplacement=T.gameplay.spellDisplacementSpec({desc:'The target is pushed 10 feet away from you.'});
 assert('Spell displacement reads both description and legacy desc fields',descOnlyDisplacement?.mode==='push'&&descOnlyDisplacement.feet===10);
 const soloMasteryHero=actor({id:'solo-mastery-hero',name:'Solo Mastery Hero',classId:'Fighter',level:1,weapon:'Warhammer',weaponMasteries:['Warhammer']});
 const soloMasteryTarget=actor({id:'solo-mastery-target',name:'Solo Mastery Target',size:'Medium',distance:5});
 T18.state={character:soloMasteryHero,combat:{mp:null,enemies:[soloMasteryTarget]},campaign:{},log:[]};
 T.apply(soloMasteryTarget,'grappled','permanent','Solo Mastery Hero',{grapplerId:'solo-mastery-hero',sourceId:'solo-mastery-hero',grappleRange:5,escapeDC:12});
 const soloMasteryPush=T.gameplay.applyMastery(soloMasteryTarget,soloMasteryHero,'Warhammer',true,20,5);
 const soloGrappleReleased=!T.has(soloMasteryTarget,'grappled');
 const soloHugeTarget=actor({id:'solo-huge-target',name:'Solo Huge Target',size:'Huge',distance:5});
 const soloHugePush=T.gameplay.applyMastery(soloHugeTarget,soloMasteryHero,'Warhammer',true,20,5);
 const soloMissTarget=actor({id:'solo-miss-target',name:'Solo Miss Target',size:'Medium',distance:5});
 const soloMissPush=T.gameplay.applyMastery(soloMissTarget,soloMasteryHero,'Warhammer',false,1,0);
 assert('Solo Push mastery moves eligible targets, reconciles grapples, and rejects Huge targets and misses',soloMasteryPush===true&&soloMasteryTarget.distance===15&&soloGrappleReleased&&soloHugePush===false&&soloHugeTarget.distance===5&&soloMissPush===false&&soloMissTarget.distance===5);
 const priorSpellMoveState=T18.state;
 const forcedSpellCaster=actor({id:'spell-caster',name:'Spell Caster'});
 const abstractDisplacementTarget=actor({id:'spell-target',name:'Spell Target',distance:10});
 T18.state={character:forcedSpellCaster,combat:{mp:null,enemies:[abstractDisplacementTarget]},campaign:{},log:[]};
 T.apply(abstractDisplacementTarget,'grappled','permanent','Spell Caster',{grapplerId:'spell-caster',sourceId:'spell-caster',grappleRange:5,escapeDC:12});
 const abstractPushResult=T.gameplay.playerSpellDisplace(abstractDisplacementTarget,{id:'spell-caster'},'push',5);
 const abstractPushReleased=!T.has(abstractDisplacementTarget,'grappled');
 const abstractPullTarget=actor({id:'spell-pull-target',name:'Spell Pull Target',distance:20});
 T18.state.combat.enemies=[abstractPullTarget];
 const abstractPullResult=T.gameplay.playerSpellDisplace(abstractPullTarget,{id:'spell-caster'},'pull',5);
 assert('Player spell Push and Pull update abstract distance and reconcile grapples after forced movement',abstractPushResult&&abstractDisplacementTarget.distance===15&&abstractPushReleased&&abstractPullResult&&abstractPullTarget.distance===15);
 T18.state=priorSpellMoveState;
 const priorMasteryRandom=math.random;
 const masteryHero=actor({id:'mastery-hero',name:'Mastery Hero',classId:'Fighter',level:1,classLevels:{Fighter:1},weapon:'Warhammer',weaponMasteries:['Warhammer'],actionSpent:false,bonusActionSpent:false,stats:{STR:18,DEX:10,CON:10,INT:10,WIS:10,CHA:10}});
 const masteryPlayer={id:'mastery-hero',name:'Mastery Hero',connected:true,character:masteryHero};
 const masteryEnemy=actor({id:'mastery-enemy',name:'Mastery Enemy',size:'Medium',hp:100,maxHp:100,ac:1,pos:{x:2,y:1},stats:{STR:12,DEX:10,CON:10,INT:10,WIS:10,CHA:10}});
 const masteryTerrain=[];for(let x=0;x<8;x++)for(let y=0;y<6;y++)masteryTerrain.push({x,y,kind:'floor'});
 T18.state={character:masteryHero,campaign:{multiplayer:{players:[masteryPlayer]},companions:[]},combat:{round:1,mp:{heroPositions:{'mastery-hero':{x:1,y:1}},turnOrder:[{kind:'hero',id:'mastery-hero'}],index:0},enemies:[masteryEnemy],map:{width:8,height:6,terrain:masteryTerrain}},log:[]};
 T.apply(masteryEnemy,'grappled','permanent','Mastery Hero',{grapplerId:'mastery-hero',sourceId:'mastery-hero',grappleRange:5,escapeDC:12});
 math.random=()=>0.5;
 let masteryAttackResult=false;
 try{masteryAttackResult=T.gameplay.heroAttack(masteryPlayer,masteryEnemy,false);}finally{math.random=priorMasteryRandom;}
 assert('A successful multiplayer Warhammer Push hit displaces the enemy and releases an out-of-reach grapple',masteryAttackResult===true&&masteryEnemy.pos.x>=4&&!T.has(masteryEnemy,'grappled'),JSON.stringify({masteryAttackResult,masteryLookup:T.gameplay.weaponMasteryFor(masteryHero,'Warhammer'),pushable:T.gameplay.canPushTarget(masteryEnemy),pos:masteryEnemy.pos,conditions:masteryEnemy.conditions,log:T18.state.log.slice(0,6)}));
 const masteryProbe=actor({id:'mastery-probe',name:'Mastery Probe',size:'Medium',hp:100,pos:{x:2,y:1}});
 T18.state.combat.enemies=[masteryProbe];
 const masteryProbeMoved=T.gameplay.applyMasteryPush(masteryProbe,masteryPlayer,{x:1,y:1},'Warhammer');
 assert('The multiplayer Push transaction accepts a legal source, target, and learned mastery',masteryProbeMoved===true&&masteryProbe.pos.x>=4,JSON.stringify({masteryProbeMoved,pos:masteryProbe.pos,lookup:T.gameplay.weaponMasteryFor(masteryHero,'Warhammer')}));
 const hugePushTarget=actor({id:'huge-push-target',name:'Huge Push Target',size:'Huge',pos:{x:2,y:1},hp:30});
 T18.state.combat.enemies=[hugePushTarget];
 const hugePush=T.gameplay.applyMasteryPush(hugePushTarget,masteryPlayer,{x:1,y:1},'Warhammer');
 const untrainedHero=actor({id:'untrained-hero',name:'Untrained Hero',classId:'Fighter',level:1,weaponMasteries:['Longsword']});
 const untrainedPlayer={id:'untrained-hero',name:'Untrained Hero',character:untrainedHero};
 const untrainedTarget=actor({id:'untrained-target',name:'Untrained Target',size:'Medium',pos:{x:2,y:1},hp:30});
 T18.state.combat.enemies=[untrainedTarget];
 const untrainedPush=T.gameplay.applyMasteryPush(untrainedTarget,untrainedPlayer,{x:1,y:1},'Warhammer');
 assert('Push mastery rejects Huge targets and weapons the character has not mastered',hugePush===false&&hugePushTarget.pos.x===2&&untrainedPush===false&&untrainedTarget.pos.x===2);
 const spellSaveTarget=actor({name:'Thunderwave Target'});
 assert('Player spell displacement recognizes failed target-save results without treating successful saves as failures',T.gameplay.spellTargetFailedSave(spellSaveTarget,[{msg:'Thunderwave Target makes CON save 11 vs DC 13: failure.'}])&&!T.gameplay.spellTargetFailedSave(spellSaveTarget,[{msg:'Thunderwave Target makes CON save 18 vs DC 13: success.'}]));
 const movementOnlySpell=T18.inferSpell('Gust of Wind',{description:'The target must succeed on a Strength saving throw or be pushed 15 feet away.',save:true,saveAbility:'STR'},{kind:'control',condition:'restrained',save:'STR'});
 assert('Movement-only control spells do not receive an invented Restrained condition',movementOnlySpell.kind==='control'&&!movementOnlySpell.condition);
 const priorSpellState=T18.state;
 const spellHero=actor({id:'spell-caster',name:'Spell Caster'}),forcedSpellTarget=actor({id:'spell-target',name:'Spell Target',distance:5});
 T.apply(forcedSpellTarget,'grappled','permanent','Spell Caster',{grapplerId:'spell-caster',grappleRange:5,escapeDC:12});
 T18.state={character:spellHero,combat:{mp:null,enemies:[forcedSpellTarget]},log:[]};
 const spellPush=T.gameplay.playerSpellDisplace(forcedSpellTarget,spellHero,'push',10);
 assert('Player spell Push updates solo abstract distance and releases a grapple beyond reach',spellPush&&forcedSpellTarget.distance===15&&!T.has(forcedSpellTarget,'grappled'));
 const pullHero=actor({id:'spell-puller',name:'Spell Puller'}),pulledTarget=actor({id:'pulled-target',name:'Pulled Target',distance:5});
 T18.state={character:pullHero,combat:{mp:null,enemies:[pulledTarget]},log:[]};
 const spellPull=T.gameplay.playerSpellDisplace(pulledTarget,pullHero,'pull',10);
 assert('Player spell Pull updates solo abstract distance without producing a negative separation',spellPull&&pulledTarget.distance===0);
 const mpCaster={id:'mp-caster',name:'MP Caster',connected:true,character:actor({id:'mp-caster',name:'MP Caster'})};
 const tacticalTarget=actor({id:'tactical-spell-target',name:'Tactical Spell Target',hp:20,pos:{x:2,y:1}});
 const openTerrain=[];for(let x=0;x<8;x++)for(let y=0;y<6;y++)openTerrain.push({x,y,kind:'floor'});
 T18.state={character:mpCaster.character,campaign:{multiplayer:{players:[mpCaster]}},combat:{mp:{heroPositions:{'mp-caster':{x:1,y:1}}},enemies:[tacticalTarget],map:{width:8,height:6,terrain:openTerrain}},log:[]};
 const tacticalPush=T.gameplay.playerSpellDisplace(tacticalTarget,mpCaster,'push',10,{x:1,y:1});
 assert('Player spell Push uses collision-aware tactical displacement in multiplayer combat',tacticalPush&&tacticalTarget.pos.x===4&&tacticalTarget.pos.y===1);
 T18.state=priorSpellState;

 const incapacitatedGateActor=actor({id:'gate-actor',name:'Gate Actor',classId:'Barbarian',level:3,classLevels:{Barbarian:3},stats:{STR:16,DEX:10,CON:12,INT:10,WIS:10,CHA:10},reactionAvailable:true,bonusActionSpent:false,actionSpent:false});
 T.apply(incapacitatedGateActor,'incapacitated','permanent','action gate regression');
 const gatePlayer={id:'gate-actor',name:'Gate Actor',connected:true,character:incapacitatedGateActor};
 const gateEnemy=actor({id:'gate-enemy',name:'Gate Enemy',hp:20,pos:{x:2,y:1}});
 T18.state={character:incapacitatedGateActor,campaign:{multiplayer:{players:[gatePlayer]}},combat:{mp:{turnOrder:[{kind:'hero',id:'gate-actor'}],index:0,heroPositions:{'gate-actor':{x:1,y:1}}},enemies:[gateEnemy],map:{width:8,height:6,terrain:openTerrain}},log:[]};
 const gateFeature=T.gameplay.runFeature(gatePlayer,'rage');
 const gateLegacyPower=T.gameplay.classPower(gatePlayer);
 const gateCunning=T.gameplay.cunningAction(gatePlayer,'dash');
 const gateHeroAction=T.gameplay.heroAction(gatePlayer,'attack');
 const gateSpell=T.gameplay.castSpell(gatePlayer,'Thunderwave');
 const gateReaction=T.gameplay.heroAttack(gatePlayer,gateEnemy,true);
 assert('Incapacitated blocks player class Bonus Actions, Cunning Action, ordinary actions, spellcasting, and reactions',!gateFeature&&!gateLegacyPower&&!gateCunning&&!gateHeroAction&&!gateSpell&&!gateReaction&&!incapacitatedGateActor.bonusActionSpent&&!incapacitatedGateActor.actionSpent&&incapacitatedGateActor.reactionAvailable);
 const spentActionActor=actor({id:'spent-action',name:'Spent Action',actionSpent:true});
 const spentBonusActor=actor({id:'spent-bonus',name:'Spent Bonus',bonusActionSpent:true});
 assert('The canonical action-economy gate rejects already-spent Actions and Bonus Actions',!T.gameplay.actionEconomyGate(spentActionActor,'action',true)&&!T.gameplay.actionEconomyGate(spentBonusActor,'bonus-action',true));
 const reactionAttackHero=actor({id:'reaction-attack-hero',name:'Reaction Attack Hero',classId:'Fighter',level:1,weapon:'Dagger',actionSpent:false,bonusActionSpent:false,reactionAvailable:true});
 const reactionAttackPlayer={id:'reaction-attack-hero',name:'Reaction Attack Hero',connected:true,character:reactionAttackHero};
 const reactionAttackTarget=actor({id:'reaction-attack-target',name:'Reaction Attack Target',hp:100,maxHp:100,ac:1,size:'Medium',pos:{x:2,y:1}});
 const reactionAttackTerrain=[];for(let x=0;x<8;x++)for(let y=0;y<6;y++)reactionAttackTerrain.push({x,y,kind:'floor'});
 T18.state={character:reactionAttackHero,campaign:{multiplayer:{players:[reactionAttackPlayer]},companions:[]},combat:{mp:{heroPositions:{'reaction-attack-hero':{x:1,y:1}},turnOrder:[{kind:'hero',id:'reaction-attack-hero',faction:'hero'}],index:0},enemies:[reactionAttackTarget],map:{width:8,height:6,terrain:reactionAttackTerrain}},log:[]};
 const priorReactionRandom=math.random;math.random=()=>0.99;
 let reactionAttackResult=false;
 try{reactionAttackResult=T.gameplay.heroAttack(reactionAttackPlayer,reactionAttackTarget,true);}finally{math.random=priorReactionRandom;}
 const reactionConsumed=reactionAttackHero.reactionAvailable===false,actionPreserved=reactionAttackHero.actionSpent===false&&reactionAttackHero.bonusActionSpent===false;
 const secondReactionAttack=T.gameplay.heroAttack(reactionAttackPlayer,reactionAttackTarget,true);
 assert('A Reaction attack consumes only the Reaction and cannot be used twice before refresh',reactionAttackResult===true&&reactionConsumed&&actionPreserved&&secondReactionAttack===false);
 const spentReactionActor=actor({id:'spent-reaction',name:'Spent Reaction',reactionAvailable:false});
 assert('Spent Reaction blocks only reaction use while leaving Action and Bonus Action eligibility intact',!T.gameplay.actionEconomyGate(spentReactionActor,'reaction',true)&&T.gameplay.actionEconomyGate(spentReactionActor,'action',true)&&T.gameplay.actionEconomyGate(spentReactionActor,'bonus-action',true));
 const spentBard=actor({id:'spent-bard',name:'Spent Bard',classId:'Bard',level:3,classLevels:{Bard:3},stats:{STR:10,DEX:12,CON:12,INT:10,WIS:12,CHA:16},reactionAvailable:false,resourcesByClass:{Bard:{inspiration:3}}});
 const spentBardPlayer={id:'spent-bard',name:'Spent Bard',character:spentBard};
 T18.state={character:spentBard,campaign:{multiplayer:{players:[spentBardPlayer]}},combat:{mp:null,enemies:[gateEnemy]},log:[]};
 const cuttingWordsBlocked=T.gameplay.runFeature(spentBardPlayer,'cuttingWords');
 const readiedAttackBlocked=T.gameplay.heroAttack(spentBardPlayer,gateEnemy,true);
 assert('A spent Reaction blocks Cutting Words and readied attacks without spending another resource',!cuttingWordsBlocked&&!readiedAttackBlocked&&spentBard.reactionAvailable===false&&spentBard.resourcesByClass.Bard.inspiration===3);
 const reactionCaster=actor({id:'reaction-caster',name:'Reaction Caster',actionSpent:true,bonusActionSpent:true,reactionAvailable:true});
 T18.state={character:reactionCaster,combat:{round:1},campaign:{},log:[]};
 const reactionCastFinalized=T.gameplay.finalizeCastResources(reactionCaster,'reaction',true,{actionSpent:true,bonusActionSpent:true});
 assert('A successful Reaction spell spends the Reaction without overwriting the existing Action or Bonus Action state',reactionCastFinalized&&reactionCaster.reactionAvailable===false&&reactionCaster.actionSpent===true&&reactionCaster.bonusActionSpent===true);
 const failedReactionCaster=actor({id:'failed-reaction-caster',name:'Failed Reaction Caster',actionSpent:false,bonusActionSpent:false,reactionAvailable:true});
 const failedReactionFinalized=T.gameplay.finalizeCastResources(failedReactionCaster,'reaction',false,{actionSpent:false,bonusActionSpent:false});
 assert('A failed or cancelled Reaction spell does not consume the Reaction',!failedReactionFinalized&&failedReactionCaster.reactionAvailable===true&&failedReactionCaster.actionSpent===false&&failedReactionCaster.bonusActionSpent===false);
 assert('A Reaction consumed by spellcasting cannot be reused later in the same turn',!T.gameplay.actionEconomyGate(reactionCaster,'reaction',true));
 const surgeFighter=actor({id:'surge-fighter',name:'Surge Fighter',classId:'Fighter',level:2,classLevels:{Fighter:2},actionSpent:true,bonusActionSpent:true});
 const surgePlayer={id:'surge-fighter',name:'Surge Fighter',character:surgeFighter};
 T18.state={character:surgeFighter,campaign:{multiplayer:{players:[surgePlayer]}},combat:{mp:{heroPositions:{'surge-fighter':{x:1,y:1}},turnOrder:[{kind:'hero',id:'surge-fighter',faction:'hero'}],index:0},enemies:[],map:{width:8,height:6,terrain:[]}},log:[]};
 const surgeResult=T.gameplay.classPower(surgePlayer);
 assert('Action Surge remains usable after the Bonus Action and does not consume it',surgeResult===true&&surgeFighter.actionSurgeUsed===true&&surgeFighter.actionSpent===false&&surgeFighter.bonusActionSpent===true);
 const featureSurgeFighter=actor({id:'feature-surge-fighter',name:'Feature Surge Fighter',classId:'Fighter',level:2,classLevels:{Fighter:2},actionSpent:true,bonusActionSpent:true,resourcesByClass:{Fighter:{actionSurge:1}}});
 const featureSurgePlayer={id:'feature-surge-fighter',name:'Feature Surge Fighter',character:featureSurgeFighter};
 T18.state={character:featureSurgeFighter,campaign:{multiplayer:{players:[featureSurgePlayer]}},combat:{mp:{heroPositions:{'feature-surge-fighter':{x:1,y:1}},turnOrder:[{kind:'hero',id:'feature-surge-fighter',faction:'hero'}],index:0},enemies:[],map:{width:8,height:6,terrain:[]}},log:[]};
 const modernSurge=T.gameplay.runFeature(featureSurgePlayer,'actionSurge');
 assert('The modern Action Surge feature adapter also works after both normal resources are spent',modernSurge===true&&featureSurgeFighter.actionSurgeReady===true&&featureSurgeFighter.actionSpent===false&&featureSurgeFighter.bonusActionSpent===true);
 const dispatchedSurgeFighter=actor({id:'dispatched-surge-fighter',name:'Dispatched Surge Fighter',classId:'Fighter',level:2,classLevels:{Fighter:2},actionSpent:true,bonusActionSpent:true});
 const dispatchedSurgePlayer={id:'dispatched-surge-fighter',name:'Dispatched Surge Fighter',character:dispatchedSurgeFighter};
 T.gameplay.setConnection(dispatchedSurgePlayer.id,{peer:dispatchedSurgePlayer.id});
 T18.state={character:dispatchedSurgeFighter,campaign:{day:1,region:'Action Surge Test',location:'Action Surge Test',visited:['Action Surge Test'],companions:[],npcs:[],sideQuests:[],story:{},flags:{},mainQuest:{kind:'test',title:'Action Surge Test',goal:'Validate class-power dispatch'},multiplayer:{players:[dispatchedSurgePlayer]}},combat:{mp:{heroPositions:{'dispatched-surge-fighter':{x:1,y:1}},turnOrder:[{kind:'hero',id:'dispatched-surge-fighter',faction:'hero'}],index:0},enemies:[],map:{width:8,height:6,terrain:[]}},log:[]};
 const dispatchedSurge=T.gameplay.heroAction(dispatchedSurgePlayer,'power-class',null,null,{classId:'Fighter'});
 assert('The legacy player-action dispatcher routes Fighter Action Surge through its free class-specific timing',dispatchedSurge===true&&dispatchedSurgeFighter.actionSurgeUsed===true&&dispatchedSurgeFighter.actionSpent===false&&dispatchedSurgeFighter.bonusActionSpent===true);
 const oldPowerFighter=actor({id:'old-power-fighter',name:'Old Power Fighter',classId:'Fighter',level:2,classLevels:{Fighter:2},actionSpent:true,bonusActionSpent:true});
 const oldPowerPlayer={id:'old-power-fighter',name:'Old Power Fighter',character:oldPowerFighter};
 T18.state={character:oldPowerFighter,campaign:{day:1,region:'Legacy Power Test',location:'Legacy Power Test',visited:['Legacy Power Test'],companions:[],npcs:[],sideQuests:[],story:{},flags:{},mainQuest:{kind:'test',title:'Legacy Power Test',goal:'Validate legacy class-power dispatch'},multiplayer:{players:[oldPowerPlayer]}},combat:{mp:{heroPositions:{'old-power-fighter':{x:1,y:1}},turnOrder:[{kind:'hero',id:'old-power-fighter',faction:'hero'}],index:0},enemies:[],map:{width:8,height:6,terrain:[]}},log:[]};
 const oldPowerSurge=T.gameplay.heroAction(oldPowerPlayer,'power');
 assert('The original power action also routes Fighter Action Surge through free timing instead of wrongly requiring a Bonus Action',oldPowerSurge===true&&oldPowerFighter.actionSurgeUsed===true&&oldPowerFighter.actionSpent===false&&oldPowerFighter.bonusActionSpent===true);
 const actionCleric=actor({id:'action-cleric',name:'Action Cleric',classId:'Cleric',level:5,classLevels:{Cleric:5},hp:10,maxHp:30,actionSpent:false,bonusActionSpent:true});
 const clericPlayer={id:'action-cleric',name:'Action Cleric',connected:true,character:actionCleric};
 T18.state={character:actionCleric,campaign:{multiplayer:{players:[clericPlayer]}},combat:{mp:{heroPositions:{'action-cleric':{x:1,y:1}},turnOrder:[{kind:'hero',id:'action-cleric',faction:'hero'}],index:0},enemies:[],map:{width:8,height:6,terrain:[]}},log:[]};
 const clericPower=T.gameplay.classPower(clericPlayer);
 assert('The legacy Cleric healing power consumes an Action rather than a Bonus Action',clericPower===true&&actionCleric.actionSpent===true&&actionCleric.bonusActionSpent===true);
 const blockedWizard=actor({id:'blocked-wizard',name:'Blocked Wizard',classId:'Wizard',level:5,spellSlots:0,maxSpellSlots:5});
 const wizardPlayer={id:'blocked-wizard',name:'Blocked Wizard',character:blockedWizard};
 T18.state={character:blockedWizard,campaign:{multiplayer:{players:[wizardPlayer]}},combat:{mp:{heroPositions:{'blocked-wizard':{x:1,y:1}},turnOrder:[{kind:'hero',id:'blocked-wizard',faction:'hero'}],index:0},enemies:[],map:{width:8,height:6,terrain:[]}},log:[]};
 const wizardRecovery=T.gameplay.classPower(wizardPlayer);
 assert('Arcane Recovery cannot be used as an in-combat Bonus Action',wizardRecovery===false&&blockedWizard.spellSlots===0&&!blockedWizard.bonusActionSpent);
 const spentBarbarian=actor({id:'spent-barbarian',name:'Spent Barbarian',classId:'Barbarian',level:1,rageRounds:0,bonusActionSpent:true});
 const barbarianPlayer={id:'spent-barbarian',name:'Spent Barbarian',character:spentBarbarian};
 T18.state={character:spentBarbarian,campaign:{multiplayer:{players:[barbarianPlayer]}},combat:{mp:{heroPositions:{'spent-barbarian':{x:1,y:1}},turnOrder:[{kind:'hero',id:'spent-barbarian',faction:'hero'}],index:0},enemies:[],map:{width:8,height:6,terrain:[]}},log:[]};
 const rageBlocked=T.gameplay.classPower(barbarianPlayer);
 assert('Rage remains gated by an already-spent Bonus Action',rageBlocked===false&&spentBarbarian.rageRounds===0&&spentBarbarian.bonusActionSpent===true);
 const reactionHeroA=actor({id:'reaction-hero-a',name:'Reaction Hero A',reactionAvailable:false,actionSpent:true,bonusActionSpent:true});
 const reactionHeroB=actor({id:'reaction-hero-b',name:'Reaction Hero B',reactionAvailable:true});
 const reactionPlayerA={id:'reaction-hero-a',name:'Reaction Hero A',connected:true,character:reactionHeroA};
 const reactionPlayerB={id:'reaction-hero-b',name:'Reaction Hero B',connected:true,character:reactionHeroB};
 const reactionEnemy=actor({id:'reaction-enemy',name:'Reaction Enemy',hp:20,reactionAvailable:false});
 T18.state={character:reactionHeroA,campaign:{multiplayer:{players:[reactionPlayerA,reactionPlayerB]},companions:[]},combat:{round:1,mp:{heroPositions:{'reaction-hero-a':{x:1,y:1},'reaction-hero-b':{x:2,y:1}},turnOrder:[{kind:'hero',id:'reaction-hero-a',faction:'hero'}],index:0},enemies:[reactionEnemy],map:{width:8,height:6,terrain:[]}},log:[]};
 const reactionErrors=[];
 try{T.gameplay.endRound();}catch(e){reactionErrors.push('endRound: '+e.message);}
 const reactionsPreserved=reactionHeroA.reactionAvailable===false&&reactionHeroB.reactionAvailable===true&&reactionEnemy.reactionAvailable===false;
 try{T.gameplay.beginHeroTurn(reactionPlayerA);}catch(e){reactionErrors.push('beginHeroTurn: '+e.message);}
 const heroReactionReset=reactionHeroA.reactionAvailable===true&&reactionHeroA.actionSpent===false&&reactionHeroA.bonusActionSpent===false;
 T18.state.campaign.multiplayer.players=[];
 reactionEnemy.reactionAvailable=false;
 try{T.gameplay.beginEnemyTurn(reactionEnemy);}catch(e){reactionErrors.push('beginEnemyTurn: '+e.message);}
 assert('Reactions refresh at each creature’s own turn, not at the round boundary',reactionErrors.length===0&&reactionsPreserved&&heroReactionReset&&reactionEnemy.reactionAvailable===true,JSON.stringify({reactionErrors,reactionsPreserved,heroReactionReset,enemyReaction:reactionEnemy.reactionAvailable,round:T18.state.combat?.round}));
 T18.state=priorSpellState;

 assert('Solo grapple panel exposes both 2024 Shove outcomes',html.includes('data-action="sr29-shove-push"')&&html.includes('data-action="sr29-shove-prone"')&&html.includes('function sr29SoloShove(mode='));

 const abstractGrappler=actor({id:'abstract-hero',name:'Abstract Hero'}),abstractTarget=actor({id:'abstract-foe',name:'Abstract Foe',distance:10});
 T.apply(abstractTarget,'grappled','permanent','Abstract Hero',{grapplerId:'abstract-hero',grappleRange:5,escapeDC:12});
 const abstractRelease=T.gameplay.reconcileAbstractGrapples({character:abstractGrappler,combat:{enemies:[abstractTarget]}});
 assert('Forced movement beyond reach releases only the matching abstract-distance grapple',abstractRelease.count===1&&!T.has(abstractTarget,'grappled'));
 const abstractHolder=actor({id:'abstract-foe',name:'Abstract Foe',distance:10}),abstractVictim=actor({id:'abstract-hero',name:'Abstract Hero'});
 T.apply(abstractVictim,'grappled','permanent','Abstract Foe',{grapplerId:'abstract-foe',grappleRange:5,escapeDC:12});
 const abstractVictimRelease=T.gameplay.reconcileAbstractGrapples({character:abstractVictim,combat:{enemies:[abstractHolder]}});
 assert('Abstract-distance reconciliation also releases a player held by a displaced enemy',abstractVictimRelease.count===1&&!T.has(abstractVictim,'grappled'));
   assert('V29 reconciliation runs after solo and multiplayer enemy movement and monster actions',html.includes('sr10EnemyMove=function(...args)')&&html.includes('sr12EnemyStep=function(...args)')&&html.includes('sr18ResolveMonsterAction=function(...args)')&&html.includes('sr29ReconcileAbstractGrapples();')&&html.includes('sr29ReconcileCombatGrapples();'));
  const movementHooks=['sr12MoveHero=function(player,x,y)','sr29MpGrappleMovePlan(player,from,to,stepCost,standCost)','sr131Maneuver=function(...args)','sr7ApplyMastery=function(enemy,actor,weapon,hit,...args)','sr14CastSpellComplete=function(...args)'];
  const movementHookChecks=movementHooks.map(hook=>({hook,present:html.includes(hook)}));
  assert('V29 reconciliation runs after multiplayer hero movement, shove, weapon mastery push and spell resolution',movementHookChecks.every(item=>item.present),JSON.stringify(movementHookChecks));
  const maneuverHook=html.slice(html.indexOf("if(typeof sr131Maneuver==='function')"),html.indexOf("if(typeof sr7ApplyMastery==='function')"));
  assert('Player Shove maneuvers reconcile abstract and tactical grapple reach',maneuverHook.includes('sr29ReconcileAbstractGrapples();')&&maneuverHook.includes('sr29ReconcileCombatGrapples();'));
 assert('Solo grappled monsters spend their action on a source-specific canonical escape check',html.includes('sr7EnemySpecial=function(enemy)')&&html.includes('sr29EscapeGrapple(enemy,{instanceId:grapple.id')&&html.includes('bonusOverride:skillBonus'));
 assert('Monster-initiated grapples retain parsed escape DC, reach, size and action appendage metadata',html.includes('escape\\s+DC\\s*(\\d+)')&&html.includes('escapeDC,grapplerSize:sr29MpSize(enemy),targetSize:sr29MpSize(creature),handSlot}'));
 assert('Monster grapple appendage capacity uses explicit anatomy or a conservative creature default',T.gameplay.appendageCapacity(actor({type:'humanoid'}))===2&&T.gameplay.appendageCapacity(actor({type:'ooze'}))===1&&T.gameplay.appendageCapacity(actor({appendages:['tentacle-1','tentacle-2','tentacle-3']}))===3&&html.includes('if(!handSlot)')&&html.includes('sr29NextMonsterAppendageSlot(enemy,active)'));
 assert('Creature anatomy excludes locomotion-only appendages from grapple capacity',T.gameplay.appendageCapacity(actor({appendages:[{type:'wing'},{type:'leg'},{type:'tentacle',grappleCapable:true},{type:'arm',canGrapple:true}]}))===2);
 assert('Explicit grapple appendage lists honor disabled and unusable entries',T.gameplay.appendageCapacity(actor({grappleAppendages:[{type:'tentacle'},{type:'tentacle',canGrapple:false},'pseudopod',false]}))===2);
 assert('Unknown anatomy does not count every appendage as a hand',T.gameplay.appendageCapacity(actor({type:'aberration',appendages:[{type:'wing'},{type:'tail'},{type:'leg'}]}))===1);
 assert('Unarmed character has two free hands',T.gameplay.freeHands(actor())===2);
 assert('One-handed weapon leaves one free hand',T.gameplay.freeHands(actor({weapon:'Longsword'}))===1);
 assert('Two-handed custom main-hand configuration occupies both hands',T.gameplay.freeHands(actor({equipment:{mainHand:{name:'Custom Greatblade',equipped:true,hands:2}}}))===0);
 assert('Hand crossbow is not treated as automatically two-handed',T.gameplay.freeHands(actor({weapon:'Hand Crossbow'}))===1);
 assert('Unequipped off-hand item does not consume a hand',T.gameplay.freeHands(actor({weapon:'Longsword',equipment:{offHand:{name:'Dagger',equipped:false}}}))===1);
 assert('Unequipped shield inventory record does not consume a hand',T.gameplay.freeHands(actor({weapon:'Longsword',inventory:[{name:'Shield',type:'shield',equipped:false}]}))===1);
 assert('Equipped shield inventory record consumes the off-hand',T.gameplay.freeHands(actor({weapon:'Longsword',inventory:[{name:'Shield',type:'shield',equipped:true}]}))===0);
 assert('Off-hand shield is counted once rather than double-counted',T.gameplay.freeHands(actor({weapon:'Longsword',offHandWeapon:{name:'Shield',type:'shield',equipped:true},shieldEquipped:true}))===0);
 const appendageMonster=actor({type:'humanoid'});
 assert('Monster grapple allocation reuses the first genuinely free appendage slot after a grapple ends',T.gameplay.nextAppendageSlot(appendageMonster,[{handSlot:'monster-appendage-1'},{handSlot:'monster-appendage-3'}])==='monster-appendage-2');
 assert('Monster grapple allocation does not duplicate a surviving non-first appendage slot',T.gameplay.nextAppendageSlot(appendageMonster,[{handSlot:'monster-appendage-2'}])==='monster-appendage-1');
 assert('Legacy monster grapples without slot metadata still reserve appendage capacity',T.gameplay.nextAppendageSlot(appendageMonster,[{}])==='monster-appendage-2');
 assert('Monster grapple allocation reports no slot when every appendage is occupied',T.gameplay.nextAppendageSlot(appendageMonster,[{handSlot:'monster-appendage-1'},{handSlot:'monster-appendage-2'}])===null);
 assert('Monster grapple-on-hit attacks resolve AC, damage, appendage capacity and source-linked escape metadata',html.includes('attack=sr11RollAttack(bonus,enemy,c,!range.ranged)')&&html.includes("sr29Apply(c,'grappled','permanent',enemy.name")&&html.includes('freeHands:capacity,activeGrapples:active'));



  const monsterCritHero=actor({id:'monster-crit-hero',name:'Monster Critical Hero',hp:30,maxHp:30});
  const monsterCritPlayer={id:'solo',name:'Monster Critical Hero',character:monsterCritHero};
  const monsterCritEnemy={id:'monster-crit-enemy',name:'Critical Claw',attack:100,pos:{x:2,y:1}};
  const monsterCritTarget={player:monsterCritPlayer,pos:{x:1,y:1}};
  T18.state={character:monsterCritHero,campaign:{multiplayer:null,companions:[]},combat:{mp:null,heroPos:{x:1,y:1},enemies:[monsterCritEnemy],map:{width:8,height:6,terrain:[]},round:1},log:[]};
  T.apply(monsterCritHero,'paralyzed','permanent','monster critical regression');
  const priorMonsterCritRandom=math.random;math.random=()=>0.5;
  let monsterCriticalResult=false;
  try{monsterCriticalResult=T18.resolveMonsterAction(monsterCritEnemy,{name:'Claw',attack_bonus:100,description:'Melee Weapon Attack Roll: +100, reach 5 ft. Hit: 1d6 slashing damage.',damage:[{dice:'1d6',type:'slashing'}]},monsterCritTarget);}finally{math.random=priorMonsterCritRandom;}
  assert('Monster melee attacks automatically critical-hit a Paralyzed target within 5 feet',monsterCriticalResult===true&&monsterCritHero.hp===22&&T18.state.log.some(x=>/critical hit/.test(x.msg)),JSON.stringify({hp:monsterCritHero.hp,log:T18.state.log}));

  const flatModifierHero=actor({id:'flat-modifier-hero',name:'Flat Modifier Hero',hp:30,maxHp:30});
  const flatModifierEnemy={id:'flat-modifier-monster',name:'Flat Modifier Monster',attack:100,pos:{x:2,y:1}};
  const flatModifierTarget={player:{id:'solo',name:'Flat Modifier Hero',character:flatModifierHero},pos:{x:1,y:1}};
  T18.state={character:flatModifierHero,campaign:{multiplayer:null,companions:[]},combat:{mp:null,heroPos:{x:1,y:1},enemies:[flatModifierEnemy],map:{width:8,height:6,terrain:[]},round:1},log:[]};
  T.apply(flatModifierHero,'paralyzed','permanent','flat modifier critical regression');
  const priorFlatModifierRandom=math.random;math.random=()=>0.5;
  let flatModifierResult=false;
  try{flatModifierResult=T18.resolveMonsterAction(flatModifierEnemy,{name:'Modified Claw',attack_bonus:100,description:'Melee Weapon Attack Roll: +100, reach 5 ft. Hit: 1d6+3 slashing damage.',damage:[{dice:'1d6+3',type:'slashing'}]},flatModifierTarget);}finally{math.random=priorFlatModifierRandom;}
  assert('Monster critical damage doubles the die but applies the flat damage modifier only once',flatModifierResult===true&&flatModifierHero.hp===19&&T18.state.log.some(x=>/critical hit for 11 slashing damage/.test(x.msg)),JSON.stringify({hp:flatModifierHero.hp,log:T18.state.log}));

  const distantUnconsciousHero=actor({id:'distant-unconscious-hero',name:'Distant Unconscious Hero',hp:30,maxHp:30});
  const distantPlayer={id:'solo',name:'Distant Unconscious Hero',character:distantUnconsciousHero};
  const distantMonster={id:'distant-monster',name:'Ranged Hunter',attack:100,pos:{x:3,y:1}};
  T18.state={character:distantUnconsciousHero,campaign:{multiplayer:null,companions:[]},combat:{mp:null,heroPos:{x:1,y:1},enemies:[distantMonster],map:{width:8,height:6,terrain:[]},round:1},log:[]};
  T.apply(distantUnconsciousHero,'unconscious','permanent','distance critical regression');
  const priorDistantRandom=math.random;math.random=()=>0.5;
  let distantAttackResult=false;
  try{distantAttackResult=T18.resolveMonsterAction(distantMonster,{name:'Longbow',attack_bonus:100,description:'Ranged Weapon Attack Roll: +100, range 30/120 ft. Hit: 1d6 piercing damage.',damage:[{dice:'1d6',type:'piercing'}]}, {player:distantPlayer,pos:{x:1,y:1}});}finally{math.random=priorDistantRandom;}
  assert('A monster ranged hit from beyond 5 feet does not gain the automatic Unconscious critical',distantAttackResult===true&&distantUnconsciousHero.hp===26&&!T18.state.log.some(x=>/critical hit/.test(x.msg)),JSON.stringify({hp:distantUnconsciousHero.hp,log:T18.state.log}));
  assert('Monster critical bonus dice preserve flat attack damage modifiers',T18.criticalExtraDice('2d6+4')==='2d6'&&T18.criticalExtraDice('1d8 + 1d6 + 3')==='1d8+1d6'&&T18.criticalExtraDice('1d10-2')==='1d10');

  const D=context.__SR29_DEATH_TEST;
  assert('V29.58 True Resurrection type restoration and 25,000+ gp component parsing are installed',!!D&&D.version==='29.58.0'&&typeof D.deathSave==='function');

  const soloCriticalHero=actor({id:'solo-critical-hero',name:'Solo Critical Hero',hp:30,maxHp:30,armor:'Traveler’s clothes'});
  const soloCriticalEnemy={id:'solo-critical-enemy',name:'Solo Critical Monster',attack:100,damage:'1d6',pos:{x:2,y:1}};
  T18.state={character:soloCriticalHero,campaign:{companions:[]},combat:{mp:null,heroPos:{x:1,y:1},enemies:[soloCriticalEnemy],map:{width:8,height:6,terrain:[]},round:1},log:[]};
  T.apply(soloCriticalHero,'paralyzed','permanent','solo initiative critical regression');
  assert('Solo V11 critical fixture is Paralyzed and meets the 5-foot automatic-critical rule',T.has(soloCriticalHero,'paralyzed')&&T.criticalOnHit(soloCriticalHero,{hit:true,distance:5}));
  const priorSoloCriticalRandom=math.random;math.random=()=>0.5;
  try{D.soloMonsterAttack(soloCriticalEnemy);}finally{math.random=priorSoloCriticalRandom;}
  assert('V11 solo initiative monster attacks gain Advantage and automatic critical damage against a Paralyzed target within 5 feet',soloCriticalHero.hp===22&&T18.state.log.some(x=>/Critical hit/.test(x.msg)),JSON.stringify({hp:soloCriticalHero.hp,log:T18.state.log}));
  assert('A critical marker is consumed after damaging a conscious solo hero',!soloCriticalEnemy._sr29AttackCriticalPending);
  assert('V11 solo initiative monster attacks use the canonical condition attack and critical resolvers',html.includes('sr29CriticalOnHit(c,{hit,distance:dist})')&&html.includes('sr18CriticalExtraDice(e.damage||'));

  const soloFlatCriticalHero=actor({id:'solo-flat-critical-hero',name:'Solo Flat Critical Hero',hp:30,maxHp:30,armor:'Traveler’s clothes'});
  const soloFlatCriticalEnemy={id:'solo-flat-critical-enemy',name:'Solo Flat Critical Monster',attack:100,damage:'1d6+3',pos:{x:2,y:1}};
  T18.state={character:soloFlatCriticalHero,campaign:{companions:[]},combat:{mp:null,heroPos:{x:1,y:1},enemies:[soloFlatCriticalEnemy],map:{width:8,height:6,terrain:[]},round:1},log:[]};
  T.apply(soloFlatCriticalHero,'paralyzed','permanent','solo flat critical regression');
  const priorSoloFlatRandom=math.random;math.random=()=>0.5;
  try{D.soloMonsterAttack(soloFlatCriticalEnemy);}finally{math.random=priorSoloFlatRandom;}
  assert('V11 solo monster critical damage doubles dice without doubling flat modifiers',soloFlatCriticalHero.hp===19&&T18.state.log.some(x=>/Critical hit/.test(x.msg)),JSON.stringify({hp:soloFlatCriticalHero.hp,log:T18.state.log}));

  const soloRogue=actor({id:'solo-rogue',name:'Solo Rogue',classId:'Rogue',level:3,classLevels:{Rogue:3},weapon:'Rapier',stats:{STR:10,DEX:18,CON:10,INT:10,WIS:10,CHA:10},hidden:true,actionSurgeArmed:true,sneakAttackUsed:false});

  const srdSpellCaster=actor({id:'srd-spell-caster',name:'SRD Spell Caster',classId:'Wizard',level:3,classLevels:{Wizard:3},spells:['V29 Critical Bolt'],preparedSpells:['V29 Critical Bolt'],spellAttackBonus:100,actionSpent:false,bonusActionSpent:false,spellSlots:4});
  const srdSpellTarget=actor({id:'srd-spell-target',name:'Paralyzed SRD Spell Target',hp:20,maxHp:20,ac:1,pos:{x:2,y:1}});
  T.gameplay.setSpellData('V29 Critical Bolt',{name:'V29 Critical Bolt',level:0,classes:['Wizard'],attack:true,damage:'1d6+3',damageType:'force',range:'30 feet',castingTime:'Action',description:'Make a ranged spell attack against one creature.'});
  T18.state={character:srdSpellCaster,campaign:{day:1,region:'Spell Critical Test',location:'Spell Critical Test',visited:['Spell Critical Test'],companions:[],npcs:[],sideQuests:[],story:{},flags:{},mainQuest:{kind:'test',title:'Spell Critical Test',goal:'Validate spell criticals'}},combat:{mp:null,heroPos:{x:1,y:1},target:0,enemies:[srdSpellTarget],map:{width:8,height:6,terrain:[]},round:1},log:[]};
  T.apply(srdSpellTarget,'paralyzed','permanent','SRD spell critical regression');
  const priorSrdSpellRandom=math.random,srdSpellRolls=[0.5,0.5,0.5,0.999];math.random=()=>srdSpellRolls.length?srdSpellRolls.shift():0.5;
  let srdSpellCast=false;try{srdSpellCast=T.gameplay.castSpell({id:'solo',name:'SRD Spell Caster',character:srdSpellCaster},'V29 Critical Bolt');}finally{math.random=priorSrdSpellRandom;}
  assert('SRD spell attack automatically critical-hits a Paralyzed target within 5 feet and doubles dice only',srdSpellCast===true&&srdSpellTarget.hp===7&&srdSpellTarget._sr29LastSpellAttackRoll!==20&&srdSpellTarget._sr29LastSpellAttackCritical===true&&T18.state.log.some(x=>/critically hits Paralyzed SRD Spell Target on d20 11/.test(x.msg)),JSON.stringify({cast:srdSpellCast,hp:srdSpellTarget.hp,log:T18.state.log.slice(-5)}));
  const legacySpellCaster=actor({id:'legacy-spell-caster',name:'Legacy Spell Caster',classId:'Wizard',level:5,classLevels:{Wizard:5},stats:{STR:10,DEX:10,CON:10,INT:20,WIS:10,CHA:10}});
  const legacySpellTarget=actor({id:'legacy-spell-target',name:'Paralyzed Legacy Spell Target',hp:20,maxHp:20,ac:1,pos:{x:2,y:1}});
  T18.state={character:legacySpellCaster,campaign:{multiplayer:{active:true,players:[{id:'legacy-spell-caster',name:'Legacy Spell Caster',connected:true,character:legacySpellCaster}]},companions:[]},combat:{mp:{heroPositions:{'legacy-spell-caster':{x:1,y:1}}},heroPos:{x:1,y:1},enemies:[legacySpellTarget],map:{width:8,height:6,terrain:[]},round:1},log:[]};T18.setActivePlayerId('legacy-spell-caster');
  T.apply(legacySpellTarget,'paralyzed','permanent','legacy spell critical regression');
  const priorLegacySpellRandom=math.random,legacySpellRolls=[0.5,0.5,0.5,0.999];math.random=()=>legacySpellRolls.length?legacySpellRolls.shift():0.5;
  let legacySpellDamage=0;try{legacySpellDamage=T18.spellDamage(legacySpellTarget,{name:'Legacy Bolt',kind:'meleeSpell',dice:'1d6+3',damageType:'force'},legacySpellCaster,{attack:true});}finally{math.random=priorLegacySpellRandom;T18.setActivePlayerId(null);}
  assert('Legacy multiplayer spell-damage resolver applies condition criticals and doubles only damage dice',legacySpellDamage===13&&legacySpellTarget.hp===7&&legacySpellTarget._sr29LastSpellAttackRoll!==20&&legacySpellTarget._sr29LastSpellAttackCritical===true&&T18.state.log.some(x=>/critically hits Paralyzed Legacy Spell Target on d20 11/.test(x.msg)),JSON.stringify({damage:legacySpellDamage,hp:legacySpellTarget.hp,log:T18.state.log}));

  const soloRogueTarget=actor({id:'solo-rogue-target',name:'Paralyzed Rogue Target',hp:100,maxHp:100,ac:1,pos:{x:2,y:1}});
  const soloRogueTerrain=[];for(let x=0;x<8;x++)for(let y=0;y<6;y++)soloRogueTerrain.push({x,y,kind:'floor'});
  T18.state={character:soloRogue,campaign:{companions:[]},combat:{heroPos:{x:1,y:1},enemies:[soloRogueTarget],target:0,map:{width:8,height:6,terrain:soloRogueTerrain},round:1},log:[]};
  T.apply(soloRogueTarget,'paralyzed','permanent','solo player critical regression');
  const priorSoloRogueRandom=math.random;math.random=()=>0.5;
  try{D.soloHeroAttack();}finally{math.random=priorSoloRogueRandom;}
  assert('Solo Rogue criticals double weapon and Sneak Attack dice against a Paralyzed target',soloRogueTarget.hp===74&&soloRogue.sneakAttackUsed===true&&T18.state.log.some(x=>/Critical hit/.test(x.msg))&&T18.state.log.some(x=>/Sneak Attack adds critical extra damage/.test(x.msg)),JSON.stringify({hp:soloRogueTarget.hp,log:T18.state.log.slice(0,5)}));
  const mpWeaponHero=actor({id:'mp-weapon-hero',name:'MP Weapon Hero',classId:'Fighter',level:5,weapon:'Longsword',actionSpent:false,stats:{STR:18,DEX:10,CON:10,INT:10,WIS:10,CHA:10}});
  const mpWeaponPlayer={id:'mp-weapon-hero',name:'MP Weapon Hero',connected:true,character:mpWeaponHero};
  const mpWeaponTarget=actor({id:'mp-weapon-target',name:'Paralyzed Multiplayer Target',hp:100,maxHp:100,ac:1,pos:{x:2,y:1}});
  const mpWeaponTerrain=[];for(let x=0;x<8;x++)for(let y=0;y<6;y++)mpWeaponTerrain.push({x,y,kind:'floor'});
  T18.state={character:mpWeaponHero,campaign:{multiplayer:{active:true,players:[mpWeaponPlayer]},companions:[]},combat:{round:1,mp:{heroPositions:{'mp-weapon-hero':{x:1,y:1}},turnOrder:[{kind:'hero',id:'mp-weapon-hero'}],index:0},enemies:[mpWeaponTarget],map:{width:8,height:6,terrain:mpWeaponTerrain}},log:[]};
  T.apply(mpWeaponTarget,'paralyzed','permanent','multiplayer player critical regression');
  const priorMpWeaponRandom=math.random;math.random=()=>0.5;
  let mpWeaponResult=false;try{mpWeaponResult=T.gameplay.heroAttack(mpWeaponPlayer,mpWeaponTarget,false);}finally{math.random=priorMpWeaponRandom;}
  assert('Multiplayer weapon attacks automatically critical-hit a Paralyzed target within 5 feet',mpWeaponResult===true&&mpWeaponTarget.hp===72&&T18.state.log.filter(x=>/Critical hit/.test(x.msg)).length===2,JSON.stringify({hp:mpWeaponTarget.hp,log:T18.state.log.slice(0,5)}));

  const downedCriticalHero=actor({id:'downed-critical-hero',name:'Downed Critical Hero',hp:0,maxHp:20,deathFailure:0,deathSuccess:0,stable:false,unconscious:true,conditions:[{name:'unconscious',duration:999}]});
  const downedCriticalEnemy={id:'downed-critical-enemy',name:'Downed Critical Monster',attack:100,damage:'1d6',attackDownedHero:true,pos:{x:2,y:1}};
  T18.state={character:downedCriticalHero,campaign:{companions:[]},combat:{mp:null,downed:true,heroPos:{x:1,y:1},enemies:[downedCriticalEnemy],map:{width:8,height:6,terrain:[]},round:1},log:[]};
  const priorDownedCriticalRandom=math.random;math.random=()=>0.5;
  try{D.soloMonsterAttack(downedCriticalEnemy);}finally{math.random=priorDownedCriticalRandom;}
  assert('A solo monster critical hit against an unconscious hero at 0 HP causes two failed death saves',downedCriticalHero.hp===0&&downedCriticalHero.deathFailure===2&&!downedCriticalHero.mpDead&&!downedCriticalEnemy._sr29AttackCriticalPending,JSON.stringify({hp:downedCriticalHero.hp,failures:downedCriticalHero.deathFailure,dead:downedCriticalHero.mpDead,log:T18.state.log}));
  assert('The active solo monster turn dispatcher does not skip a downed hero as its target',html.includes('if(sr9Dist(e.pos,b.heroPos)<=5)sr10EnemyAttack(e);')&&!html.includes('if(sr9Dist(e.pos,b.heroPos)<=5&&state.character.hp>0)sr10EnemyAttack(e);'));
  assert('The active V11 monster attack only targets a downed hero when explicitly instructed',html.includes('if(!e||c.hp<=0&&!e.attackDownedHero)return;'));
  const deathHero=actor({id:'solo-death-hero',name:'Solo Death Hero',hp:0,maxHp:20,deathSuccess:2,deathFailure:0,stable:false,unconscious:true,conditions:[{name:'unconscious',duration:999}]});
  T18.state={character:deathHero,campaign:{companions:[],day:1},combat:{mp:null,downed:true,round:2,enemies:[]},log:[]};
  const priorDeathRandom=math.random;math.random=()=>0.5;
  let stableRoll=false;try{stableRoll=D.deathSave();}finally{math.random=priorDeathRandom;}
  assert('Three solo death-save successes stabilize at 0 HP and remain unconscious',stableRoll&&deathHero.hp===0&&deathHero.stable===true&&deathHero.deathSuccess===3&&D.hasUnconscious(deathHero)&&T18.state.combat.downed===true,JSON.stringify({hp:deathHero.hp,stable:deathHero.stable,success:deathHero.deathSuccess,conditions:deathHero.conditions}));
  assert('Stabilization rolls and stores a 1d4-hour recovery interval',Number.isInteger(deathHero.stableRecoveryHours)&&deathHero.stableRecoveryHours>=1&&deathHero.stableRecoveryHours<=4&&deathHero.stableElapsedHours===0);
  deathHero.stable=false;deathHero.deathSuccess=0;deathHero.deathFailure=0;deathHero.mpDead=false;T18.state.combat.downed=true;
  const priorNat20Random=math.random;math.random=()=>0.9999;
  try{D.deathSave();}finally{math.random=priorNat20Random;}
  assert('Natural 20 on a solo death save restores exactly 1 HP and clears unconscious/downed state',deathHero.hp===1&&!deathHero.stable&&!deathHero.unconscious&&deathHero.deathSuccess===0&&deathHero.deathFailure===0&&!T18.state.combat.downed);
  deathHero.hp=0;deathHero.unconscious=true;deathHero.stable=false;deathHero.deathSuccess=0;deathHero.deathFailure=0;deathHero.mpDead=false;T18.state.combat.downed=true;
  const priorNat1Random=math.random;math.random=()=>0;
  try{D.deathSave();}finally{math.random=priorNat1Random;}
  assert('Natural 1 on a solo death save adds two failures',deathHero.deathFailure===2&&!deathHero.mpDead);
  deathHero.deathFailure=0;deathHero.deathSuccess=0;deathHero.hp=0;deathHero.stable=true;deathHero.unconscious=true;deathHero.stableRecoveryHours=3;deathHero.stableElapsedHours=0;T18.state.combat.downed=true;
  const stableBefore=T18.state.log.length;const stableNoRoll=D.deathSave();
  assert('A stable solo hero skips further death saves until damaged or healed',stableNoRoll===false&&deathHero.deathSuccess===0&&T18.state.log.length===stableBefore);

  const recoveryHours=deathHero.stableRecoveryHours;
  const earlyStableRecovery=D.advanceStableTime(Math.max(0,recoveryHours-1));
  assert('Stable solo recovery waits for the rolled 1d4-hour interval',earlyStableRecovery===false&&deathHero.hp===0&&deathHero.stable===true&&Number(deathHero.stableElapsedHours)===Math.max(0,recoveryHours-1));
  const completedStableRecovery=D.advanceStableTime(1);
  assert('A stable solo hero regains 1 HP and consciousness after the rolled interval',completedStableRecovery===true&&deathHero.hp===1&&!deathHero.stable&&!deathHero.unconscious&&!T18.state.combat.downed);

  const damagedStableHero=actor({id:'damaged-stable-hero',name:'Damaged Stable Hero',hp:0,maxHp:20,stable:true,unconscious:true,deathFailure:0,stableRecoveryHours:3,stableElapsedHours:2,conditions:[{name:'unconscious',duration:999}]});
  T18.state={character:damagedStableHero,campaign:{companions:[],day:1},combat:{mp:null,downed:true,round:1,enemies:[]},log:[]};
  const stableDamage=D.damageAtZero(1);
  assert('Damage to a stable solo hero cancels its timed recovery before resuming death saves',stableDamage.failures===1&&!damagedStableHero.stable&&damagedStableHero.deathFailure===1&&damagedStableHero.stableRecoveryHours===undefined&&damagedStableHero.stableElapsedHours===undefined);

  const watchStableHero=actor({id:'watch-stable-hero',name:'Watch Stable Hero',hp:0,maxHp:20,stable:true,unconscious:true,stableRecoveryHours:2,stableElapsedHours:0,conditions:[{name:'unconscious',duration:999}]});
  T18.state={character:watchStableHero,campaign:{day:1,companions:[]},combat:null,log:[]};
  D.advanceWorld('action',0);
  const noWatchRecovery=watchStableHero.hp===0&&watchStableHero.stable===true;
  D.advanceWorld('travel',0);
  assert('Only elapsed world watches advance stable recovery; a four-hour watch restores 1 HP when due',noWatchRecovery&&watchStableHero.hp===1&&!watchStableHero.stable&&!watchStableHero.unconscious,JSON.stringify({hp:watchStableHero.hp,stable:watchStableHero.stable,worldClock:T18.state.campaign.sr18?.clock}));
  T18.state={character:deathHero,campaign:{companions:[],day:1},combat:{mp:null,downed:true,round:2,enemies:[]},log:[]};
  deathHero.stable=false;deathHero.deathFailure=1;deathHero.mpDead=false;deathHero.deathAt=null;deathHero.hp=0;T18.state.combat.downed=true;
  const ordinaryDownedDamage=D.damageAtZero(1);
  assert('Damage to a solo hero at 0 HP adds one failed death save',ordinaryDownedDamage.failures===1&&!ordinaryDownedDamage.dead&&deathHero.deathFailure===2);
  deathHero.deathFailure=1;deathHero.mpDead=false;deathHero.deathAt=null;deathHero.hp=0;T18.state.combat.downed=true;
  const originalDeathRender=context.render;context.render=()=>{};
  const criticalDownedDamage=D.damageAtZero(1,{lastAttackCritical:true});
  assert('Critical damage to a solo hero at 0 HP adds two failed saves and records death time',criticalDownedDamage.dead&&deathHero.mpDead&&deathHero.deathFailure===3&&Number(deathHero.deathAt)>0);
  const massiveDeathHero=actor({id:'massive-death-hero',name:'Massive Death Hero',hp:0,maxHp:20,stable:false,unconscious:true});
  T18.state={character:massiveDeathHero,campaign:{companions:[],day:1},combat:{mp:null,downed:true,round:1,enemies:[]},log:[]};
  const massiveDeath=D.damageAtZero(20);
  assert('Massive damage at 0 HP causes instant death and records a revival timestamp',massiveDeath.dead&&massiveDeath.massive&&massiveDeathHero.mpDead&&Number(massiveDeathHero.deathAt)>0&&T18.state.combat===null);
  context.render=originalDeathRender;
  assert('Solo initiative now rolls death saves at the downed hero turn and continues processing the initiative order',html.includes('sr29SoloDeathSave();if(!state.combat){render();return;}if(state.character.hp>0){sr10RenderTurn();return;}')&&!html.includes('if(!state.combat)return;if(state.character.hp<=0)return;const next=b.turnIndex+1;'));

  const healedDeathHero=actor({id:'healed-death-hero',name:'Healed Death Hero',hp:0,maxHp:20,stable:true,unconscious:true,deathSuccess:3,deathFailure:1,conditions:[{name:'unconscious',duration:999}]});
  T18.state={character:healedDeathHero,campaign:{companions:[],day:1},combat:{mp:null,downed:true,round:1,enemies:[]},log:[]};
  const soloHealAmount=D.heal(5);
  assert('Healing above 0 HP clears solo stable, unconscious and death-save state',soloHealAmount===5&&healedDeathHero.hp===5&&!healedDeathHero.stable&&!healedDeathHero.unconscious&&healedDeathHero.deathSuccess===0&&healedDeathHero.deathFailure===0&&!T18.state.combat.downed);

  const deadHero=actor({id:'dead-hero',name:'Dead Hero',hp:0,maxHp:20,mpDead:true,deathAt:123,stable:false,unconscious:true});
  T18.state={character:deadHero,campaign:{companions:[],day:1},combat:{mp:null,downed:true,round:1,enemies:[]},log:[]};
  const deadHealAmount=D.heal(10);
  assert('Ordinary healing cannot revive a dead solo character',deadHealAmount===0&&deadHero.hp===0&&deadHero.mpDead===true&&deadHero.deathAt===123);

  const postCombatHero=actor({id:'post-combat-hero',name:'Post Combat Hero',hp:0,maxHp:20,stable:true,unconscious:true,deathSuccess:3,deathFailure:0,conditions:[{name:'unconscious',duration:999}]});
  T18.state={character:postCombatHero,campaign:{companions:[],day:1},combat:null,log:[]};
  const postCombatHeal=D.heal(4);
  assert('Healing after combat still clears a stable solo character at 0 HP',postCombatHeal===4&&postCombatHero.hp===4&&!postCombatHero.stable&&!postCombatHero.unconscious&&postCombatHero.deathSuccess===0&&postCombatHero.deathFailure===0);
  const newlyDownedHero=actor({id:'newly-downed-hero',name:'Newly Downed Hero',hp:4,maxHp:20});
  T18.state={character:newlyDownedHero,campaign:{companions:[],day:1},combat:{mp:null,downed:false,round:1,enemies:[]},log:[]};
  const appliedDamage=D.damagePlayer(9);
  assert('Damage that reduces a solo hero to 0 HP enters the downed state for the next initiative turn',newlyDownedHero.hp===0&&appliedDamage===9&&T18.state.combat.downed===true&&newlyDownedHero.unconscious===true&&D.hasUnconscious(newlyDownedHero));
  assert('Multiplayer massive-damage death records the timestamp needed by Revivify',html.includes('c.deathFailure=3;c.deathAt=Date.now();log(`${player.name} suffers massive damage and dies instantly.`'));

  const persistedDeathHero=actor({id:'persisted-death-hero',name:'Persisted Death Hero',hp:0,maxHp:20,classId:'Fighter',ancestry:'Human',level:5,inventory:[],proficiencies:[],deathSuccess:2,deathFailure:1,stable:true,stableRecoveryHours:3,stableElapsedHours:2,unconscious:true,mpDead:false,deathAt:123456,conditions:[{name:'unconscious',duration:999}]});
  const deathSavePayload={character:persistedDeathHero,campaign:{companions:[],npcs:[],sideQuests:[]},combat:{downed:true,mp:null},log:[]};
  const validatedDeathSave=T18.validateSave(JSON.parse(JSON.stringify(deathSavePayload)));
  assert('Save validation and JSON round-trip preserve downed, stable and death timestamp fields',validatedDeathSave.ok&&validatedDeathSave.state.character.deathSuccess===2&&validatedDeathSave.state.character.deathFailure===1&&validatedDeathSave.state.character.stable===true&&validatedDeathSave.state.character.stableRecoveryHours===3&&validatedDeathSave.state.character.stableElapsedHours===2&&validatedDeathSave.state.character.deathAt===123456&&validatedDeathSave.state.combat.downed===true);

  const mpStableHero=actor({id:'mp-stable-hero',name:'MP Stable Hero',classId:'Fighter',ancestry:'Human',level:5,inventory:[],proficiencies:[],hp:0,maxHp:20,mpDowned:true,mpDead:false,stable:false,deathSuccess:2,deathFailure:0,unconscious:true,conditions:[{name:'unconscious',duration:999}]});
  const mpStablePlayer={id:'mp-stable-hero',name:'MP Stable Hero',connected:true,character:mpStableHero};
  T18.state={character:mpStableHero,campaign:{day:1,multiplayer:{active:true,players:[mpStablePlayer]}},combat:{mp:{},enemies:[]},log:[]};
  const priorMpStableRandom=math.random;math.random=()=>0.5;
  let mpStableResult=false;try{mpStableResult=D.multiplayerDeathSave(mpStablePlayer);}finally{math.random=priorMpStableRandom;}
  assert('Multiplayer death-save stabilization stores its own 1d4-hour recovery interval',mpStableResult&&mpStableHero.stable===true&&mpStableHero.mpDowned===false&&mpStableHero.stableRecoveryHours===3&&mpStableHero.stableElapsedHours===0);
  const mpPartialRecovery=D.advanceStableTime(2);
  assert('Multiplayer stable recovery accumulates elapsed time without restoring HP early',mpPartialRecovery===false&&mpStableHero.hp===0&&mpStableHero.stable===true&&mpStableHero.stableElapsedHours===2);
  const mpStablePreImportState=T18.state;
  const mpStableSnapshot=T18.snapshot('V29 multiplayer stable recovery round-trip');
  const mpStableNormalized=T18.normalizeImport(mpStableSnapshot);
  const mpStableValidated=T18.validateSave(mpStableNormalized);
  const restoredMpStablePlayer=mpStableValidated.state?.campaign?.multiplayer?.players?.find(player=>player.id==='mp-stable-hero');
  const restoredMpStableHero=restoredMpStablePlayer?.character;
  assert('Multiplayer stable timer is preserved by snapshot export and import normalization',
    mpStableSnapshot.state?.campaign?.multiplayer?.players?.[0]?.character?.stableRecoveryHours===3&&
    mpStableSnapshot.state?.campaign?.multiplayer?.players?.[0]?.character?.stableElapsedHours===2&&
    mpStableNormalized.campaign?.multiplayer?.players?.[0]?.character?.stableRecoveryHours===3&&
    mpStableNormalized.campaign?.multiplayer?.players?.[0]?.character?.stableElapsedHours===2);
  assert('Multiplayer save validation preserves the remote hero stable/downed recovery state',
    mpStableValidated.ok&&restoredMpStableHero?.stable===true&&restoredMpStableHero.hp===0&&
    restoredMpStableHero.stableRecoveryHours===3&&restoredMpStableHero.stableElapsedHours===2,
    JSON.stringify({ok:mpStableValidated.ok,reason:mpStableValidated.reason,hero:restoredMpStableHero}));
  if(mpStableValidated.ok&&restoredMpStableHero){
    T18.state=mpStableValidated.state;
    D.advanceWorld('travel',0);
    assert('A restored multiplayer stable hero completes recovery through the world clock',
      restoredMpStableHero.hp===1&&!restoredMpStableHero.stable&&!restoredMpStableHero.mpDowned&&
      !restoredMpStableHero.unconscious&&restoredMpStableHero.stableRecoveryHours===undefined&&
      restoredMpStableHero.stableElapsedHours===undefined);
  }else{
    assert('A restored multiplayer stable hero completes recovery through the world clock',false,'Save/import did not produce a valid multiplayer state.');
  }
  T18.state=mpStablePreImportState;
  D.advanceWorld('travel',0);
  assert('Multiplayer stable heroes regain 1 HP after the world-clock recovery interval',mpStableHero.hp===1&&!mpStableHero.stable&&!mpStableHero.mpDowned&&!mpStableHero.unconscious&&mpStableHero.deathSuccess===0&&mpStableHero.deathFailure===0,JSON.stringify({hp:mpStableHero.hp,stable:mpStableHero.stable,worldClock:T18.state.campaign.sr18?.clock}));

  assert('Multiplayer timed recovery clears its persisted timer after restoration',mpStableHero.stableRecoveryHours===undefined&&mpStableHero.stableElapsedHours===undefined);
  mpStableHero.hp=0;mpStableHero.stable=true;mpStableHero.mpDowned=false;mpStableHero.stableRecoveryHours=3;mpStableHero.stableElapsedHours=1;mpStableHero.deathFailure=0;
  D.multiplayerDamageHero(mpStablePlayer,1,'physical',null);
  assert('Damage to a stable multiplayer hero cancels timed recovery and resumes failed death saves',!mpStableHero.stable&&mpStableHero.mpDowned===true&&mpStableHero.deathFailure===1&&mpStableHero.stableRecoveryHours===undefined&&mpStableHero.stableElapsedHours===undefined);
  mpStableHero.hp=1;D.clearMultiplayerDowned(mpStableHero);
  assert('Multiplayer healing cleanup removes stable recovery metadata',!mpStableHero.stable&&mpStableHero.stableRecoveryHours===undefined&&mpStableHero.stableElapsedHours===undefined);

  const mpCriticalDownedHero=actor({id:'mp-critical-downed',name:'MP Critical Downed',hp:0,maxHp:20,mpDowned:true,mpDead:false,stable:false,deathFailure:0,deathSuccess:0,unconscious:true,conditions:[{name:'unconscious',duration:999}]});
  const mpCriticalDownedPlayer={id:'mp-critical-downed',name:'MP Critical Downed',connected:true,character:mpCriticalDownedHero};
  T18.state={character:mpCriticalDownedHero,campaign:{multiplayer:{active:true,players:[mpCriticalDownedPlayer]}},combat:{mp:{heroPositions:{'mp-critical-downed':{x:1,y:1}},turnOrder:[],index:0},enemies:[]},log:[]};
  const explicitCriticalSource={id:'critical-source',lastAttackCritical:true};
  D.multiplayerDamageHero(mpCriticalDownedPlayer,2,'physical',explicitCriticalSource);
  assert('Explicit critical-source metadata causes two multiplayer death-save failures at 0 HP',mpCriticalDownedHero.deathFailure===2&&!mpCriticalDownedHero.mpDead);
  const mpAttackDownedHero=actor({id:'mp-attack-downed',name:'MP Attack Downed',hp:0,maxHp:20,mpDowned:true,mpDead:false,stable:false,deathFailure:0,deathSuccess:0,unconscious:true,conditions:[{name:'unconscious',duration:999}]});
  const mpAttackDownedPlayer={id:'mp-attack-downed',name:'MP Attack Downed',connected:true,character:mpAttackDownedHero};
  const mpDownedAttacker={id:'mp-down-attacker',name:'MP Downed Attacker',attack:100,damage:'1d6',pos:{x:2,y:1},lastAttackCritical:false};
  const mpDownedTerrain=[];for(let x=0;x<8;x++)for(let y=0;y<6;y++)mpDownedTerrain.push({x,y,kind:'floor'});
  T18.state={character:mpAttackDownedHero,campaign:{multiplayer:{active:true,players:[mpAttackDownedPlayer]}},combat:{round:1,mp:{heroPositions:{'mp-attack-downed':{x:1,y:1}},turnOrder:[],index:0},enemies:[mpDownedAttacker],map:{width:8,height:6,terrain:mpDownedTerrain}},log:[]};
  const priorMpDownedAttackRandom=math.random;math.random=()=>0.5;
  try{D.multiplayerEnemyTurn(mpDownedAttacker);}finally{math.random=priorMpDownedAttackRandom;}
  assert('Multiplayer monster critical hits against an Unconscious hero cause two death-save failures',mpAttackDownedHero.deathFailure===2&&!mpDownedAttacker.lastAttackCritical&&mpDownedAttacker._sr29AttackCriticalPending===undefined&&mpDownedAttacker._sr29LastAttackAdvantage===true&&mpDownedAttacker._sr29LastAttackCritical===true,JSON.stringify({failures:mpAttackDownedHero.deathFailure,criticalMarker:mpDownedAttacker.lastAttackCritical,pending:mpDownedAttacker._sr29AttackCriticalPending,log:T18.state.log.slice(0,5)}));


  const mpStandingCriticalHero=actor({id:'mp-standing-critical-hero',name:'MP Standing Critical Hero',hp:30,maxHp:30,tempHP:100,mpDowned:false,mpDead:false,stable:false,conditions:[]});
  const mpStandingCriticalPlayer={id:'mp-standing-critical-hero',name:'MP Standing Critical Hero',connected:true,character:mpStandingCriticalHero};
  const mpStandingCriticalEnemy={id:'mp-standing-critical-enemy',name:'MP Critical Monster',attack:100,damage:'1d6+3',pos:{x:2,y:1}};
  T18.state={character:mpStandingCriticalHero,campaign:{multiplayer:{active:true,players:[mpStandingCriticalPlayer]},companions:[]},combat:{mp:{heroPositions:{'mp-standing-critical-hero':{x:1,y:1}},turnOrder:[],index:0},enemies:[mpStandingCriticalEnemy],map:{width:8,height:6,terrain:[]},round:1},log:[]};
  const priorMpStandingCriticalRandom=math.random;math.random=()=>0.999;
  try{D.multiplayerEnemyTurn(mpStandingCriticalEnemy);}finally{math.random=priorMpStandingCriticalRandom;}
  assert('Multiplayer monster natural-20 critical damage doubles dice but not the flat modifier',mpStandingCriticalHero.hp===30&&mpStandingCriticalHero.tempHP===85&&mpStandingCriticalEnemy._sr29LastAttackCritical===true&&!mpStandingCriticalEnemy.lastAttackCritical,JSON.stringify({hp:mpStandingCriticalHero.hp,tempHP:mpStandingCriticalHero.tempHP,critical:mpStandingCriticalEnemy._sr29LastAttackCritical}));


  const mpOpportunityHero=actor({id:'mp-opportunity-hero',name:'MP Opportunity Hero',hp:30,maxHp:30,tempHP:100,movement:30,movementSpent:0,mpDowned:false,mpDead:false,conditions:[]});
  const mpOpportunityPlayer={id:'mp-opportunity-hero',name:'MP Opportunity Hero',connected:true,character:mpOpportunityHero};
  const mpOpportunityEnemy={id:'mp-opportunity-enemy',name:'MP Opportunity Monster',attack:100,damage:'1d6+3',hp:20,maxHp:20,reactionAvailable:true,pos:{x:1,y:1}};
  T18.state={character:mpOpportunityHero,campaign:{multiplayer:{active:true,players:[mpOpportunityPlayer]},companions:[]},combat:{mp:{heroPositions:{'mp-opportunity-hero':{x:2,y:1}},turnOrder:[],index:0},heroPos:{x:2,y:1},enemies:[mpOpportunityEnemy],map:{width:8,height:6,terrain:[]},round:1},log:[]};
  const priorOpportunityRandom=math.random;math.random=()=>0.999;
  let mpOpportunityMoved=false;try{mpOpportunityMoved=T.gameplay.moveHero(mpOpportunityPlayer,3,1);}finally{math.random=priorOpportunityRandom;}
  assert('Multiplayer monster opportunity attack on a departing hero doubles damage dice only',mpOpportunityMoved&&mpOpportunityHero.hp===30&&mpOpportunityHero.tempHP===85&&T18.state.combat.mp.heroPositions['mp-opportunity-hero'].x===3&&mpOpportunityEnemy.reactionAvailable===false&&mpOpportunityEnemy._sr29LastAttackCritical===true&&!mpOpportunityEnemy.lastAttackCritical&&!mpOpportunityEnemy._sr29AttackCriticalPending,JSON.stringify({moved:mpOpportunityMoved,hp:mpOpportunityHero.hp,tempHP:mpOpportunityHero.tempHP,pos:T18.state.combat.mp.heroPositions['mp-opportunity-hero'],enemy:mpOpportunityEnemy}));

  const mpDownedCriticalHero=actor({id:'mp-downed-critical-hero',name:'MP Downed Critical Hero',hp:0,maxHp:20,tempHP:100,mpDowned:true,mpDead:false,stable:false,unconscious:true,deathSuccess:0,deathFailure:0,conditions:[{name:'unconscious',duration:999}]});
  const mpDownedCriticalPlayer={id:'mp-downed-critical-hero',name:'MP Downed Critical Hero',connected:true,character:mpDownedCriticalHero};
  const mpDownedCriticalEnemy={id:'mp-downed-critical-enemy',name:'MP Downed Critical Monster',attack:100,damage:'1d6+3',pos:{x:2,y:1}};
  T18.state={character:mpDownedCriticalHero,campaign:{multiplayer:{active:true,players:[mpDownedCriticalPlayer]},companions:[]},combat:{mp:{heroPositions:{'mp-downed-critical-hero':{x:1,y:1}},turnOrder:[{kind:'enemy',id:'mp-downed-critical-enemy',index:0}],index:0},enemies:[mpDownedCriticalEnemy],map:{width:8,height:6,terrain:[]},round:1},log:[]};
  const priorMpDownedCriticalRandom=math.random;math.random=()=>0.5;
  try{D.multiplayerEnemyTurn(mpDownedCriticalEnemy);}finally{math.random=priorMpDownedCriticalRandom;}
  assert('A multiplayer monster critical hit against the only downed hero causes two failed death saves and doubles only damage dice',mpDownedCriticalHero.hp===0&&mpDownedCriticalHero.tempHP===100&&mpDownedCriticalHero.deathFailure===2&&!mpDownedCriticalHero.mpDead&&!mpDownedCriticalEnemy._sr29AttackCriticalPending&&!mpDownedCriticalEnemy.lastAttackCritical&&mpDownedCriticalEnemy._sr29LastAttackAdvantage===true&&mpDownedCriticalEnemy._sr29LastAttackCritical===true,JSON.stringify({hp:mpDownedCriticalHero.hp,tempHP:mpDownedCriticalHero.tempHP,failures:mpDownedCriticalHero.deathFailure,dead:mpDownedCriticalHero.mpDead,log:T18.state.log}));
  mpDownedCriticalHero.guard=5;D.multiplayerDamageHero(mpDownedCriticalPlayer,5,'physical',null);
  assert('Multiplayer guard that fully reduces downed damage to zero prevents a death-save failure',mpDownedCriticalHero.deathFailure===2&&mpDownedCriticalHero.tempHP===100&&mpDownedCriticalHero.guard===0);
  assert('Multiplayer monster attack criticals use the canonical condition rule and dice-only critical bonus',html.includes('critical=roll.r===20||(hit&&sr29CriticalOnHit(c,{hit,distance}))')&&html.includes('sr18CriticalExtraDice(enemy.damage||\'1d4\')'));






}catch(error){assert('V29 condition suite completes without uncaught runtime errors',false,error?.stack||String(error));}
const revivalAuditTerms=['reviv','resurrect','raise dead','true resurrection','reincarnate','deathAt','mpDead','mpDowned','deathFailure','deathSuccess'];
for(const term of revivalAuditTerms){
 const hits=[];let from=0,index=-1;
 while((index=html.toLowerCase().indexOf(term.toLowerCase(),from))>=0&&hits.length<16){
  hits.push({line:html.slice(0,index).split('\\n').length,excerpt:html.slice(Math.max(0,index-220),Math.min(html.length,index+480)).replace(/\\s+/g,' ').slice(0,700)});
  from=index+term.length;
 }
 console.log('REVIVAL_AUDIT '+term+' '+JSON.stringify({count:hits.length,hits}));
}
const revivalCodePatterns=[
 "function sr14CastSpellComplete",
 "sr14CastSpellComplete=function",
 "effect.kind==='revive'",
 "sp.kind==='revive'",
 "kind==='revive'",
 "'Revivify':",
 "'Raise Dead':",
 "'Resurrection':",
 "'True Resurrection':",
 "function sr5CastSpell",
 "sr5CastSpell=function"
];
for(const pattern of revivalCodePatterns){
 const hits=[];let from=0,index=-1;
 while((index=html.indexOf(pattern,from))>=0&&hits.length<8){
  hits.push({line:html.slice(0,index).split("\n").length,excerpt:html.slice(Math.max(0,index-350),Math.min(html.length,index+2600)).replace(/\s+/g," ").slice(0,3000)});
  from=index+pattern.length;
 }
 console.log("REVIVAL_CODE "+pattern+" "+JSON.stringify({count:hits.length,hits}));
}
for(const check of checks)console.log((check.pass?'PASS ':'FAIL ')+check.name+(check.detail?' — '+check.detail:''));
const passed=checks.filter(x=>x.pass).length;
console.log('\nRESULT '+passed+'/'+checks.length+' V29 condition-engine assertions passed');
if(passed!==checks.length)process.exitCode=1;
