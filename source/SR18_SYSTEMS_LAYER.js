/* SOLO REALMS V18 — rules, monster tactics, improvisation, living campaign, and save recovery.
 * Built as an additive layer over V17 so earlier campaign/rules/multiplayer/save data remains readable.
 */
const SR18_VERSION='18.0.0';
const SR18_WATCHES_PER_DAY=6;
const SR18_SAVE_DB='solo-realms-v18-save-archive';
const SR18_SLOT_PREFIX='sr18-save-slot-';
const SR18_RECOVERY_PREFIX='sr18-recovery-';
const SR18_MAX_SLOTS=8;
let SR18_DB_PROMISE=null, SR18_RECOVERY_TIMER=null, SR18_LAST_RECOVERY=0, SR18_RECOVERY_SEQ=0;

function sr18Text(x){return String(x??'');}
function sr18DiceAverage(expr){const m=sr18Text(expr).replace(/\s/g,'').match(/^(\d+)?d(\d+)([+-]\d+)?$/i);return m?(Number(m[1]||1)*(Number(m[2])+1)/2+Number(m[3]||0)):0;}
function sr18DamageExpr(sp){return sr18Text(sp?.damage||'').replace(/\s/g,'')||sr18Text(sp?.description||'').match(/\b\d+d\d+(?:\s*[+-]\s*\d+)?\b/i)?.[0]?.replace(/\s/g,'')||'';}
function sr18SaveAbility(sp,desc){const direct=sr18Text(sp?.saveAbility||'').toUpperCase().slice(0,3);if(['STR','DEX','CON','INT','WIS','CHA'].includes(direct))return direct;const m=sr18Text(desc).match(/\b(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw\b/i);return m?m[1].slice(0,3).toUpperCase():'DEX';}
function sr18Area(sp,desc){let size=Number(sp?.area)||0,shape=sr18Text(sp?.areaShape||'').toLowerCase();if(!size){const m=sr18Text(desc).match(/(\d+)\s*[- ]foot\s+(sphere|radius|cone|line|cube|cylinder|emanation)/i);if(m){size=Number(m[1]);shape=m[2].toLowerCase();}}if(shape==='radius')shape='sphere';if(shape==='emanation')shape='sphere';return {size,shape,active:size>0};}
function sr18DetectCondition(desc){const names=['blinded','charmed','deafened','exhaustion','frightened','grappled','incapacitated','invisible','paralyzed','petrified','poisoned','prone','restrained','stunned','unconscious'];const d=sr18Text(desc).toLowerCase();return names.map(n=>({name:n,index:d.search(new RegExp(`\\b${n}\\b`))})).filter(x=>x.index>=0).sort((a,b)=>a.index-b.index)[0]?.name||'';}
function sr18InferSpellEffect(name,sp,base={kind:'utility'}){
 const desc=sr18Text(sp?.description||''),d=desc.toLowerCase(),effect={...base,name};
 const damage=sr18DamageExpr(sp),area=sr18Area(sp,desc),save=sr18SaveAbility(sp,desc),condition=sr18Text(sp?.condition||'').toLowerCase()||sr18DetectCondition(desc);
 if(area.active){effect.area=true;effect.shape=area.shape;effect.size=area.size;}
 const damageType=sr18Text(sp?.damageType||desc.match(/\b(bludgeoning|piercing|slashing|acid|cold|fire|force|lightning|necrotic|poison|psychic|radiant|thunder)\s+damage\b/i)?.[1]||'').toLowerCase();if(damageType)effect.type=damageType;
 if(sp?.heal||/regains?[^.]{0,140}hit points|hit points?[^.]{0,140}regain|restores?[^.]{0,100}hit points/i.test(desc))effect.kind='heal';
 else if(/returns? (?:the creature|a creature|the target|it) to life|resurrect|revive|dead creature.*returns? to life/i.test(desc))effect.kind='revive';
 else if(base.kind==='utility'&&/(?:teleport|teleports|transport(?:s)? .*? instantly|you disappear|reappear in an unoccupied space|move instantly to)/i.test(desc))effect.kind='teleport';
 else if(base.kind==='utility'&&/(?:summon|conjure|calls? forth|creates? .*?(?:spirit|creature|servant)|manifests? .*? ally)/i.test(desc))effect.kind='summon';
 else if(base.kind==='utility'&&/(?:end[s]? one|remove[s]? one|cure[s]? .*?condition|ends? the .*condition|restores? .*?from the blinded|poisoned condition)/i.test(desc))effect.kind='cleanse';
 else if(base.kind==='utility'&&/(?:resistance to|resistant to|resistance against|damage resistance)/i.test(desc))effect.kind='resistance';
 else if(base.kind==='utility'&&/(?:invisible|become[s]? invisible|can't be seen|cannot be seen)/i.test(desc))effect.kind='invisibility';
 else if(base.kind==='utility'&&/(?:armor class|\bAC\b).{0,80}(?:increase|bonus|\+\d)|(?:increase|bonus).{0,80}(?:armor class|\bAC\b)/i.test(desc))effect.kind=/\+5|five/.test(d)?'shield':'armor';
 else if(base.kind==='utility'&&/(?:temporary hit points|gains? \d+ hit points|hit point maximum increases)/i.test(desc))effect.kind='tempHp';
 else if(base.kind==='utility'&&/(?:advantage on|advantage to|bonus to|add \d+d\d+ to|add your spellcasting ability|increase[s]? .*?speed|resistance to)/i.test(desc))effect.kind='buff';
 else if(base.kind==='utility'&&/(?:must succeed on|must make|make[s]? a .*?saving throw|saving throw or be|fails? the save)/i.test(desc))effect.kind=damage?'saveDamage':'control';
 else if(damage&&(/saving throw/.test(d)||sp?.save))effect.kind='saveDamage';
 else if(damage&&(sp?.attack||/spell attack|melee spell attack|ranged spell attack|make a melee attack|make a ranged attack/i.test(desc)))effect.kind='attack';
 else if(damage&&/(?:takes?|suffers?)\s+\d*d\d+|damage/i.test(d))effect.kind=area.active?'saveDamage':'attack';
 else if(condition&&(/saving throw|must succeed|must make|fails? a save|become[s]?/i.test(desc)))effect.kind='control';
 else if(base.kind==='utility'&&/damage|attack roll/i.test(d)&&area.active)effect.kind='saveDamage';
 if(['attack','saveDamage','control','debuff'].includes(effect.kind)){
  effect.save=effect.save||save;effect.condition=effect.condition||condition;
  if(area.active){effect.area=true;effect.shape=effect.shape||area.shape;effect.size=effect.size||area.size;}
  if(effect.kind==='saveDamage'&&!effect.type)effect.type=sr18Text(sp?.damageType||'force').toLowerCase();
 }
 if(effect.kind==='heal')effect.party=!!effect.party||/(?:each creature|each ally|you and up to|up to six creatures|any number of creatures|all allies|each willing creature)/i.test(desc);
 if(['buff','armor','resistance','invisibility','tempHp'].includes(effect.kind))effect.party=!!effect.party||/(?:you and up to|each creature|each ally|all allies|creatures of your choice)/i.test(desc);
 effect.durationRounds=typeof sr14SpellDurationRounds==='function'?sr14SpellDurationRounds(sp):1;
 return effect;
}
const sr18SpellEffectBase=sr14SpellEffectComplete;
sr14SpellEffectComplete=function(name,sp){return sr18InferSpellEffect(name,sp,sr18SpellEffectBase(name,sp));};

// Correct area resolution for theater-of-the-mind encounters that do not carry grid coordinates.
const sr18TargetListBase=sr14TargetListComplete;
sr14TargetListComplete=function(player,sp,effect,target,origin){
 const out=sr18TargetListBase(player,sp,effect,target,origin);
 if(out.length||!(effect?.area||sp?.area))return out;
 const enemies=(state.combat?.enemies||[]).filter(e=>e.hp>0);
 if(enemies.some(e=>!e.pos))return enemies;
 return out;
};

// Upcasting derives extra dice from the installed SRD higher-level text instead of requiring spell-name cases.
const sr18DamageDiceBase=sr14DamageDice;
sr14DamageDice=function(sp,slot){
 const formula=sr18DamageDiceBase(sp,slot),text=sr18Text(sp?.upcast||'');
 // V14 already resolves the standard SRD upcast wording; use this fallback only if it did not.
 const raw=sr18Text(sp?.damage||'').replace(/\s/g,'')||sr18Text(sp?.description||'').match(/\b\d+d\d+(?:\s*[+-]\s*\d+)?\b/i)?.[0]?.replace(/\s/g,'')||'';
 if(formula!==raw)return formula;
 const m=sr18Text(formula).match(/^(\d+)d(\d+)([+-]\d+)?$/i);if(!m||Number(slot)<=Number(sp?.level||0))return formula;
 const levels=Number(slot)-Number(sp.level||0);
 const diceWords=[...text.matchAll(/(?:additional|extra|increases? by)\s+(\d+)d(\d+)(?:\s+\w+)?\s+for each spell slot level above/ig)];
 if(diceWords.length){const add=Number(diceWords[0][1])*levels;if(Number(diceWords[0][2])===Number(m[2]))return `${Number(m[1])+add}d${m[2]}${m[3]||''}`;}
 const specific=text.match(/(?:one additional|an additional)\s+(\d+d\d+)\s+for each spell slot level above/i);
 if(specific){const x=specific[1].match(/(\d+)d(\d+)/i);if(x&&Number(x[2])===Number(m[2]))return `${Number(m[1])+Number(x[1])*levels}d${m[2]}${m[3]||''}`;}
 return formula;
};

// Apply party-targeted spell effects to the solo companions as well as the player character.
const sr18CastBase=sr14CastSpellComplete;
sr14CastSpellComplete=function(playerOrNull,name,allyId=null,fromMP=false,castMode={}){
 const caster=playerOrNull?.character||state.character,sp=SRD52_SPELLS?.[name],effect=sp?sr14SpellEffectComplete(name,sp):null;
 const beforeLog=state.log?.length||0;
 const ok=sr18CastBase(playerOrNull,name,allyId,fromMP,castMode);
 if(!ok||!caster||!sp||!effect?.party||state.combat?.mp)return ok;
 const companions=(state.campaign?.companions||[]).filter(p=>p&&p.hp!==undefined);
 if(!companions.length)return ok;
 let amount=0;
 if(effect.kind==='heal'){
  const entry=(state.log||[]).slice(beforeLog).reverse().find(x=>new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}.*?;\\s*(\\d+) healing is applied`,'i').test(x.msg||''));
  const match=entry?.msg?.match(/;\s*(\d+) healing is applied/i);amount=Number(match?.[1])||sr18CastHealingAmount(sp,caster,name);
 }
 for(const ally of companions){
  if(effect.kind==='heal'&&amount>0){const gained=Math.max(0,Math.min(amount,(ally.maxHp||ally.hp)-ally.hp));ally.hp+=gained;log(`${name} restores ${gained} HP to ${ally.name}.`,'goodlog');}
  else if(effect.kind==='buff'||effect.kind==='armor'||effect.kind==='shield'||effect.kind==='invisibility'||effect.kind==='resistance'){
   ally.activeEffects=Array.isArray(ally.activeEffects)?ally.activeEffects:[];
   ally.activeEffects=ally.activeEffects.filter(x=>x.name!==name);ally.activeEffects.push({name,rounds:effect.durationRounds||1,source:name,description:sp.description});
   if(effect.kind==='buff'){ally.attackBuff=Math.max(ally.attackBuff||0,1);ally.buffRounds=Math.max(ally.buffRounds||0,effect.durationRounds||1);}
   if(effect.kind==='armor')ally.bonusAC=Math.max(ally.bonusAC||0,3);
   if(effect.kind==='shield')ally.guard=Math.max(ally.guard||0,5);
   if(effect.kind==='invisibility')sr11Add(ally,'invisible',effect.durationRounds||1,name);
   if(effect.kind==='resistance'){const t=SR14_DAMAGE_TYPES.find(x=>new RegExp(x,'i').test(sp.description||''));ally.resistances=[...new Set([...(ally.resistances||[]),t||'all'])];}
  }else if(effect.kind==='cleanse'){
   const remove=(ally.conditions||[]).filter(x=>['blinded','charmed','deafened','frightened','paralyzed','poisoned','stunned'].includes(typeof x==='string'?x:x.name));ally.conditions=(ally.conditions||[]).filter(x=>!remove.includes(x));
  }
 }
 if(effect.kind==='heal'||['buff','armor','shield','invisibility','resistance','cleanse'].includes(effect.kind)){save();render();}
 return ok;
};
function sr18CastHealingAmount(sp,c){const formula=sr14SpellDamageFormula(sp,Number(sp.level)||1,c);return sr14RollSpellDamage(formula||'1d8')+Math.max(0,sr14AbilityMod(c.stats?.[sr14CasterAbility(sr14CasterClass(c,sp))]));}

// Utility spells become persistent, actionable effects instead of a journal-only note.
const sr18ApplyEffectBase=sr14CastSpellComplete;
// Spell metadata is interpreted here for effects that the older generic resolver could not express.
function sr18ApplySpellUtility(c,name,sp,effect){
 const desc=sr18Text(sp.description).toLowerCase(),rounds=effect.durationRounds>0?effect.durationRounds:1;
 c.activeEffects=Array.isArray(c.activeEffects)?c.activeEffects:[];
 const record={name,source:name,rounds,description:sp.description,concentration:!!sp.concentration||/concentration/i.test(sp.duration||''),kind:effect.kind};
 c.activeEffects=c.activeEffects.filter(x=>x.name!==name);c.activeEffects.push(record);if(record.concentration&&typeof sr12SetConcentration==='function')sr12SetConcentration(c,name,rounds);
 const dice=sr18DamageExpr(sp);
 if(effect.kind==='tempHp'||/temporary hit points/.test(desc)){
  const formula=desc.match(/(\d+d\d+(?:\s*[+-]\s*\d+)?) temporary hit points/i)?.[1];
  const flat=Number((desc.match(/(\d+) temporary hit points/i)||[])[1])||0;
  const ability=(sp.classes||[]).find(k=>sr14Level(c,k)>0)||c.classId,mod=Math.max(0,sr14AbilityMod(c.stats?.[sr14CasterAbility(ability)]));const n=formula&&typeof rollDice==='function'?rollDice(formula.replace(/\s/g,'')):flat||(/spellcasting ability modifier/.test(desc)?mod:((dice&&typeof rollDice==='function')?rollDice(dice):Math.max(1,Number(c.level)||1)));c.tempHP=Math.max(Number(c.tempHP)||0,n);if(/at the start of each of your turns|at the start of each turn|at the start of its turns/.test(desc))record.tempHpPerTurn=n;
 }
 if(/advantage on (?:all )?(?:ability checks|skill checks|initiative)/.test(desc))record.advantage='all';
 else {const skillMatch=desc.match(/advantage on (?:your )?(?:next )?([a-z ]+?) checks?/i);if(skillMatch)record.advantage=skillMatch[1].trim();}
 const bonusMatch=desc.match(/\+(\d+) bonus to (?:attack rolls|ability checks|saving throws|armor class)/i);if(bonusMatch){record.bonus=Number(bonusMatch[1]);record.bonusType=/attack/.test(desc)?'attack':/saving/.test(desc)?'save':/armor|\bAC\b/.test(desc)?'ac':'check';}
 const diceBonus=desc.match(/(?:roll|rolls|add)\s+(?:a\s+)?(\d+d\d+|a d\d+)\s*(?:and add|to|on|for|the number rolled to)[^.!?]{0,120}(ability check|attack roll|saving throw|skill check)/i)||desc.match(/(\d+d\d+)[^.!?]{0,100}(?:added to|add to|bonus to)[^.!?]{0,50}(ability checks?|attack rolls?|saving throws?|skill checks?)/i);
 if(diceBonus){diceBonus[1]=diceBonus[1].replace(/^a d/i,'1d');}
 if(diceBonus){record.bonusDice=diceBonus[1];const target=String(diceBonus[2]).toLowerCase();record.bonusType=/attack/.test(target)?'attack':/saving/.test(target)?'save':'check';record.once=/one ability check|next ability check|next check|one attack roll|next attack roll/i.test(desc);}
 if(/attack roll or saving throw|attack rolls and saving throws/.test(desc)&&/1d4/.test(desc)){record.bonusDice='1d4';record.bonusType='attackSave';}
 const acMatch=desc.match(/(?:armor class|AC)\s*(?:increases? by|increased by|gets? a bonus of|bonus of)\s*(\d+)/i)||desc.match(/\+(\d+)\s*(?:bonus to )?(?:armor class|AC)/i);if(acMatch){record.acBonus=Number(acMatch[1]);record.bonus=Number(acMatch[1]);record.bonusType='ac';}if(name==='Mage Armor')record.acOverride=13+Math.max(0,sr14AbilityMod(c.stats?.DEX));if(name==='Barkskin')record.acOverride=17;
 if(/increases? (?:your )?speed|speed increases? by/.test(desc)){const m=desc.match(/(?:speed|increase)[^\d]{0,20}(\d+) feet/i);record.speedBonus=Number(m?.[1])||10;}
 if(/advantage on (?:all )?attack rolls/.test(desc))record.attackAdvantage=true;
 if(/advantage on (?:all )?(?:saving throws|saves)/.test(desc))record.saveAdvantage=true;
 if(/advantage on (?:all )?(?:ability checks|skill checks)/.test(desc))record.checkAdvantage=true;
 return record;
}
const sr18CastEffectsBase=sr14CastSpellComplete;
sr14CastSpellComplete=function(playerOrNull,name,allyId=null,fromMP=false,castMode={}){
 const c=playerOrNull?.character||state.character,sp=SRD52_SPELLS?.[name],effect=sp?sr14SpellEffectComplete(name,sp):null;
 const before=c?.tempHP||0,ok=sr18CastEffectsBase(playerOrNull,name,allyId,fromMP,castMode);
 if(ok&&c&&sp&&effect&&['utility','tempHp','buff','armor','resistance','invisibility'].includes(effect.kind)){
  sr18ApplySpellUtility(c,name,sp,effect);
  if(effect.kind==='tempHp'&&c.tempHP===before)c.tempHP=Math.max(c.tempHP,Math.max(1,Number(c.level)||1));
  save();render();
 }
 return ok;
};

// Spell-prepared advantage, bonuses, and temporary defenses participate in checks and armor calculations.
function sr18ActiveEffect(c,kind){return (c?.activeEffects||[]).filter(x=>x&&(!Number.isFinite(Number(x.rounds))||Number(x.rounds)!==0));}
const sr18AbilityCheckBase=sr14AbilityCheck;
sr14AbilityCheck=function(c,skill,dc,opts={}){
 const effects=sr18ActiveEffect(c),key=sr18Text(skill).toLowerCase(),ab=sr18Text(SKILLS[skill]||skill).toLowerCase();
 const matching=effects.filter(x=>x.advantage==='all'||x.checkAdvantage||(x.advantage&&(`${key} ${ab}`).includes(sr18Text(x.advantage).toLowerCase())));
 const applicable=effects.filter(x=>x.bonusType==='check');
 const bonus=applicable.reduce((n,x)=>n+Number(x.bonus||0)+(x.bonusDice?rollDice(x.bonusDice):0),0);
 const mode=matching.length?(opts.mode==='disadvantage'?'normal':'advantage'):(opts.mode||'normal');
 const r=sr18AbilityCheckBase(c,skill,dc,{...opts,mode});if(bonus){r.bonus+=bonus;r.total+=bonus;r.success=r.total>=dc;}
 for(const x of applicable.filter(x=>x.once)){c.activeEffects=c.activeEffects.filter(y=>y!==x);if(c.concentration?.spell===x.name)c.concentration=null;}
 return r;
};
const sr18SavingThrowBase=sr14SavingThrow;
sr14SavingThrow=function(c,ability,dc,opts={}){
 const effects=sr18ActiveEffect(c),matching=effects.some(x=>x.saveAdvantage),
 applicable=effects.filter(x=>x.bonusType==='save'||x.bonusType==='attackSave'),
 bonus=applicable.reduce((n,x)=>n+Number(x.bonus||0)+(x.bonusDice?rollDice(x.bonusDice):0),0),
 mode=matching?(opts.mode==='disadvantage'?'normal':'advantage'):(opts.mode||'normal');
 const r=sr18SavingThrowBase(c,ability,dc,{...opts,mode});
 if(bonus){
  r.bonus+=bonus;r.total+=bonus;
  const canonical=typeof sr25ResolveSavingThrow==='function'
   ?sr25ResolveSavingThrow([r.roll],r.bonus,dc,{autoFail:r.autoFail===true})
   :{success:r.total>=dc,autoFail:false};
  r.success=canonical.success;r.autoFail=canonical.autoFail;
 }
 for(const x of applicable.filter(x=>x.once)){c.activeEffects=c.activeEffects.filter(y=>y!==x);if(c.concentration?.spell===x.name)c.concentration=null;}
 return r;
};
const sr18AttackBase=sr11RollAttack;
sr11RollAttack=function(base,actor,target,melee=false){
 let extra=0,spellAdv=false;for(const e of sr18ActiveEffect(actor)){if(e.bonusType==='attack'||e.bonusType==='attackSave')extra+=Number(e.bonus||0)+(e.bonusDice?rollDice(e.bonusDice):0);if(e.attackAdvantage)spellAdv=true;}
 const out=sr18AttackBase(Number(base||0)+extra,actor,target,melee);if(spellAdv&&!out.adv&&!out.dis){const r2=die(20);out.r2=r2;out.r1=out.r;out.r=Math.max(out.r,r2);out.adv=true;out.total=out.r+Number(base||0)+extra;}if(actor&&typeof actor==='object')actor.lastAttackRoll=out;for(const x of sr18ActiveEffect(actor).filter(x=>x.once&&(x.bonusType==='attack'||x.bonusType==='attackSave'))){actor.activeEffects=actor.activeEffects.filter(y=>y!==x);if(actor.concentration?.spell===x.name)actor.concentration=null;}
 // A monster's Parry reaction can turn one otherwise-hit melee attack into a miss.
 if(target&&target.hp!==undefined&&target.reactions?.length&&target.reactionAvailable!==false&&melee&&!target._sr18ParryUsed&&out.r!==1){
  const parry=target.reactions.find(x=>/parry|adds?\s+\d+\s+to its AC|increases? its AC/i.test(`${x.name} ${x.description}`));
  const bonus=Number((sr18Text(parry?.description).match(/(?:adds?|increase[sd]?)\s+(\d+)\s+to (?:its )?AC/i)||[])[1]||3);
  const ac=Number(target.ac)||10;if(parry&&out.total>=ac&&out.total<ac+bonus){out.total-=bonus;target.reactionAvailable=false;target._sr18ParryUsed=true;log(`${target.name} uses ${parry.name||'Parry'} to turn the blow aside.`,'rolllog');}
 }
 return out;
};
const sr18BaseAC=computeAC;
computeAC=function(){const effects=sr18ActiveEffect(state.character),base=sr18BaseAC(),extras=effects.filter(x=>x.bonusType==='ac'&&!x.acOverride).reduce((n,x)=>n+Number(x.bonus||0),0),override=effects.reduce((n,x)=>Math.max(n,Number(x.acOverride)||0),0);return Math.max(base+extras,override);};
const sr18TickBase=sr11Tick;
sr11Tick=function(actor){sr18TickBase(actor);if(actor?.activeEffects){actor.activeEffects=actor.activeEffects.map(x=>({...x,rounds:Number(x.rounds)})).filter(x=>{if(x.rounds<0)return true;if(x.rounds===0)return false;x.rounds--;return x.rounds>0;});if(actor.concentration&&!actor.activeEffects.some(x=>x.name===actor.concentration.spell)&&actor.concentration.spell!=='')actor.concentration=null;for(const x of actor.activeEffects)if(x.tempHpPerTurn)actor.tempHP=Math.max(Number(actor.tempHP)||0,Number(x.tempHpPerTurn)||0);}};

// Improved monster actions: recharge, Multiattack sequences, typed damage, saves, conditions, reactions and morale.
function sr18ParseRecharge(action){const s=`${action?.name||''} ${action?.description||''}`;const m=s.match(/recharge\s*(\d)(?:\s*[–-]\s*(\d))?/i);return m?{min:Number(m[1]),max:Number(m[2]||6)}:null;}
function sr18ParseCondition(text){return sr18DetectCondition(text);}
function sr18ParseActionRange(action){const d=sr18Text(action?.description||'');const rangeMatch=d.match(/\brange\s+(\d+)(?:\s*\/\s*(\d+))?\s*ft\b/i);const reach=Number((d.match(/\breach\s+(\d+)\s*ft\b/i)||[])[1]||5);const ranged=/\branged\s+(?:(?:weapon|spell)\s+)?attack(?:\s+roll)?\b/i.test(d)||!!rangeMatch;return {ranged,reach:ranged?Number(rangeMatch?.[1]||60):reach,normalRange:Number(rangeMatch?.[1]||0),longRange:Number(rangeMatch?.[2]||0)};}
function sr18MarkRechargeUsed(enemy,action){const recharge=sr18ParseRecharge(action);if(!enemy||!recharge)return false;enemy._sr18Recharge=enemy._sr18Recharge||{};enemy._sr18Recharge[sr18Text(action.name)]=false;return true;}
function sr18ExpandMultiattack(enemy){
 const actions=enemy?.actions||[],multi=actions.find(a=>/^multiattack$/i.test(a.name||''));if(!multi)return null;
 const text=sr18Text(multi.description),words={one:1,two:2,three:3,four:4,five:5,six:6},sequence=[];
 const countMatch=text.match(/(?:makes?|can make)\s+(one|two|three|four|five|six|\d+)\s+(?:melee |ranged )?attacks?/i);
 const count=countMatch?(words[countMatch[1].toLowerCase()]||Number(countMatch[1])||1):0;
 const clauses=[...text.matchAll(/(one|two|three|four|five|six|\d+)\s+with\s+(?:its|the)\s+([A-Za-z][A-Za-z’' -]*?)(?=,|\s+and\s+|\.|$)/gi)];
 for(const m of clauses){const n=words[m[1].toLowerCase()]||Number(m[1])||1,name=m[2].trim().toLowerCase();const action=actions.find(a=>a!==multi&&sr18Text(a.name).toLowerCase().includes(name))||actions.find(a=>a!==multi&&name.includes(sr18Text(a.name).toLowerCase()));if(action)for(let i=0;i<Math.min(6,n);i++)sequence.push(action);}
 if(!sequence.length){
  const typed=[...text.matchAll(/(one|two|three|four|five|six|\d+)\s+(?:with\s+(?:its|the)\s+)?([A-Za-z][A-Za-z’'-]*?)\s+attacks?/gi)];
  for(const m of typed){const n=words[m[1].toLowerCase()]||Number(m[1])||1,key=m[2].toLowerCase();const action=actions.find(a=>a!==multi&&sr18Text(a.name).toLowerCase().includes(key));if(action)for(let i=0;i<Math.min(6,n);i++)sequence.push(action);}
 }
 if(!sequence.length&&count){const names=text.match(/(?:with|using) (?:its|the) ([A-Za-z][A-Za-z’' -]+)/i),key=names?.[1]?.trim().toLowerCase();const action=(key&&actions.find(a=>a!==multi&&sr18Text(a.name).toLowerCase().includes(key)))||actions.filter(a=>a!==multi).sort((a,b)=>sr18DiceAverage(sr14MonsterActionDamage(b))-sr18DiceAverage(sr14MonsterActionDamage(a)))[0];if(action)for(let i=0;i<Math.min(6,count);i++)sequence.push(action);}
 return sequence.length?sequence:null;
}

function sr18RechargeReady(enemy,action){const recharge=sr18ParseRecharge(action);return !recharge||enemy?._sr18Recharge?.[sr18Text(action?.name)]!==false;}
function sr18AvailableMultiattack(enemy){const sequence=sr18ExpandMultiattack(enemy);if(!sequence)return null;const ready=sequence.filter(action=>sr18RechargeReady(enemy,action));return ready.length?ready:null;}

function sr18ConditionImmunity(target,condition){const list=target?.character?.conditionImmunities||target?.conditionImmunities||target?.statBlock?.condition_immunities||[];return list.some(x=>sr18Text(x).toLowerCase()===condition);}
function sr18MonsterTarget(enemy,ability=''){
 const b=state.combat;if(!b?.mp){const c=state.character;if(!c||c.hp<=0)return null;return {player:{id:'solo',name:c.name,character:c},pos:b?.heroPos||{x:1,y:3}};}
 const all=sr12AllHeroPositions().filter(x=>!x.player.character?.mpDead&&x.player.character?.hp>0);if(!all.length)return sr12EnemyTarget(enemy);
 all.sort((a,z)=>{
  const score=x=>{const c=x.player.character,ac=sr12WithHero(x.player,()=>computeAC());const save=ability?sr133HeroSave(c,ability,x.player,enemy).bonus:0;return (ability?-save*1.5:ac*.8)+(Number(c.hp)||0)/Math.max(1,Number(c.maxHp)||1)*10+sr12Distance(x.pos,enemy.pos)*.08;};return score(a)-score(z);
 });return all[0];
}
function sr18MonsterApplyDamage(target,amount,type,enemy){
 const p=target.player,c=p.character;let n=Math.max(0,Number(amount)||0),mult=sr14DamageMultiplier(c,type);n=Math.floor(n*mult);
 if(state.combat?.mp)return sr12DamageHero(p,n,type,enemy);
 const pre=Math.max(0,n),actual=damagePlayer(pre);if(actual>0&&c.concentration){const dc=Math.max(10,Math.floor(actual/2)),sv=sr14SavingThrow(c,'CON',dc);if(!sv.success){log(`${p.name} loses concentration on ${c.concentration.spell} (${sv.total} vs DC ${dc}).`,'badlog');c.concentration=null;}else log(`${p.name} maintains concentration (${sv.total} vs DC ${dc}).`,'rolllog');}return actual;
}
function sr18MonsterTargetsForAction(enemy,action,target,save){
 const area=sr18Area({},action?.description||'');if(!area.active||!state.combat?.mp)return [target];
 const center=target?.pos||state.combat.heroPos;return sr12AllHeroPositions().filter(h=>h.player.character?.hp>0&&sr14AreaHit({pos:h.pos},enemy.pos,center,area.shape,area.size)).map(h=>({player:h.player,pos:h.pos}));
}
function sr18ResolveMonsterAction(enemy,action,target){
 if(!target?.player?.character||!action)return false;
 const p=target.player,c=p.character,desc=sr18Text(action.description),save=sr14ParseMonsterSave(desc),dice=sr14MonsterActionDamage(action)||'1d4',type=sr18Text(action.damage?.[0]?.type||'physical').toLowerCase();
 const range=sr18ParseActionRange(action),dist=enemy.pos&&target.pos?sr12Distance(enemy.pos,target.pos):0;
 if(!range.ranged&&dist>range.reach){if(state.combat?.mp)sr12EnemyStep(enemy,target.pos);else if(typeof sr10EnemyMove==='function')sr10EnemyMove(enemy);return false;}
 if(enemy.pos&&target.pos&&!sr11HasLOS(enemy.pos,target.pos))return false;
 const targets=save?sr18MonsterTargetsForAction(enemy,action,target,save):[target];let did=false;
 for(const t of targets){const hero=t.player,cc=hero.character;if(!cc||cc.hp<=0)continue;
  if(save){const result=sr133HeroSave(cc,save.ability,hero,enemy),raw=rollDice(dice),half=/half damage/i.test(desc),damage=result.success?(half?Math.floor(raw/2):0):raw,actual=sr18MonsterApplyDamage(t,damage,type,enemy),condition=sr18ParseCondition(desc);
   if(!result.success&&condition&&!sr18ConditionImmunity(t,condition))sr11Add(cc,condition,Math.max(1,Number((desc.match(/(?:until the end of|for) (?:its|the target's|your) next turn/i)||[]).length?1:1),1),enemy.name);
   log(`${enemy.name} uses ${action.name}; ${hero.name} makes a ${save.ability} save (${result.total} vs DC ${save.dc}) and takes ${actual} ${type} damage${condition&&!result.success?` and gains ${condition}`:''}.`,'badlog');
  }else{
   const bonus=Number(action.attack_bonus??enemy.attack)||0,r=sr11RollAttack(bonus,enemy,cc,!range.ranged),ac=sr12WithHero(hero,()=>computeAC())+(cc.buffRounds>0?2:0)+(state.combat?.mp?sr11Cover(t.pos,enemy.pos):0),d20=sr25ResolveAttackRecord(r,ac),hit=d20.success;
   if(hit){let amount=rollDice(dice);if(d20.critical)amount+=rollDice(dice);const actual=sr18MonsterApplyDamage(t,amount,type,enemy);log(`${enemy.name} uses ${action.name} against ${hero.name}: hit for ${actual} ${type} damage.`,'badlog');}else log(`${enemy.name} uses ${action.name} against ${hero.name}: miss.`,'rolllog');
  }
 }
 did=true;return did;
}
function sr18PrepareMonsterTurn(enemy){
 const b=state.combat;enemy.conditions=Array.isArray(enemy.conditions)?enemy.conditions:[];enemy._sr18Recharge=enemy._sr18Recharge||{};
 if(enemy._sr18LegendaryRound!==b.round){enemy.legendaryRemaining=Number(enemy.statBlock?.legendary_actions_per_round||3);enemy._sr18LegendaryRound=b.round;}
 enemy.reactionAvailable=true;enemy._sr18ParryUsed=false;enemy._sr18ReductionUsed=false;
 for(const action of enemy.actions||[]){const recharge=sr18ParseRecharge(action);if(!recharge)continue;const key=sr18Text(action.name);if(enemy._sr18Recharge?.[key]===false){const roll=die(6);if(roll>=recharge.min&&roll<=recharge.max){enemy._sr18Recharge[key]=true;log(`${enemy.name} recharges ${key}.`,'rolllog');}}else if(!enemy._sr18Recharge)enemy._sr18Recharge={};
 }
}
function sr18ChooseMonsterAction(enemy,target){
 const actions=(enemy.actions||[]).filter(a=>!/^multiattack$/i.test(a.name||'')&&(sr14MonsterActionDamage(a)||sr14ParseMonsterSave(a.description)||/restrain|grapple|swallow|knock prone|pushes?|pulls?/i.test(a.description||'')));
 const ready=actions.filter(a=>{const recharge=sr18ParseRecharge(a);return !recharge||enemy._sr18Recharge?.[a.name]!==false;});
 const dist=enemy.pos&&target?.pos?sr12Distance(enemy.pos,target.pos):0;
 return ready.sort((a,b)=>{
  const score=x=>{const s=sr14ParseMonsterSave(x.description),r=sr18ParseActionRange(x),avg=sr18DiceAverage(sr14MonsterActionDamage(x)||enemy.damage);return avg+(s?2:0)+(sr18ParseCondition(x.description)?3:0)+(r.ranged&&dist>r.reach?6:0)+(Number(x.attack_bonus)||0)*.12;};return score(b)-score(a);
 })[0]||null;
}
function sr18MonsterMorale(enemy){
 if(!enemy||enemy.hp<=0||enemy.surrendered||enemy.fled)return false;
 const ratio=Number(enemy.hp)/Math.max(1,Number(enemy.maxHp)||1),intelligent=Number(enemy.stats?.int??enemy.statBlock?.ability_scores?.int??10)>=6||/humanoid|giant|fiend|cult|bandit|guard|mercenary/i.test(`${enemy.type} ${enemy.kind} ${enemy.name}`);
 if(ratio>.18||!intelligent||enemy.role==='boss'||enemy.legendaryActions?.length)return false;
 const chance=Math.min(65,25+Math.floor((.18-ratio)*180));if(rand(1,100)>chance)return false;
 if(/bandit|mercenary|guard|humanoid|cult/i.test(`${enemy.type} ${enemy.name}`)){enemy.surrendered=true;enemy.hp=0;enemy.gold=[0,0];enemy.conditions=enemy.conditions||[];sr11Add(enemy,'incapacitated',-1,'surrender');log(`${enemy.name} drops their weapon and surrenders rather than die. The threat is over, but the party may question or spare them.`,'goodlog');}
 else{enemy.fled=true;enemy.hp=0;enemy.xp=0;enemy.gold=[0,0];log(`${enemy.name} breaks morale and flees the battlefield.`,'rolllog');}
 return true;
}
function sr18MonsterTurnSolo(entry){
 const b=state.combat,enemy=b?.enemies?.[entry?.index];if(!enemy?.statBlock||enemy._sr18ActedTurn===`${b.round}:${entry.index}`)return false;
 sr18PrepareMonsterTurn(enemy);enemy._sr18ActedTurn=`${b.round}:${entry.index}`;
 if((enemy.conditions||[]).some(x=>['incapacitated','stunned','paralyzed','unconscious'].includes(typeof x==='string'?x:x.name))){log(`${enemy.name} cannot act because of a condition.`,'muted');return true;}
 const target=sr18MonsterTarget(enemy);if(!target)return false;
 const seq=sr18AvailableMultiattack(enemy);let action=seq?.[0]||sr18ChooseMonsterAction(enemy,target);
 if(!action)return false;
 if(seq){
  const range=sr18ParseActionRange(seq[0]),dist=enemy.pos&&target.pos?sr12Distance(enemy.pos,target.pos):0;
  if(!range.ranged&&dist>range.reach&&typeof sr10EnemyMove==='function'){
   sr10EnemyMove(enemy);
   if(sr12Distance(enemy.pos,target.pos)>range.reach){sr18MonsterMorale(enemy);return true;}
  }
  let used=0;for(const a of seq){if(state.character.hp<=0||enemy.hp<=0)break;if(sr18ResolveMonsterAction(enemy,a,target)){used++;sr18MarkRechargeUsed(enemy,a);}}
  if(used)log(`${enemy.name} completes its Multiattack (${used} attacks resolved).`,'badlog');
 }else if(sr18ResolveMonsterAction(enemy,action,target))sr18MarkRechargeUsed(enemy,action);
 sr18MonsterMorale(enemy);return true;
}
const sr18SoloMonsterTurnBase=sr10EnemyTurn;
sr10EnemyTurn=function(entry){if(sr18MonsterTurnSolo(entry))return;return sr18SoloMonsterTurnBase(entry);};
const sr18MPMonsterTurnBase=sr12EnemyTurn;
sr12EnemyTurn=function(enemy){
 if(!enemy?.statBlock)return sr18MPMonsterTurnBase(enemy);
 sr18PrepareMonsterTurn(enemy);
 const target=sr18MonsterTarget(enemy);if(!target)return;
 if((enemy.conditions||[]).some(x=>['incapacitated','stunned','paralyzed','unconscious'].includes(typeof x==='string'?x:x.name))){log(`${enemy.name} cannot act because of a condition.`,'muted');return;}
 const seq=sr18AvailableMultiattack(enemy),action=seq?.[0]||sr18ChooseMonsterAction(enemy,target);if(!action)return sr18MPMonsterTurnBase(enemy);
 if(seq){const d=sr18ParseActionRange(seq[0]),dist=enemy.pos&&target.pos?sr12Distance(enemy.pos,target.pos):0;if(!d.ranged&&dist>d.reach){sr12EnemyStep(enemy,target.pos);if(sr12Distance(enemy.pos,target.pos)>d.reach){enemy.specialUsedRound=state.combat.round;return;}}let done=0;for(const a of seq){if(target.player.character.hp<=0)break;if(sr18ResolveMonsterAction(enemy,a,target)){done++;sr18MarkRechargeUsed(enemy,a);}}if(done)log(`${enemy.name} completes its Multiattack (${done} attacks resolved).`,'badlog');}
 else{const d=sr18ParseActionRange(action),dist=enemy.pos&&target.pos?sr12Distance(enemy.pos,target.pos):0;if(!d.ranged&&dist>d.reach){sr12EnemyStep(enemy,target.pos);if(sr12Distance(enemy.pos,target.pos)>d.reach){enemy.specialUsedRound=state.combat.round;return;}}if(sr18ResolveMonsterAction(enemy,action,target))sr18MarkRechargeUsed(enemy,action);}
 sr18MonsterMorale(enemy);enemy.specialUsedRound=state.combat.round;return;
};
function sr18RunLegendaryAction(enemy){
 if(!enemy?.legendaryActions?.length||enemy.hp<=0)return false;
 const max=Number(enemy.statBlock?.legendary_actions_per_round||3);enemy.legendaryRemaining=Number(enemy.legendaryRemaining??max);const target=sr18MonsterTarget(enemy);if(!target||enemy.legendaryRemaining<=0)return false;
 const available=enemy.legendaryActions.map(a=>({a,cost:Number(a.cost)||Number((sr18Text(a.description).match(/costs?\s+(\d+)\s+actions?/i)||[])[1]||1)})).filter(x=>x.cost<=enemy.legendaryRemaining);
 const selected=available.sort((x,y)=>sr18DiceAverage(sr14MonsterActionDamage(y.a))-sr18DiceAverage(sr14MonsterActionDamage(x.a)))[0];if(!selected)return false;
 const did=sr18ResolveMonsterAction(enemy,selected.a,target);if(did){enemy.legendaryRemaining-=selected.cost;log(`${enemy.name} spends ${selected.cost} Legendary Action${selected.cost===1?'':'s'} on ${selected.a.name}.`,'badlog');return true;}return false;
}
function sr18LegendaryActionsAfterHero(){const b=state.combat;if(!b)return;for(const e of b.enemies||[])if(e.hp>0)sr18RunLegendaryAction(e);}
const sr18AdvanceCombatBase=sr10Advance;
sr10Advance=function(){sr18LegendaryActionsAfterHero();return sr18AdvanceCombatBase();};
const sr18LegendaryMPBase=sr14LegendaryActionsAfterTurn;
sr14LegendaryActionsAfterTurn=function(){if(!state.combat?.mp)return;for(const e of state.combat.enemies||[])sr18RunLegendaryAction(e);};
const sr18ApplyDamageBase=sr12ApplyDamage;
sr12ApplyDamage=function(enemy,amount,type='physical'){
 let n=Number(amount)||0;
 if(enemy?.reactions?.length&&enemy.reactionAvailable!==false&&!enemy._sr18ReductionUsed){const reaction=enemy.reactions.find(x=>/reduce[s]? (?:the )?damage|takes? .*?less damage|halve[s]? the damage/i.test(`${x.name} ${x.description}`));if(reaction){const formula=(reaction.description.match(/\b\d+d\d+(?:\s*[+-]\s*\d+)?\b/i)||[])[0];const reduction=formula?rollDice(formula):0;if(reduction>0){n=Math.max(0,n-reduction);enemy.reactionAvailable=false;enemy._sr18ReductionUsed=true;log(`${enemy.name} uses ${reaction.name} to reduce the damage by ${reduction}.`,'rolllog');}}}
 const applied=sr18ApplyDamageBase(enemy,n,type);if(applied>0&&enemy.hp>0)sr18MonsterMorale(enemy);return applied;
};

// Improvisation catalogue: non-standard actions resolve with an appropriate skill, risk and alternate routes.
const SR18_IMPROV_RULES=[
 {id:'toolcraft',re:/\b(repair|craft|build|assemble|rig|modify|jam|disable|sabotage|pick the mechanism|use my tools|thieves' tools|tinker's tools)\b/i,skill:'Investigation',dc:13,title:'A Solution Made by Hand',n:'You turn the available materials and tools into a practical attempt. The quality of the result depends on the materials, the time available, and what the mechanism was designed to do.',yes:'The improvised tool or repair works well enough to create a new option.',no:'The attempt reveals how the object works, but a piece slips, breaks, or makes enough noise to draw attention.',choices:[['Study the mechanism first','Investigation',12],['Use careful hands and patience','Sleight',13],['Force a temporary solution','Athletics',14]]},
 {id:'environment',re:/\b(lever|pulley|rope|crates?|barrel|oil|water|sand|stone|boulder|bridge|door|window|ledge|chandelier|ceiling|floor|trap|terrain|environment|use the room|collapse|block the path)\b/i,skill:'Investigation',dc:12,title:'The Environment Is Part of the Encounter',n:'You look beyond the obvious target and consider the space itself. Objects, terrain, tools, sightlines and hazards can change what is possible; the attempt still has to respect weight, leverage and time.',yes:'You use the surroundings to create a meaningful advantage or a new route.',no:'The environment resists the plan or makes a noise. You learn something useful, but the situation changes.',choices:[['Inspect the safest point of leverage','Investigation',12],['Move quickly before anyone reacts','Athletics',14],['Set up a distraction elsewhere','Performance',12]]},
 {id:'animal',re:/\b(animal|beast|horse|dog|wolf|hawk|mount|pet|calm the creature|train the creature|command the beast)\b/i,skill:'AnimalHandling',dc:12,title:'A Creature Has Its Own Instincts',n:'You approach the creature as a living animal with needs, fear and instincts. It does not understand every word, and a hungry or frightened beast may not respond to kindness alone.',yes:'The creature accepts the immediate approach and gives you a useful opportunity.',no:'The creature startles or holds its ground. It is not automatically hostile, but you need another approach.',choices:[['Offer food and give it space','AnimalHandling',11],['Read its body language','Insight',12],['Create a safe path for it','Nature',13]]},
 {id:'arcaneimprov',re:/\b(combine|improvise|experiment|improvised|creative|weird|unexpected|spell combo|combine spells|use magic to|magically|rune|glyph|arcane device|enchant|transmute)\b/i,skill:'Arcana',dc:14,title:'An Unusual Use of Magic',n:'You test an idea that is not a standard spell action. The Director considers the spell text, your available components, the target, and whether the effect can reasonably follow from the magic you possess.',yes:'The experiment produces a limited, plausible effect. It does not grant a free spell or bypass a spell’s costs.',no:'The magic behaves imperfectly. You learn what the idea cannot do, and the scene changes without inventing a new spell slot or free power.',choices:[['Research the magical principle','Arcana',13],['Use a safer, smaller effect','Arcana',11],['Try a physical method instead','Investigation',12]]},
 {id:'deception',re:/\b(lie|lying|deceiv|bluff|fake|impersonat|disguise|mislead|forge|pretend to be)\b/i,skill:'Deception',dc:13,title:'A Story Under Scrutiny',n:'You present a deliberate falsehood or disguise. The listener considers what they know, what they stand to lose, and whether the story fits the details in front of them.',yes:'The story holds for now. The listener acts on it, but the lie may unravel if new evidence appears.',no:'A detail does not fit. The listener is not omniscient, but their suspicion rises and may be remembered.',choices:[['Support the story with a verifiable detail','Deception',13],['Change the subject without drawing attention','Performance',12],['Admit part of the truth and bargain','Persuasion',12]]},
 {id:'escape',re:/\b(escape|slip away|break free|squeeze through|evade|dodge past|hide from|vanish|run away|flee|get out)\b/i,skill:'Acrobatics',dc:13,title:'Finding a Way Out',n:'You look for a gap, timing window, or route that avoids the strongest point of opposition. The route may be narrow, exposed, or costly, but escape is a real option.',yes:'You get clear or create enough space to choose your next move.',no:'You are delayed or leave a trace. The opposition reacts, but the escape route is not erased.',choices:[['Use speed and agility','Acrobatics',13],['Create a diversion','Deception',13],['Find cover and break line of sight','Stealth',12]]},
 {id:'stealth',re:/\b(sneak|hide|shadow|infiltrat|conceal|sneak past|move quietly|stay out of sight|scout ahead)\b/i,skill:'Stealth',dc:13,title:'A Quiet Route',n:'You use timing, cover and sound to move without drawing attention. The environment and the observers matter; success is not invisibility, and failure need not mean immediate combat.',yes:'You reach a useful position or pass without being noticed.',no:'Someone notices a sign of movement or becomes alert. You may still retreat, distract them, or change routes.',choices:[['Wait for a distraction','Stealth',12],['Study the watchers first','Perception',12],['Create a believable reason to be there','Deception',13]]},
 {id:'performance',re:/\b(perform|sing|dance|play music|tell a joke|entertain|imitate|impersonate|distract|stage a scene|pretend)\b/i,skill:'Performance',dc:12,title:'A Moment of Distraction',n:'You try to influence attention rather than force a direct outcome. The audience has its own tastes and suspicions; the performance can create an opening without controlling everyone.',yes:'The audience responds, opening a short window or changing the mood.',no:'The act draws the wrong kind of attention or fails to hold the room. You can still pivot.',choices:[['Lean into the performance','Performance',12],['Pass the moment off as a misunderstanding','Deception',13],['Use the distraction to move','Sleight',13]]},
 {id:'research',re:/\b(research|decipher|translate|read the inscription|remember lore|recall|identify the symbol|study the map|cross-reference)\b/i,skill:'History',dc:12,title:'Knowledge Is a Lead, Not a Shortcut',n:'You compare the available evidence with what you know. The result can clarify a name, custom, weakness, or next lead, but it does not invent facts that the campaign has not established.',yes:'You identify a reliable detail and a useful next question.',no:'You narrow the possibilities but cannot yet distinguish the truth from a convincing interpretation.',choices:[['Search for a second source','Investigation',12],['Recall regional customs','History',12],['Look for magical traces','Arcana',13]]}
];
function sr18ClassifyImprovisation(text){const t=sr18Text(text);const arcane=SR18_IMPROV_RULES.find(x=>x.id==='arcaneimprov');if(arcane?.re.test(t))return arcane;for(const rule of SR18_IMPROV_RULES)if(rule.id!=='arcaneimprov'&&rule.re.test(t))return rule;return null;}
const sr18IntentBase=sr16Intent;
sr16Intent=function(text){const rule=sr18ClassifyImprovisation(text);return rule?rule.id:sr18IntentBase(text);};
function sr18ImprovisationDecision(text){
 const rule=sr18ClassifyImprovisation(text);if(!rule)return null;
 const raw=sr18Text(text).slice(0,360),ctx=sr18Text(state.campaign?.scene?.text||''),inventory=(state.character?.inventory||[]).map(x=>sr18Text(x.name).toLowerCase());
 let dc=rule.dc;if(/impossible|impossibly|while falling|through solid|without any|from across the kingdom/i.test(raw))dc+=4;if(/carefully|slowly|prepare|study first|plan ahead/i.test(raw))dc-=1;
 const hasUsefulGear=inventory.some(x=>/(rope|tool|kit|lockpick|thieves|tinker|climber|mirror|oil|chalk|crowbar)/.test(x));
 const narrative=rule.n+(hasUsefulGear?' Your carried equipment gives you a credible way to attempt this.':'')+(ctx?' The current scene is considered before the result is narrated.':'');
 return {title:rule.title,narration:narrative,skill:rule.skill,dc:Math.max(8,Math.min(22,dc)),successText:rule.yes,failureText:rule.no,reward:rule.id==='research'||rule.id==='environment'?'clue':'progress',damageOnFailure:rule.id==='escape'?1:0,combat:false,choices:rule.choices.map(x=>({label:x[0],sub:'A different approach; the result is resolved with its own check.',skill:x[1],dc:x[2],success:'This approach opens another route.',fail:'The situation shifts and another choice remains.',reward:'none'})),memory:`Player attempted an improvised ${rule.id} action: ${raw}. The adjudication preserves established spell, equipment and campaign limits.`};
}
const sr18OfflineDecisionBase=srAIOfflineDecision;
srAIOfflineDecision=function(text,kind='action'){if(kind==='action'){const improv=sr18ImprovisationDecision(text);if(improv)return improv;}return sr18OfflineDecisionBase(text,kind);};
const sr18AISystemBase=srAISystem;
srAISystem=function(kind='action'){return sr18AISystemBase(kind)+`\nV18 RULES-AWARE IMPROVISATION: Treat the spell index and monster stat blocks as mechanics, not decorative lore. For spells, do not invent range, targets, components, concentration, duration, saving throw, damage or slot use. Prefer structured installed spell fields; do not replace one spell with a stronger unrelated effect. For monsters, use the listed action, recharge, Multiattack, reaction, legendary action, movement, resistance, immunity and morale where applicable. Player actions may use terrain, equipment, social leverage, stealth, animals, magic and tools. State what is plausible and what is impossible; when an idea is possible, choose one appropriate check and DC, then let the client roll. Give failure consequences and alternate routes. A clever success may bypass an encounter or resolve a quest without secretly restoring the skipped obstacle. Preserve the established world state and companion agency.`;};

// Living campaign simulation: faction goals, pressure clocks, rumors, delayed developments and a persistent ledger.
const SR18_FACTION_SEEDS=[
 {name:'The Crown Watch',goal:'keep roads and settlements under lawful control',face:'public order',secret:'an officer is selling patrol routes',territory:'the main roads'},
 {name:'The Ashen Compact',goal:'recover forbidden relics before rival powers do',face:'scholarly preservation',secret:'its leaders disagree about what should be awakened',territory:'old ruins'},
 {name:'The Free Traders',goal:'secure routes and profitable agreements',face:'prosperity and mutual aid',secret:'two trading houses are quietly undermining one another',territory:'markets and river crossings'},
 {name:'The Greenwardens',goal:'protect wild places and the people who depend on them',face:'stewardship',secret:'a wounded guardian has become dangerously territorial',territory:'forests and borderlands'},
 {name:'The Lantern Company',goal:'win contracts and recover dangerous treasures',face:'independent adventurers',secret:'their leader is hiding a failed expedition',territory:'the frontier'}
];
function sr18EnsureWorld(){
 const c=state?.campaign;if(!c)return null;
 c.sr18=c.sr18&&typeof c.sr18==='object'?c.sr18:{};const w=c.sr18;
 w.version=SR18_VERSION;w.clock=w.clock&&typeof w.clock==='object'?w.clock:{day:Number(c.day)||1,watch:1,actionTicks:0};w.clock.day=Math.max(1,Number(w.clock.day)||Number(c.day)||1);w.clock.watch=Math.max(1,Number(w.clock.watch)||1);w.clock.actionTicks=Math.max(0,Number(w.clock.actionTicks)||0);
 w.factions=Array.isArray(w.factions)?w.factions:SR18_FACTION_SEEDS.map(x=>({...x,pressure:0,standing:'watchful',progress:0,history:[]}));
 w.factions.forEach(f=>{f.pressure=Math.max(0,Math.min(6,Number(f.pressure)||0));f.progress=Math.max(0,Number(f.progress)||0);f.history=Array.isArray(f.history)?f.history:[];});
 w.clocks=Array.isArray(w.clocks)?w.clocks:[{id:'local-tension',name:'Local tension',value:0,limit:6,description:'Rumors, shortages, and public conflict strain the settlement.'},{id:'relic-race',name:'The relic race',value:0,limit:6,description:'Rival groups search for the same lost power.'}];
 w.events=Array.isArray(w.events)?w.events:[];w.rumors=Array.isArray(w.rumors)?w.rumors:[];w.actionLedger=Array.isArray(w.actionLedger)?w.actionLedger:[];w.deadlines=Array.isArray(w.deadlines)?w.deadlines:[];
 w.lastEventDay=Number(w.lastEventDay)||w.clock.day;w.lastPressureTick=Number(w.lastPressureTick)||0;
 return w;
}
function sr18AddWorldEvent(kind,text,meta={}){
 const w=sr18EnsureWorld();if(!w)return null;const e={id:makeId(),day:w.clock.day,watch:w.clock.watch,kind,text:sr18Text(text).slice(0,400),meta,at:Date.now()};w.events.unshift(e);w.events=w.events.slice(0,40);
 try{if(typeof sr16AddWorldEvent==='function')sr16AddWorldEvent(kind,e.text,meta);}catch(err){}
 return e;
}
function sr18AdvanceWorld(reason='action',days=0){
 const c=state.campaign,w=sr18EnsureWorld();if(!w)return;
 w.clock.actionTicks++;
 const advance=Math.max(0,Math.min(30,Number(days)||0));
 if(advance){w.clock.day+=advance;c.day=Math.max(Number(c.day)||1,w.clock.day);w.clock.watch=1;}
 else if(/travel|rest|downtime|sleep|research|craft/i.test(reason)){w.clock.watch++;if(w.clock.watch>SR18_WATCHES_PER_DAY){w.clock.watch=1;w.clock.day++;c.day=Math.max(Number(c.day)||1,w.clock.day);}}
 if(w.clock.actionTicks-w.lastPressureTick>=3||advance){w.lastPressureTick=w.clock.actionTicks;for(const f of w.factions){const linked=(c.sr14?.factions||{})[f.name];if(linked&&Number(linked.reputation)>=20)f.pressure=Math.max(0,f.pressure-1);else if(f.standing!=='allied')f.pressure=Math.min(6,f.pressure+1);}}
 for(const clock of w.clocks){if(clock.value>=clock.limit){clock.value=0;const faction=w.factions.slice().sort((a,b)=>b.pressure-a.pressure)[0];const event=clock.id==='local-tension'?`${c.location||'The settlement'} grows tense: patrols tighten, prices shift, and rumors spread as ${faction?.name||'local groups'} press their interests.`:`The race for ${c.story?.relic||'the lost relic'} accelerates. ${faction?.name||'A rival faction'} makes a move while the party is elsewhere.`;sr18AddWorldEvent('world-clock',event,{clock:clock.id,faction:faction?.name||''});if(faction){faction.progress++;faction.history.unshift({day:w.clock.day,text:event});faction.history=faction.history.slice(0,8);}break;}}
 if(w.clock.actionTicks%5===0){const f=w.factions[(Math.floor(w.clock.actionTicks/5)-1)%w.factions.length];if(f){const rumor=`Rumor: ${f.name} is trying to ${f.goal}.`;w.rumors.unshift({day:w.clock.day,text:rumor,source:f.name});w.rumors=w.rumors.slice(0,12);}}
 if(w.clock.day>w.lastEventDay){w.lastEventDay=w.clock.day;const npc=(c.npcs||[]).filter(n=>Number(n.grievance)>=20).sort((a,b)=>b.grievance-a.grievance)[0];if(npc&&rand(1,100)<=30)sr18AddWorldEvent('npc-reaction',`${npc.name} has not forgotten the party's past actions and has begun taking precautions.`,{npc:npc.name});}
 return w;
}
const sr18RecordActionBase=sr16RecordPlayerAction;
sr16RecordPlayerAction=function(text,options={}){const out=sr18RecordActionBase(text,options);if(out&&state.campaign){const w=sr18EnsureWorld();w.actionLedger.unshift({id:out.id,day:w.clock.day,kind:out.kind,text:out.text,target:out.target,success:out.success,location:out.location});w.actionLedger=w.actionLedger.slice(0,60);const kind=out.kind;if(['violence','theft','intimidation'].includes(kind))w.clocks[0].value=Math.min(w.clocks[0].limit,w.clocks[0].value+1);if(['investigation','negotiation','deception'].includes(kind))w.clocks[1].value=Math.min(w.clocks[1].limit,w.clocks[1].value+1);if(!options.noTick)sr18AdvanceWorld('action',0);}return out;};
const sr18TravelBase=travelRegion;
travelRegion=function(index){const beforeDay=Number(state.campaign?.day)||1,beforeLocation=state.campaign?.location,beforeRegion=state.campaign?.region;const out=sr18TravelBase(index);if(state.campaign&&out!==false&&(Number(state.campaign.day)!==beforeDay||state.campaign.location!==beforeLocation||state.campaign.region!==beforeRegion)){const delta=Math.max(0,(Number(state.campaign.day)||beforeDay)-beforeDay);sr18AdvanceWorld('travel',delta||1);}return out;};
const sr18LongRestBase=longRest;
longRest=function(){const before=Number(state.campaign?.day)||1;const out=sr18LongRestBase();if(state.campaign&&Number(state.campaign.day)>before)sr18AdvanceWorld('long rest',Number(state.campaign.day)-before);return out;};
const sr18JournalBase=journalPage;
journalPage=function(){let html=sr18JournalBase();const w=sr18EnsureWorld();if(!w)return html;const faction=w.factions.map(f=>`<div class="item-row"><div><strong>${esc(f.name)}</strong><p class="tagline">${esc(f.goal)}</p></div><span class="pill">Pressure ${f.pressure}/6</span></div>`).join('');const events=w.events.slice(0,8).map(e=>`<div class="feed-entry"><strong>Day ${e.day} · ${esc(e.kind)}</strong><p>${esc(e.text)}</p></div>`).join('')||'<p class="muted smalltext">No major world developments yet.</p>';const rumors=w.rumors.slice(0,4).map(r=>`<div class="item-row"><span>${esc(r.text)}</span><span class="tagline">Day ${r.day}</span></div>`).join('');const panel=`<section class="card"><div class="eyebrow">V18 · Living world ledger</div><h3>Time, factions & world pressure</h3><p class="smalltext muted">Day ${w.clock.day} · Watch ${w.clock.watch} · ${w.clock.actionTicks} tracked actions. Groups pursue goals while the party rests, travels and makes decisions; clocks create optional developments rather than forcing encounters.</p>${faction}<h3 style="margin-top:12px">Recent developments</h3>${events}<h3 style="margin-top:12px">Rumors in circulation</h3>${rumors||'<p class="muted smalltext">No current rumors.</p>'}</section>`;return html.replace('<section class="card"><h3>Chronicle history</h3>',panel+'<section class="card"><h3>Chronicle history</h3>');};
const sr18AIContextBase=srAIContext;
srAIContext=function(){const x=sr18AIContextBase();const w=sr18EnsureWorld();if(x?.campaign&&w)x.campaign.worldSimulation={clock:w.clock,factions:w.factions.map(f=>({name:f.name,goal:f.goal,pressure:f.pressure,progress:f.progress,standing:f.standing})),clocks:w.clocks,rumors:w.rumors.slice(0,5),events:w.events.slice(0,8),actionLedger:w.actionLedger.slice(0,10)};return x;};

// Eight independent save slots plus an IndexedDB recovery ring. Existing V3/V17 saves remain importable.
function sr18OpenDB(){
 if(typeof indexedDB==='undefined')return Promise.reject(new Error('IndexedDB unavailable'));
 if(SR18_DB_PROMISE)return SR18_DB_PROMISE;
 let connection;
 const pending=new Promise((resolve,reject)=>{
  let req;
  try{req=indexedDB.open(SR18_SAVE_DB,1);}catch(error){reject(error);return;}
  req.onupgradeneeded=()=>{const db=req.result;for(const store of ['slots','recovery'])if(!db.objectStoreNames.contains(store))db.createObjectStore(store);};
  req.onsuccess=()=>{connection=req.result;if(!connection){reject(new Error('Save archive opened without a database connection'));return;}connection.onversionchange=()=>{try{connection.close();}catch(error){}if(SR18_DB_PROMISE===cached)SR18_DB_PROMISE=null;};resolve(connection);};
  req.onerror=()=>reject(req.error||new Error('Could not open save archive'));
 });
 const cached=pending.catch(error=>{if(SR18_DB_PROMISE===cached)SR18_DB_PROMISE=null;throw error;});
 SR18_DB_PROMISE=cached;
 return cached;
}
async function sr18DBPut(store,key,value){const db=await sr18OpenDB();return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(value,key);tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error||new Error('Save archive write failed'));tx.onabort=()=>reject(tx.error||new Error('Save archive write aborted'));});}
async function sr18DBGet(store,key){const db=await sr18OpenDB();return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readonly'),req=tx.objectStore(store).get(key);req.onsuccess=()=>resolve(req.result??null);req.onerror=()=>reject(req.error||new Error('Save archive read failed'));});}
async function sr18DBDelete(store,key){const db=await sr18OpenDB();return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).delete(key);tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error||new Error('Save archive delete failed'));});}
function sr18Snapshot(label='Manual save'){return {schema:'solo-realms-v18-save-v1',game:'Solo Realms',version:SR18_VERSION,label:String(label).slice(0,60),savedAt:new Date().toISOString(),state:JSON.parse(JSON.stringify(state))};}
function sr18ValidateSave(value){return SR22SaveGuard.validate(value,{abilities:ABILITIES,classes:CLASSES,ancestries:ANCESTRIES});}
async function sr18StoreSlot(n,label=''){n=Number(n);if(!Number.isInteger(n)||n<1||n>SR18_MAX_SLOTS)throw new Error('Choose a save slot from 1 to 8.');if(!state.character||!state.campaign)throw new Error('Create a character and campaign before saving a slot.');const snap=sr18Snapshot(label||`Slot ${n}`),record={...snap,slot:n,hero:state.character.name,level:state.character.level,region:state.campaign.region||state.campaign.location||'Unknown region'};try{await sr18DBPut('slots',String(n),record);}catch(e){const json=JSON.stringify(record);if(json.length>1800000)throw new Error('This browser cannot store a save this large without IndexedDB.');localStorage.setItem(SR18_SLOT_PREFIX+n,json);}return record;}
async function sr18ReadSlot(n){try{const x=await sr18DBGet('slots',String(n));if(x)return x;}catch(e){}for(const key of [SR18_SLOT_PREFIX+n,`solo-realms-v3-slot-${n}`,`solo-realms-v17-slot-${n}`]){try{const raw=localStorage.getItem(key);if(!raw)continue;const parsed=JSON.parse(raw);const snap=sr18NormalizeImported(parsed);if(sr18ValidateSave(snap).ok)return parsed;}catch(e){}}return null;}
async function sr18DeleteSlot(n){try{await sr18DBDelete('slots',String(n));}catch(e){}try{localStorage.removeItem(SR18_SLOT_PREFIX+n);}catch(e){}return true;}
async function sr18WriteRecovery(reason='autosave'){
 if(!state?.character||!state?.campaign)return false;
 const snap=sr18Snapshot(reason);try{SR18_RECOVERY_SEQ=Math.max(SR18_RECOVERY_SEQ,Number(localStorage.getItem(SR18_RECOVERY_PREFIX+'sequence'))||0);}catch(e){}const slot=SR18_RECOVERY_SEQ++%6;const record={...snap,reason,sequence:SR18_RECOVERY_SEQ};try{localStorage.setItem(SR18_RECOVERY_PREFIX+'sequence',String(SR18_RECOVERY_SEQ));}catch(e){}
 try{await sr18DBPut('recovery',String(slot),record);SR18_LAST_RECOVERY=Date.now();return true;}
 catch(e){try{const json=JSON.stringify(record);if(json.length<1500000){localStorage.setItem(SR18_RECOVERY_PREFIX+'latest',json);SR18_LAST_RECOVERY=Date.now();return true;}}catch(storageError){}return false;}
}
function sr18QueueRecovery(){if(!state?.character||!state?.campaign)return;if(SR18_RECOVERY_TIMER)clearTimeout(SR18_RECOVERY_TIMER);SR18_RECOVERY_TIMER=setTimeout(()=>{SR18_RECOVERY_TIMER=null;if(Date.now()-SR18_LAST_RECOVERY>45000)sr18WriteRecovery('automatic recovery snapshot');},1400);}
async function sr18LatestRecovery(){let candidates=[];for(let i=0;i<6;i++){try{const x=await sr18DBGet('recovery',String(i));if(x)candidates.push(x);}catch(e){break;}}try{const x=JSON.parse(localStorage.getItem(SR18_RECOVERY_PREFIX+'latest')||'null');if(x)candidates.push(x);}catch(e){}return candidates.sort((a,b)=>String(b.savedAt).localeCompare(String(a.savedAt)))[0]||null;}
function sr18NormalizeImported(value){if(value?.schema==='solo-realms-v18-save-v1')return value.state;return value?.state?.character&&value?.state?.campaign?value.state:value;}
async function sr18RestoreState(s,label='save'){
 const valid=sr18ValidateSave(sr18NormalizeImported(s));if(!valid.ok)throw new Error(valid.reason);
 if(state?.character&&state?.campaign){const protectedCurrent=await sr18WriteRecovery('before loading another save');if(!protectedCurrent)throw new Error('The current campaign could not be backed up. Loading was cancelled to protect your progress.');}
 state=valid.state;srEnsureState();sr3EnsureCampaign();if(state.character)sr14EnsureCharacter(state.character);sr18EnsureWorld();state.log=Array.isArray(state.log)?state.log:[];save();document.getElementById('dynamicModal')?.remove();render();toast(`Restored ${state.character.name} from ${label}.`);return true;
}
async function sr18SaveExport(){if(!state?.character||!state?.campaign){toast('There is no active campaign to export.');return false;}return sr17Download(`${(state.character.name||'Solo_Realms').replace(/[^a-z0-9_-]+/gi,'_')}_Campaign_Save_V18.json`,JSON.stringify(sr18Snapshot('Portable campaign backup'),null,2),'application/json');}
async function sr18ImportFile(file){if(!file)return false;try{if(file.size>12000000)throw new Error('Campaign save is larger than the 12 MB import limit.');const raw=await file.text(),parsed=JSON.parse(raw);const snap=sr18NormalizeImported(parsed),valid=sr18ValidateSave(snap);if(!valid.ok)throw new Error(valid.reason);await sr18RestoreState(snap,'imported backup');return true;}catch(e){toast(`Import failed: ${e.message||e}`);return false;}}
async function sr18SaveCenter(){
 const slots=[];for(let n=1;n<=SR18_MAX_SLOTS;n++)slots.push({n,record:await sr18ReadSlot(n)});
 const recovery=await sr18LatestRecovery();
 const rows=slots.map(({n,record})=>`<div class="shop-item"><div class="item-row"><strong>Slot ${n}</strong><span class="pill">${record?'Saved':'Empty'}</span></div><p>${record?`${esc(record.hero||record.state?.character?.name||'Hero')} · Level ${record.level||record.state?.character?.level||'?'} · ${esc(record.region||record.state?.campaign?.region||'Unknown region')}<br><span class="tagline">${esc(record.savedAt||'')}</span>`:'No save in this slot yet.'}</p><div class="item-actions"><button class="btn small primary" data-action="sr18-save-slot" data-slot="${n}" ${!state.character?'disabled':''}>Save here</button>${record?`<button class="btn small" data-action="sr18-load-slot" data-slot="${n}">Load</button><button class="btn small danger" data-action="sr18-delete-slot" data-slot="${n}">Delete</button>`:''}</div></div>`).join('');
 showModal(`<div class="eyebrow">V18 · Save & recovery</div><h2>Campaign save center</h2><p class="modal-intro">Eight independent save slots are stored in IndexedDB where available. Automatic recovery snapshots are kept separately from manual slots. Export a JSON backup to move a campaign to another browser or device.</p><div class="shop-grid">${rows}</div><section class="card"><h3>Recovery</h3><p class="smalltext">${recovery?`Latest recovery snapshot: ${esc(recovery.savedAt||'unknown time')} · ${esc(recovery.state?.character?.name||'Hero')} · ${esc(recovery.reason||'automatic')}`:'No automatic recovery snapshot is available yet.'}</p><button class="btn" data-action="sr18-recover-latest" ${recovery?'':'disabled'}>Recover latest autosave</button><p class="tagline">Loading a slot or recovery snapshot first creates another recovery point for your current campaign.</p></section><div class="item-actions"><button class="btn" data-action="sr18-export-save" ${state.character?'':'disabled'}>Download campaign backup (.json)</button><button class="btn" data-action="sr18-import-save">Import campaign backup</button><input id="sr18SaveFile" type="file" accept="application/json,.json" hidden></div><div class="form-footer"><button class="btn subtle" data-action="sr18-close-save">Close</button></div>`);
}
const sr18SaveBase=save;
save=function(){if(state?.campaign)sr18EnsureWorld();const out=sr18SaveBase();sr18QueueRecovery();return out;};
const sr18HeaderBase=header;
header=function(){const html=sr18HeaderBase();const anchor='data-action="sr17-open-game-menu">New / Restart</button>';return html.includes(anchor)?html.replace(anchor,anchor+'<button class="btn subtle" data-action="sr18-open-save-center">Save Center</button>'):html.replace('</div></header>','<button class="btn subtle" data-action="sr18-open-save-center">Save Center</button></div></header>');};

document.addEventListener('click',async function(event){
 const button=event.target?.closest?.('[data-action^="sr18-"]');if(!button)return;
 event.preventDefault();event.stopImmediatePropagation();const n=Number(button.dataset.slot);
 try{switch(button.dataset.action){
  case'sr18-open-save-center':await sr18SaveCenter();break;
  case'sr18-close-save':document.getElementById('dynamicModal')?.remove();break;
  case'sr18-save-slot':{const rec=await sr18StoreSlot(n);toast(`Campaign saved in slot ${n}.`);await sr18SaveCenter();break;}
  case'sr18-load-slot':{const rec=await sr18ReadSlot(n);if(!rec)throw new Error('That save slot is empty.');if(!confirm(`Load ${rec.hero||rec.state?.character?.name||'this campaign'} from slot ${n}? Your current game will be recoverable.`))return;await sr18RestoreState(rec.state||rec,`slot ${n}`);break;}
  case'sr18-delete-slot':if(confirm(`Delete save slot ${n}? This cannot be undone.`)){await sr18DeleteSlot(n);toast(`Slot ${n} deleted.`);await sr18SaveCenter();}break;
  case'sr18-recover-latest':{const rec=await sr18LatestRecovery();if(!rec)throw new Error('No recovery snapshot was found.');if(!confirm(`Recover ${rec.state?.character?.name||'the previous campaign'} from ${rec.savedAt||'the latest snapshot'}?`))return;await sr18RestoreState(rec.state||rec,'automatic recovery');break;}
  case'sr18-export-save':await sr18SaveExport();break;
  case'sr18-import-save':document.getElementById('sr18SaveFile')?.click();break;
 }
 }catch(error){console.warn('Save Center:',error);toast(error.message||'Save operation failed.');}
},true);
document.addEventListener('change',async event=>{const input=event.target;if(input?.id!=='sr18SaveFile'||!input.files?.[0])return;const file=input.files[0];input.value='';await sr18ImportFile(file);});

const sr18AdventureBase=adventurePage;
adventurePage=function(){let html=sr18AdventureBase();if(state.combat)return html;const card=`<section class="card" style="margin-top:10px"><div class="eyebrow">V18 · Improvisation</div><h3>Try an unexpected approach</h3><p class="smalltext muted">You can use tools, terrain, animals, deception, distractions, magic, traps, social leverage or a completely different route. The Director chooses a fitting ability check and consequence. A successful plan can bypass an encounter; it will not be quietly undone.</p><p class="tagline">Examples: use a rope and pulley to lift the portcullis · distract the guard with a staged argument · calm the frightened wolf · jam the winch before the guards arrive.</p></section>`;return html.replace('<section class="card"><h3>Quick rolls</h3>',card+'<section class="card"><h3>Quick rolls</h3>');};
const sr18RenderBase=render;
render=function(){if(state?.campaign)sr18EnsureWorld();const out=sr18RenderBase();try{document.title='Solo Realms V18 — Complete Rules & Living Campaign';const f=document.querySelector('.footer-note');if(f)f.textContent='SOLO REALMS V18 · SPELL RULES · MONSTER TACTICS · IMPROVISATION · LIVING WORLD · SAVE RECOVERY';}catch(e){}return out;};

function sr18RunTests(){
 const out=[],ok=(name,pass,detail='')=>out.push({name,pass:!!pass,detail});
 try{
  const fb={kind:'utility'};
  const spells=[
   ['A flame spell',{description:'Each creature in a 20-foot-radius Sphere makes a Dexterity saving throw, taking 8d6 fire damage on a failed save.',damage:'8d6',save:true,saveAbility:'DEX',area:20,areaShape:'sphere',damageType:'fire'},{kind:'saveDamage',area:true,shape:'sphere',size:20,save:'DEX',type:'fire'}],
   ['Restorative magic',{description:'A creature regains 2d8 hit points.',heal:true,damage:'2d8'},{kind:'heal'}],
   ['Binding magic',{description:'The target must succeed on a Wisdom saving throw or be restrained for 1 minute.',condition:'restrained',save:true,saveAbility:'WIS'},{kind:'control',condition:'restrained',save:'WIS'}],
   ['Summoning magic',{description:'You summon a spectral creature that obeys your commands.'},{kind:'summon'}],
   ['Protective magic',{description:'You gain resistance to fire damage for 1 hour.'},{kind:'resistance'}],
   ['Utility teleport',{description:'You teleport to an unoccupied space that you can see.'},{kind:'teleport'}]
  ];
  for(const [label,sp,want] of spells){const got=sr18InferSpellEffect(label,sp,fb);ok(`Spell engine classifies ${label}`,got.kind===want.kind&&(!want.condition||got.condition===want.condition)&&(!want.save||got.save===want.save)&&(!want.area||got.area===want.area));}
  const area=sr18Area({area:15,areaShape:'cone'},'');ok('Area templates retain shape and size',area.active&&area.size===15&&area.shape==='cone');
  const ranged=sr18ParseActionRange({description:'Ranged Weapon Attack Roll: +6, range 30/120 ft. Hit: 1d8 piercing damage.'});ok('Ranged stat-block attacks retain normal and long range',ranged.ranged&&ranged.normalRange===30&&ranged.longRange===120);
  const rechargeProbe={};sr18MarkRechargeUsed(rechargeProbe,{name:'Fire Breath (Recharge 5–6)',description:'Recharge 5–6'});ok('Recharge abilities enter cooldown after being used',rechargeProbe._sr18Recharge?.['Fire Breath (Recharge 5–6)']===false);
  const rechargeMulti={_sr18Recharge:{'Fire Breath (Recharge 5–6)':false},actions:[{name:'Multiattack',description:'The creature makes two attacks: one with its Fire Breath and one with its Claw.'},{name:'Fire Breath (Recharge 5–6)',description:'Ranged Weapon Attack Roll: +6, range 30/120 ft. Hit: 3d6 fire damage. Recharge 5–6',damage:[{dice:'3d6',type:'fire'}]},{name:'Claw',description:'Melee Attack Roll: +5, reach 5 ft. Hit: 1d6 slashing damage.',damage:[{dice:'1d6',type:'slashing'}]}]};
  const available=sr18AvailableMultiattack(rechargeMulti);ok('Multiattack skips recharge actions that are still unavailable',available?.length===1&&available[0].name==='Claw');
  ok('Condition inference recognizes restrained, stunned and frightened',sr18DetectCondition('The target is stunned and frightened')==='stunned'&&sr18DetectCondition('The target becomes restrained')==='restrained'&&sr18DetectCondition('The target is frightened then stunned')==='frightened');
  const formula=sr14DamageDice({level:1,damage:'2d6',upcast:'One additional 1d6 for each spell slot level above 1.'},3);ok('Upcasting adds the published per-slot damage dice',formula==='4d6');
  const mock={actions:[{name:'Multiattack',description:'The creature makes three attacks: two with its Claws and one with its Bite.'},{name:'Claws',description:'Melee Attack Roll: +5, reach 5 ft. Hit: 1d6 slashing damage.',damage:[{dice:'1d6',type:'slashing'}]},{name:'Bite',description:'Melee Attack Roll: +4, reach 5 ft. Hit: 1d8 piercing damage.',damage:[{dice:'1d8',type:'piercing'}]}]};
  const seq=sr18ExpandMultiattack(mock);ok('Multiattack parser resolves mixed named attack sequences',seq?.length===3&&seq[0].name==='Claws'&&seq[1].name==='Claws'&&seq[2].name==='Bite');
  const modern=sr18ExpandMultiattack({actions:[{name:'Multiattack',description:'The creature makes two Claw attacks and one Bite attack.'},{name:'Claw',description:'Melee Attack Roll: +5, reach 5 ft. Hit: 1d6 slashing damage.',damage:[{dice:'1d6',type:'slashing'}]},{name:'Bite',description:'Melee Attack Roll: +4, reach 5 ft. Hit: 1d8 piercing damage.',damage:[{dice:'1d8',type:'piercing'}]}]});ok('Multiattack parser supports the compact 2024 stat-block wording',modern?.length===3&&modern[0].name==='Claw'&&modern[2].name==='Bite');
  ok('Recharge parser recognizes a 5–6 recharge range',sr18ParseRecharge({name:'Breath Weapon (Recharge 5–6)',description:'A cone of fire.'})?.min===5);
  const act=sr18ChooseMonsterAction({...mock,actions:mock.actions.slice(1),damage:'1d4'},{});ok('Monster action selection chooses an actual stat-block attack',!!act&&['Claws','Bite'].includes(act.name));
  const saved={character:{name:'Tester',classId:'Fighter',ancestry:'Human',level:2,stats:{STR:12,DEX:12,CON:12,INT:10,WIS:10,CHA:10},inventory:[],proficiencies:[]},campaign:{companions:[],npcs:[],sideQuests:[]},log:[]};ok('Save validator accepts a valid V17-era campaign',sr18ValidateSave(saved).ok);
  const invalid=sr18ValidateSave({character:{},campaign:{}});ok('Save validator rejects structurally incomplete saves',!invalid.ok);
  const old=state;state={character:{name:'World Tester',classId:'Fighter',ancestry:'Human',level:2,stats:{STR:12,DEX:12,CON:12,INT:10,WIS:10,CHA:10},inventory:[],proficiencies:[]},campaign:{day:4,location:'Test Town',region:'Test Reach',npcs:[],companions:[],sideQuests:[],story:{relic:'test relic'},sr14:{factions:{}}},log:[],combat:null,view:'journal'};
  const world=sr18EnsureWorld();ok('Living world initializes campaign clock, factions, rumors and clocks',world.clock.day===4&&world.factions.length>=4&&world.clocks.length>=2);
  const before=world.clock.actionTicks;sr18AdvanceWorld('action',0);sr18AdvanceWorld('action',0);sr18AdvanceWorld('action',0);ok('World advances its action clock and faction pressure',world.clock.actionTicks===before+3&&world.factions.some(f=>f.pressure>0));
  world.clocks[0].value=world.clocks[0].limit;sr18AdvanceWorld('action',0);ok('Pressure clocks create persistent world events rather than forced encounters',world.events.length>0&&!state.combat);
  const improv=sr18ImprovisationDecision('I use a rope and pulley to lift the portcullis');ok('Improvisation engine classifies a physical environment solution',improv?.skill==='Investigation'&&improv.choices.length===3&&improv.combat===false);
  const magic=sr18ImprovisationDecision('I combine two runes to disable the ward');ok('Improvisation engine supports novel magical and tool-based actions',magic?.skill==='Arcana'&&magic.failureText.length>20);
  const ctx=srAIContext();ok('AI context includes faction pressure, clocks and world ledger',!!ctx.campaign.worldSimulation&&ctx.campaign.worldSimulation.factions.length>=4);
  ok('Save snapshot includes all campaign world simulation state',sr18Snapshot('test').state.campaign.sr18?.factions?.length>=4);
  state=old;
 }catch(e){ok('V18 rules, living world and save tests execute without runtime errors',false,String(e?.stack||e));}
 return out;
}
globalThis.__SR18_TEST={version:SR18_VERSION,openDB:sr18OpenDB,inferSpell:sr18InferSpellEffect,area:sr18Area,condition:sr18DetectCondition,expandMultiattack:sr18ExpandMultiattack,availableMultiattack:sr18AvailableMultiattack,rechargeReady:sr18RechargeReady,recharge:sr18ParseRecharge,parseActionRange:sr18ParseActionRange,markRechargeUsed:sr18MarkRechargeUsed,prepareMonsterTurn:sr18PrepareMonsterTurn,chooseMonsterAction:sr18ChooseMonsterAction,resolveMonsterAction:sr18ResolveMonsterAction,monsterTurnSolo:sr18MonsterTurnSolo,monsterDamage:sr18MonsterApplyDamage,typedDamage:sr12ApplyDamage,applySpellUtility:sr18ApplySpellUtility,classifyImprovisation:sr18ClassifyImprovisation,improvisationDecision:sr18ImprovisationDecision,ensureWorld:sr18EnsureWorld,advanceWorld:sr18AdvanceWorld,addWorldEvent:sr18AddWorldEvent,validateSave:sr18ValidateSave,normalizeImport:sr18NormalizeImported,snapshot:sr18Snapshot,storeSlot:sr18StoreSlot,readSlot:sr18ReadSlot,deleteSlot:sr18DeleteSlot,writeRecovery:sr18WriteRecovery,restore:sr18RestoreState,latestRecovery:sr18LatestRecovery,exportSave:sr18SaveExport,importFile:sr18ImportFile,saveCenter:sr18SaveCenter,render:render,header:header,adventurePage:adventurePage,tests:sr18RunTests,get state(){return state;},set state(v){state=v;}};
// Re-render after the additive systems are installed so the V18 header and Save Center are visible on first boot.
try { render(); } catch (error) { console.warn('V18 initial render:', error); }
