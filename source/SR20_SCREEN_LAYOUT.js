/* Solo Realms V20 — screen-aware layout metadata.
 * This layer only annotates the already-rendered main screen. It never mutates
 * campaign state, rules, character data, or save records.
 */
function sr20ApplyScreenLayout(){
 if(!state?.character)return;
 const main=document.querySelector('#app .layout > .main');
 if(!main)return;
 const screen=state.combat?'combat':String(state.view||'adventure');
 main.dataset.screen=screen.toLowerCase().replace(/[^a-z0-9_-]/g,'');
 main.dataset.layoutVersion='20';
}
const sr20ScreenRenderBase=render;
render=function(){
 const result=sr20ScreenRenderBase();
 try{sr20ApplyScreenLayout();}
 catch(error){console.warn('Screen layout metadata could not be applied:',error);}
 return result;
};
