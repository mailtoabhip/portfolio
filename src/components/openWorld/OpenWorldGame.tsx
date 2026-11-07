"use client";
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera, useProgress } from "@react-three/drei";
import * as THREE from "three";
import Link from "next/link";
import ExteriorTruck from "@/components/three/ExteriorTruck";
import { input, useDrivingControls } from "@/lib/controls";
import { useTruckView } from "@/lib/truckView";
import { BUILDINGS, DEPOT, MAP_LIMIT, OUTPOST, ROADS, canInteract, interactWorld, resetWorld, stepWorld, terrainHeight, world, worldTarget } from "@/lib/openWorld";
import { DestinationMarker, WorldBuildings, WorldForest, WorldRoads, WorldTerrain } from "./WorldLandscape";

const extra={handbrake:false};
function ignoreKey(target:EventTarget|null){return (target as HTMLElement|null)?.closest?.("input,textarea,select,[contenteditable=true]");}
class SceneryBoundary extends Component<{children:ReactNode},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(error:Error){console.error("Scenery unavailable",error);}
  render(){return this.state.failed?null:this.props.children;}
}
function WorldDriver(){
  const asset=useTruckView(s=>s.asset);
  useFrame((_,dt)=>{
    if(asset==="ready")stepWorld(world,{...input,handbrake:extra.handbrake},dt);
  },-2);
  return null;
}
function WorldTruck({night}:{night:boolean}){
  const group=useRef<THREE.Group>(null);
  const target=useMemo(()=>{const t=new THREE.Object3D();t.position.set(0,0,-40);return t;},[]);
  useFrame(()=>{
    const g=group.current;if(!g)return;
    const h=world.heading,s=Math.sin(h),c=Math.cos(h);
    const front=terrainHeight(world.x-s*2.7,world.z-c*2.7),back=terrainHeight(world.x+s*3.8,world.z+c*3.8);
    const left=terrainHeight(world.x-c,world.z+s),right=terrainHeight(world.x+c,world.z-s);
    g.position.set(world.x,(front+back)/2,world.z);
    g.rotation.set(Math.atan2(front-back,6.5),h,Math.atan2(right-left,2),"YXZ");
  },-1);
  return <group ref={group}>
    <group position={[.5,0,0]}><ExteriorTruck visible motion={world}/></group>
    <primitive object={target}/>
    {[-.865,.865].map(x=><spotLight key={x} position={[x,1.48,-2.72]} target={target} intensity={night?210:0} color="#ffdfb0" angle={.5} penumbra={.7} distance={85} decay={1.6}/>)}
  </group>;
}
function FollowCamera(){
  const camera=useRef<THREE.PerspectiveCamera>(null),first=useRef(true),reduced=useRef(false);
  const vectors=useMemo(()=>({desired:new THREE.Vector3(),look:new THREE.Vector3(),direction:new THREE.Vector3(),ray:new THREE.Raycaster()}),[]);
  const obstacles=useMemo(()=>BUILDINGS.map(b=>{
    const m=new THREE.Mesh(new THREE.BoxGeometry(b.halfX*2,b.height,b.halfZ*2));
    m.position.set(b.x,b.height/2,b.z);m.updateMatrixWorld(true);return m;
  }),[]);
  useEffect(()=>{
    const media=matchMedia("(prefers-reduced-motion: reduce)"),sync=()=>{reduced.current=media.matches;};sync();media.addEventListener("change",sync);
    return()=>{media.removeEventListener("change",sync);obstacles.forEach(o=>{o.geometry.dispose();(o.material as THREE.Material).dispose();});};
  },[obstacles]);
  useFrame((state,rawDt)=>{
    const c=camera.current;if(!c)return;
    const sin=Math.sin(world.heading),cos=Math.cos(world.heading),height=terrainHeight(world.x,world.z);
    vectors.desired.set(world.x+sin*11, height+6.3,world.z+cos*11);
    vectors.desired.setY(Math.max(vectors.desired.y,terrainHeight(vectors.desired.x,vectors.desired.z)+3));
    vectors.look.set(world.x-sin*2,height+2,world.z-cos*2);
    const distance=vectors.direction.subVectors(vectors.desired,vectors.look).length();
    vectors.ray.set(vectors.look,vectors.direction.normalize());
    const hit=vectors.ray.intersectObjects(obstacles,false)[0];
    if(hit&&hit.distance<distance)vectors.desired.copy(vectors.look).addScaledVector(vectors.direction,Math.max(1.5,hit.distance-.7));
    if(first.current||rawDt>.2||reduced.current){c.position.copy(vectors.desired);first.current=false;}
    else c.position.lerp(vectors.desired,1-Math.exp(-5*Math.min(rawDt,.1)));
    c.up.set(0,1,0);c.lookAt(vectors.look);
    const fov=state.size.width<state.size.height?72:58;if(c.fov!==fov){c.fov=fov;c.updateProjectionMatrix();}
  });
  return <PerspectiveCamera ref={camera} makeDefault fov={58} near={.1} far={1300}/>;
}
function WorldLighting({night}:{night:boolean}){
  const sun=useRef<THREE.DirectionalLight>(null);
  const target=useMemo(()=>new THREE.Object3D(),[]);
  useFrame(()=>{
    target.position.set(world.x,0,world.z);target.updateMatrixWorld();
    sun.current?.position.set(world.x-45,85,world.z-30);
  });
  return <>
    <color attach="background" args={[night?"#102033":"#b8ccd4"]}/>
    <fog attach="fog" args={[night?"#102033":"#b8ccd4",night?55:150,night?320:680]}/>
    <hemisphereLight args={[night?"#97afd1":"#dce8ef",night?"#18241d":"#687052",night?.65:1.4]}/>
    <primitive object={target}/>
    <directionalLight ref={sun} target={target} color={night?"#b6c9e4":"#fff0d4"} intensity={night?.7:3.1} castShadow
      shadow-mapSize={[1536,1536]} shadow-camera-left={-65} shadow-camera-right={65} shadow-camera-top={65} shadow-camera-bottom={-65} shadow-camera-near={1} shadow-camera-far={180} shadow-normalBias={.08} shadow-bias={-.0001}/>
  </>;
}
function MiniMap({tick}:{tick:number}){
  const canvas=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const ctx=canvas.current?.getContext("2d");if(!ctx)return;
    const size=160,scale=150/(MAP_LIMIT*2),xy=(v:number)=>80+v*scale;
    ctx.fillStyle="#192c29";ctx.fillRect(0,0,size,size);
    ctx.strokeStyle="#9baaa1";ctx.lineWidth=2.5;
    for(const r of ROADS){ctx.beginPath();ctx.moveTo(xy(r),5);ctx.lineTo(xy(r),155);ctx.stroke();ctx.beginPath();ctx.moveTo(5,xy(r));ctx.lineTo(155,xy(r));ctx.stroke();}
    for(const [p,color] of [[DEPOT,"#e6b34b"],[OUTPOST,"#8fcbd7"]] as const){ctx.fillStyle=color;ctx.fillRect(xy(p.x)-3,xy(p.z)-3,6,6);}
    const target=worldTarget();if(world.job!=="idle"){ctx.strokeStyle="#e6b34b";ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(xy(world.x),xy(world.z));ctx.lineTo(xy(target.x),xy(target.z));ctx.stroke();ctx.setLineDash([]);}
    ctx.save();ctx.translate(xy(world.x),xy(world.z));ctx.rotate(-world.heading);ctx.fillStyle="white";ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(4,5);ctx.lineTo(-4,5);ctx.closePath();ctx.fill();ctx.restore();
    ctx.fillStyle="#dbe8df";ctx.font="10px sans-serif";ctx.fillText("N",76,12);
  },[tick]);
  return <canvas ref={canvas} width={160} height={160} aria-label="Map showing your truck, roads, depot and forest outpost" className="h-28 w-28 rounded-2xl border border-white/20 sm:h-40 sm:w-40"/>;
}
function touch(key:"throttle"|"reverse"|"left"|"right",active:boolean){
  if(key==="throttle"){input.throttle=active?1:0;input.brake=active?0:1;input.reverse=0;}
  if(key==="reverse"){input.brake=1;input.reverse=active?1:0;input.throttle=0;}
  if(key==="left"||key==="right")input.steer=active?(key==="left"?-1:1):0;
}
function DriveButton({control,children}:{control:"throttle"|"reverse"|"left"|"right";children:ReactNode}){
  return <button type="button" className="flex h-14 min-w-14 items-center justify-center rounded-2xl border border-white/25 bg-black/60 px-3 text-sm text-white active:bg-white/25" style={{touchAction:"none"}}
    onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);touch(control,true);}}
    onPointerUp={()=>touch(control,false)} onPointerCancel={()=>touch(control,false)} onLostPointerCapture={()=>touch(control,false)}>{children}</button>;
}
function WorldHud({night,setNight}:{night:boolean;setNight:(night:boolean)=>void}){
  const [snapshot,setSnapshot]=useState(()=>({...world,tick:0})),asset=useTruckView(s=>s.asset);
  const {active}=useProgress();
  useEffect(()=>{const timer=setInterval(()=>setSnapshot(s=>({...world,tick:s.tick+1})),100);return()=>clearInterval(timer);},[]);
  const target=snapshot.job==="drop"?OUTPOST:DEPOT;
  const distance=Math.round(Math.hypot(snapshot.x-target.x,snapshot.z-target.z));
  return <div className="pointer-events-none fixed inset-0 z-10 font-sans text-white">
    <header className="absolute left-4 top-4 max-w-[65vw] rounded-2xl bg-black/50 p-3 backdrop-blur-sm sm:left-7 sm:top-6">
      <p className="text-[10px] tracking-[.24em] text-white/60">THE NIGHT RUN</p>
      <h1 className="mt-1 text-xl font-medium tracking-tight sm:text-2xl">Forest county</h1>
      <div className="pointer-events-auto mt-3 flex flex-wrap gap-2 text-xs">
        <Link href="/" className="rounded-full border border-white/20 bg-black/55 px-3 py-2">Delivery highway</Link>
        <button onClick={()=>setNight(!night)} className="rounded-full border border-white/20 bg-black/55 px-3 py-2">{night?"Daylight":"Night drive"}</button>
        <button onClick={()=>resetWorld()} className="rounded-full border border-white/20 bg-black/55 px-3 py-2">Reset truck</button>
      </div>
    </header>
    <div className="absolute right-4 top-4 rounded-2xl bg-black/60 px-4 py-3 text-right sm:right-7 sm:top-6">
      <p className="text-3xl tabular-nums">{Math.round(Math.abs(snapshot.speed)*3.6)} <span className="text-xs text-white/60">km/h</span></p>
      <p className="mt-1 text-xs text-white/60">{snapshot.speed<-.1?"REVERSE":"DRIVE"} · {snapshot.delivered} delivered</p>
    </div>
    <div className="absolute bottom-44 left-4 max-w-[72vw] rounded-2xl border border-white/15 bg-black/65 p-3 text-xs sm:bottom-5 sm:left-1/2 sm:max-w-xs sm:-translate-x-1/2 lg:bottom-24 lg:left-7 lg:max-w-sm lg:translate-x-0">
      <p className="font-medium">{snapshot.job==="idle"?"Freely explore":snapshot.job==="pickup"?"Collect at the depot":"Deliver to the forest outpost"}{snapshot.job!=="idle"?" · "+distance+" m":""}</p>
      <p className="mt-1 text-white/65">{asset==="error"?"Truck could not load. Reload to retry.":asset==="loading"?"Loading truck…":active?"Loading forest assets…":snapshot.notice}</p>
      <button onClick={()=>interactWorld()} disabled={snapshot.job!=="idle"&&!canInteract(snapshot)} className="pointer-events-auto mt-2 rounded-full bg-[#dcb35e] px-4 py-2 font-medium text-black disabled:opacity-45">
        {snapshot.job==="idle"?"Start delivery":snapshot.job==="pickup"?"Load parcel · E":"Unload parcel · E"}
      </button>
    </div>
    <div className="absolute bottom-5 right-4 sm:right-7"><MiniMap tick={snapshot.tick}/></div>
    <p className="absolute bottom-5 left-1/2 hidden -translate-x-1/2 whitespace-nowrap text-[11px] tracking-wide text-white/70 lg:block">W accelerate · S brake / reverse · A D steer · SPACE handbrake · E load · R reset</p>
    <div className="pointer-events-auto absolute bottom-5 left-4 flex gap-2 lg:hidden">
      <DriveButton control="left">←</DriveButton><DriveButton control="right">→</DriveButton>
      <div className="flex flex-col gap-2"><DriveButton control="throttle">Drive</DriveButton><DriveButton control="reverse">Reverse</DriveButton></div>
    </div>
  </div>;
}
export default function OpenWorldGame(){
  const [night,setNight]=useState(false);
  useDrivingControls();
  useEffect(()=>{
    const down=(e:KeyboardEvent)=>{
      if(ignoreKey(e.target))return;
      if(e.code==="Space"){e.preventDefault();extra.handbrake=true;}
      if(!e.repeat&&e.key.toLowerCase()==="r")resetWorld();
      if(!e.repeat&&e.key.toLowerCase()==="e")interactWorld();
    },up=(e:KeyboardEvent)=>{if(e.code==="Space")extra.handbrake=false;},blur=()=>{extra.handbrake=false;};
    window.addEventListener("keydown",down);window.addEventListener("keyup",up);window.addEventListener("blur",blur);
    return()=>{window.removeEventListener("keydown",down);window.removeEventListener("keyup",up);window.removeEventListener("blur",blur);extra.handbrake=false;};
  },[]);
  return <main className="fixed inset-0 bg-[#152923]">
    <Canvas shadows dpr={[1,1.5]} gl={{antialias:true,powerPreference:"high-performance",toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:1}}>
      <WorldDriver/><WorldLighting night={night}/><WorldTerrain/>
      <SceneryBoundary><Suspense fallback={null}><WorldRoads/></Suspense></SceneryBoundary>
      <WorldBuildings/><DestinationMarker/>
      <SceneryBoundary><Suspense fallback={null}><WorldForest/></Suspense></SceneryBoundary>
      <WorldTruck night={night}/><FollowCamera/>
    </Canvas>
    <WorldHud night={night} setNight={setNight}/>
  </main>;
}
