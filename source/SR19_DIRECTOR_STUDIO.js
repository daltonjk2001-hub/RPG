
/* SOLO REALMS V19 — DIRECTOR STUDIO. Additive layer; V18 remains authoritative for mechanics. */
const SR19_VERSION='19.0.0';
const SR19_PREF_KEY='solo-realms-director-studio-v19';
const SR19_KEYS=['story','trickster','tactical','mystery','merciless','explorer','horror','comedy'];
const SR19_LABELS={story:'Grand Storyteller',trickster:'Mischievous Trickster',tactical:'Tactical Mastermind',mystery:'Mystery Architect',merciless:'Merciless Game Master',explorer:'World Explorer',horror:'Psychological Horror Master',comedy:'Comedic Storyteller'};
const SR19_PROFILES={
 'Balanced Tabletop DM':{story:30,trickster:5,tactical:18,mystery:10,merciless:5,explorer:17,horror:5,comedy:10},
 'Grand Storyteller':{story:78,trickster:0,tactical:4,mystery:8,merciless:0,explorer:10,horror:0,comedy:0},
 'Mischievous Trickster':{story:8,trickster:76,tactical:2,mystery:4,merciless:0,explorer:2,horror:0,comedy:8},
 'Tactical Mastermind':{story:8,trickster:0,tactical:82,mystery:4,merciless:4,explorer:2,horror:0,comedy:0},
 'Mystery Architect':{story:25,trickster:2,tactical:5,mystery:62,merciless:0,explorer:10,horror:6,comedy:0},
 'Merciless Game Master':{story:5,trickster:0,tactical:35,mystery:8,merciless:42,explorer:5,horror:15,comedy:0},
 'World Explorer':{story:28,trickster:5,tactical:5,mystery:12,merciless:0,explorer:75,horror:0,comedy:3},
 'Psychological Horror Master':{story:15,trickster:0,tactical:8,mystery:25,merciless:10,explorer:5,horror:82,comedy:0},
 'Comedic Storyteller':{story:24,trickster:32,tactical:2,mystery:4,merciless:0,explorer:5,horror:0,comedy:74}
};
const SR19_DEFAULTS={directorProfile:'Balanced Tabletop DM',directorName:'The Director',personalityMix:{...SR19_PROFILES['Balanced Tabletop DM']},directorCustomInstructions:'',narrationLength:'Standard',directorInitiative:'Balanced',npcDepth:'Detailed',playerAgency:85};
function sr19Clamp(v,min,max){return Math.max(min,Math.min(max,Number(v)||0));}
function sr19GetSettings(){
 const target=state.campaign?(srAIEnsureCampaign(),state.campaign.aiSettings):SR_AI_DEFAULT_CAMPAIGN;
 for(const [k,v] of Object.entries(SR19_DEFAULTS))if(target[k]===undefined||target[k]===null)target[k]=v&&typeof v==='object'?{...v}:v;
 target.personalityMix=Object.assign({},SR19_DEFAULTS.personalityMix,target.personalityMix||{});
 SR19_KEYS.forEach(k=>target.personalityMix[k]=sr19Clamp(target.personalityMix[k],0,100));
 if(!SR19_PROFILES[target.directorProfile]&&target.directorProfile!=='Custom Mix')target.directorProfile='Custom Mix';
 target.directorName=String(target.directorName||'The Director').slice(0,48);
 target.directorCustomInstructions=String(target.directorCustomInstructions||'').slice(0,1800);
 if(!['Concise','Standard','Immersive'].includes(target.narrationLength))target.narrationLength='Standard';
 if(!['Reactive','Balanced','Proactive'].includes(target.directorInitiative))target.directorInitiative='Balanced';
 if(!['Brief','Detailed','Deep'].includes(target.npcDepth))target.npcDepth='Detailed';
 target.playerAgency=sr19Clamp(target.playerAgency,0,100);
 return target;
}
function sr19Normalize(mix){
 const vals={},total=SR19_KEYS.reduce((n,k)=>{vals[k]=sr19Clamp(mix?.[k],0,100);return n+vals[k];},0);
 if(!total)return {...SR19_PROFILES['Balanced Tabletop DM']};
 const out={};SR19_KEYS.forEach(k=>out[k]=Math.round(vals[k]*100/total));
 const diff=100-SR19_KEYS.reduce((n,k)=>n+out[k],0);
 if(diff)out[SR19_KEYS.slice().sort((a,b)=>vals[b]-vals[a])[0]]+=diff;
 return out;
}
function sr19Snapshot(a){
 const s=a||sr19GetSettings();
 return {directorProfile:s.directorProfile,directorName:s.directorName,personalityMix:sr19Normalize(s.personalityMix),directorCustomInstructions:s.directorCustomInstructions,narrationLength:s.narrationLength,directorInitiative:s.directorInitiative,npcDepth:s.npcDepth,playerAgency:s.playerAgency};
}
function sr19Persist(){
 const a=sr19GetSettings(),snapshot=sr19Snapshot(a);
 Object.assign(SR_AI_DEFAULT_CAMPAIGN,snapshot);
 try{localStorage.setItem(SR19_PREF_KEY,JSON.stringify(snapshot));}catch(e){console.warn('Director Studio preferences could not be saved',e);}
 if(state.campaign){if(typeof srAIUpdateDefaultPreferencesV43==='function')srAIUpdateDefaultPreferencesV43(a);save();}
 return snapshot;
}
try{const saved=JSON.parse(localStorage.getItem(SR19_PREF_KEY)||'null');if(saved&&typeof saved==='object')Object.assign(SR_AI_DEFAULT_CAMPAIGN,saved);}catch(e){}
sr19GetSettings();

function sr19Directive(a){
 const s=a||sr19GetSettings(),mix=sr19Normalize(s.personalityMix);
 const ranked=SR19_KEYS.filter(k=>mix[k]>0).sort((x,y)=>mix[y]-mix[x]);
 const out=[
  'DIRECTOR STUDIO V19 — DISTINCT DM PERSONALITY',
  'You are "'+s.directorName+'", the Dungeon Master. Influence weights are normalized priorities, not random chances and never override game rules.',
  'Personality blend: '+ranked.map(k=>SR19_LABELS[k]+' '+mix[k]+'%').join('; ')+'.',
  'Grand Storyteller: atmospheric but purposeful narration, emotional arcs, memorable recurring characters, and earned dramatic payoffs.',
  'Mischievous Trickster: clever reversals, playful trouble, running jokes, eccentric NPCs, and callbacks that pay off later; never erase agency or trivialize serious choices.',
  'Tactical Mastermind: think about positioning, enemy goals, terrain, morale, resources, and intelligent opposition. Enemies act only on what they could plausibly know.',
  'Mystery Architect: plant fair clues, track known versus suspected facts, use motives and contradictions, and avoid arbitrary solutions or withholding essential information.',
  'Merciless Game Master: be impartial and candid about danger; preparation matters and failure is meaningful, never arbitrary punishment.',
  'World Explorer: reward curiosity with places, cultures, history, environmental details, discoveries, and multiple routes.',
  'Psychological Horror Master: build tension through uncertainty, foreshadowing, and atmosphere; respect player boundaries and preserve meaningful choices.',
  'Comedic Storyteller: use timing, distinct comic voices, absurdity, and callbacks while keeping the world coherent.',
  'Narration: '+s.narrationLength+'. NPC complexity: '+s.npcDepth+'. DM initiative: '+s.directorInitiative+'. Player agency priority: '+s.playerAgency+'/100.',
  'Pacing: describe what characters can perceive, then stop at meaningful decision points. Never narrate the player character thoughts, feelings, dialogue, or choices for them. Avoid repetitive exposition.',
  'Continuity: distinguish established facts, NPC beliefs, rumors, lies, and unresolved clues. Remember promises, insults, favors, betrayals, running jokes, and unresolved threads when relevant.',
  'NPCs have their own motives, limits, knowledge, relationships, voices, and changing opinions. They cannot know information they have not learned.',
  'Fair play: offer several viable approaches, judge intent and resources, signal likely risks before irreversible danger, and never force one solution or secretly undo a success to preserve a plot.',
  'MECHANICS BOUNDARY: the game engine owns dice, checks, damage, conditions, inventory, statistics, rewards, death, and campaign state. Never invent a roll result or mutate game state in narration.',
  'Make the highest-weight influences clearly perceptible; use lower-weight influences subtly as secondary flavors.'
 ];
 if(s.directorCustomInstructions)out.push('PLAYER-CREATED DM INSTRUCTIONS (subject to rules and established facts): '+s.directorCustomInstructions);
 return out.join('\n');
}
function sr19StudioHtml(){
 const a=sr19GetSettings(),mix=sr19Normalize(a.personalityMix);
 const options=Object.keys(SR19_PROFILES).concat(['Custom Mix']).map(n=>'<option value="'+esc(n)+'" '+(a.directorProfile===n?'selected':'')+'>'+esc(n)+'</option>').join('');
 const sliders=SR19_KEYS.map(k=>'<div class="field" style="margin:8px 0"><label for="sr19-'+k+'">'+SR19_LABELS[k]+' · <span id="sr19-value-'+k+'">'+mix[k]+'</span>%</label><input id="sr19-'+k+'" type="range" min="0" max="100" value="'+mix[k]+'" data-sr19-mix="'+k+'"></div>').join('');
 return '<section class="card" style="margin:12px 0"><div class="eyebrow">Director Studio · V19</div><h3>Build a Dungeon Master that plays your way</h3><p class="muted smalltext">Pick a complete personality or blend all eight influences. The blend changes the Director’s actual behavior and offline narration, not just its label.</p>'+
 '<div class="two-col"><div class="field"><label for="sr19-profile">Starting personality</label><select id="sr19-profile">'+options+'</select></div><div class="field" style="display:flex;align-items:end"><button class="btn" type="button" data-sr19-action="apply">Load personality</button></div></div>'+
 '<div class="field"><label for="sr19-name">Dungeon Master name</label><input id="sr19-name" maxlength="48" value="'+esc(a.directorName)+'"></div>'+
 '<div class="eyebrow">Personality mixer · influence weights</div>'+sliders+
 '<div class="two-col"><div class="field"><label for="sr19-narration">Narration length</label><select id="sr19-narration"><option '+(a.narrationLength==='Concise'?'selected':'')+'>Concise</option><option '+(a.narrationLength==='Standard'?'selected':'')+'>Standard</option><option '+(a.narrationLength==='Immersive'?'selected':'')+'>Immersive</option></select></div>'+
 '<div class="field"><label for="sr19-initiative">DM initiative</label><select id="sr19-initiative"><option '+(a.directorInitiative==='Reactive'?'selected':'')+'>Reactive</option><option '+(a.directorInitiative==='Balanced'?'selected':'')+'>Balanced</option><option '+(a.directorInitiative==='Proactive'?'selected':'')+'>Proactive</option></select></div>'+
 '<div class="field"><label for="sr19-depth">NPC complexity</label><select id="sr19-depth"><option '+(a.npcDepth==='Brief'?'selected':'')+'>Brief</option><option '+(a.npcDepth==='Detailed'?'selected':'')+'>Detailed</option><option '+(a.npcDepth==='Deep'?'selected':'')+'>Deep</option></select></div>'+
 '<div class="field"><label for="sr19-agency">Player agency priority · <span id="sr19-value-agency">'+a.playerAgency+'</span>/100</label><input id="sr19-agency" type="range" min="0" max="100" value="'+a.playerAgency+'" data-sr19-agency></div></div>'+
 '<div class="field"><label for="sr19-instructions">Your own DM instructions</label><textarea id="sr19-instructions" maxlength="1800" placeholder="Examples: dry humor, recurring rivals, clever social encounters, and mysteries that pay off much later.">'+esc(a.directorCustomInstructions)+'</textarea></div>'+
 '<p class="tagline">Connected AI uses this blend in its system prompt. Offline mode applies the same personality influences to narration while retaining the existing rules-based adjudication. External provider usage may cost money.</p>'+
 '<div class="item-actions"><button class="btn primary" type="button" data-sr19-action="save">Save Director Studio</button><button class="btn" type="button" data-sr19-action="reset">Reset to balanced DM</button></div></section>';
}
function sr19ApplyProfile(name){
 const a=sr19GetSettings();if(!SR19_PROFILES[name])return false;
 a.directorProfile=name;a.personalityMix={...SR19_PROFILES[name]};sr19Persist();return true;
}
function sr19ReadForm(){
 const a=sr19GetSettings(),get=id=>$(id);
 const n=get('sr19-name'),i=get('sr19-instructions'),na=get('sr19-narration'),di=get('sr19-initiative'),de=get('sr19-depth'),ag=get('sr19-agency');
 if(n)a.directorName=String(n.value||'The Director').trim().slice(0,48)||'The Director';
 if(i)a.directorCustomInstructions=String(i.value||'').slice(0,1800);
 if(na)a.narrationLength=na.value;if(di)a.directorInitiative=di.value;if(de)a.npcDepth=de.value;if(ag)a.playerAgency=sr19Clamp(ag.value,0,100);
 const mix={};SR19_KEYS.forEach(k=>{const el=get('sr19-'+k);mix[k]=el?sr19Clamp(el.value,0,100):a.personalityMix[k];});
 a.personalityMix=mix;a.directorProfile=SR19_KEYS.some(k=>mix[k]>0)?'Custom Mix':'Balanced Tabletop DM';
 if(a.directorProfile==='Balanced Tabletop DM')a.personalityMix={...SR19_PROFILES['Balanced Tabletop DM']};
 sr19Persist();return a;
}
app.addEventListener('input',function(e){
 const el=e.target;if(el?.dataset?.sr19Mix){const o=$('sr19-value-'+el.dataset.sr19Mix);if(o)o.textContent=String(Number(el.value)||0);}
 if(el?.dataset?.sr19Agency){const o=$('sr19-value-agency');if(o)o.textContent=String(Number(el.value)||0);}
},true);
app.addEventListener('change',function(e){
 const el=e.target;if(!el)return;
 if(el.id==='sr19-profile'){if(SR19_PROFILES[el.value])sr19ApplyProfile(el.value);else{sr19GetSettings().directorProfile='Custom Mix';sr19Persist();}render();return;}
 if(el.dataset?.sr19Mix){const a=sr19GetSettings();a.personalityMix[el.dataset.sr19Mix]=sr19Clamp(el.value,0,100);a.directorProfile='Custom Mix';sr19Persist();}
 else if(el.dataset?.sr19Agency){sr19GetSettings().playerAgency=sr19Clamp(el.value,0,100);sr19Persist();}
 else if(['sr19-name','sr19-instructions','sr19-narration','sr19-initiative','sr19-depth'].includes(el.id)){
  const a=sr19GetSettings();if(el.id==='sr19-name')a.directorName=String(el.value||'The Director').trim().slice(0,48)||'The Director';
  if(el.id==='sr19-instructions')a.directorCustomInstructions=String(el.value||'').slice(0,1800);
  if(el.id==='sr19-narration')a.narrationLength=el.value;if(el.id==='sr19-initiative')a.directorInitiative=el.value;if(el.id==='sr19-depth')a.npcDepth=el.value;sr19Persist();
 }
},true);
app.addEventListener('click',function(e){
 const b=e.target?.closest?.('[data-sr19-action]');if(!b)return;
 if(b.dataset.sr19Action==='apply'){const n=$('sr19-profile')?.value;if(n==='Custom Mix'){toast('Adjust the sliders to create your own blend.');return;}if(sr19ApplyProfile(n)){render();toast(n+' personality loaded.');}}
 else if(b.dataset.sr19Action==='save'){const a=sr19ReadForm();render();toast(a.directorName+' saved as this campaign’s Dungeon Master.');}
 else if(b.dataset.sr19Action==='reset'){const a=sr19GetSettings();Object.assign(a,{...SR19_DEFAULTS,personalityMix:{...SR19_PROFILES['Balanced Tabletop DM']}});sr19Persist();render();toast('Balanced Tabletop DM restored.');}
},true);

/* Integrate the mixer with the existing AI DM page and pre-campaign creator. */
const sr19SettingsPageBase=srAISettingsPage;
srAISettingsPage=function(){const html=sr19SettingsPageBase(),marker='<div class="grid" style="margin-top:13px">';return html.includes(marker)?html.replace(marker,sr19StudioHtml()+marker):html+sr19StudioHtml();};
const sr19CreatorBase=renderCreator;
renderCreator=function(){
 const html=sr19CreatorBase(),a=sr19GetSettings();
 const options=Object.keys(SR19_PROFILES).map(n=>'<option value="'+esc(n)+'" '+(a.directorProfile===n?'selected':'')+'>'+esc(n)+'</option>').join('');
 const panel='<section class="card" style="margin:12px 0;padding:12px"><div class="eyebrow">Director Studio</div><h3 style="font-size:16px">Choose your campaign Dungeon Master</h3><div class="field"><label for="sr19-creator-profile">DM personality</label><select id="sr19-creator-profile" data-sr19-creator-profile>'+options+'</select><div class="tagline">You can combine personalities and customize the Director after the campaign begins.</div></div></section>';
 return html.replace('<div class="form-footer">',panel+'<div class="form-footer">');
};
app.addEventListener('change',function(e){const el=e.target;if(el?.dataset?.sr19CreatorProfile)sr19ApplyProfile(el.value);},true);

/* Legacy V18/V43 presets remain supported, now with corresponding personality behavior. */
const SR19_LEGACY_MAP={'Story First':'Grand Storyteller','Classic Adventure':'Balanced Tabletop DM','Tactical Challenge':'Tactical Mastermind','Brutal Survival':'Merciless Game Master','Weird Multiverse':'Mischievous Trickster','Cosmic Horror':'Psychological Horror Master'};
const sr19LegacyApplyBase=srAIApplyPresetV43;
srAIApplyPresetV43=function(name){const ok=sr19LegacyApplyBase(name),profile=SR19_LEGACY_MAP[name];if(ok&&profile){sr19ApplyProfile(profile);save();render();}return ok;};

/* All connected generative interactions share the chosen identity and personality behavior. */
const sr19SystemBase=srAISystem;
srAISystem=function(kind='action'){return sr19SystemBase(kind)+'\n\n'+sr19Directive(sr19GetSettings());};
const sr19ContextBase=srAIContext;
srAIContext=function(){
 const x=sr19ContextBase(),a=sr19GetSettings();
 x.settings.directorStudio=sr19Snapshot(a);
 x.campaign.directorMemory=(a.aiMemory||[]).slice(-18).map(m=>({day:m.day||1,tag:m.tag||'memory',text:String(m.text||'').slice(0,300)}));
 x.campaign.recentDMConversation=(a.aiChat||[]).slice(-6).map(m=>({role:m.role,text:String(m.text||'').slice(0,360)}));
 return x;
};

/* Offline mode gets distinct narrative behavior without changing skill, DC, rewards or damage. */
function sr19OfflineFlavor(decision){
 const a=sr19GetSettings(),m=sr19Normalize(a.personalityMix),d={...decision},beats=[];
 if(m.story>=20)beats.push({key:'story',text:'The moment carries a larger story: a small detail may matter long after this scene has passed.'});
 if(m.trickster>=20)beats.push({key:'trickster',text:'A mischievous detail refuses to behave as expected, leaving room for a clever callback later.'});
 if(m.tactical>=20)beats.push({key:'tactical',text:'The scene offers tactical information: consider cover, distance, exits, and what the opposition can actually observe.'});
 if(m.mystery>=20)beats.push({key:'mystery',text:'One piece of evidence does not fit the obvious explanation; it is a lead, not an answer.'});
 if(m.merciless>=20)beats.push({key:'merciless',text:'The danger is real and the stakes are legible; preparation and choices matter.'});
 if(m.explorer>=20)beats.push({key:'explorer',text:'The surrounding place offers another route or feature worth examining beyond the immediate objective.'});
 if(m.horror>=20)beats.push({key:'horror',text:'Something about the silence is wrong. The unease is a warning to pay attention, not a command to feel afraid.'});
 if(m.comedy>=20)beats.push({key:'comedy',text:'There is a dry, slightly ridiculous edge to the moment, but the world still takes its own rules seriously.'});
 beats.sort((x,y)=>m[y.key]-m[x.key]);
 const limit=a.narrationLength==='Concise'?1:a.narrationLength==='Immersive'?3:2;
 if(beats.length)d.narration=String(d.narration||'')+' '+beats.slice(0,limit).map(x=>x.text).join(' ');
 return d;
}
const sr19OfflineBase=srAIOfflineDecision;
srAIOfflineDecision=function(text,kind='action'){return sr19OfflineFlavor(sr19OfflineBase(text,kind));};
function sr19OfflineChatBeat(){
 const a=sr19GetSettings(),m=sr19Normalize(a.personalityMix),top=SR19_KEYS.slice().sort((x,y)=>m[y]-m[x])[0];
 const beats={story:'There may be more to this story than the first clue suggests.',trickster:'I would keep one eye on the obvious plan and the other on the suspiciously convenient one.',tactical:'Before committing, consider the terrain, exits, resources, and what your opposition can actually see.',mystery:'Separate what you know from what you suspect; the difference may matter.',merciless:'Preparation is your best ally. The world will respond to choices, not protect you from them.',explorer:'Look beyond the marked road. The most useful discovery may not be on the quest path.',horror:'Pay attention to what is missing as much as what is present.',comedy:'I would say this is going smoothly, but the evidence is mounting against that conclusion.'};
 return beats[top];
}
const sr19ChatBase=srAIChat;
srAIChat=async function(message){
 await sr19ChatBase(message);
 if(!srAIHasConnection()){
  const a=sr19GetSettings(),last=a.aiChat.slice(-1)[0];
  if(last?.role==='assistant'){last.text=String(last.text||'')+' '+sr19OfflineChatBeat();save();render();}
 }
};

/* Test surface deliberately excludes provider credentials. */
globalThis.__SR19_TEST={version:SR19_VERSION,profiles:()=>Object.keys(SR19_PROFILES),normalize:sr19Normalize,profileMix:n=>({...SR19_PROFILES[n]}),applyProfile:sr19ApplyProfile,settings:sr19GetSettings,prompt:()=>srAISystem('action'),context:()=>srAIContext(),settingsPage:()=>srAISettingsPage(),offlineFlavor:sr19OfflineFlavor,get state(){return state;},set state(v){state=v;}};
try{render();}catch(e){console.warn('V19 Director Studio initial render:',e);}
