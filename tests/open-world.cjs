const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),ts=require('typescript');
const source=fs.readFileSync(path.join(__dirname,'../src/lib/openWorld.ts'),'utf8');
const context={exports:{}};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
const w=context.exports;
const controls={throttle:1,brake:0,reverse:0,steer:0};
function state(){return {...w.world,x:0,z:0,heading:0,speed:0,steering:0,distance:0,job:'idle'};}
test('world movement is persistent and identical at 60 and 120 FPS',()=>{
 const a=state(),b=state();
 for(let i=0;i<300;i++)w.stepWorld(a,controls,1/60);
 for(let i=0;i<600;i++)w.stepWorld(b,controls,1/120);
 assert.ok(a.z<-20);assert.ok(Math.abs(a.z-b.z)<1e-8);
 const before=a.z;a.heading=Math.PI;
 for(let i=0;i<180;i++)w.stepWorld(a,controls,1/60);
 assert.ok(a.z>before,'Facing back must travel back through the same coordinates');
});
test('continuous steering permits a physical U-turn rather than lane switching',()=>{
 const s=state();
 for(let i=0;i<900&&s.heading>-Math.PI;i++)w.stepWorld(s,{...controls,steer:1},1/120);
 assert.ok(s.heading<=-Math.PI,'Truck must rotate through 180 degrees');
 assert.ok(s.x>5,'Truck must follow a turning arc');
 const z=s.z;
 for(let i=0;i<60;i++)w.stepWorld(s,{...controls,steer:0},1/120);
 assert.ok(s.z>z,'Truck drives south after turning around');
});
test('buildings and forest trunks block the truck without teleporting it',()=>{
 const b=w.BUILDINGS[0],s=state();
 s.x=b.x-b.halfX-8;s.z=b.z;s.heading=-Math.PI/2;s.speed=9;
 for(let i=0;i<180;i++)w.stepWorld(s,controls,1/120);
 assert.ok(s.x<b.x-b.halfX);assert.equal(s.speed,0);
 assert.ok(!w.truckHitsBox(b.x+100,b.z,0,b));assert.ok(w.truckHitsBox(b.x,b.z,.7,b));
 const t=w.TREES[0];assert.ok(w.blocked(t.x,t.z,0));
});
test('reverse, handbrake, map boundaries and long frame gaps stay bounded',()=>{
 const s=state();
 for(let i=0;i<180;i++)w.stepWorld(s,{throttle:0,brake:1,reverse:1,steer:0},1/60);
 assert.ok(s.speed<0&&s.z>0);
 for(let i=0;i<60;i++)w.stepWorld(s,{...controls,throttle:0,handbrake:true},1/60);
 assert.equal(s.speed,0);
 s.x=w.MAP_LIMIT-5;s.z=0;s.heading=-Math.PI/2;s.speed=10;
 w.stepWorld(s,controls,20);assert.ok(s.x<w.MAP_LIMIT);assert.ok(Math.abs(s.dz)<3);
});
test('road contacts stay level and free-roam deliveries require parking',()=>{
 for(const r of w.ROADS)assert.equal(w.terrainHeight(r,120),0);
 const s=state();w.interactWorld(s);assert.equal(s.job,'pickup');
 w.interactWorld(s);assert.equal(s.job,'pickup');
 s.x=w.DEPOT.x;s.z=w.DEPOT.z;s.speed=5;w.interactWorld(s);assert.equal(s.job,'pickup');
 s.speed=0;w.interactWorld(s);assert.equal(s.job,'drop');
 s.x=w.OUTPOST.x;s.z=w.OUTPOST.z;w.interactWorld(s);assert.equal(s.job,'idle');assert.equal(s.delivered,1);
});
