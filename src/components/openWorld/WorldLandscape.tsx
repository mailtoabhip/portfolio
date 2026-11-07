"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BUILDINGS, ROADS, ROCKS, TREES, hash, terrainHeight, world, worldTarget } from "@/lib/openWorld";

/** Commit mutable GPU instance buffers, outside React's state lifecycle. */
function commitInstances(mesh:THREE.InstancedMesh,count=mesh.count){
  mesh.count=count;mesh.instanceMatrix.needsUpdate=true;
}

function rectangles(width:number){
  const rects=ROADS.map(x=>({x0:x-width/2,x1:x+width/2,z0:-550,z1:550}));
  const edges=[-550,...ROADS.flatMap(x=>[x-width/2,x+width/2]),550];
  for(const z of ROADS)for(let i=0;i<edges.length;i+=2)rects.push({x0:edges[i],x1:edges[i+1],z0:z-width/2,z1:z+width/2});
  return rects;
}
function surface(rects:ReturnType<typeof rectangles>,y:number){
  const positions:number[]=[],uv:number[]=[],indices:number[]=[];
  for(const r of rects){
    const base=positions.length/3;
    for(const [x,z] of [[r.x0,r.z0],[r.x1,r.z0],[r.x1,r.z1],[r.x0,r.z1]]){positions.push(x,y,z);uv.push(x/4,z/4);}
    indices.push(base,base+2,base+1,base,base+3,base+2);
  }
  const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));g.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function WorldTerrain(){
  const geometry=useMemo(()=>{
    const g=new THREE.PlaneGeometry(1200,1200,160,160);g.rotateX(-Math.PI/2);
    const p=g.attributes.position,colors:number[]=[];
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),z=p.getZ(i),y=terrainHeight(x,z);p.setY(i,y-.025);
      const near=Math.min(...ROADS.map(r=>Math.min(Math.abs(x-r),Math.abs(z-r))));
      const c=new THREE.Color(near<13?"#807d61":"#4b6037");
      c.multiplyScalar(.8+hash(i)*.35);colors.push(c.r,c.g,c.b);
    }
    g.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
  },[]);
  return <mesh geometry={geometry} receiveShadow><meshStandardMaterial vertexColors roughness={1}/></mesh>;
}
export function WorldRoads(){
  const source=useLoader(THREE.TextureLoader,"/realism-assets/textures/asphalt-basecolor.png");
  const texture=useMemo(()=>{const t=source.clone();t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;t.needsUpdate=true;return t;},[source]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  const geometries=useMemo(()=>{
    const asphalt=surface([...rectangles(14),
      {x0:7,x1:118,z0:95,z1:211},{x0:-318,x1:-250,z0:-313,z1:-257}],.035);
    const shoulders=surface(rectangles(20),.005);
    const paint:{x0:number;x1:number;z0:number;z1:number}[]=[];
    for(const road of ROADS)for(let s=-543;s<550;s+=10){
      if(ROADS.some(r=>Math.abs(s-r)<15))continue;
      for(const offset of [-.14,.14]){
        paint.push({x0:road+offset-.055,x1:road+offset+.055,z0:s,z1:s+5});
        paint.push({z0:road+offset-.055,z1:road+offset+.055,x0:s,x1:s+5});
      }
    }
    const edge:{x0:number;x1:number;z0:number;z1:number}[]=[];
    for(const road of ROADS)for(let s=-548;s<548;s+=4){
      if(ROADS.some(r=>Math.abs(s-r)<12))continue;
      for(const offset of [-6.25,6.25]){
        edge.push({x0:road+offset-.065,x1:road+offset+.065,z0:s,z1:s+4});
        edge.push({z0:road+offset-.065,z1:road+offset+.065,x0:s,x1:s+4});
      }
    }
    return {asphalt,shoulders,paint:surface(paint,.049),edge:surface(edge,.05)};
  },[]);
  return <group>
    <mesh geometry={geometries.shoulders} receiveShadow><meshStandardMaterial color="#8b8771" roughness={1}/></mesh>
    <mesh geometry={geometries.asphalt} receiveShadow><meshStandardMaterial map={texture} color="#a9abad" roughness={.94}/></mesh>
    <mesh geometry={geometries.paint} receiveShadow><meshStandardMaterial color="#dfba58" roughness={.8}/></mesh>
    <mesh geometry={geometries.edge} receiveShadow><meshStandardMaterial color="#c7c7b5" roughness={.9}/></mesh>
  </group>;
}
export function WorldBuildings(){
  return <group>
    {BUILDINGS.map((b,i)=><group key={i} position={[b.x,0,b.z]}>
      <mesh position={[0,b.height/2,0]} castShadow receiveShadow><boxGeometry args={[b.halfX*2,b.height,b.halfZ*2]}/><meshStandardMaterial color={i<2?"#76817d":"#a9957b"} roughness={.9}/></mesh>
      <mesh position={[0,b.height+.16,0]} castShadow><boxGeometry args={[b.halfX*2+.8,.32,b.halfZ*2+.8]}/><meshStandardMaterial color="#343f40" metalness={.4} roughness={.65}/></mesh>
      {[-1,0,1].map(n=><group key={n} position={[n*b.halfX*.55,0,b.halfZ+.05]}>
        <mesh position={[0,2.4,0]}><boxGeometry args={[i===0?6:3.5,4.8,.12]}/><meshStandardMaterial color="#293436" metalness={.45} roughness={.75}/></mesh>
        {Array.from({length:8},(_,j)=><mesh key={j} position={[0,.6+j*.52,.08]}><boxGeometry args={[i===0?5.8:3.3,.025,.04]}/><meshStandardMaterial color="#6e7879" metalness={.7} roughness={.6}/></mesh>)}
      </group>)}
    </group>)}
    {[[-13,142],[-13,-180],[333,170],[-307,-180],[13,430]].map(([x,z],i)=><group key={i} position={[x,0,z]}>
      <mesh position={[0,4,0]} castShadow><cylinderGeometry args={[.08,.12,8,8]}/><meshStandardMaterial color="#626a68" metalness={.7} roughness={.5}/></mesh>
      <mesh position={[x>0?-1:1,7.9,0]}><boxGeometry args={[2.4,.14,.45]}/><meshStandardMaterial color="#9fa7a1" metalness={.6}/></mesh>
    </group>)}
  </group>;
}
export function DestinationMarker(){
  const ring=useRef<THREE.Group>(null);
  useFrame(()=>{
    if(!ring.current)return;
    const target=worldTarget();
    ring.current.position.set(target.x,.09,target.z);
  });
  return <group ref={ring}>
    <mesh rotation={[-Math.PI/2,0,0]}><ringGeometry args={[7.5,8,64]}/><meshBasicMaterial color="#dbac44" transparent opacity={.85}/></mesh>
    <mesh rotation={[-Math.PI/2,0,0]}><circleGeometry args={[7.5,64]}/><meshBasicMaterial color="#d2a946" transparent opacity={.12} depthWrite={false}/></mesh>
  </group>;
}

/** Shared source geometry, instanced near trees; low detail silhouettes farther away. */
export function WorldForest(){
  const pine=useGLTF("/realism-assets/forest-pine.glb");
  const fir=useGLTF("/realism-assets/forest-fir.glb");
  const birch=useGLTF("/realism-assets/forest-birch.glb");
  const rock=useGLTF("/realism-assets/roadside-rock.glb");
  const bark=useLoader(THREE.TextureLoader,"/realism-assets/textures/pine-bark-basecolor.png");
  const root=useMemo(()=>{
    const group=new THREE.Group(),detail:THREE.InstancedMesh[][]=[];
    const wood=bark.clone();wood.wrapS=wood.wrapT=THREE.RepeatWrapping;wood.repeat.set(1,3);wood.colorSpace=THREE.SRGBColorSpace;wood.needsUpdate=true;
    for(const [species,asset] of [pine,fir,birch].entries()){
      const meshes:THREE.InstancedMesh[]=[];
      asset.scene.traverse(o=>{
        const mesh=o as THREE.Mesh;if(!mesh.isMesh)return;
        const mat=(mesh.material as THREE.MeshStandardMaterial).clone();
        if(mat.name.startsWith("Bark")&&species!==2){mat.map=wood;mat.color.set("#ccccbd");}
        const instance=new THREE.InstancedMesh(mesh.geometry,mat,18);instance.count=0;instance.castShadow=true;instance.receiveShadow=true;instance.frustumCulled=false;
        meshes.push(instance);group.add(instance);
      });detail.push(meshes);
    }
    const trunk=new THREE.InstancedMesh(new THREE.CylinderGeometry(.09,.24,11,5),new THREE.MeshStandardMaterial({color:"#665741",roughness:1}),TREES.length);
    const canopies:THREE.InstancedMesh[]=[];
    for(let species=0;species<3;species++){
      const pieces:Array<THREE.BufferGeometry>=[];
      const levels=species===2?4:7;
      for(let j=0;j<levels;j++){
        const radius=species===2?1.8+Math.sin(j/levels*Math.PI)*.6:2.5*(1-j/levels);
        for(let k=0;k<4;k++){
          const a=k*Math.PI/2+j*2.4,g=new THREE.IcosahedronGeometry(1,0);
          g.scale(radius*.65,species===2?1.25:.8,radius*.65);
          g.translate(Math.cos(a)*radius*.62, species===2?7+j*1.25:4.4+j*1.3,Math.sin(a)*radius*.62);pieces.push(g);
        }
      }
      const mesh=new THREE.InstancedMesh(mergeGeometries(pieces,false)!,new THREE.MeshStandardMaterial({color:species===2?"#506543":"#3c593b",roughness:1}),TREES.length);
      mesh.frustumCulled=false;canopies.push(mesh);group.add(mesh);pieces.forEach(g=>g.dispose());
    }
    trunk.frustumCulled=false;group.add(trunk);
    const rocks:THREE.InstancedMesh[]=[];const dummy=new THREE.Object3D();
    rock.scene.traverse(o=>{const m=o as THREE.Mesh;if(!m.isMesh)return;const instance=new THREE.InstancedMesh(m.geometry,m.material,ROCKS.length);
      ROCKS.forEach((r,i)=>{dummy.position.set(r.x,terrainHeight(r.x,r.z),r.z);dummy.rotation.set(0,i*2.4,0);dummy.scale.setScalar(r.scale);dummy.updateMatrix();instance.setMatrixAt(i,dummy.matrix);});
      instance.instanceMatrix.needsUpdate=true;instance.castShadow=true;group.add(instance);rocks.push(instance);
    });
    return {group,detail,trunk,canopies,wood,rocks,dummy};
  },[pine,fir,birch,rock,bark]);
  const last=useRef({x:Infinity,z:Infinity});
  useFrame(()=>{
    if(Math.hypot(world.x-last.current.x,world.z-last.current.z)<8)return;
    last.current={x:world.x,z:world.z};
    const count=typeof matchMedia!=="undefined"&&matchMedia("(pointer: coarse)").matches?9:18;
    const nearest=TREES.map((t,i)=>({i,d:Math.hypot(t.x-world.x,t.z-world.z)})).filter(t=>t.d<105).sort((a,b)=>a.d-b.d).slice(0,count);
    const near=new Set(nearest.map(t=>t.i)),counts=[0,0,0],farCounts=[0,0,0];
    TREES.forEach((t,i)=>{
      const dummy=root.dummy;dummy.position.set(t.x,terrainHeight(t.x,t.z),t.z);dummy.rotation.set(0,t.angle,0);dummy.scale.setScalar(t.scale);dummy.updateMatrix();
      if(near.has(i)){const index=counts[t.species]++;for(const mesh of root.detail[t.species])mesh.setMatrixAt(index,dummy.matrix);}
      if(!near.has(i))root.canopies[t.species].setMatrixAt(farCounts[t.species]++,dummy.matrix);
      dummy.scale.setScalar(near.has(i)?.0001:t.scale);dummy.updateMatrix();
      dummy.position.setY(dummy.position.y+5.5*t.scale);dummy.updateMatrix();root.trunk.setMatrixAt(i,dummy.matrix);
    });
    for(let s=0;s<3;s++)for(const mesh of root.detail[s])commitInstances(mesh,counts[s]);
    commitInstances(root.trunk);root.canopies.forEach((mesh,i)=>commitInstances(mesh,farCounts[i]));
  });
  useEffect(()=>()=>{root.group.traverse(o=>{if((o as THREE.InstancedMesh).isInstancedMesh)(o as THREE.InstancedMesh).dispose();});root.detail.flat().forEach(m=>(m.material as THREE.Material).dispose());root.trunk.geometry.dispose();(root.trunk.material as THREE.Material).dispose();root.canopies.forEach(m=>{m.geometry.dispose();(m.material as THREE.Material).dispose();});root.wood.dispose();},[root]);
  return <primitive object={root.group} dispose={null}/>;
}
