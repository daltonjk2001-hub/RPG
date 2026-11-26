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
function sr29MpStartGrapple(player){
  const b=state?.combat,c=player?.character,e=sr4Target();
  if(!b?.mp||!player||!c||!e||e.hp<=0)return false;
  if(sr12TurnActor()?.id!==player.id){toast('It is not your initiative turn.');return false;}
  if(c.actionSpent){toast('Your Action is already spent.');return false;}
  if(!sr29CanAct(c,'action')){toast('Your condition prevents you from taking this action.');return false;}
  const from=sr12PlayerPos(player.id),distance=sr12Distance(from,e.pos),reach=5;
  const grappler={...c,id:player.id,name:player.name||c.name};
  const grapplerSize=sr29MpSize(c),targetSize=sr29MpSize(e);
  const freeHands=c.freeHands===false?0:Number.isFinite(Number(c.freeHands))?Math.max(0,Number(c.freeHands)):sr29SoloFreeHands(c);
  const activeGrapples=sr29MpActiveGrapples(player);
  const eligibility=sr29GrappleEligibility(grappler,e,{grapplerSize,targetSize,freeHands,activeGrapples,distance,reach});
  if(!eligibility.legal){toast(({ 'target-too-large':'The target is too large to grapple.','no-free-hand':'You need a free hand.','out-of-reach':'Move within 5 feet first.'})[eligibility.reason]||'You cannot grapple that target.');return false;}
  const bonus=mod(c.stats.STR)+profBonus(),attack=sr11RollAttack(bonus,c,e,true);
  const hit=attack.r===20||(attack.r!==1&&attack.total>=Number(e.ac||10));
  c.actionSpent=true;
  log(`${player.name} makes an Unarmed Strike to grapple ${e.name}: d20 ${attack.r} + ${bonus} = ${attack.total} vs AC ${e.ac||10}. ${hit?'Hit.':'Miss.'}`,hit?'goodlog':'badlog');
  if(hit){
    const ability=sr29SoloChooseTargetSaveAbility(e),escapeDC=sr29GrappleEscapeDC(grappler,{proficiencyBonus:profBonus()}),targetSave=sr29SoloTargetSave(e,ability,escapeDC);
    const result=sr29StartGrapple(grappler,e,{attackHit:true,grapplerSize,targetSize,freeHands,activeGrapples,distance,reach,proficiencyBonus:profBonus(),strengthScore:c.stats.STR,targetSave,source:'Unarmed Strike',handSlot:'main'});
    if(result.started)log(`${player.name} grapples ${e.name}; its ${ability} save is ${targetSave.total} vs DC ${result.escapeDC}.`,'goodlog');
    else if(result.reason==='target-saved')log(`${e.name} resists the grapple with its ${ability} save (${targetSave.total} vs DC ${result.escapeDC}).`,'rolllog');
    else log(`Grapple attempt did not apply: ${result.reason||'unknown reason'}.`,'muted');
  }
  sr29ReconcileCombatGrapples(state);
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
    if(state?.combat?.mp&&action==='grapple'){
      let result=false;sr12WithHero(player,()=>{result=sr29MpStartGrapple(player);});
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
    if(msg?.action==='escape-grapple')return sr12HeroAction(player,'escape-grapple',null,null,{ability:msg.ability});
    return sr29MpPriorHandleCombat(player,msg);
  };
}
if(typeof sr12CombatPage==='function'){
  const sr29MpPriorCombatPage=sr12CombatPage;
  sr12CombatPage=function(){
    let html=sr29MpPriorCombatPage();
    html=html.replace('>Grapple</button>','>Unarmed Strike · Grapple</button>');
    html=html.replace('<button class="btn small" data-action="mp-combat" data-move="escape-grapple">Escape grapple</button>',
      '<button class="btn small" data-action="sr29-mp-escape" data-ability="Athletics">Escape · Athletics</button><button class="btn small" data-action="sr29-mp-escape" data-ability="Acrobatics">Escape · Acrobatics</button>');
    return html;
  };
}
document.addEventListener('click',function(event){
  const button=event.target?.closest?.('button[data-action="sr29-mp-escape"]');
  if(!button||!state?.combat?.mp)return;
  event.preventDefault();event.stopImmediatePropagation();
  const ability=button.dataset.ability==='Acrobatics'?'Acrobatics':'Athletics';
  if(SR4.role==='guest')sr4Send({type:'COMBAT',action:'escape-grapple',ability});
  else if(SR4.role==='host'){
    const player=(state.campaign?.multiplayer?.players||[]).find(p=>p.id===SR4.myPlayerId);
    if(player)sr12HeroAction(player,'escape-grapple',null,null,{ability});
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
  sr12MoveHero=function(...args){
    const result=sr29PriorMoveHero.apply(this,args);
    sr29ReconcileCombatGrapples();
    return result;
  };
}
if(typeof sr131Maneuver==='function'){
  const sr29PriorManeuver=sr131Maneuver;
  sr131Maneuver=function(...args){
    const result=sr29PriorManeuver.apply(this,args);
    sr29ReconcileCombatGrapples();
    return result;
  };
}
if(typeof sr7ApplyMastery==='function'){
  const sr29PriorApplyMastery=sr7ApplyMastery;
  sr7ApplyMastery=function(...args){
    const result=sr29PriorApplyMastery.apply(this,args);
    sr29ReconcileAbstractGrapples();
    sr29ReconcileCombatGrapples();
    return result;
  };
}
if(typeof sr14CastSpellComplete==='function'){
  const sr29PriorCastSpell=sr14CastSpellComplete;
  sr14CastSpellComplete=function(...args){
    const result=sr29PriorCastSpell.apply(this,args);
    sr29ReconcileAbstractGrapples();
    sr29ReconcileCombatGrapples();
    return result;
  };
}

if(globalThis.__SR29_TEST){
  globalThis.__SR29_TEST.gameplay={version:SR29_GRAPPLE_GAMEPLAY_VERSION,freeHands:sr29SoloFreeHands,activeGrapples:sr29SoloActiveGrapples,chooseTargetSave:sr29SoloChooseTargetSaveAbility,multiplayerStartGrapple:sr29MpStartGrapple,multiplayerEscapeGrapple:sr29MpEscapeGrapple,reconcileAbstractGrapples:sr29ReconcileAbstractGrapples,appendageCapacity:sr29CreatureGrappleAppendageCapacity,nextAppendageSlot:sr29NextMonsterAppendageSlot};
}
