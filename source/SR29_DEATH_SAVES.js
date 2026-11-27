/* SOLO REALMS V29.38 — shared solo death-save lifecycle.
   Death saves occur at the downed hero's turn start; three successes stabilize at 0 HP. */
const SR29_DEATH_SAVES_VERSION='29.38.0';
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
  c.mpDead=true;c.deathAt=Number(c.deathAt)||Date.now();c.stable=false;delete c.stableRecoveryHours;delete c.stableElapsedHours;
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
    if(c?.mpDead&&!Number(c.deathAt))c.deathAt=Date.now();
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
    if(c?.mpDead&&!Number(c.deathAt))c.deathAt=Date.now();
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
if(typeof longRest==='function'){
  const sr29PriorSoloLongRest=longRest;
  longRest=function(...args){
    const c=state?.character,result=sr29PriorSoloLongRest.apply(this,args);
    if(c&&!state?.combat?.mp&&!c.mpDead&&Number(c.hp)>0)sr29SoloClearDowned(c);
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
const SR29_REVIVAL_WINDOWS_MS={
  Revivify:60*1000,
  'Raise Dead':10*24*60*60*1000,
  Reincarnate:10*24*60*60*1000,
  Resurrection:100*365*24*60*60*1000,
  'True Resurrection':200*365*24*60*60*1000
};
function sr29RevivalEligibility(character,spellName,now=Date.now()){
  if(!character||Number(character.hp)>0)return {ok:false,reason:'The target is not dead.'};
  if(character.mpDead!==true&&character.dead!==true)return {ok:false,reason:'The target is unconscious or stable, not dead.'};
  const windowMs=SR29_REVIVAL_WINDOWS_MS[spellName];
  if(!Number.isFinite(windowMs))return {ok:false,reason:'This spell has no configured revival window.'};
  const deathAt=Number(character.deathAt);
  if(!Number.isFinite(deathAt)||deathAt<=0)return {ok:false,reason:'The character has no recorded time of death.'};
  const elapsed=now-deathAt;
  if(elapsed<0||elapsed>windowMs)return {ok:false,reason:'The target has been dead too long for this spell.'};
  return {ok:true,elapsedMs:elapsed,windowMs};
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
if(typeof sr14CastSpellComplete==='function'){
  const sr29PriorCastBeforeRevivalRules=sr14CastSpellComplete;
  sr14CastSpellComplete=function(playerOrNull,name,allyId=null,...args){
    const isMP=!!state?.combat?.mp;
    const player=playerOrNull||{id:typeof SR4!=='undefined'?(SR4.myPlayerId||'solo'):'solo',name:state?.character?.name||'Hero',character:state?.character};
    const targetPlayer=isMP&&allyId
      ?(state?.campaign?.multiplayer?.players||[]).find(p=>String(p?.id)===String(allyId))
      :player;
    const target=targetPlayer?.character;
    const spell=typeof SRD52_SPELLS==='object'?SRD52_SPELLS[name]:null;
    const effect=spell&&typeof sr14SpellEffectComplete==='function'?sr14SpellEffectComplete(name,spell):null;
    const wasDowned=!!target&&Number(target.hp)<=0;
    if(effect?.kind==='revive'){
      const eligibility=sr29RevivalEligibility(target,name);
      if(!eligibility.ok){toast(eligibility.reason);return false;}
    }else if(effect?.kind==='heal'&&target?.mpDead===true){
      toast('Healing cannot restore a creature that has died.');
      return false;
    }
    const result=sr29PriorCastBeforeRevivalRules.call(this,playerOrNull,name,allyId,...args);
    if(result&&target&&wasDowned&&Number(target.hp)>0){
      if(name==='Resurrection'||name==='True Resurrection')target.hp=Number(target.maxHp)||target.hp;
      sr29ClearRevivedState(target);
    }
    return result;
  };
  if(globalThis.__SR29_TEST?.gameplay)globalThis.__SR29_TEST.gameplay.castSpell=sr14CastSpellComplete;
}
globalThis.__SR29_DEATH_TEST={
  version:SR29_DEATH_SAVES_VERSION,revivalEligibility:sr29RevivalEligibility,clearRevivedState:sr29ClearRevivedState,markDowned:sr29SoloMarkDowned,deathSave:sr29SoloDeathSave,
  clearDowned:sr29SoloClearDowned,damageAtZero:sr29SoloDamageAtZero,hasUnconscious:sr29SoloHasUnconscious,
  heal:typeof heal==='function'?heal:null,damagePlayer:typeof damagePlayer==='function'?damagePlayer:null,
  soloMonsterAttack:typeof sr10EnemyAttack==='function'?sr10EnemyAttack:null,soloHeroAttack:typeof sr11HeroAttack==='function'?sr29TestSoloHeroAttack:null,advanceStableTime:sr29SoloAdvanceStableTime,
  advanceWorld:typeof sr18AdvanceWorld==='function'?sr18AdvanceWorld:null,
  multiplayerDeathSave:typeof sr12DeathSave==='function'?sr12DeathSave:null,
  clearMultiplayerDowned:typeof sr131ClearDowned==='function'?sr131ClearDowned:null,
  multiplayerDamageHero:typeof sr12DamageHero==='function'?sr12DamageHero:null,
  multiplayerEnemyTurn:typeof sr12EnemyTurn==='function'?sr12EnemyTurn:null
};
