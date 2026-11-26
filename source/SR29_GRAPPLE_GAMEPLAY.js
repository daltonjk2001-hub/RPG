/* SOLO REALMS V29.1 — live solo grapple actions and movement integration.
 * Kept separate from the canonical condition registry so the combat adapters can
 * be tested and revised without changing condition storage semantics.
 */
const SR29_GRAPPLE_GAMEPLAY_VERSION='29.1.0';

function sr29SoloGrapplerId(actor){
  return String(actor?.id||actor?.name||'');
}
function sr29SoloSize(actor){
  const raw=actor?.size??actor?.sizeCategory??actor?.statBlock?.size;
  return String(raw||'').trim().toLowerCase();
}
function sr29CanPushTarget(target){
  const size=sr29SoloSize(target).split(/[ (]/)[0],rank={tiny:0,small:1,medium:2,large:3,huge:4,gargantuan:5};
  return Object.prototype.hasOwnProperty.call(rank,size)&&rank[size]<=rank.large;
}
function sr29WeaponMasteryFor(actor,weapon){
  const mastery=(typeof SR14_WEAPON_MASTERY!=='undefined'?SR14_WEAPON_MASTERY?.[weapon]:null)||(typeof SR6_MASTERY!=='undefined'?SR6_MASTERY?.[weapon]:null)||WEAPONS?.[weapon]?.mastery||null;
  if(!mastery)return null;
  const cls=String(actor?.classId||''),level=Number(actor?.classLevels?.[cls])||Number(actor?.level)||1;
  const classFeature=['Barbarian','Fighter','Paladin','Ranger','Rogue'].includes(cls)&&level>=1;
  const explicit=actor?.weaponMasteryFeature===true||(Array.isArray(actor?.features)&&actor.features.some(x=>String(x).toLowerCase()==='weapon mastery'));
  if(!classFeature&&!explicit)return null;
  const chosen=Array.isArray(actor?.weaponMasteries)?actor.weaponMasteries:[];
  if(chosen.length&&!chosen.includes(weapon))return null;
  if(!chosen.length&&actor?.weaponMastery!==mastery)return null;
  return mastery;
}
function sr29SoloActiveGrapples(actor){
  const id=sr29SoloGrapplerId(actor);
  const targets=[...(state?.combat?.enemies||[]),state?.character].filter(Boolean);
  return targets.flatMap(target=>sr29Entries(target).filter(item=>item.name==='grappled'&&String(item.grapplerId||item.sourceId||'')===id));
}
function sr29SoloFreeHands(actor){
  const weaponName=String(actor?.weapon||''),weapon=WEAPONS?.[weaponName]||{};
  const intrinsicallyTwoHanded=['Greatsword','Greataxe','Longbow','Crossbow'].includes(weaponName);
  const unarmed=!weaponName||/^(none|unarmed|unarmed strike)$/i.test(weaponName);
  const mainHands=unarmed?0:Number(weapon.hands||weapon.handedness||((intrinsicallyTwoHanded||weapon.twoHanded||weapon.properties?.includes?.('Two-Handed')||/two-handed/i.test(String(weapon.desc||'')))?2:1));
  const offHand=actor?.offHandWeapon?1:0;
  const shieldEquipped=!!(actor?.shieldEquipped||actor?.equippedShield||actor?.shield||actor?.offHandShield||actor?.equipment?.shield||actor?.inventory?.some?.(item=>item?.type==='shield'&&item?.equipped));
  return Math.max(0,2-Math.min(2,Math.max(0,mainHands||0)+offHand+(shieldEquipped?1:0)));
}
function sr29SoloSaveBonus(target,ability){
  const key=String(ability||'').toUpperCase(),stats=target?.stats||target?.abilityScores||{};
  const score=Number(stats[key]??10),saveMap=target?.saves||target?.savingThrows||target?.statBlock?.saves||target?.statBlock?.saving_throws||{};
  const saved=Number(saveMap[key]??saveMap[key.toLowerCase()]);
  const trained=target===state.character&&CLASS_SAVES?.[target.classId]?.includes(key);
  return Number.isFinite(saved)?saved:Math.floor((score-10)/2)+(trained?profBonus():0);
}
function sr29SoloChooseTargetSaveAbility(target){
  const strAuto=sr29AutoFailSave(target,'STR'),dexAuto=sr29AutoFailSave(target,'DEX');
  if(strAuto&&!dexAuto)return 'DEX';
  if(dexAuto&&!strAuto)return 'STR';
  const str=sr29SoloSaveBonus(target,'STR'),dex=sr29SoloSaveBonus(target,'DEX');
  if(sr29Has(target,'restrained'))return str>=dex-4?'STR':'DEX';
  return dex>str?'DEX':'STR';
}
function sr29SoloTargetSave(target,ability,dc){
  const key=String(ability||'').toUpperCase();
  const stats=target?.stats||target?.abilityScores||{STR:10,DEX:10,CON:10,INT:10,WIS:10,CHA:10};
  const score=Number(stats[key]??10);
  const bonus=sr29SoloSaveBonus(target,key);
  const roll=die(20),saveTarget=target?.stats?target:{...target,stats};
  const resolved=typeof sr25ResolveCreatureSavingThrow==='function'
    ?sr25ResolveCreatureSavingThrow(saveTarget,key,[roll],bonus,dc,{useLegendaryResistance:true})
    :{success:roll+bonus>=dc,total:roll+bonus};
  return {ability:key,roll,bonus,total:Number(resolved.total??(roll+bonus)),success:resolved.success===true,autoFail:resolved.autoFail===true};
}
function sr29SoloStartPlayerGrapple(){
  const b=state?.combat,c=state?.character,e=targetEnemy();
  if(!b||b.mp||!c||!e||e.hp<=0){toast('A living solo-combat target is required.');return false;}
  if(!sr29CanAct(c,'action')){toast('Your condition prevents you from taking this action.');return false;}
  const grapplerSize=sr29SoloSize(c)||'medium',targetSize=sr29SoloSize(e)||'medium';
  const reach=5,distance=Number(e.distance??5),freeHands=sr29SoloFreeHands(c);
  const activeGrapples=sr29SoloActiveGrapples(c);
  const eligibility=sr29GrappleEligibility(c,e,{grapplerSize,targetSize,freeHands,activeGrapples,distance,reach});
  if(!eligibility.legal){toast(({ 'target-too-large':'The target is too large to grapple.','no-free-hand':'You need a free hand.','out-of-reach':'Move within 5 feet first.'})[eligibility.reason]||'You cannot grapple that target.');return false;}
  const attackRoll=sr7RollD20(sr7AttackMode(c,e)),attackBonus=mod(c.stats.STR)+profBonus(),attackTotal=attackRoll+attackBonus;
  const hit=attackRoll===20||(attackRoll!==1&&attackTotal>=Number(e.ac||10));
  log(`Unarmed Strike (grapple): d20 ${attackRoll} + ${attackBonus} = ${attackTotal} vs AC ${e.ac||10}. ${hit?'Hit.':'Miss.'}`,hit?'goodlog':'badlog');
  if(!hit){afterPlayerAction();render();save();return true;}
  // Solo combat targets are Director-controlled creatures: they choose their
  // stronger legal save rather than asking the player controlling the grappler.
  const ability=sr29SoloChooseTargetSaveAbility(e);
  const escapeDC=sr29GrappleEscapeDC(c,{proficiencyBonus:profBonus()});
  const save=sr29SoloTargetSave(e,ability,escapeDC);
  const result=sr29StartGrapple(c,e,{attackHit:true,grapplerSize,targetSize,freeHands,activeGrapples,distance,reach,proficiencyBonus:profBonus(),strengthScore:c.stats.STR,targetSave:save,source:'Unarmed Strike',handSlot:'main'});
  if(result.started)log(`${c.name} grapples ${e.name}; ${ability} save ${save.roll} + ${save.bonus} = ${save.total} vs DC ${result.escapeDC}. The target is Grappled.`,'goodlog');
  else if(result.reason==='target-saved')log(`${e.name} resists the grapple with a ${ability} save (${save.total} vs DC ${result.escapeDC}).`,'rolllog');
  else log(`Grapple attempt did not apply: ${result.reason||'unknown reason'}.`,'muted');
  afterPlayerAction();render();save();return true;
}
function sr29SoloEscapeGrapple(){
  const c=state?.character,b=state?.combat;
  if(!c||!b||b.mp)return false;
  const grapple=sr29Entries(c).find(item=>item.name==='grappled');
  if(!grapple){toast('You are not Grappled.');return false;}
  if(!sr29CanAct(c,'action')){toast('Your condition prevents you from taking this action.');return false;}
  const choice=typeof prompt==='function'?prompt('Escape using Athletics or Acrobatics?','Athletics'):'Athletics';
  const skill=String(choice||'').trim().toLowerCase();
  if(!['athletics','acrobatics'].includes(skill)){toast('Choose Athletics or Acrobatics.');return false;}
  const skillKey=skill==='athletics'?'Athletics':'Acrobatics',dc=Number(grapple.escapeDC)||12;
  const check=sr29CanonicalAbilityCheck(c,skillKey,dc,{roll:die(20),secondRoll:die(20)});
  const roll=Number(check.roll)||1,bonus=Number(check.bonus)||0;
  const result=sr29EscapeGrapple(c,{instanceId:grapple.id,ability:skillKey,roll,bonus,dc,success:check.success===true});
  if(result.escaped)log(`${c.name} escapes the grapple with ${skillKey}: ${roll} + ${bonus} = ${result.total} vs DC ${result.dc}.`,'goodlog');
  else log(`${c.name} fails to escape with ${skillKey}: ${roll} + ${bonus} = ${result.total} vs DC ${result.dc}. The grapple remains.`,'badlog');
  afterPlayerAction();render();save();return true;
}


/* V29.9 — solo theater-of-the-mind Shove uses the 2024 Unarmed Strike save procedure. */
function sr29SoloShove(mode='push'){
  const b=state?.combat,c=state?.character,e=targetEnemy();
  if(!b||b.mp||!c||!e||e.hp<=0){toast('A living solo-combat target is required.');return false;}
  if(!['push','prone'].includes(mode))return false;
  if(c.actionSpent||!sr29CanAct(c,'action')){toast('Your condition or spent Action prevents this maneuver.');return false;}
  const ranks={tiny:0,small:1,medium:2,large:3,huge:4,gargantuan:5};
  const ownRank=ranks[sr29SoloSize(c)]??2,targetRank=ranks[sr29SoloSize(e)]??2;
  if(targetRank>ownRank+1){toast('That creature is too large to shove.');return false;}
  const distance=Number.isFinite(Number(e.distance))?Math.max(0,Number(e.distance)):5;
  if(distance>5){toast('Move within 5 feet of the target first.');return false;}
  const dc=sr29GrappleEscapeDC(c,{proficiencyBonus:profBonus(),strengthScore:Number(c.stats?.STR)||10});
  const ability=sr29SoloChooseTargetSaveAbility(e),saveResult=sr29SoloTargetSave(e,ability,dc);
  log(`${c.name} attempts to shove ${e.name}; ${ability} save ${saveResult.total} vs DC ${dc}: ${saveResult.success?'success':'failure'}.`,saveResult.success?'rolllog':'goodlog');
  if(!saveResult.success){
    if(mode==='push'){
      const before=distance;
      e.distance=before+5;
      log(`${e.name} is pushed 5 feet away (${before} → ${e.distance} feet).`,'goodlog');
      sr29ReconcileAbstractGrapples();
      sr29ReconcileCombatGrapples();
    }else{
      if(typeof sr29Apply==='function')sr29Apply(e,'prone',1,c.name,{sourceId:String(c.id||c.name||'solo-player')});
      else sr11Add(e,'prone',1,c.name);
      log(`${e.name} is knocked Prone.`,'goodlog');
    }
  }else log(`${e.name} resists the shove.`,'rolllog');
  if(!globalThis.__SR29_TEST){afterPlayerAction();render();save();}return true;
}

const sr29SoloCombatPageBase=combatPage;
combatPage=function(){
  const html=sr29SoloCombatPageBase();
  if(!state?.combat||state.combat.mp||!state.character)return html;
  const c=state.character,grappled=sr29Entries(c).some(item=>item.name==='grappled'),hasTarget=!!targetEnemy();
  const canGrapple=hasTarget&&!grappled;
  const controls='<section class="card"><h3>Grapple & Shove</h3><p class="smalltext muted">Grapple: hit with an Unarmed Strike, then the target chooses a Strength or Dexterity save. Shove: the target chooses a Strength or Dexterity save against your Shove DC; on a failure, push it 5 feet or knock it Prone.</p><div class="item-actions">'+
    (canGrapple?'<button class="btn small" data-action="sr29-grapple">Unarmed Strike · Grapple</button>':'')+
    (hasTarget?'<button class="btn small" data-action="sr29-shove-push">Shove · Push 5 ft</button><button class="btn small" data-action="sr29-shove-prone">Shove · Knock Prone</button>':'')+
    (grappled?'<button class="btn small" data-action="sr29-escape-grapple">Escape Grapple · Action</button>':'')+
    '</div></section>';
  return html+controls;
};
document.addEventListener('click',function(event){
  const button=event.target?.closest?.('button[data-action="sr29-grapple"],button[data-action="sr29-escape-grapple"],button[data-action="sr29-shove-push"],button[data-action="sr29-shove-prone"]');
  if(!button)return;
  event.preventDefault();event.stopImmediatePropagation();
  try{if(button.dataset.action==='sr29-grapple')sr29SoloStartPlayerGrapple();else if(button.dataset.action==='sr29-escape-grapple')sr29SoloEscapeGrapple();else sr29SoloShove(button.dataset.action==='sr29-shove-prone'?'prone':'push');}
  catch(error){console.error('V29 grapple action failed',error);toast('Grapple action failed safely; no action was consumed.');}
},true);

// In the abstract-distance solo combat mode, a grappled enemy stays adjacent while
// the grappler moves. The additional movement is charged before the turn budget is
// considered exhausted; the Tiny/two-sizes-smaller exceptions remain service-owned.
const sr29SoloMoveBase=sr7Move;
sr7Move=function(direction){
  const c=state?.character,b=state?.combat;
  if(!b||b.mp||!c)return sr29SoloMoveBase(direction);
  if(sr29Entries(c).some(item=>item.name==='grappled')){toast('You cannot move while Grappled. Use your action to escape first.');return false;}
  const id=sr29SoloGrapplerId(c),held=(b.enemies||[]).filter(enemy=>sr29Entries(enemy).some(item=>item.name==='grappled'&&String(item.grapplerId||item.sourceId||'')===id));
  if(!held.length||!['closer','retreat'].includes(direction))return sr29SoloMoveBase(direction);
  const enemy=held[0],baseSpeed=Math.max(0,(c.baseMovement||c.movement||30)+(c.movementBonus||0)-(sr7HasCondition(c,'prone')?15:0)-5*(Number(c.exhaustion)||0));
  const allowance=baseSpeed*(c.dashUsed?2:1),before=Number(c.movementSpent)||0,remaining=Math.max(0,allowance-before);
  const costs=held.map(target=>sr29GrappleMovementCost(c,target,1,{grapplerSize:sr29SoloSize(c)||'medium',targetSize:sr29SoloSize(target)||'medium'}));
  const multiplier=Math.max(1,...costs.filter(x=>x.valid).map(x=>x.multiplier));
  const planned=Math.min(baseSpeed,remaining/multiplier);
  if(!planned)return sr29SoloMoveBase(direction);
  const cost={valid:true,movementCost:planned*multiplier,speedHalved:multiplier>1};
  const oldDistance=Number(enemy.distance)||5,temporarySpent=allowance-planned;
  c.movementSpent=temporarySpent;
  sr29SoloMoveBase(direction);
  const moved=(Number(c.movementSpent)||0)>temporarySpent;
  if(moved){
    c.movementSpent=Math.min(allowance,before+cost.movementCost);
    held.forEach(target=>{target.distance=5;});
    log(`Dragging ${held.map(target=>target.name).join(' and ')} costs ${cost.movementCost} feet of movement${cost.speedHalved?' (speed halved)':''}.`,'rolllog');
    sr29ReconcileCombatGrapples(state);
    render();save();
  }else{c.movementSpent=before;enemy.distance=oldDistance;}
};


/* V29.2 — multiplayer hero grapple and escape adapters. */
function sr29MpSize(actor){
  const rank=Number(actor?.sizeRank);
  if(Number.isInteger(rank)&&rank>=0&&rank<=5)return ['tiny','small','medium','large','huge','gargantuan'][rank];
  return sr29SoloSize(actor)||'medium';
}
function sr29MpActiveGrapples(player){
  const id=String(player?.id||player?.name||'');
  const actors=[...new Set([...(state?.combat?.enemies||[]),...(state?.campaign?.multiplayer?.players||[]).map(p=>p.character),state?.character].filter(Boolean))];
  return actors.flatMap(target=>sr29Entries(target).filter(item=>item.name==='grappled'&&String(item.grapplerId||item.sourceId||'')===id));
}
function sr29MpPlayerById(id){
  return (state?.campaign?.multiplayer?.players||[]).find(item=>String(item?.id||'')===String(id||''))||null;
}
function sr29MpPruneGrappleChallenges(snapshot=state){
  const mp=snapshot?.combat?.mp;
  if(!mp)return {removed:0,remaining:0,reasons:[]};
  const players=snapshot?.campaign?.multiplayer?.players||[];
  const round=Number(snapshot?.combat?.round)||0;
  const pending=Array.isArray(mp.grappleChallenges)?mp.grappleChallenges:[];
  const retained=[],reasons=[];
  for(const challenge of pending){
    const attacker=players.find(item=>String(item?.id||'')===String(challenge?.attackerId||''));
    const target=players.find(item=>String(item?.id||'')===String(challenge?.targetId||''));
    let reason='';
    if(!challenge?.id||!attacker||!target)reason='participant-unavailable';
    else if(attacker.connected===false||target.connected===false)reason='participant-disconnected';
    else if(Number(attacker.character?.hp)<=0||Number(target.character?.hp)<=0)reason='participant-defeated';
    else if(round>0&&Number.isFinite(Number(challenge.createdRound))&&round>Number(challenge.createdRound))reason='challenge-expired';
    if(reason)reasons.push({id:String(challenge?.id||''),reason});
    else retained.push(challenge);
  }
  mp.grappleChallenges=retained;
  if(reasons.length)log(reasons.length+' pending grapple save challenge(s) cancelled: '+reasons.map(item=>item.reason).join(', ')+'.','muted');
  return {removed:reasons.length,remaining:retained.length,reasons};
}
function sr29MpVoluntaryMovementEligibility(player){
  const grapple=sr29Entries(player?.character).find(item=>item.name==='grappled');
  return grapple?{legal:false,reason:'grappled',grappleId:String(grapple.id||'')}:{legal:true,reason:null,grappleId:null};
}
function sr29MpGrappleMovePlan(player,from,to,stepCost=5,standCost=0,snapshot=state){
  const id=String(player?.id||'');
  if(!id||!snapshot?.combat?.mp)return {legal:true,drag:false,movementCost:Number(stepCost)+Number(standCost)};
  const targets=[];
  for(const other of snapshot.campaign?.multiplayer?.players||[]){
    if(String(other?.id||'')===id||other?.connected===false||!other?.character||other.character.hp<=0)continue;
    const grapple=sr29Entries(other.character).find(item=>item.name==='grappled'&&String(item.grapplerId||item.sourceId||'')===id);
    if(grapple)targets.push({actor:other.character,player:other,grapple,pos:snapshot.combat.mp.heroPositions?.[other.id]||other.pos||other.character.pos});
  }
  for(const enemy of snapshot.combat?.enemies||[]){
    if(!enemy||enemy.hp<=0)continue;
    const grapple=sr29Entries(enemy).find(item=>item.name==='grappled'&&String(item.grapplerId||item.sourceId||'')===id);
    if(grapple)targets.push({actor:enemy,enemy,grapple,pos:enemy.pos||enemy.position});
  }
  if(!targets.length)return {legal:true,drag:false,movementCost:Number(stepCost)+Number(standCost)};
  if(targets.length!==1)return {legal:false,drag:true,reason:'multiple-targets',targets:targets.length};
  const held=targets[0],reach=Number(held.grapple.grappleRange??held.grapple.grappleReach??5);
  const distance=held.pos?sr12Distance(from,held.pos):null;
  if(!Number.isFinite(distance)||distance>reach)return {legal:false,drag:true,reason:'out-of-reach'};
  const movement=sr29GrappleMovementCost(player.character,held.actor,Number(stepCost)+Number(standCost),{
    grapplerSize:sr29MpSize(player.character),targetSize:sr29MpSize(held.actor)
  });
  if(!movement.valid)return {legal:false,drag:true,reason:movement.reason};
  return {legal:true,drag:true,target:held,multiplier:movement.multiplier,movementCost:movement.movementCost,
    speedHalved:movement.speedHalved,from:{x:Number(from.x),y:Number(from.y)},to:{x:Number(to.x),y:Number(to.y)}};
}

function sr29MpStartGrapple(player,targetId=null){
  const b=state?.combat,c=player?.character;
  const targetPlayer=targetId?sr29MpPlayerById(targetId):null;
  const e=targetPlayer?.character||(targetId?null:sr4Target());
  if(!b?.mp||!player||!c||!e||e.hp<=0||targetPlayer?.connected===false||targetPlayer?.id===player.id)return false;
  if(sr12TurnActor()?.id!==player.id){toast('It is not your initiative turn.');return false;}
  if(c.actionSpent){toast('Your Action is already spent.');return false;}
  if(!sr29CanAct(c,'action')){toast('Your condition prevents you from taking this action.');return false;}
  const from=sr12PlayerPos(player.id),to=targetPlayer?sr12PlayerPos(targetPlayer.id):e.pos,distance=sr12Distance(from,to),reach=5;
  const grappler={...c,id:player.id,name:player.name||c.name};
  const grapplerSize=sr29MpSize(c),targetSize=sr29MpSize(e);
  const freeHands=c.freeHands===false?0:Number.isFinite(Number(c.freeHands))?Math.max(0,Number(c.freeHands)):sr29SoloFreeHands(c);
  const activeGrapples=sr29MpActiveGrapples(player);
  const eligibility=sr29GrappleEligibility(grappler,e,{grapplerSize,targetSize,freeHands,activeGrapples,distance,reach});
  if(!eligibility.legal){toast(({ 'target-too-large':'The target is too large to grapple.','no-free-hand':'You need a free hand.','out-of-reach':'Move within 5 feet first.'})[eligibility.reason]||'You cannot grapple that target.');return false;}
  const bonus=mod(c.stats.STR)+profBonus();
  const attack=sr11RollAttack(bonus,c,e,true);
  const targetAC=targetPlayer?Number(e.ac)||sr4WithCharRead(targetPlayer,computeAC):Number(e.ac||10);
  const hit=attack.r===20||(attack.r!==1&&attack.total>=targetAC);
  c.actionSpent=true;
  log(player.name+' makes an Unarmed Strike to grapple '+(targetPlayer?targetPlayer.name:e.name)+': d20 '+attack.r+' + '+bonus+' = '+attack.total+' vs AC '+targetAC+'. '+(hit?'Hit.':'Miss.'),hit?'goodlog':'badlog');
  if(hit&&targetPlayer){
    const mp=b.mp,seq=(Number(mp.grappleChallengeSeq)||0)+1;mp.grappleChallengeSeq=seq;
    const escapeDC=sr29GrappleEscapeDC(grappler,{proficiencyBonus:profBonus(),strengthScore:c.stats.STR});
    mp.grappleChallenges=Array.isArray(mp.grappleChallenges)?mp.grappleChallenges:[];
    mp.grappleChallenges=mp.grappleChallenges.filter(item=>item.targetId!==targetPlayer.id);
    mp.grappleChallenges.push({id:'grapple-'+String(b.round||1)+'-'+String(player.id)+'-'+seq,attackerId:player.id,targetId:targetPlayer.id,attackerName:player.name||c.name,targetName:targetPlayer.name,escapeDC,reach,grapplerSize,targetSize,freeHands,distance,createdRound:Number(b.round)||1});
    log(targetPlayer.name+' must immediately choose a Strength or Dexterity saving throw against DC '+escapeDC+'.','rolllog');
  }else if(hit){
    const ability=sr29SoloChooseTargetSaveAbility(e),escapeDC=sr29GrappleEscapeDC(grappler,{proficiencyBonus:profBonus()}),targetSave=sr29SoloTargetSave(e,ability,escapeDC);
    const result=sr29StartGrapple(grappler,e,{attackHit:true,grapplerSize,targetSize,freeHands,activeGrapples,distance,reach,proficiencyBonus:profBonus(),strengthScore:c.stats.STR,targetSave,source:'Unarmed Strike',handSlot:'main'});
    if(result.started)log(player.name+' grapples '+e.name+'; its '+ability+' save is '+targetSave.total+' vs DC '+result.escapeDC+'.','goodlog');
    else if(result.reason==='target-saved')log(e.name+' resists the grapple with its '+ability+' save ('+targetSave.total+' vs DC '+result.escapeDC+').','rolllog');
    else log('Grapple attempt did not apply: '+(result.reason||'unknown reason')+'.','muted');
  }
  sr29ReconcileCombatGrapples(state);
  return true;
}
function sr29MpResolveGrappleSave(player,msg={}){
  const mp=state?.combat?.mp,challengeId=String(msg.challengeId||''),ability=String(msg.ability||'').toUpperCase();
  if(!mp||!player||!['STR','DEX'].includes(ability))return false;
  sr29MpPruneGrappleChallenges();
  const challenges=Array.isArray(mp.grappleChallenges)?mp.grappleChallenges:[];
  const challenge=challenges.find(item=>item.id===challengeId&&item.targetId===player.id);
  if(!challenge||player.character?.hp<=0)return false;
  const target=player.character,attacker=sr29MpPlayerById(challenge.attackerId);
  if(!attacker?.character)return false;
  const roll=die(20),bonus=sr4WithCharRead(player,()=>sr29SoloSaveBonus(target,ability));
  const resolved=sr25ResolveCreatureSavingThrow(target,ability,[roll],bonus,challenge.escapeDC,{useLegendaryResistance:true});
  const targetSave={ability,roll,bonus,total:Number(resolved.total??(roll+bonus)),success:resolved.success===true,autoFail:resolved.autoFail===true};
  const grappler={...attacker.character,id:attacker.id,name:attacker.name||attacker.character.name};
  const activeGrapples=sr29MpActiveGrapples(attacker);
  const result=sr29StartGrapple(grappler,target,{attackHit:true,grapplerSize:challenge.grapplerSize,targetSize:challenge.targetSize,freeHands:challenge.freeHands,activeGrapples,distance:challenge.distance,reach:challenge.reach,proficiencyBonus:sr4WithCharRead(attacker,profBonus),strengthScore:attacker.character.stats.STR,targetSave,source:'Unarmed Strike',handSlot:'main'});
  mp.grappleChallenges=challenges.filter(item=>item.id!==challengeId);
  if(result.started)log(player.name+' fails the '+ability+' save ('+targetSave.total+' vs DC '+challenge.escapeDC+') and is Grappled by '+attacker.name+'.','badlog');
  else if(result.reason==='target-saved')log(player.name+' succeeds on the '+ability+' save ('+targetSave.total+' vs DC '+challenge.escapeDC+') and resists '+attacker.name+'’s grapple.','goodlog');
  else log('Grapple save could not be resolved: '+(result.reason||'unknown reason')+'.','muted');
  sr29ReconcileCombatGrapples(state);
  sr4Broadcast();save();render();
  return true;
}
function sr29MpEscapeGrapple(player,ability){
  const c=player?.character,b=state?.combat;
  if(!b?.mp||!player||!c||sr12TurnActor()?.id!==player.id)return false;
  if(c.actionSpent){toast('Your Action is already spent.');return false;}
  if(!sr29CanAct(c,'action')){toast('Your condition prevents you from taking this action.');return false;}
  const grapple=sr29Entries(c).find(item=>item.name==='grappled');
  if(!grapple){toast('You are not Grappled.');return false;}
  const skill=String(ability||'Athletics').toLowerCase()==='acrobatics'?'Acrobatics':'Athletics';
  const dc=Number(grapple.escapeDC??c.grappleDC??12);
  const check=sr29CanonicalAbilityCheck(c,skill,dc,{roll:die(20),secondRoll:die(20)});
  const result=sr29EscapeGrapple(c,{instanceId:grapple.id,ability:skill,roll:Number(check.roll)||1,bonus:Number(check.bonus)||0,dc,success:check.success===true});
  c.actionSpent=true;
  if(result.escaped)log(`${player.name} escapes the grapple with ${skill}: ${result.total} vs DC ${dc}.`,'goodlog');
  else log(`${player.name} fails to escape the grapple with ${skill}: ${result.total} vs DC ${dc}. The grapple remains.`,'badlog');
  return true;
}
if(typeof sr13ProcessEnemyGroup==='function'&&typeof sr131OldEnemyTurn==='function'){
  const sr29MpPriorEnemyGroup=sr13ProcessEnemyGroup;
  sr13ProcessEnemyGroup=function(actor){
    const b=state?.combat;if(!b?.mp||!actor)return sr29MpPriorEnemyGroup(actor);
    let acted=0;const indexes=Array.isArray(actor.indexes)?actor.indexes:[Number(actor.index)];
    for(const index of indexes){
      const enemy=b.enemies?.[index];if(!enemy||enemy.hp<=0)continue;
      enemy.reactionAvailable=true;
      const grapple=sr29Entries(enemy).find(item=>item.name==='grappled');
      if(grapple){
        const athletics=Number(enemy.skills?.Athletics??enemy.skillBonuses?.Athletics??enemy.athletics??mod(enemy.stats?.STR||10));
        const acrobatics=Number(enemy.skills?.Acrobatics??enemy.skillBonuses?.Acrobatics??enemy.acrobatics??mod(enemy.stats?.DEX||10));
        const skill=athletics>=acrobatics?'Athletics':'Acrobatics',dc=Number(grapple.escapeDC??enemy.grappleDC??12);
        const skillBonus=skill==='Athletics'?athletics:acrobatics,check=sr29CanonicalAbilityCheck(enemy,skill,dc,{roll:die(20),secondRoll:die(20),bonusOverride:skillBonus});
        const result=sr29EscapeGrapple(enemy,{instanceId:grapple.id,ability:skill,roll:Number(check.roll)||1,bonus:Number(check.bonus)||0,dc,success:check.success===true});
        if(result.escaped)log(`${enemy.name} escapes the grapple with ${skill} (${result.total} vs DC ${dc}) using its action.`,'rolllog');
        else log(`${enemy.name} fails to escape the grapple with ${skill} (${result.total} vs DC ${dc}) and uses its action to try.`,'rolllog');
        continue;
      }
      if(sr13HasCondition(enemy,'incapacitated')||sr13HasCondition(enemy,'stunned')||sr13HasCondition(enemy,'paralyzed')||sr13HasCondition(enemy,'unconscious')){log(`${enemy.name} cannot act while incapacitated.`,'rolllog');continue;}
      const wasProne=sr11Has(enemy,'prone'),oldSpeed=enemy.speed;
      if(wasProne){sr131RemoveCondition(enemy,'prone');enemy.speed=Math.floor((Number(enemy.speed)||30)/2);log(`${enemy.name} stands from prone, using half its movement.`,'rolllog');}
      try{sr131OldEnemyTurn(enemy);acted++;}finally{if(wasProne)enemy.speed=oldSpeed;}
      if(!state.combat?.mp)break;
    }
    return acted;
  };
}
function sr29CreatureGrappleAppendageCapacity(actor){
  const explicit=actor?.grappleAppendageCount??actor?.appendageCount??actor?.handCount??actor?.hands??actor?.tentacleCount;
  if(Number.isFinite(Number(explicit)))return Math.max(0,Math.floor(Number(explicit)));
  if(Array.isArray(actor?.grappleAppendages))return actor.grappleAppendages.length;
  if(Array.isArray(actor?.appendages))return actor.appendages.length;
  if(actor?.appendages&&typeof actor.appendages==='object')return Object.keys(actor.appendages).length;
  const kind=String(actor?.type||actor?.kind||actor?.name||'').toLowerCase();
  return /humanoid|giant|goblin|orc|human|elf|dwarf|gnoll|bandit|guard|veteran|cultist/.test(kind)?2:1;
}
function sr29NextMonsterAppendageSlot(actor,active=[]){
  const capacity=sr29CreatureGrappleAppendageCapacity(actor),occupied=new Set();
  for(const grapple of active){
    const slot=String(grapple?.handSlot||'');
    const match=slot.match(/^monster-appendage-(\d+)$/);
    if(match){const index=Number(match[1]);if(index>=1&&index<=capacity)occupied.add(index);}
  }
  // Older/manual grapple instances may not have a slot. Reserve the first
  // remaining slot for each such instance rather than allowing it to be reused.
  for(const grapple of active){
    if(/^monster-appendage-\d+$/.test(String(grapple?.handSlot||'')))continue;
    for(let index=1;index<=capacity;index++)if(!occupied.has(index)){occupied.add(index);break;}
  }
  for(let index=1;index<=capacity;index++)if(!occupied.has(index))return 'monster-appendage-'+index;
  return null;
}
if(typeof sr18ResolveMonsterAction==='function'&&typeof sr29Apply==='function'){
  const sr29PriorMonsterAction=sr18ResolveMonsterAction;
  sr18ResolveMonsterAction=function(enemy,action,target){
    const desc=sr18Text(action?.description),save=sr14ParseMonsterSave(desc),condition=sr18ParseCondition(desc);
    if(condition!=='grappled')return sr29PriorMonsterAction.apply(this,arguments);
    const hero=target?.player,p=hero,c=hero?.character;
    if(!p||!c)return sr29PriorMonsterAction.apply(this,arguments);
    const grapplerId=String(enemy?.id||enemy?.name||'unknown-grappler');
    const active=sr29MpActiveGrapples({id:grapplerId}),capacity=sr29CreatureGrappleAppendageCapacity(enemy);
    const handSlot=sr29NextMonsterAppendageSlot(enemy,active);
    if(!handSlot){log(`${enemy.name} has no free appendage to grapple another creature.`,'muted');return false;}
    const range=sr18ParseActionRange(action),dist=enemy.pos&&target.pos?sr12Distance(enemy.pos,target.pos):0;
    if(!range.ranged&&dist>range.reach){
      if(state.combat?.mp)sr12EnemyStep(enemy,target.pos);
      else if(typeof sr10EnemyMove==='function')sr10EnemyMove(enemy);
      return false;
    }
    if(enemy.pos&&target.pos&&!sr11HasLOS(enemy.pos,target.pos))return false;
    const escapeDC=Number(desc.match(/escape\s+DC\s*(\d+)/i)?.[1]||enemy.grappleDC||save?.dc||8+mod(enemy.stats?.STR||10)+Number(enemy.proficiencyBonus||enemy.profBonus||2));
    const grappleRange=Math.max(5,Number(range.ranged?range.normalRange:range.reach)||5);
    if(save){
      const priorApply=sr29Apply;
      sr29Apply=function(creature,name,duration,source,options={}){
        if(String(name).toLowerCase()==='grappled'&&String(options.grapplerId||options.sourceId||'')===grapplerId){
          options={...options,escapeDC,grapplerSize:sr29MpSize(enemy),targetSize:sr29MpSize(creature),handSlot};
        }
        return priorApply.call(this,creature,name,duration,source,options);
      };
      try{return sr29PriorMonsterAction.apply(this,arguments);}
      finally{sr29Apply=priorApply;}
    }
    if(!sr18CanUseAction(enemy))return false;
    const bonus=Number(action.attack_bonus??enemy.attack)||0,attack=sr11RollAttack(bonus,enemy,c,!range.ranged);
    const ac=sr12WithHero(hero,()=>computeAC())+(c.buffRounds>0?2:0)+(state.combat?.mp?sr11Cover(target.pos,enemy.pos):0);
    const resolved=sr25ResolveAttackRecord(attack,ac);
    if(!resolved.success){log(`${enemy.name} uses ${action.name} against ${hero.name}: miss.`,'rolllog');return true;}
    let amount=rollDice(sr14MonsterActionDamage(action)||'1d4');if(resolved.critical)amount+=rollDice(sr14MonsterActionDamage(action)||'1d4');
    const actual=sr18MonsterApplyDamage(target,amount,sr18Text(action.damage?.[0]?.type||'physical').toLowerCase(),enemy);
    const eligibility=sr29GrappleEligibility(enemy,c,{grapplerSize:sr29MpSize(enemy),targetSize:sr29MpSize(c),freeHands:capacity,activeGrapples:active,distance:dist,reach:grappleRange});
    if(eligibility.legal){
      sr29Apply(c,'grappled','permanent',enemy.name,{sourceId:grapplerId,grapplerId,grappleRange,escapeDC,grapplerSize:sr29MpSize(enemy),targetSize:sr29MpSize(c),handSlot});
      log(`${enemy.name} hits ${hero.name} for ${actual} damage and grapples them (escape DC ${escapeDC}).`,'badlog');
    }else log(`${enemy.name} hits ${hero.name} for ${actual} damage, but cannot establish a grapple: ${eligibility.reason}.`,'badlog');
    return true;
  };
}
if(typeof sr12HeroAction==='function'){
  const sr29MpPriorHeroAction=sr12HeroAction;
  sr12HeroAction=function(player,action,spellName,targetId,data={}){
    sr29MpPruneGrappleChallenges();
    if(state?.combat?.mp&&(state.combat.mp.grappleChallenges||[]).some(item=>item.attackerId===player?.id)){
      toast('Wait for the target to resolve the grapple saving throw.');return false;
    }
    if(state?.combat?.mp&&action==='grapple'){
      const pending=(state.combat.mp.grappleChallenges||[]).some(item=>item.attackerId===player?.id);
      if(pending){toast('Wait for the target to resolve the grapple saving throw.');return false;}
      let result=false;sr12WithHero(player,()=>{result=sr29MpStartGrapple(player,targetId||null);});
      if(result){sr4Broadcast();save();render();}return result;
    }
    if(state?.combat?.mp&&action==='escape-grapple'){
      let result=false;sr12WithHero(player,()=>{result=sr29MpEscapeGrapple(player,data?.ability||'Athletics');});
      if(result){sr4Broadcast();save();render();}return result;
    }
    return sr29MpPriorHeroAction(player,action,spellName,targetId,data);
  };
}
if(typeof sr12HandleCombat==='function'){
  const sr29MpPriorHandleCombat=sr12HandleCombat;
  sr12HandleCombat=function(player,msg){
    if(msg?.action==='grapple-save')return sr29MpResolveGrappleSave(player,msg);
    if(msg?.action==='escape-grapple')return sr12HeroAction(player,'escape-grapple',null,null,{ability:msg.ability});
    return sr29MpPriorHandleCombat(player,msg);
  };
}
if(typeof sr12CombatPage==='function'){
  const sr29MpPriorCombatPage=sr12CombatPage;
  sr12CombatPage=function(){
    sr29MpPruneGrappleChallenges();
    let html=sr29MpPriorCombatPage();
    html=html.replace('>Grapple</button>','>Unarmed Strike · Grapple</button>');
    html=html.replace('<button class="btn small" data-action="mp-combat" data-move="escape-grapple">Escape grapple</button>',
      '<button class="btn small" data-action="sr29-mp-escape" data-ability="Athletics">Escape · Athletics</button><button class="btn small" data-action="sr29-mp-escape" data-ability="Acrobatics">Escape · Acrobatics</button>');
    const me=SR4.myPlayerId,players=state.campaign?.multiplayer?.players||[];
    const targets=players.filter(p=>p.id!==me&&p.connected&&p.character?.hp>0);
    const mine=sr12CurrentPlayer()?.id===me;
    const targetButtons=mine?targets.map(p=>'<button class="btn small" data-action="sr29-mp-grapple" data-target-id="'+sr29Html(p.id)+'" '+(sr12Distance(sr12PlayerPos(me),sr12PlayerPos(p.id))>5||!mine?'disabled':'')+'>Grapple '+sr29Html(p.name)+'</button>').join(''):'';
    const challenges=(state.combat.mp.grappleChallenges||[]).filter(item=>item.targetId===me);
    const savePrompts=challenges.map(item=>'<section class="card"><h3>Grapple saving throw</h3><p>'+sr29Html(item.attackerName)+' hit you with an Unarmed Strike. Choose Strength or Dexterity against DC '+Number(item.escapeDC)+'.</p><div class="item-actions"><button class="btn primary" data-action="sr29-mp-grapple-save" data-challenge-id="'+sr29Html(item.id)+'" data-ability="STR">Strength save</button><button class="btn primary" data-action="sr29-mp-grapple-save" data-challenge-id="'+sr29Html(item.id)+'" data-ability="DEX">Dexterity save</button></div></section>').join('');
    return html+(targetButtons?'<section class="card"><h3>Grapple a hero</h3><p class="smalltext muted">Select a connected party member within 5 feet. They choose their own Strength or Dexterity saving throw.</p><div class="item-actions">'+targetButtons+'</div></section>':'')+savePrompts;
  };
}
document.addEventListener('click',function(event){
  const button=event.target?.closest?.('button[data-action="sr29-mp-escape"],button[data-action="sr29-mp-grapple"],button[data-action="sr29-mp-grapple-save"]');
  if(!button||!state?.combat?.mp)return;
  event.preventDefault();event.stopImmediatePropagation();
  const player=(state.campaign?.multiplayer?.players||[]).find(p=>p.id===SR4.myPlayerId);
  if(button.dataset.action==='sr29-mp-escape'){
    const ability=button.dataset.ability==='Acrobatics'?'Acrobatics':'Athletics';
    if(SR4.role==='guest')sr4Send({type:'COMBAT',action:'escape-grapple',ability});
    else if(player)sr12HeroAction(player,'escape-grapple',null,null,{ability});
  }else if(button.dataset.action==='sr29-mp-grapple'){
    const targetId=String(button.dataset.targetId||'');
    if(SR4.role==='guest')sr4Send({type:'COMBAT',action:'grapple',targetId});
    else if(player)sr12HeroAction(player,'grapple',null,targetId);
  }else{
    const msg={type:'COMBAT',action:'grapple-save',challengeId:String(button.dataset.challengeId||''),ability:button.dataset.ability};
    if(SR4.role==='guest')sr4Send(msg);
    else if(player)sr29MpResolveGrappleSave(player,msg);
  }
},true);

if(typeof sr7EnemySpecial==='function'){
  const sr29SoloPriorEnemySpecial=sr7EnemySpecial;
  sr7EnemySpecial=function(enemy){
    const grapple=sr29Entries(enemy).find(item=>item.name==='grappled');
    if(grapple){
      const athletics=Number(enemy.skills?.Athletics??enemy.skillBonuses?.Athletics??enemy.athletics??mod(enemy.stats?.STR||10));
      const acrobatics=Number(enemy.skills?.Acrobatics??enemy.skillBonuses?.Acrobatics??enemy.acrobatics??mod(enemy.stats?.DEX||10));
      const skill=athletics>=acrobatics?'Athletics':'Acrobatics',skillBonus=skill==='Athletics'?athletics:acrobatics,dc=Number(grapple.escapeDC??enemy.grappleDC??12);
      const check=sr29CanonicalAbilityCheck(enemy,skill,dc,{roll:die(20),secondRoll:die(20),bonusOverride:skillBonus});
      const result=sr29EscapeGrapple(enemy,{instanceId:grapple.id,ability:skill,roll:Number(check.roll)||1,bonus:Number(check.bonus)||0,dc,success:check.success===true});
      if(result.escaped)log(`${enemy.name} escapes the grapple with ${skill} (${result.total} vs DC ${dc}) using its action.`,'rolllog');
      else log(`${enemy.name} fails to escape the grapple with ${skill} (${result.total} vs DC ${dc}) and uses its action to try.`,'rolllog');
      return true;
    }
    return sr29SoloPriorEnemySpecial.apply(this,arguments);
  };
}
function sr29ReconcileAbstractGrapples(snapshot=state){
  const player=snapshot?.character,combat=snapshot?.combat;
  if(!player||!combat||combat.mp)return {count:0,released:[]};
  const playerId=String(player.id||player.name||''),released=[];
  for(const enemy of combat.enemies||[]){
    const distance=Number(enemy?.distance);
    if(!Number.isFinite(distance))continue;
    const enemyId=String(enemy?.id||enemy?.name||'');
    for(const item of sr29Entries(enemy).filter(x=>x.name==='grappled'&&String(x.grapplerId||x.sourceId||'')===playerId)){
      const reach=Number(item.grappleRange??item.grappleReach??5);
      if(distance>reach){const result=sr29ReleaseGrapple(enemy,{instanceId:item.id});if(result.released)released.push({grapplerId:playerId,targetId:enemyId,instanceId:item.id,reason:'abstract-distance-exceeded-reach'});}
    }
    for(const item of sr29Entries(player).filter(x=>x.name==='grappled'&&String(x.grapplerId||x.sourceId||'')===enemyId)){
      const reach=Number(item.grappleRange??item.grappleReach??5);
      if(distance>reach){const result=sr29ReleaseGrapple(player,{instanceId:item.id});if(result.released)released.push({grapplerId:enemyId,targetId:playerId,instanceId:item.id,reason:'abstract-distance-exceeded-reach'});}
    }
  }
  return {count:released.length,released};
}
if(typeof sr12MoveHero==='function'){
  const sr29PriorMoveHero=sr12MoveHero;
  sr12MoveHero=function(player,x,y){
    const b=state?.combat,c=player?.character;
    if(!b?.mp||!player||!c)return sr29PriorMoveHero.apply(this,arguments);
    const voluntaryMovement=sr29MpVoluntaryMovementEligibility(player);
    if(!voluntaryMovement.legal){toast('You cannot move while Grappled. Use your action to escape first.');return false;}
    sr29MpPruneGrappleChallenges();
    sr29ReconcileCombatGrapples();
    const from=sr12PlayerPos(player.id),to={x:Number(x),y:Number(y)};
    const stepCost=sr9Cell(to.x,to.y)?.kind==='difficult'?10:5;
    const standCost=sr11Has(c,'prone')?Math.ceil((Number(c.movement)||30)/2):0;
    const plan=sr29MpGrappleMovePlan(player,from,to,stepCost,standCost);
    if(!plan.legal){
      toast(plan.reason==='multiple-targets'?'You cannot drag multiple creatures through one occupied grid space. Release a grapple first.':
        plan.reason==='out-of-reach'?'The grapple is already beyond reach.':'You cannot drag that creature with the available movement data.');
      return false;
    }
    const before=Number(c.movementSpent)||0,allowance=Number(c.movement)||30;
    if(plan.drag&&before+plan.movementCost>allowance){
      toast('Dragging this creature requires '+plan.movementCost+' feet of movement; you do not have enough remaining.');
      return false;
    }
    const result=sr29PriorMoveHero.apply(this,arguments);
    if(result&&plan.drag){
      c.movementSpent=before+plan.movementCost;
      if(plan.target.player)b.mp.heroPositions[plan.target.player.id]={...from};
      else if(plan.target.enemy)plan.target.enemy.pos={...from};
      log('You drag '+String(plan.target.actor.name||'the grappled creature')+' with you; this move costs '+plan.movementCost+' feet'+(plan.speedHalved?' (your speed is halved while dragging)':'')+'.','rolllog');
      sr29ReconcileCombatGrapples();
      render();save();sr4Broadcast();
    }
    sr29ReconcileCombatGrapples();
    return result;
  };
}
// Enemy displacement must reconcile source-linked grapples too. This covers normal enemy
// pathing and any effect-driven displacement that routes through these movement primitives.
if(typeof sr10EnemyMove==='function'){
  const sr29PriorSoloEnemyMove=sr10EnemyMove;
  sr10EnemyMove=function(...args){
    const result=sr29PriorSoloEnemyMove.apply(this,args);
    sr29ReconcileAbstractGrapples();
    sr29ReconcileCombatGrapples();
    return result;
  };
}
if(typeof sr12EnemyStep==='function'){
  const sr29PriorMpEnemyStep=sr12EnemyStep;
  sr12EnemyStep=function(...args){
    const result=sr29PriorMpEnemyStep.apply(this,args);
    sr29ReconcileCombatGrapples();
    return result;
  };
}
if(typeof sr18ResolveMonsterAction==='function'){
  const sr29PriorMonsterAction=sr18ResolveMonsterAction;
  sr18ResolveMonsterAction=function(...args){
    const result=sr29PriorMonsterAction.apply(this,args);
    sr29ReconcileAbstractGrapples();
    sr29ReconcileCombatGrapples();
    return result;
  };
}
if(typeof sr131Maneuver==='function'){
  const sr29PriorManeuver=sr131Maneuver;
  sr131Maneuver=function(...args){
    const result=sr29PriorManeuver.apply(this,args);
    // Maneuvers include solo-theater Shove; reconcile abstract reach as well as grid grapples.
    sr29ReconcileAbstractGrapples();
    sr29ReconcileCombatGrapples();
    return result;
  };
}
if(typeof sr7ApplyMastery==='function'){
  const sr29PriorApplyMastery=sr7ApplyMastery;
  sr7ApplyMastery=function(enemy,actor,weapon,hit,...args){
    const mastery=(typeof SR14_WEAPON_MASTERY!=='undefined'?SR14_WEAPON_MASTERY?.[weapon]:null)||(typeof SR6_MASTERY!=='undefined'?SR6_MASTERY?.[weapon]:null)||WEAPONS?.[weapon]?.mastery;
    if(mastery==='Push'){
      if(hit!==true)return false;
      if(!sr29CanPushTarget(enemy)||sr29WeaponMasteryFor(actor,weapon)!=='Push'){
        log(!sr29CanPushTarget(enemy)?`${enemy?.name||'Target'} is too large for Push mastery.`:'This character has not learned this weapon’s Push mastery.','muted');
        return false;
      }
      const before=Number(enemy.distance)||5;enemy.distance=Math.max(10,before+10);enemy.pushed=true;
      log(`${actor?.name||'The hero'} pushes ${enemy?.name||'the target'} 10 feet with Push mastery.`,'goodlog');
      sr29ReconcileAbstractGrapples();sr29ReconcileCombatGrapples();
      return true;
    }
    const result=sr29PriorApplyMastery.call(this,enemy,actor,weapon,hit,...args);
    sr29ReconcileAbstractGrapples();
    sr29ReconcileCombatGrapples();
    return result;
  };
}

function sr29ParseForcedDisplacement(description){
  const d=String(description||'');
  let m=d.match(/\b(push(?:es|ed)?|pull(?:s|ed)?)\b[^.!?]{0,140}?(\d+)\s*feet?/i);
  if(!m){
    const reverse=d.match(/(\d+)\s*feet?[^.!?]{0,140}?\b(push|pull)(?:es|ed)?\b/i);
    if(!reverse)return null;
    return {mode:reverse[2].toLowerCase()==='push'?'push':'pull',feet:Number(reverse[1])};
  }
  return {mode:m[1].toLowerCase().startsWith('push')?'push':'pull',feet:Number(m[2])};
}
function sr29SpellDisplacementSpec(spell){return sr29ParseForcedDisplacement(spell?.description||spell?.desc||'');}
function sr29ParseRepeatSave(description){
  const d=String(description||'');
  const endsOnSuccess=/ending (?:the spell|the effect) on itself on a success|ending (?:the spell|effect) on a success/i.test(d);
  if(!endsOnSuccess)return null;
  let trigger=null;
  if(/at the end of each of (?:its|their) turns?/i.test(d)&&/repeats? the (?:saving throw|save)/i.test(d))trigger='end-turn';
  else if(/whenever (?:the )?target takes damage/i.test(d)&&/repeats? the (?:saving throw|save)/i.test(d))trigger='damage';
  if(!trigger)return null;
  const match=d.match(/\b(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw\b/i);
  const ability=match?({strength:'STR',dexterity:'DEX',constitution:'CON',intelligence:'INT',wisdom:'WIS',charisma:'CHA'}[match[1].toLowerCase()]):null;
  return {trigger,endsOnSuccess:true,ability};
}
function sr29RepeatSaveSpecForSpell(spellName,spell){
  const parsed=sr29ParseRepeatSave(spell?.description||spell?.desc||'');
  if(parsed)return parsed;
  if(String(spellName||'').toLowerCase()==='hold person')return {trigger:'end-turn',endsOnSuccess:true,ability:'WIS'};
  return null;
}
if(typeof sr14SpellEffectComplete==='function'){
  const sr29PriorSpellEffectComplete=sr14SpellEffectComplete;
  sr14SpellEffectComplete=function(name,spell){
    if(spell&&!spell.description&&spell.desc)spell.description=String(spell.desc);
    if(String(name||'').toLowerCase()==='hold person'&&spell){
      if(!spell.description||/paralyze a humanoid foe with binding magic/i.test(spell.description))spell.description='The target must succeed on a Wisdom saving throw or have the Paralyzed condition for the duration.';
      spell.condition='paralyzed';spell.save='WIS';spell.saveAbility='WIS';spell.duration=spell.duration||'1 minute';spell.concentration=true;
    }
    return sr29PriorSpellEffectComplete.call(this,name,spell);
  };
}
function sr29SpellSaveDetails(target,entries){
  const name=String(target?.name||'');
  const message=(entries||[]).map(entry=>String(entry?.msg??entry??'')).find(text=>text.startsWith(name+' ')&&/(?:makes\s+(?:a\s+)?|rolls\s+)(?:STR|DEX|CON|INT|WIS|CHA)\s+save\b/i.test(text));
  if(!message)return {};
  const match=message.match(/(?:makes\s+(?:a\s+)?|rolls\s+)(STR|DEX|CON|INT|WIS|CHA)\s+save\s+(-?\d+)\s+vs DC\s+(\d+)/i);
  if(!match)return {message};
  const total=Number(match[2]),dc=Number(match[3]),markedFailure=/:\s*failure\./i.test(message),markedSuccess=/:\s*success\./i.test(message);
  return {ability:match[1].toUpperCase(),total,dc,success:markedSuccess||(!markedFailure&&total>=dc),failure:markedFailure||(!markedSuccess&&total<dc),message};
}
function sr29NormalizeSaveAbility(value){
  const key=String(value||'').trim().toUpperCase();
  return ({STRENGTH:'STR',DEXTERITY:'DEX',CONSTITUTION:'CON',INTELLIGENCE:'INT',WISDOM:'WIS',CHARISMA:'CHA'})[key]||key;
}
function sr29SpellSaveDC(caster,spell){
  if(!caster)return 0;
  const klass=typeof sr14CasterClass==='function'?sr14CasterClass(caster,spell):(spell?.classes||[]).find(k=>Number(caster.classLevels?.[k])>0)||caster.classId;
  const ability=typeof sr14CasterAbility==='function'?sr14CasterAbility(klass):'CHA';
  return 8+(typeof sr14Prof==='function'?sr14Prof(caster.level):2)+(typeof sr14AbilityMod==='function'?sr14AbilityMod(caster.stats?.[ability]):0)+(Number(caster.spellDCBonus)||0);
}
function sr29AttachRepeatSave(target,condition,spellName,caster,ability,dc,spec,sourceIdOverride=''){
  if(!target||!condition||!spec||!ability||!Number.isFinite(Number(dc)))return false;
  const normalized=sr29NormalizeSaveAbility(ability),entries=sr29Entries(target),matches=entries.filter(item=>item.name===String(condition).toLowerCase()&&item.source===String(spellName));
  const item=matches[matches.length-1];if(!item)return false;
  item.repeatSave={trigger:spec.trigger,endsOnSuccess:true,ability:normalized,dc:Number(dc),sourceSpell:String(spellName),sourceId:String(sourceIdOverride||caster?.id||''),sourceName:String(caster?.name||''),appliedRound:Number(state?.combat?.round)||sr29CurrentCycle()};
  target.conditions=entries;return true;
}
function sr29SpellTargetFailedSave(target,entries){
  const details=sr29SpellSaveDetails(target,entries);
  return details.failure===true;
}
function sr29ApplyMasteryPush(target,player,origin,weapon){
  if(!target||!state?.combat?.mp||typeof sr18DisplaceCombatant!=='function'||!sr29CanPushTarget(target)||sr29WeaponMasteryFor(player?.character,weapon)!=='Push')return false;
  const sourcePos=origin||sr12PlayerPos(player?.id);
  if(!sourcePos)return false;
  const moved=sr18DisplaceCombatant({enemy:target},{pos:sourcePos},'The target is pushed 10 feet away from the caster.');
  if(moved){sr29ReconcileCombatGrapples();sr29ReconcileAbstractGrapples();}
  return moved;
}
function sr29PlayerTeleportRange(spellName,spell){
  // Misty Step is the only short-range self-teleport represented in the installed spell
  // reference without an explicit numeric distance. Other tactical teleports must state
  // their range in their description; destination/companion travel remains a separate task.
  if(String(spellName||'').trim().toLowerCase()==='misty step')return 30;
  const description=String(spell?.description||spell?.desc||'');
  const match=description.match(/\bteleport(?:s|ed|ing)?[^.!?]{0,120}?(?:up to |within |no more than )?(\d+)\s*feet?/i)||
    description.match(/(\d+)\s*feet?[^.!?]{0,120}\bteleport/i);
  return match?Math.max(5,Number(match[1])||0):null;
}
function sr29PlayerTeleportPlan(player,feet){
  const combat=state?.combat,amount=Number(feet),id=String(player?.id||'solo');
  if(!combat||!Number.isFinite(amount)||amount<=0)return null;
  const origin=combat.mp&&typeof sr12PlayerPos==='function'?sr12PlayerPos(id):combat.heroPos;
  if(!origin||!Number.isFinite(Number(origin.x))||!Number.isFinite(Number(origin.y)))return null;
  const width=Math.max(1,Math.floor(Number(combat.map?.width)||8)),height=Math.max(1,Math.floor(Number(combat.map?.height)||6));
  const enemies=(combat.enemies||[]).filter(enemy=>enemy&&enemy.hp>0);
  const occupied=(x,y)=>{
    // Sparse terrain maps treat an absent cell as ordinary open floor.
    if(Array.isArray(combat.map?.terrain)){
      const cell=combat.map.terrain.find(item=>Number(item.x)===x&&Number(item.y)===y)||null;
      if(cell&&(cell.blocked===true||cell.walkable===false||/^(?:wall|void|blocked)$/i.test(String(cell.kind||cell.type||''))))return true;
      if(typeof sr11Blocked==='function'&&sr11Blocked(x,y))return true;
    }
    if(enemies.some(enemy=>{const p=enemy.pos||enemy.position;return p&&Number(p.x)===x&&Number(p.y)===y;}))return true;
    if(combat.mp){
      for(const [otherId,p] of Object.entries(combat.mp.heroPositions||{})){
        if(otherId!==id&&p&&Number(p.x)===x&&Number(p.y)===y)return true;
      }
    }
    return false;
  };
  const candidates=[];
  for(let x=0;x<width;x++)for(let y=0;y<height;y++){
    const to={x,y},travel=typeof sr12Distance==='function'?sr12Distance(origin,to):Math.max(Math.abs(x-origin.x),Math.abs(y-origin.y))*5;
    if(travel<=0||travel>amount||occupied(x,y))continue;
    if(typeof sr11HasLOS==='function'&&!sr11HasLOS(origin,to))continue;
    const nearestEnemy=enemies.length?Math.min(...enemies.map(enemy=>{
      const p=enemy.pos||enemy.position;
      return p?(typeof sr12Distance==='function'?sr12Distance(to,p):Math.max(Math.abs(x-p.x),Math.abs(y-p.y))*5):Infinity;
    })):Infinity;
    candidates.push({from:{x:Number(origin.x),y:Number(origin.y)},to,travelFeet:travel,nearestEnemyFeet:nearestEnemy});
  }
  // Preserve the existing auto-placement behavior, but constrain it to a legal
  // destination within the spell's actual range and visible to the caster.
  candidates.sort((a,b)=>b.nearestEnemyFeet-a.nearestEnemyFeet||a.travelFeet-b.travelFeet||a.to.y-b.to.y||a.to.x-b.to.x);
  return candidates[0]||null;
}
function sr29ApplyPlayerTeleport(player,plan){
  const combat=state?.combat,id=String(player?.id||'solo');
  if(!combat||!plan?.to)return false;
  const destination={x:Number(plan.to.x),y:Number(plan.to.y)};
  if(!Number.isFinite(destination.x)||!Number.isFinite(destination.y))return false;
  if(combat.mp){
    combat.mp.heroPositions=combat.mp.heroPositions||{};
    combat.mp.heroPositions[id]=destination;
  }
  combat.heroPos=destination;
  if(typeof sr29ReconcileAbstractGrapples==='function')sr29ReconcileAbstractGrapples();
  if(typeof sr29ReconcileCombatGrapples==='function')sr29ReconcileCombatGrapples();
  return true;
}
function sr29ApplyPlayerSpellDisplacement(target,caster,mode,feet,origin=null){
  const combat=state?.combat,amount=Number(feet);
  if(!combat||!target||target.dead===true||target.isDead===true||!['push','pull'].includes(mode)||!Number.isFinite(amount)||amount<=0)return false;
  if(!combat.mp){
    const before=Number.isFinite(Number(target.distance))?Math.max(0,Number(target.distance)):5;
    const after=mode==='push'?before+amount:Math.max(0,before-amount);
    if(after===before)return false;
    target.distance=after;
    log(`${target.name} is ${mode==='push'?'pushed':'pulled'} ${Math.abs(after-before)} feet by the spell.`,'rolllog');
    sr29ReconcileAbstractGrapples();
    sr29ReconcileCombatGrapples();
    return true;
  }
  const sourcePos=origin||(caster?.id&&typeof sr12PlayerPos==='function'?sr12PlayerPos(caster.id):combat.heroPos);
  if(!sourcePos||typeof sr18DisplaceCombatant!=='function')return false;
  const verb=mode==='push'?'pushed':'pulled';
  const moved=sr18DisplaceCombatant({enemy:target},{pos:sourcePos},`The target is ${verb} ${amount} feet.`);
  if(moved&&target.position)target.position={...target.pos};
  return moved;
}

// The legacy multiplayer spell path receives structured slot records too, but its
// original consumer treats them as numbers and falls back to the scalar total.
if(typeof sr12ConsumeSlot==='function'){
  const sr29PriorConsumeSlot=sr12ConsumeSlot;
  sr12ConsumeSlot=function(c,slot){
    if(slot===false)return false;
    if(slot==null)return true;
    if(slot&&typeof slot==='object'&&Number(slot.level)>0){
      if(typeof sr7ConsumeCastSlot==='function')sr7ConsumeCastSlot(c,slot);
      else if(c?.spellSlotsByLevel){const level=Number(slot.level);c.spellSlotsByLevel[level]=Math.max(0,(Number(c.spellSlotsByLevel[level])||0)-1);if(typeof sr7UpdateSlotTotals==='function')sr7UpdateSlotTotals(c);}
      return true;
    }
    if(typeof slot==='number'&&slot>0&&c?.spellSlotsByLevel){
      const selected=typeof sr7ChooseCastSlot==='function'?sr7ChooseCastSlot(c,slot):null;
      if(selected&&typeof sr7ConsumeCastSlot==='function')sr7ConsumeCastSlot(c,selected);
      else{c.spellSlotsByLevel[slot]=Math.max(0,(Number(c.spellSlotsByLevel[slot])||0)-1);if(typeof sr7UpdateSlotTotals==='function')sr7UpdateSlotTotals(c);}
      return true;
    }
    return sr29PriorConsumeSlot.apply(this,arguments);
  };
}
if(typeof sr14CastSpellComplete==='function'){
  const sr29PriorCastSpell=sr14CastSpellComplete;
  sr14CastSpellComplete=function(...args){
    const playerArg=args[0],spellName=args[1],spell=SRD52_SPELLS?.[spellName];
    const caster=playerArg?.character||state?.character;
    const player=playerArg||{id:typeof SR4!=='undefined'?(SR4.myPlayerId||'solo'):'solo',name:caster?.name||'Hero',character:caster};
    const effect=spell&&typeof sr14SpellEffectComplete==='function'?sr14SpellEffectComplete(spellName,spell):null;
    const castTime=String(spell?.castingTime||'Action'),castKind=/bonus action/i.test(castTime)?'bonus-action':/reaction/i.test(castTime)?'reaction':'action';
    if(!sr29ActionEconomyGate(caster,castKind,!!state?.combat))return false;
    const displacement=spell?sr29SpellDisplacementSpec(spell):null,repeatSave=spell?sr29RepeatSaveSpecForSpell(spellName,spell):null;
    const resourcesBefore={actionSpent:caster?.actionSpent,bonusActionSpent:caster?.bonusActionSpent};
    const castMode=args[4]||{},reservedSlot=spell&&Number(spell.level)>0&&!castMode.ritual?sr14GetCastSlot(caster,Number(spell.level)):null;
    const slotLevel=Number(reservedSlot?.level??reservedSlot),slotKind=String(reservedSlot?.kind||'regular');
    const slotMapBefore=slotKind==='pact'?caster?.pactSlotsByLevel:caster?.spellSlotsByLevel;
    const slotCountBefore=Number(slotMapBefore?.[slotLevel])||0;
    // The scalar-slot compatibility path uses numeric zero as its valid-slot sentinel.
    const scalarSlotsBefore=reservedSlot===0?(Number(caster?.spellSlots)||0):0;
    const combat=state?.combat,target=combat?.mp?(typeof sr4Target==='function'?sr4Target():null):(typeof targetEnemy==='function'?targetEnemy():null);
    const origin=combat?.mp&&typeof sr12PlayerPos==='function'?sr12PlayerPos(player.id):combat?.heroPos;
    const hadCharacterPosition=!!caster&&Object.prototype.hasOwnProperty.call(caster,'position');
    const previousCharacterPosition=hadCharacterPosition&&caster.position&&typeof caster.position==='object'?{...caster.position}:caster?.position;
    let teleportPlan=null;
    if(effect?.kind==='teleport'&&combat){
      const teleportRange=sr29PlayerTeleportRange(spellName,spell);
      if(!Number.isFinite(teleportRange)||teleportRange<=0){toast('This teleport needs a supported range and destination rule before it can be used in tactical combat.');return false;}
      teleportPlan=sr29PlayerTeleportPlan(player,teleportRange);
      if(!teleportPlan){toast('No visible, unoccupied destination is available within this teleport’s range.');return false;}
    }
    let targets=[];
    if((displacement||repeatSave)&&combat&&effect&&['saveDamage','control','debuff','attack'].includes(effect.kind)){
      targets=effect.area&&typeof sr14TargetListComplete==='function'?sr14TargetListComplete(player,spell,effect,target,origin):[target].filter(Boolean);
      targets=(targets||[]).filter(item=>item&&!item.player&&Number(item.hp)>0);
    }
    const beforeLog=Array.isArray(state?.log)?state.log.length:0;
    const result=sr29PriorCastSpell.apply(this,args);
    sr29FinalizeCastResources(caster,castKind,result,resourcesBefore);
    // The legacy V18 cast path compares a structured slot object to a number, so
    // successful leveled casts can skip consumption. Ensure one slot is spent,
    // but do not double-spend if a future base resolver already consumed it.
    if(result&&reservedSlot&&Number.isFinite(slotLevel)&&slotLevel>0&&slotCountBefore>0){
      const slotMap=slotKind==='pact'?caster?.pactSlotsByLevel:caster?.spellSlotsByLevel;
      const currentCount=Number(slotMap?.[slotLevel])||0;
      if(currentCount>=slotCountBefore){
        if(typeof reservedSlot==='object'&&typeof sr7ConsumeCastSlot==='function'){sr7ConsumeCastSlot(caster,reservedSlot);if(castKind!=='reaction')caster.spellSlotSpentThisTurn=true;}
        else if(slotMap){slotMap[slotLevel]=Math.max(0,currentCount-1);if(typeof sr7UpdateSlotTotals==='function')sr7UpdateSlotTotals(caster);if(castKind!=='reaction')caster.spellSlotSpentThisTurn=true;}
      }
    }else if(result&&reservedSlot===0&&scalarSlotsBefore>0){
      const currentScalarSlots=Number(caster?.spellSlots)||0;
      if(currentScalarSlots>=scalarSlotsBefore){
        // A render/save may have migrated the scalar legacy total into a level map.
        // If so, spend the actual slot tier now rather than leaving the new map untouched.
        const migratedSlot=caster?.spellSlotsByLevel&&typeof sr7ChooseCastSlot==='function'?sr7ChooseCastSlot(caster,Number(spell?.level)||1):null;
        if(migratedSlot&&typeof sr7ConsumeCastSlot==='function')sr7ConsumeCastSlot(caster,migratedSlot);
        else caster.spellSlots=Math.max(0,currentScalarSlots-1);
        if(castKind!=='reaction')caster.spellSlotSpentThisTurn=true;
      }
    }
    if(result&&teleportPlan){
      // The legacy cast path still performs its own fallback relocation. Replace it with
      // the prevalidated V29 destination and restore the non-authoritative legacy field.
      if(hadCharacterPosition)caster.position=previousCharacterPosition;else if(caster)delete caster.position;
      sr29ApplyPlayerTeleport(player,teleportPlan);
      log(`${player.name} teleports to an unoccupied space ${teleportPlan.travelFeet} feet away.`,'rolllog');
    }
    if(result&&(displacement||repeatSave)&&targets.length){
      const entries=(state?.log||[]).slice(beforeLog);
      for(const victim of targets){
        const failed=sr29SpellTargetFailedSave(victim,entries);
        const attackHit=effect.kind==='attack'&&!entries.some(entry=>String(entry?.msg??entry??'').includes(`${spellName} misses ${victim.name}`));
        if(repeatSave&&effect.condition){
          const details=sr29SpellSaveDetails(victim,entries),ability=sr29NormalizeSaveAbility(effect.save||details.ability||repeatSave.ability||'');
          const dc=Number(details.dc)||sr29SpellSaveDC(caster,spell);
          sr29AttachRepeatSave(victim,effect.condition,spellName,caster,ability,dc,repeatSave,player.id);
        }
        if(displacement&&(failed||attackHit))sr29ApplyPlayerSpellDisplacement(victim,player,displacement.mode,displacement.feet,origin);
      }
    }
    sr29ReconcileAbstractGrapples();
    sr29ReconcileCombatGrapples();
    return result;
  };
}
if(typeof sr12CastSpell==='function'){
  const sr29PriorLegacyCastSpell=sr12CastSpell;
  sr12CastSpell=function(player,name,allyId=null,...args){
    const spell=SRD52_SPELLS?.[name]?null:(SR9_SPELLS?.[name]||SPELLS?.[name]);
    if(!spell||spell.kind!=='teleport')return sr29PriorLegacyCastSpell.apply(this,[player,name,allyId,...args]);
    if(!state?.combat?.mp){toast('This legacy teleport is only supported in tactical multiplayer combat.');return false;}
    const caster=player?.character;
    const castKind=/bonus action/i.test(String(spell.castingTime||(/misty step/i.test(name)?'Bonus Action':'Action')))?'bonus-action':/reaction/i.test(String(spell.castingTime||''))?'reaction':'action';
    if(!sr29ActionEconomyGate(caster,castKind,true))return false;
    const range=sr29PlayerTeleportRange(name,spell),plan=Number.isFinite(range)&&range>0?sr29PlayerTeleportPlan(player,range):null;
    if(!plan){toast('This legacy teleport has no legal visible destination within its supported range.');return false;}
    const resourcesBefore={actionSpent:caster?.actionSpent,bonusActionSpent:caster?.bonusActionSpent};
    const spellTable=SR9_SPELLS?.[name]?SR9_SPELLS:SPELLS,originalSpell=spellTable[name];
    const utilitySpell={...originalSpell,kind:'utility'};
    // Reuse the legacy spell's slot, concentration and action flow, but suppress its
    // unsafe direct-position write. V29 commits the prevalidated destination afterward.
    spellTable[name]=utilitySpell;
    if(castKind==='bonus-action'&&caster)caster.actionSpent=false;
    let result=false;
    try{result=sr29PriorLegacyCastSpell.apply(this,[player,name,allyId,...args]);}
    finally{spellTable[name]=originalSpell;}
    if(!result){
      if(caster){caster.actionSpent=resourcesBefore.actionSpent;caster.bonusActionSpent=resourcesBefore.bonusActionSpent;}
      return false;
    }
    if(caster){
      if(castKind==='bonus-action'){caster.actionSpent=resourcesBefore.actionSpent;caster.bonusActionSpent=true;}
      else if(castKind==='reaction'){caster.actionSpent=resourcesBefore.actionSpent;caster.bonusActionSpent=resourcesBefore.bonusActionSpent;caster.reactionAvailable=false;}
      if(Number(spell.level)>0&&castKind!=='reaction')caster.spellSlotSpentThisTurn=true;
    }
    sr29ApplyPlayerTeleport(player,plan);
    log(`${player.name} completes the legacy teleport at a legal destination ${plan.travelFeet} feet away.`,'rolllog');
    return result;
  };
}

function sr29RepeatSaveAfterDamage(target,amount,rolls=null){
  if(Number(amount)>0&&target)sr29ProcessRepeatSaves(target,'damage',sr29NextDamageEventKey(),rolls);
}
function sr29RepeatSaveTurnKey(kind,target){
  return `${sr29CurrentCycle()}:${kind}:${target?.id||target?.name||'actor'}`;
}
if(typeof afterPlayerAction==='function'){
  const sr29PriorAfterPlayerAction=afterPlayerAction;
  afterPlayerAction=function(...args){
    if(state?.combat&&state.character)sr29ProcessRepeatSaves(state.character,'end-turn',sr29RepeatSaveTurnKey('hero',state.character));
    return sr29PriorAfterPlayerAction.apply(this,args);
  };
}
if(typeof sr7ExpireConditions==='function'){
  const sr29PriorExpireConditions=sr7ExpireConditions;
  sr7ExpireConditions=function(target,...args){
    if(target&&target!==state?.character)sr29ProcessRepeatSaves(target,'end-turn',sr29RepeatSaveTurnKey('enemy',target));
    return sr29PriorExpireConditions.apply(this,[target,...args]);
  };
}
if(typeof sr10EnemyTurn==='function'){
  const sr29PriorSoloEnemyTurn=sr10EnemyTurn;
  sr10EnemyTurn=function(entry,...args){
    const enemy=state?.combat?.enemies?.[Number(entry?.index)],previous=SR29_PHASE;SR29_PHASE='enemy';
    try{
      const result=sr29PriorSoloEnemyTurn.call(this,entry,...args);
      if(enemy)sr29ProcessRepeatSaves(enemy,'end-turn',sr29RepeatSaveTurnKey('enemy',enemy));
      return result;
    }finally{SR29_PHASE=previous;}
  };
}
if(typeof sr10CompanionTurn==='function'){
  const sr29PriorSoloCompanionTurn=sr10CompanionTurn;
  sr10CompanionTurn=function(entry,...args){
    const ally=state?.campaign?.companions?.[Number(entry?.index)];
    const result=sr29PriorSoloCompanionTurn.call(this,entry,...args);
    if(ally)sr29ProcessRepeatSaves(ally,'end-turn',sr29RepeatSaveTurnKey('companion',ally));
    return result;
  };
}
if(typeof sr12EndRound==='function'){
  const sr29PriorEndRound=sr12EndRound;
  sr12EndRound=function(...args){
    const players=state?.campaign?.multiplayer?.players||[],enemies=state?.combat?.enemies||[];
    const playerReactions=players.map(p=>[p?.character,p?.character?.reactionAvailable]),enemyReactions=enemies.map(e=>[e,e?.reactionAvailable]);
    const result=sr29PriorEndRound.apply(this,args);
    for(const [actor,available] of playerReactions)if(actor)actor.reactionAvailable=available;
    for(const [enemy,available] of enemyReactions)if(enemy)enemy.reactionAvailable=available;
    return result;
  };
}
function sr29BeginEnemyTurn(enemy){if(enemy)enemy.reactionAvailable=true;return enemy;}
if(typeof sr12EnemyTurn==='function'){
  const sr29PriorEnemyTurn=sr12EnemyTurn;
  sr12EnemyTurn=function(enemy,...args){
    sr29BeginEnemyTurn(enemy);
    return sr29PriorEnemyTurn.call(this,enemy,...args);
  };
}
if(typeof sr12AdvanceIndex==='function'&&typeof sr12TurnActor==='function'){
  const sr29PriorAdvanceIndex=sr12AdvanceIndex;
  sr12AdvanceIndex=function(...args){
    const b=state?.combat,actor=sr12TurnActor();let target=null;
    if(actor?.kind==='hero')target=sr12PlayerById(actor.id)?.character||null;
    else if(actor?.kind==='enemy')target=b?.enemies?.[Number(actor.index)]||null;
    else if(actor?.kind==='companion')target=state?.campaign?.companions?.[Number(actor.index)]||null;
    if(target)sr29ProcessRepeatSaves(target,'end-turn',typeof sr12CombatKey==='function'?sr12CombatKey(actor,b):sr29RepeatSaveTurnKey(actor.kind,target));
    return sr29PriorAdvanceIndex.apply(this,args);
  };
}
if(typeof sr18ResolveMonsterAction==='function'){
  const sr29PriorMonsterActionPhase=sr18ResolveMonsterAction;
  sr18ResolveMonsterAction=function(...args){
    const previous=SR29_PHASE;SR29_PHASE='enemy';
    try{return sr29PriorMonsterActionPhase.apply(this,args);}finally{SR29_PHASE=previous;}
  };
}
if(typeof damagePlayer==='function'){
  const sr29PriorDamagePlayer=damagePlayer;
  damagePlayer=function(...args){
    const result=sr29PriorDamagePlayer.apply(this,args);
    sr29RepeatSaveAfterDamage(state?.character,result);
    return result;
  };
}
if(typeof sr12DamageHero==='function'){
  const sr29PriorDamageHero=sr12DamageHero;
  sr12DamageHero=function(player,amount,...args){
    const result=sr29PriorDamageHero.call(this,player,amount,...args);
    sr29RepeatSaveAfterDamage(player?.character,result);
    return result;
  };
}
if(typeof sr12ApplyDamage==='function'){
  const sr29PriorApplyDamage=sr12ApplyDamage;
  sr12ApplyDamage=function(enemy,amount,...args){
    const result=sr29PriorApplyDamage.call(this,enemy,amount,...args);
    sr29RepeatSaveAfterDamage(enemy,result);
    return result;
  };
}
if(typeof sr7PlayerAttack==='function'){
  const sr29PriorSoloGridAttack=sr7PlayerAttack;
  sr7PlayerAttack=function(...args){
    const c=state?.character;if(state?.combat&&!sr29ActionEconomyGate(c,'action',true))return false;
    const before=new Map((state?.combat?.enemies||[]).map(enemy=>[enemy,Number(enemy.hp)||0]));
    const target=typeof targetEnemy==='function'?targetEnemy():null;
    if(sr29CannotHarm(c,target)){toast('The Charmed condition prevents you from harming its source.');return false;}
    const result=sr29PriorSoloGridAttack.apply(this,args);
    for(const [enemy,hp] of before){const dealt=hp-(Number(enemy.hp)||0);if(dealt>0)sr29RepeatSaveAfterDamage(enemy,dealt);}
    return result;
  };
}


function sr29FinalizeCastResources(caster,kind,result,before={}){
  if(!result||!caster||kind!=='reaction'||!state?.combat)return false;
  caster.actionSpent=before.actionSpent;
  caster.bonusActionSpent=before.bonusActionSpent;
  caster.reactionAvailable=false;
  return true;
}
function sr29ActionEconomyGate(actor,kind,checkResource=!!state?.combat){
  if(!actor)return false;
  if(!sr29CanAct(actor,kind)){toast(`Your current condition prevents you from taking a ${kind==='bonus-action'?'Bonus Action':kind==='reaction'?'Reaction':'Action'}.`);return false;}
  if(checkResource&&kind==='action'&&actor.actionSpent===true){toast('Your Action is already spent.');return false;}
  if(checkResource&&kind==='bonus-action'&&actor.bonusActionSpent===true){toast('Your Bonus Action is already spent.');return false;}
  if(checkResource&&kind==='reaction'&&actor.reactionAvailable===false){toast('Your Reaction is already spent.');return false;}
  return true;
}
// Central player entry-point gates: the condition registry, not a scattered list of
// condition names, decides whether an action, Bonus Action, or Reaction is available.
if(typeof sr12HeroAction==='function'){
  const sr29PriorHeroAction=sr12HeroAction;
  sr12HeroAction=function(player,action,...args){
    const c=player?.character,a=String(action||'');
    const nonAction=new Set(['target','move','end','death-save','sr14-feature','feature','spell']);
    const bonusAction=new Set(['power','power-class','second-wind','cunning-dash','cunning-disengage','cunning-hide']);
    if(bonusAction.has(a)&&!sr29ActionEconomyGate(c,'bonus-action'))return false;
    if(!nonAction.has(a)&&!bonusAction.has(a)&&!sr29ActionEconomyGate(c,'action'))return false;
    return sr29PriorHeroAction.call(this,player,action,...args);
  };
}
if(typeof sr14RunFeature==='function'){
  const sr29PriorRunFeature=sr14RunFeature;
  sr14RunFeature=function(player,key,option=''){
    const c=player?.character||state?.character,k=String(key||'');
    const bonus=new Set(['rage','inspiration','wildShape','secondWind','flurry','layOnHands','huntersMark','cunningDash','cunningDisengage','cunningHide','innateSorcery']);
    const action=new Set(['divineSpark','eldritchBlast']);
    const free=new Set(['actionSurge']);
    const kind=k==='cuttingWords'?'reaction':bonus.has(k)?'bonus-action':action.has(k)?'action':free.has(k)?'free':null;
    if(kind&&!sr29ActionEconomyGate(c,kind,!free.has(k)))return false;
    const previousBonus=c?.bonusActionSpent;
    if(k==='actionSurge'&&c)c.bonusActionSpent=false;
    let result;
    try{result=sr29PriorRunFeature.call(this,player,key,option);}
    finally{if(k==='actionSurge'&&c)c.bonusActionSpent=previousBonus;}
    if(result&&kind==='reaction'&&state?.combat)c.reactionAvailable=false;
    return result;
  };
}
if(typeof sr12ClassPower==='function'){
  const sr29PriorClassPower=sr12ClassPower;
  sr12ClassPower=function(player,...args){
    const c=player?.character,cls=c?.classId;
    if(!state?.combat)return sr29PriorClassPower.call(this,player,...args);
    if(cls==='Wizard'){toast('Arcane Recovery is used during a Short Rest, not in combat.');return false;}
    const freeActionSurge=cls==='Fighter',actionPower=cls==='Cleric'||cls==='Warlock';
    if(!sr29ActionEconomyGate(c,freeActionSurge||actionPower?'action':'bonus-action',!freeActionSurge))return false;
    if(freeActionSurge||actionPower){
      const previousBonus=c.bonusActionSpent;
      c.bonusActionSpent=false;
      const result=sr29PriorClassPower.call(this,player,...args);
      c.bonusActionSpent=previousBonus;
      if(result&&cls==='Cleric')c.actionSpent=true;
      return result;
    }
    return sr29PriorClassPower.call(this,player,...args);
  };
}
if(typeof sr137CunningAction==='function'){
  const sr29PriorCunningAction=sr137CunningAction;
  sr137CunningAction=function(player,mode,...args){
    if(!sr29ActionEconomyGate(player?.character,'bonus-action',true))return false;
    return sr29PriorCunningAction.call(this,player,mode,...args);
  };
}
if(typeof sr12HeroAttack==='function'){
  const sr29PriorHeroAttack=sr12HeroAttack;
  sr12HeroAttack=function(player,targetOverride=null,reaction=false,...args){
    const kind=reaction?'reaction':'action',character=player?.character;
    if(!sr29ActionEconomyGate(character,kind,true))return false;
    const target=targetOverride||(typeof sr4Target==='function'?sr4Target():null),weapon=String(character?.weapon||''),mastery=sr29WeaponMasteryFor(character,weapon);
    const beforeLog=(state?.log||[]).length,beforeLogHead=(state?.log||[])[0]||null,origin=state?.combat?.mp?sr12PlayerPos(player?.id):null;
    const actionSpentBefore=character?.actionSpent,bonusActionSpentBefore=character?.bonusActionSpent;
    const result=sr29PriorHeroAttack.call(this,player,targetOverride,reaction,...args);
    if(reaction&&result&&character){character.actionSpent=actionSpentBefore;character.bonusActionSpent=bonusActionSpentBefore;character.reactionAvailable=false;}
    if(result&&state?.combat?.mp&&mastery==='Push'&&target&&origin){
      const prefix=`${player?.name||character?.name||''} attacks ${target.name}:`,logs=state.log||[],headIndex=beforeLogHead?logs.indexOf(beforeLogHead):logs.length;
      const newEntries=headIndex>=0?logs.slice(0,headIndex):logs.slice(0,Math.max(0,logs.length-beforeLog));
      const hits=newEntries.filter(entry=>{const message=String(entry?.msg??entry??'');return message.startsWith(prefix)&&/\bHit\./.test(message);}).length;
      for(let i=0;i<hits;i++)sr29ApplyMasteryPush(target,player,origin,weapon);
    }
    return result;
  };
}
if(typeof sr9Attack==='function'){
  const sr29PriorGridAttack=sr9Attack;
  sr9Attack=function(...args){
    if(state?.combat&&!sr29ActionEconomyGate(state.character,'action',true))return false;
    return sr29PriorGridAttack.apply(this,args);
  };
}
if(typeof playerAttack==='function'){
  const sr29PriorSoloAttack=playerAttack;
  playerAttack=function(...args){
    if(state?.combat&&!sr29ActionEconomyGate(state.character,'action',true))return false;
    return sr29PriorSoloAttack.apply(this,args);
  };
}
if(typeof sr10Disengage==='function'){
  const sr29PriorDisengage=sr10Disengage;
  sr10Disengage=function(...args){
    if(state?.combat&&!sr29ActionEconomyGate(state.character,'action',true))return false;
    return sr29PriorDisengage.apply(this,args);
  };
}
if(typeof sr10Dodge==='function'){
  const sr29PriorDodge=sr10Dodge;
  sr10Dodge=function(...args){
    if(state?.combat&&!sr29ActionEconomyGate(state.character,'action',true))return false;
    return sr29PriorDodge.apply(this,args);
  };
}

if(globalThis.__SR29_TEST){
  globalThis.__SR29_TEST.gameplay={version:SR29_GRAPPLE_GAMEPLAY_VERSION,actionEconomyGate:sr29ActionEconomyGate,finalizeCastResources:sr29FinalizeCastResources,runFeature:typeof sr14RunFeature==='function'?sr14RunFeature:null,classPower:typeof sr12ClassPower==='function'?sr12ClassPower:null,cunningAction:typeof sr137CunningAction==='function'?sr137CunningAction:null,heroAction:typeof sr12HeroAction==='function'?sr12HeroAction:null,heroAttack:typeof sr12HeroAttack==='function'?sr12HeroAttack:null,castSpell:typeof sr14CastSpellComplete==='function'?sr14CastSpellComplete:null,freeHands:sr29SoloFreeHands,activeGrapples:sr29SoloActiveGrapples,soloShove:sr29SoloShove,parseForcedDisplacement:sr29ParseForcedDisplacement,spellDisplacementSpec:sr29SpellDisplacementSpec,parseRepeatSave:sr29ParseRepeatSave,repeatSaveSpecForSpell:sr29RepeatSaveSpecForSpell,spellEffectComplete:typeof sr14SpellEffectComplete==='function'?sr14SpellEffectComplete:null,attachRepeatSave:sr29AttachRepeatSave,spellTargetFailedSave:sr29SpellTargetFailedSave,playerSpellDisplace:sr29ApplyPlayerSpellDisplacement,playerTeleportRange:sr29PlayerTeleportRange,playerTeleportPlan:sr29PlayerTeleportPlan,applyPlayerTeleport:sr29ApplyPlayerTeleport,setSpellData:(name,spell)=>{if(typeof SRD52_SPELLS==='object')SRD52_SPELLS[name]=spell;},setLegacySpellData:(name,spell)=>{if(typeof SPELLS==='object')SPELLS[name]=spell;if(typeof SR9_SPELLS==='object')SR9_SPELLS[name]=spell;if(typeof SRD52_SPELLS==='object')delete SRD52_SPELLS[name];},castLegacySpell:(player,name,allyId=null)=>sr12CastSpell(player,name,allyId),spellDiagnostics:(c,name)=>{const sp=SRD52_SPELLS?.[name],klass=sp?sr14CasterClass(c,sp):null;return {exists:!!sp,known:sr14SpellKnown(c,name),classCanCast:!!sp&&sr14ClassCanCast(c,sp),prepared:!!sp&&sr14SpellPrepared(c,name),effect:sp?sr14SpellEffectComplete(name,sp):null,klass,maxLevel:sp?sr14MaxSpellLevel(c,klass):0,slot:sp?sr14GetCastSlot(c,sp.level):null,actionGate:sr29ActionEconomyGate(c,'bonus-action',true)};},applyMastery:typeof sr7ApplyMastery==='function'?sr7ApplyMastery:null,weaponMasteryFor:sr29WeaponMasteryFor,canPushTarget:sr29CanPushTarget,applyMasteryPush:sr29ApplyMasteryPush,repeatSaveAfterDamage:sr29RepeatSaveAfterDamage,advanceIndex:typeof sr12AdvanceIndex==='function'?sr12AdvanceIndex:null,endRound:typeof sr12EndRound==='function'?sr12EndRound:null,beginHeroTurn:typeof sr12BeginHeroTurn==='function'?sr12BeginHeroTurn:null,beginEnemyTurn:sr29BeginEnemyTurn,enemyTurn:typeof sr12EnemyTurn==='function'?sr12EnemyTurn:null,chooseTargetSave:sr29SoloChooseTargetSaveAbility,multiplayerStartGrapple:sr29MpStartGrapple,multiplayerResolveGrappleSave:sr29MpResolveGrappleSave,multiplayerPruneGrappleChallenges:sr29MpPruneGrappleChallenges,multiplayerGrappleMovePlan:sr29MpGrappleMovePlan,multiplayerVoluntaryMovementEligibility:sr29MpVoluntaryMovementEligibility,multiplayerEscapeGrapple:sr29MpEscapeGrapple,reconcileAbstractGrapples:sr29ReconcileAbstractGrapples,appendageCapacity:sr29CreatureGrappleAppendageCapacity,nextAppendageSlot:sr29NextMonsterAppendageSlot};
}
