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
  if(existing)Object.assign(existing,item);else entries.push(item);
  target.conditions=entries;
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
  const melee=!!options.melee,distance=Number.isFinite(Number(options.distance))?Number(options.distance):(melee?5:Infinity);
  let advantage=false,disadvantage=false;
  const add=(a,d)=>{advantage=advantage||a;disadvantage=disadvantage||d;};
  add(false,sr29Has(attacker,'blinded')||sr29Has(attacker,'poisoned')||sr29Has(attacker,'prone')||sr29Has(attacker,'restrained'));
  if(sr29Has(attacker,'frightened')&&sr29FrightSourceVisible(attacker,options))add(false,true);
  add(sr29Has(attacker,'invisible')&&!options.targetCanSeeInvisible,false);
  const grappleEffect=sr29Entries(attacker).find(x=>x.name==='grappled');
  if(grappleEffect){
    const grapplerId=String(grappleEffect.grapplerId||grappleEffect.sourceId||'');
    const targetId=String(target?.id||target?.name||'');
    if(!grapplerId||grapplerId!==targetId)add(false,true);
  }
  add(false,sr29Has(target,'invisible')&&!options.canSeeInvisible);
  add(sr29Has(target,'blinded')||sr29Has(target,'restrained')||sr29Has(target,'paralyzed')||
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
  if(actionType==='reaction')return status.canReact;
  if(actionType==='bonus'||actionType==='bonus-action')return status.canBonusAction;
  return status.canAct;
}
function sr29CanMove(actor){return sr29Status(actor).speedOverride!==0;}
function sr29LongRestExhaustion(actor) {
  if(!actor||Number(actor.exhaustion)<=0)return {changed:false,before:Number(actor?.exhaustion)||0,after:Number(actor?.exhaustion)||0};
  const result=sr29ChangeExhaustion(actor,-1);
  return {changed:result.changed,before:result.before,after:result.after};
}


function sr29Html(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[ch]);
}
function sr29UiTargets(snapshot=state) {
  const out=[];
  if(snapshot?.character)out.push({key:'player',label:'You · '+String(snapshot.character.name||'Player character'),actor:snapshot.character});
  for(const [index,enemy] of (snapshot?.combat?.enemies||[]).entries()) {
    if(!enemy||typeof enemy!=='object')continue;
    out.push({key:'enemy:'+index,label:'Enemy · '+String(enemy.name||('Enemy '+(index+1))),actor:enemy});
  }
  return out;
}
function sr29UiTarget(snapshot,key) {
  if(key==='player')return snapshot?.character||null;
  const match=String(key||'').match(/^enemy:(\d+)$/);
  if(!match)return null;
  return snapshot?.combat?.enemies?.[Number(match[1])]||null;
}
function sr29ApplyUiCondition(snapshot,targetKey,name,rounds=1,permanent=false,source='',sourceId='',sourceVisible=false) {
  const target=sr29UiTarget(snapshot,targetKey),key=sr29Name(name);
  if(!target)return {applied:false,reason:'missing-target'};
  const count=Math.max(1,Math.floor(Number(rounds)||1));
  const origin=String(source||'').trim()||'Manual application';
  const id=String(sourceId||'').trim();
  const options={levels:Math.min(6,count)};
  if(id){options.sourceId=id;if(key==='grappled')options.grapplerId=id;}
  if(key==='frightened')options.sourceVisible=sourceVisible===true;
  return sr29Apply(target,key,key==='exhaustion'?1:(permanent?'permanent':Math.min(99,count)),origin,options);
}
function sr29RemoveUiCondition(snapshot,targetKey,name,instanceId) {
  const target=sr29UiTarget(snapshot,targetKey),key=sr29Name(name);
  if(!target)return {removed:0,reason:'missing-target'};
  if(key==='exhaustion')return sr29Remove(target,key,{levels:1});
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
      return '<div class="item-row"><div><strong>'+sr29Html(title)+'</strong><div class="tagline">'+sr29Html(item.source||'Unknown source')+' · '+duration+'</div></div><button class="btn small" type="button" data-sr29-action="remove" data-sr29-target="'+sr29Html(key)+'" data-sr29-condition="'+sr29Html(item.name)+'" data-sr29-instance="'+sr29Html(item.id)+'">Remove</button></div>';
    }).join('');
    const levels=Math.max(0,Math.min(6,Math.floor(Number(actor.exhaustion)||0)));
    const exhaustion=levels?'<div class="item-row"><div><strong>Exhaustion · Level '+levels+'</strong><div class="tagline">Cumulative D20-test and Speed penalties</div></div><button class="btn small" type="button" data-sr29-action="remove" data-sr29-target="'+sr29Html(key)+'" data-sr29-condition="exhaustion">Reduce 1 level</button></div>':'';
    return '<div class="shop-item"><strong>'+sr29Html(label)+'</strong>'+(rows||'')+exhaustion+(!rows&&!exhaustion?'<p class="muted smalltext">No active conditions.</p>':'')+'</div>';
  }).join('');
  return '<section class="card" id="sr29-condition-panel"><div class="eyebrow">V29 · Condition management</div><h3>Conditions &amp; effects</h3><p class="muted smalltext">Manage conditions for your character and active solo-combat enemies. Repeated applications retain separate sources and durations; their effects do not stack. Enter the source creature name or ID when a rule depends on a specific source.</p><div class="two-col"><div class="field"><label for="sr29-target">Target</label><select id="sr29-target">'+targetOptions+'</select></div><div class="field"><label for="sr29-condition">Condition</label><select id="sr29-condition">'+conditionOptions+'</select></div><div class="field"><label for="sr29-source">Source name</label><input id="sr29-source" maxlength="120" placeholder="Spell, creature, or effect"></div><div class="field"><label for="sr29-source-id">Source creature ID/name</label><input id="sr29-source-id" maxlength="120" placeholder="Needed for Charmed, Frightened, Grappled"></div><div class="field"><label for="sr29-rounds">Duration (rounds) / Exhaustion (levels)</label><input id="sr29-rounds" type="number" min="1" max="99" value="2"></div><div class="field"><label><input id="sr29-permanent" type="checkbox"> Permanent until removed</label><label><input id="sr29-source-visible" type="checkbox"> Frightened source is in line of sight</label></div></div><button class="btn" type="button" data-sr29-action="apply">Apply condition</button><div class="divider"></div>'+sections+'</section>';
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
        value('sr29-rounds'),checked('sr29-permanent'),value('sr29-source'),value('sr29-source-id'),checked('sr29-source-visible'));
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
    const poison=sr29Has(c,'poisoned')?2:0;
    return sr29PriorSkillBonus(skill)+Math.min(5,exhaustion)+poison-(2*exhaustion);
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
if(typeof sr11RollAttack==='function'){
  const sr29PriorRollAttack=sr11RollAttack;
  sr11RollAttack=function(base,actor,target,melee=false){
    const exhaustion=Math.max(0,Math.min(6,Math.floor(Number(actor?.exhaustion)||0)));
    const originalActorConditions=Array.isArray(actor?.conditions)?actor.conditions.slice():null;
    const originalTargetConditions=Array.isArray(target?.conditions)?target.conditions.slice():null;
    const actorHadConditions=Array.isArray(actor?.conditions),targetHadConditions=Array.isArray(target?.conditions);
    const temporarilyAdd=(creature,name)=>{
      if(!creature)return;
      if(!Array.isArray(creature.conditions))creature.conditions=[];
      if(!creature.conditions.some(x=>sr29Name(x)===name))creature.conditions.push(name);
    };
    try{
      // Preserve all later combat layers (Dodge, Bardic Inspiration, cover/threat,
      // outline bonuses and Improved Critical) while supplying the V29-only cases.
      if(sr29Has(actor,'frightened')&&sr29FrightSourceVisible(actor,{}))temporarilyAdd(actor,'poisoned');
      if(sr29Has(target,'petrified'))temporarilyAdd(target,'restrained');
      return sr29PriorRollAttack(Number(base||0)-2*exhaustion,actor,target,melee);
    }finally{
      if(actorHadConditions)actor.conditions=originalActorConditions;else if(actor&&Object.prototype.hasOwnProperty.call(actor,'conditions'))delete actor.conditions;
      if(targetHadConditions)target.conditions=originalTargetConditions;else if(target&&Object.prototype.hasOwnProperty.call(target,'conditions'))delete target.conditions;
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
    try{return sr29PriorEnemyTurn.apply(this,args);}finally{SR29_PHASE=previous;}
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
    return result;
  };
}
if(typeof sr10EnemyMove==='function'){
  const sr29PriorEnemyMove=sr10EnemyMove;
  sr10EnemyMove=function(actor,...args){
    if(!sr29CanMove(actor))return false;
    const base=Number(actor?.baseSpeed||actor?.speed||30),exhaustion=Math.max(0,Math.min(6,Math.floor(Number(actor?.exhaustion)||0)));
    actor.speed=Math.max(0,base-5*exhaustion);
    return sr29PriorEnemyMove.call(this,actor,...args);
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
globalThis.__SR29_TEST={
  version:SR29_VERSION,schema:SR29_SCHEMA,names:SR29_CONDITION_NAMES.slice(),registry:SR29_CONDITIONS,
  normalizeName:sr29Name,entries:sr29Entries,has:sr29Has,apply:sr29Apply,remove:sr29Remove,tick:sr29Tick,
  namesFor:sr29Names,status:sr29Status,isImmune:sr29IsImmune,changeExhaustion:sr29ChangeExhaustion,
  longRestExhaustion:sr29LongRestExhaustion,autoFailSave:sr29AutoFailSave,attackState:sr29AttackState,
  skillMode:sr29SkillMode,criticalOnHit:sr29CriticalOnHit,canAct:sr29CanAct,canMove:sr29CanMove,
  canMoveToward:sr29CanMoveToward,cannotHarm:sr29CannotHarm,socialCheckAdvantage:sr29SocialCheckAdvantage,
  conditionPanel:sr29ConditionPanel,uiTargets:sr29UiTargets,resolveUiTarget:sr29UiTarget,
  applyUiCondition:sr29ApplyUiCondition,removeUiCondition:sr29RemoveUiCondition,
  currentPhase:()=>({phase:SR29_PHASE,cycle:SR29_COMBAT_CYCLE})
};
