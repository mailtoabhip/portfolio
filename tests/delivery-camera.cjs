const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');

test('camera changes preserve pickup, FASTag and drop interactions with the fitted footprint',()=>{
 const modules=new Map(),input={throttle:0,brake:1,reverse:0,steer:0};
 let frame,now=0;
 const fakeWindow={setTimeout:()=>0,localStorage:{getItem:()=>null,setItem:()=>{}}};
 function load(id){
  if(modules.has(id))return modules.get(id).exports;
  const file=path.join(__dirname,'../src',id);
  const resolved=['.ts','.tsx'].map(ext=>file+ext).find(p=>fs.existsSync(p));
  const module={exports:{}};modules.set(id,module);
  const code=ts.transpileModule(fs.readFileSync(resolved,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInNewContext(code,{exports:module.exports,module,console,window:fakeWindow,process:{env:{NODE_ENV:'production'}},require:(name)=>{
   if(name==='react')return {useRef:value=>({current:value})};
   if(name==='@react-three/fiber')return {useFrame:callback=>{frame=callback;}};
   if(name==='@/lib/controls')return {input};
   if(name==='@/lib/curveWorld')return {curveUniform:{value:0},advanceCurve:()=>{}};
   return name.startsWith('@/')?load(name.slice(2)):require(name);
  }},{filename:resolved});
  return module.exports;
 }
 const {drive}=load('lib/driveState');
 const game=load('lib/game');
 const {useNightRun}=load('lib/store');
 const {useTruckView}=load('lib/truckView');
 load('components/three/GameSim').default();
 useNightRun.getState().setPhase('cruising');
 useTruckView.getState().setAsset('ready');
 function tick(seconds=1/60){
  for(let i=0;i<Math.ceil(seconds*60);i++){
   game.sim.cars=[]; // isolate delivery contacts from random traffic
   now+=1/60;frame({clock:{elapsedTime:now}},1/60);
  }
 }
 function switchView(){
  const before={job:game.sim.job,timeLeft:game.sim.timeLeft,dist:drive.dist,x:drive.x,speed:drive.speed,delivered:game.useGame.getState().delivered};
  useTruckView.getState().toggle();
  assert.deepEqual({job:game.sim.job,timeLeft:game.sim.timeLeft,dist:drive.dist,x:drive.x,speed:drive.speed,delivered:game.useGame.getState().delivered},before);
 }
 game.sendCommand('start');tick();
 const pickup=game.activeSite();
 drive.dist=pickup.s;drive.x=game.BAY_X-game.CAB_OFFSET_X;drive.speed=0;
 switchView();tick(2.2);
 assert.equal(game.sim.job,'delivering');
 assert.equal(game.sim.plazas.length,2);
 // Enter each FASTag reader below the speed limit, as interaction fixtures.
 for(const plaza of [...game.sim.plazas]){
  drive.dist=plaza.s-game.TRUCK_FRONT-game.FASTAG_READ_DIST+1;
  drive.x=game.LANES[1]-game.CAB_OFFSET_X;drive.speed=7;
  input.brake=0;switchView();tick();
  assert.ok(plaza.barriers.some(b=>b.want&&b.holder==='truck'));
 }
 assert.equal(game.useGame.getState().tollsPaid,2);
 const drop=game.activeSite();assert.equal(drop.kind,'drop');
 drive.dist=drop.s;drive.x=game.BAY_X-game.CAB_OFFSET_X;drive.speed=0;input.brake=1;
 switchView();tick(2.2);
 assert.equal(game.useGame.getState().delivered,1);
 assert.equal(game.sim.streak,1);
});
