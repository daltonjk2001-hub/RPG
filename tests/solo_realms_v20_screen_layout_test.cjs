const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const css=fs.readFileSync(path.join(root,'source','SR20_UI_THEME.css'),'utf8');
const screenLayer=fs.readFileSync(path.join(root,'source','SR20_SCREEN_LAYOUT.js'),'utf8');
const runtime=fs.readFileSync(path.join(root,'source','solo_realms_v18.js'),'utf8');
const main=fs.readFileSync(path.join(root,'Solo_Realms_V18_Main.html'),'utf8');
const pwa=fs.readFileSync(path.join(root,'pwa','index.html'),'utf8');
const docs=fs.readFileSync(path.join(root,'docs','index.html'),'utf8');
const builder=fs.readFileSync(path.join(root,'tools','build_v18.py'),'utf8');
const checks=[];
const ok=(name,pass)=>checks.push({name,pass:!!pass});
const screens=[
  'adventure','combat','character','inventory','journal','spells','world','worldmap',
  'rules','bestiary','crafting','downtime','party','gm','multiplayer','consequences',
  'ai','stronghold','downtime5','codex','tactics','treasure','factions7','exploration7','crafting7'
];
function scripts(html){
  const out=[],lower=html.toLowerCase();
  let cursor=0;
  while(true){
    const start=lower.indexOf('<script',cursor);
    if(start<0)break;
    const openEnd=lower.indexOf('>',start);
    const close=lower.indexOf('</script>',openEnd+1);
    if(openEnd<0||close<0)break;
    out.push(html.slice(openEnd+1,close).trim());
    cursor=close+9;
  }
  return out;
}
const mainScripts=scripts(main),pwaScripts=scripts(pwa),docsScripts=scripts(docs);
const mainScript=mainScripts[0]||'',docsScript=docsScripts[0]||'';

ok('Screen metadata layer is loaded into the assembled runtime',runtime.includes('function sr20ApplyScreenLayout')&&mainScript.includes('function sr20ApplyScreenLayout'));
ok('Screen metadata is applied after the V20 gameplay layer wraps the renderer',runtime.indexOf('function sr20GameplayPanel')>=0&&runtime.indexOf('const sr20ScreenRenderBase=render')>runtime.indexOf('function sr20GameplayPanel'));
ok('Active combat overrides the selected Adventure tab for screen styling',screenLayer.includes("state.combat?'combat':String(state.view||'adventure')"));
ok('Rendered main view receives a stable screen key and layout version',screenLayer.includes('main.dataset.screen=')&&screenLayer.includes("main.dataset.layoutVersion='20'"));
ok('The build requires and appends the screen-aware source layer',builder.includes('SCREEN_LAYOUT = ROOT / "source" / "SR20_SCREEN_LAYOUT.js"')&&builder.includes('screen_layout = SCREEN_LAYOUT.read_text')&&builder.includes('+ screen_layout +'));
for(const view of screens) ok('A dedicated screen selector exists for '+view,css.includes('.main[data-screen="'+view+'"]'));
ok('Adventure styles the current SR8 story, action, choice and objective components',['.sr8-scene','.sr8-action-card','.sr8-action-form','.sr8-quest','.sr8-extras'].every(x=>css.includes(x)));
ok('Character styles ability scores, skill groups and the hero profile',['.ability-grid','.skill-list','.hero-card'].every(x=>css.includes(x)));
ok('Combat styles the actual tactical grid, enemy cards and action controls',['.sr9-grid','.simple-enemies','.simple-enemy','.simple-combat-controls','.simple-chronicle'].every(x=>css.includes(x)));
ok('World and Atlas styles location cards and map grids',['.map-grid','.location-card'].every(x=>css.includes(x)));
ok('Rules and reference pages use a dedicated rule-card grid',css.includes('.main[data-screen="rules"] .rule-grid')&&css.includes('.main[data-screen="codex"] .rule-grid'));
ok('Crafting and GM tools use dedicated recipe and tool grids',css.includes('.main[data-screen="crafting"] .shop-grid')&&css.includes('.main[data-screen="gm"] .shop-grid'));
ok('Director settings use a two-column settings and memory layout',css.includes('.main[data-screen="ai"] > .grid')&&css.includes('.main[data-screen="ai"] .toggle-row'));
ok('Phone breakpoints reflow screen layouts to one column',css.includes('@media (max-width: 760px)')&&css.includes('.main[data-screen="spells"]')&&css.includes('grid-template-columns: minmax(0, 1fr)'));
ok('Tablet breakpoints retain a controlled two-column layout',css.includes('@media (min-width: 761px) and (max-width: 1040px)'));
ok('Standalone runtime and PWA runtime include identical screen metadata logic',!!mainScript&&pwaScripts[0]===mainScript);
ok('Pages entry point includes the same screen metadata logic',!!docsScript&&docsScript===mainScript);
ok('Screen styling is local and keeps the game offline-first',!css.includes('@import')&&!css.includes('http://')&&!css.includes('https://'));
for(const x of checks)console.log((x.pass?'PASS':'FAIL')+' '+x.name);
console.log('\nRESULT '+checks.filter(x=>x.pass).length+'/'+checks.length+' V20 screen-layout checks passed');
if(checks.some(x=>!x.pass))process.exitCode=1;
