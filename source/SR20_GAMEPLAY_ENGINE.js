/* SOLO REALMS V20 — SEVEN-SYSTEM GAMEPLAY LOOP.
 * Additive gameplay layer. V18 remains authoritative for core rules, rolls,
 * damage, inventory and saves; V19 remains authoritative for Director/NPC memory.
 */
const SR20_GAMEPLAY_VERSION='20.0.0';
const SR20_MODES=['exploration','social','travel','tactical','survival','campaign'];
const SR20_SKILL_ABILITIES={athletics:'STR',acrobatics:'DEX',sleightofhand:'DEX',stealth:'DEX',arcana:'INT',history:'INT',investigation:'INT',nature:'INT',religion:'INT',animalhandling:'WIS',insight:'WIS',medicine:'WIS',perception:'WIS',survival:'WIS',deception:'CHA',intimidation:'CHA',performance:'CHA',persuasion:'CHA'};
const SR20_CLASS_EDGES={
 barbarian:['athletics','survival','intimidation'],bard:['persuasion','performance','deception','insight'],
 cleric:['insight','medicine','religion'],druid:['nature','animalhandling','survival'],
 fighter:['athletics','perception','intimidation'],monk:['acrobatics','insight','stealth'],
 paladin:['persuasion','religion','intimidation'],ranger:['survival','perception','stealth','nature'],
 rogue:['stealth','sleightofhand','investigation','deception'],sorcerer:['arcana','persuasion','deception'],
 warlock:['arcana','intimidation','deception'],wizard:['arcana','investigation','history']
};
function sr20Clamp(v,min=0,max=100){return Math.max(min,Math.min(max,Number(v)||0));}
function sr20Id(){return typeof makeId==='function'?makeId():'sr20-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);}
function sr20EnsureCampaign(){
 const c=state?.campaign;if(!c)return null;
 c.sr20=c.sr20&&typeof c.sr20==='object'?c.sr20:{};
 const g=c.sr20;g.version=SR20_GAMEPLAY_VERSION;
 g.clock=g.clock&&typeof g.clock==='object'?g.clock:{watch:0,actions:0};
 g.survival=g.survival&&typeof g.survival==='object'?g.survival:{fatigue:0,exposure:0,foodShortages:0,waterShortages:0};
 g.survival.fatigue=sr20Clamp(g.survival.fatigue,0,6);
 for(const k of ['objectives','leads','consequences','records','archive'])g[k]=Array.isArray(g[k])?g[k]:[];
 g.legacy=g.legacy&&typeof g.legacy==='object'?g.legacy:{renown:0,titles:[],milestones:[],completedObjectives:0};
 g.legacy.renown=Math.max(0,Number(g.legacy.renown)||0);g.legacy.titles=Array.isArray(g.legacy.titles)?g.legacy.titles:[];g.legacy.milestones=Array.isArray(g.legacy.milestones)?g.legacy.milestones:[];
 g.onboarding=g.onboarding&&typeof g.onboarding==='object'?g.onboarding:{completed:false};
 g.social=g.social&&typeof g.social==='object'?g.social:{};
 g.tactical=g.tactical&&typeof g.tactical==='object'?g.tactical:{stance:'balanced',intent:'',round:0};
 g.momentum=Math.max(0,Number(g.momentum)||0);
 if(!g.objectives.length&&c.mainQuest&&typeof c.mainQuest==='object'){
  g.objectives.push({id:'main-quest',type:'main',title:String(c.mainQuest.title||'Current campaign objective'),detail:String(c.mainQuest.goal||c.mainQuest.description||'Advance the central adventure.'),progress:Math.max(0,Number(c.mainQuest.progress)||0),goal:Math.max(1,Number(c.mainQuest.goalCount||c.mainQuest.target||c.mainQuest.goal)||1),status:'active'});
 }
 return g;
}
function sr20ClassName(ch=state?.character){return String(ch?.classId||ch?.class||ch?.className||'Adventurer').toLowerCase();}
function sr20ClassEdge(skill,ch=state?.character){
 const name=sr20ClassName(ch),key=Object.keys(SR20_CLASS_EDGES).find(k=>name.includes(k));
 return !!key&&SR20_CLASS_EDGES[key].includes(String(skill||'').toLowerCase().replace(/[\s_-]/g,''));
}
function sr20ClassIdentity(ch=state?.character){
 const name=sr20ClassName(ch),key=Object.keys(SR20_CLASS_EDGES).find(k=>name.includes(k));
 const names={barbarian:'Force through obstacles and endure harsh conditions',bard:'Read a room, persuade, perform and deceive',cleric:'Read motives, heal and interpret sacred knowledge',druid:'Understand animals, nature and the living world',fighter:'Control space, overcome physical obstacles and assess threats',monk:'Move with precision, awareness and discipline',paladin:'Lead through conviction, persuasion and resolve',ranger:'Track, navigate, scout and read the wilderness',rogue:'Use stealth, nimble hands, investigation and deception',sorcerer:'Solve arcane problems through instinct and force of personality',warlock:'Use occult knowledge, leverage and unsettling presence',wizard:'Apply learned magic, research and deduction'};
 return {className:key||name,identity:names[key]||'Use your training, background and chosen approach to shape the scene.',edges:(SR20_CLASS_EDGES[key]||[]).slice()};
}
function sr20InferMode(text){
 const t=String(text||'').toLowerCase();
 // Classify intent verbs, not nouns such as "guard", "enemy" or "opponent".
 const tactical=/\b(attack|fight|strike|combat|ambush|flank|parry|disarm|withdraw|retreat|defend|take cover|hide from|sneak past|outmaneuver)\b/.test(t);
 const social=/\b(talk|speak|ask|question|convince|persuade|negotiate|lie|deceive|threaten|intimidate|befriend|bargain|interrogate|charm|apologize|plead|bribe)\b/.test(t);
 if(social&&!tactical)return 'social';
 if(tactical&&!social)return 'tactical';
 if(social&&tactical){
  const si=t.search(/\b(talk|speak|ask|question|convince|persuade|negotiate|lie|deceive|threaten|intimidate|befriend|bargain|interrogate|charm|apologize|plead|bribe)\b/);
  const ti=t.search(/\b(attack|fight|strike|combat|ambush|flank|parry|disarm|withdraw|retreat|defend|take cover|hide from|sneak past|outmaneuver)\b/);
  return si<=ti?'social':'tactical';
 }
 if(/\b(camp|make camp|rest|sleep|take a rest|short rest|long rest)\b/.test(t))return 'survival';
 if(/\b(cook|craft|repair|build|forage|hunt|fish|gather|harvest|treat|medicine|prepare|weather|cold|heat|hunger|thirst|refill|purify|collect|boil|survive)\b/.test(t))return 'survival';
 if(/\b(travel|journey|march|hike|cross|sail|ride|set out|move camp)\b/.test(t))return 'travel';
 if(/\b(search|explore|scout|track|inspect|investigate|discover|clue|examine|map|survey|listen|look around|find)\b/.test(t))return 'exploration';
 return 'campaign';
}
function sr20SkillFor(mode,text,decision){
 if(decision?.skill)return String(decision.skill);
 const t=String(text||'').toLowerCase();
 if(mode==='social')return /\b(lie|deceive|disguise|fake|pretend)\b/.test(t)?'Deception':/\b(threat|intimidat|scare|coerce)\b/.test(t)?'Intimidation':/\b(read|sense|motive|bluff|notice.*lie)\b/.test(t)?'Insight':/\b(perform|sing|play|entertain)\b/.test(t)?'Performance':'Persuasion';
 if(mode==='travel'||mode==='survival')return /\b(animal|horse|wolf|mount|beast)\b/.test(t)?'Animal Handling':/\b(nature|plant|herb|weather|poison)\b/.test(t)?'Nature':'Survival';
 if(mode==='tactical')return /\b(sneak|hide|ambush|shadow)\b/.test(t)?'Stealth':/\b(dodge|balance|acrobat)\b/.test(t)?'Acrobatics':'Athletics';
 if(mode==='exploration')return /\b(listen|hear|spot|watch|notice|see)\b/.test(t)?'Perception':/\b(track|trail|navigate|forage|wilderness)\b/.test(t)?'Survival':/\b(sneak|hide|quiet)\b/.test(t)?'Stealth':'Investigation';
 return /\b(rune|spell|arcane|magic|ward|enchant)\b/.test(t)?'Arcana':'Investigation';
}
function sr20Proficient(ch,skill){
 const norm=s=>String(s||'').toLowerCase().replace(/[^a-z]/g,'');
 return [ch?.proficiencies,ch?.skillProficiencies,ch?.skills?.proficient].some(a=>Array.isArray(a)&&a.some(x=>norm(typeof x==='string'?x:x?.name)===norm(skill)));
}
function sr20AbilityMod(ch,skill){
 const ability=SR20_SKILL_ABILITIES[String(skill||'').toLowerCase().replace(/[\s_-]/g,'')]||'INT';
 return Math.floor((Number(ch?.stats?.[ability]??ch?.stats?.[ability.toLowerCase()]??10)-10)/2);
}
function sr20Expertise(ch,skill){
 const norm=s=>String(s||'').toLowerCase().replace(/[^a-z]/g,'');
 return [ch?.expertise,ch?.expertiseSkills,ch?.skills?.expertise].some(a=>Array.isArray(a)&&a.some(x=>norm(typeof x==='string'?x:x?.name)===norm(skill)));
}
function sr20SkillBonus(ch,skill){
 const level=Math.max(1,Number(ch?.level)||1),prof=2+Math.floor((level-1)/4),expertise=sr20Expertise(ch,skill),trained=sr20Proficient(ch,skill)||expertise,edge=sr20ClassEdge(skill,ch),ability=sr20AbilityMod(ch,skill),proficiency=trained?prof:0,expertiseBonus=expertise?prof:0;
 return {ability,proficiency,expertiseBonus,classEdge:edge?1:0,total:ability+proficiency+expertiseBonus+(edge?1:0),trained,expertise,edge};
}
function sr20FindNPC(target,text){
 const list=state?.campaign?.npcs||[],q=String(target||'').trim().toLowerCase(),t=String(text||'').toLowerCase();
 return (q?list.find(n=>String(n?.name||'').toLowerCase()===q):null)||list.find(n=>n?.name&&t.includes(String(n.name).toLowerCase()))||null;
}
function sr20SupplyIndex(pattern){
 const inv=state?.character?.inventory;if(!Array.isArray(inv))return -1;
 return inv.findIndex(item=>pattern.test(String(typeof item==='string'?item:item?.name||item?.label||'')));
}
function sr20ConsumeSupply(pattern){
 const inv=state?.character?.inventory;if(!Array.isArray(inv))return false;const i=sr20SupplyIndex(pattern);if(i<0)return false;
 const item=inv[i];if(item&&typeof item==='object'){
  const key=Number.isFinite(Number(item.quantity))?'quantity':Number.isFinite(Number(item.count))?'count':null;
  if(key&&Number(item[key])>1)item[key]=Number(item[key])-1;else inv.splice(i,1);
 }else inv.splice(i,1);return true;
}
function sr20AddSupply(name,description){
 const inv=state?.character?.inventory;if(!Array.isArray(inv))return false;
 const item={name,type:'supply',count:1,desc:String(description||'')};
 if(typeof addItem==='function'){addItem(item);return true;}
 const existing=inv.find(x=>x&&typeof x==='object'&&x.name===name&&x.type==='supply');
 if(existing)existing.count=(Number(existing.count)||0)+1;else inv.push(item);
 return true;
}
function sr20AddLead(text,kind='discovery'){
 const g=sr20EnsureCampaign();if(!g)return null;
 const lead={id:sr20Id(),day:state.campaign.day||1,location:state.campaign.location||state.campaign.region||'',kind,text:String(text||'An unresolved opportunity awaits.').slice(0,260),status:'unresolved'};
 g.leads.unshift(lead);g.leads=g.leads.slice(0,20);
 if(typeof sr18AddWorldEvent==='function')sr18AddWorldEvent('gameplay-lead',lead.text,{leadId:lead.id,kind});return lead;
}
function sr20AddConsequence(text,kind='complication'){
 const g=sr20EnsureCampaign();if(!g)return null;
 const item={id:sr20Id(),day:state.campaign.day||1,kind,text:String(text||'A consequence is developing.').slice(0,260),status:'unresolved'};
 g.consequences.unshift(item);g.consequences=g.consequences.slice(0,16);
 if(typeof sr18AddWorldEvent==='function')sr18AddWorldEvent('gameplay-consequence',item.text,{consequenceId:item.id,kind});return item;
}
function sr20TokenMatch(a,b){
 const words=s=>[...new Set(String(s||'').toLowerCase().match(/[a-z]{4,}/g)||[])],left=words(a),right=new Set(words(b));
 if(!left.length||!right.size)return false;const overlap=left.filter(w=>right.has(w)).length;
 return overlap>=2||(left.length===1&&right.has(left[0])&&String(b||'').toLowerCase().includes(String(a||'').toLowerCase()));
}
function sr20AdvanceAdventure(text,mode,success){
 const g=sr20EnsureCampaign(),c=state?.campaign;if(!g||!c)return;
 if(success){
  g.momentum++;const objective=g.objectives.find(o=>o.status==='active'&&sr20TokenMatch(text,(o.title||'')+' '+(o.detail||'')));
  if(objective){objective.progress=Math.min(Math.max(1,Number(objective.goal)||1),(Number(objective.progress)||0)+1);if(objective.progress>=Math.max(1,Number(objective.goal)||1))objective.status='completed';if(objective.type==='main'&&c.mainQuest){c.mainQuest.progress=objective.progress;if(objective.status==='completed'){c.flags=c.flags||{};c.flags.sr20MainObjectiveCompleted=true;}}if(objective.status==='completed'&&!objective.legacyAwarded){objective.legacyAwarded=true;g.legacy.completedObjectives++;g.legacy.renown+=10;const title=g.legacy.completedObjectives>=20?'Legend of the Realms':g.legacy.completedObjectives>=10?'Worldshaper':g.legacy.completedObjectives>=5?'Seasoned Hero':'Oathkeeper';if(!g.legacy.titles.includes(title))g.legacy.titles.push(title);g.legacy.milestones.push({type:'objective-completed',title:objective.title,day:sr20CampaignDay(),renown:10});}}
  if(g.momentum>=3){g.momentum=0;sr20AddLead('An opportunity opens because of the party’s recent progress: '+String(text||'their latest success').slice(0,120)+'.','campaign-opening');}
 }else{
  sr20AddConsequence('The failed approach leaves an unresolved complication: '+String(text||'the party’s plan').slice(0,130)+'.',mode);
 }
}
function sr20ActionNarrative(mode,success){
 const labels={exploration:success?'You uncover something useful.':'The area yields no clear answer, and the delay has a cost.',social:success?'Your approach shifts the conversation in your favor.':'The exchange hardens the other side’s position.',travel:success?'The party makes steady progress through the journey.':'The route proves more demanding than expected.',tactical:success?'You create a tactical opening.':'The opposition reads the move and keeps the advantage.',survival:success?'Your preparation pays off.':'The conditions take a toll on the party.',campaign:success?'Your choice creates forward momentum.':'The plan meets resistance, but the story remains open.'};
 return labels[mode]||labels.campaign;
}
function sr20CampaignDay(){return Math.max(1,Number(state?.campaign?.day)||1);}
function sr20ChallengeDC(base,challenge='standard'){const offsets={routine:-5,standard:0,difficult:5,expert:10,legendary:15};return Math.max(5,Math.min(30,(Number(base)||12)+(offsets[challenge]??0)));}
function sr20ExpireFlank(){
 const b=state?.combat,round=Number(b?.round)||0;if(!b||!Array.isArray(b.enemies))return;
 for(const enemy of b.enemies){const mark=enemy?.sr20Flank;if(mark&&round>mark.untilRound){enemy.ac=mark.originalAC;delete enemy.sr20Flank;}}
}
function sr20ResolvePlayerAction(text,options={}){
 sr20ExpireFlank();
 const action=String(text||'').trim().slice(0,500);if(!action)throw new Error('Describe what your character is trying to do.');
 if(!state?.character||!state?.campaign)throw new Error('Start a campaign before taking a gameplay action.');
 const g=sr20EnsureCampaign(),ch=state.character,mode=SR20_MODES.includes(options.mode)&&options.mode!=='auto'?options.mode:sr20InferMode(action);
 let decision=null;try{if(typeof sr18ImprovisationDecision==='function')decision=sr18ImprovisationDecision(action);}catch(e){}
 const skill=options.skill&&options.skill!=='auto'?String(options.skill):sr20SkillFor(mode,action,decision),bonus=sr20SkillBonus(ch,skill),baseDC=Number(options.dc||decision?.dc)||({travel:11,survival:12,exploration:12,social:13,tactical:13,campaign:12}[mode]||12),dc=sr20ChallengeDC(baseDC,options.challenge||'standard');
 const noRoll=options.noRoll===true||/\b(camp|make camp|short rest|long rest|take a rest|sleep for the night)\b/i.test(action);
 const adv=!!options.advantage&&!options.disadvantage,dis=!!options.disadvantage&&!options.advantage;
 const die1=noRoll?null:(Number.isInteger(options.roll)?Math.max(1,Math.min(20,options.roll)):Math.floor(Math.random()*20)+1);
 const die2=(adv||dis)&&!noRoll?(Number.isInteger(options.secondRoll)?Math.max(1,Math.min(20,options.secondRoll)):Math.floor(Math.random()*20)+1):null;
 const die=noRoll?null:die2===null?die1:adv?Math.max(die1,die2):Math.min(die1,die2);
 const fatiguePenalty=g.survival.fatigue>=4&&(mode==='travel'||mode==='survival')?-2:0,total=noRoll?null:die+bonus.total+fatiguePenalty,success=noRoll?true:total>=dc;
 const target=sr20FindNPC(options.target,action);
 const outcome={id:sr20Id(),day:sr20CampaignDay(),mode,action,skill,dc,challenge:options.challenge||'standard',die,die2,advantage:adv,disadvantage:dis,bonus,total,success,noRoll,narrative:sr20ActionNarrative(mode,success),target:target?.name||'',className:sr20ClassIdentity(ch).className,createdAt:new Date().toISOString()};
 g.clock.actions++;
 if(mode==='travel'){
  g.clock.watch++;
  const food=sr20ConsumeSupply(/\b(rations?|food|trail meals?|provisions?)\b/i),water=sr20ConsumeSupply(/\b(water|waterskins?|canteens?)\b/i);
  if(!food){g.survival.foodShortages++;g.survival.fatigue=sr20Clamp(g.survival.fatigue+1,0,6);}
  if(!water){g.survival.waterShortages++;g.survival.fatigue=sr20Clamp(g.survival.fatigue+1,0,6);}
  g.survival.exposure++;try{if(typeof sr18AdvanceWorld==='function')sr18AdvanceWorld('travel',1);}catch(e){}
 }else if(mode==='survival'&&/\b(camp|rest|sleep)\b/i.test(action)){
  g.clock.watch+=2; // Eight-hour long rest = two four-hour watches.
  const meal=sr20ConsumeSupply(/\b(rations?|food|trail meals?|provisions?)\b/i);
  g.survival.fatigue=sr20Clamp(g.survival.fatigue-(meal?2:1),0,6);g.survival.exposure=Math.max(0,g.survival.exposure-1);
  try{if(typeof sr18AdvanceWorld==='function')sr18AdvanceWorld('long_rest',1);}catch(e){}
 }else{try{if(typeof sr18AdvanceWorld==='function')sr18AdvanceWorld('action',0);}catch(e){}}
 if(mode==='survival'&&success&&/\b(forage|hunt|fish|gather|refill|collect|purify|boil)\b/i.test(action)){
  if(/\b(water|stream|river|spring|waterskin|canteen)\b/i.test(action))sr20AddSupply('Waterskin','A filled waterskin.');
  if(/\b(food|berry|berries|hunt|fish|forage|ration|mushroom|root)\b/i.test(action))sr20AddSupply('Rations',"A day's worth of gathered food.");
 }
 if(mode==='social'&&target){
  target.sr20=target.sr20&&typeof target.sr20==='object'?target.sr20:{};
  target.sr20.relationship=sr20Clamp((Number(target.sr20.relationship)||0)+(success?1:-1),-10,10);
  target.sr20.lastPlayerExchange={day:outcome.day,action,success,skill};
  if(!success&&target.sr19)target.sr19.suspicion=sr20Clamp((Number(target.sr19.suspicion)||0)+2,0,100);
  g.social[target.name]={relationship:target.sr20.relationship,lastExchange:target.sr20.lastPlayerExchange};
 }
 if(mode==='tactical'){
  const posture=/\b(cover|hide|defend|guard|protect)\b/i.test(action)?'cover':/\b(flank|circle|outmaneuver)\b/i.test(action)?'flank':/\b(retreat|withdraw|fall back)\b/i.test(action)?'withdraw':/\b(ambush|surprise|sneak)\b/i.test(action)?'ambush':'adaptive';
  g.tactical={stance:posture,intent:action.slice(0,180),round:Number(state.combat?.round)||0,lastCheck:success?'opening':'contested'};
  if(state.combat){
   state.combat.sr20Tactics={...g.tactical,checkTotal:total,dc};
   if(posture==='flank'&&success&&Array.isArray(state.combat.enemies)){
    const enemy=state.combat.enemies.find(x=>options.target&&String(x.name||'').toLowerCase()===String(options.target).toLowerCase()&&x.hp>0)||state.combat.enemies.find(x=>x&&x.hp>0);
    if(enemy&&Number.isFinite(Number(enemy.ac))){const prior=enemy.sr20Flank?.originalAC??Number(enemy.ac);enemy.sr20Flank={originalAC:prior,untilRound:Number(state.combat.round)||0};enemy.ac=Math.max(5,prior-2);state.combat.sr20Tactics.flankedTarget=enemy.name||'';}
   }
  }
 }
 if(mode==='exploration'&&success)sr20AddLead('A discovery connected to the party’s investigation: '+action.slice(0,150)+'.','exploration');
 if(!success&&!['campaign','exploration','social'].includes(mode))sr20AddConsequence(outcome.narrative+' Attempt: '+action.slice(0,130)+'.',mode);
 if(!noRoll)sr20AdvanceAdventure(action,mode,success);
 if(typeof sr19ApplyActionBehavior==='function'){
  const kind=mode==='social'?(/\b(lie|deceiv|bluff)\b/i.test(action)?'deception':/\b(threat|intimidat)\b/i.test(action)?'intimidation':'negotiation'):mode==='exploration'?'investigation':mode==='tactical'?'violence':mode==='travel'?'travel':'open-ended';
  try{sr19ApplyActionBehavior({kind,text:action,target:target?.name||options.target||'',success});}catch(e){}
 }
 const rollText=noRoll?'No check required':'d20 '+die+(die2===null?'':' / '+die2)+' '+(bonus.total>=0?'+':'')+bonus.total+(fatiguePenalty?' '+fatiguePenalty:'')+' = '+total+' vs DC '+dc;
 outcome.narrative+=' '+rollText+(bonus.edge?' · class edge +1':'')+'.';
 g.lastOutcome=outcome;g.records.push(outcome);if(g.records.length>40){const archived=g.records.splice(0,g.records.length-40);g.archive.push(...archived.map(x=>({id:x.id,day:x.day,mode:x.mode,action:x.action,success:x.success,skill:x.skill,total:x.total,dc:x.dc,createdAt:x.createdAt})));if(g.archive.length>1000)g.archive=g.archive.slice(-1000);}
 if(!Array.isArray(state.log))state.log=[];state.log.push({day:outcome.day,msg:(success?'Success':'Complication')+' · '+mode+': '+action+' — '+rollText+'.'});if(state.log.length>300)state.log=state.log.slice(-300);
 try{if(typeof save==='function')save();}catch(e){}
 return outcome;
}
function sr20SetObjective(title,detail=''){
 const g=sr20EnsureCampaign();if(!g)throw new Error('No active campaign.');const clean=String(title||'').trim().slice(0,100);if(!clean)throw new Error('Give the objective a title.');
 const objective={id:sr20Id(),type:'player',title:clean,detail:String(detail||'').trim().slice(0,240),progress:0,goal:1,status:'active'};
 g.objectives.unshift(objective);g.objectives=g.objectives.slice(0,20);if(typeof save==='function')save();return objective;
}
function sr20CloseItem(id,group,status='resolved'){
 const g=sr20EnsureCampaign();if(!g)return false;const item=(g[group]||[]).find(x=>x.id===id);if(!item)return false;item.status=status;if(typeof save==='function')save();return true;
}
function sr20GameplayPanel(){
 if(!state?.character||!state?.campaign)return '';
 const g=sr20EnsureCampaign(),identity=sr20ClassIdentity(),sur=g.survival;
 const leads=g.leads.filter(x=>x.status==='unresolved').slice(0,3).map(x=>'<div class="shop-item"><strong>'+esc(x.kind.replace(/-/g,' '))+'</strong><p>'+esc(x.text)+'</p><button class="btn small" type="button" data-sr20-close="'+esc(x.id)+'" data-sr20-group="leads">Resolve lead</button></div>').join('');
 const goals=g.objectives.slice(0,3).map(x=>'<div class="shop-item"><strong>'+esc(x.title)+'</strong><p>'+esc(x.detail||'')+' · '+(x.progress||0)+'/'+(x.goal||1)+' · '+esc(x.status)+'</p></div>').join('');
 const last=g.lastOutcome?'<div class="item-row"><strong>'+(g.lastOutcome.success?'Success':'Complication')+' · '+esc(g.lastOutcome.mode)+'</strong><span class="pill">'+esc(g.lastOutcome.skill)+(g.lastOutcome.total===null?'':' · '+g.lastOutcome.total+'/'+g.lastOutcome.dc)+'</span></div><p>'+esc(g.lastOutcome.narrative)+'</p><p class="muted smalltext">Modifier breakdown: ability '+g.lastOutcome.bonus.ability+' · proficiency +'+g.lastOutcome.bonus.proficiency+' · Expertise +'+g.lastOutcome.bonus.expertiseBonus+' · class edge +'+g.lastOutcome.bonus.classEdge+'</p>':'<p class="muted smalltext">Your choices, checks and consequences will appear here.</p>';
 const onboarding=!g.onboarding.completed?'<div class="card"><strong>Your first adventure</strong><ol><li>Describe what your character tries to do.</li><li>Choose an approach, or let the Director decide.</li><li>Review the roll, modifier breakdown and consequences.</li></ol><p class="muted smalltext">There is no single correct way to approach a scene. Describe your intent in your own words.</p><button class="btn small" type="button" data-sr20-onboarding-dismiss>Got it</button></div>':'';
 const legacy='<div class="tagline">Legacy renown '+g.legacy.renown+' · '+g.legacy.completedObjectives+' objectives completed'+(g.legacy.titles.length?' · Titles: '+g.legacy.titles.map(esc).join(', '):'')+'</div>';
 const combat=!!state.combat;
 return '<section class="card" id="sr20-gameplay"><div class="eyebrow">V20 · Integrated gameplay</div><h3>What do you do?</h3><p class="muted smalltext">Describe an action in your own words. The Director classifies the approach, your character’s training shapes the check, and the world remembers the result.</p>'+onboarding<div class="two-col"><div><strong>'+esc(state.character.name||'Adventurer')+'</strong><div class="tagline">'+esc(identity.className)+' · '+esc(identity.identity)+'</div></div><div><strong>Journey condition</strong><div class="tagline">Fatigue '+sur.fatigue+'/6 · Travel watches '+g.clock.watch+' · Shortages F'+sur.foodShortages+'/W'+sur.waterShortages+'</div></div></div><form id="sr20-action-form" style="margin-top:10px"><div class="field"><label for="sr20-action-mode">Approach</label><select id="sr20-action-mode"><option value="auto">Let the Director decide</option><option value="exploration">Explore / investigate</option><option value="social">Talk / negotiate</option><option value="travel">Travel / journey</option><option value="tactical"'+(combat?' selected':'')+'>Tactical action'+(combat?' · combat active':'')+'</option><option value="survival">Survival / camp / rest</option><option value="campaign">Other / creative action</option></select></div><div class="field"><label for="sr20-challenge">Challenge</label><select id="sr20-challenge"><option value="routine">Routine · DC −5</option><option value="standard" selected>Standard</option><option value="difficult">Difficult · DC +5</option><option value="expert">Expert · DC +10</option><option value="legendary">Legendary · DC +15</option></select></div><div class="field"><label for="sr20-skill">Skill</label><select id="sr20-skill"><option value="auto">Let the Director choose</option>'+Object.keys(SR20_SKILL_ABILITIES).map(k=>'<option value="'+k+'">'+k.replace(/([a-z])([a-z]*)/,(m,a,b)=>a.toUpperCase()+b)+'</option>').join('')+'</select></div><div class="field"><label for="sr20-roll-state">Roll state</label><select id="sr20-roll-state"><option value="normal">Normal</option><option value="advantage">Advantage</option><option value="disadvantage">Disadvantage</option></select></div><div class="field"><label for="sr20-action-text">Your character’s action</label><textarea id="sr20-action-text" rows="3" maxlength="500" placeholder="Example: I study the muddy tracks beside the old road, looking for how many riders passed and where they went." required></textarea></div><div class="field"><label for="sr20-action-target">NPC / target (optional)</label><input id="sr20-action-target" maxlength="80" placeholder="Name of the person you approach"></div><div class="item-actions"><button class="btn primary" type="submit">Resolve action</button><button class="btn" type="button" data-sr20-quick="search">Search nearby</button><button class="btn" type="button" data-sr20-quick="talk">Talk to someone</button><button class="btn" type="button" data-sr20-quick="travel">Travel one watch</button><button class="btn" type="button" data-sr20-quick="rest">Make camp / rest</button></div></form><div class="card" style="margin-top:10px"><div class="eyebrow">Latest outcome</div>'+last+'</div>'+(combat?'<div class="card"><div class="eyebrow">Combat tactics</div><p>Current posture: <strong>'+esc(g.tactical.stance||'balanced')+'</strong>. A successful tactical approach is remembered for the encounter and included in Director context.</p></div>':'')+'<div class="two-col"><div><div class="eyebrow">Current objectives</div>'+(goals||'<p class="muted smalltext">No campaign objective has been set yet.</p>')+'</div><div><div class="eyebrow">Open discoveries</div>'+(leads||'<p class="muted smalltext">No unresolved leads yet.</p>')+'</div></div>'+legacy+'<form id="sr20-objective-form" class="two-col" style="margin-top:10px"><div class="field"><label for="sr20-objective-title">Add a campaign objective</label><input id="sr20-objective-title" maxlength="100" placeholder="Example: Find the hidden entrance"></div><div class="field"><label for="sr20-objective-detail">What counts as progress? (optional)</label><input id="sr20-objective-detail" maxlength="240" placeholder="Search the old watchtower and question its keeper"></div><button class="btn" type="submit">Add objective</button></form></section>';
}
app.addEventListener('submit',function(e){
 const form=e.target;if(form?.id==='sr20-objective-form'){e.preventDefault();e.stopPropagation();try{sr20SetObjective($('sr20-objective-title')?.value||'', $('sr20-objective-detail')?.value||'');render();toast('Campaign objective added.');}catch(error){toast(error.message||'Could not add objective.');}return;}
 if(form?.id!=='sr20-action-form')return;e.preventDefault();e.stopPropagation();
 try{const text=$('sr20-action-text')?.value||'',mode=$('sr20-action-mode')?.value||'auto',target=$('sr20-action-target')?.value||'',challenge=$('sr20-challenge')?.value||'standard',skill=$('sr20-skill')?.value||'auto',rollState=$('sr20-roll-state')?.value||'normal';const out=sr20ResolvePlayerAction(text,{mode,target,challenge,skill,advantage:rollState==='advantage',disadvantage:rollState==='disadvantage'});render();toast((out.success?'Success':'Complication')+' · '+out.skill+' · '+(out.total===null?'no check':out.total+' vs DC '+out.dc));}catch(error){toast(error.message||'Could not resolve that action.');}
},true);
app.addEventListener('click',function(e){
 const dismiss=e.target?.closest?.('[data-sr20-onboarding-dismiss]');if(dismiss){e.preventDefault();const g=sr20EnsureCampaign();g.onboarding.completed=true;save();render();return;}
 const quick=e.target?.closest?.('[data-sr20-quick]');
 if(quick){e.preventDefault();const modes={search:['exploration','I search the nearby area for useful clues, tracks or hidden routes.'],talk:['social','I approach a nearby person and try to learn what they know.'],travel:['travel','We travel onward for one watch, watching the route and conserving our supplies.'],rest:['survival','We make camp, eat if we have supplies, and rest.']};const pair=modes[quick.dataset.sr20Quick];if(pair){const mode=$('sr20-action-mode'),input=$('sr20-action-text');if(mode)mode.value=pair[0];if(input){input.value=pair[1];input.focus();}}return;}
 const close=e.target?.closest?.('[data-sr20-close]');if(close){e.preventDefault();sr20CloseItem(close.dataset.sr20Close,close.dataset.sr20Group);render();toast('Journal entry updated.');}
},true);
function sr20CoverIsActive(){const t=state?.combat?.sr20Tactics,round=Number(state?.combat?.round)||0;return t?.stance==='cover'&&t.lastCheck==='opening'&&round===Number(t.round);}
const sr20MonsterActionBase=sr18ResolveMonsterAction;
sr18ResolveMonsterAction=function(enemy,action,target){
 const character=target?.player?.character;if(!character||!sr20CoverIsActive())return sr20MonsterActionBase(enemy,action,target);
 const original=character.buffRounds;character.buffRounds=Math.max(1,Number(original)||0);
 try{return sr20MonsterActionBase(enemy,action,target);}finally{if(original===undefined)delete character.buffRounds;else character.buffRounds=original;}
};
const sr20AdventureBase=adventurePage;
adventurePage=function(){return sr20GameplayPanel()+sr20AdventureBase();};
const sr20ContextBase=srAIContext;
srAIContext=function(){
 const x=sr20ContextBase(),g=sr20EnsureCampaign();if(!g)return x;
 x.campaign=x.campaign||{};x.campaign.gameplayV20={clock:g.clock,survival:g.survival,objectives:g.objectives.slice(-12),leads:g.leads.slice(0,12),consequences:g.consequences.slice(0,12),social:g.social,tactical:g.tactical,legacy:g.legacy,archive:g.archive.slice(-20),lastOutcome:g.lastOutcome||null};return x;
};
function sr20RunTests(){
 const old=state,results=[],ok=(name,pass,detail='')=>results.push({name,pass:!!pass,detail});
 try{
  state={character:{name:'Test Adventurer',classId:'Rogue',ancestry:'Human',level:5,hp:24,maxHp:24,armor:'Leather armor',stats:{STR:10,DEX:16,CON:12,INT:14,WIS:12,CHA:10},proficiencies:['Stealth','Investigation','Deception'],inventory:[{name:'Rations',type:'supply',count:1,desc:'A day of food.'},{name:'Waterskin',type:'supply',count:1,desc:'A filled waterskin.'}]},campaign:{day:2,region:'Ashen Vale',location:'Old Road',npcs:[{name:'Mara Venn',faction:'Free Traders'}],companions:[],sideQuests:[],mainQuest:{title:'Find the lost map',goal:'Recover the map from the ruined watchtower',progress:0,target:2}},log:[],combat:null,view:'adventure'};
  const g=sr20EnsureCampaign();ok('Gameplay schema initializes without replacing V18 campaign fields',g.version===SR20_GAMEPLAY_VERSION&&state.campaign.mainQuest.title==='Find the lost map');
  ok('Talking about a guard is classified as social, not tactical',sr20InferMode('I talk to the guard about the missing cart')==='social');
  ok('Asking a guard for directions remains a social action',sr20InferMode('I ask the guard where the road leads')==='social');
  const expertBonus=sr20SkillBonus({level:5,classId:'Wizard',stats:{INT:14},proficiencies:['Investigation'],expertise:['Investigation']},'Investigation');
  ok('Expertise doubles proficiency in the V20 check calculation',expertBonus.expertise&&expertBonus.total===8);
  ok('Routine through legendary challenge tiers apply predictable DC offsets',sr20ChallengeDC(12,'routine')===7&&sr20ChallengeDC(12,'standard')===12&&sr20ChallengeDC(12,'difficult')===17&&sr20ChallengeDC(12,'expert')===22&&sr20ChallengeDC(12,'legendary')===27);
  ok('Objective matching requires meaningful overlap instead of one incidental word',!sr20TokenMatch('I rest near the old watchtower','Find the lost map')&&sr20TokenMatch('I recover the lost map','Find the lost map'));
  ok('Main campaign objective is exposed in the gameplay ledger',g.objectives.length===1&&g.objectives[0].type==='main');
  ok('Character class identity supplies distinct capabilities',sr20ClassIdentity().edges.includes('stealth')&&sr20ClassIdentity().className==='rogue');
  const edge=sr20SkillBonus(state.character,'Stealth');ok('Class identity and proficiency both affect a relevant skill check',edge.total===7&&edge.edge&&edge.trained);
  ok('Free-form player intent is routed into exploration',sr20InferMode('I follow the muddy tracks and scout the ridge')==='exploration');
  ok('Auto mode classifies making camp and resting as survival',sr20InferMode('We make camp and rest for the night')==='survival');
  ok('Auto mode classifies gathering and purifying water as survival',sr20InferMode('I collect and purify water from the stream')==='survival');
  const leadAction=sr20ResolvePlayerAction('I inspect the broken stonework for concealed tracks',{mode:'exploration',roll:17,secondRoll:5,advantage:true});
  ok('Advantage selects the higher of two d20 results',leadAction.die===17&&leadAction.die2===5&&leadAction.advantage&&!leadAction.disadvantage);
  const disadvantage=sr20ResolvePlayerAction('I attempt a difficult deduction',{mode:'campaign',roll:3,secondRoll:17,disadvantage:true,dc:30});
  ok('Disadvantage selects the lower of two d20 results',disadvantage.die===3&&disadvantage.die2===17&&disadvantage.disadvantage&&!disadvantage.success);
  ok('Exploration resolves a skill check and creates a persistent discovery',leadAction.success&&leadAction.skill==='Investigation'&&g.leads.length===1);
  const social=sr20ResolvePlayerAction('I persuade Mara Venn to tell me who hired the guards',{mode:'social',target:'Mara Venn',roll:18});
  ok('Social actions remember the NPC relationship and last exchange',social.success&&state.campaign.npcs[0].sr20.relationship===1&&g.social['Mara Venn'].relationship===1);
  sr20ResolvePlayerAction('I take cover behind the stone pillar and watch the enemy',{mode:'tactical',roll:16});
  state.combat={round:2,enemies:[{name:'Guard',hp:20,ac:13}]};sr20ResolvePlayerAction('I flank the nearest enemy',{mode:'tactical',roll:18});
  ok('Tactical flanking temporarily lowers the target enemy AC',state.combat.sr20Tactics.stance==='flank'&&state.combat.enemies[0].ac===11);
  state.combat.round=3;sr20ExpireFlank();
  ok('Flanking penalty expires after the next combat round',state.combat.enemies[0].ac===13&&!state.combat.enemies[0].sr20Flank);
  state.combat={round:2,enemies:[]};sr20ResolvePlayerAction('I take cover behind the stone wall',{mode:'tactical',roll:18});
  ok('Successful cover posture grants +2 AC for the current combat round',sr20CoverIsActive()===true);
  const baseAC=computeAC(),hpBeforeCover=state.character.hp,oldAttackRoll=sr11RollAttack;
  const dummy={name:'Training Dummy',attack:0,actions:[]},strike={name:'Test Strike',description:'Melee weapon attack',attack_bonus:0,damage:[]};
  const target={player:{name:'Test Adventurer',character:state.character},pos:null};
  sr11RollAttack=function(){return {r:10,total:baseAC+1,r1:10,r2:10,adv:false,dis:false};};
  try{
   state.combat.sr20Tactics=null;sr18ResolveMonsterAction(dummy,strike,target);
   const unprotectedHit=state.character.hp<hpBeforeCover;state.character.hp=hpBeforeCover;
   state.combat.sr20Tactics={...g.tactical};
   sr18ResolveMonsterAction(dummy,strike,target);
   ok('Cover is applied by the existing V18 monster attack resolver',unprotectedHit&&state.character.hp===hpBeforeCover);
  }finally{sr11RollAttack=oldAttackRoll;}
  const travel=sr20ResolvePlayerAction('We travel onward for one watch',{mode:'travel',roll:12,dc:10});
  ok('Travel consumes carried provisions and advances exposure state',travel.success&&g.survival.exposure===1&&state.character.inventory.length===0);
  state.character.inventory=[{name:'Rations',type:'supply',count:3,desc:'A day of food.'},{name:'Waterskin',type:'supply',count:2,desc:'A filled waterskin.'}];
  sr20ResolvePlayerAction('We travel onward along the pass for one watch',{mode:'travel',roll:12,dc:10});
  const rationStack=state.character.inventory.find(x=>x.name==='Rations'),waterStack=state.character.inventory.find(x=>x.name==='Waterskin');
  ok('Travel decrements one unit from stacked food and water supplies',rationStack?.count===2&&waterStack?.count===1);
  g.survival.fatigue=2;const foodShortagesBefore=g.survival.foodShortages,waterShortagesBefore=g.survival.waterShortages;
  const autoRest=sr20ResolvePlayerAction('We make camp and rest for the night',{mode:'auto',roll:20});
  ok('Auto-routed rest reduces fatigue without consuming travel water or creating shortages',autoRest.mode==='survival'&&autoRest.noRoll&&g.survival.fatigue===0&&g.survival.foodShortages===foodShortagesBefore&&g.survival.waterShortages===waterShortagesBefore&&state.character.inventory.find(x=>x.name==='Waterskin')?.count===1);
  const forage=sr20ResolvePlayerAction('I forage for berries and collect water from the stream',{mode:'auto',roll:20,dc:10});
  const gainedRations=state.character.inventory.find(x=>x?.name==='Rations'),gainedWater=state.character.inventory.find(x=>x?.name==='Waterskin');
  ok('Successful survival checks add proper stackable inventory records',forage.success&&gainedRations?.type==='supply'&&gainedRations.count===2&&gainedWater?.type==='supply'&&gainedWater.count===2);
  const inventoryHTML=inventoryPage();
  ok('Gathered supplies render correctly in the existing inventory view',inventoryHTML.includes('Rations')&&inventoryHTML.includes('Waterskin'));
  const failed=sr20ResolvePlayerAction('I threaten the captain without leverage',{mode:'social',target:'Mara Venn',roll:1,dc:25});
  ok('Failed actions create visible consequences',!failed.success&&g.consequences.length>0);
  ok('Action outcomes persist in campaign history and the game journal',g.records.length===11&&state.log.length>=g.records.length);
  const context=srAIContext();ok('Director context receives all seven gameplay system states',!!context.campaign.gameplayV20&&context.campaign.gameplayV20.objectives.length===1&&context.campaign.gameplayV20.leads.length>0&&context.campaign.gameplayV20.tactical.stance==='cover');
  const customObjective=sr20SetObjective('Locate the hidden cistern','Search the ruined watchtower for a concealed water source.');
  const panel=sr20GameplayPanel();ok('Players can add persistent campaign objectives from the Adventure panel',customObjective.title==='Locate the hidden cistern'&&panel.includes('sr20-objective-form')&&panel.includes('Locate the hidden cistern'));
  ok('Adventure panel exposes challenge, skill, roll-state and legacy progression controls',panel.includes('sr20-challenge')&&panel.includes('sr20-skill')&&panel.includes('sr20-roll-state')&&panel.includes('Legacy renown'));
  ok('Beginner onboarding explains the first action loop and can be dismissed',panel.includes('Your first adventure')&&panel.includes('data-sr20-onboarding-dismiss'));
  ok('Adventure view exposes the integrated action composer and gameplay panels',panel.includes('sr20-action-form')&&panel.includes('Current objectives')&&panel.includes('Combat tactics'));
  const snapshot=sr18Snapshot('V20 persistence regression'),validated=sr18ValidateSave(JSON.parse(JSON.stringify(snapshot)));
  ok('V20 gameplay state survives the existing Save Center snapshot and validation path',validated.ok&&validated.state.campaign.sr20.version===SR20_GAMEPLAY_VERSION&&validated.state.campaign.sr20.records.length===g.records.length&&validated.state.campaign.sr20.objectives.some(x=>x.title==='Locate the hidden cistern'));
 }catch(e){ok('V20 seven-system gameplay tests execute without runtime errors',false,String(e?.stack||e));}
 state=old;return results;
}
globalThis.__SR20_TEST={version:SR20_GAMEPLAY_VERSION,ensure:sr20EnsureCampaign,classIdentity:sr20ClassIdentity,classEdge:sr20ClassEdge,inferMode:sr20InferMode,resolve:sr20ResolvePlayerAction,setObjective:sr20SetObjective,closeItem:sr20CloseItem,context:srAIContext,panel:sr20GameplayPanel,coverActive:sr20CoverIsActive,tests:sr20RunTests,get state(){return state;},set state(v){state=v;}};
