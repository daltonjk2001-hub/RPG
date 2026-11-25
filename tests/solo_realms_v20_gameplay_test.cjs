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
