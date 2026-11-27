/* SOLO REALMS V29.63 — Migrate V7 regular and Pact Magic slot progression before long casts.
   V29.62 normalize spell-slot progression before long casting.
   Death saves occur at the downed hero's turn start; three successes stabilize at 0 HP. */
const SR29_DEATH_SAVES_VERSION='29.63.0';
function sr29SoloRemoveUnconscious(c){
  if(!c)return;
  c.unconscious=false;
  c.conditions=(Array.isArray(c.conditions)?c.conditions:[]).filter(x=>String(typeof x==='string'?x:x?.name||'').toLowerCase()!=='unconscious');
}
function sr29SoloClearDowned(c=state?.character){
  if(!c||Number(c.hp)<=0)return false;
  c.stable=false;delete c.stableRecoveryHours;delete c.stableElapsedHours;c.mpDowned=false;c.deathSuccess=0;c.deathFailure=0;c.deathSaves=0;
  sr29SoloRemoveUnconscious(c);
  if(state?.combat&&!state.combat.mp)state.combat.downed=false;
  return true;
}
function sr29SoloMarkDowned(){
  const c=state?.character,b=state?.combat;
  if(!c||!b||b.mp||Number(c.hp)>0||c.mpDead)return false;
  if(!b.downed){c.deathSuccess=0;c.deathFailure=0;}
  b.downed=true;c.stable=false;delete c.stableRecoveryHours;delete c.stableElapsedHours;c.unconscious=true;
  if(typeof sr11Add==='function'&&!sr29SoloHasUnconscious(c))sr11Add(c,'unconscious',999,'0 HP');
  return true;
}
function sr29SoloHasUnconscious(c){
  return !!c&&(c.unconscious===true||(c.conditions||[]).some(x=>String(typeof x==='string'?x:x?.name||'').toLowerCase()==='unconscious'));
}
function sr29SoloEndFromDeath(reason){
  const c=state?.character;
  if(!c)return false;
  c.mpDead=true;c.deathAt=Number(c.deathAt)||Date.now();sr29RecordDeathSnapshot(c);c.stable=false;delete c.stableRecoveryHours;delete c.stableElapsedHours;
  if(state.combat&&!state.combat.mp)state.combat=null;
  log(reason||'Three failed death saves. Your character has died.','badlog');
  if(typeof setScene==='function')setScene({title:'The Chronicle Falls Silent',text:`${c.name||'Your hero'} has died. The companions who survive carry the story onward. Your character may be restored by an appropriate revival effect, or you can begin another chronicle.`,choices:[{label:'Begin a new chronicle',sub:'Keep this character and start a new story',action:'new-campaign'},{label:'Create a new character',sub:'Return to character creation',action:'new-character'}]});
  if(typeof save==='function')save();
  return true;
}
function sr29SoloDeathSave(){
  const c=state?.character,b=state?.combat;
  if(!c||!b||b.mp||Number(c.hp)>0||c.mpDead)return false;
  if(c.stable)return false;
  sr29SoloMarkDowned();
  const roll=die(20);
  if(roll===20){
    c.hp=1;sr29SoloClearDowned(c);
    log('Natural 20! You regain consciousness with 1 HP.','goodlog');
  }else if(roll===1){
    c.deathFailure=(Number(c.deathFailure)||0)+2;
    log(`Natural 1: two failed death saves (${c.deathFailure}/3).`,'badlog');
  }else if(roll>=10){
    c.deathSuccess=(Number(c.deathSuccess)||0)+1;
    log(`Death save succeeds (${c.deathSuccess}/3).`,'goodlog');
  }else{
    c.deathFailure=(Number(c.deathFailure)||0)+1;
    log(`Death save fails (${c.deathFailure}/3).`,'badlog');
  }
  if(c.deathFailure>=3)return sr29SoloEndFromDeath('Three failed death saves. Your character has died.');
  if(c.deathSuccess>=3){
    c.deathSuccess=3;c.stable=true;c.stableRecoveryHours=Math.max(1,Math.min(4,die(4)));c.stableElapsedHours=0;c.unconscious=true;b.downed=true;
    log('You are stable at 0 HP and remain unconscious.','goodlog');
  }
  if(typeof save==='function')save();
  return true;
}
function sr29MultiplayerAdvanceStableTime(hours){
  const players=Array.isArray(state?.campaign?.multiplayer?.players)?state.campaign.multiplayer.players:[];
  let recovered=0,advanced=0;
  for(const player of players){
    const c=player?.character;
    if(!c?.stable||Number(c.hp)>0||c.mpDead)continue;
    const required=Math.max(1,Math.min(4,Number(c.stableRecoveryHours)||1));
    c.stableElapsedHours=Math.max(0,Number(c.stableElapsedHours)||0)+hours;advanced++;
    if(c.stableElapsedHours<required)continue;
    c.hp=1;
    if(typeof sr131ClearDowned==='function')sr131ClearDowned(c);
    else{c.mpDowned=false;c.stable=false;c.deathSuccess=0;c.deathFailure=0;delete c.stableRecoveryHours;delete c.stableElapsedHours;sr29SoloRemoveUnconscious(c);}
    log(`${player.name||c.name||'A hero'} regains 1 HP and consciousness after being stable.`,'goodlog');
    recovered++;
  }
  if(advanced&&typeof sr4QueueSync==='function')sr4QueueSync();
  return recovered>0;
}
function sr29SoloAdvanceStableTime(hours){
  const c=state?.character,elapsedHours=Math.max(0,Number(hours)||0);
  if(!c||elapsedHours<=0)return false;
  if(state?.combat?.mp||state?.campaign?.multiplayer?.active)return sr29MultiplayerAdvanceStableTime(elapsedHours);
  if(!c.stable||Number(c.hp)>0||c.mpDead)return false;
  const required=Math.max(1,Math.min(4,Number(c.stableRecoveryHours)||1));
  c.stableElapsedHours=Math.max(0,Number(c.stableElapsedHours)||0)+elapsedHours;
  if(c.stableElapsedHours<required){if(typeof save==='function')save();return false;}
  c.hp=1;sr29SoloClearDowned(c);
  log('After time spent stable, you regain 1 HP and consciousness.','goodlog');
  if(typeof save==='function')save();
  return true;
}
if(typeof sr131ClearDowned==='function'){
  const sr29PriorClearDowned=sr131ClearDowned;
  sr131ClearDowned=function(c,...args){
    const result=sr29PriorClearDowned.call(this,c,...args);
    if(c&&Number(c.hp)>0){c.unconscious=false;delete c.stableRecoveryHours;delete c.stableElapsedHours;}
    return result;
  };
}
if(typeof sr12DeathSave==='function'){
  const sr29PriorMultiplayerDeathSave=sr12DeathSave;
  sr12DeathSave=function(player,...args){
    const c=player?.character,wasStable=!!c?.stable;
    const result=sr29PriorMultiplayerDeathSave.call(this,player,...args);
    if(c&&c.stable&&!wasStable&&!c.mpDead&&Number(c.hp)<=0){
      c.stableRecoveryHours=Math.max(1,Math.min(4,die(4)));c.stableElapsedHours=0;
    }else if(c&&!c.stable){delete c.stableRecoveryHours;delete c.stableElapsedHours;}
    if(c?.mpDead){if(!Number.isFinite(Number(c.deathAt)))c.deathAt=Date.now();sr29RecordDeathSnapshot(c);}
    return result;
  };
}
if(typeof sr12DamageHero==='function'){
  const sr29PriorMultiplayerDamageHero=sr12DamageHero;
  sr12DamageHero=function(player,...args){
    const c=player?.character,wasStable=!!c?.stable;
    const source=args[2]&&typeof args[2]==='object'?args[2]:null;
    const hasCriticalMarker=!!source&&Object.prototype.hasOwnProperty.call(source,'_sr29AttackCriticalPending');
    const result=sr29PriorMultiplayerDamageHero.call(this,player,...args);
    if(c&&wasStable&&!c.stable){delete c.stableRecoveryHours;delete c.stableElapsedHours;}
    if(c?.mpDead){if(!Number.isFinite(Number(c.deathAt)))c.deathAt=Date.now();sr29RecordDeathSnapshot(c);}
    // V13.2 already owns multiplayer downed-hit failures. This adapter only
    // consumes the V29 source marker after that canonical transaction.
    if(source){if(hasCriticalMarker)delete source._sr29AttackCriticalPending;delete source.lastAttackCritical;}
    return result;
  };
}
if(typeof sr18AdvanceWorld==='function'){
  const sr29PriorAdvanceWorld=sr18AdvanceWorld;
  sr18AdvanceWorld=function(reason='action',days=0,...args){
    const world=typeof sr18EnsureWorld==='function'?sr18EnsureWorld():state?.campaign?.sr18;
    const beforeDay=Number(world?.clock?.day)||Number(state?.campaign?.day)||1;
    const beforeWatch=Number(world?.clock?.watch)||1;
    const dayCount=Math.max(0,Number(days)||0);
    const result=sr29PriorAdvanceWorld.call(this,reason,days,...args);
    const afterWorld=state?.campaign?.sr18;
    const afterDay=Number(afterWorld?.clock?.day)||beforeDay;
    const afterWatch=Number(afterWorld?.clock?.watch)||beforeWatch;
    let elapsed=dayCount>0?dayCount*24:0;
    if(dayCount===0&&/travel|rest|downtime|sleep|research|craft/i.test(String(reason))){
      const beforeTick=(beforeDay-1)*6+(beforeWatch-1),afterTick=(afterDay-1)*6+(afterWatch-1);
      elapsed=Math.max(0,(afterTick-beforeTick)*4);
    }
    if(elapsed>0)sr29SoloAdvanceStableTime(elapsed);
    return result;
  };
}
function sr29ApplyLongRestPenaltyRecovery(campaign=state?.campaign,character=state?.character){
  const targets=[character,...(campaign?.multiplayer?.players||[]).map(player=>player?.character),...(campaign?.companions||[])];
  const seen=new Set();let reduced=0;
  for(const target of targets){
    if(!target||typeof target!=='object'||seen.has(target))continue;
    seen.add(target);
    const before=sr29RevivalD20Penalty(target),after=sr29ReduceRevivalPenaltyAfterLongRest(target);
    if(after<before)reduced++;
    sr29ClearResurrectionCasterTax(target);
    if(target.ancestry==='Dragonborn'){target.dragonbornBreathUses=0;target.dragonbornFlightUsed=false;target.dragonbornFlightRounds=0;}
  }
  return reduced;
}
if(typeof longRest==='function'){
  const sr29PriorSoloLongRest=longRest;
  longRest=function(...args){
    const c=state?.character,beforeDay=Number(state?.campaign?.day)||0;
    const beforeWorldDay=Number(state?.campaign?.sr18?.clock?.day)||0;
    const result=sr29PriorSoloLongRest.apply(this,args);
    const afterDay=Number(state?.campaign?.day)||0,afterWorldDay=Number(state?.campaign?.sr18?.clock?.day)||0;
    const completed=afterDay>beforeDay||afterWorldDay>beforeWorldDay;
    if(c&&!state?.combat?.mp&&!c.mpDead&&Number(c.hp)>0)sr29SoloClearDowned(c);
    if(completed){
      sr29ApplyLongRestPenaltyRecovery(state?.campaign,c);
      if(typeof save==='function')save();
    }
    return result;
  };
}
function sr29SoloDamageAtZero(amount,source=null,meta={}){
  const c=state?.character,b=state?.combat,incoming=Math.max(0,Number(amount)||0);
  if(!c||!b||b.mp||Number(c.hp)>0||!b.downed||incoming<=0||c.mpDead)return {applied:false,failures:0,dead:false};
  delete c.stableRecoveryHours;delete c.stableElapsedHours;
  if(incoming>=Math.max(1,Number(c.maxHp)||Infinity)){
    c.deathFailure=3;c.mpDead=true;c.deathAt=Date.now();c.stable=false;
    sr29SoloEndFromDeath('Massive damage at 0 HP causes instant death.');
    return {applied:true,failures:3,dead:true,massive:true};
  }
  const critical=meta?.critical===true||source?.lastAttackCritical===true||source?._sr29AttackCriticalPending===true;
  const failures=critical?2:1;
  c.stable=false;c.unconscious=true;c.deathFailure=(Number(c.deathFailure)||0)+failures;
  if(c.deathFailure>=3){
    c.deathFailure=3;c.mpDead=true;c.deathAt=Date.now();
    sr29SoloEndFromDeath(`Damage causes ${failures} failed death save(s); your character has died.`);
    return {applied:true,failures,dead:true};
  }
  log(`Damage at 0 HP causes ${failures} failed death save(s) (${c.deathFailure}/3).`,'badlog');
  if(typeof save==='function')save();
  return {applied:true,failures,dead:false};
}
if(typeof damagePlayer==='function'){
  const sr29SoloPriorDamagePlayer=damagePlayer;
  damagePlayer=function(amount,...args){
    const c=state?.character,b=state?.combat,hpBefore=Number(c?.hp)||0;
    const downedBefore=!!(c&&b&&!b.mp&&hpBefore<=0&&(b.downed||c.stable||sr29SoloHasUnconscious(c)));
    const pendingCriticalEnemy=(b?.enemies||[]).find(enemy=>enemy&&Object.prototype.hasOwnProperty.call(enemy,'_sr29AttackCriticalPending'));
    const result=sr29SoloPriorDamagePlayer.call(this,amount,...args);
    if(c&&b&&!b.mp){
      if(downedBefore){
        if(!b.downed)sr29SoloMarkDowned();
        const source=args[1]&&typeof args[1]==='object'?args[1]:pendingCriticalEnemy;
        const meta=args[2]&&typeof args[2]==='object'?args[2]:{};
        const deathResult=sr29SoloDamageAtZero(amount,source,meta);
        if(deathResult.dead&&typeof render==='function')render();
      }else if(hpBefore>0&&Number(c.hp)<=0){
        sr29SoloMarkDowned();
      }
    }
    if(pendingCriticalEnemy)delete pendingCriticalEnemy._sr29AttackCriticalPending;
    return result;
  };
}
if(typeof heal==='function'){
  const sr29SoloPriorHeal=heal;
  heal=function(amount,...args){
    const c=state?.character,b=state?.combat,before=Number(c?.hp)||0;
    if(c?.mpDead)return 0;
    const result=sr29SoloPriorHeal.call(this,amount,...args);
    if(c&&!b?.mp&&!c.mpDead&&before<=0&&Number(c.hp)>0)sr29SoloClearDowned(c);
    return result;
  };
}
function sr29TestSoloHeroAttack(...args){
  const priorRender=render;
  render=()=>{};
  try{return sr11HeroAttack(...args);}
  finally{render=priorRender;}
}
// V29.49 — revival eligibility and post-revival lifecycle cleanup.
const SR29_REVIVAL_WINDOW_RULES={
  Revivify:{milliseconds:60*1000},
  'Raise Dead':{milliseconds:10*24*60*60*1000},
  Reincarnate:{milliseconds:10*24*60*60*1000},
  Resurrection:{calendarYears:100},
  'True Resurrection':{calendarYears:200}
};
function sr29RecordDeathSnapshot(character){
  if(!character||typeof character!=='object')return false;
  if(!Object.prototype.hasOwnProperty.call(character,'creatureTypeAtDeath')){
    const currentType=character.creatureType??character.creature_type??character.type;
    if(typeof currentType==='string'&&currentType.trim())character.creatureTypeAtDeath=currentType.trim();
    else if(typeof character.ancestry==='string'&&character.ancestry.trim())character.creatureTypeAtDeath='Humanoid';
  }
  if(character.causeOfDeath===undefined&&character.deathCause!==undefined)character.causeOfDeath=character.deathCause;
  if(character.diedOfOldAge===true)character.causeOfDeath='old-age';
  if(character.undeadAtDeath===true||character.wasUndeadWhenItDied===true||
     String(character.creatureTypeAtDeath||'').trim().toLowerCase()==='undead'){
    character.undeadAtDeath=true;
    character.creatureTypeAtDeath='Undead';
  }
  return true;
}
function sr29IsOldAgeDeath(character){
  if(!character)return false;
  const cause=String(character.causeOfDeath??character.deathCause??'').trim().toLowerCase().replace(/[ _]+/g,'-');
  return character.diedOfOldAge===true||cause==='old-age'||cause==='senescence';
}
function sr29WasUndeadAtDeath(character){
  if(!character)return false;
  const type=String(character.creatureTypeAtDeath??character.creatureType??character.creature_type??character.type??'').trim().toLowerCase();
  return character.undeadAtDeath===true||character.wasUndeadWhenItDied===true||type==='undead';
}
function sr29IsHumanoidAtDeath(character){
  if(!character)return false;
  const type=String(character.creatureTypeAtDeath??character.creatureType??character.creature_type??character.type??(typeof character.ancestry==='string'?'Humanoid':'')).trim().toLowerCase();
  return type==='humanoid';
}
function sr29MissingBodyParts(character){
  const values=[];
  for(const source of [character?.missingBodyParts,character?.bodyIntegrity?.missingParts]){
    if(Array.isArray(source))for(const item of source){
      const name=String(typeof item==='string'?item:item?.name||item?.part||'').trim().toLowerCase();
      if(name&&!values.includes(name))values.push(name);
    }
  }
  return values;
}
function sr29HasMissingVitalParts(character){
  if(character?.vitalPartsIntact===false||character?.bodyIntegrity?.vitalPartsIntact===false)return true;
  const vital=new Set(['head','brain','heart','lungs','lung','vital organs','vital organ','organs','organ']);
  const explicit=Array.isArray(character?.missingVitalParts)?character.missingVitalParts:[];
  return explicit.some(part=>vital.has(String(typeof part==='string'?part:part?.name||part?.part||'').trim().toLowerCase()))||
    sr29MissingBodyParts(character).some(part=>vital.has(part));
}
function sr29ClearRevivalDeathMetadata(character,spellName){
  if(!character)return false;
  delete character.causeOfDeath;
  delete character.deathCause;
  delete character.diedOfOldAge;
  delete character.creatureTypeAtDeath;
  delete character.undeadAtDeath;
  delete character.wasUndeadWhenItDied;
  if(['Resurrection','True Resurrection','Reincarnate'].includes(spellName)){
    if(Array.isArray(character.missingBodyParts))character.missingBodyParts=[];
    if(Array.isArray(character.missingVitalParts))character.missingVitalParts=[];
    if(character.bodyIntegrity&&typeof character.bodyIntegrity==='object'){
      character.bodyIntegrity.missingParts=[];
      character.bodyIntegrity.vitalPartsIntact=true;
    }
    if(character.vitalPartsIntact===false)character.vitalPartsIntact=true;
  }
  return true;
}
const SR29_REINCARNATE_SPECIES=Object.freeze([
  'Aasimar','Dragonborn','Dwarf','Elf','Gnome','Goliath','Halfling','Human','Orc','Tiefling'
]);
const SR29_DRACONIC_ANCESTRY_TYPES=Object.freeze({
  Black:'acid',Blue:'lightning',Brass:'fire',Bronze:'lightning',Copper:'acid',
  Gold:'fire',Green:'poison',Red:'fire',Silver:'cold',White:'cold'
});
function sr29SetDraconicAncestry(character,choice){
  if(!character||character.ancestry!=='Dragonborn')return false;
  const name=String(choice||'').trim();
  const damageType=SR29_DRACONIC_ANCESTRY_TYPES[name];
  if(!damageType)return false;
  character.draconicAncestryChoice=name;
  character.draconicDamageType=damageType;
  character.darkvisionRange=60;
  character.dragonbornBreathUsesMax=sr29DragonbornProficiencyBonus(character);
  const uses=Number(character.dragonbornBreathUses);
  character.dragonbornBreathUses=Number.isFinite(uses)?Math.max(0,Math.min(character.dragonbornBreathUsesMax,Math.floor(uses))):0;
  return true;
}
// Route a Dragonborn's selected lineage resistance through the same multiplier used by monster damage.
// Apply it temporarily so an existing resistance array is neither mutated nor permanently duplicated.
if(typeof sr14DamageMultiplier==='function'){
  const sr29PriorDraconicDamageMultiplier=sr14DamageMultiplier;
  sr14DamageMultiplier=function(target,type,...args){
    const incoming=String(type||'physical').trim().toLowerCase();
    const lineage=String(target?.draconicDamageType||'').trim().toLowerCase();
    if(target?.ancestry!=='Dragonborn'||!lineage||incoming!==lineage)
      return sr29PriorDraconicDamageMultiplier.call(this,target,type,...args);
    const hadOwn=Object.prototype.hasOwnProperty.call(target,'resistances');
    const original=target.resistances;
    const current=Array.isArray(original)?original:[];
    const alreadyCovered=current.some(value=>{const key=String(value||'').trim().toLowerCase();return key==='all'||key===lineage;});
    if(alreadyCovered)return sr29PriorDraconicDamageMultiplier.call(this,target,type,...args);
    target.resistances=[...current,lineage];
    try{return sr29PriorDraconicDamageMultiplier.call(this,target,type,...args);}
    finally{if(hadOwn)target.resistances=original;else delete target.resistances;}
  };
}
function sr29DragonbornProficiencyBonus(character){
  const level=Math.max(1,Math.min(20,Math.floor(Number(character?.level)||1)));
  return Math.min(6,2+Math.floor((level-1)/4));
}
function sr29DragonbornBreathDamageDice(character){
  const level=Math.max(1,Math.min(20,Math.floor(Number(character?.level)||1)));
  return Math.min(4,level>=17?4:level>=11?3:level>=5?2:1);
}
function sr29DragonbornBreath(mode='cone'){
  const c=state?.character,b=state?.combat;
  if(!c||c.ancestry!=='Dragonborn'){toast('Only a Dragonborn can use this Breath Weapon.');return false;}
  if(!b||b.mp){toast('The Dragonborn Breath Weapon currently requires a solo tactical encounter.');return false;}
  if(!c.draconicDamageType||!c.draconicAncestryChoice){toast('Choose a Draconic Ancestry before using your Breath Weapon.');return false;}
  if(!['cone','line'].includes(mode)){toast('Choose either the cone or line Breath Weapon shape.');return false;}
  const maximum=Math.max(2,Number(c.dragonbornBreathUsesMax)||sr29DragonbornProficiencyBonus(c));
  const used=Math.max(0,Number(c.dragonbornBreathUses)||0);
  if(used>=maximum){toast('You have used all of your Breath Weapon uses. Finish a Long Rest to regain them.');return false;}
  if(c.actionSpent===true||(typeof sr29ActionEconomyGate==='function'&&!sr29ActionEconomyGate(c,'action',true))){toast('Your Action is already spent or unavailable.');return false;}
  const enemy=typeof targetEnemy==='function'?targetEnemy():(b.enemies||[]).find(x=>Number(x?.hp)>0);
  if(!enemy){toast('Choose an enemy to aim your Breath Weapon.');return false;}
  const size=mode==='cone'?15:30,origin=b.heroPos||{x:1,y:1};
  const player={id:'solo',name:c.name||'Hero',character:c};
  const spell={area:size,areaShape:mode,range:'Self',description:mode==='cone'?'15-foot cone':'30-foot line 5 feet wide'};
  const effect={kind:'saveDamage',area:true,shape:mode,size,save:'DEX',type:c.draconicDamageType};
  let targets=[];
  try{
    if(typeof sr14TargetListComplete==='function')targets=sr14TargetListComplete(player,spell,effect,enemy,origin)||[];
  }catch(error){log('Breath Weapon targeting could not be resolved: '+String(error?.message||error),'badlog');return false;}
  targets=targets.filter(x=>x&&Number(x.hp)>0);
  if(!targets.length){toast('No enemies are inside the selected Breath Weapon area.');return false;}
  const damageDice=sr29DragonbornBreathDamageDice(c),dc=8+sr29DragonbornProficiencyBonus(c)+Math.max(0,typeof sr14AbilityMod==='function'?sr14AbilityMod(c.stats?.CON):0);
  c.dragonbornBreathUses=used+1;c.actionSpent=true;
  let total=0;
  for(const target of targets){
    const save=typeof sr14SavingThrow==='function'?sr14SavingThrow(target,'DEX',dc):{success:false,total:0,roll:die(20)};
    const rolled=rollDice(String(damageDice)+'d10');
    const applied=typeof sr12ApplyDamage==='function'?sr12ApplyDamage(target,save.success?Math.floor(rolled/2):rolled,c.draconicDamageType):Math.max(0,Number(target.hp||0)-(save.success?Math.floor(rolled/2):rolled));
    if(typeof sr12ApplyDamage!=='function')target.hp=Math.max(0,applied);
    total+=applied;
    log(target.name+' makes a DC '+dc+' Dexterity save ('+save.total+'): '+(save.success?'success':'failure')+'; Breath Weapon deals '+applied+' '+c.draconicDamageType+' damage.','goodlog');
  }
  log(c.name+' exhales a '+(mode==='cone'?'15-foot cone':'30-foot line')+' of '+c.draconicDamageType+' energy ('+damageDice+'d10 total before saves).','goodlog');
  if(!globalThis.__SR29_TEST){
    if(typeof afterPlayerAction==='function')afterPlayerAction();
    if(typeof render==='function')render();
    if(typeof save==='function')save();
  }
  return {ok:true,mode,targets:targets.map(x=>x.id||x.name),damageType:c.draconicDamageType,damageDice:String(damageDice)+'d10',dc,total,uses:c.dragonbornBreathUses,usesMax:maximum};
}
function sr29ReincarnateSpeciesFromRoll(roll){
  const value=Number(roll);
  return Number.isInteger(value)&&value>=1&&value<=10?SR29_REINCARNATE_SPECIES[value-1]:null;
}
function sr29ClearOldAncestryState(character){
  if(!character)return;
  for(const key of ['dragonBreathUsed','dragonbornBreathUses','dragonbornBreathUsesMax','dragonbornFlightUsed','draconicAncestryChoice','draconicDamageType','darkvisionRange',
    'radiantTouchUsed','radiantBurst','escapeUsed','relentlessUsed','relentlessEnduranceUsed']){
    delete character[key];
  }
  const flags=state?.campaign?.flags;
  if(flags&&typeof flags==='object'){
    for(const key of ['elfSense','lucky','halfElfCharm','gnomeSense'])delete flags[key];
    if(flags.sceneTraitUses&&typeof flags.sceneTraitUses==='object'){
      for(const key of ['elf','gnome','halfelf'])delete flags.sceneTraitUses[key];
    }
  }
}
function sr29ApplyReincarnateSpecies(character,roll=die(10),speciesChoice=null,draconicChoice=null){
  if(!character||typeof character!=='object'||!character.stats||typeof character.stats!=='object')
    return {ok:false,reason:'The target has no character ability record.'};
  const resultRoll=Number(roll),rolledSpecies=sr29ReincarnateSpeciesFromRoll(resultRoll);
  if(!rolledSpecies)return {ok:false,reason:'Reincarnate requires a valid 1d10 species result.'};
  const oldSpecies=String(character.ancestry||'');
  const requested=typeof speciesChoice==='string'?speciesChoice.trim():'';
  const newSpecies=requested&&Object.prototype.hasOwnProperty.call(ANCESTRIES,requested)?requested:rolledSpecies;
  const oldData=ANCESTRIES[oldSpecies]||{bonus:{}},newData=ANCESTRIES[newSpecies];
  if(!newData)return {ok:false,reason:'The selected reincarnated species is not supported by this character builder.'};
  const abilities=Array.isArray(ABILITIES)?ABILITIES:Object.keys(character.stats);
  for(const ability of abilities){
    const current=Number(character.stats[ability]);
    if(!Number.isFinite(current))continue;
    const oldBonus=Number(oldData.bonus?.[ability])||0,newBonus=Number(newData.bonus?.[ability])||0;
    character.stats[ability]=Math.max(1,Math.min(30,current-oldBonus+newBonus));
  }
  const level=Math.max(1,Math.min(20,Math.floor(Number(character.level)||1)));
  const dwarfDelta=(newSpecies==='Dwarf'?2*level:0)-(oldSpecies==='Dwarf'?2*level:0);
  if(Number.isFinite(Number(character.maxHp)))character.maxHp=Math.max(1,Number(character.maxHp)+dwarfDelta);
  character.ancestry=newSpecies;
  sr29ClearOldAncestryState(character);
  const spells=Array.isArray(character.spells)?character.spells:(character.spells=[]);
  const ancestryGranted=new Set(Array.isArray(character.ancestryGrantedSpells)?character.ancestryGrantedSpells:[]);
  if(oldSpecies==='Tiefling'&&newSpecies!=='Tiefling'&&spells.includes('Ember Bolt')){
    const nativeClasses=Array.isArray(SPELLS?.['Ember Bolt']?.classes)?SPELLS['Ember Bolt'].classes:[];
    if(ancestryGranted.has('Ember Bolt')||!nativeClasses.includes(character.classId)){
      character.spells=spells.filter(name=>name!=='Ember Bolt');
      if(Array.isArray(character.preparedSpells))character.preparedSpells=character.preparedSpells.filter(name=>name!=='Ember Bolt');
      ancestryGranted.delete('Ember Bolt');
    }
  }
  if(newSpecies==='Tiefling'&&!spells.includes('Ember Bolt')){
    spells.push('Ember Bolt');ancestryGranted.add('Ember Bolt');
  }
  if(ancestryGranted.size)character.ancestryGrantedSpells=[...ancestryGranted];
  else delete character.ancestryGrantedSpells;
  if(newSpecies==='Aasimar')character.radiantTouchUsed=false;
  if(newSpecies==='Dragonkin')character.dragonBreathUsed=false;
  if(newSpecies==='Dragonborn'){
    character.dragonbornBreathUses=0;
    character.dragonbornBreathUsesMax=sr29DragonbornProficiencyBonus(character);
    character.dragonbornFlightUsed=false;
    character.dragonbornFlightAvailable=level>=5;
    character.darkvisionRange=60;
    if(typeof draconicChoice==='string'&&draconicChoice.trim())sr29SetDraconicAncestry(character,draconicChoice);
    else{character.draconicAncestryChoice=null;delete character.draconicDamageType;}
  }
  const campaignFlags=state?.campaign?.flags;
  if(campaignFlags&&typeof campaignFlags==='object'&&campaignFlags.sceneTraitUses===undefined)campaignFlags.sceneTraitUses={};
  return {ok:true,roll:resultRoll,rolledSpecies,species:newSpecies,oldSpecies,usedSpeciesChoice:newSpecies!==rolledSpecies,
    statChanges:abilities.reduce((out,ability)=>{const before=Number(oldData.bonus?.[ability])||0,after=Number(newData.bonus?.[ability])||0;if(before!==after)out[ability]=after-before;return out;},{})};
}
function sr29RevivalEligibility(character,spellName,now=Date.now()){
  if(!character||Number(character.hp)>0)return {ok:false,reason:'The target is not dead.'};
  if(character.mpDead!==true&&character.dead!==true)return {ok:false,reason:'The target is unconscious or stable, not dead.'};
  const rule=SR29_REVIVAL_WINDOW_RULES[spellName];
  if(!rule)return {ok:false,reason:'This spell has no configured revival window.'};
  const rawDeathAt=character.deathAt;
  const deathAt=Number(rawDeathAt);
  if(rawDeathAt===undefined||rawDeathAt===null||rawDeathAt===''||!Number.isFinite(deathAt))return {ok:false,reason:'The character has no recorded time of death.'};
  const elapsed=now-deathAt;
  if(elapsed<0)return {ok:false,reason:'The recorded time of death is in the future.'};
  if(['Revivify','Resurrection','True Resurrection'].includes(spellName)&&sr29IsOldAgeDeath(character))return {ok:false,reason:'This spell cannot restore a creature that died of old age.'};
  if(['Raise Dead','Resurrection'].includes(spellName)&&sr29WasUndeadAtDeath(character))return {ok:false,reason:'This spell cannot restore a creature that was Undead when it died.'};
  if(spellName==='Revivify'&&sr29MissingBodyParts(character).length)return {ok:false,reason:'Revivify cannot restore missing body parts.'};
  if(spellName==='Raise Dead'&&sr29HasMissingVitalParts(character))return {ok:false,reason:'Raise Dead cannot restore missing body parts or vital organs required for survival.'};
  if(spellName==='Reincarnate'&&!sr29IsHumanoidAtDeath(character))return {ok:false,reason:'Reincarnate requires a dead Humanoid or a piece of one.'};
  if(Number.isFinite(rule.milliseconds)&&elapsed>rule.milliseconds)return {ok:false,reason:'The target has been dead too long for this spell.'};
  if(Number.isFinite(rule.calendarYears)){
    const oldestAllowed=new Date(now);
    oldestAllowed.setUTCFullYear(oldestAllowed.getUTCFullYear()-rule.calendarYears);
    if(deathAt<oldestAllowed.getTime())return {ok:false,reason:'The target has been dead too long for this spell.'};
  }
  return {ok:true,elapsedMs:elapsed,...(rule.calendarYears?{calendarYears:rule.calendarYears}:{windowMs:rule.milliseconds})};
}
function sr29ClearRevivedState(character){
  if(!character||Number(character.hp)<=0)return false;
  character.mpDead=false;
  character.mpDowned=false;
  character.dead=false;
  character.stable=false;
  character.unconscious=false;
  character.deathSuccess=0;
  character.deathFailure=0;
  character.deathSaves=0;
  delete character.deathAt;
  delete character.stableRecoveryHours;
  delete character.stableElapsedHours;
  sr29SoloRemoveUnconscious(character);
  return true;
}
function sr29RevivalD20Penalty(character){
  const value=Number(character?.revivalD20Penalty);
  return Number.isFinite(value)?Math.max(0,Math.min(4,Math.floor(value))):0;
}
function sr29ApplyRevivalD20Penalty(character,result,dc=null){
  const penalty=sr29RevivalD20Penalty(character);
  if(!penalty||!result||typeof result!=='object')return result;
  if(Number.isFinite(Number(result.total)))result.total=Number(result.total)-penalty;
  if(Number.isFinite(Number(result.bonus)))result.bonus=Number(result.bonus)-penalty;
  if(Number.isFinite(Number(result.modifier)))result.modifier=Number(result.modifier)-penalty;
  if(result.d20&&typeof result.d20==='object'){
    result.d20={...result.d20};
    if(Number.isFinite(Number(result.d20.total)))result.d20.total=Number(result.d20.total)-penalty;
    if(Number.isFinite(Number(result.d20.modifier)))result.d20.modifier=Number(result.d20.modifier)-penalty;
    const nestedDC=Number(result.d20.targetNumber);
    if(Number.isFinite(nestedDC)&&Number.isFinite(Number(result.d20.total))){
      const natural=Number(result.d20.natural??result.d20.die);
      const attack=result.d20.mechanic==='attack';
      result.d20.success=result.d20.autoFail===true||result.d20.chosenToFail===true?false:
        attack&&natural===20?true:attack&&natural===1?false:Number(result.d20.total)>=nestedDC;
    }
  }
  const targetNumber=Number(result.dc??result.targetNumber??dc);
  if(Number.isFinite(targetNumber)&&Number.isFinite(Number(result.total))){
    const natural=Number(result.r??result.roll??result.natural??result.die);
    const attack=result.mechanic==='attack'||Object.prototype.hasOwnProperty.call(result,'r');
    result.success=result.autoFail===true||result.chosenToFail===true?false:
      attack&&natural===20?true:attack&&natural===1?false:Number(result.total)>=targetNumber;
  }
  result.revivalPenaltyApplied=penalty;
  return result;
}
function sr29SetRevivalReturnPenalty(character,spellName){
  if(!character||!['Raise Dead','Resurrection'].includes(spellName))return false;
  character.revivalD20Penalty=4;
  return true;
}
const SR29_RESURRECTION_CASTER_TAX_MS=365*24*60*60*1000;
function sr29HasResurrectionCasterTax(character){return character?.resurrectionCasterTax===true;}
function sr29SetResurrectionCasterTax(caster,target,now=Date.now()){
  const deathAt=Number(target?.deathAt),elapsed=Number(now)-deathAt;
  if(!caster||!target||!Number.isFinite(deathAt)||!Number.isFinite(elapsed)||elapsed<SR29_RESURRECTION_CASTER_TAX_MS)return false;
  caster.resurrectionCasterTax=true;
  caster.resurrectionCasterTaxAppliedAt=Number(now);
  return true;
}
function sr29ResurrectionTaxOptions(character,options={}){
  if(!sr29HasResurrectionCasterTax(character))return options;
  const next={...(options||{})};
  // A pre-existing Advantage and this Disadvantage cancel normally.
  if(next.mode==='advantage')next.advantage=true;
  if(next.mode==='normal')delete next.mode;
  next.disadvantage=true;
  return next;
}
function sr29ApplyResurrectionTaxD20Result(character,result,dc=null){
  if(!sr29HasResurrectionCasterTax(character)||!result||typeof result!=='object')return result;
  const advantage=result.advantage===true||result.adv===true||result.mode==='advantage';
  const disadvantage=result.disadvantage===true||result.dis===true||result.mode==='disadvantage';
  const first=Number(result.d1??result.r1??result.rolls?.[0]??result.roll??result.r);
  if(!Number.isInteger(first)||first<1||first>20)return result;
  let selected=first,second=null;
  if(advantage&&!disadvantage){
    // Disadvantage from the caster tax cancels pre-existing Advantage.
    selected=first;
    result.advantage=false;result.adv=false;result.disadvantage=false;result.dis=false;result.mode='normal';
  }else if(!disadvantage){
    second=die(20);selected=Math.min(first,second);
    result.advantage=false;result.adv=false;result.disadvantage=true;result.dis=true;result.mode='disadvantage';
  }
  if(second!==null){result.r2=second;result.d2=second;}
  result.r1=first;result.d1=first;
  result.roll=selected;result.r=selected;
  if(Array.isArray(result.rolls))result.rolls=second===null?[first]:[first,second];
  const bonus=Number(result.bonus||0)+Number(result.cover||0);
  const total=selected+bonus;
  if(Number.isFinite(Number(result.total)))result.total=total;
  const targetNumber=Number(result.dc??result.targetNumber??dc);
  if(Number.isFinite(targetNumber)&&Number.isFinite(total)){
    result.success=result.autoFail===true||result.chosenToFail===true?false:total>=targetNumber;
  }
  result.resurrectionTaxDisadvantage=true;
  return result;
}
function sr29ClearResurrectionCasterTax(character){
  if(!character||!sr29HasResurrectionCasterTax(character))return false;
  delete character.resurrectionCasterTax;
  delete character.resurrectionCasterTaxAppliedAt;
  return true;
}
function sr29ReduceRevivalPenaltyAfterLongRest(character){
  const current=sr29RevivalD20Penalty(character);
  if(!current)return 0;
  const next=Math.max(0,current-1);
  if(next)character.revivalD20Penalty=next;
  else delete character.revivalD20Penalty;
  return next;
}
if(typeof sr29CanonicalAbilityCheck==='function'){
  const sr29PriorRevivalAbilityCheck=sr29CanonicalAbilityCheck;
  sr29CanonicalAbilityCheck=function(target,skill,dc,options={},fatiguePenalty=0){
    const result=sr29PriorRevivalAbilityCheck.call(this,target,skill,dc,sr29ResurrectionTaxOptions(target,options),fatiguePenalty);
    return sr29ApplyRevivalD20Penalty(target,result,dc);
  };
  if(globalThis.__SR29_TEST)globalThis.__SR29_TEST.canonicalAbilityCheck=sr29CanonicalAbilityCheck;
}
if(typeof sr14AbilityCheck==='function'){
  const sr29PriorRevivalLegacyAbilityCheck=sr14AbilityCheck;
  sr14AbilityCheck=function(character,skill,dc,options={}){
    const result=sr29PriorRevivalLegacyAbilityCheck.call(this,character,skill,dc,options);
    sr29ApplyResurrectionTaxD20Result(character,result,dc);
    return sr29ApplyRevivalD20Penalty(character,result,dc);
  };
}
if(typeof sr14SavingThrow==='function'){
  const sr29PriorRevivalSavingThrow=sr14SavingThrow;
  sr14SavingThrow=function(character,ability,dc,options={}){
    const result=sr29PriorRevivalSavingThrow.call(this,character,ability,dc,options);
    sr29ApplyResurrectionTaxD20Result(character,result,dc);
    return sr29ApplyRevivalD20Penalty(character,result,dc);
  };
}
if(typeof sr133HeroSave==='function'){
  const sr29PriorRevivalHeroSave=sr133HeroSave;
  sr133HeroSave=function(character,ability,player,attacker,options={}){
    const result=sr29PriorRevivalHeroSave.call(this,character,ability,player,attacker,options);
    sr29ApplyResurrectionTaxD20Result(character,result,result?.dc??options?.dc);
    return sr29ApplyRevivalD20Penalty(character,result,result?.dc??options?.dc);
  };
}
if(typeof sr11RollAttack==='function'){
  const sr29PriorRevivalAttackRoll=sr11RollAttack;
  sr11RollAttack=function(base,actor,target,melee=false){
    const result=sr29PriorRevivalAttackRoll.call(this,base,actor,target,melee);
    return sr29ApplyRevivalD20Penalty(actor,result,target?.ac);
  };
  if(globalThis.__SR29_TEST)globalThis.__SR29_TEST.attackRoll=sr11RollAttack;
}
function sr29RejectCastDuringResurrectionTax(character){
  if(!sr29HasResurrectionCasterTax(character))return false;
  toast('The strain of Resurrection prevents you from casting spells again until you finish a Long Rest.');
  return true;
}
if(typeof castSpell==='function'){
  const sr29PriorLegacyCastForResurrectionTax=castSpell;
  castSpell=function(...args){
    const character=args[0]?.character||state?.character;
    if(sr29RejectCastDuringResurrectionTax(character))return false;
    return sr29PriorLegacyCastForResurrectionTax.apply(this,args);
  };
}
if(typeof sr7CastSpell==='function'){
  const sr29PriorV7CastForResurrectionTax=sr7CastSpell;
  sr7CastSpell=function(...args){
    if(sr29RejectCastDuringResurrectionTax(state?.character))return false;
    return sr29PriorV7CastForResurrectionTax.apply(this,args);
  };
}
if(typeof sr12CastSpell==='function'){
  const sr29PriorMultiplayerCastForResurrectionTax=sr12CastSpell;
  sr12CastSpell=function(player,...args){
    if(sr29RejectCastDuringResurrectionTax(player?.character||state?.character))return false;
    return sr29PriorMultiplayerCastForResurrectionTax.call(this,player,...args);
  };
}
function sr29TrueResurrectionBodyMissing(character){
  return character?.bodyExists===false||character?.originalBodyExists===false||
    character?.bodyDestroyed===true||character?.originalBodyDestroyed===true||
    character?.bodyIntegrity?.bodyExists===false;
}
function sr29TrueResurrectionClearsAilments(character){
  if(!character||typeof character!=='object')return {ok:false,cleared:[]};
  const cleared=[];
  const conditionIsRemoved=value=>{
    const parts=[typeof value==='string'?value:value?.name,value?.type,value?.kind,value?.category]
      .filter(x=>typeof x==='string').map(x=>x.toLowerCase().replace(/[\s_]+/g,'-'));
    return parts.some(x=>['poison','poisoned','curse','cursed','magical-contagion','magical-disease'].includes(x));
  };
  if(Array.isArray(character.conditions)){
    const before=character.conditions.length;
    character.conditions=character.conditions.filter(value=>!conditionIsRemoved(value));
    if(character.conditions.length!==before)cleared.push('conditions');
  }
  for(const key of ['poisons','activePoisons','poisonEffects','magicalContagions','activeMagicalContagions','magicalDiseases','curses','activeCurses','curseEffects']){
    const value=character[key];
    if(Array.isArray(value)&&value.length){character[key]=[];cleared.push(key);}
    else if(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length){character[key]={};cleared.push(key);}
  }
  for(const key of ['poisoned','isPoisoned','cursed','isCursed']){
    if(character[key]===true){character[key]=false;cleared.push(key);}
  }
  for(const key of ['poisonedBy','curseSource','activeCurse']){
    if(Object.prototype.hasOwnProperty.call(character,key)){delete character[key];cleared.push(key);}
  }
  if(Array.isArray(character.afflictions)){
    const before=character.afflictions.length;
    character.afflictions=character.afflictions.filter(value=>!conditionIsRemoved(value));
    if(character.afflictions.length!==before)cleared.push('afflictions');
  }
  return {ok:true,cleared};
}
function sr29ApplyTrueResurrectionEffects(character,options={}){
  if(!character||typeof character!=='object')return {ok:false,reason:'A character record is required.'};
  const wasUndead=sr29WasUndeadAtDeath(character)||character.undead===true||character.isUndead===true||
    [character.creatureType,character.creature_type,character.type].some(value=>String(value||'').toLowerCase()==='undead');
  const needsNewBody=sr29TrueResurrectionBodyMissing(character);
  const spokenName=String(options?.spokenName??character.name??'').trim();
  if(needsNewBody&&!spokenName)return {ok:false,reason:'The creature’s name must be spoken to create a replacement body.'};
  const ailments=sr29TrueResurrectionClearsAilments(character);
  let restoredType=null;
  if(wasUndead){
    restoredType=String(character.preUndeadCreatureType||character.originalCreatureType||character.creatureTypeBeforeUndead||
      (character.ancestry?'Humanoid':'')).trim()||null;
    let wroteCreatureType=false;
    for(const key of ['creatureType','creature_type','type']){
      if(String(character[key]||'').toLowerCase()==='undead'){
        if(restoredType){character[key]=restoredType;wroteCreatureType=true;}else delete character[key];
      }
    }
    if(restoredType&&!wroteCreatureType)character.creatureType=restoredType;
    character.undead=false;character.isUndead=false;character.restoredFromUndead=true;
  }
  let newBody=null;
  if(needsNewBody){
    character.bodyExists=true;
    character.newBodyCreated=true;
    newBody={kind:'new',createdAt:new Date().toISOString(),spokenName,
      placement:{withinFeet:10,requiresUnoccupiedSpace:true,space:options?.resurrectionSpace??null,
        status:options?.resurrectionSpace?'space-supplied-needs-world-validation':'pending-world-placement'}};
    character.resurrectionBody=newBody;
  }
  return {ok:true,wasUndead,restoredType,ailmentsCleared:ailments.cleared,newBodyCreated:needsNewBody,newBody};
}
if(typeof sr14CastSpellComplete==='function'){
  const sr29PriorCastBeforeRevivalRules=sr14CastSpellComplete;
  sr14CastSpellComplete=function(playerOrNull,name,allyId=null,...args){
    const player=playerOrNull||{id:typeof SR4!=='undefined'?(SR4.myPlayerId||'solo'):'solo',name:state?.character?.name||'Hero',character:state?.character};
    // Resolve explicit ally IDs from the campaign roster even if an earlier action
    // has already ended or transitioned the current combat's multiplayer context.
    const roster=Array.isArray(state?.campaign?.multiplayer?.players)?state.campaign.multiplayer.players:[];
    const selectedAlly=allyId?roster.find(p=>String(p?.id)===String(allyId)):null;
    const targetPlayer=selectedAlly||player;
    const target=targetPlayer?.character;
    const caster=player?.character;
    if(sr29HasResurrectionCasterTax(caster)){
      toast('The strain of Resurrection prevents you from casting spells again until you finish a Long Rest.');
      return false;
    }
    const spell=typeof SRD52_SPELLS==='object'?SRD52_SPELLS[name]:null;
    const effect=spell&&typeof sr14SpellEffectComplete==='function'?sr14SpellEffectComplete(name,spell):null;
    const wasDowned=!!target&&Number(target.hp)<=0;
    if(effect?.kind==='revive'){
      const eligibility=sr29RevivalEligibility(target,name);
      if(!eligibility.ok){toast(eligibility.reason);return false;}
      if(name==='True Resurrection'&&sr29TrueResurrectionBodyMissing(target)){
        const castOptions=args[1]&&typeof args[1]==='object'?args[1]:{};
        if(!String(castOptions.spokenName??target?.name??'').trim()){toast('Speak the creature’s name to create a replacement body.');return false;}
      }
    }else if(effect?.kind==='heal'&&(target?.mpDead===true||target?.dead===true)){
      toast('Healing cannot restore a creature that has died.');
      return false;
    }
    const deathElapsedMs=Number.isFinite(Number(target?.deathAt))?Date.now()-Number(target.deathAt):NaN;
    const result=sr29PriorCastBeforeRevivalRules.call(this,playerOrNull,name,allyId,...args);
    if(result&&target&&wasDowned&&Number(target.hp)>0){
      if(name==='Resurrection'&&deathElapsedMs>=SR29_RESURRECTION_CASTER_TAX_MS)sr29SetResurrectionCasterTax(caster,target);
      if(name==='Resurrection'||name==='True Resurrection')target.hp=Number(target.maxHp)||target.hp;
      if(name==='True Resurrection'){
        const castOptions=args[1]&&typeof args[1]==='object'?args[1]:{};
        const restoration=sr29ApplyTrueResurrectionEffects(target,{spokenName:castOptions.spokenName??target.name,resurrectionSpace:castOptions.resurrectionSpace});
        if(!restoration.ok)log('True Resurrection restored the target, but an additional restoration effect could not be completed: '+restoration.reason,'badlog');
        else log(`True Resurrection restores ${target.name||'the target'} to full health${restoration.wasUndead?' in a non-Undead form':''}${restoration.newBodyCreated?' with a newly created body':''}; poison, magical contagions, and curses are lifted.`,'goodlog');
      }
      sr29ClearRevivedState(target);
      sr29ClearRevivalDeathMetadata(target,name);
      if(name==='Reincarnate'){
        const castOptions=args[1]&&typeof args[1]==='object'?args[1]:{};
        const speciesRoll=Number.isInteger(Number(castOptions.speciesRoll))?Number(castOptions.speciesRoll):die(10);
        const speciesChoice=castOptions.speciesChoice??castOptions.reincarnateSpecies??null;
        const draconicChoice=castOptions.draconicAncestryChoice??null;
        const transformation=sr29ApplyReincarnateSpecies(target,speciesRoll,speciesChoice,draconicChoice);
        if(!transformation.ok)log('Reincarnate restored the target, but species transformation needs a supported character record.','badlog');
        else log(`Reincarnate forms a new ${transformation.species} body for ${target.name||'the target'} (d10 ${transformation.roll}).`,'goodlog');
      }
      sr29SetRevivalReturnPenalty(target,name);
    }
    return result;
  };
  if(globalThis.__SR29_TEST?.gameplay)globalThis.__SR29_TEST.gameplay.castSpell=sr14CastSpellComplete;
}
function sr29DraconicAncestryIsValid(choice){
  const name=String(choice||'').trim();
  return Object.prototype.hasOwnProperty.call(SR29_DRACONIC_ANCESTRY_TYPES,name);
}
function sr29InjectDragonbornLineageField(markup){
  const html=String(markup??'');
  if(!html||html.includes('id="draconicAncestryField"'))return html;
  const anchor='<div class="field"><label>Class / calling</label>';
  if(!html.includes(anchor))return html;
  const options=Object.keys(SR29_DRACONIC_ANCESTRY_TYPES).map(name=>`<option value="${name}">${name} — ${SR29_DRACONIC_ANCESTRY_TYPES[name]}</option>`).join('');
  const field='<div class="field" id="draconicAncestryField" style="display:none"><label>Draconic ancestry / resistance</label><select name="draconicAncestryChoice" id="draconicAncestryChoice" disabled><option value="">Choose a lineage…</option>'+options+'</select><p id="draconicAncestryInfo" class="smalltext muted">Choose the dragon lineage that shapes your Breath Weapon and resistance.</p></div>';
  return html.replace(anchor,field+anchor);
}
function sr29MaterialComponentText(sp){
  return [sp?.components,sp?.materialComponent,sp?.material,sp?.description,sp?.desc]
    .map(value=>typeof value==='string'?value:Array.isArray(value)?value.join(' '):'').filter(Boolean).join(' ');
}
function sr29MaterialComponentCost(sp){
  const text=sr29MaterialComponentText(sp);
  const match=text.match(/\bworth\s+(?:at\s+least\s+)?(\d[\d,]*)\s*\+?\s*gp\b/i);
  const declared=Number(sp?.materialCost??sp?.material_cost??0);
  return match?Number(match[1].replace(/,/g,'')):Number.isFinite(declared)&&declared>0?declared:0;
}
function sr29ConsumeMaterialComponent(character,spell,options={}){
  if(!character||typeof character!=='object')return false;
  const cost=sr29MaterialComponentCost(spell);
  if(!cost)return true;
  const inventory=Array.isArray(character.inventory)?character.inventory:[];
  const item=inventory.find(entry=>{
    const type=String(entry?.type||'').toLowerCase(),name=String(entry?.name||'');
    const qualifying=type==='gem'||type==='material'||/diamond|ruby|pearl|ivory/i.test(name);
    return qualifying&&Number(entry?.value)>=cost&&Number(entry?.count)>0;
  });
  if(!item){toast(`${spell?.name||'This spell'} requires a material component worth at least ${cost.toLocaleString('en-US')} gp.`);return false;}
  if(options?.consume===false)return true;
  const components=[spell?.components,spell?.materialComponent,spell?.material].map(x=>typeof x==='string'?x:Array.isArray(x)?x.join(' '):'').join(' ');
  const descriptions=[spell?.description,spell?.desc].filter(x=>typeof x==='string').join(' ');
  const consumed=/\bconsum(?:e|ed|es|ption)\b/i.test(components)||
    /\b(?:consum(?:e|ed|es|ption).{0,100}(?:diamond|gem|pearl|ruby|ivory|material)|(?:diamond|gem|pearl|ruby|ivory|material).{0,100}consum(?:e|ed|es|ption))\b/i.test(descriptions);
  if(consumed){
    item.count=Math.max(0,Number(item.count)-1);
    if(item.count===0)inventory.splice(inventory.indexOf(item),1);
  }
  return true;
}
// Prefer the component declaration; descriptions are fallback text, never the sole source of a consume marker.
if(typeof sr14ConsumeMaterial==='function')sr14ConsumeMaterial=sr29ConsumeMaterialComponent;

// Add a lineage selector to the existing creator without changing other ancestry forms.
if(typeof renderCreator==='function'){
  const sr29PriorRenderCreator=renderCreator;
  renderCreator=function(...args){return sr29InjectDragonbornLineageField(sr29PriorRenderCreator.apply(this,args));};
}
if(typeof creatorData==='function'){
  const sr29PriorCreatorData=creatorData;
  creatorData=function(...args){
    const data=sr29PriorCreatorData.apply(this,args);
    if(data&&data.ancestry==='Dragonborn'){
      const form=typeof $==='function'?$('creatorForm'):null;
      data.draconicAncestryChoice=String(form?.elements?.draconicAncestryChoice?.value||'').trim();
    }
    return data;
  };
}
if(typeof updateCreatorInfo==='function'){
  const sr29PriorUpdateCreatorInfo=updateCreatorInfo;
  updateCreatorInfo=function(...args){
    const result=sr29PriorUpdateCreatorInfo.apply(this,args);
    const form=typeof $==='function'?$('creatorForm'):null;
    const ancestry=form?.elements?.ancestry?.value;
    const field=typeof $==='function'?$('draconicAncestryField'):null;
    const selector=form?.elements?.draconicAncestryChoice;
    const active=ancestry==='Dragonborn';
    if(field)field.style.display=active?'':'none';
    if(selector){selector.disabled=!active;selector.required=active;}
    const valid=!active||sr29DraconicAncestryIsValid(selector?.value);
    const createButton=typeof $==='function'?$('createBtn'):null;
    if(createButton&&!valid)createButton.disabled=true;
    const info=typeof $==='function'?$('draconicAncestryInfo'):null;
    if(info){const name=String(selector?.value||'');info.textContent=sr29DraconicAncestryIsValid(name)?`${name} lineage: resistance to ${SR29_DRACONIC_ANCESTRY_TYPES[name]} damage.`:'Choose a draconic lineage to set your damage resistance.';}
    return result;
  };
}
if(typeof app!=='undefined'&&app&&typeof app.addEventListener==='function'){
  app.addEventListener('change',function(event){if(event?.target?.name==='draconicAncestryChoice')updateCreatorInfo();});
}
if(typeof createCharacter==='function'){
  const sr29PriorCreateCharacter=createCharacter;
  createCharacter=function(data,...args){
    if(data?.ancestry==='Dragonborn'&&!sr29DraconicAncestryIsValid(data.draconicAncestryChoice)){
      toast('Choose a Draconic Ancestry before creating your Dragonborn character.');
      return false;
    }
    const priorCharacter=state?.character;
    const result=sr29PriorCreateCharacter.call(this,data,...args);
    const created=state?.character&&state.character!==priorCharacter&&state.character.ancestry==='Dragonborn';
    if(created){
      sr29SetDraconicAncestry(state.character,data.draconicAncestryChoice);
      if(typeof save==='function')save();
      if(typeof render==='function')render();
    }
    return result;
  };
}

// V29.61: compare the slot count immediately before resolution, not before the activity began.
let SR29_LONG_CAST_SEQUENCE=0;
function sr29LongCastMinutes(spell){
  const value=String(spell?.castingTime||'Action').trim();
  const match=value.match(/\b(\d+)\s*(minute|minutes|min|hour|hours|hr)\b/i);
  if(!match)return 0;
  const amount=Math.max(0,Number(match[1])||0);
  return amount*(/^h/i.test(match[2])?60:1);
}
function sr29LongCastState(){
  const campaign=state?.campaign;if(!campaign||typeof campaign!=='object')return null;
  campaign.sr29=campaign.sr29&&typeof campaign.sr29==='object'?campaign.sr29:{};
  return campaign.sr29;
}
function sr29LongCastPending(){return sr29LongCastState()?.pendingLongCast||null;}
function sr29LongCastClock(){
  const campaign=state?.campaign;if(!campaign)return null;
  const world=typeof sr18EnsureWorld==='function'?sr18EnsureWorld():null;
  const sr18=world||((campaign.sr18=campaign.sr18&&typeof campaign.sr18==='object'?campaign.sr18:{}),campaign.sr18);
  sr18.clock=sr18.clock&&typeof sr18.clock==='object'?sr18.clock:{day:Number(campaign.day)||1,watch:1,actionTicks:0};
  const clock=sr18.clock;
  clock.day=Math.max(1,Math.floor(Number(clock.day)||Number(campaign.day)||1));
  clock.watch=Math.max(1,Math.min(6,Math.floor(Number(clock.watch)||1)));
  if(!Number.isFinite(Number(clock.minuteOfDay)))clock.minuteOfDay=(clock.watch-1)*240;
  clock.minuteOfDay=Math.max(0,Math.min(1439,Math.floor(Number(clock.minuteOfDay)||0)));
  clock.watch=Math.floor(clock.minuteOfDay/240)+1;
  return clock;
}
function sr29LongCastAdvanceCampaignMinutes(minutes){
  const clock=sr29LongCastClock();if(!clock)return null;
  const amount=Math.max(0,Math.floor(Number(minutes)||0));
  const total=clock.minuteOfDay+amount;
  const days=Math.floor(total/1440);
  clock.day+=days;clock.minuteOfDay=total%1440;clock.watch=Math.floor(clock.minuteOfDay/240)+1;
  state.campaign.day=Math.max(Number(state.campaign.day)||1,clock.day);
  if(typeof sr18AdvanceWorld==='function')sr18AdvanceWorld('spellcasting',0);
  return {day:clock.day,minuteOfDay:clock.minuteOfDay,watch:clock.watch,advancedMinutes:amount};
}
function sr29LongCastRosterPlayer(id){
  return (state?.campaign?.multiplayer?.players||[]).find(player=>String(player?.id)===String(id))||null;
}
function sr29LongCastCaster(pending){
  if(!pending)return null;
  if(pending.casterIsMain)return state?.character||null;
  return sr29LongCastRosterPlayer(pending.casterId)?.character||null;
}
function sr29LongCastIncapacitated(character){
  const values=[...(Array.isArray(character?.conditions)?character.conditions:[]),...(Array.isArray(character?.activeEffects)?character.activeEffects:[])];
  const names=values.map(value=>String(typeof value==='string'?value:value?.name||value?.condition||'').toLowerCase().replace(/[\s_]+/g,'-'));
  return ['incapacitated','stunned','paralyzed','unconscious','petrified'].some(name=>names.includes(name));
}
function sr29LongCastSaveAndRender(){
  try{if(typeof save==='function')save();}catch(error){console.warn('Long-cast save:',error);}
  try{if(typeof render==='function')render();}catch(error){console.warn('Long-cast render:',error);}
}
function sr29StartLongCast(playerOrNull,name,allyId=null,args=[]){
  const player=playerOrNull||{id:typeof SR4!=='undefined'?(SR4.myPlayerId||'solo'):'solo',name:state?.character?.name||'Hero',character:state?.character};
  const caster=player?.character,spell=SRD52_SPELLS?.[name],requiredMinutes=sr29LongCastMinutes(spell);
  if(!caster||!spell||requiredMinutes<1)return false;
  // Normalize the selected local or remote caster's real slot pools before reservation.
  // sr14EnsureCharacter hydrates rules, but only V7's slot reconciler advances the V3
  // progression marker; without it, save/render can re-migrate and restore a spent slot.
  if(typeof sr14EnsureCharacter==='function')sr14EnsureCharacter(caster);
  if(typeof sr7RecalcSlots==='function'&&Number(caster.spellSlotProgressionVersion)!==3)
    sr7RecalcSlots(caster,false);
  if(state?.combat){toast('A spell with a long casting time cannot be started during combat.');return false;}
  if(!sr14SpellKnown(caster,name)){toast('Learn the spell before casting it.');return false;}
  if(!sr14ClassCanCast(caster,spell)){toast('Your current class levels cannot cast this spell.');return false;}
  if(!sr14SpellPrepared(caster,name)){toast('Prepare this spell before casting it.');return false;}
  if(sr29LongCastIncapacitated(caster)){toast('You cannot begin a long cast while incapacitated.');return false;}
  if(Number(caster.hp)<=0){toast('You cannot begin a long cast while unconscious.');return false;}
  let chosenSlotLevel=0,chosenSlotKind='regular',chosenSlotCountBefore=null,legacySpellSlotsBefore=null;
  if(Number(spell.level)>0){
    const slot=typeof sr14GetCastSlot==='function'?sr14GetCastSlot(caster,Number(spell.level)):null;
    chosenSlotLevel=Number(slot&&typeof slot==='object'?slot.level:slot);
    chosenSlotKind=slot&&typeof slot==='object'&&slot.kind==='pact'?'pact':'regular';
    if(!Number.isInteger(chosenSlotLevel)||chosenSlotLevel<=0){toast(`No level ${spell.level} or higher spell slot remains.`);return false;}
    const slotMap=chosenSlotKind==='pact'?caster.pactSlotsByLevel:caster.spellSlotsByLevel;
    if(slotMap&&typeof slotMap==='object')chosenSlotCountBefore=Number(slotMap[chosenSlotLevel])||0;
    legacySpellSlotsBefore=Number.isFinite(Number(caster.spellSlots))?Number(caster.spellSlots):null;
  }
  const roster=Array.isArray(state?.campaign?.multiplayer?.players)?state.campaign.multiplayer.players:[];
  const selected=allyId?roster.find(entry=>String(entry?.id)===String(allyId)):null;
  const targetPlayer=selected||player,target=targetPlayer?.character;
  const effect=typeof sr14SpellEffectComplete==='function'?sr14SpellEffectComplete(name,spell):null;
  if(effect?.kind==='revive'){
    if(!target||Number(target.hp)>0){toast('Choose a fallen ally to revive.');return false;}
    const eligibility=sr29RevivalEligibility(target,name);
    if(!eligibility.ok){toast(eligibility.reason);return false;}
    if(name==='True Resurrection'&&sr29TrueResurrectionBodyMissing(target)){
      const castOptions=args[1]&&typeof args[1]==='object'?args[1]:{};
      if(!String(castOptions.spokenName??target?.name??'').trim()){toast('Speak the creature’s name to create a replacement body.');return false;}
    }
  }else if(effect?.kind==='heal'&&(target?.mpDead===true||target?.dead===true)){
    toast('Healing cannot restore a creature that has died.');return false;
  }
  if(!sr29ConsumeMaterialComponent(caster,spell,{consume:false}))return false;
  if(sr29LongCastPending()){toast('Finish or cancel the casting activity already in progress.');return false;}
  const castOptions=args[1]&&typeof args[1]==='object'?args[1]:{};
  const targetId=allyId?String(targetPlayer?.id||allyId):null;
  const clock=sr29LongCastClock();
  const pending={
    id:`long-cast-${Date.now()}-${++SR29_LONG_CAST_SEQUENCE}`,spellName:String(name),requiredMinutes,elapsedMinutes:0,
    casterId:String(player.id||'solo'),casterName:String(player.name||caster.name||'Caster'),casterIsMain:caster===state.character,
    targetId,fromMP:!!args[0],castMode:{...castOptions},slotLevel:chosenSlotLevel,slotKind:chosenSlotKind,
    slotCountBefore:chosenSlotCountBefore,legacySpellSlotsBefore,startedAt:new Date().toISOString(),
    startedDay:Number(clock?.day)||Number(state.campaign.day)||1,startedMinuteOfDay:Number(clock?.minuteOfDay)||0
  };
  sr29LongCastState().pendingLongCast=pending;
  state.view='spells';
  log(`${pending.casterName} begins casting ${pending.spellName}. The spell requires ${requiredMinutes} minutes of uninterrupted focus; no spell slot or material has been spent yet.`,'rolllog');
  toast(`${name}: long cast started. Continue in 10-minute blocks.`);
  sr29LongCastSaveAndRender();
  return {started:true,spellName:name,requiredMinutes,elapsedMinutes:0,remainingMinutes:requiredMinutes};
}
function sr29InterruptPendingLongCast(reason='You stop casting before the spell is complete.'){
  const store=sr29LongCastState(),pending=store?.pendingLongCast;if(!pending)return false;
  store.pendingLongCast=null;
  const text=String(reason||'The casting is interrupted.');
  log(`${pending.spellName} fails: ${text} No spell slot or material component was expended; the casting must begin again.`,'badlog');
  toast(`${pending.spellName} interrupted. No slot or material was spent.`);
  sr29LongCastSaveAndRender();
  return {interrupted:true,spellName:pending.spellName,elapsedMinutes:pending.elapsedMinutes,reason:text};
}
function sr29CommitLongCastSpellSlot(pending,caster){
  const level=Math.floor(Number(pending?.slotLevel)||0);
  if(level<=0)return {ok:true,spent:false,reason:'Cantrip/no slot required'};
  const kind=pending?.slotKind==='pact'?'pact':'regular';
  const map=kind==='pact'?caster?.pactSlotsByLevel:caster?.spellSlotsByLevel;
  if(map&&typeof map==='object'){
    const before=Number(pending.completionSlotCountBefore??pending.slotCountBefore),current=Number(map[level])||0;
    if(Number.isFinite(before)&&current<before){
      caster.spellSlotSpentThisTurn=true;
      return {ok:true,spent:true,alreadySpent:true,level,kind,beforeCount:before,afterCount:current};
    }
    if(current<=0)return {ok:false,spent:false,reason:`The selected ${kind} level ${level} slot is no longer available.`};
    if(typeof sr7ConsumeCastSlot==='function')sr7ConsumeCastSlot(caster,{level,kind});
    else{
      map[level]=Math.max(0,current-1);
      if(typeof sr7UpdateSlotTotals==='function')sr7UpdateSlotTotals(caster);
      else if(kind==='regular')caster.spellSlots=Math.max(0,(Number(caster.spellSlots)||0)-1);
    }
    caster.spellSlotSpentThisTurn=true;
    return {ok:true,spent:true,alreadySpent:false,level,kind,beforeCount:Number.isFinite(before)?before:null,afterCount:Number(map[level])||0};
  }
  const before=Number(pending.completionLegacySpellSlotsBefore??pending.legacySpellSlotsBefore),current=Number(caster?.spellSlots);
  if(Number.isFinite(before)&&Number.isFinite(current)){
    if(current<before){caster.spellSlotSpentThisTurn=true;return {ok:true,spent:true,alreadySpent:true,level,kind:'legacy',beforeCount:before,afterCount:current};}
    if(current<=0)return {ok:false,spent:false,reason:'No spell slot remains at long-cast completion.'};
    caster.spellSlots=current-1;caster.spellSlotSpentThisTurn=true;
    return {ok:true,spent:true,alreadySpent:false,level,kind:'legacy',beforeCount:before,afterCount:caster.spellSlots};
  }
  return {ok:false,spent:false,reason:'The selected spell slot could not be committed.'};
}
function sr29AdvancePendingLongCast(minutes=10){
  const pending=sr29LongCastPending();if(!pending)return {ok:false,reason:'No long cast is in progress.'};
  const caster=sr29LongCastCaster(pending);
  if(!caster||Number(caster.hp)<=0||sr29LongCastIncapacitated(caster)){
    sr29InterruptPendingLongCast('The caster can no longer maintain concentration.');
    return {ok:false,interrupted:true};
  }
  const step=Math.max(1,Math.min(60,Math.floor(Number(minutes)||10),pending.requiredMinutes-pending.elapsedMinutes));
  const world=sr29LongCastAdvanceCampaignMinutes(step);
  pending.elapsedMinutes+=step;
  const remaining=Math.max(0,pending.requiredMinutes-pending.elapsedMinutes);
  log(`${pending.spellName}: ${pending.elapsedMinutes}/${pending.requiredMinutes} minutes of focused casting complete.`,'rolllog');
  if(remaining>0){sr29LongCastSaveAndRender();return {ok:true,completed:false,elapsedMinutes:pending.elapsedMinutes,remainingMinutes:remaining,world};}
  const player={id:pending.casterId,name:pending.casterName,character:caster};
  const completionMap=pending.slotKind==='pact'?caster?.pactSlotsByLevel:caster?.spellSlotsByLevel;
  pending.completionSlotCountBefore=completionMap&&typeof completionMap==='object'?Number(completionMap[pending.slotLevel])||0:null;
  pending.completionLegacySpellSlotsBefore=Number.isFinite(Number(caster?.spellSlots))?Number(caster.spellSlots):null;
  const result=sr29CastBeforeLongCasting.call(null,player,pending.spellName,pending.targetId,pending.fromMP,pending.castMode);
  const slotPayment=result?sr29CommitLongCastSpellSlot(pending,caster):{ok:false,spent:false,reason:'Spell resolution failed.'};
  const completed=!!result&&slotPayment.ok;
  const store=sr29LongCastState();if(store)store.pendingLongCast=null;
  if(completed){
    log(`${pending.spellName} finishes casting after ${pending.requiredMinutes} minutes; one ${slotPayment.kind} level ${slotPayment.level} spell slot is expended${slotPayment.alreadySpent?' (already paid by the spell resolver)':''}.`,'goodlog');
    toast(`${pending.spellName} completed.`);
  }else{
    log(`${pending.spellName} did not complete: ${slotPayment.reason||'spell resolution failed'}.`,'badlog');
  }
  state.view='spells';sr29LongCastSaveAndRender();
  return {ok:completed,completed:true,result:completed,slotPayment,spellName:pending.spellName,elapsedMinutes:pending.elapsedMinutes,world};
}
function sr29LongCastConcentrationCheck(character,damage){
  const pending=sr29LongCastPending();if(!pending)return {active:false};
  const caster=sr29LongCastCaster(pending);if(!caster||caster!==character)return {active:false};
  const amount=Math.max(0,Number(damage)||0);if(amount<=0)return {active:true,maintained:true,damage:0};
  const dc=Math.max(10,Math.floor(amount/2));
  const save=typeof sr14SavingThrow==='function'?sr14SavingThrow(caster,'CON',dc):{success:false,total:0,dc};
  if(!save?.success){
    sr29InterruptPendingLongCast(`Damage breaks concentration (Constitution save ${save?.total??'—'} vs DC ${dc}).`);
    return {active:true,maintained:false,dc,save};
  }
  log(`${pending.spellName}: concentration maintained after damage (Constitution save ${save.total} vs DC ${dc}).`,'rolllog');
  return {active:true,maintained:true,dc,save};
}
const sr29CastBeforeLongCasting=sr14CastSpellComplete;
if(typeof sr14CastSpellComplete==='function'){
  sr14CastSpellComplete=function(playerOrNull,name,allyId=null,...args){
    const pending=sr29LongCastPending();
    if(pending){
      sr29InterruptPendingLongCast(`The caster begins a different action (${String(name)}).`);
    }
    const spell=typeof SRD52_SPELLS==='object'?SRD52_SPELLS?.[name]:null;
    const minutes=sr29LongCastMinutes(spell);
    if(minutes>=1)return sr29StartLongCast(playerOrNull,name,allyId,args);
    return sr29CastBeforeLongCasting.call(this,playerOrNull,name,allyId,...args);
  };
  if(globalThis.__SR29_TEST?.gameplay)globalThis.__SR29_TEST.gameplay.castSpell=sr14CastSpellComplete;
}
function sr29LongCastPanel(){
  const pending=sr29LongCastPending();if(!pending)return '';
  const remaining=Math.max(0,pending.requiredMinutes-pending.elapsedMinutes),next=Math.min(10,remaining);
  const percentage=Math.max(0,Math.min(100,100*pending.elapsedMinutes/pending.requiredMinutes));
  return `<section class="card" id="sr29-long-cast"><div class="eyebrow">V29 · Focused casting</div><h3>${esc(pending.spellName)} in progress</h3><p class="smalltext muted">Maintain concentration. Taking another action, entering combat, becoming incapacitated, or failing a Constitution save after damage interrupts the cast. No spell slot or material has been spent yet.</p><div class="item-row"><span>Elapsed in-game time</span><strong>${pending.elapsedMinutes} / ${pending.requiredMinutes} minutes</strong></div><div class="bar"><i style="width:${percentage}%"></i></div><div class="item-actions"><button class="btn primary" data-sr29-long-cast="advance">Continue ${next} ${next===1?'minute':'minutes'}</button><button class="btn" data-sr29-long-cast="cancel">Cancel casting</button></div></section>`;
}
if(typeof spellPage==='function'){
  const sr29PriorSpellPage=spellPage;
  spellPage=function(...args){const html=sr29PriorSpellPage.apply(this,args);return sr29LongCastPanel()+html;};
}
if(typeof app!=='undefined'&&app&&typeof app.addEventListener==='function'){
  app.addEventListener('click',function(event){
    const button=event?.target?.closest?.('button');if(!button)return;
    const longCastAction=button.dataset?.sr29LongCast;
    if(longCastAction==='advance'){event.preventDefault();event.stopImmediatePropagation?.();sr29AdvancePendingLongCast(10);return;}
    if(longCastAction==='cancel'){event.preventDefault();event.stopImmediatePropagation?.();sr29InterruptPendingLongCast('The caster abandons the spell.');return;}
    const pending=sr29LongCastPending(),action=String(button.dataset?.action||'');
    if(pending&&action&&!['save','export','close-modal'].includes(action))sr29InterruptPendingLongCast(`The caster takes another action (${action}).`);
  },true);
  app.addEventListener('submit',function(event){
    const pending=sr29LongCastPending();if(!pending)return;
    const formId=String(event?.target?.id||'');
    if(formId&&formId!=='sr29-long-cast-form')sr29InterruptPendingLongCast(`The caster takes another action (${formId}).`);
  },true);
}
if(typeof damagePlayer==='function'){
  const sr29PriorDamagePlayer=damagePlayer;
  damagePlayer=function(amount,...args){
    const character=state?.character,raw=Math.max(0,Number(amount)||0),guard=Math.max(0,Number(character?.guard)||0);
    const concentrationDamage=Math.max(0,raw-Math.min(raw,guard));
    const result=sr29PriorDamagePlayer.call(this,amount,...args);
    if(concentrationDamage>0)sr29LongCastConcentrationCheck(character,concentrationDamage);
    return result;
  };
  if(globalThis.__SR29_TEST)globalThis.__SR29_TEST.damagePlayer=damagePlayer;
}
if(typeof sr12DamageHero==='function'){
  const sr29PriorDamageHeroForLongCast=sr12DamageHero;
  sr12DamageHero=function(player,amount,damageType='physical',...args){
    const character=player?.character,raw=Math.max(0,Number(amount)||0);
    const rage=Number(character?.rageRounds)>0&&character?.rageResist&&['physical','bludgeoning','piercing','slashing'].includes(String(damageType||'physical').toLowerCase());
    const mitigated=rage?Math.ceil(raw/2):raw,guard=Math.max(0,Number(character?.guard)||0);
    const concentrationDamage=Math.max(0,mitigated-Math.min(mitigated,guard));
    const result=sr29PriorDamageHeroForLongCast.call(this,player,amount,damageType,...args);
    if(concentrationDamage>0)sr29LongCastConcentrationCheck(character,concentrationDamage);
    return result;
  };
  if(globalThis.__SR29_TEST)globalThis.__SR29_TEST.multiplayerDamageHero=sr12DamageHero;
}

globalThis.__SR29_DEATH_TEST={
  version:SR29_DEATH_SAVES_VERSION,longCastMinutes:sr29LongCastMinutes,startLongCast:sr29StartLongCast,commitLongCastSpellSlot:sr29CommitLongCastSpellSlot,advancePendingLongCast:sr29AdvancePendingLongCast,interruptPendingLongCast:sr29InterruptPendingLongCast,longCastConcentrationCheck:sr29LongCastConcentrationCheck,pendingLongCast:sr29LongCastPending,campaignClock:sr29LongCastClock,applyTrueResurrectionEffects:sr29ApplyTrueResurrectionEffects,trueResurrectionBodyMissing:sr29TrueResurrectionBodyMissing,consumeMaterialComponent:sr29ConsumeMaterialComponent,materialComponentCost:sr29MaterialComponentCost,creatorMarkup:typeof renderCreator==='function'?renderCreator:null,injectDragonbornLineageField:sr29InjectDragonbornLineageField,isValidDraconicAncestry:sr29DraconicAncestryIsValid,reincarnateSpecies:SR29_REINCARNATE_SPECIES,reincarnateSpeciesFromRoll:sr29ReincarnateSpeciesFromRoll,applyReincarnateSpecies:sr29ApplyReincarnateSpecies,recordDeathSnapshot:sr29RecordDeathSnapshot,isOldAgeDeath:sr29IsOldAgeDeath,wasUndeadAtDeath:sr29WasUndeadAtDeath,isHumanoidAtDeath:sr29IsHumanoidAtDeath,missingBodyParts:sr29MissingBodyParts,hasMissingVitalParts:sr29HasMissingVitalParts,clearRevivalDeathMetadata:sr29ClearRevivalDeathMetadata,revivalEligibility:sr29RevivalEligibility,clearRevivedState:sr29ClearRevivedState,revivalD20Penalty:sr29RevivalD20Penalty,applyRevivalD20Penalty:sr29ApplyRevivalD20Penalty,setRevivalReturnPenalty:sr29SetRevivalReturnPenalty,reduceRevivalPenaltyAfterLongRest:sr29ReduceRevivalPenaltyAfterLongRest,applyLongRestPenaltyRecovery:sr29ApplyLongRestPenaltyRecovery,hasResurrectionCasterTax:sr29HasResurrectionCasterTax,setResurrectionCasterTax:sr29SetResurrectionCasterTax,setDraconicAncestry:sr29SetDraconicAncestry,damageMultiplier:typeof sr14DamageMultiplier==='function'?sr14DamageMultiplier:null,dragonbornBreath:sr29DragonbornBreath,dragonbornBreathDamageDice:sr29DragonbornBreathDamageDice,dragonbornProficiencyBonus:sr29DragonbornProficiencyBonus,clearResurrectionCasterTax:sr29ClearResurrectionCasterTax,applyResurrectionTaxD20Result:sr29ApplyResurrectionTaxD20Result,rejectCastDuringResurrectionTax:sr29RejectCastDuringResurrectionTax,canonicalAbilityCheck:typeof sr29CanonicalAbilityCheck==='function'?sr29CanonicalAbilityCheck:null,attackRoll:typeof sr11RollAttack==='function'?sr11RollAttack:null,savingThrow:typeof sr14SavingThrow==='function'?sr14SavingThrow:null,heroSave:typeof sr133HeroSave==='function'?sr133HeroSave:null,markDowned:sr29SoloMarkDowned,deathSave:sr29SoloDeathSave,
  clearDowned:sr29SoloClearDowned,damageAtZero:sr29SoloDamageAtZero,hasUnconscious:sr29SoloHasUnconscious,
  heal:typeof heal==='function'?heal:null,damagePlayer:typeof damagePlayer==='function'?damagePlayer:null,
  soloMonsterAttack:typeof sr10EnemyAttack==='function'?sr10EnemyAttack:null,soloHeroAttack:typeof sr11HeroAttack==='function'?sr29TestSoloHeroAttack:null,advanceStableTime:sr29SoloAdvanceStableTime,
  advanceWorld:typeof sr18AdvanceWorld==='function'?sr18AdvanceWorld:null,
  multiplayerDeathSave:typeof sr12DeathSave==='function'?sr12DeathSave:null,
  clearMultiplayerDowned:typeof sr131ClearDowned==='function'?sr131ClearDowned:null,
  multiplayerDamageHero:typeof sr12DamageHero==='function'?sr12DamageHero:null,
  multiplayerEnemyTurn:typeof sr12EnemyTurn==='function'?sr12EnemyTurn:null
};
