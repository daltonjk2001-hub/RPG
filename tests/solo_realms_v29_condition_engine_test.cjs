#!/usr/bin/env node
// V29: canonical condition definitions, independent instances, expiry and core rules integration.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','Solo_Realms_V18_Main.html'),'utf8');
const sw=fs.readFileSync(path.join(__dirname,'..','pwa','sw.js'),'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
if(scripts.length!==1)throw new Error('Expected one self-contained game runtime.');
function el(id=''){return {id,innerHTML:'',textContent:'',value:'',checked:false,dataset:{},style:{},attrs:{},files:[],
 classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},removeEventListener(){},
 appendChild(){},setAttribute(k,v){this.attrs[k]=String(v);},getAttribute(k){return this.attrs[k]??null;},
 click(){},querySelector(){return null},querySelectorAll(){return []},focus(){},closest(){return null;}};}
const app=el('app'),body=el('body'),head=el('head'),toast=el('toast'),nodes=new Map([['app',app],['toast',toast]]);
const document={title:'',body,head,getElementById(id){return nodes.get(id)||null;},querySelector(){return null;},querySelectorAll(){return [];},createElement(tag){return el(tag);},addEventListener(){}};
const storage=new Map(),session=new Map(),math=Object.create(Math);math.random=()=>.5;
const context={console,document,window:{},location:{protocol:'https:',search:'',href:'https://example.invalid/'},
 localStorage:{getItem(k){return storage.has(k)?storage.get(k):null;},setItem(k,v){storage.set(k,String(v));},removeItem(k){storage.delete(k);}},
 sessionStorage:{getItem(k){return session.has(k)?session.get(k):null;},setItem(k,v){session.set(k,String(v));},removeItem(k){session.delete(k);}},
 URLSearchParams,URL,Blob,FileReader:function(){},setTimeout,clearTimeout,Math:math,Date,JSON,Map,Set,Array,Object,String,Number,Boolean,RegExp,Error,Promise,Intl,
 performance:{now:()=>0},navigator:{onLine:true},crypto:require('node:crypto').webcrypto,AbortController,
 fetch:async()=>{throw Error('Unexpected network request in V29 condition tests.');}};
context.globalThis=context;
vm.runInNewContext(scripts[0],context,{timeout:60000,filename:'Solo_Realms_V29_Condition_Engine'});
const T=context.__SR29_TEST,T25=context.__SR25_TEST,T21=context.__SR21_TEST,T18=context.__SR18_TEST;
if(!T||!T25||T.version!=='29.0.0')throw new Error('V29 condition engine or typed-save integration is missing.');
const checks=[];
function assert(name,value,detail=''){checks.push({name,pass:!!value,detail:String(detail||'')});}
function actor(extra={}){return {id:'v29-target',name:'V29 Target',hp:30,maxHp:30,baseSpeed:30,speed:30,
 stats:{STR:10,DEX:10,CON:10,INT:10,WIS:10,CHA:10},conditions:[],activeEffects:[],...extra};}
try{
 assert('Registry contains all 15 SRD conditions',T.names.length===15&&['blinded','charmed','deafened','exhaustion','frightened','grappled','incapacitated','invisible','paralyzed','petrified','poisoned','prone','restrained','stunned','unconscious'].every(n=>T.names.includes(n)));

 assert('Monster displacement planner pushes the requested 10 feet',T18.displacementPlan({x:2,y:2},{x:0,y:2},'push',10,()=>true)?.to.x===4);
 assert('Monster displacement planner pulls toward the source',T18.displacementPlan({x:3,y:2},{x:0,y:2},'pull',5,()=>true)?.to.x===2);
 assert('Monster displacement planner stops before blocked or occupied squares',T18.displacementPlan({x:1,y:2},{x:0,y:2},'push',15,p=>p.x<3)?.to.x===2);
 const stacked=actor();
 const first=T.apply(stacked,'poisoned',1,'venom A'),second=T.apply(stacked,'poisoned',3,'venom B');
 assert('Repeated condition applications retain independent instance IDs',first.instance.id!==second.instance.id&&T.entries(stacked).length===2);
 assert('Same condition has one effective status rather than stacking its penalties',T.namesFor(stacked).filter(n=>n==='poisoned').length===1);
 const tick=T.tick(stacked);
 assert('Each condition instance expires on its own duration',tick.expired===1&&T.entries(stacked).length===1&&T.entries(stacked)[0].rounds===2&&T.has(stacked,'poisoned'));
 const legacy=actor({conditions:['blinded']});
 T.tick(legacy);
 assert('Legacy string conditions migrate as permanent and do not vanish at turn expiry',T.has(legacy,'blinded')&&T.entries(legacy)[0].permanent);
 const immune=actor();
 T.apply(immune,'petrified','permanent','medusa');
 const poison=T.apply(immune,'poisoned',2,'venom');
 assert('Petrified grants Poisoned condition immunity',poison.immune&&T.isImmune(immune,'poisoned'));
 const explicitImmune=actor({conditionImmunities:['frightened']});
 assert('Explicit creature condition immunity is enforced',T.apply(explicitImmune,'frightened',2).immune);
 const unsteady=actor();
 T.apply(unsteady,'unconscious',2,'sleep');
 assert('Unconscious also imposes Prone and Incapacitated',T.has(unsteady,'prone')&&T.has(unsteady,'incapacitated'));
 T.remove(unsteady,'unconscious');
 assert('Prone persists after Unconscious ends',T.has(unsteady,'prone'));
 const incapacitated=actor();T.apply(incapacitated,'paralyzed',2,'ghoul');
 assert('Incapacitated blocks action, bonus action and reaction',!T.canAct(incapacitated,'action')&&!T.canAct(incapacitated,'bonus')&&!T.canAct(incapacitated,'reaction'));
 assert('Action eligibility normalizes bonus-action aliases without permitting an incapacitated creature to bypass the gate',!T.canUseAction(incapacitated,'bonus_action')&&!T.canUseAction(incapacitated,'bonus action')&&!T.canUseAction(incapacitated,'bonus-action'));
 assert('Unrestricted creatures remain eligible for actions, bonus actions and reactions',T.canUseAction(actor(),'action')&&T.canUseAction(actor(),'bonus action')&&T.canUseAction(actor(),'reaction'));
 assert('V18 monster action and reaction adapters defer to the canonical V29 condition engine',T18.canUseAction(incapacitated)===false&&T18.canUseReaction(incapacitated)===false&&T18.canUseReaction(actor())===true);
 const paralyzedReaction=actor({hp:20,ac:10,reactions:[{name:'Parry',description:'adds 3 to its AC'}],reactionAvailable:true});
 T.apply(paralyzedReaction,'paralyzed',2,'test');
 const parryAttempt=T18.attackRoll(15,actor(),paralyzedReaction,true);
 assert('An Incapacitated monster cannot spend a Parry reaction to turn a hit into a miss',paralyzedReaction.reactionAvailable===true&&!paralyzedReaction._sr18ParryUsed&&parryAttempt.total>=10);
 const stunnedReducer=actor({hp:20,reactions:[{name:'Damage Reduction',description:'Reduce damage by 1d6.'}],reactionAvailable:true});
 T.apply(stunnedReducer,'stunned',2,'test');
 const hpBeforeReduction=stunnedReducer.hp;
 T18.typedDamage(stunnedReducer,8,'physical');
 assert('An Incapacitated monster cannot use a damage-reduction reaction',stunnedReducer.reactionAvailable===true&&!stunnedReducer._sr18ReductionUsed&&stunnedReducer.hp===hpBeforeReduction-8);
 assert('Conditions that set Speed to zero block movement',!T.canMove(incapacitated));
 for(const name of ['grappled','petrified','restrained','unconscious']){
   const x=actor();T.apply(x,name,'permanent','test');
   assert(name+' sets Speed to zero',T.status(x).speedOverride===0);
 }
 const fatigue=actor();
 T.changeExhaustion(fatigue,2);
 assert('Exhaustion applies -2 per level to D20 tests and -5 ft Speed per level',T.status(fatigue).d20Penalty===4&&T.status(fatigue).speedPenalty===10&&T.status(fatigue).effectiveSpeed===20);
 const rest=T.longRestExhaustion(fatigue);
 assert('Long Rest reduces Exhaustion by exactly one level',rest.before===2&&rest.after===1);
 const lethal=T.changeExhaustion(fatigue,5);
 assert('Exhaustion caps at six and level six causes death',lethal.after===6&&lethal.dead&&fatigue.hp===0&&fatigue.dead===true);
 const saves=actor();T.apply(saves,'stunned',2,'impact');
 for(const ability of ['STR','DEX']){
   const r=T25.resolveCreatureSavingThrow(saves,ability,[20],0,1);
   assert('Stunned automatically fails '+ability+' saves',r.autoFail&&!r.success);
 }
 const con=T25.resolveCreatureSavingThrow(saves,'CON',[20],0,1);
 assert('Stunned does not automatically fail Constitution saves',con.success&&!con.autoFail);
 assert('Stunned prevents actions but does not reduce Speed to 0',!T.canAct(saves,'action')&&T.status(saves).speedOverride===null&&T.canMove(saves));
 const petrified=actor({exhaustion:1});T.apply(petrified,'petrified','permanent','stone');
 const exhaustionSave=T25.resolveCreatureSavingThrow(petrified,'CON',[12],5,15);
 assert('Exhaustion applies its -2 per level modifier to creature saves',exhaustionSave.total===15);
 const restrainedSave=actor();T.apply(restrainedSave,'restrained',2,'net');
 const restrainedDex=T25.resolveCreatureSavingThrow(restrainedSave,'DEX',[18],0,15);
 assert('Restrained imposes Disadvantage on Dexterity saves',restrainedDex.dice.length===2&&restrainedDex.die===11);
 const restrainedAdv=T25.resolveCreatureSavingThrow(restrainedSave,'DEX',[18,4],0,15,{advantage:true});
 assert('Restrained cancels Advantage on Dexterity saves',restrainedAdv.dice.length===1&&restrainedAdv.die===18);
 assert('Petrified auto-fails Strength and Dexterity saves',T.autoFailSave(petrified,'STR')&&T.autoFailSave(petrified,'DEX'));
 const attacker=actor(),target=actor({id:'target-2'});
 T.apply(target,'paralyzed',2,'ghoul');
 assert('Attacks against Paralyzed targets have Advantage',T.attackState(attacker,target,{melee:true,distance:5}).mode==='advantage');
 const grappled=actor();T.apply(grappled,'grappled',2,'grab',{grapplerId:'grappler-1'});
 assert('Grappled sets Speed to zero',T.status(grappled).speedOverride===0);
 assert('Grappled attackers have Disadvantage against targets other than their grappler',T.attackState(grappled,actor({id:'another-target'}),{melee:true,distance:5}).mode==='disadvantage');
 assert('Grappled attackers do not suffer this penalty against their grappler',T.attackState(grappled,actor({id:'grappler-1'}),{melee:true,distance:5}).mode==='normal');

 const eligibleHolder=actor({id:'legal-holder',size:'medium'}),eligibleTarget=actor({id:'legal-target',size:'large'});
 assert('Grapple eligibility accepts a target one size larger with a free hand and valid reach',T.grappleEligibility(eligibleHolder,eligibleTarget,{grapplerSize:'medium',targetSize:'large',freeHands:1,activeGrapples:[],distance:5,reach:5}).legal);
 assert('Grapple eligibility rejects a target more than one size larger',T.grappleEligibility(eligibleHolder,actor(),{grapplerSize:'medium',targetSize:'huge',freeHands:1,distance:5,reach:5}).reason==='target-too-large');
 assert('Each active grapple consumes one free hand',T.grappleEligibility(eligibleHolder,eligibleTarget,{grapplerSize:'medium',targetSize:'large',freeHands:1,activeGrapples:[{grapplerId:'legal-holder'}],distance:5,reach:5}).reason==='no-free-hand');
 assert('Grapple eligibility rejects targets beyond reach',T.grappleEligibility(eligibleHolder,eligibleTarget,{grapplerSize:'medium',targetSize:'large',freeHands:1,distance:10,reach:5}).reason==='out-of-reach');
 assert('Grapple eligibility fails closed when size data is missing',T.grappleEligibility(eligibleHolder,actor(),{freeHands:1,distance:5,reach:5}).reason==='unknown-size');
 assert('Grapple eligibility fails closed when free-hand data is missing',T.grappleEligibility(eligibleHolder,eligibleTarget,{grapplerSize:'medium',targetSize:'large',distance:5,reach:5}).reason==='free-hands-unknown');
 const grappleHolder=actor({id:'grapple-starter',name:'Grapple Starter',size:'medium',stats:{STR:16,DEX:10,CON:10,INT:10,WIS:10,CHA:10},proficiencyBonus:3});
 const grappleVictim=actor({id:'grapple-victim',size:'large'});
 const noHit=T.startGrapple(grappleHolder,grappleVictim,{attackHit:false,grapplerSize:'medium',targetSize:'large',freeHands:1,activeGrapples:[],distance:5,reach:5});
 assert('A grapple cannot begin unless the initiating Unarmed Strike hits',!noHit.started&&noHit.reason==='grapple-attack-did-not-hit');
 const missingTargetSave=T.startGrapple(grappleHolder,grappleVictim,{attackHit:true,grapplerSize:'medium',targetSize:'large',freeHands:1,activeGrapples:[],distance:5,reach:5,proficiencyBonus:3});
 assert('Grapple initiation requires the target to make its choice of Strength or Dexterity save',!missingTargetSave.started&&missingTargetSave.reason==='target-save-required'&&!T.has(grappleVictim,'grappled'));
 const resisted=T.startGrapple(grappleHolder,grappleVictim,{attackHit:true,grapplerSize:'medium',targetSize:'large',freeHands:1,activeGrapples:[],distance:5,reach:5,proficiencyBonus:3,targetSave:{ability:'DEX',roll:12,bonus:2}});
 assert('A successful target saving throw prevents the grapple',!resisted.started&&resisted.reason==='target-saved'&&!T.has(grappleVictim,'grappled')&&resisted.escapeDC===14);
 const naturalOneTarget=actor({id:'grapple-natural-one'});
 const naturalOne=T.startGrapple(grappleHolder,naturalOneTarget,{attackHit:true,grapplerSize:'medium',targetSize:'medium',freeHands:1,activeGrapples:[],distance:5,reach:5,proficiencyBonus:3,targetSave:{ability:'STR',roll:1,bonus:30}});
 assert('A natural 1 can succeed on a grapple saving throw when its total meets the DC',!naturalOne.started&&naturalOne.reason==='target-saved'&&!T.has(naturalOneTarget,'grappled'));
 const naturalTwentyTarget=actor({id:'grapple-natural-twenty'});
 const naturalTwenty=T.startGrapple(grappleHolder,naturalTwentyTarget,{attackHit:true,grapplerSize:'medium',targetSize:'medium',freeHands:1,activeGrapples:[],distance:5,reach:5,proficiencyBonus:3,targetSave:{ability:'DEX',roll:20,bonus:-20}});
 assert('A natural 20 does not bypass the grapple saving throw DC',naturalTwenty.started&&T.has(naturalTwentyTarget,'grappled'));
 const canonicalAutoFailTarget=actor({id:'grapple-canonical-auto-fail'});T.apply(canonicalAutoFailTarget,'paralyzed','permanent','test');
 const canonicalAutoFail=T.startGrapple(grappleHolder,canonicalAutoFailTarget,{attackHit:true,grapplerSize:'medium',targetSize:'medium',freeHands:1,activeGrapples:[],distance:5,reach:5,proficiencyBonus:3,targetSave:{ability:'STR',roll:20,bonus:30,success:false}});
 assert('Canonical condition auto-failure overrides a numerically successful grapple save',canonicalAutoFail.started&&T.has(canonicalAutoFailTarget,'grappled'));

 const started=T.startGrapple(grappleHolder,grappleVictim,{attackHit:true,grapplerSize:'medium',targetSize:'large',freeHands:1,activeGrapples:[],distance:5,reach:5,proficiencyBonus:3,targetSave:{ability:'STR',roll:10,bonus:2}});
 assert('A failed target saving throw applies Grappled with source, reach, and escape DC',started.started&&T.has(grappleVictim,'grappled')&&started.escapeDC===14&&started.instance.grapplerId==='grapple-starter'&&started.instance.grappleRange===5&&started.save.success===false);
 const failedEscape=T.escapeGrapple(grappleVictim,{instanceId:started.instance.id,ability:'Athletics',roll:10,bonus:3});
 assert('An unsuccessful Athletics escape check leaves the grapple active',!failedEscape.escaped&&T.has(grappleVictim,'grappled')&&failedEscape.total===13&&failedEscape.dc===14,JSON.stringify({failedEscape,conditions:T.entries(grappleVictim)}));
 const escaped=T.escapeGrapple(grappleVictim,{instanceId:started.instance.id,ability:'Acrobatics',roll:12,bonus:2});
 assert('A successful Acrobatics escape check removes only the selected grapple instance',escaped.escaped&&!T.has(grappleVictim,'grappled'),JSON.stringify({escaped,conditions:T.entries(grappleVictim)}));
 const invalidEscapeTarget=actor({id:'invalid-escape-target'});T.apply(invalidEscapeTarget,'grappled','permanent','test',{grapplerId:'grapple-starter',escapeDC:10});
 const invalidEscape=T.escapeGrapple(invalidEscapeTarget,{ability:'Perception',roll:20,bonus:20,dc:1});
 assert('Grapple escape rejects skills other than Athletics or Acrobatics',!invalidEscape.escaped&&invalidEscape.reason==='invalid-escape-check'&&T.has(invalidEscapeTarget,'grappled'));
 const dragged=T.grappleMovementCost(grappleHolder,grappleVictim,20,{grapplerSize:'medium',targetSize:'large'});
 assert('Dragging a non-exempt grappled creature doubles movement cost',dragged.valid&&dragged.speedHalved&&dragged.movementCost===40);
 const tinyDrag=T.grappleMovementCost(grappleHolder,actor({size:'tiny'}),20,{grapplerSize:'medium',targetSize:'tiny'});
 assert('Dragging a Tiny creature does not halve the grappler speed',tinyDrag.valid&&!tinyDrag.speedHalved&&tinyDrag.movementCost===20);
 const smallDrag=T.grappleMovementCost(grappleHolder,actor({size:'small'}),20,{grapplerSize:'large',targetSize:'small'});
 assert('Dragging a creature two sizes smaller does not halve movement speed',smallDrag.valid&&!smallDrag.speedHalved&&smallDrag.movementCost===20);
 const heldAtReach=actor({id:'held-at-reach'}),holderAtReach=actor({id:'holder-at-reach'});
 const heldInstance=T.apply(heldAtReach,'grappled','permanent','claw',{grapplerId:'holder-at-reach',grappleRange:10});
 assert('Grappled instances preserve the source creature and its specific reach',heldInstance.instance.grapplerId==='holder-at-reach'&&heldInstance.instance.grappleRange===10);
 const atReach=T.reconcileGrapples([{actor:heldAtReach,pos:{x:0,y:0}},{actor:holderAtReach,pos:{x:1,y:0}}],{distance:()=>10});
 assert('A grapple remains active at exactly its recorded reach',atReach.count===0&&T.has(heldAtReach,'grappled'));
 const beyondReach=T.reconcileGrapples([{actor:heldAtReach,pos:{x:0,y:0}},{actor:holderAtReach,pos:{x:1,y:0}}],{distance:()=>10.1});
 assert('A grapple ends when the target moves beyond its recorded reach',beyondReach.count===1&&!T.has(heldAtReach,'grappled'));
 const heldByIncapacitated=actor({id:'held-by-incapacitated'}),stunnedGrappler=actor({id:'stunned-grappler'});
 T.apply(heldByIncapacitated,'grappled','permanent','monster hold',{grapplerId:'stunned-grappler',grappleRange:5});
 T.apply(stunnedGrappler,'stunned',2,'condition test');
 const incapRelease=T.reconcileGrapples([{actor:heldByIncapacitated,pos:{x:0,y:0}},{actor:stunnedGrappler,pos:{x:0,y:0}}],{distance:()=>0});
 assert('A grapple ends immediately when the grappler becomes Incapacitated through Stunned',incapRelease.count===1&&!T.has(heldByIncapacitated,'grappled'));
 const multiHeld=actor({id:'multi-held'}),incapHolder=actor({id:'incap-holder'}),activeHolder=actor({id:'active-holder'});
 T.apply(multiHeld,'grappled','permanent','first hold',{instanceId:'grapple-a',grapplerId:'incap-holder'});
 T.apply(multiHeld,'grappled','permanent','second hold',{instanceId:'grapple-b',grapplerId:'active-holder'});
 T.apply(incapHolder,'paralyzed',2,'condition test');
 const selectiveRelease=T.reconcileGrapples([{actor:multiHeld},{actor:incapHolder},{actor:activeHolder}],{distance:()=>0});
 assert('Releasing one incapacitated grappler preserves other independent grapple instances',selectiveRelease.count===1&&T.entries(multiHeld).length===1&&T.entries(multiHeld)[0].grapplerId==='active-holder');
 const unknownHolderTarget=actor({id:'unknown-holder-target'});
 T.apply(unknownHolderTarget,'grappled','permanent','unresolved legacy',{grapplerId:'not-loaded'});
 T.reconcileGrapples([{actor:unknownHolderTarget}]);
 assert('Legacy grapple remains unchanged when its grappler is not in the active participant set',T.has(unknownHolderTarget,'grappled'));
 const manualRelease=actor({id:'manual-release-target'});
 T.apply(manualRelease,'grappled','permanent','manual',{grapplerId:'manual-holder'});
 assert('The grapple release operation removes only the selected grapple instance',T.releaseGrapple(manualRelease,{grapplerId:'manual-holder'}).released&&!T.has(manualRelease,'grappled'));
 const uiGrappleWorld={character:actor({id:'ui-grapple-target'}),combat:{enemies:[actor({id:'ui-grappler'})]}};
 const uiGrapple=T.applyUiCondition(uiGrappleWorld,'player','grappled',2,false,'monster grab','ui-grappler',false,15);
 assert('Condition panel application stores custom Grappled source identity and reach',uiGrapple.applied&&T.entries(uiGrappleWorld.character)[0].grapplerId==='ui-grappler'&&T.entries(uiGrappleWorld.character)[0].grappleRange===15);
 const previousGrappleWorld=T21.state;
 const worldHeld=actor({id:'world-held'}),worldGrappler=actor({id:'world-grappler'});
 T.apply(worldHeld,'grappled','permanent','world grapple',{grapplerId:'world-grappler'});
 T.apply(worldGrappler,'incapacitated',2,'world test');
 T21.state={...(previousGrappleWorld||{}),character:worldHeld,combat:{heroPos:{x:0,y:0},enemies:[worldGrappler]}};
 const currentCombatRelease=T.reconcileCombatGrapples();
 T21.state=previousGrappleWorld;
 assert('Live combat participant reconciliation releases a grapple when its grappler is Incapacitated',currentCombatRelease.count===1&&!T.has(worldHeld,'grappled'));
 const invisible=actor();T.apply(invisible,'invisible',2,'spell');
 assert('Invisible attackers have Advantage',T.attackState(invisible,target,{melee:true,distance:5}).mode==='advantage');
 assert('Invisible attackers gain no Advantage against a target that can see them',T.attackState(invisible,actor(),{melee:true,distance:5,targetCanSeeInvisible:true}).mode==='normal');
 assert('Attack-state service reads the defender senses when checking Invisible attackers',T.attackState(invisible,actor({canSeeInvisible:true}),{melee:true,distance:5}).mode==='normal');
 const invisibleTarget=actor();T.apply(invisibleTarget,'invisible',2,'spell');
 assert('Attacks against Invisible targets have Disadvantage',T.attackState(attacker,invisibleTarget,{melee:true,distance:5}).mode==='disadvantage');
 assert('Seeing an Invisible target removes that Disadvantage',T.attackState(attacker,invisibleTarget,{melee:true,distance:5,canSeeInvisible:true}).mode==='normal');

 const frightenedAttacker=actor({id:'frightened-attacker'});T.apply(frightenedAttacker,'frightened',2,'dragon',{sourceId:'dragon',sourceVisible:true});
 const frightenedAttack=T.attackRoll(5,frightenedAttacker,actor({id:'frightened-target'}),true);
 assert('Actual attack rolls apply Frightened Disadvantage while the source is visible',frightenedAttack.dis&&!frightenedAttack.adv);
 const grappledAttacker=actor({id:'grappled-attacker'});T.apply(grappledAttacker,'grappled',2,'grab',{grapplerId:'grappler'});
 const grappleAttack=T.attackRoll(5,grappledAttacker,actor({id:'not-grappler'}),true);
 assert('Actual attack rolls apply Grappled Disadvantage against other targets',grappleAttack.dis&&!grappleAttack.adv);
 const closeProne=actor({id:'close-prone',distance:5});T.apply(closeProne,'prone',2,'trip');
 const closeProneAttack=T.attackRoll(5,actor(),closeProne,false);
 assert('Actual ranged attacks from within 5 feet gain Advantage against Prone targets',closeProneAttack.adv&&!closeProneAttack.dis);
 const farProne=actor({id:'far-prone',distance:15});T.apply(farProne,'prone',2,'trip');
 const farProneAttack=T.attackRoll(5,actor(),farProne,false);
 assert('Actual attacks from beyond 5 feet have Disadvantage against Prone targets',farProneAttack.dis&&!farProneAttack.adv);
 const invisibleAttacker=actor({id:'invisible-attacker'});T.apply(invisibleAttacker,'invisible',2,'spell');
 const invisibleAttack=T.attackRoll(5,invisibleAttacker,actor(),true);
 assert('Actual attacks by Invisible creatures gain Advantage',invisibleAttack.adv&&!invisibleAttack.dis);
 const visibleInvisible=actor({canSeeInvisible:true}),invisibleEnemy=actor({id:'invisible-enemy'});T.apply(invisibleEnemy,'invisible',2,'spell');
 const seeInvisibleAttack=T.attackRoll(5,visibleInvisible,invisibleEnemy,true);
 assert('Actual attacks against Invisible targets are normal when the attacker can see them',!seeInvisibleAttack.adv&&!seeInvisibleAttack.dis);
 const invisibleTargetCanSee=actor({canSeeInvisible:true}),hiddenInvisibleAttacker=actor({id:'hidden-invisible'});T.apply(hiddenInvisibleAttacker,'invisible',2,'spell');
 assert('Visibility helper detects a defender that can see Invisible creatures',T.canSeeInvisible(invisibleTargetCanSee)===true);
 const suppressedInvisibleAttack=T.attackRoll(5,hiddenInvisibleAttacker,invisibleTargetCanSee,true);
 assert('Invisible attackers gain no Advantage against targets that can see them',!suppressedInvisibleAttack.adv&&!suppressedInvisibleAttack.dis,JSON.stringify(suppressedInvisibleAttack)+'; canSee='+T.canSeeInvisible(invisibleTargetCanSee)+'; actorInvisible='+T.has(hiddenInvisibleAttacker,'invisible'));
 const hiddenAttacker=actor({hidden:true});
 const hiddenAttack=T.attackRoll(5,hiddenAttacker,actor(),true);
 assert('Hidden attackers gain Advantage in the actual attack-roll path',hiddenAttack.adv&&!hiddenAttack.dis);
 const dodgingTarget=actor({dodging:true});
 const dodgeAttack=T.attackRoll(5,actor(),dodgingTarget,true);
 assert('V29 condition projection preserves the earlier Dodge attack penalty',dodgeAttack.dis&&!dodgeAttack.adv);
 const outlinedTarget=actor({outlinedRounds:1});
 const outlineAttack=T.attackRoll(5,actor(),outlinedTarget,true);
 assert('V29 condition projection preserves the earlier Outlined attack Advantage',outlineAttack.adv&&!outlineAttack.dis);

 const prone=actor();T.apply(prone,'prone',2,'trip');
 assert('Prone targets grant Advantage to attacks from within 5 feet',T.attackState(attacker,prone,{melee:true,distance:5}).mode==='advantage');
 assert('Prone targets also grant Advantage to ranged attacks from within 5 feet',T.attackState(attacker,prone,{melee:false,distance:5}).mode==='advantage');
 assert('Prone targets impose Disadvantage on attacks from beyond 5 feet',T.attackState(attacker,prone,{melee:false,distance:30}).mode==='disadvantage');
 const poisonedAttacker=actor();T.apply(poisonedAttacker,'poisoned',2,'poison');
 assert('Poisoned attackers have Disadvantage',T.attackState(poisonedAttacker,actor(),{melee:true,distance:5}).mode==='disadvantage');
 const cancellation=actor();T.apply(cancellation,'poisoned',2,'poison');
 assert('Advantage and Disadvantage cancel rather than stack',T.attackState(cancellation,target,{melee:true,distance:5}).mode==='normal'&&T.attackState(cancellation,target,{melee:true,distance:5}).cancelled);
 const sight=actor();T.apply(sight,'blinded',2,'blindness');
 assert('Blinded automatically fails checks explicitly requiring sight',T.skillMode(sight,'Investigation',{requiresSight:true})==='auto-fail');
 assert('Blinded does not automatically fail hearing-based Perception checks',T.skillMode(sight,'Perception',{requiresHearing:true})==='normal');
 assert('Blinded does not assume every Perception check requires sight',T.skillMode(sight,'Perception')==='normal');
 const hearing=actor();T.apply(hearing,'deafened',2,'thunder');
 assert('Deafened automatically fails checks that require hearing',T.skillMode(hearing,'Listen')==='auto-fail');
 const fear=actor();T.apply(fear,'frightened',2,'dragon',{sourceVisible:true,sourceId:'dragon'});
 assert('Frightened imposes Disadvantage while its source is visible',T.skillMode(fear,'Perception')==='disadvantage');
 assert('Frightened prevents voluntarily moving closer to its source',!T.canMoveToward(fear,{id:'dragon',name:'Dragon'}));
 const away=actor();T.apply(away,'frightened',2,'dragon',{sourceVisible:false,sourceId:'dragon'});
 assert('Frightened source out of sight does not impose its visible-source penalty',T.skillMode(away,'Perception')==='normal'&&T.canMoveToward(away,{id:'dragon'}));
 const unknownFear=actor();T.apply(unknownFear,'frightened',2,'unknown source');
 assert('Frightened does not assume an unidentified source is in line of sight',T.skillMode(unknownFear,'Perception')==='normal'&&T.canMoveToward(unknownFear,{id:'unknown'}));
 const charmed=actor();T.apply(charmed,'charmed',2,'charm',{sourceId:'archmage'});
 assert('Charmed actor cannot harm its identified charmer',T.cannotHarm(charmed,{id:'archmage'})&&!T.cannotHarm(charmed,{id:'guard'}));
 const socialTarget=actor();T.apply(socialTarget,'charmed',2,'charm',{sourceId:'bard'});
 assert('Charmer gains Advantage on social interaction checks',T.socialCheckAdvantage({id:'bard'},socialTarget));
 assert('Any attack roll that hits a Paralyzed target within 5 feet is a critical hit',T.criticalOnHit(target,{hit:true,melee:false,distance:5}));
 assert('Hits from beyond 5 feet do not receive the automatic critical',!T.criticalOnHit(target,{hit:true,melee:false,distance:30}));
 const concentration=actor({concentration:{spell:'Hold Person'},activeEffects:[{name:'Hold Person',concentration:true}]});
 T.apply(concentration,'stunned',2,'shock');
 assert('Applying an incapacitating condition ends concentration and its linked effect',concentration.concentration===null&&concentration.activeEffects.length===0);
 const short=actor();T.apply(short,'poisoned',1,'first');T.apply(short,'poisoned',4,'second');
 T.remove(short,'poisoned',{source:'first'});
 assert('Removal can target one source instance without clearing the other',T.entries(short).length===1&&T.entries(short)[0].source==='second');

 const uiHero=actor({id:'hero-ui',name:'Hero'}),uiGoblin=actor({id:'goblin-ui',name:'Goblin'});
 T.apply(uiHero,'poisoned',2,'Spider venom');
 T.apply(uiGoblin,'paralyzed',3,'Ghoul');
 const uiAlly=actor({id:'remote-ally',name:'Mira'});
 const uiWorld={character:uiHero,campaign:{multiplayer:{players:[{id:'local-player',character:uiHero},{id:'remote-player',name:'Mira',character:uiAlly}]}},combat:{mp:{},enemies:[uiGoblin]}};
 const conditionPanel=T.conditionPanel(uiWorld);
 assert('Condition dashboard resolves the selected solo enemy',T.resolveUiTarget(uiWorld,'enemy:0')===uiGoblin);
 assert('Condition dashboard includes remote multiplayer party members without duplicating the local character',T.uiTargets(uiWorld).some(x=>x.key==='player:remote-player'&&x.actor===uiAlly)&&T.uiTargets(uiWorld).filter(x=>x.actor===uiHero).length===1);
 assert('Condition dashboard resolves a remote multiplayer participant by stable player ID',T.resolveUiTarget(uiWorld,'player:remote-player')===uiAlly);
 assert('Condition dashboard renders remote multiplayer participant status sections',T.conditionPanel(uiWorld).includes('Party · Mira'));
 const remoteCondition=T.applyUiCondition(uiWorld,'player:remote-player','poisoned',2,false,'Wyvern venom');
 assert('Condition dashboard applies a condition to a remote multiplayer participant',remoteCondition.applied&&T.has(uiAlly,'poisoned'));
 const remoteRemoved=T.removeUiCondition(uiWorld,'player:remote-player','poisoned',T.entries(uiAlly)[0]?.id);
 assert('Condition dashboard removes only the selected remote participant condition',remoteRemoved.removed===1&&!T.has(uiAlly,'poisoned'));
 assert('Condition dashboard renders for the player and solo combat enemies',conditionPanel.includes('sr29-condition-panel')&&conditionPanel.includes('You · Hero')&&conditionPanel.includes('Enemy · Goblin'));
 assert('Condition dashboard displays existing source and duration instances',conditionPanel.includes('Spider venom')&&conditionPanel.includes('2 rounds')&&conditionPanel.includes('Ghoul'));
 const uiApplied=T.applyUiCondition(uiWorld,'enemy:0','frightened',3,false,'Dragon fear','dragon-ui',true);
 const uiFear=T.entries(uiGoblin).find(x=>x.name==='frightened');
 assert('Condition dashboard application records source ID, line of sight and independent duration',uiApplied.applied&&uiFear?.sourceId==='dragon-ui'&&uiFear?.sourceVisible===true&&uiFear?.rounds===3);
 const uiRemoved=T.removeUiCondition(uiWorld,'enemy:0','frightened',uiFear?.id);
 assert('Condition dashboard removes only the selected condition instance',uiRemoved.removed===1&&!T.has(uiGoblin,'frightened')&&T.has(uiGoblin,'paralyzed'));
 T.applyUiCondition(uiWorld,'player','exhaustion',2,false,'Forced march','',false);
 assert('Condition dashboard applies cumulative Exhaustion levels',uiHero.exhaustion===2&&T.status(uiHero).d20Penalty===4);
 const uiReduce=T.removeUiCondition(uiWorld,'player','exhaustion');
 assert('Condition dashboard can reduce Exhaustion one level at a time',uiReduce.removed===0&&uiHero.exhaustion===1);


 const checkPoison=actor({id:'check-poison',level:5,stats:{STR:10,DEX:10,CON:10,INT:10,WIS:14,CHA:10}});
 T.apply(checkPoison,'poisoned',2,'venom');
 const poisonCheck=T21.canonicalCheck(checkPoison,'Perception',15,{roll:18,secondRoll:3});
 assert('Director ability checks apply Poisoned Disadvantage and select the lower die',poisonCheck.disadvantage&&poisonCheck.roll===3);
 const poisonAdvCheck=T21.canonicalCheck(checkPoison,'Perception',15,{roll:18,secondRoll:3,advantage:true});
 assert('Poisoned Disadvantage cancels a manually selected Advantage in Director checks',!poisonAdvCheck.advantage&&!poisonAdvCheck.disadvantage&&poisonAdvCheck.roll===18);
 const fearCheck=actor({id:'check-fear',level:5,stats:{STR:10,DEX:10,CON:10,INT:10,WIS:14,CHA:10}});
 T.apply(fearCheck,'frightened',2,'dragon',{sourceId:'dragon',sourceVisible:true});
 const fearRoll=T21.canonicalCheck(fearCheck,'Perception',15,{roll:18,secondRoll:3});
 assert('Director ability checks apply Frightened Disadvantage while its source is visible',fearRoll.disadvantage&&fearRoll.roll===3);
 fearCheck.conditions[0].sourceVisible=false;
 const hiddenFear=T21.canonicalCheck(fearCheck,'Perception',15,{roll:18,secondRoll:3});
 assert('Director ability checks do not penalize Frightened when the source is not visible',!hiddenFear.disadvantage&&hiddenFear.roll===18);
 const expertiseCheck=actor({id:'expert-check',level:5,classId:'Wizard',stats:{STR:10,DEX:10,CON:10,INT:14,WIS:10,CHA:10},proficiencies:['History'],expertise:['History'],exhaustion:2});
 const expectedExpertise=T21.skillBonus(expertiseCheck,'History').total-4;
 const actualExpertise=T21.canonicalCheck(expertiseCheck,'History',15,{roll:12});
 assert('Director checks apply Exhaustion once without erasing Expertise',actualExpertise.bonus===expectedExpertise);
 const sightCheck=actor();T.apply(sightCheck,'blinded',2,'blindness');
 const forcedSight=T21.canonicalCheck(sightCheck,'Investigation',15,{roll:20,requiresSight:true});
 assert('Director checks automatically fail when Blinded and sight is required',forcedSight.autoFail&&forcedSight.roll===null&&!forcedSight.success);
 const hearingCheck=actor();T.apply(hearingCheck,'deafened',2,'thunder');
 const forcedHearing=T21.canonicalCheck(hearingCheck,'Perception',15,{roll:20,requiresHearing:true});
 assert('Director checks automatically fail when Deafened and hearing is required',forcedHearing.autoFail&&forcedHearing.roll===null&&!forcedHearing.success);
 const stunnedSave=actor();T.apply(stunnedSave,'stunned',2,'shock');
 const forcedHeroSave=T.heroSave(stunnedSave,'STR',null,{saveDC:15});
 assert('Monster effects automatically fail STR saves against Stunned characters',forcedHeroSave.autoFail&&!forcedHeroSave.success&&forcedHeroSave.total===-Infinity);
 const petrifiedSave=actor({exhaustion:1});T.apply(petrifiedSave,'petrified','permanent','stone');
 const forcedPetrifiedSave=T.heroSave(petrifiedSave,'DEX',null,{saveDC:15});
 assert('Monster effects automatically fail DEX saves against Petrified characters',forcedPetrifiedSave.autoFail&&!forcedPetrifiedSave.success);
 const exhaustionHeroSave=actor({stats:{STR:10,DEX:10,CON:14,INT:10,WIS:10,CHA:10},exhaustion:2});
 const reducedHeroSave=T.heroSave(exhaustionHeroSave,'CON',null,{saveDC:15});
 assert('Monster-originated saving throws apply Exhaustion -2 per level',reducedHeroSave.bonus===-2);
 const stoneEnemy=actor({id:'stone-enemy',hp:20});T.apply(stoneEnemy,'petrified','permanent','stone');
 const stoneDamage=T.applyEnemyDamage(stoneEnemy,9,'physical');
 assert('Petrified enemies resist all damage with 2024 rounding',stoneDamage===4&&stoneEnemy.hp===16);
 const stoneVulnerable=actor({id:'stone-vulnerable',hp:20,vulnerabilities:['fire']});T.apply(stoneVulnerable,'petrified','permanent','stone');
 const stoneFire=T.applyEnemyDamage(stoneVulnerable,9,'fire');
 assert('Petrified resistance cancels matching vulnerability instead of stacking modifiers',stoneFire===9&&stoneVulnerable.hp===11);
 const stoneRedundant=actor({id:'stone-resistant',hp:20,resistances:['physical']});T.apply(stoneRedundant,'petrified','permanent','stone');
 const stoneResistant=T.applyEnemyDamage(stoneRedundant,9,'physical');
 assert('Petrified resistance does not stack with another resistance to the same damage',stoneResistant===4&&stoneRedundant.hp===16);
 const stonePlayer=actor({resistances:[],vulnerabilities:['fire']});T.apply(stonePlayer,'petrified','permanent','stone');
 assert('Petrified condition resistance cancels fire vulnerability in the effective damage multiplier',T.damageMultiplier(stonePlayer,'fire')===1);
 const oldWorld=T21.state;
 const multiplayerStone=actor({hp:30,maxHp:30,resistances:[],vulnerabilities:['fire']});T.apply(multiplayerStone,'petrified','permanent','stone');
 const multiplayerPlayer={id:'mp-stone',name:'Stone Hero',character:multiplayerStone};
 T21.state={...(oldWorld||{}),combat:{...((oldWorld||{}).combat||{}),mp:{}}};
 let multiplayerDamage=0;
 try{multiplayerDamage=T.applyMonsterDamage({player:multiplayerPlayer},9,'fire',{name:'Dragon'});}
 finally{T21.state=oldWorld;}
 assert('Multiplayer monster damage applies Petrified resistance and restores character resistances',multiplayerDamage===9&&multiplayerStone.hp===21&&!multiplayerStone.resistances.includes('all'));

 const integrity=html.includes("sr29Tick(e,{phase:'round',cycle:b.round})")&&html.includes('sr29CriticalOnHit')&&sw.includes('solo-realms-systems-v29-');
 assert('Generated player grid attack uses the V29 automatic-critical rule for Paralyzed and Unconscious targets within 5 feet',html.includes("automaticCritical=sr29CriticalOnHit(e,{hit:true,distance:dist})"));
 assert('Generated build records monster Grappled source IDs and parsed reach',html.includes("grappleRange=Math.max(5,Number(range.ranged?range.normalRange:range.reach)||5)"));
 assert('Condition panel exposes a grapple reach control',html.includes('id="sr29-grapple-range"'));
 assert('Generated build includes multiplayer condition dashboard target resolution',html.includes("const partyMatch=String(key||'').match(/^player:(.+)$/)")&&html.includes('Party · '));
 assert('Generated build contains canonical V18 reaction eligibility gates',html.includes('sr18CanUseReaction(target)')&&html.includes('sr18CanUseReaction(enemy)'));
 assert('Generated build gates solo and multiplayer monster actions through V29',html.includes('if(!sr18CanUseAction(enemy))'));
 assert('Generated build includes V29 tick, critical-hit and service-worker cache integration',integrity);
  assert('Generated build includes the live V29.1 grapple gameplay adapter',html.includes("const SR29_GRAPPLE_GAMEPLAY_VERSION='29.1.0';"));
  assert('Solo combat exposes the Unarmed Strike grapple action',html.includes('data-action="sr29-grapple"')&&html.includes('Unarmed Strike · Grapple'));
  assert('Solo combat exposes the action-based grapple escape control',html.includes('data-action="sr29-escape-grapple"')&&html.includes('Escape Grapple · Action'));
  assert('Live grapple flow resolves the Director-controlled target’s stronger STR/DEX save after a hit',html.includes('sr29SoloChooseTargetSaveAbility(e)')&&html.includes('targetSave:save')&&html.includes('sr25ResolveCreatureSavingThrow(saveTarget,key,[roll],bonus,dc'));
  assert('Live grapple flow uses canonical escape checks and source-linked conditions',html.includes('sr29EscapeGrapple(c,{instanceId:grapple.id')&&html.includes('sr29StartGrapple(c,e'));
  assert('Solo grapple movement charges doubled drag cost and keeps the held target adjacent',html.includes('cost.movementCost')&&html.includes('held.forEach(target=>{target.distance=5;})'));
  assert('Free-hand calculation accounts for unarmed, one-handed, off-hand weapons and equipped shields',T.gameplay?.freeHands?.({})===2&&T.gameplay.freeHands({weapon:'Unarmed Strike'})===2&&T.gameplay.freeHands({weapon:'Dagger'})===1&&T.gameplay.freeHands({weapon:'Dagger',offHandWeapon:'Shortsword'})===0&&T.gameplay.freeHands({weapon:'Dagger',shieldEquipped:true})===0);
  assert('Free-hand calculation recognizes two-handed weapons',T.gameplay.freeHands({weapon:'Greatsword'})===0&&T.gameplay.freeHands({weapon:'Longbow'})===0);
 assert('Solo monster targets choose the stronger legal grapple save',T.gameplay.chooseTargetSave(actor({stats:{STR:10,DEX:16,CON:10,INT:10,WIS:10,CHA:10}}))==='DEX');
 assert('Restrained targets account for Dexterity-save disadvantage when choosing',T.gameplay.chooseTargetSave(actor({stats:{STR:10,DEX:16,CON:10,INT:10,WIS:10,CHA:10},conditions:['restrained']}))==='STR');
 assert('Multiplayer heroes use the V29 Unarmed Strike grapple adapter',typeof T.gameplay.multiplayerStartGrapple==='function'&&html.includes('sr29MpStartGrapple(player,targetId||null)'));
 assert('Multiplayer heroes can choose Athletics or Acrobatics for Escape',typeof T.gameplay.multiplayerEscapeGrapple==='function'&&html.includes('Escape · Athletics')&&html.includes('Escape · Acrobatics'));
 assert('Multiplayer grapple initiation accepts a selected remote hero target and records a pending saving-throw challenge',html.includes('function sr29MpStartGrapple(player,targetId=null)')&&html.includes('mp.grappleChallenges.push')&&html.includes("action:'grapple',targetId"));
 assert('Remote grapple saving throws are delivered only by the targeted hero and resolved through the canonical save resolver',typeof T.gameplay.multiplayerResolveGrappleSave==='function'&&html.includes("item.targetId===player.id")&&html.includes('sr25ResolveCreatureSavingThrow(target,ability,[roll],bonus,challenge.escapeDC'));
 assert('Multiplayer grapple challenges recover from disconnects, defeated participants, and stale combat rounds',(()=>{
   const players=[
     {id:'attacker',connected:true,character:actor({hp:20})},
     {id:'live',connected:true,character:actor({hp:20})},
     {id:'gone',connected:false,character:actor({hp:20})},
     {id:'dead',connected:true,character:actor({hp:0})}
   ];
   const snapshot={combat:{round:4,mp:{grappleChallenges:[
     {id:'live-challenge',attackerId:'attacker',targetId:'live',createdRound:4},
     {id:'disconnect-challenge',attackerId:'attacker',targetId:'gone',createdRound:4},
     {id:'defeat-challenge',attackerId:'attacker',targetId:'dead',createdRound:4},
     {id:'stale-challenge',attackerId:'attacker',targetId:'live',createdRound:3}
   ]}},campaign:{multiplayer:{players}}};
   const result=T.gameplay.multiplayerPruneGrappleChallenges(snapshot);
   return result.removed===3&&result.remaining===1&&snapshot.combat.mp.grappleChallenges[0].id==='live-challenge'&&
     result.reasons.some(x=>x.reason==='participant-disconnected')&&result.reasons.some(x=>x.reason==='participant-defeated')&&result.reasons.some(x=>x.reason==='challenge-expired');
 })());
 assert('Solo voluntary movement is blocked while the player character is Grappled',html.includes("if(sr29Entries(c).some(item=>item.name==='grappled')){toast('You cannot move while Grappled.")&&html.includes('sr7Move=function(direction)'));
 const heldHero=actor({id:'held-hero'});T.apply(heldHero,'grappled','permanent','Monster',{grapplerId:'monster-1'});
 const freeHero=actor({id:'free-hero'});
 assert('Multiplayer Grappled heroes cannot use voluntary tactical movement',T.gameplay.multiplayerVoluntaryMovementEligibility({id:'held-hero',character:heldHero}).legal===false&&T.gameplay.multiplayerVoluntaryMovementEligibility({id:'free-hero',character:freeHero}).legal===true);
 assert('Multiplayer grapple dragging keeps a held hero adjacent and charges double movement for a same-size target',(()=>{
   const grappler=actor({id:'mp-grappler',name:'Grappler',size:'medium',movement:30});
   const held=actor({id:'mp-held',name:'Held Hero',size:'medium'});
   T.apply(held,'grappled','permanent','Grappler',{grapplerId:'mp-grappler',grappleRange:5});
   const snapshot={combat:{mp:{heroPositions:{'mp-grappler':{x:2,y:2},'mp-held':{x:3,y:2}}},enemies:[]},
     campaign:{multiplayer:{players:[{id:'mp-grappler',connected:true,character:grappler},{id:'mp-held',connected:true,character:held}]}}};
   const plan=T.gameplay.multiplayerGrappleMovePlan(snapshot.campaign.multiplayer.players[0],{x:2,y:2},{x:3,y:2},5,0,snapshot);
   return plan.legal&&plan.drag&&plan.multiplier===2&&plan.movementCost===10&&plan.target.player.id==='mp-held';
 })());
 assert('Multiplayer grapple dragging preserves normal movement cost for a Tiny target and refuses to overlap multiple held creatures',(()=>{
   const grappler=actor({id:'mp-grappler',name:'Grappler',size:'medium',movement:30});
   const tiny=actor({id:'mp-tiny',name:'Tiny',size:'tiny'});
   T.apply(tiny,'grappled','permanent','Grappler',{grapplerId:'mp-grappler',grappleRange:5});
   const player={id:'mp-grappler',connected:true,character:grappler},held={id:'mp-tiny',connected:true,character:tiny};
   const snapshot={combat:{mp:{heroPositions:{'mp-grappler':{x:2,y:2},'mp-tiny':{x:3,y:2}}},enemies:[]},campaign:{multiplayer:{players:[player,held]}}};
   const tinyPlan=T.gameplay.multiplayerGrappleMovePlan(player,{x:2,y:2},{x:3,y:2},5,0,snapshot);
   const second=actor({id:'mp-second',name:'Second',size:'medium'});
   T.apply(second,'grappled','permanent','Grappler',{grapplerId:'mp-grappler',grappleRange:5});
   snapshot.campaign.multiplayer.players.push({id:'mp-second',connected:true,character:second});
   snapshot.combat.mp.heroPositions['mp-second']={x:2,y:3};
   const multiPlan=T.gameplay.multiplayerGrappleMovePlan(player,{x:2,y:2},{x:3,y:2},5,0,snapshot);
   return tinyPlan.legal&&tinyPlan.movementCost===5&&!tinyPlan.speedHalved&&!multiPlan.legal&&multiPlan.reason==='multiple-targets';
 })());
 assert('Multiplayer combat exposes Strength and Dexterity save choices to the targeted hero',html.includes('data-action="sr29-mp-grapple-save"')&&html.includes('data-ability="STR"')&&html.includes('data-ability="DEX"'));
 assert('Multiplayer combat exposes connected party-member grapple targets within 5 feet',html.includes('data-action="sr29-mp-grapple"')&&html.includes('sr12Distance(sr12PlayerPos(me),sr12PlayerPos(p.id))>5'));
 assert('Grapple initiators cannot take another action until the remote target resolves the pending save',html.includes('Wait for the target to resolve the grapple saving throw.')&&html.includes("msg?.action==='grapple-save'"));
 assert('Multiplayer grappled monsters use their stored escape DC and release one grapple instance',html.includes('sr29EscapeGrapple(enemy,{instanceId:grapple.id')&&html.includes('grapple.escapeDC??enemy.grappleDC??12'));
 assert('Multiplayer grapple initiation uses source-linked V29 conditions and the canonical target save resolver',html.includes('sr29StartGrapple(grappler,e')&&html.includes('sr29SoloTargetSave(e,ability,escapeDC)'));
 const explicitSkillCheck=T.canonicalAbilityCheck(actor({stats:{STR:10,DEX:10,CON:10,INT:10,WIS:10,CHA:10}}),'Athletics',14,{roll:10,bonusOverride:5});
 assert('Canonical ability checks preserve explicit monster skill bonuses',explicitSkillCheck.total===15&&explicitSkillCheck.success===true);
 const abstractGrappler=actor({id:'abstract-hero',name:'Abstract Hero'}),abstractTarget=actor({id:'abstract-foe',name:'Abstract Foe',distance:10});
 T.apply(abstractTarget,'grappled','permanent','Abstract Hero',{grapplerId:'abstract-hero',grappleRange:5,escapeDC:12});
 const abstractRelease=T.gameplay.reconcileAbstractGrapples({character:abstractGrappler,combat:{enemies:[abstractTarget]}});
 assert('Forced movement beyond reach releases only the matching abstract-distance grapple',abstractRelease.count===1&&!T.has(abstractTarget,'grappled'));
 const abstractHolder=actor({id:'abstract-foe',name:'Abstract Foe',distance:10}),abstractVictim=actor({id:'abstract-hero',name:'Abstract Hero'});
 T.apply(abstractVictim,'grappled','permanent','Abstract Foe',{grapplerId:'abstract-foe',grappleRange:5,escapeDC:12});
 const abstractVictimRelease=T.gameplay.reconcileAbstractGrapples({character:abstractVictim,combat:{enemies:[abstractHolder]}});
 assert('Abstract-distance reconciliation also releases a player held by a displaced enemy',abstractVictimRelease.count===1&&!T.has(abstractVictim,'grappled'));
   assert('V29 reconciliation runs after solo and multiplayer enemy movement and monster actions',html.includes('sr10EnemyMove=function(...args)')&&html.includes('sr12EnemyStep=function(...args)')&&html.includes('sr18ResolveMonsterAction=function(...args)')&&html.includes('sr29ReconcileAbstractGrapples();')&&html.includes('sr29ReconcileCombatGrapples();'));
  assert('V29 reconciliation runs after multiplayer hero movement, shove, weapon mastery push and spell resolution',html.includes('sr12MoveHero=function(player,x,y)')&&html.includes('sr29MpGrappleMovePlan(player,from,to,stepCost,standCost)')&&html.includes('sr131Maneuver=function(...args)')&&html.includes('sr7ApplyMastery=function(...args)')&&html.includes('sr14CastSpellComplete=function(...args)'));
 assert('Solo grappled monsters spend their action on a source-specific canonical escape check',html.includes('sr7EnemySpecial=function(enemy)')&&html.includes('sr29EscapeGrapple(enemy,{instanceId:grapple.id')&&html.includes('bonusOverride:skillBonus'));
 assert('Monster-initiated grapples retain parsed escape DC, reach, size and action appendage metadata',html.includes('escape\\s+DC\\s*(\\d+)')&&html.includes('escapeDC,grapplerSize:sr29MpSize(enemy),targetSize:sr29MpSize(creature),handSlot}'));
 assert('Monster grapple appendage capacity uses explicit anatomy or a conservative creature default',T.gameplay.appendageCapacity(actor({type:'humanoid'}))===2&&T.gameplay.appendageCapacity(actor({type:'ooze'}))===1&&T.gameplay.appendageCapacity(actor({appendages:['tentacle-1','tentacle-2','tentacle-3']}))===3&&html.includes('if(!handSlot)')&&html.includes('sr29NextMonsterAppendageSlot(enemy,active)'));
 const appendageMonster=actor({type:'humanoid'});
 assert('Monster grapple allocation reuses the first genuinely free appendage slot after a grapple ends',T.gameplay.nextAppendageSlot(appendageMonster,[{handSlot:'monster-appendage-1'},{handSlot:'monster-appendage-3'}])==='monster-appendage-2');
 assert('Monster grapple allocation does not duplicate a surviving non-first appendage slot',T.gameplay.nextAppendageSlot(appendageMonster,[{handSlot:'monster-appendage-2'}])==='monster-appendage-1');
 assert('Legacy monster grapples without slot metadata still reserve appendage capacity',T.gameplay.nextAppendageSlot(appendageMonster,[{}])==='monster-appendage-2');
 assert('Monster grapple allocation reports no slot when every appendage is occupied',T.gameplay.nextAppendageSlot(appendageMonster,[{handSlot:'monster-appendage-1'},{handSlot:'monster-appendage-2'}])===null);
 assert('Monster grapple-on-hit attacks resolve AC, damage, appendage capacity and source-linked escape metadata',html.includes('attack=sr11RollAttack(bonus,enemy,c,!range.ranged)')&&html.includes("sr29Apply(c,'grappled','permanent',enemy.name")&&html.includes('freeHands:capacity,activeGrapples:active'));






}catch(error){assert('V29 condition suite completes without uncaught runtime errors',false,error?.stack||String(error));}
for(const check of checks)console.log((check.pass?'PASS ':'FAIL ')+check.name+(check.detail?' — '+check.detail:''));
const passed=checks.filter(x=>x.pass).length;
console.log('\nRESULT '+passed+'/'+checks.length+' V29 condition-engine assertions passed');
if(passed!==checks.length)process.exitCode=1;
