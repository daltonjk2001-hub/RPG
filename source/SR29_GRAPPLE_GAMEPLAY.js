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
function sr29SoloActiveGrapples(actor){
  const id=sr29SoloGrapplerId(actor);
  const targets=[...(state?.combat?.enemies||[]),state?.character].filter(Boolean);
  return targets.flatMap(target=>sr29Entries(target).filter(item=>item.name==='grappled'&&String(item.grapplerId||item.sourceId||'')===id));
}
function sr29SoloFreeHands(actor){
  const weapon=WEAPONS?.[actor?.weapon]||{};
  const weaponHands=Number(weapon.hands||weapon.handedness||((weapon.twoHanded||weapon.properties?.includes?.('Two-Handed'))?2:1));
  const shieldEquipped=!!(actor?.shieldEquipped||actor?.shield||actor?.offHandShield||actor?.equipment?.shield);
  return Math.max(0,2-Math.min(2,Math.max(0,weaponHands||0))-(shieldEquipped?1:0));
}
function sr29SoloTargetSave(target,ability){
  const key=String(ability||'').toUpperCase();
  const score=Number(target?.stats?.[key]??10);
  const saveMap=target?.saves||target?.savingThrows||target?.statBlock?.saves||{};
  const saved=Number(saveMap[key]??saveMap[key.toLowerCase()]);
  const bonus=Number.isFinite(saved)?saved:Math.floor((score-10)/2);
  const roll=die(20),total=roll+bonus;
  return {ability:key,roll,bonus,total,success:roll===20||(roll!==1&&total>=0)};
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
  const chosen=typeof prompt==='function'?prompt('The target chooses a saving throw: enter STR or DEX.','STR'): 'STR';
  const ability=String(chosen===null?'STR':chosen||'').trim().toUpperCase();
  if(!['STR','DEX'].includes(ability)){toast('Choose STR or DEX; the grapple attempt is not completed.');return false;}
  const save=sr29SoloTargetSave(e,ability);
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
  const skillKey=skill==='athletics'?'Athletics':'Acrobatics';
  const mode=sr29SkillMode(c,skillKey),roll=sr7RollD20(mode),bonus=skillBonus(skillKey),result=sr29EscapeGrapple(c,{instanceId:grapple.id,ability:skillKey,roll,bonus});
  if(result.escaped)log(`${c.name} escapes the grapple with ${skillKey}: ${roll} + ${bonus} = ${result.total} vs DC ${result.dc}.`,'goodlog');
  else log(`${c.name} fails to escape with ${skillKey}: ${roll} + ${bonus} = ${result.total} vs DC ${result.dc}. The grapple remains.`,'badlog');
  afterPlayerAction();render();save();return true;
}

const sr29SoloCombatPageBase=combatPage;
combatPage=function(){
  const html=sr29SoloCombatPageBase();
  if(!state?.combat||state.combat.mp||!state.character)return html;
  const c=state.character,grappled=sr29Entries(c).some(item=>item.name==='grappled');
  const canGrapple=!!targetEnemy()&&!grappled;
  const controls='<section class="card"><h3>Grapple</h3><p class="smalltext muted">Unarmed Strike grapple: hit first, then the target chooses a Strength or Dexterity saving throw. Escape uses an action and Athletics or Acrobatics.</p><div class="item-actions">'+
    (canGrapple?'<button class="btn small" data-action="sr29-grapple">Unarmed Strike · Grapple</button>':'')+
    (grappled?'<button class="btn small" data-action="sr29-escape-grapple">Escape Grapple · Action</button>':'')+
    '</div></section>';
  return html+controls;
};
document.addEventListener('click',function(event){
  const button=event.target?.closest?.('button[data-action="sr29-grapple"],button[data-action="sr29-escape-grapple"]');
  if(!button)return;
  event.preventDefault();event.stopImmediatePropagation();
  try{if(button.dataset.action==='sr29-grapple')sr29SoloStartPlayerGrapple();else sr29SoloEscapeGrapple();}
  catch(error){console.error('V29 grapple action failed',error);toast('Grapple action failed safely; no action was consumed.');}
},true);

// In the abstract-distance solo combat mode, a grappled enemy stays adjacent while
// the grappler moves. The additional movement is charged before the turn budget is
// considered exhausted; the Tiny/two-sizes-smaller exceptions remain service-owned.
const sr29SoloMoveBase=sr7Move;
sr7Move=function(direction){
  const c=state?.character,b=state?.combat;
  if(!b||b.mp||!c)return sr29SoloMoveBase(direction);
  const id=sr29SoloGrapplerId(c),held=(b.enemies||[]).filter(enemy=>sr29Entries(enemy).some(item=>item.name==='grappled'&&String(item.grapplerId||item.sourceId||'')===id));
  if(!held.length||!['closer','retreat'].includes(direction))return sr29SoloMoveBase(direction);
  const enemy=held[0],baseSpeed=Math.max(0,(c.baseMovement||c.movement||30)+(c.movementBonus||0)-(sr7HasCondition(c,'prone')?15:0)-5*(Number(c.exhaustion)||0));
  const allowance=baseSpeed*(c.dashUsed?2:1),before=Number(c.movementSpent)||0,remaining=Math.max(0,allowance-before);
  const planned=Math.min(baseSpeed,remaining/2);
  if(!planned)return sr29SoloMoveBase(direction);
  const cost=sr29GrappleMovementCost(c,enemy,planned,{grapplerSize:sr29SoloSize(c)||'medium',targetSize:sr29SoloSize(enemy)||'medium'});
  const oldDistance=Number(enemy.distance)||5,temporarySpent=allowance-planned;
  c.movementSpent=temporarySpent;
  sr29SoloMoveBase(direction);
  const moved=(Number(c.movementSpent)||0)>temporarySpent;
  if(moved){
    c.movementSpent=Math.min(allowance,before+cost.movementCost);
    enemy.distance=5;
    log(`Dragging ${enemy.name} costs ${cost.movementCost} feet of movement${cost.speedHalved?' (speed halved)':''}.`,'rolllog');
    sr29ReconcileCombatGrapples(state);
    render();save();
  }else{c.movementSpent=before;enemy.distance=oldDistance;}
};

if(globalThis.__SR29_TEST){
  globalThis.__SR29_TEST.gameplay={version:SR29_GRAPPLE_GAMEPLAY_VERSION,freeHands:sr29SoloFreeHands,activeGrapples:sr29SoloActiveGrapples};
}
