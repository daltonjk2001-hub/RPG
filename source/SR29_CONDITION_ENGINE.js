/* SOLO REALMS V29 — canonical 2024 SRD condition engine.
 * Condition applications retain independent durations; their effects do not stack.
 * Exhaustion is the explicit cumulative exception. Legacy string/object saves remain readable.
 */
const SR29_VERSION = '29.0.0';
const SR29_SCHEMA = 'solo-realms-condition-instance-v1';
const SR29_CONDITIONS = Object.freeze({
  blinded: Object.freeze({name:'Blinded', sight:false, attackDisadvantage:true, attacksAgainstAdvantage:true, sightChecksAutoFail:true}),
  charmed: Object.freeze({name:'Charmed', cannotHarmSource:true, sourceSocialAdvantage:true}),
  deafened: Object.freeze({name:'Deafened', hearing:false, hearingChecksAutoFail:true}),
  exhaustion: Object.freeze({name:'Exhaustion', cumulative:true, d20PenaltyPerLevel:2, speedPenaltyPerLevel:5, deathAtLevel:6}),
  frightened: Object.freeze({name:'Frightened', checksAndAttacksDisadvantageWhenSourceVisible:true, cannotApproachSource:true}),
  grappled: Object.freeze({name:'Grappled', speedZero:true, endsIfGrapplerIncapacitated:true}),
  incapacitated: Object.freeze({name:'Incapacitated', actions:false, bonusActions:false, reactions:false, endsConcentration:true}),
  invisible: Object.freeze({name:'Invisible', initiativeAdvantage:true, attackAdvantage:true, attacksAgainstDisadvantage:true}),
  paralyzed: Object.freeze({name:'Paralyzed', incapacitated:true, speedZero:true, autoFail:['STR','DEX'], attacksAgainstAdvantage:true, meleeCriticalWithin5:true}),
  petrified: Object.freeze({name:'Petrified', incapacitated:true, speedZero:true, autoFail:['STR','DEX'], attacksAgainstAdvantage:true, resistanceAllDamage:true, immuneConditions:['poisoned']}),
  poisoned: Object.freeze({name:'Poisoned', attacksAndChecksDisadvantage:true}),
  prone: Object.freeze({name:'Prone', attacksDisadvantage:true, meleeAttacksAgainstAdvantageWithin5:true, rangedAttacksAgainstDisadvantage:true, crawlOrStand:true}),
  restrained: Object.freeze({name:'Restrained', speedZero:true, attacksAgainstAdvantage:true, attacksDisadvantage:true, dexSavesDisadvantage:true}),
  stunned: Object.freeze({name:'Stunned', incapacitated:true, autoFail:['STR','DEX'], attacksAgainstAdvantage:true}),
  unconscious: Object.freeze({name:'Unconscious', incapacitated:true, prone:true, speedZero:true, autoFail:['STR','DEX'], attacksAgainstAdvantage:true, meleeCriticalWithin5:true})
});
const SR29_CONDITION_NAMES = Object.freeze(Object.keys(SR29_CONDITIONS));
let SR29_INSTANCE_SEQUENCE = 0;
let SR29_COMBAT_CYCLE = 0;
let SR29_PHASE = 'player';

function sr29Name(value) {
  const raw = typeof value === 'string' ? value : value?.name || value?.condition || '';
  return String(raw).trim().toLowerCase().replace(/[\s_]+/g,'-');
}
function sr29RoundCount(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : null;
}
function sr29NextId(target) {
  const next = Math.max(0, Number(target?._sr29NextConditionId) || 0) + 1;
  if (target) target._sr29NextConditionId = next;
  SR29_INSTANCE_SEQUENCE++;
  return 'sr29-' + next + '-' + SR29_INSTANCE_SEQUENCE;
}
function sr29Entries(target) {
  if (!target) return [];
  if (!Array.isArray(target.conditions)) target.conditions = [];
  const normalized = [];
  for (const raw of target.conditions) {
    const name = sr29Name(raw);
    if (!name) continue;
    const old = typeof raw === 'string' ? {name,source:'legacy save',permanent:true} : {...raw,name};
    let duration = sr29RoundCount(old.rounds);
    if (duration === null) duration = sr29RoundCount(old.duration);
    const permanent = !!old.permanent || duration === null || duration < 0;
    if (!permanent && duration <= 0) continue;
    const rounds = permanent ? null : duration;
    normalized.push({...old,id:old.id||old.instanceId||sr29NextId(target),name,
      source:String(old.source||'legacy save'),permanent,rounds,duration:permanent?-1:rounds});
  }
  target.conditions = normalized;
  return normalized;
}
function sr29BaseHas(target, name) {
  const key = sr29Name(name);
  if (!target || !key) return false;
  if (key === 'exhaustion') return Math.max(0,Number(target.exhaustion)||0)>0 ||
    sr29Entries(target).some(x=>x.name==='exhaustion');
  return sr29Entries(target).some(x=>x.name===key && (x.permanent || Number(x.rounds)>0));
}
function sr29Has(target, name) {
  const key = sr29Name(name);
  if (key === 'incapacitated' && ['paralyzed','petrified','stunned','unconscious'].some(n=>sr29BaseHas(target,n))) return true;
  if (key === 'prone' && sr29BaseHas(target,'unconscious')) return true;
  return sr29BaseHas(target,key);
}
function sr29IsImmune(target, name) {
  const key=sr29Name(name);
  if (!key) return false;
  const list=[...(Array.isArray(target?.conditionImmunities)?target.conditionImmunities:[]),
    ...(Array.isArray(target?.immunities?.conditions)?target.immunities.conditions:[]),
    ...(Array.isArray(target?.immunities?.condition)?target.immunities.condition:[])].map(sr29Name);
  return list.includes(key) || (sr29Has(target,'petrified') && key==='poisoned');
}
function sr29BreakConcentration(target) {
  if (!target || !sr29Has(target,'incapacitated')) return false;
  const had=!!target.concentration;
  target.concentration=null;
  if (Array.isArray(target.activeEffects)) target.activeEffects=target.activeEffects.filter(x=>!x?.concentration&&x?.kind!=='concentration');
  return had;
}
function sr29ChangeExhaustion(target, delta=1) {
  if (!target) throw new Error('An exhaustion target is required.');
  const amount=Number(delta);
  if (!Number.isFinite(amount)||!Number.isInteger(amount)) throw new Error('Exhaustion change must be a whole number.');
  const before=Math.max(0,Math.min(6,Math.floor(Number(target.exhaustion)||0)));
  const after=Math.max(0,Math.min(6,before+amount));
  target.exhaustion=after;
  const result={before,after,delta:after-before,dead:after>=6,changed:after!==before};
  if(result.dead){target.hp=0;target.dead=true;target.exhaustionDeath=true;}
  return result;
}
function sr29Apply(target,name,duration=1,source='effect',options={}) {
  if(!target)return {applied:false,reason:'missing-target'};
  const key=sr29Name(name);
  if(!key)return {applied:false,reason:'missing-condition'};
  if(key==='exhaustion')return {applied:true,exhaustion:sr29ChangeExhaustion(target,Number(options.levels)||1)};
  if(sr29IsImmune(target,key))return {applied:false,immune:true,condition:key};
  const entries=sr29Entries(target);
  const rawDuration=duration==='permanent'||duration===null?null:sr29RoundCount(duration);
  if(rawDuration!==null&&rawDuration<0)throw new Error('Condition duration must be a positive whole number or permanent.');
  if(rawDuration===0)return {applied:false,reason:'zero-duration'};
  const instanceId=String(options.instanceId||options.id||sr29NextId(target));
  const existing=entries.find(x=>x.id===instanceId);
  const item={...(existing||{}),schema:SR29_SCHEMA,id:instanceId,name:key,source:String(source||options.source||'effect'),
    permanent:rawDuration===null||!!options.permanent,
    rounds:rawDuration===null||options.permanent?null:rawDuration,
    duration:rawDuration===null||options.permanent?-1:rawDuration,
    appliedCycle:SR29_COMBAT_CYCLE,appliedPhase:SR29_PHASE};
  if(options.sourceId!==undefined)item.sourceId=String(options.sourceId);
  if(options.sourceVisible!==undefined)item.sourceVisible=!!options.sourceVisible;
  if(options.grapplerId!==undefined)item.grapplerId=String(options.grapplerId);
  if(key==='grappled'){
    const grappleRange=Number(options.grappleRange??options.grappleReach??5);
    if(!Number.isFinite(grappleRange)||grappleRange<=0)throw new Error('Grapple reach must be a positive number of feet.');
    item.grappleRange=grappleRange;
    const grapplerId=options.grapplerId??options.sourceId;
    if(grapplerId!==undefined&&grapplerId!==null&&String(grapplerId).trim())item.grapplerId=String(grapplerId);
  }
  if(existing)Object.assign(existing,item);else entries.push(item);
  target.conditions=entries;
  if(key==='grappled'||key==='incapacitated'||['paralyzed','petrified','stunned','unconscious'].includes(key))sr29ReconcileCombatGrapples();
  const brokeConcentration=sr29BreakConcentration(target);
  return {applied:true,condition:key,instance:item,brokeConcentration,activeInstances:entries.filter(x=>x.name===key).length};
}
function sr29Remove(target,name,options={}) {
  if(!target)return {removed:0};
  const key=sr29Name(name),beforeUnconscious=sr29Has(target,'unconscious'),entries=sr29Entries(target),kept=[];
  let removed=0;
  for(const item of entries){
    const match=item.name===key&&(options.instanceId===undefined||item.id===String(options.instanceId))&&
      (options.source===undefined||item.source===String(options.source));
    if(match)removed++;else kept.push(item);
  }
  target.conditions=kept;
  if(key==='exhaustion'&&Number.isInteger(options.levels))sr29ChangeExhaustion(target,-Math.abs(options.levels));
  if(beforeUnconscious&&!sr29Has(target,'unconscious'))sr29Apply(target,'prone','permanent','unconscious condition ended',{instanceId:'sr29-prone-after-unconscious'});
  return {removed,remaining:kept.filter(x=>x.name===key).length};
}
function sr29Tick(target,options={}) {
  if(!target)return {expired:0,skipped:0,remaining:0};
  const beforeUnconscious=sr29Has(target,'unconscious');
  const cycle=Number.isInteger(options.cycle)?options.cycle:SR29_COMBAT_CYCLE,phase=String(options.phase||SR29_PHASE);
  let expired=0,skipped=0;
  const kept=[];
  for(const item of sr29Entries(target)){
    if(item.permanent||!Number.isFinite(Number(item.rounds))){kept.push(item);continue;}
    if(item.appliedCycle===cycle&&item.appliedPhase===phase&&phase==='enemy'){skipped++;kept.push(item);continue;}
    const next=Math.max(0,Number(item.rounds)-1);
    if(next<=0)expired++;else kept.push({...item,rounds:next,duration:next});
  }
  target.conditions=kept;
  if(beforeUnconscious&&!sr29Has(target,'unconscious'))sr29Apply(target,'prone','permanent','unconscious condition ended',{instanceId:'sr29-prone-after-unconscious'});
  return {expired,skipped,remaining:kept.length};
}
function sr29Names(target) {
  const names=sr29Entries(target).map(x=>x.name);
  if(sr29Has(target,'exhaustion'))names.push('exhaustion');
  if(sr29Has(target,'incapacitated'))names.push('incapacitated');
  if(sr29Has(target,'prone'))names.push('prone');
  return [...new Set(names)];
}
function sr29Status(target) {
  if(typeof state!=='undefined'&&state?.combat)sr29ReconcileCombatGrapples();
  const exhaustion=Math.max(0,Math.min(6,Math.floor(Number(target?.exhaustion)||0)));
  const speedZero=['grappled','paralyzed','petrified','restrained','unconscious'].some(n=>sr29Has(target,n));
  const incap=sr29Has(target,'incapacitated');
  return {conditions:sr29Names(target),exhaustion,d20Penalty:2*exhaustion,speedPenalty:5*exhaustion,
    speedOverride:speedZero?0:null,incapacitated:incap,canAct:!incap,canBonusAction:!incap,canReact:!incap,
    movementMode:sr29Has(target,'prone')?'crawl-or-stand':'normal',concentrationEnds:incap,
    autoFailAbilities:['STR','DEX'].filter(a=>sr29AutoFailSave(target,a)),
    resistanceAllDamage:sr29Has(target,'petrified'),conditionImmunities:sr29Has(target,'petrified')?['poisoned']:[],
    effectiveSpeed:speedZero?0:Math.max(0,Number(target?.baseMovement??target?.baseSpeed??target?.movement??target?.speed??30)-5*exhaustion)};
}
function sr29AutoFailSave(target,ability) {
  const key=String(ability||'').toUpperCase().slice(0,3);
  if(!['STR','DEX'].includes(key))return false;
  return ['paralyzed','petrified','stunned','unconscious'].some(n=>sr29Has(target,n));
}
function sr29FrightSourceVisible(actor,options={}) {
  if(typeof options.frightenedSourceVisible==='boolean')return options.frightenedSourceVisible;
  const item=sr29Entries(actor).find(x=>x.name==='frightened');
  if(item&&typeof item.sourceVisible==='boolean')return item.sourceVisible;
  return item?.sourceOutOfSight===true?false:false;
}
function sr29AttackState(attacker,target,options={}) {
  if(typeof state!=='undefined'&&state?.combat)sr29ReconcileCombatGrapples();
  const melee=!!options.melee,distance=Number.isFinite(Number(options.distance))?Number(options.distance):(melee?5:Infinity);
  let advantage=false,disadvantage=false;
  const add=(a,d)=>{advantage=advantage||a;disadvantage=disadvantage||d;};
  add(false,sr29Has(attacker,'blinded')||sr29Has(attacker,'poisoned')||sr29Has(attacker,'prone')||sr29Has(attacker,'restrained'));
  if(sr29Has(attacker,'frightened')&&sr29FrightSourceVisible(attacker,options))add(false,true);
  add((sr29Has(attacker,'invisible')||attacker?.invisible===true||attacker?.hidden===true)&&!(options.targetCanSeeInvisible===true||sr29CanSeeInvisible(target)),false);
  const grappleEffect=sr29Entries(attacker).find(x=>x.name==='grappled');
  if(grappleEffect){
    const grapplerId=String(grappleEffect.grapplerId||grappleEffect.sourceId||'');
    const targetId=String(target?.id||target?.name||'');
    if(!grapplerId||grapplerId!==targetId)add(false,true);
  }
  add(false,(sr29Has(target,'invisible')||target?.invisible===true)&&!options.canSeeInvisible);
  add(sr29Has(target,'blinded')||target?.blinded===true||sr29Has(target,'restrained')||sr29Has(target,'paralyzed')||
      sr29Has(target,'petrified')||sr29Has(target,'stunned')||sr29Has(target,'unconscious'),false);
  if(sr29Has(target,'prone')){if(distance<=5)add(true,false);else add(false,true);}
  if(advantage&&disadvantage)return {mode:'normal',advantage:false,disadvantage:false,cancelled:true};
  return {mode:advantage?'advantage':disadvantage?'disadvantage':'normal',advantage,disadvantage,cancelled:false};
}
function sr29SkillMode(actor,skill,options={}) {
  let disadvantage=false;
  if(sr29Has(actor,'poisoned'))disadvantage=true;
  if(sr29Has(actor,'frightened')&&sr29FrightSourceVisible(actor,options))disadvantage=true;
  const key=String(skill||'').toLowerCase();
  if(sr29Has(actor,'blinded')&&options.requiresSight===true)return 'auto-fail';
  if(sr29Has(actor,'deafened')&&(options.requiresHearing===true||/^(hearing|listen)$/.test(key)))return 'auto-fail';
  return disadvantage?'disadvantage':'normal';
}
function sr29CriticalOnHit(target,options={}) {
  return !!options.hit&&Number(options.distance??5)<=5&&
    (sr29Has(target,'paralyzed')||sr29Has(target,'unconscious'));
}
function sr29CanMoveToward(actor,target) {
  if (!sr29Has(actor,'frightened') || !sr29FrightSourceVisible(actor,{})) return true;
  const effect=sr29Entries(actor).find(x=>x.name==='frightened');
  const source=String(effect?.sourceId||effect?.sourceName||'');
  const targetId=String(target?.id||target?.name||'');
  return !source || source!==targetId;
}
function sr29CannotHarm(actor,target) {
  if (!sr29Has(actor,'charmed')) return false;
  const effect=sr29Entries(actor).find(x=>x.name==='charmed');
  const source=String(effect?.sourceId||effect?.sourceName||'');
  const targetId=String(target?.id||target?.name||'');
  return !!source && source===targetId;
}
function sr29SocialCheckAdvantage(actor,target) {
  if (!sr29Has(target,'charmed')) return false;
  const effect=sr29Entries(target).find(x=>x.name==='charmed');
  const source=String(effect?.sourceId||effect?.sourceName||'');
  return !!source && source===String(actor?.id||actor?.name||'');
}
function sr29CanAct(actor,actionType='action') {
  const status=sr29Status(actor);
  const kind=String(actionType||'action').trim().toLowerCase().replace(/[ _]+/g,'-');
  if(kind==='reaction')return status.canReact;
  if(kind==='bonus'||kind==='bonus-action')return status.canBonusAction;
  if(kind==='action'||kind==='legendary-action'||kind==='special-action')return status.canAct;
  return status.canAct;
}
function sr29CanMove(actor){return sr29Status(actor).speedOverride!==0;}
function sr29LongRestExhaustion(actor) {
  if(!actor||Number(actor.exhaustion)<=0)return {changed:false,before:Number(actor?.exhaustion)||0,after:Number(actor?.exhaustion)||0};
  const result=sr29ChangeExhaustion(actor,-1);
  return {changed:result.changed,before:result.before,after:result.after};
}



function sr29Participant(actor,pos,aliases=[]) {
  if(!actor||typeof actor!=='object')return null;
  const ids=[...aliases,actor.id,actor.name].filter(x=>x!==undefined&&x!==null&&String(x).trim()).map(String);
  return {actor,pos:pos&&typeof pos==='object'?pos:(actor.pos||actor.position||null),ids:[...new Set(ids)]};
}
function sr29CombatParticipants(snapshot=state) {
  const participants=[];
  const add=(actor,pos,aliases=[])=>{
    const row=sr29Participant(actor,pos,aliases);
    if(!row)return;
    const existing=participants.find(x=>x.actor===actor);
    if(existing){existing.ids=[...new Set([...existing.ids,...row.ids])];if(!existing.pos)existing.pos=row.pos;}
    else participants.push(row);
  };
  const combat=snapshot?.combat||{};
  if(combat.mp&&typeof sr12AllHeroPositions==='function'){
    try{
      for(const item of sr12AllHeroPositions()||[]){
        const player=item?.player||{};
        add(player.character||item?.character,item?.pos||player.pos,[player.id,player.name]);
      }
    }catch(error){}
  }
  if(snapshot?.character){
    add(snapshot.character,combat.heroPos||snapshot.heroPos||snapshot.character.pos,
      combat.mp?[]:['solo']);
  }
  for(const enemy of combat.enemies||[])add(enemy,enemy?.pos||enemy?.position);
  return participants;
}
function sr29DistanceBetween(a,b,options={}) {
  if(typeof options.distance==='function'){
    const measured=Number(options.distance(a,b));
    return Number.isFinite(measured)?measured:null;
  }
  if(typeof sr12Distance==='function'){
    try{const measured=Number(sr12Distance(a,b));if(Number.isFinite(measured))return measured;}catch(error){}
  }
  const ax=Number(a?.x),ay=Number(a?.y),bx=Number(b?.x),by=Number(b?.y);
  if([ax,ay,bx,by].every(Number.isFinite))return Math.max(Math.abs(ax-bx),Math.abs(ay-by))*5;
  return null;
}
function sr29ReleaseGrapple(target,options={}) {
  if(!target)return {released:false,removed:0};
  const matches=sr29Entries(target).filter(item=>item.name==='grappled'&&
    (options.instanceId===undefined||item.id===String(options.instanceId))&&
    (options.grapplerId===undefined||String(item.grapplerId||item.sourceId||'')===String(options.grapplerId)));
  let removed=0;
  for(const item of matches)removed+=sr29Remove(target,'grappled',{instanceId:item.id}).removed;
  return {released:removed>0,removed};
}
function sr29ReconcileGrapples(participants,options={}) {
  const rows=(participants||[]).map(item=>{
    if(item?.actor)return sr29Participant(item.actor,item.pos,item.ids||[]);
    const actor=item?.player?.character||item?.character||item;
    return sr29Participant(actor,item?.pos||actor?.pos||actor?.position,[item?.player?.id,item?.player?.name]);
  }).filter(Boolean);
  const released=[];
  for(const holder of rows){
    for(const grapple of sr29Entries(holder.actor).filter(item=>item.name==='grappled')){
      const grapplerId=String(grapple.grapplerId||grapple.sourceId||'');
      if(!grapplerId)continue;
      const grappler=rows.find(item=>item.actor!==holder.actor&&item.ids.includes(grapplerId));
      if(!grappler)continue;
      let reason='';
      if(sr29Has(grappler.actor,'incapacitated'))reason='grappler-incapacitated';
      else if(holder.pos&&grappler.pos){
        const distance=sr29DistanceBetween(holder.pos,grappler.pos,options);
        const range=Number(grapple.grappleRange??grapple.grappleReach??5);
        if(Number.isFinite(distance)&&Number.isFinite(range)&&distance>range)reason='target-outside-grapple-range';
      }
      if(reason){
        const result=sr29ReleaseGrapple(holder.actor,{instanceId:grapple.id});
        if(result.released)released.push({targetId:String(holder.actor.id||holder.actor.name||''),grapplerId,instanceId:grapple.id,reason});
      }
    }
  }
  return {count:released.length,released};
}
function sr29GrappleEligibility(grappler,target,options={}) {
  if(!grappler||!target)return {legal:false,reason:'missing-creature'};
  const sizeOrder=['tiny','small','medium','large','huge','gargantuan'];
  const grapplerSize=String(options.grapplerSize??grappler.size??'').trim().toLowerCase();
  const targetSize=String(options.targetSize??target.size??'').trim().toLowerCase();
  if(!sizeOrder.includes(grapplerSize)||!sizeOrder.includes(targetSize))
    return {legal:false,reason:'unknown-size'};
  if(sizeOrder.indexOf(targetSize)>sizeOrder.indexOf(grapplerSize)+1)
    return {legal:false,reason:'target-too-large'};
  const freeHands=Number(options.freeHands);
  if(!Number.isFinite(freeHands)||freeHands<0)
    return {legal:false,reason:'free-hands-unknown'};
  const grapplerId=String(grappler.id||grappler.name||'');
  const active=Array.isArray(options.activeGrapples)?options.activeGrapples:[];
  const occupied=active.filter(item=>{
    const holder=String(item?.grapplerId??item?.sourceId??'');
    return !holder||!grapplerId||holder===grapplerId;
  }).length;
  if(freeHands-occupied<1)return {legal:false,reason:'no-free-hand'};
  const distance=Number(options.distance);
  const reach=Number(options.reach);
  if(!Number.isFinite(distance)||distance<0||!Number.isFinite(reach)||reach<=0)
    return {legal:false,reason:'distance-or-reach-unknown'};
  if(distance>reach)return {legal:false,reason:'out-of-reach'};
  return {legal:true,reason:null,grapplerSize,targetSize,freeHandsRemaining:freeHands-occupied};
}
function sr29ReconcileCombatGrapples(snapshot=state) {
  if(!snapshot?.combat)return {count:0,released:[]};
  return sr29ReconcileGrapples(sr29CombatParticipants(snapshot));
}

function sr29Html(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[ch]);
}
function sr29UiTargets(snapshot=state) {
  const out=[];
  if(snapshot?.character)out.push({key:'player',label:'You · '+String(snapshot.character.name||'Player character'),actor:snapshot.character});
  if(snapshot?.combat?.mp){
    const localId=String(snapshot.character?.id||snapshot.character?.name||'');
    for(const player of snapshot.campaign?.multiplayer?.players||[]){
      const actor=player?.character;
      if(!actor||actor===snapshot.character)continue;
      const id=String(player.id||player.playerId||actor.id||actor.name||'');
      if(!id||id===localId||out.some(item=>item.actor===actor||item.key==='player:'+id))continue;
      out.push({key:'player:'+id,label:'Party · '+String(actor.name||player.name||'Player'),actor});
    }
  }
  for(const [index,enemy] of (snapshot?.combat?.enemies||[]).entries()) {
    if(!enemy||typeof enemy!=='object')continue;
    out.push({key:'enemy:'+index,label:'Enemy · '+String(enemy.name||('Enemy '+(index+1))),actor:enemy});
  }
  return out;
}
function sr29UiTarget(snapshot,key) {
  if(key==='player')return snapshot?.character||null;
  const partyMatch=String(key||'').match(/^player:(.+)$/);
  if(partyMatch&&snapshot?.combat?.mp){
    const player=(snapshot.campaign?.multiplayer?.players||[]).find(item=>String(item?.id||item?.playerId||item?.character?.id||item?.character?.name||'')===partyMatch[1]);
    return player?.character||null;
  }
  const match=String(key||'').match(/^enemy:(\d+)$/);
  if(!match)return null;
  return snapshot?.combat?.enemies?.[Number(match[1])]||null;
}
function sr29ApplyUiCondition(snapshot,targetKey,name,rounds=1,permanent=false,source='',sourceId='',sourceVisible=false,grappleRange=5) {
  const target=sr29UiTarget(snapshot,targetKey),key=sr29Name(name);
  if(!target)return {applied:false,reason:'missing-target'};
  const count=Math.max(1,Math.floor(Number(rounds)||1));
  const origin=String(source||'').trim()||'Manual application';
  const id=String(sourceId||'').trim();
  const options={levels:Math.min(6,count)};
  if(id){options.sourceId=id;if(key==='grappled')options.grapplerId=id;}
  if(key==='frightened')options.sourceVisible=sourceVisible===true;
  if(key==='grappled')options.grappleRange=Math.max(5,Number(grappleRange)||5);
  return sr29Apply(target,key,key==='exhaustion'?1:(permanent?'permanent':Math.min(99,count)),origin,options);
}
function sr29RemoveUiCondition(snapshot,targetKey,name,instanceId) {
  const target=sr29UiTarget(snapshot,targetKey),key=sr29Name(name);
  if(!target)return {removed:0,reason:'missing-target'};
  if(key==='exhaustion')return sr29Remove(target,key,{levels:1});
  if(key==='grappled')return sr29ReleaseGrapple(target,{instanceId:String(instanceId||'')});
  return sr29Remove(target,key,{instanceId:String(instanceId||'')});
}
function sr29ConditionPanel(snapshot=state) {
  if(!snapshot?.character)return '';
  const targets=sr29UiTargets(snapshot);
  const targetOptions=targets.map(x=>'<option value="'+sr29Html(x.key)+'">'+sr29Html(x.label)+'</option>').join('');
  const conditionOptions=SR29_CONDITION_NAMES.map(name=>'<option value="'+sr29Html(name)+'">'+sr29Html(SR29_CONDITIONS[name].name)+'</option>').join('');
  const sections=targets.map(({key,label,actor})=>{
    const entries=sr29Entries(actor);
    const rows=entries.map(item=>{
      const title=SR29_CONDITIONS[item.name]?.name||item.name;
      const duration=item.permanent?'Permanent':String(item.rounds)+' round'+(Number(item.rounds)===1?'':'s');
      const grappleDetail=item.name==='grappled'?' · Grappler: '+sr29Html(item.grapplerId||item.sourceId||'unknown')+' · Reach: '+sr29Html(item.grappleRange||5)+' ft':'';
      const actionLabel=item.name==='grappled'?'Release grapple':'Remove';
      return '<div class="item-row"><div><strong>'+sr29Html(title)+'</strong><div class="tagline">'+sr29Html(item.source||'Unknown source')+' · '+duration+grappleDetail+'</div></div><button class="btn small" type="button" data-sr29-action="remove" data-sr29-target="'+sr29Html(key)+'" data-sr29-condition="'+sr29Html(item.name)+'" data-sr29-instance="'+sr29Html(item.id)+'">'+actionLabel+'</button></div>';
    }).join('');
    const levels=Math.max(0,Math.min(6,Math.floor(Number(actor.exhaustion)||0)));
    const exhaustion=levels?'<div class="item-row"><div><strong>Exhaustion · Level '+levels+'</strong><div class="tagline">Cumulative D20-test and Speed penalties</div></div><button class="btn small" type="button" data-sr29-action="remove" data-sr29-target="'+sr29Html(key)+'" data-sr29-condition="exhaustion">Reduce 1 level</button></div>':'';
    return '<div class="shop-item"><strong>'+sr29Html(label)+'</strong>'+(rows||'')+exhaustion+(!rows&&!exhaustion?'<p class="muted smalltext">No active conditions.</p>':'')+'</div>';
  }).join('');
  return '<section class="card" id="sr29-condition-panel"><div class="eyebrow">V29 · Condition management</div><h3>Conditions &amp; effects</h3><p class="muted smalltext">Manage conditions for your character and active solo-combat enemies. Repeated applications retain separate sources and durations; their effects do not stack. Enter the source creature name or ID when a rule depends on a specific source.</p><div class="two-col"><div class="field"><label for="sr29-target">Target</label><select id="sr29-target">'+targetOptions+'</select></div><div class="field"><label for="sr29-condition">Condition</label><select id="sr29-condition">'+conditionOptions+'</select></div><div class="field"><label for="sr29-source">Source name</label><input id="sr29-source" maxlength="120" placeholder="Spell, creature, or effect"></div><div class="field"><label for="sr29-source-id">Source creature ID/name</label><input id="sr29-source-id" maxlength="120" placeholder="Needed for Charmed, Frightened, Grappled"></div><div class="field"><label for="sr29-rounds">Duration (rounds) / Exhaustion (levels)</label><input id="sr29-rounds" type="number" min="1" max="99" value="2"></div><div class="field"><label for="sr29-grapple-range">Grapple reach (feet; default 5)</label><input id="sr29-grapple-range" type="number" min="5" max="120" value="5"></div><div class="field"><label><input id="sr29-permanent" type="checkbox"> Permanent until removed</label><label><input id="sr29-source-visible" type="checkbox"> Frightened source is in line of sight</label></div></div><button class="btn" type="button" data-sr29-action="apply">Apply condition</button><div class="divider"></div>'+sections+'</section>';
}
if(typeof adventurePage==='function') {
  const sr29AdventurePageBase=adventurePage;
  adventurePage=function(){return sr29AdventurePageBase()+sr29ConditionPanel();};
}
if(typeof app!=='undefined'&&app?.addEventListener) {
  app.addEventListener('click',function(event) {
    const button=event.target?.closest?.('[data-sr29-action]');
    if(!button)return;
    const action=button.dataset.sr29Action;
    if(action==='apply') {
      const value=id=>document.getElementById(id)?.value;
      const checked=id=>document.getElementById(id)?.checked===true;
      const result=sr29ApplyUiCondition(state,value('sr29-target')||'player',value('sr29-condition'),
        value('sr29-rounds'),checked('sr29-permanent'),value('sr29-source'),value('sr29-source-id'),checked('sr29-source-visible'),value('sr29-grapple-range'));
      if(!result.applied) {
        if(typeof toast==='function')toast(result.immune?'That creature is immune to this condition.':'Could not apply the selected condition.');
        return;
      }
      if(typeof save==='function')save();
      if(typeof render==='function')render();
      if(typeof toast==='function')toast('Condition applied.');
      return;
    }
    if(action==='remove') {
      sr29RemoveUiCondition(state,button.dataset.sr29Target,button.dataset.sr29Condition,button.dataset.sr29Instance);
      if(typeof save==='function')save();
      if(typeof render==='function')render();
      if(typeof toast==='function')toast('Condition updated.');
    }
  },true);
}

// Compatibility adapters route legacy V5–V11 entry points through one engine.
if(typeof sr7ConditionName==='function')sr7ConditionName=function(x){return sr29Name(x);};
if(typeof sr7HasCondition==='function')sr7HasCondition=function(t,n){return sr29Has(t,n);};
if(typeof sr7ApplyCondition==='function')sr7ApplyCondition=function(t,n,rounds=1,source='effect'){return sr29Apply(t,n,rounds,source);};
if(typeof sr7ExpireConditions==='function')sr7ExpireConditions=function(t){return sr29Tick(t);};
if(typeof sr5ApplyCondition==='function')sr5ApplyCondition=function(t,n,duration=1){return sr29Apply(t,n,duration,'legacy sr5 effect');};
if(typeof sr5HasCondition==='function')sr5HasCondition=function(t,n){return sr29Has(t,n);};
if(typeof sr6Apply==='function')sr6Apply=function(t,n,rounds=1){return sr29Apply(t,n,rounds,'legacy sr6 effect');};
if(typeof sr6Has==='function')sr6Has=function(t,n){return sr29Has(t,n);};
if(typeof sr6Expire==='function')sr6Expire=function(t){return sr29Tick(t);};
if(typeof sr11Names==='function')sr11Names=function(list){return (list||[]).flatMap(x=>{const n=sr29Name(x);return n?[n]:[];}).filter((x,i,a)=>a.indexOf(x)===i);};
if(typeof sr11Has==='function')sr11Has=function(t,n){return sr29Has(t,n);};
if(typeof sr11Add==='function')sr11Add=function(t,n,duration=1,source='combat'){return sr29Apply(t,n,duration,source);};
if(typeof sr11Tick==='function')sr11Tick=function(t){return sr29Tick(t);};

// 2024 Exhaustion is a per-level D20 penalty and Speed reduction, not Disadvantage.
if(typeof skillBonus==='function'){
  const sr29PriorSkillBonus=skillBonus;
  skillBonus=function(skill){
    const c=state?.character,exhaustion=Math.max(0,Math.min(6,Math.floor(Number(c?.exhaustion)||0)));
    return sr29PriorSkillBonus(skill)-2*exhaustion;
  };
}
if(typeof sr7SkillCheck==='function'){
  sr7SkillCheck=function(skill,dc,context=''){
    const c=state?.character,mode=sr29SkillMode(c,skill,{});
    const finalDC=Math.max(5,Math.min(30,Number(dc)+sr7DifficultyShift()));
    if(mode==='auto-fail'){
      log((context||skill)+': the required sense is unavailable; the check automatically fails.','badlog');
      return {ok:false,d:null,total:null,bonus:skillBonus(skill),dc:finalDC,mode:'auto-fail'};
    }
    const bonus=skillBonus(skill),r=sr7RollD20(mode),total=r+bonus,ok=total>=finalDC;
    log((context||skill)+': d20 '+r+(mode==='disadvantage'?' (disadvantage)':'')+' + '+bonus+' = '+total+' vs DC '+finalDC+' — '+(ok?'SUCCESS':'FAILURE')+'.',ok?'goodlog':'badlog');
    return {ok,d:r,total,bonus,dc:finalDC,mode};
  };
  skillCheck=sr7SkillCheck;
}
if(typeof sr7AttackMode==='function'){
  sr7AttackMode=function(attacker,target){
    const distance=Number(target?.distance??attacker?.distance??5);
    const mode=sr29AttackState(attacker,target,{melee:distance<=5,distance});
    let adv=mode.advantage,dis=mode.disadvantage;
    if(attacker===state?.character){
      if(attacker.vexTarget===target?.name&&attacker.vexAdvantage)adv=true;
      if(attacker.hidden)adv=true;
      if(sr29Has(target,'marked'))adv=true;
    }else{
      if(attacker.vexed)adv=true;
      if(attacker.sapRounds>0)dis=true;
    }
    return adv===dis?'normal':adv?'advantage':'disadvantage';
  };
}

function sr29CanSeeInvisible(creature) {
  const senses=creature?.senses||{};
  return creature?.canSeeInvisible===true||creature?.seeInvisible===true||creature?.trueSight===true||
    Number(senses.truesight||senses.blindsight||0)>0;
}
function sr29AttackDistance(actor,target,melee=false) {
  for(const value of [target?.distance,actor?.distance])if(value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value)))return Number(value);
  let actorPos=actor?.pos||null,targetPos=target?.pos||null;
  const players=state?.campaign?.multiplayer?.players||[];
  const actorOwner=players.find(p=>p.character===actor),targetOwner=players.find(p=>p.character===target);
  if(actorOwner)actorPos=state?.combat?.mp?.heroPositions?.[actorOwner.id]||actorPos||(typeof sr12PlayerPos==='function'?sr12PlayerPos(actorOwner.id):null);
  else if(actor===state?.character)actorPos=state?.combat?.heroPos||actorPos;
  if(targetOwner)targetPos=state?.combat?.mp?.heroPositions?.[targetOwner.id]||targetPos||(typeof sr12PlayerPos==='function'?sr12PlayerPos(targetOwner.id):null);
  else if(target===state?.character)targetPos=state?.combat?.heroPos||targetPos;
  if(actorPos&&targetPos&&typeof sr12Distance==='function')return sr12Distance(actorPos,targetPos);
  return melee?5:Infinity;
}
if(typeof sr11RollAttack==='function'){
  const sr29PriorRollAttack=sr11RollAttack;
  sr11RollAttack=function(base,actor,target,melee=false){
    const exhaustion=Math.max(0,Math.min(6,Math.floor(Number(actor?.exhaustion)||0)));
    const originalActorConditions=Array.isArray(actor?.conditions)?actor.conditions.slice():null;
    const originalTargetConditions=Array.isArray(target?.conditions)?target.conditions.slice():null;
    const actorHadConditions=Array.isArray(actor?.conditions),targetHadConditions=Array.isArray(target?.conditions);
    const originalActorInvisible=actor?.invisible,originalTargetInvisible=target?.invisible;
    const temporarilyAdd=(creature,name)=>{
      if(!creature)return;
      if(!Array.isArray(creature.conditions))creature.conditions=[];
      if(!creature.conditions.some(x=>sr29Name(x)===name))creature.conditions.push(name);
    };
    const temporarilyRemove=(creature,name)=>{
      if(creature&&Array.isArray(creature.conditions))creature.conditions=creature.conditions.filter(x=>sr29Name(x)!==name);
    };
    const distance=sr29AttackDistance(actor,target,melee);
    const targetCanSeeActor=sr29CanSeeInvisible(target);
    const actorCanSeeTarget=sr29CanSeeInvisible(actor);
    const targetIsProne=sr29Has(target,'prone');
    const targetIsInvisible=sr29Has(target,'invisible')||target?.invisible===true;
    const actorIsInvisible=sr29Has(actor,'invisible')||actor?.invisible===true;
    try{
      // Project only condition modifiers missing from legacy wrappers; do not replace
      // the older Dodge, Vex, outline, resource, or spell-effect layers.
      if(sr29Has(actor,'frightened')&&sr29FrightSourceVisible(actor,{}))temporarilyAdd(actor,'poisoned');
      if(sr29Has(actor,'grappled')){
        const grapple=sr29Entries(actor).find(x=>x.name==='grappled');
        const grapplerId=String(grapple?.grapplerId||grapple?.sourceId||'');
        const targetId=String(target?.id||target?.name||'');
        if(!grapplerId||grapplerId!==targetId)temporarilyAdd(actor,'poisoned');
      }
      if(sr29Has(target,'petrified'))temporarilyAdd(target,'restrained');
      if(targetIsProne){
        temporarilyRemove(target,'prone');
        if(distance<=5)temporarilyAdd(target,'stunned');
        else temporarilyAdd(actor,'poisoned');
      }
      if(targetIsInvisible&&actorCanSeeTarget){
        temporarilyRemove(target,'invisible');
        if(target)target.invisible=false;
      }
      if(actorIsInvisible&&targetCanSeeActor){
        temporarilyRemove(actor,'invisible');
        if(actor)actor.invisible=false;
      }
      if(actor?.hidden===true&&actor&&!targetCanSeeActor)actor.invisible=true;
      return sr29PriorRollAttack(Number(base||0)-2*exhaustion,actor,target,melee);
    }finally{
      if(actorHadConditions)actor.conditions=originalActorConditions;else if(actor&&Object.prototype.hasOwnProperty.call(actor,'conditions'))delete actor.conditions;
      if(targetHadConditions)target.conditions=originalTargetConditions;else if(target&&Object.prototype.hasOwnProperty.call(target,'conditions'))delete target.conditions;
      if(actor){if(originalActorInvisible===undefined)delete actor.invisible;else actor.invisible=originalActorInvisible;}
      if(target){if(originalTargetInvisible===undefined)delete target.invisible;else target.invisible=originalTargetInvisible;}
    }
  };
}
if(typeof sr25ResolveCreatureSavingThrow==='function'){
  const sr29PriorCreatureSave=sr25ResolveCreatureSavingThrow;
  sr25ResolveCreatureSavingThrow=function(target,ability,rolls,modifier,dc,options={}){
    const forced=sr29AutoFailSave(target,ability);
    const exhaustion=Math.max(0,Math.min(6,Math.floor(Number(target?.exhaustion)||0)));
    const effectiveOptions={...options};
    let effectiveRolls=Array.isArray(rolls)?rolls.slice():(rolls==null?[]:[Number(rolls)]);
    if(String(ability||'').toUpperCase()==='DEX'&&sr29Has(target,'restrained')){
      const hasAdvantage=effectiveOptions.advantage===true;
      const hasDisadvantage=effectiveOptions.disadvantage===true;
      if(hasAdvantage){
        // Restrained imposes Disadvantage: it cancels any existing Advantage.
        effectiveOptions.advantage=false;
        effectiveOptions.disadvantage=false;
        if(effectiveRolls.length>1)effectiveRolls=[effectiveRolls[0]];
      }else{
        effectiveOptions.advantage=false;
        effectiveOptions.disadvantage=true;
        if(effectiveRolls.length===1)effectiveRolls.push(Math.floor(Math.random()*20)+1);
      }
    }
    return sr29PriorCreatureSave(target,ability,effectiveRolls,Number(modifier||0)-2*exhaustion,dc,{...effectiveOptions,autoFail:!!options.autoFail||forced});
  };
  if(globalThis.__SR25_TEST)globalThis.__SR25_TEST.resolveCreatureSavingThrow=sr25ResolveCreatureSavingThrow;
}
if(typeof sr7EnemyTurn==='function'){
  const sr29PriorEnemyTurn=sr7EnemyTurn;
  sr7EnemyTurn=function(...args){
    SR29_COMBAT_CYCLE=Math.max(SR29_COMBAT_CYCLE,Number(state?.combat?.round)||0)+1;
    const previous=SR29_PHASE;SR29_PHASE='enemy';
    try{return sr29PriorEnemyTurn.apply(this,args);}finally{SR29_PHASE=previous;sr29ReconcileCombatGrapples();}
  };
  if(globalThis.__SR7_TEST)globalThis.__SR7_TEST.enemyTurn=sr7EnemyTurn;
}
if(typeof playerAttack==='function'){
  const sr29PriorPlayerAttack=playerAttack;
  playerAttack=function(...args){
    if(!sr29CanAct(state?.character,'action')){toast('You cannot attack while incapacitated.');return false;}
    const target=typeof targetEnemy==='function'?targetEnemy():null;
    if(sr29CannotHarm(state?.character,target)){toast('The Charmed condition prevents you from harming its source.');return false;}
    return sr29PriorPlayerAttack.apply(this,args);
  };
}
if(typeof sr11HeroAttack==='function'){
  const sr29PriorHeroAttack=sr11HeroAttack;
  sr11HeroAttack=function(...args){
    if(!sr29CanAct(state?.character,'action')){toast('You cannot attack while incapacitated.');return false;}
    const target=typeof targetEnemy==='function'?targetEnemy():null;
    if(sr29CannotHarm(state?.character,target)){toast('The Charmed condition prevents you from harming its source.');return false;}
    return sr29PriorHeroAttack.apply(this,args);
  };
}
if(typeof sr7CastSpell==='function'){
  const sr29PriorCast7=sr7CastSpell;
  sr7CastSpell=function(...args){
    if(!sr29CanAct(state?.character,'action')){toast('You cannot cast while incapacitated.');return false;}
    return sr29PriorCast7.apply(this,args);
  };
}
if(typeof castSpell==='function'){
  const sr29PriorCurrentCast=castSpell;
  castSpell=function(...args){
    if(!sr29CanAct(state?.character,'action')){toast('You cannot cast while incapacitated.');return false;}
    return sr29PriorCurrentCast.apply(this,args);
  };
}
if(typeof sr7Move==='function'){
  const sr29PriorMove=sr7Move;
  sr7Move=function(...args){
    if(!sr29CanMove(state?.character)){toast('Your current condition sets your Speed to 0.');return false;}
    const target=typeof targetEnemy==='function'?targetEnemy():null;
    if(args[0]==='closer'&&!sr29CanMoveToward(state?.character,target)){toast('The Frightened condition prevents you from willingly moving closer to its source.');return false;}
    const before=Number(state?.character?.movementSpent)||0;
    const result=sr29PriorMove.apply(this,args);
    if((Number(state?.character?.movementSpent)||0)>before&&sr29Has(state?.character,'prone'))sr29Remove(state.character,'prone');
    sr29ReconcileCombatGrapples();
    return result;
  };
}
if(typeof sr10EnemyMove==='function'){
  const sr29PriorEnemyMove=sr10EnemyMove;
  sr10EnemyMove=function(actor,...args){
    if(!sr29CanMove(actor))return false;
    const base=Number(actor?.baseSpeed||actor?.speed||30),exhaustion=Math.max(0,Math.min(6,Math.floor(Number(actor?.exhaustion)||0)));
    actor.speed=Math.max(0,base-5*exhaustion);
    const result=sr29PriorEnemyMove.call(this,actor,...args);
    sr29ReconcileCombatGrapples();
    return result;
  };
}
if(typeof sr12EnemyStep==='function'){
  const sr29PriorEnemyStep=sr12EnemyStep;
  sr12EnemyStep=function(...args){
    const result=sr29PriorEnemyStep.apply(this,args);
    sr29ReconcileCombatGrapples();
    return result;
  };
}
if(typeof sr18ResolveMonsterAction==='function'){
  const sr29PriorResolveMonsterAction=sr18ResolveMonsterAction;
  sr18ResolveMonsterAction=function(...args){
    const result=sr29PriorResolveMonsterAction.apply(this,args);
    sr29ReconcileCombatGrapples();
    return result;
  };
}
if(typeof sr10EnemyAttack==='function'){
  const sr29PriorEnemyAttack=sr10EnemyAttack;
  sr10EnemyAttack=function(actor,...args){if(!sr29CanAct(actor,'action'))return false;return sr29PriorEnemyAttack.call(this,actor,...args);};
}
if(typeof sr10EnemyTurn==='function'){
  const sr29PriorEnemyTurn10=sr10EnemyTurn;
  sr10EnemyTurn=function(entry,...args){const actor=state?.combat?.enemies?.[entry?.index];if(actor&&!sr29CanAct(actor,'action'))return false;return sr29PriorEnemyTurn10.call(this,entry,...args);};
}

/*
 * The Director's SR21 action form is the primary ability-check path. Route it
 * through the same condition rules as the legacy skill-check adapter.
 */
function sr29CanonicalAbilityCheck(target,skill,dc,options={},fatiguePenalty=0) {
  const opts={...(options||{})},mode=sr29SkillMode(target,skill,opts);
  if(mode==='disadvantage')opts.disadvantage=true;
  const advantage=!!opts.advantage&&!opts.disadvantage;
  const disadvantage=!!opts.disadvantage&&!opts.advantage;
  const fallback=typeof sr21SkillBonus==='function'?sr21SkillBonus(target,skill):{total:0};
  const exhaustion=Math.max(0,Math.min(6,Math.floor(Number(target?.exhaustion)||0)));
  const bonus=Number(fallback?.total)||0;
  if(mode==='auto-fail')return {
    roll:null,first:null,second:null,advantage:false,disadvantage:false,
    bonus:bonus-2*exhaustion,total:null,success:false,skill,dc,
    check:null,d20:null,autoFail:true
  };
  const rollMode=advantage?'advantage':disadvantage?'disadvantage':'normal';
  let rollCheck=null;
  if(typeof sr14AbilityCheck==='function') {
    const rollFn=()=>sr14AbilityCheck(target,skill,dc,{mode:rollMode});
    rollCheck=typeof sr21RandomForRolls==='function'?sr21RandomForRolls(opts,rollFn):rollFn();
  }
  const first=Number(opts.roll??rollCheck?.rolls?.[0]??rollCheck?.roll??rollCheck?.r1??rollCheck?.r??Math.floor(Math.random()*20)+1);
  const second=(advantage||disadvantage)?Number(opts.secondRoll??rollCheck?.rolls?.[1]??rollCheck?.r2??first):null;
  const selected=second===null?first:(advantage?Math.max(first,second):Math.min(first,second));
  const effectiveBonus=bonus-2*exhaustion;
  const resolved=typeof sr25ResolveAbilityCheck==='function'
    ?sr25ResolveAbilityCheck([selected],effectiveBonus+Number(fatiguePenalty||0),dc)
    :{die:selected,total:selected+effectiveBonus+Number(fatiguePenalty||0),success:selected+effectiveBonus+Number(fatiguePenalty||0)>=dc};
  return {roll:resolved.die,first,second,advantage,disadvantage,bonus:effectiveBonus,total:resolved.total,
    success:resolved.success,skill,dc,check:rollCheck,d20:resolved,autoFail:false};
}
if(typeof sr21CanonicalCheck==='function') {
  sr21CanonicalCheck=sr29CanonicalAbilityCheck;
  if(globalThis.__SR21_TEST)globalThis.__SR21_TEST.canonicalCheck=sr21CanonicalCheck;
}
if(typeof sr21ResolvePlayerAction==='function') {
  const sr29PriorResolvePlayerAction=sr21ResolvePlayerAction;
  sr21ResolvePlayerAction=function(text,options={}) {
    const action=String(text||''),effective={...(options||{})};
    if(effective.requiresSight!==true&&/\b(look|see|watch|visually|read|inspect|observe|spot|identify|discern)\b/i.test(action))effective.requiresSight=true;
    if(effective.requiresHearing!==true&&/\b(listen|hear|hearing|sound|overhear|eavesdrop)\b/i.test(action))effective.requiresHearing=true;
    const result=sr29PriorResolvePlayerAction(text,effective);
    let decision=null;try{if(typeof sr18ImprovisationDecision==='function')decision=sr18ImprovisationDecision(action);}catch(error){}
    const mode=SR20_MODES.includes(effective.mode)&&effective.mode!=='auto'?effective.mode:sr21InferMode(action);
    const skill=sr21SkillFor(mode,action,decision,effective.skill);
    const checkMode=sr29SkillMode(state?.character,skill,effective);
    if(checkMode==='auto-fail'&&result) {
      result.autoFail=true;
      result.narrative='The required sense is unavailable; the check automatically fails. No die roll can overcome this condition.';
      if(Array.isArray(state?.log)&&state.log.length)state.log[state.log.length-1].msg=result.narrative;
      if(typeof save==='function')save();
    }
    return result;
  };
  if(globalThis.__SR21_TEST)globalThis.__SR21_TEST.resolve=sr21ResolvePlayerAction;
}
if(typeof sr133HeroSave==='function') {
  const sr29PriorHeroSave=sr133HeroSave;
  sr133HeroSave=function(target,ability,player,attacker) {
    const result=sr29PriorHeroSave(target,ability,player,attacker);
    const exhaustion=Math.max(0,Math.min(6,Math.floor(Number(target?.exhaustion)||0)));
    const forced=sr29AutoFailSave(target,ability);
    const bonus=Number(result?.bonus||0)-2*exhaustion;
    const autoFail=!!result?.autoFail||forced;
    const total=autoFail?-Infinity:Number(result?.selected)+bonus+Number(result?.cover||0);
    return {...result,bonus,autoFail,total,success:!autoFail&&total>=Number(result?.dc||0)};
  };
}
if(typeof sr12ApplyDamage==='function') {
  const sr29PriorEnemyDamage=sr12ApplyDamage;
  sr12ApplyDamage=function(enemy,amount,type='physical') {
    if(!enemy||!sr29Has(enemy,'petrified'))return sr29PriorEnemyDamage(enemy,amount,type);
    const key=String(type||'physical').toLowerCase();
    const immunities=(enemy.immunities||[]).map(x=>String(x).toLowerCase());
    const resistances=(enemy.resistances||[]).map(x=>String(x).toLowerCase());
    const vulnerabilities=(enemy.vulnerabilities||[]).map(x=>String(x).toLowerCase());
    const immune=immunities.includes(key)||immunities.includes('all');
    const resistant=true; // Petrified always grants resistance to every damage type.
    const vulnerable=vulnerabilities.includes(key);
    let dealt=Math.max(0,Number(amount)||0);
    if(immune)dealt=0;
    else if(resistant!==vulnerable)dealt=resistant?Math.floor(dealt/2):dealt*2;
    enemy.hp=Math.max(0,Number(enemy.hp||0)-dealt);
    enemy.lastDamageType=key;
    if((key==='fire'||key==='acid')&&enemy.role==='regenerator')enemy.regenerationStopped=true;
    return dealt;
  };
  if(globalThis.__SR29_TEST)globalThis.__SR29_TEST.applyEnemyDamage=sr12ApplyDamage;
}
function sr29DamageMultiplier(target,type) {
  if(!target||!sr29Has(target,'petrified'))return typeof sr14DamageMultiplier==='function'?sr14DamageMultiplier(target,type):1;
  const resistances=Array.isArray(target.resistances)?target.resistances.slice():[];
  if(!resistances.some(x=>String(x).toLowerCase()==='all'))resistances.push('all');
  const effective={...target,resistances};
  return typeof sr14DamageMultiplier==='function'?sr14DamageMultiplier(effective,type):0.5;
}
if(typeof sr18MonsterApplyDamage==='function') {
  const sr29PriorMonsterDamage=sr18MonsterApplyDamage;
  sr18MonsterApplyDamage=function(target,amount,type,enemy) {
    const character=target?.player?.character;
    if(!state?.combat?.mp||!sr29Has(character,'petrified'))return sr29PriorMonsterDamage(target,amount,type,enemy);
    const original=Array.isArray(character.resistances)?character.resistances:null;
    const resistances=original?original.slice():[];
    if(!resistances.some(x=>String(x).toLowerCase()==='all'))resistances.push('all');
    character.resistances=resistances;
    try{return sr29PriorMonsterDamage(target,amount,type,enemy);}
    finally{if(original)character.resistances=original;else delete character.resistances;}
  };
}

globalThis.__SR29_TEST={
  version:SR29_VERSION,schema:SR29_SCHEMA,names:SR29_CONDITION_NAMES.slice(),registry:SR29_CONDITIONS,
  normalizeName:sr29Name,entries:sr29Entries,has:sr29Has,apply:sr29Apply,remove:sr29Remove,tick:sr29Tick,
  namesFor:sr29Names,status:sr29Status,isImmune:sr29IsImmune,changeExhaustion:sr29ChangeExhaustion,
  longRestExhaustion:sr29LongRestExhaustion,autoFailSave:sr29AutoFailSave,attackState:sr29AttackState,
  skillMode:sr29SkillMode,criticalOnHit:sr29CriticalOnHit,canAct:sr29CanAct,canMove:sr29CanMove,
  canMoveToward:sr29CanMoveToward,cannotHarm:sr29CannotHarm,socialCheckAdvantage:sr29SocialCheckAdvantage,
  conditionPanel:sr29ConditionPanel,uiTargets:sr29UiTargets,resolveUiTarget:sr29UiTarget,
  canonicalAbilityCheck:sr29CanonicalAbilityCheck,heroSave:typeof sr133HeroSave==='function'?sr133HeroSave:null,
  damageMultiplier:sr29DamageMultiplier,applyEnemyDamage:typeof sr12ApplyDamage==='function'?sr12ApplyDamage:null,
  applyMonsterDamage:typeof sr18MonsterApplyDamage==='function'?sr18MonsterApplyDamage:null,
  attackRoll:typeof sr11RollAttack==='function'?sr11RollAttack:null,
  canSeeInvisible:sr29CanSeeInvisible,
  applyUiCondition:sr29ApplyUiCondition,removeUiCondition:sr29RemoveUiCondition,
  currentPhase:()=>({phase:SR29_PHASE,cycle:SR29_COMBAT_CYCLE}),
  canUseAction:sr29CanAct,
  grappleEligibility:sr29GrappleEligibility,
  releaseGrapple:sr29ReleaseGrapple,reconcileGrapples:sr29ReconcileGrapples,
  combatParticipants:sr29CombatParticipants,reconcileCombatGrapples:sr29ReconcileCombatGrapples
};
