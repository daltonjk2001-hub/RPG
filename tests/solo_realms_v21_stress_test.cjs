#!/usr/bin/env node
// Long-session/campaign stress simulation for Solo Realms V21.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','Solo_Realms_V18_Main.html'),'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
if(scripts.length!==1)throw Error('Expected one self-contained runtime');
function el(id=''){return {id,innerHTML:'',textContent:'',value:'',dataset:{},style:{},attrs:{},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},remove(){},appendChild(){},setAttribute(k,v){this.attrs[k]=String(v)},getAttribute(k){return this.attrs[k]??null},click(){},querySelector(){return null},querySelectorAll(){return []},focus(){},closest(){return null}}}
const app=el('app'),body=el('body'),head=el('head'),toast=el('toast'),nodes=new Map([['app',app],['toast',toast]]);
const document={title:'',body,head,getElementById(id){return nodes.get(id)||null},querySelector(){return null},querySelectorAll(){return []},createElement(tag){return el(tag)},addEventListener(){}};
const storage=new Map(),session=new Map(),math=Object.create(Math);math.random=()=>.49;
const context={console,document,window:{},location:{protocol:'https:',search:'',href:'https://example.invalid/'},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},sessionStorage:{getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,String(v)),removeItem:k=>session.delete(k)},URLSearchParams,URL,Blob,FileReader:function(){},setTimeout,clearTimeout,Math:math,Date,JSON,Map,Set,Array,Object,String,Number,Boolean,RegExp,Error,Promise,Intl,performance:{now:()=>0},navigator:{onLine:true},crypto:require('node:crypto').webcrypto,AbortController,fetch:async()=>{throw Error('Network disabled')}};
context.globalThis=context;vm.runInNewContext(scripts[0],context,{timeout:90000,filename:'Solo_Realms_V21_Stress'});
const T=context.__SR21_TEST,T18=context.__SR18_TEST,T20=context.__SR20_TEST;if(!T||!T18||!T20)throw Error('V18/V20/V21 test hooks missing');
const checks=[],assert=(n,p,d='')=>checks.push({name:n,pass:!!p,detail:String(d||'')});
const hero={name:'Stress Runner',classId:'Ranger',ancestry:'Human',level:10,classLevels:{Ranger:10},hp:45,maxHp:45,xp:0,gold:80,stats:{STR:12,DEX:16,CON:14,INT:12,WIS:16,CHA:10},proficiencies:['Survival','Perception','Stealth','Investigation','Persuasion'],expertise:['Survival'],inventory:[{name:'Rations',type:'supply',count:5},{name:'Waterskin',type:'supply',count:5}],spells:[],conditions:[],activeEffects:[]};
T.state={character:hero,campaign:{day:1,chapter:1,region:'North March',location:'Old Road',title:'North March Campaign',npcs:[{name:'Town Guard',faction:'Town Watch'}],companions:[],sideQuests:[],mainQuest:{title:'Uncover the old causeway',goal:'Investigate the old causeway and hidden markers',progress:0,target:2}},log:[],combat:null,view:'adventure'};
T.ensure();T20.ensure();
try{
 const g=T.state.campaign.sr20,startDay=Number(T.state.campaign.day)||1,actions=g.clock.actions,watch=g.clock.watch;
 for(let i=0;i<1200;i++){
  const n=i,roll=i%20+1;
  if(i%4===0)T.resolve('I investigate the broken trail marker '+n+' and record its unusual carving',{mode:'exploration',skill:'Investigation',roll,dc:15});
  else if(i%4===1)T.resolve('I negotiate a patrol route with Town Guard '+n,{mode:'social',target:'Town Guard',skill:'Persuasion',roll,dc:15});
  else if(i%4===2)T.resolve('I compose a field journal entry about the quiet valley '+n,{mode:'campaign',skill:'History',roll,dc:15});
  else T.resolve('I take cover behind the fallen stone marker '+n,{mode:'tactical',skill:'Athletics',roll,dc:15});
 }
 assert('1,200 mixed player actions run without crashing',g.clock.actions===actions+1200);
 assert('Action/lead/consequence/log buffers stay bounded',g.records.length<=40&&g.leads.length<=20&&g.consequences.length<=16&&T.state.log.length<=300,JSON.stringify([g.records.length,g.leads.length,g.consequences.length,T.state.log.length]));
 assert('NPC/faction reputation stays bounded',Math.abs(T.state.campaign.npcs[0].sr20.relationship)<=10&&Math.abs(T.state.campaign.sr21.reputation['Town Watch'])<=20);
 assert('Mixed-action clocks and fatigue remain finite',Number.isFinite(g.clock.actions)&&Number.isFinite(g.clock.watch)&&g.survival.fatigue>=0&&g.survival.fatigue<=6);
 const startTravel=g.clock.watch,startShort=g.survival.foodShortages,startExposure=g.survival.exposure;
 for(let i=0;i<200;i++)T.resolve('We travel along the exposed North March road',{mode:'travel',durationWatches:1,skill:'Survival',roll:15,dc:12});
 assert('200 travel watches advance exactly 200 watches',g.clock.watch===startTravel+200);
 assert('Travel uses provisions then counts shortages',g.survival.foodShortages===startShort+195&&g.survival.waterShortages===startShort+195);
 assert('Travel exposure increases 200 times',g.survival.exposure===startExposure+200);
 assert('Fatigue caps at six in prolonged supply failure',g.survival.fatigue===6);
 for(let i=0;i<8;i++)T.resolve('We make camp and sleep for the night',{mode:'survival'});
 assert('Eight rests recover fatigue without underflow',g.survival.fatigue===0);
 assert('Eight-hour rests advance two watches each',g.clock.watch===startTravel+216);
 assert('Rest preserves shortages without generating unbounded momentum',g.survival.foodShortages>=195&&Number.isFinite(g.momentum));
 const snapshot=T18.snapshot('Endurance run'),json=JSON.stringify(snapshot),valid=T18.validateSave(JSON.parse(json).state);
 assert('Endurance campaign exports as portable JSON',json.length>1000&&json.length<12000000);
 assert('Save Center validates the endurance snapshot',!!valid.ok&&valid.state.character.name==='Stress Runner');
 assert('Snapshot retains V20, V21 and world state',!!valid.state.campaign.sr20&&valid.state.campaign.sr21.version==='21.0.0'&&!!valid.state.campaign.sr18);
 assert('Campaign day advances over the journey',Number.isFinite(T.state.campaign.day)&&T.state.campaign.day>=startDay+200);
}catch(e){assert('Long-session simulation completes without an uncaught runtime error',false,e?.stack||String(e))}
for(const c of checks)console.log((c.pass?'PASS ':'FAIL ')+c.name+(c.detail?' — '+c.detail:''));
const passed=checks.filter(x=>x.pass).length;console.log('\\nRESULT '+passed+'/'+checks.length+' V21 long-session stress assertions passed');if(passed!==checks.length)process.exitCode=1;
