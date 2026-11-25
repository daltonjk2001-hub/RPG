
/* SOLO REALMS V19.1 — REACTIVE WORLD & NPC BEHAVIOR ENGINE.
 * Adds persistent personality-weighted behavior. V18 remains authoritative for mechanics.
 */
const SR19_BEHAVIOR_VERSION='19.1.0';
function sr19TopInfluences(mix=sr19Normalize(sr19GetSettings().personalityMix),threshold=10){return SR19_KEYS.filter(k=>mix[k]>=threshold).sort((a,b)=>mix[b]-mix[a]);}
function sr19EnsureBehaviorWorld(){
 const w=sr18EnsureWorld();if(!w)return null;
 w.directorStudio=w.directorStudio&&typeof w.directorStudio==='object'?w.directorStudio:{};
 const b=w.directorStudio;b.version=SR19_BEHAVIOR_VERSION;b.pulses=Math.max(0,Number(b.pulses)||0);b.lastPulseTick=Math.max(0,Number(b.lastPulseTick)||0);
 for(const k of ['storyThreads','callbacks','leads','discoveryLeads','omens','recentPatterns'])b[k]=Array.isArray(b[k])?b[k]:[];
 b.lastAction=b.lastAction&&typeof b.lastAction==='object'?b.lastAction:null;return b;
}
function sr19EnsureNPCBehavior(npc){
 if(!npc||typeof npc!=='object')return null;
 npc.sr19=npc.sr19&&typeof npc.sr19==='object'?npc.sr19:{};const s=npc.sr19;
 s.version=SR19_BEHAVIOR_VERSION;s.actionCounts=s.actionCounts&&typeof s.actionCounts==='object'?s.actionCounts:{};
 for(const k of ['openQuestions','knownTactics','runningGags','storyBeats','personalLeads','publicKnowledge'])s[k]=Array.isArray(s[k])?s[k]:[];
 for(const k of ['suspicion','alertness','unease','curiosity','retaliationReadiness','banter'])s[k]=sr19Clamp(s[k],0,100);
 s.lastAction=s.lastAction&&typeof s.lastAction==='object'?s.lastAction:null;s.nextMove=String(s.nextMove||'continue pursuing personal goals').slice(0,180);return s;
}
function sr19PushUnique(list,value,max=8){
 const valueText=String(value||'').trim().slice(0,220);if(!valueText)return;
 if(!list.some(x=>String(x?.text||x).toLowerCase()===valueText.toLowerCase()))list.unshift(valueText);
 if(list.length>max)list.length=max;
}
function sr19BehaviorEvent(kind,text,meta={}){
 return typeof sr18AddWorldEvent==='function'?sr18AddWorldEvent('director-'+kind,String(text||'').slice(0,390),{directorStudio:true,...meta}):null;
}
function sr19ApplyActionBehavior(action){
 const campaign=state.campaign;if(!campaign||!action)return null;
 const mix=sr19Normalize(sr19GetSettings().personalityMix),kind=String(action.kind||'open-ended'),text=String(action.text||'').slice(0,180);
 const hostile=['theft','violence','intimidation'].includes(kind);
 const curious=['investigation','deception','open-ended','negotiation'].includes(kind)||/\b(explore|search|inspect|study|travel|discover|look around)\b/i.test(text);
 const playful=/\b(joke|prank|tease|trick|practical joke|funny|laugh|mischief|ridiculous)\b/i.test(text);
 const target=(campaign.npcs||[]).find(n=>n.name&&String(n.name).toLowerCase()===String(action.target||'').toLowerCase())||
  (campaign.npcs||[]).find(n=>n.name&&text.toLowerCase().includes(String(n.name).toLowerCase()))||null;
 const world=sr19EnsureBehaviorWorld();if(!world)return null;
 world.lastAction={day:campaign.day||1,kind,text,target:target?.name||'',location:campaign.location||'',success:action.success??null};
 if(target){
  const s=sr19EnsureNPCBehavior(target);s.actionCounts[kind]=Math.min(99,(Number(s.actionCounts[kind])||0)+1);
  s.lastAction={day:campaign.day||1,kind,text,success:action.success??null};
  if(mix.story>=12){s.storyBeats.unshift({day:campaign.day||1,kind,summary:(kind+': '+text).slice(0,180),relationship:target.relationship??target.trust??0});s.storyBeats=s.storyBeats.slice(0,8);s.nextMove=hostile?'weigh the personal cost of trust and decide whether to seek protection or make peace':'remember this encounter and let it shape a future choice';}
  if(mix.trickster>=12&&(playful||kind==='deception'||kind==='open-ended')){s.banter=sr19Clamp(s.banter+Math.max(2,Math.round(mix.trickster/20)),0,100);if(playful){sr19PushUnique(s.runningGags,target.name+' remembers: '+text,6);s.nextMove='look for a chance to return the joke or make a playful callback';}else if(kind==='deception')s.nextMove='test the story with a sly question before deciding whether to believe it';}
  if(mix.tactical>=12&&hostile){s.alertness=sr19Clamp(s.alertness+Math.ceil(mix.tactical/24),0,100);const response=kind==='theft'?'secure valuables and check who had access':kind==='violence'?'avoid isolation, call allies, and watch the party approach':'warn associates and keep a safer distance';sr19PushUnique(s.knownTactics,'Observed '+kind+'; response: '+response+'.',8);s.nextMove=response;}
  if(mix.mystery>=12&&['investigation','deception','negotiation'].includes(kind)){s.suspicion=sr19Clamp(s.suspicion+(kind==='deception'?5:2),0,100);if(action.success!==false){sr19PushUnique(s.openQuestions,'Unresolved question after '+text,8);s.nextMove='decide which part of the truth can safely be disclosed';}else s.nextMove='keep answers narrow until the party earns more trust';}
  if(mix.merciless>=12&&hostile){s.retaliationReadiness=sr19Clamp(s.retaliationReadiness+Math.ceil(mix.merciless/18),0,100);s.nextMove='seek leverage, allies, or a defensible position before the next confrontation';}
  if(mix.explorer>=12&&curious){s.curiosity=sr19Clamp(s.curiosity+Math.ceil(mix.explorer/25),0,100);sr19PushUnique(s.personalLeads,'A lead connected to '+target.name+' goals: '+(target.goals?.[0]||'a private concern')+'.',6);if(!hostile)s.nextMove='consider sharing a local lead if the party shows genuine curiosity';}
  if(mix.horror>=16&&(hostile||kind==='deception'||/dark|whisper|shadow|blood|missing|vanish/i.test(text))){s.unease=sr19Clamp(s.unease+Math.ceil(mix.horror/22),0,100);s.nextMove='be guarded; small inconsistencies feel more dangerous than open threats';}
  if(mix.comedy>=12&&playful){s.banter=sr19Clamp(s.banter+Math.ceil(mix.comedy/22),0,100);sr19PushUnique(s.runningGags,target.name+' has a private joke about: '+text,6);s.nextMove='answer with dry wit or a callback if the moment allows it';}
  if(target.faction){const faction=(campaign.sr18?.factions||[]).find(f=>f.name===target.faction);if(faction){faction.sr19=faction.sr19&&typeof faction.sr19==='object'?faction.sr19:{};if(hostile&&mix.tactical>=12)faction.sr19.readiness=sr19Clamp((faction.sr19.readiness||0)+1,0,6);if(hostile&&mix.merciless>=12)faction.sr19.grievance=sr19Clamp((faction.sr19.grievance||0)+1,0,6);if(curious&&mix.mystery>=12)faction.sr19.secrecy=sr19Clamp((faction.sr19.secrecy||0)+1,0,6);faction.sr19.lastPlayerContact={day:campaign.day||1,kind,target:target.name,success:action.success??null};}}
  if(hostile&&mix.tactical>=30)sr19BehaviorEvent('npc-alert',target.name+' has changed their routines after the party’s '+kind+' approach.',{npc:target.name,kind,nextMove:s.nextMove});
  if(playful&&(mix.trickster>=25||mix.comedy>=25))sr19BehaviorEvent('running-callback',target.name+' remembers the joke and may bring it back at an unexpected moment.',{npc:target.name,callback:s.runningGags[0]||''});
 }
 for(const companion of (campaign.companions||[])){
  if(!companion||typeof companion!=='object')continue;companion.sr19=companion.sr19&&typeof companion.sr19==='object'?companion.sr19:{};
  const likes=companion.sr16?.likes||[],dislikes=companion.sr16?.dislikes||[];
  companion.sr19.lastObservedAction={day:campaign.day||1,kind,text};
  companion.sr19.stance=likes.includes(kind)?'approving':dislikes.includes(kind)?'disapproving':'observing';
  companion.sr19.advice=companion.sr19.stance==='approving'?'encourage the party to build on this approach':companion.sr19.stance==='disapproving'?'raise a concern and suggest another approach':'watch for more evidence before taking a side';
  if(mix.story>=30)companion.sr19.personalStake='This choice matters to '+(companion.name||'the companion')+' because of their goal: '+(companion.sr16?.goal||'protecting the party')+'.';
 }
 world.actionCount=Math.min(99999,(Number(world.actionCount)||0)+1);
 world.recentPatterns.unshift({day:campaign.day||1,kind,text,target:target?.name||'',location:campaign.location||''});world.recentPatterns=world.recentPatterns.slice(0,20);
 return {target:target?.name||'',personality:sr19TopInfluences(mix)[0]||'balanced',npcState:target?.sr19||null};
}
function sr19WorldPulse(world=null,force=false){
 const campaign=state.campaign;if(!campaign)return null;const w=world||sr18EnsureWorld(),b=sr19EnsureBehaviorWorld();if(!w||!b)return null;
 const tick=Number(w.clock?.actionTicks)||0;if(!force&&(tick<1||tick%3!==0||b.lastPulseTick===tick))return null;
 b.lastPulseTick=tick;b.pulses++;
 const mix=sr19Normalize(sr19GetSettings().personalityMix),active=sr19TopInfluences(mix,15);if(!active.length)return null;
 const primary=active[0],secondary=active[1]&&mix[active[1]]>=25?active[1]:null;
 const npcs=campaign.npcs||[],factions=w.factions||[],npc=npcs.slice().sort((x,y)=>(Number(y.grievance)||0)-(Number(x.grievance)||0))[0]||null;
 const faction=factions.slice().sort((x,y)=>((Number(y.pressure)||0)+(Number(y.sr19?.readiness)||0)*0.5)-((Number(x.pressure)||0)+(Number(x.sr19?.readiness)||0)*0.5))[0]||null;
 let text='';
 if(primary==='story'){
  const thread={id:makeId(),day:campaign.day||1,kind:'personal-arc',npc:npc?.name||'',thread:npc?(npc.name+' has a private concern tied to '+(npc.goals?.[0]||'their past')+'.'):'The central campaign thread around '+(campaign.story?.villain||'the growing threat')+' gains another consequence.',status:'developing'};
  b.storyThreads.unshift(thread);b.storyThreads=b.storyThreads.slice(0,12);text=thread.thread+' It is developing, not a forced quest.';
 }else if(primary==='trickster'||primary==='comedy'){
  const old=b.callbacks[0],callback=old?{...old,returns:(Number(old.returns)||0)+1,lastDay:campaign.day||1}:{id:makeId(),motif:primary==='trickster'?'the mysteriously misplaced silver spoon':'the town crier’s overly dramatic announcement',returns:0,createdDay:campaign.day||1,lastDay:campaign.day||1};
  b.callbacks.unshift(callback);b.callbacks=b.callbacks.slice(0,10);
  text=callback.returns?'A familiar bit of local nonsense returns: '+callback.motif+'. Its latest appearance is different enough to invite a new joke.':'A harmless oddity enters local gossip: '+callback.motif+'. It may become a running joke if players engage.';
  if(npc){const s=sr19EnsureNPCBehavior(npc);sr19PushUnique(s.runningGags,callback.motif,6);s.banter=sr19Clamp(s.banter+1,0,100);}
 }else if(primary==='tactical'){
  if(faction){faction.sr19=faction.sr19&&typeof faction.sr19==='object'?faction.sr19:{};faction.sr19.readiness=sr19Clamp((Number(faction.sr19.readiness)||0)+1,0,6);faction.sr19.posture=faction.pressure>=4?'active patrols and contingency plans':'quiet scouting and information gathering';faction.sr19.lastMove=faction.name+' adjusts its posture in '+(campaign.region||'the region')+' after observing recent activity.';text=faction.sr19.lastMove;}
  else text='A rival group begins quietly scouting the party’s likely routes.';
 }else if(primary==='mystery'){
  const lead={id:makeId(),day:campaign.day||1,region:campaign.region||'',location:campaign.location||'',source:faction?.name||'an unknown source',question:'Who benefits if '+(campaign.story?.relic||'the missing object')+' is never found?',status:'unresolved',knownBy:[]};
  b.leads.unshift(lead);b.leads=b.leads.slice(0,12);if(w.rumors)w.rumors.unshift({day:campaign.day||1,text:'A new question circulates: '+lead.question,source:lead.source,leadId:lead.id});text='A new rumor leaves a fair, investigable question: '+lead.question;
 }else if(primary==='merciless'){
  if(faction){faction.sr19=faction.sr19&&typeof faction.sr19==='object'?faction.sr19:{};faction.sr19.unresolvedGrievances=sr19Clamp((faction.sr19.unresolvedGrievances||0)+1,0,6);faction.sr19.pendingMove=faction.pressure>=4?'prepare a visible show of force':'quietly recruit allies and gather leverage';text=faction.name+' is less willing to let recent tensions fade and begins to '+faction.sr19.pendingMove+'.';}
  else text='A consequence that was postponed begins to move toward the party.';
 }else if(primary==='explorer'){
  const lead={id:makeId(),day:campaign.day||1,region:campaign.region||'',near:campaign.location||'',description:'A little-known route or landmark near '+(campaign.location||campaign.region||'the current region')+' may reveal something about the surrounding land.',status:'unexplored'};
  b.discoveryLeads.unshift(lead);b.discoveryLeads=b.discoveryLeads.slice(0,12);if(w.rumors)w.rumors.unshift({day:campaign.day||1,text:lead.description,source:'traveler’s account',leadId:lead.id});text='A traveler’s account points to an optional discovery: '+lead.description;
 }else if(primary==='horror'){
  const omen={id:makeId(),day:campaign.day||1,location:campaign.location||'',description:pick(['Several locals independently mention hearing their name spoken from an empty room.','A familiar road seems subtly different, though nobody agrees on what changed.','A household keeps a place set for someone no one remembers.']),status:'unresolved'};
  b.omens.unshift(omen);b.omens=b.omens.slice(0,10);if(npc){const s=sr19EnsureNPCBehavior(npc);s.unease=sr19Clamp(s.unease+2,0,100);}text='An unsettling local omen enters the world: '+omen.description;
 }
 if(!text)return null;
 const influence=secondary?SR19_LABELS[primary]+' leads; '+SR19_LABELS[secondary]+' colors the response.':SR19_LABELS[primary]+' leads the response.';
 const event=sr19BehaviorEvent(primary,text,{pulse:b.pulses,primary,secondary:secondary||'',influence});
 b.lastPulse={tick,day:campaign.day||1,primary,secondary:secondary||'',eventId:event?.id||''};
 return {primary,secondary,event,text};
}
function sr19NPCResponseBeat(npc){
 const s=sr19EnsureNPCBehavior(npc);if(!s)return '';const candidates=[];
 if(s.runningGags.length&&s.banter>=2)candidates.push('A familiar joke is beginning to stick with '+npc.name+'; they may return it at the right moment.');
 if(s.knownTactics.length&&s.alertness>=2)candidates.push(npc.name+' has adapted to the party’s earlier approach: '+s.knownTactics[0]);
 if(s.openQuestions.length)candidates.push(npc.name+' is weighing an unresolved question: '+s.openQuestions[0]);
 if(s.retaliationReadiness>=2)candidates.push(npc.name+' is considering how to protect themselves or answer the party’s hostility.');
 if(s.personalLeads.length&&s.curiosity>=2)candidates.push(npc.name+' may share a lead if the party earns their confidence: '+s.personalLeads[0]);
 if(s.unease>=2)candidates.push(npc.name+' has become uneasy and watches for small inconsistencies.');
 if(s.storyBeats.length)candidates.push(npc.name+' remembers a meaningful earlier choice: '+s.storyBeats[0].summary);
 return candidates[0]||'';
}
function sr19BehaviorSnapshot(){
 const c=state.campaign,w=sr18EnsureWorld(),b=sr19EnsureBehaviorWorld();if(!c||!w||!b)return null;
 return {version:b.version,pulses:b.pulses,lastPulse:b.lastPulse||null,
  npcs:(c.npcs||[]).slice(-16).map(n=>({name:n.name,role:n.role,behavior:n.sr19||{},response:sr19NPCResponseBeat(n)})),
  companions:(c.companions||[]).map(p=>({name:p.name,stance:p.sr19?.stance||'observing',advice:p.sr19?.advice||'',personalStake:p.sr19?.personalStake||'',lastObservedAction:p.sr19?.lastObservedAction||null})),
  factions:w.factions.map(f=>({name:f.name,pressure:f.pressure,readiness:f.sr19?.readiness||0,posture:f.sr19?.posture||'',pendingMove:f.sr19?.pendingMove||'',grievance:f.sr19?.unresolvedGrievances||0})),
  storyThreads:b.storyThreads.slice(-6),callbacks:b.callbacks.slice(0,6),openLeads:b.leads.slice(0,8),discoveries:b.discoveryLeads.slice(0,8),omens:b.omens.slice(0,6),recentPatterns:(b.recentPatterns||[]).slice(0,10)};
}
const sr19RecordPlayerActionBase=sr16RecordPlayerAction;
sr16RecordPlayerAction=function(text,options={}){const action=sr19RecordPlayerActionBase(text,options);if(action)sr19ApplyActionBehavior(action);return action;};
const sr19AdvanceWorldBase=sr18AdvanceWorld;
sr18AdvanceWorld=function(reason='action',days=0){const world=sr19AdvanceWorldBase(reason,days);sr19WorldPulse(world,false);return world;};
const sr19ContextBehaviorBase=srAIContext;
srAIContext=function(){
 const x=sr19ContextBehaviorBase(),snapshot=sr19BehaviorSnapshot();if(!snapshot)return x;x.campaign.directorBehavior=snapshot;
 if(x.campaign.reactiveTable){
  const map=new Map(snapshot.npcs.map(n=>[n.name,n]));
  x.campaign.reactiveTable.npcMotives=(x.campaign.reactiveTable.npcMotives||[]).map(n=>({...n,behavior:map.get(n.name)?.behavior||{},plannedResponse:map.get(n.name)?.response||''}));
  x.campaign.reactiveTable.companionOpinions=(x.campaign.reactiveTable.companionOpinions||[]).map(p=>({...p,...(snapshot.companions.find(y=>y.name===p.name)||{})}));
 }
 return x;
};
const sr19DirectiveBehaviorBase=sr19Directive;
sr19Directive=function(a){
 return sr19DirectiveBehaviorBase(a)+'\n\nLIVING NPC & WORLD SIMULATION:\n- Treat each NPC behavior record as persistent state: act on remembered jokes, grudges, questions, tactical preparation, fears, personal leads, and ongoing story beats. Do not reset them between scenes.\n- NPCs and companions form opinions from their own goals and values. Let those opinions change what they volunteer, conceal, attempt, or refuse; show changes through plausible behavior, not narrator-only labels.\n- Factions pursue their stored posture and pending move while the party is elsewhere. Advance plans in proportion to time, pressure, resources, and what a faction could know; do not teleport results into the scene.\n- World leads, discoveries, mysteries, callbacks and omens are optional hooks. Track their status and knowledge; do not resolve them automatically or force players to engage.\n- Keep reactions consistent with prior facts. The procedural engine records state; you may dramatize it but must not invent completion, rewards, rolls, damage, or irreversible state changes.';
};
const sr19OfflineDecisionBehaviorBase=srAIOfflineDecision;
srAIOfflineDecision=function(text,kind='action'){
 const decision=sr19OfflineDecisionBehaviorBase(text,kind);
 if(kind==='action'){const npc=typeof sr16FindNPC==='function'?sr16FindNPC(text):null;const beat=sr19NPCResponseBeat(npc);if(beat)decision.narration=String(decision.narration||'')+' '+beat;}
 return decision;
};
if(globalThis.__SR19_TEST){
 globalThis.__SR19_TEST.behaviorVersion=SR19_BEHAVIOR_VERSION;
 globalThis.__SR19_TEST.ensureBehaviorWorld=sr19EnsureBehaviorWorld;
 globalThis.__SR19_TEST.ensureNPCBehavior=sr19EnsureNPCBehavior;
 globalThis.__SR19_TEST.reactToAction=sr19ApplyActionBehavior;
 globalThis.__SR19_TEST.worldPulse=(force=true)=>sr19WorldPulse(null,force);
 globalThis.__SR19_TEST.responseBeat=sr19NPCResponseBeat;
 globalThis.__SR19_TEST.behaviorSnapshot=sr19BehaviorSnapshot;
}
