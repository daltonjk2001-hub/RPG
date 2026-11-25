const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','Solo_Realms_V18_Main.html'),'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
if(scripts.length!==1)throw new Error('Expected one self-contained application script');
function el(id=''){
 return {id,innerHTML:'',textContent:'',value:'',checked:false,dataset:{},style:{},attrs:{},files:[],
  classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},remove(){},appendChild(){},
  setAttribute(k,v){this.attrs[k]=String(v)},getAttribute(k){return this.attrs[k]??null},click(){},querySelector(){return null},querySelectorAll(){return []},focus(){}};
}
const app=el('app'),body=el('body'),head=el('head'),toast=el('toast');
const document={title:'',body,head,getElementById(id){return id==='app'?app:id==='toast'?toast:null;},querySelector(){return null;},querySelectorAll(){return [];},createElement(tag){return el(tag);},addEventListener(){}};
const storage=new Map(),session=new Map();
const context={
 console,document,window:{},location:{protocol:'https:',search:'',href:'https://example.invalid/Solo_Realms_V18_Main.html'},
 localStorage:{getItem(k){return storage.has(k)?storage.get(k):null;},setItem(k,v){storage.set(k,String(v));},removeItem(k){storage.delete(k);}},
 sessionStorage:{getItem(k){return session.has(k)?session.get(k):null;},setItem(k,v){session.set(k,String(v));},removeItem(k){session.delete(k);}},
 URLSearchParams,URL,Blob,FileReader:function(){},setTimeout,clearTimeout,Math,Date,JSON,Map,Set,Array,Object,String,Number,Boolean,RegExp,Error,Promise,Intl,
 performance:{now:()=>0},navigator:{onLine:true},crypto:require('node:crypto').webcrypto,AbortController,
 fetch:async()=>{throw Error('Unexpected network request in offline gameplay test')}
};
context.globalThis=context;
vm.runInNewContext(scripts[0],context,{timeout:45000,filename:'Solo_Realms_V20_Gameplay'});
const T=context.__SR20_TEST;
if(!T||T.version!=='20.0.0')throw new Error('V20 gameplay engine was not assembled into the built game');
const results=T.tests(),failed=results.filter(x=>!x.pass);
for(const r of results)console.log((r.pass?'PASS ':'FAIL ')+r.name+(r.detail?' — '+r.detail:''));
console.log('\nRESULT '+(results.length-failed.length)+'/'+results.length+' V20 seven-system gameplay assertions passed');
if(failed.length)process.exitCode=1;

const lifecycle=[];
const extra=(name,pass,detail='')=>lifecycle.push({name,pass:!!pass,detail});
const previousState=T.state;
try{
 T.state={
  character:{name:'Lifecycle Tester',classId:'Wizard',level:1,stats:{STR:10,DEX:10,CON:10,INT:14,WIS:10,CHA:10},proficiencies:[],inventory:[]},
  campaign:{day:1,region:'Test Reach',location:'Beacon Hill',npcs:[],companions:[],sideQuests:[],mainQuest:{title:'Restore the beacon',goal:'Repair the beacon at the ruined tower',progress:0,target:2}},
  log:[],combat:null,view:'adventure'
 };
 const campaign=T.ensure(),objective=campaign.objectives.find(x=>x.type==='main');
 const first=T.resolve('I repair the beacon with the spare iron gear',{mode:'campaign',roll:20,dc:5});
 extra('Multi-step objective records first progress without prematurely awarding legacy',first.success&&objective.progress===1&&objective.status==='active'&&campaign.legacy.completedObjectives===0&&campaign.legacy.renown===0);
 const second=T.resolve('I repair the beacon from the opposite side with the spare gear',{mode:'campaign',roll:20,dc:5});
 extra('Final objective progress completes the quest and awards legacy once',second.success&&objective.progress===2&&objective.status==='completed'&&objective.legacyAwarded===true&&campaign.legacy.completedObjectives===1&&campaign.legacy.renown===10);
 T.resolve('I repair the beacon with the spare iron gear',{mode:'campaign',roll:20,dc:5});
 extra('Repeating a completed objective cannot duplicate its renown or milestone',campaign.legacy.completedObjectives===1&&campaign.legacy.renown===10&&campaign.legacy.milestones.length===1);
 const beforeRest={renown:campaign.legacy.renown,completed:campaign.legacy.completedObjectives,momentum:campaign.momentum,progress:objective.progress};
 const rest=T.resolve('We make camp and rest for the night',{mode:'auto',roll:20});
 extra('A no-roll long rest advances no objective or legacy progression',rest.noRoll&&campaign.legacy.renown===beforeRest.renown&&campaign.legacy.completedObjectives===beforeRest.completed&&campaign.momentum===beforeRest.momentum&&objective.progress===beforeRest.progress);
 T.state={character:{name:'Returning Hero',level:3,stats:{INT:12},inventory:[]},campaign:{day:12,sr20:{version:'20.0.0',customMigrationField:{keep:true}}},log:[],combat:null};
 const migrated=T.ensure();
 extra('Older partial V20 saves hydrate missing archive, legacy and onboarding defaults',Array.isArray(migrated.archive)&&Array.isArray(migrated.objectives)&&Array.isArray(migrated.records)&&migrated.legacy.renown===0&&migrated.legacy.completedObjectives===0&&Array.isArray(migrated.legacy.titles)&&migrated.onboarding.completed===false&&migrated.customMigrationField.keep===true);
}catch(error){
 extra('V20 lifecycle regression checks execute without runtime errors',false,String(error?.stack||error));
}finally{
 T.state=previousState;
}
for(const r of lifecycle)console.log((r.pass?'PASS ':'FAIL ')+r.name+(r.detail?' — '+r.detail:''));
console.log('\\nRESULT '+lifecycle.filter(x=>x.pass).length+'/'+lifecycle.length+' V20 lifecycle assertions passed');
if(lifecycle.some(x=>!x.pass))process.exitCode=1;
