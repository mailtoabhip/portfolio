/** Real world coordinates: metres, +Y up, heading 0 faces north (-Z). */
export const MAP_LIMIT = 570;
export const ROADS = [-320, 0, 320];
export const DEPOT = { x: 48, z: 155 };
export const OUTPOST = { x: -295, z: -300 };
export type Solid = { x: number; z: number; halfX: number; halfZ: number; height: number };
export const BUILDINGS: Solid[] = [
  { x: 69, z: 124, halfX: 27, halfZ: 14, height: 9 },
  { x: 93, z: 178, halfX: 12, halfZ: 10, height: 6 },
  { x: -274, z: -275, halfX: 12, halfZ: 9, height: 6 },
  { x: 352, z: 52, halfX: 11, halfZ: 13, height: 7 },
  { x: 354, z: 95, halfX: 13, halfZ: 10, height: 9 },
  { x: 50, z: -350, halfX: 14, halfZ: 12, height: 8 },
];
const yards = [
  { x: 65, z: 153, halfX: 53, halfZ: 58 },
  { x: -284, z: -285, halfX: 34, halfZ: 28 },
];
function boxDistance(x: number,z: number,b:{x:number;z:number;halfX:number;halfZ:number}) {
  return Math.hypot(Math.max(0,Math.abs(x-b.x)-b.halfX),Math.max(0,Math.abs(z-b.z)-b.halfZ));
}
export function roadDistance(x: number, z: number) {
  return Math.min(...ROADS.map(r => Math.min(Math.abs(x-r),Math.abs(z-r))));
}
export function onPavement(x:number,z:number) {
  return roadDistance(x,z)<7 || yards.some(y=>boxDistance(x,z,y)<0.1);
}
export function terrainHeight(x: number,z: number) {
  const clearance=Math.min(Math.max(0,roadDistance(x,z)-10),...yards.map(y=>boxDistance(x,z,y)),...BUILDINGS.map(b=>boxDistance(x,z,b)));
  const t=Math.min(1,clearance/28);
  if(t===0)return 0;
  return t*t*(3-2*t)*(2.1+Math.sin(x*.024)*1.1+Math.cos(z*.019)*.8+Math.sin((x+z)*.01)*1.2);
}
export function hash(n:number) { const t=Math.sin(n*127.1+311.7)*43758.5453;return t-Math.floor(t); }
export const TREES = Array.from({length:2200},(_,i)=>({
  x:(hash(i*4+1)-.5)*1090,z:(hash(i*4+2)-.5)*1090,
  scale:.7+hash(i*4+3)*.55,angle:hash(i*4+4)*Math.PI*2,species:i%3,
})).filter(t=>roadDistance(t.x,t.z)>15&&yards.every(y=>boxDistance(t.x,t.z,y)>8)&&BUILDINGS.every(b=>boxDistance(t.x,t.z,b)>8));
export const ROCKS=Array.from({length:100},(_,i)=>({
  x:(hash(i+9001)-.5)*1070,z:(hash(i+8001)-.5)*1070,scale:.6+hash(i+7001)*.8,
})).filter(t=>roadDistance(t.x,t.z)>19&&yards.every(y=>boxDistance(t.x,t.z,y)>7));
export type WorldState = {
  x:number;z:number;heading:number;speed:number;steering:number;dz:number;distance:number;
  job:"idle"|"pickup"|"drop";delivered:number;notice:string;
};
export const world:WorldState={x:0,z:165,heading:0,speed:0,steering:0,dz:0,distance:0,job:"idle",delivered:0,notice:"Explore the roads, or collect a delivery at the depot."};
export function resetWorld(s=world) {
  s.x=0;s.z=165;s.heading=0;s.speed=0;s.steering=0;s.dz=0;
  s.notice=s.job==="idle"?"Truck returned to the road. Ready to explore.":"Truck returned to the road. Your delivery is still active.";
}
/** Oriented truck rectangle against a world-aligned building (SAT). */
export function truckHitsBox(x:number,z:number,heading:number,b:Solid) {
  const f={x:-Math.sin(heading),z:-Math.cos(heading)},r={x:Math.cos(heading),z:-Math.sin(heading)};
  const cx=x-f.x*.55,cz=z-f.z*.55,dx=b.x-cx,dz=b.z-cz;
  for(const a of [{x:1,z:0},{x:0,z:1},f,r]){
    const distance=Math.abs(dx*a.x+dz*a.z);
    const truck=3.25*Math.abs(f.x*a.x+f.z*a.z)+1.1*Math.abs(r.x*a.x+r.z*a.z);
    const building=b.halfX*Math.abs(a.x)+b.halfZ*Math.abs(a.z);
    if(distance>truck+building)return false;
  }
  return true;
}
function trunkContact(x:number,z:number,h:number,t:{x:number;z:number},radius:number) {
  if(Math.abs(t.x-x)>6||Math.abs(t.z-z)>6)return false;
  const dx=t.x-x,dz=t.z-z;
  const along=dx*(-Math.sin(h))+dz*(-Math.cos(h));
  const lateral=dx*Math.cos(h)-dz*Math.sin(h);
  return Math.hypot(Math.max(0,Math.abs(lateral)-1.1),Math.max(0,along-2.7,-3.8-along))<radius;
}
export function blocked(x:number,z:number,h:number) {
  if(Math.abs(x)>MAP_LIMIT-4||Math.abs(z)>MAP_LIMIT-4)return true;
  if(BUILDINGS.some(b=>Math.abs(b.x-x)<b.halfX+6&&Math.abs(b.z-z)<b.halfZ+6&&truckHitsBox(x,z,h,b)))return true;
  if(TREES.some(t=>trunkContact(x,z,h,t,.25*t.scale)))return true;
  return ROCKS.some(t=>trunkContact(x,z,h,t,1.35*t.scale));
}
type Controls={throttle:number;brake:number;reverse:number;steer:number;handbrake?:boolean};
/** Bicycle steering, fixed substeps, signed reverse and persistent position. */
export function stepWorld(s:WorldState,input:Controls,rawDt:number) {
  const dt=Math.max(0,Math.min(rawDt,.1)),steps=Math.max(1,Math.ceil(dt*120)),h=dt/steps;
  s.dz=0;
  for(let i=0;i<steps;i++){
    const paved=onPavement(s.x,s.z),top=paved?27:10;
    let v=s.speed;
    if(input.handbrake)v=Math.sign(v)*Math.max(0,Math.abs(v)-13*h);
    else if(input.throttle>0)v=v<0?Math.min(0,v+9*h):Math.min(top,v+(3.7*(1-v/32))*h);
    else if(input.brake>0)v=v>0?Math.max(0,v-10*h):input.reverse?Math.max(-6.5,v-3*h):Math.min(0,v+10*h);
    else v=Math.sign(v)*Math.max(0,Math.abs(v)-(.65+Math.abs(v)*.025)*h);
    if(Math.abs(v)>top)v=Math.sign(v)*Math.max(top,Math.abs(v)-7*h);
    if(Math.abs(v)<1e-8)v=0;
    const maxSteer=.55/(1+Math.abs(v)/32);
    s.steering+=(input.steer*maxSteer-s.steering)*(1-Math.exp(-7*h));
    const heading=s.heading-v/4.1*Math.tan(s.steering)*h;
    const x=s.x-Math.sin(heading)*v*h,z=s.z-Math.cos(heading)*v*h;
    if(blocked(x,z,heading)){
      s.speed=0;s.notice=Math.abs(x)>MAP_LIMIT-5||Math.abs(z)>MAP_LIMIT-5?"Map edge — turn around to keep exploring.":"Contact — brake, reverse and steer clear.";
      break;
    }
    s.x=x;s.z=z;s.heading=heading;s.speed=v;s.dz+=v*h;s.distance+=Math.abs(v*h);
  }
}
export function worldTarget(s=world) { return s.job==="drop"?OUTPOST:DEPOT; }
export function canInteract(s=world) {
  const target=worldTarget(s);return Math.hypot(s.x-target.x,s.z-target.z)<9&&Math.abs(s.speed)<.6;
}
export function interactWorld(s=world) {
  if(s.job==="idle"){s.job="pickup";s.notice="Collect your parcel at the depot. Park in the marked circle.";return;}
  if(!canInteract(s)){s.notice="Park inside the destination circle before loading or unloading.";return;}
  if(s.job==="pickup"){s.job="drop";s.notice="Parcel loaded. Choose any route to the forest outpost.";}
  else{s.job="idle";s.delivered++;s.notice="Delivery complete. Explore, or collect another parcel.";}
}
