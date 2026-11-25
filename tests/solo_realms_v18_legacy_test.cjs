#!/usr/bin/env node
// Dependency-free smoke tests for Solo Realms V10 Living Table Free.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const gamePath=path.join(__dirname,'..','Solo_Realms_V18_Main.html');
if(!fs.existsSync(gamePath))throw new Error(`Game file not found: ${gamePath}`);
let html=fs.readFileSync(gamePath,'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
if(!scripts.length)throw new Error('No inline game script was found.');
let js=scripts.join('\n');
const injected=`\nglobalThis.__freeModeTests={\n  prime:()=>{state={character:{name:'Test Hero',level:1,ancestry:'Human',classId:'Fighter',hp:10,maxHp:10,gold:25,stats:{STR:14,DEX:12,CON:12,INT:10,WIS:10,CHA:10},inventory:[],spells:[],conditions:[],proficiencies:[]},campaign:{day:1,location:'Test Village',region:'The Green March',story:{villain:'The Ash King',threat:'The Withering',motive:'steal the sunstone',relic:'Sunstone'},mainQuest:{title:'Find the Sunstone',description:'Trace the missing relic'},sideQuests:[],companions:[],npcs:[],npcMemories:{},discoveries:[],aiSettings:null}};srAIEnsureCampaign();return true;},\n  isFree:()=>SR8_FREE_MODE===true&&!srAIHasConnection()&&!srAIUsesSecureProxy()&&!srAIKey,\n  providerUI:()=>srAISettingsForm(),\n  aiPage:()=>srAISettingsPage(),\n  makeDecision:(text,kind)=>srAIOfflineDecision(text,kind),\n  chat:(text)=>srAIOfflineChatReply(text),\n  apiCall:()=>srAICall('test','should not connect')\n};\n`;
if(!js.includes('\nload();'))throw new Error('Could not find game boot point.');
js=js.replace('\nload();',`${injected}\nload();`);
const storage=new Map(),session=new Map();
function element(id=''){return {id,innerHTML:'',textContent:'',value:'',checked:false,dataset:{},style:{},attrs:{},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},remove(){},appendChild(){},setAttribute(k,v){this.attrs[k]=String(v)},getAttribute(k){return this.attrs[k]??null},click(){},querySelector(){return null},querySelectorAll(){return []}};}
const app=element('app'),body=element('body'),toast=element('toast');
const document={title:'',body,head:element('head'),getElementById(id){return id==='app'?app:id==='toast'?toast:null},querySelector(){return null},querySelectorAll(){return []},createElement(tag){return element(tag)},addEventListener(){}};
const calls=[];
const context={console,document,window:{},location:{search:'',href:'file:///solo_realms_v7.html'},localStorage:{getItem(k){return storage.has(k)?storage.get(k):null},setItem(k,v){storage.set(k,String(v))},removeItem(k){storage.delete(k)}},sessionStorage:{getItem(k){return session.get(k)||null},setItem(k,v){session.set(k,String(v))},removeItem(k){session.delete(k)}},URLSearchParams,URL,Blob,FileReader:function(){},setTimeout,clearTimeout,Math,Date,JSON,Map,Set,Array,Object,String,Number,Boolean,RegExp,Error,Promise,Intl,performance:{now:()=>0},navigator:{},crypto:require('node:crypto').webcrypto,AbortController,fetch:async(...args)=>{calls.push(args);throw new Error('Network must not be used in free solo play')}};
context.globalThis=context;
(async()=>{
 vm.runInNewContext(js,context,{timeout:15000,filename:'solo_realms_v7.html'});
 const report=context.__SR7_TEST.tests(),free=context.__freeModeTests;
 free.prime();
 const provider=free.providerUI(),page=free.aiPage(),decision=free.makeDecision('sneak past the guard','action');
 const checks=[...report.results.map(x=>({name:x.name,pass:x.pass})),
  {name:'Free mode is active and external AI is disabled',pass:free.isFree()},
  {name:'No API key, endpoint, or provider controls appear in AI settings',pass:!provider.includes('srAIKey')&&!provider.includes('srAIEndpoint')&&!provider.includes('type=\"password\"')&&!provider.includes('OpenAI')},
  {name:'AI settings clearly state offline mode has no subscription or internet requirement',pass:provider.includes('No API key')&&provider.includes('internet connection is required')},
  {name:'AI Director retains difficulty and weirdness controls',pass:page.includes('Difficulty preset')&&page.includes('Chaos / weirdness')&&page.includes('Allow weird character combinations')},
  {name:'Procedural Director returns campaign scene and multiple choices',pass:!!decision.narration&&decision.choices.length>=3&&typeof decision.memory==='string'},
  {name:'Procedural Director provides context-aware DM chat',pass:free.chat('what is my objective').includes('current lead')||free.chat('what is my objective').includes('strongest current lead')},
  {name:'Simulated browser boots and renders the app',pass:app.innerHTML.length>1000},
  {name:'Game makes no network requests during offline boot and local Director generation',pass:calls.length===0}
 ];
 try{await free.apiCall();checks.push({name:'External AI call is blocked',pass:false})}catch(e){checks.push({name:'External AI call is blocked',pass:String(e.message).includes('disabled')})}
 const passed=checks.filter(x=>x.pass).length;
 for(const c of checks)console.log(`${c.pass?'PASS':'FAIL'} ${c.name}`);
 console.log(`\nRESULT ${passed}/${checks.length} checks passed · V10 Living Table Free (V7 progression regression)`);
 if(passed!==checks.length)process.exitCode=1;
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
