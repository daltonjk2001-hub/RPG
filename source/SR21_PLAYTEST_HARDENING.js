/* SOLO REALMS V21 — PLAYER-STAGE GAMEPLAY HARDENING.
 * Additive layer over V20. Existing character, campaign and save schemas remain compatible.
 */
const SR21_VERSION='21.0.0';
const SR21_DIFFICULTIES={trivial:5,routine:8,standard:12,hard:16,expert:20,legendary:25};
const SR21_SKILLS=['Acrobatics','Animal Handling','Arcana','Athletics','Deception','History','Insight','Intimidation','Investigation','Medicine','Nature','Perception','Performance','Persuasion','Religion','Sleight of Hand','Stealth','Survival'];
const SR21_TUTORIAL_STEPS=[
 {mode:'exploration',title:'Look closely',hint:'Search the area, inspect a clue, or follow tracks. Describe the action naturally.'},
 {mode:'social',title:'Speak with someone',hint:'Talk to an NPC, ask a question, negotiate, or read their motives.'},
 {mode:'travel',title:'Set out',hint:'Travel advances a watch and consumes one food and one water supply when carried.'},
 {mode:'survival',title:'Make camp',hint:'Rest, forage, gather food, and collect water to manage the journey.'}
];
const SR21_LEGACY_RANKS=[
 {xp:1000,title:'Road-Worn Hero'},{xp:3000,title:'Renowned Champion'},
 {xp:7500,title:'Realm-Shaping Legend'},{xp:15000,title:'Living Chronicle'},
 {xp:30000,title:'Mythic Paragon'}
];
let SR21_CURRENT_OPTIONS=null;
function sr21Norm(s){return String(s||'').toLowerCase().replace(/[^a-z]/g,'');}
function sr21EnsureCampaign(){
 const c=state?.campaign,ch=state?.character;if(!c||!ch)return null;
 c.sr21=c.sr21&&typeof c.sr21==='object'?c.sr21:{};
 const g=c.sr21;g.version=SR21_VERSION;g.id=String(g.id||sr20Id());
 g.reputation=g.reputation&&typeof g.reputation==='object'?g.reputation:{};
 g.milestones=Array.isArray(g.milestones)?g.milestones:[];g.archived=!!g.archived;
 const prior=g.onboarding&&typeof g.onboarding==='object'?g.onboarding:{};
 g.onboarding={step:Number.isInteger(prior.step)?prior.step:0,complete:prior.complete===undefined?!!prior.completed:!!prior.complete,hidden:!!prior.hidden};
 g.onboarding.step=Math.max(0,Math.min(SR21_TUTORIAL_STEPS.length,g.onboarding.step));
 return g;
}
function sr21EnsureLegacy(){
 const ch=state?.character;if(!ch)return null;
 ch.sr21Legacy=ch.sr21Legacy&&typeof ch.sr21Legacy==='object'?ch.sr21Legacy:{};
 const l=ch.sr21Legacy;l.version=SR21_VERSION;l.xp=Math.max(0,Number(l.xp)||0);
 l.archivedCampaigns=Array.isArray(l.archivedCampaigns)?l.archivedCampaigns:[];
 l.milestones=Array.isArray(l.milestones)?l.milestones:[];l.reputation=l.reputation&&typeof l.reputation==='object'?l.reputation:{};
 l.rank=SR21_LEGACY_RANKS.reduce((rank,r,i)=>l.xp>=r.xp?i+1:rank,0);
 l.title=l.rank?SR21_LEGACY_RANKS[l.rank-1].title:'Unrecorded';return l;
}
function sr21AwardLegacyXP(amount,reason,id){
 const ch=state?.character;if(!ch||Number(ch.level)<20)return false;
 const l=sr21EnsureLegacy(),key=String(id||reason||'legacy-event');
 if(l.milestones.some(x=>x.id===key))return false;
 const gained=Math.max(0,Math.floor(Number(amount)||0));if(!gained)return false;
 l.xp+=gained;l.milestones.unshift({id:key,reason:String(reason||'Milestone'),xp:gained,at:new Date().toISOString()});l.milestones=l.milestones.slice(0,100);
 const before=l.rank;l.rank=SR21_LEGACY_RANKS.reduce((rank,r,i)=>l.xp>=r.xp?i+1:rank,0);
 l.title=l.rank?SR21_LEGACY_RANKS[l.rank-1].title:'Unrecorded';
 if(l.rank>before)l.lastRankUp={rank:l.rank,title:l.title,at:new Date().toISOString()};
 try{save();}catch(e){}return {gained,total:l.xp,rank:l.rank,title:l.title,newRank:l.rank>before};
}
function sr21ArchiveCampaign(){
 const c=state?.campaign,ch=state?.character;if(!c||!ch)return false;
 const g=sr21EnsureCampaign(),l=sr21EnsureLegacy();if(l.archivedCampaigns.some(x=>x.id===g.id))return false;
 const objectives=c.sr20?.objectives||[],npcs=c.npcs||[];
 const archive={
  id:g.id,title:String(c.title||c.name||c.mainQuest?.title||'Untitled campaign').slice(0,100),
  archivedAt:new Date().toISOString(),character:String(ch.name||'Adventurer'),level:Number(ch.level)||1,
  region:String(c.region||c.location||''),chapter:Number(c.chapter||c.sr14?.chapter||1),
  mainQuest:String(c.mainQuest?.title||''),completedObjectives:objectives.filter(x=>x.status==='completed').map(x=>String(x.title||'').slice(0,100)).slice(0,30),
  unresolvedLeads:(c.sr20?.leads||[]).filter(x=>x.status==='unresolved').length,
  relationships:npcs.filter(x=>x?.name).slice(0,40).map(x=>({name:String(x.name),relationship:Number(x.sr20?.relationship??x.relationship)||0,faction:String(x.faction||'')}))
 };
 l.archivedCampaigns.unshift(archive);l.archivedCampaigns=l.archivedCampaigns.slice(0,50);
 g.archived=true;g.archivedAt=archive.archivedAt;
 if(Number(ch.level)>=20)sr21AwardLegacyXP(500,'Campaign archived','archive:'+g.id);
 try{save();render();}catch(e){}
 if(typeof toast==='function')toast('Campaign added to your Legacy Chronicle. Your save remains intact.');
 return archive;
}
function sr21InferMode(text){
 const t=String(text||'').toLowerCase();
 const rules=[
  ['social',/\b(talk|speak|ask|tell|convince|persuade|negotiate|lie|deceive|bluff|bargain|interrogate|apologize|charm|threaten|intimidate|parley|question|bribe|plead)\b/],
  ['tactical',/\b(attack|fight|strike|shoot|stab|slash|cast at|charge|flank|take cover|cover from|defend myself|parry|disarm|ambush|retreat|withdraw|battle|combat|grapple|trip the enemy|outmaneuver)\b/],
  ['survival',/\b(make camp|camp|rest|sleep|short rest|long rest|forage|hunt|fish|gather food|gather water|collect water|purify|boil water|cook|repair gear|treat wounds|survive)\b/],
  ['travel',/\b(travel|journey|march|hike|cross|sail|ride|set out|move camp|continue down the road|travel onward)\b/],
  ['exploration',/\b(search|explore|scout|track|inspect|investigate|discover|clue|examine|map|survey|listen|look around|find|sneak past|sneak by|hide from|pick the lock|follow tracks)\b/]
 ];
 let best=null;
 for(const [mode,pattern] of rules){const match=pattern.exec(t);if(match&&(!best||match.index<best.index))best={mode,index:match.index};}
 return best?.mode||'campaign';
}

function sr21SkillFor(mode,text,decision,chosen){
 const requested=String(chosen||'').trim();
 if(requested&&requested.toLowerCase()!=='auto')return SR21_SKILLS.find(x=>sr21Norm(x)===sr21Norm(requested))||requested;
 if(decision?.skill)return String(decision.skill);
 const t=String(text||'').toLowerCase();
 if(mode==='social')return /\b(lie|deceiv|bluff|pretend|disguise)\b/.test(t)?'Deception':/\b(threat|intimidat|coerce|scare)\b/.test(t)?'Intimidation':/\b(read|sense|motive|notice.*lie|insight)\b/.test(t)?'Insight':/\b(sing|perform|entertain|play music)\b/.test(t)?'Performance':'Persuasion';
 if(mode==='travel'||mode==='survival')return /\b(animal|horse|wolf|mount|beast)\b/.test(t)?'Animal Handling':/\b(plant|herb|weather|poison|natural)\b/.test(t)?'Nature':/\b(repair|craft|build|tool|lock)\b/.test(t)?'Sleight of Hand':'Survival';
 if(mode==='tactical')return /\b(sneak|hide|ambush|shadow)\b/.test(t)?'Stealth':/\b(dodge|balance|acrobat|leap)\b/.test(t)?'Acrobatics':/\b(notice|watch|spot|read the enemy)\b/.test(t)?'Perception':'Athletics';
 if(mode==='exploration')return /\b(listen|hear|spot|watch|notice|see)\b/.test(t)?'Perception':/\b(track|trail|navigate|wilderness|forage)\b/.test(t)?'Survival':/\b(sneak|hide|quiet|pick the lock)\b/.test(t)?'Stealth':/\b(history|ancient|chronicle|historical)\b/.test(t)?'History':/\b(rune|spell|arcane|magic|ward|enchant)\b/.test(t)?'Arcana':'Investigation';
 return /\b(rune|spell|arcane|magic|ward|enchant)\b/.test(t)?'Arcana':'Investigation';
}
function sr21SkillBonus(ch,skill){
 const key=sr21Norm(skill),ability=SR20_SKILL_ABILITIES[key]||'INT';
 const prof=2+Math.floor((Math.max(1,Number(ch?.level)||1)-1)/4);
 const includes=arr=>Array.isArray(arr)&&arr.some(x=>sr21Norm(typeof x==='string'?x:x?.name)===key);
 const expert=includes(ch?.expertise)||includes(ch?.skillExpertise)||includes(ch?.skills?.expertise);
 const trained=includes(ch?.proficiencies)||includes(ch?.skillProficiencies)||includes(ch?.skills?.proficient)||expert;
 const abilityMod=Math.floor((Number(ch?.stats?.[ability]??ch?.stats?.[ability.toLowerCase()]??10)-10)/2);
 const proficiency=trained?prof:0,expertise=expert?prof:0,classEdge=sr20ClassEdge(skill,ch)?1:0;
 return {ability:abilityMod,proficiency,expertise,expertiseBonus:expertise,classEdge,total:abilityMod+proficiency+expertise+classEdge,trained,expert,edge:classEdge>0};
}
function sr21SituationDC(text,mode,decision){
 const suggested=Number(decision?.dc);if(Number.isFinite(suggested)&&suggested>=5&&suggested<=30)return suggested;
 const base={travel:11,survival:12,exploration:12,social:13,tactical:13,campaign:12}[mode]||12;
 const t=String(text||'').toLowerCase(),risk=/\b(under fire|while pursued|during a storm|deadly|fortified|expertly guarded|unstable|collapsing|legendary|ancient ward|time is running out|one chance)\b/.test(t);
 const simple=/\b(unlocked|unopposed|obvious|routine|familiar|simple|ordinary|at leisure)\b/.test(t);
 return Math.max(5,Math.min(30,base+(risk?3:0)-(simple?3:0)));
}
function sr21ExplicitDifficulty(value){
 const key=String(value||'auto').toLowerCase();return Object.prototype.hasOwnProperty.call(SR21_DIFFICULTIES,key)?SR21_DIFFICULTIES[key]:null;
}
function sr21ObjectiveKeywords(objective){
 const stop=new Set(['this','that','with','from','into','onto','your','their','there','where','what','when','while','find','make','help','the','and','for','of','to','in','on','at','by','is','are','was','were','get','recover','locate','search','speak','talk','ask','about']);
 return String((objective?.title||'')+' '+(objective?.detail||'')).toLowerCase().match(/[a-z]{3,}/g)?.filter(x=>!stop.has(x))||[];
}
function sr21FindObjective(action,options,g){
 const id=String(options?.objectiveId||'auto'),words=new Set(String(action||'').toLowerCase().match(/[a-z]{3,}/g)||[]);
 const relevant=o=>{const keys=sr21ObjectiveKeywords(o),hits=keys.filter(w=>words.has(w)).length;return hits>=Math.min(2,keys.length);};
 if(id&&id!=='auto'){const selected=g.objectives.find(x=>x.id===id&&x.status==='active');return selected&&relevant(selected)?selected:null;}
 return g.objectives.find(o=>o.status==='active'&&relevant(o))||null;
}
function sr21AdvanceAdventure(text,mode,success){
 const c=state?.campaign,g=sr20EnsureCampaign(),v=sr21EnsureCampaign();if(!c||!g||!v)return;
 const options=SR21_CURRENT_OPTIONS||{};
 if(!success){
  if(!(mode==='survival'&&/\b(rest|camp|sleep)\b/i.test(text)))sr20AddConsequence('The failed approach leaves an unresolved complication: '+String(text||'the party’s plan').slice(0,140)+'.',mode);
  return;
 }
 if(mode==='survival'&&/\b(rest|camp|sleep)\b/i.test(text))return;
 const objective=sr21FindObjective(text,options,g);if(!objective)return;
 const day=Math.max(1,Number(c.day)||1),fingerprint=String(text||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().slice(0,120);
 objective.progressKeys=Array.isArray(objective.progressKeys)?objective.progressKeys:[];
 const progressKey=String(day)+':'+fingerprint;if(objective.progressKeys.includes(progressKey))return;
 objective.progressKeys.push(progressKey);objective.progressKeys=objective.progressKeys.slice(-500);
 objective.progress=Math.min(Math.max(1,Number(objective.goal)||1),(Number(objective.progress)||0)+1);
 if(objective.progress>=Math.max(1,Number(objective.goal)||1)){
  objective.status='completed';objective.completedDay=day;
  if(objective.type==='main'&&c.mainQuest){
   c.mainQuest.progress=objective.progress;c.flags=c.flags||{};c.flags.sr20MainObjectiveCompleted=true;
  }
  if(!objective.legacyAwarded){
   objective.legacyAwarded=true;g.legacy.completedObjectives++;g.legacy.renown+=10;
   const count=g.legacy.completedObjectives,title=count>=20?'Legend of the Realms':count>=10?'Worldshaper':count>=5?'Seasoned Hero':'Oathkeeper';
   if(!g.legacy.titles.includes(title))g.legacy.titles.push(title);
   g.legacy.milestones.push({type:'objective-completed',title:objective.title,day,renown:10});
  }
  if(Number(state.character?.level)>=20)sr21AwardLegacyXP(objective.type==='main'?1500:objective.type==='player'?750:500,'Objective completed','objective:'+objective.id);
  g.momentum++;if(g.momentum>=3){g.momentum=0;sr20AddLead('A major opportunity opens after the party completes several campaign objectives.','campaign-opening');}
 }
}
function sr21RandomForRolls(options,fn){
 const old=Math.random,queue=[];if(Number.isInteger(options?.roll))queue.push(Math.max(1,Math.min(20,options.roll)));
 if(Number.isInteger(options?.secondRoll))queue.push(Math.max(1,Math.min(20,options.secondRoll)));
 if(!queue.length)return fn();
 try{Math.random=function(){return queue.length?(queue.shift()-0.00001)/20:old();};return fn();}finally{Math.random=old;}
}
function sr21CanonicalCheck(ch,skill,dc,options,fatiguePenalty){
 const advantage=!!options.advantage&&!options.disadvantage,disadvantage=!!options.disadvantage&&!options.advantage;
 const rollMode=advantage?'advantage':disadvantage?'disadvantage':'normal';
 let check=null;if(typeof sr14AbilityCheck==='function')check=sr21RandomForRolls(options,()=>sr14AbilityCheck(ch,skill,dc,{mode:rollMode}));
 const fallback=sr21SkillBonus(ch,skill);
 const first=Number(options.roll??check?.r1??check?.roll1??check?.roll??check?.r??Math.floor(Math.random()*20)+1);
 const second=(advantage||disadvantage)?Number(options.secondRoll??check?.r2??check?.roll2??first):null;
 const die=second===null?first:(advantage?Math.max(first,second):Math.min(first,second));
 const canonicalBonus=Number.isFinite(Number(check?.bonus))?Number(check.bonus):(fallback.total-fallback.classEdge);
 const canonicalHasExpertise=canonicalBonus-fallback.ability>=fallback.proficiency+fallback.expertise;
 const missingExpertise=fallback.expert&&!canonicalHasExpertise?fallback.expertise:0;
 const bonus=canonicalBonus+missingExpertise+fallback.classEdge;
 const total=die+bonus+fatiguePenalty;
 const success=total>=dc;
 return {roll:die,first,second,advantage,disadvantage,bonus,total,success,skill,dc,check};
}
function sr21RecordTutorial(mode){
 const g=sr21EnsureCampaign();if(!g?.onboarding||g.onboarding.hidden||g.onboarding.complete||Number(state.character?.level)>3)return;
 const step=SR21_TUTORIAL_STEPS[g.onboarding.step];if(step&&mode===step.mode){g.onboarding.step++;if(g.onboarding.step>=SR21_TUTORIAL_STEPS.length)g.onboarding.complete=true;try{save();}catch(e){}}
}
function sr21ResolvePlayerAction(text,options={}){
 sr20ExpireFlank();const action=String(text||'').trim().slice(0,500);
 if(!action)throw new Error('Describe what your character is trying to do.');
 if(!state?.character||!state?.campaign)throw new Error('Start a campaign before taking a gameplay action.');
 const g=sr20EnsureCampaign(),ch=state.character,opts={...(options||{})};
 const mode=SR20_MODES.includes(opts.mode)&&opts.mode!=='auto'?opts.mode:sr21InferMode(action);
 let decision=null;try{if(typeof sr18ImprovisationDecision==='function')decision=sr18ImprovisationDecision(action);}catch(e){}
 const skill=sr21SkillFor(mode,action,decision,opts.skill);
 const presetDC=sr21ExplicitDifficulty(opts.difficulty);
 const baseDC=Number.isFinite(Number(opts.dc))&&Number(opts.dc)>=5&&Number(opts.dc)<=30?Number(opts.dc):(Number(decision?.dc)||sr21SituationDC(action,mode,decision));
 const dc=presetDC??sr20ChallengeDC(baseDC,opts.challenge||'standard');
 const noRoll=opts.noRoll===true||(mode==='survival'&&/\b(make camp|camp|rest|sleep|short rest|long rest|take a rest|sleep for the night)\b/i.test(action));
 const fatiguePenalty=g.survival.fatigue>=4&&(mode==='travel'||mode==='survival')?-2:0;
 const check=noRoll?null:sr21CanonicalCheck(ch,skill,dc,opts,fatiguePenalty);
 const success=noRoll?true:!!check.success,total=noRoll?null:check.total,die=noRoll?null:check.roll;
 const target=sr20FindNPC(opts.target,action),beforeWatch=Number(g.clock.watch)||0;
 const summary=sr21SkillBonus(ch,skill);
 const outcome={id:sr20Id(),day:Math.max(1,Number(state.campaign.day)||1),mode,action,skill,dc,die,die2:check?.second??null,advantage:!!check?.advantage,disadvantage:!!check?.disadvantage,bonus:noRoll?summary:{...summary,total:check.bonus},total,success,noRoll,narrative:sr20ActionNarrative(mode,success),target:target?.name||'',className:sr20ClassIdentity(ch).className,createdAt:new Date().toISOString()};
 g.clock.actions++;
 if(mode==='travel'){
  const watches=Math.max(1,Math.min(24,Math.floor(Number(opts.durationWatches)||1)));g.clock.watch=beforeWatch+watches;
  for(let i=0;i<watches;i++){
   const food=sr20ConsumeSupply(/\b(rations?|food|trail meals?|provisions?)\b/i),water=sr20ConsumeSupply(/\b(water|waterskins?|canteens?)\b/i);
   if(!food){g.survival.foodShortages++;g.survival.fatigue=sr20Clamp(g.survival.fatigue+1,0,6);}
   if(!water){g.survival.waterShortages++;g.survival.fatigue=sr20Clamp(g.survival.fatigue+1,0,6);}
   g.survival.exposure++;
  }
  try{if(typeof sr18AdvanceWorld==='function')sr18AdvanceWorld('travel',1);}catch(e){}
 }else if(mode==='survival'&&/\b(rest|camp|sleep)\b/i.test(action)){
  const meal=sr20ConsumeSupply(/\b(rations?|food|trail meals?|provisions?)\b/i);
  g.survival.fatigue=sr20Clamp(g.survival.fatigue-(meal?2:1),0,6);g.survival.exposure=Math.max(0,g.survival.exposure-1);
  g.clock.watch=beforeWatch+2;try{if(typeof sr18AdvanceWorld==='function')sr18AdvanceWorld('long_rest',1);}catch(e){}
 }else{g.clock.watch=beforeWatch;try{if(typeof sr18AdvanceWorld==='function')sr18AdvanceWorld('action',0);}catch(e){}}
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
  const faction=String(target.faction||'').trim();
  if(faction){const v=sr21EnsureCampaign(),l=sr21EnsureLegacy();v.reputation[faction]=sr20Clamp((Number(v.reputation[faction])||0)+(success?1:-1),-20,20);l.reputation[faction]=sr20Clamp((Number(l.reputation[faction])||0)+(success?1:-1),-100,100);}
 }
 if(mode==='tactical'){
  const posture=/\b(cover|hide|defend|protect)\b/i.test(action)?'cover':/\b(flank|circle|outmaneuver)\b/i.test(action)?'flank':/\b(retreat|withdraw|fall back)\b/i.test(action)?'withdraw':/\b(ambush|surprise|sneak attack)\b/i.test(action)?'ambush':'adaptive';
  g.tactical={stance:posture,intent:action.slice(0,180),round:Number(state.combat?.round)||0,lastCheck:success?'opening':'contested'};
  if(state.combat){state.combat.sr20Tactics={...g.tactical,checkTotal:total,dc};
   if(posture==='flank'&&success&&Array.isArray(state.combat.enemies)){
    const enemy=state.combat.enemies.find(x=>opts.target&&String(x.name||'').toLowerCase()===String(opts.target).toLowerCase()&&x.hp>0)||state.combat.enemies.find(x=>x&&x.hp>0);
    if(enemy&&Number.isFinite(Number(enemy.ac))){const prior=enemy.sr20Flank?.originalAC??Number(enemy.ac);enemy.sr20Flank={originalAC:prior,untilRound:Number(state.combat.round)||0};enemy.ac=Math.max(5,prior-2);state.combat.sr20Tactics.flankedTarget=enemy.name||'';}
   }
  }
 }
 if(mode==='exploration'&&success){
  const exists=g.leads.some(x=>x.status==='unresolved'&&x.day===outcome.day&&String(x.text||'').includes(action.slice(0,70)));
  if(!exists)sr20AddLead('A discovery connected to the party’s investigation: '+action.slice(0,150)+'.','exploration');
 }
 SR21_CURRENT_OPTIONS=opts;try{sr21AdvanceAdventure(action,mode,success);}finally{SR21_CURRENT_OPTIONS=null;}
 if(typeof sr19ApplyActionBehavior==='function'){
  const kind=mode==='social'?(/\b(lie|deceiv|bluff)\b/i.test(action)?'deception':/\b(threat|intimidat)\b/i.test(action)?'intimidation':'negotiation'):mode==='exploration'?'investigation':mode==='tactical'?'violence':mode==='travel'?'travel':'open-ended';
  try{sr19ApplyActionBehavior({kind,text:action,target:target?.name||opts.target||'',success});}catch(e){}
 }
 const rollText=noRoll?'No check required':'d20 '+die+' '+(check.bonus>=0?'+':'')+check.bonus+(fatiguePenalty?' '+fatiguePenalty:'')+' = '+total+' vs DC '+dc;
 outcome.narrative+=' '+rollText+(outcome.bonus?.edge?' · class edge +1':'')+'.';
 g.lastOutcome=outcome;g.records.push(outcome);
 while(g.records.length>40){const archived=g.records.shift();g.archive.push(archived);}
 g.archive=g.archive.slice(-1000);
 if(!Array.isArray(state.log))state.log=[];state.log.push({day:outcome.day,msg:(success?'Success':'Complication')+' · '+mode+': '+action+' — '+rollText+'.'});if(state.log.length>300)state.log=state.log.slice(-300);
 sr21RecordTutorial(mode);try{save();}catch(e){}return outcome;
}
function sr21SetObjective(title,detail='',goal=1){
 const v=sr21EnsureCampaign(),g=sr20EnsureCampaign();if(!v||!g)throw new Error('No active campaign.');
 const clean=String(title||'').trim().slice(0,100);if(!clean)throw new Error('Give the objective a title.');
 const n=Math.max(1,Math.min(10,Math.floor(Number(goal)||1)));
 const active=g.objectives.filter(x=>x.status==='active').length;
 if(active>=20)throw new Error('The objective journal is full. Complete or resolve an active objective before adding another.');
 const objective={id:sr20Id(),type:'player',title:clean,detail:String(detail||'').trim().slice(0,240),progress:0,goal:n,status:'active',progressKeys:[]};
 g.objectives.unshift(objective);
 while(g.objectives.length>20){const i=g.objectives.findIndex(x=>x.status==='completed');if(i<0)throw new Error('The objective journal is full. Complete an objective before adding another.');g.objectives.splice(i,1);}
 try{save();}catch(e){}return objective;
}
function sr21ObjectiveOptions(){
 const list=state?.campaign?.sr20?.objectives||[];
 return '<option value="auto" selected>Auto-match from the action</option>'+list.filter(x=>x.status==='active').slice(0,15).map(x=>'<option value="'+esc(x.id)+'">'+esc(x.title)+' · '+Number(x.progress||0)+'/'+Number(x.goal||1)+'</option>').join('');
}
function sr21DifficultyOptions(){
 return '<option value="auto" selected>Automatic · situational</option><option value="trivial">Trivial · DC 5</option><option value="routine">Routine · DC 8</option><option value="standard">Standard · DC 12</option><option value="hard">Hard · DC 16</option><option value="expert">Expert · DC 20</option><option value="legendary">Legendary · DC 25</option>';
}
const sr21BaseGameplayPanel=sr20GameplayPanel;
function sr21GameplayPanel(){
 let html=sr21BaseGameplayPanel();if(!html)return html;
 for(const id of ['sr20-challenge','sr20-skill','sr20-roll-state']){
  const start=html.indexOf('<div class="field"><label for="'+id+'">');
  if(start>=0){const end=html.indexOf('</div>',start);if(end>=0)html=html.slice(0,start)+html.slice(end+6);}
 }
 const controls='<div class="two-col"><div class="field"><label for="sr21-skill">Skill check</label><select id="sr21-skill"><option value="auto" selected>Director chooses</option>'+SR21_SKILLS.map(x=>'<option value="'+x+'">'+x+'</option>').join('')+'</select></div><div class="field"><label for="sr21-difficulty">Challenge</label><select id="sr21-difficulty">'+sr21DifficultyOptions()+'</select></div><div class="field"><label for="sr21-roll-mode">Roll conditions</label><select id="sr21-roll-mode"><option value="normal" selected>Normal roll</option><option value="advantage">Advantage</option><option value="disadvantage">Disadvantage</option></select></div><div class="field"><label for="sr21-objective">Objective focus</label><select id="sr21-objective">'+sr21ObjectiveOptions()+'</select></div></div>';
 const marker='<div class="field"><label for="sr20-action-text">';if(html.includes(marker))html=html.replace(marker,controls+marker);
 const goalMarker='<button class="btn" type="submit">Add objective</button>';
 if(html.includes(goalMarker))html=html.replace(goalMarker,'<div class="field"><label for="sr21-objective-goal">Progress steps</label><input id="sr21-objective-goal" type="number" min="1" max="10" value="2"></div>'+goalMarker);
 return html;
}
function sr21TutorialPanel(){
 const g=sr21EnsureCampaign();if(!g?.onboarding||g.onboarding.hidden||g.onboarding.complete||Number(state.character?.level)>3)return '';
 const step=SR21_TUTORIAL_STEPS[g.onboarding.step];if(!step)return '';
 return '<section class="card" id="sr21-first-session"><div class="eyebrow">First-session guide · '+(g.onboarding.step+1)+' of '+SR21_TUTORIAL_STEPS.length+'</div><h3>'+esc(step.title)+'</h3><p>'+esc(step.hint)+'</p><div class="item-actions"><button class="btn" type="button" data-sr21-action="skip-tutorial">I know the basics · hide guide</button></div></section>';
}
function sr21PlayerStage(ch=state?.character){
 const level=Math.max(1,Number(ch?.level)||1);
 if(level>=20)return Number(ch?.sr21Legacy?.xp)>0?'legacy':'expert';
 if(level>=15)return 'veteran';
 if(level>=10)return 'experienced';
 if(level>=5)return 'developing';
 if(level>=3)return 'learning';
 return 'new';
}
function sr21LegacyPanel(){
 const ch=state?.character;if(!ch)return '';const l=sr21EnsureLegacy();
 if(Number(ch.level)<20&&!l.xp&&!l.archivedCampaigns.length)return '';
 return '<section class="card" id="sr21-legacy"><div class="eyebrow">Legacy Chronicle</div><h3>'+esc(l.title)+'</h3><p>'+Number(l.xp).toLocaleString()+' legacy XP · Rank '+l.rank+' · '+l.archivedCampaigns.length+' archived campaign'+(l.archivedCampaigns.length===1?'':'s')+'</p><p class="muted smalltext">'+(Number(ch.level)>=20?'Level 20 progression continues through completed campaign objectives and legacy milestones, without raising character level or combat statistics.':'Your chronicle will unlock its legacy path when this character reaches level 20.')+'</p><div class="item-actions"><button class="btn" type="button" data-sr21-action="archive">Archive this campaign</button></div>'+(l.archivedCampaigns.length?'<div class="tagline">Most recent: '+esc(l.archivedCampaigns[0].title)+' · '+esc(l.archivedCampaigns[0].region)+'</div>':'')+'</section>';
}
function sr21ResolveOptions(options){
 const out={...(options||{})},skill=$('sr21-skill'),difficulty=$('sr21-difficulty'),rollMode=$('sr21-roll-mode'),objective=$('sr21-objective');
 if(skill)out.skill=skill.value||'auto';
 if(difficulty)out.difficulty=difficulty.value||'auto';
 if(objective)out.objectiveId=objective.value||'auto';
 if(rollMode){out.advantage=rollMode.value==='advantage';out.disadvantage=rollMode.value==='disadvantage';}
 return out;
}
sr20SkillBonus=function(ch,skill){return sr21SkillBonus(ch,skill);};
sr20InferMode=sr21InferMode;
sr20SkillFor=function(mode,text,decision){return sr21SkillFor(mode,text,decision,null);};
sr20AdvanceAdventure=sr21AdvanceAdventure;
sr20ResolvePlayerAction=function(text,options={}){return sr21ResolvePlayerAction(text,sr21ResolveOptions(options));};
sr20SetObjective=function(title,detail='',goal){const field=$('sr21-objective-goal');return sr21SetObjective(title,detail,goal??(field?.value!==undefined&&field?.value!==''?field.value:1));};
sr20GameplayPanel=sr21GameplayPanel;
const sr21AdventureBase=adventurePage;
adventurePage=function(){return sr21TutorialPanel()+sr21AdventureBase()+sr21LegacyPanel();};
const sr21ContextBase=srAIContext;
srAIContext=function(){
 const x=sr21ContextBase(),g=sr21EnsureCampaign(),l=sr21EnsureLegacy();
 x.campaign=x.campaign||{};
 x.campaign.gameplayV21={version:SR21_VERSION,playerStage:sr21PlayerStage(state.character),reputation:g?.reputation||{},legacy:{xp:l?.xp||0,rank:l?.rank||0,title:l?.title||'Unrecorded',archives:l?.archivedCampaigns?.slice(0,10)||[]},onboarding:g?.onboarding||null};
 return x;
};
app.addEventListener('click',function(e){
 const b=e.target?.closest?.('[data-sr21-action]');if(!b)return;
 if(b.dataset.sr21Action==='skip-tutorial'){const g=sr21EnsureCampaign();if(g?.onboarding){g.onboarding.hidden=true;save();render();}return;}
 if(b.dataset.sr21Action==='archive')sr21ArchiveCampaign();
},true);
globalThis.__SR21_TEST={version:SR21_VERSION,ensure:sr21EnsureCampaign,legacy:sr21EnsureLegacy,awardLegacy:sr21AwardLegacyXP,archive:sr21ArchiveCampaign,inferMode:sr21InferMode,skillBonus:sr21SkillBonus,situationDC:sr21SituationDC,explicitDifficulty:sr21ExplicitDifficulty,playerStage:sr21PlayerStage,resolve:sr21ResolvePlayerAction,resolveOptions:sr21ResolveOptions,setObjective:sr21SetObjective,tutorial:sr21TutorialPanel,panel:sr21GameplayPanel,objectiveOptions:sr21ObjectiveOptions,get state(){return state;},set state(v){state=v;}};
