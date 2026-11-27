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
function sr29SoloAdvanceStableTime(hours){
  const c=state?.character,elapsedHours=Math.max(0,Number(hours)||0);
  if(!c||!c.stable||Number(c.hp)>0||c.mpDead||elapsedHours<=0)return false;
  const required=Math.max(1,Math.min(4,Number(c.stableRecoveryHours)||1));
  c.stableElapsedHours=Math.max(0,Number(c.stableElapsedHours)||0)+elapsedHours;
  if(c.stableElapsedHours<required){if(typeof save==='function')save();return false;}
  c.hp=1;sr29SoloClearDowned(c);
  log('After time spent stable, you regain 1 HP and consciousness.','goodlog');
  if(typeof save==='function')save();
  return true;
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
  if(incoming>=Math.max(1,Number(c.maxHp)||Infinity)){
    c.deathFailure=3;c.mpDead=true;c.deathAt=Date.now();c.stable=false;
    sr29SoloEndFromDeath('Massive damage at 0 HP causes instant death.');
    return {applied:true,failures:3,dead:true,massive:true};
  }
  const critical=meta?.critical===true||source?.lastAttackCritical===true;
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
    const result=sr29SoloPriorDamagePlayer.call(this,amount,...args);
    if(c&&b&&!b.mp){
      if(downedBefore){
        if(!b.downed)sr29SoloMarkDowned();
        const source=args[1]&&typeof args[1]==='object'?args[1]:null;
        const meta=args[2]&&typeof args[2]==='object'?args[2]:{};
        const deathResult=sr29SoloDamageAtZero(amount,source,meta);
        if(deathResult.dead&&typeof render==='function')render();
      }else if(hpBefore>0&&Number(c.hp)<=0){
        sr29SoloMarkDowned();
      }
    }
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
globalThis.__SR29_DEATH_TEST={
  version:SR29_DEATH_SAVES_VERSION,markDowned:sr29SoloMarkDowned,deathSave:sr29SoloDeathSave,
  clearDowned:sr29SoloClearDowned,damageAtZero:sr29SoloDamageAtZero,hasUnconscious:sr29SoloHasUnconscious,
  heal:typeof heal==='function'?heal:null,damagePlayer:typeof damagePlayer==='function'?damagePlayer:null,
  soloMonsterAttack:typeof sr10EnemyAttack==='function'?sr10EnemyAttack:null,advanceStableTime:sr29SoloAdvanceStableTime,
  advanceWorld:typeof sr18AdvanceWorld==='function'?sr18AdvanceWorld:null
};
