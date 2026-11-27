/* SOLO REALMS V29.53 — Reincarnate species and trait replacement.
   Death saves occur at the downed hero's turn start; three successes stabilize at 0 HP. */
const SR29_DEATH_SAVES_VERSION='29.53.0';
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
function sr29ReincarnateSpeciesFromRoll(roll){
  const value=Number(roll);
  return Number.isInteger(value)&&value>=1&&value<=10?SR29_REINCARNATE_SPECIES[value-1]:null;
}
function sr29ClearOldAncestryState(character){
  if(!character)return;
  for(const key of ['dragonBreathUsed','dragonbornBreathUses','dragonbornFlightUsed','draconicAncestryChoice','draconicDamageType',
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
    const requestedDraconic=typeof draconicChoice==='string'?draconicChoice.trim():'';
    character.draconicAncestryChoice=Object.prototype.hasOwnProperty.call(SR29_DRACONIC_ANCESTRY_TYPES,requestedDraconic)?requestedDraconic:null;
    character.dragonbornBreathUses=0;
    character.dragonbornBreathUsesMax=2+Math.floor((level-1)/4);
    character.dragonbornFlightUsed=false;
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
    }else if(effect?.kind==='heal'&&(target?.mpDead===true||target?.dead===true)){
      toast('Healing cannot restore a creature that has died.');
      return false;
    }
    const deathElapsedMs=Number.isFinite(Number(target?.deathAt))?Date.now()-Number(target.deathAt):NaN;
    const result=sr29PriorCastBeforeRevivalRules.call(this,playerOrNull,name,allyId,...args);
    if(result&&target&&wasDowned&&Number(target.hp)>0){
      if(name==='Resurrection'&&deathElapsedMs>=SR29_RESURRECTION_CASTER_TAX_MS)sr29SetResurrectionCasterTax(caster,target);
      if(name==='Resurrection'||name==='True Resurrection')target.hp=Number(target.maxHp)||target.hp;
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
globalThis.__SR29_DEATH_TEST={
  version:SR29_DEATH_SAVES_VERSION,reincarnateSpecies:SR29_REINCARNATE_SPECIES,reincarnateSpeciesFromRoll:sr29ReincarnateSpeciesFromRoll,applyReincarnateSpecies:sr29ApplyReincarnateSpecies,recordDeathSnapshot:sr29RecordDeathSnapshot,isOldAgeDeath:sr29IsOldAgeDeath,wasUndeadAtDeath:sr29WasUndeadAtDeath,isHumanoidAtDeath:sr29IsHumanoidAtDeath,missingBodyParts:sr29MissingBodyParts,hasMissingVitalParts:sr29HasMissingVitalParts,clearRevivalDeathMetadata:sr29ClearRevivalDeathMetadata,revivalEligibility:sr29RevivalEligibility,clearRevivedState:sr29ClearRevivedState,revivalD20Penalty:sr29RevivalD20Penalty,applyRevivalD20Penalty:sr29ApplyRevivalD20Penalty,setRevivalReturnPenalty:sr29SetRevivalReturnPenalty,reduceRevivalPenaltyAfterLongRest:sr29ReduceRevivalPenaltyAfterLongRest,applyLongRestPenaltyRecovery:sr29ApplyLongRestPenaltyRecovery,hasResurrectionCasterTax:sr29HasResurrectionCasterTax,setResurrectionCasterTax:sr29SetResurrectionCasterTax,clearResurrectionCasterTax:sr29ClearResurrectionCasterTax,applyResurrectionTaxD20Result:sr29ApplyResurrectionTaxD20Result,rejectCastDuringResurrectionTax:sr29RejectCastDuringResurrectionTax,canonicalAbilityCheck:typeof sr29CanonicalAbilityCheck==='function'?sr29CanonicalAbilityCheck:null,attackRoll:typeof sr11RollAttack==='function'?sr11RollAttack:null,savingThrow:typeof sr14SavingThrow==='function'?sr14SavingThrow:null,heroSave:typeof sr133HeroSave==='function'?sr133HeroSave:null,markDowned:sr29SoloMarkDowned,deathSave:sr29SoloDeathSave,
  clearDowned:sr29SoloClearDowned,damageAtZero:sr29SoloDamageAtZero,hasUnconscious:sr29SoloHasUnconscious,
  heal:typeof heal==='function'?heal:null,damagePlayer:typeof damagePlayer==='function'?damagePlayer:null,
  soloMonsterAttack:typeof sr10EnemyAttack==='function'?sr10EnemyAttack:null,soloHeroAttack:typeof sr11HeroAttack==='function'?sr29TestSoloHeroAttack:null,advanceStableTime:sr29SoloAdvanceStableTime,
  advanceWorld:typeof sr18AdvanceWorld==='function'?sr18AdvanceWorld:null,
  multiplayerDeathSave:typeof sr12DeathSave==='function'?sr12DeathSave:null,
  clearMultiplayerDowned:typeof sr131ClearDowned==='function'?sr131ClearDowned:null,
  multiplayerDamageHero:typeof sr12DamageHero==='function'?sr12DamageHero:null,
  multiplayerEnemyTurn:typeof sr12EnemyTurn==='function'?sr12EnemyTurn:null
};
