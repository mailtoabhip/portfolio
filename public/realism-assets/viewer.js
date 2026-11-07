import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;document.body.append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#dce0df');scene.fog=new THREE.Fog('#dce0df',45,130);
const pmrem=new THREE.PMREMGenerator(renderer);const room=new RoomEnvironment();const environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;room.dispose();pmrem.dispose();
const camera=new THREE.PerspectiveCamera(34,innerWidth/innerHeight,.1,200);const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=3;controls.maxDistance=50;controls.maxPolarAngle=Math.PI*.49;controls.autoRotateSpeed=.6;
scene.add(new THREE.HemisphereLight('#eaf4ff','#777b66',1.2));
const sun=new THREE.DirectionalLight('#fff1d6',3.2);sun.position.set(-9,18,-12);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-20,right:20,top:20,bottom:-20,near:.1,far:65});sun.shadow.bias=-.00015;sun.shadow.normalBias=.025;sun.shadow.radius=3;scene.add(sun);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(300,300),new THREE.MeshStandardMaterial({color:'#c6cbc6',roughness:.94}));ground.rotation.x=-Math.PI/2;ground.position.y=-.024;ground.receiveShadow=true;scene.add(ground);
const loader=new GLTFLoader();let current,center=new THREE.Vector3(),radius=5,loadId=0;
function view(mode){let v=mode==='rear'?[1.15,.55,1.5]:mode==='side'?[1.9,.4,.1]:[1.15,.6,-1.5];camera.position.copy(center).add(new THREE.Vector3(...v).multiplyScalar(radius*1.22));controls.target.copy(center);controls.update();for(const name of ['front','rear','side'])document.getElementById(name).setAttribute('aria-pressed',String(name===mode));}
async function load(file){
 const id=++loadId;document.getElementById('status').textContent='Loading model…';document.getElementById('error').textContent='';
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),30000);
 try{
 const response=await fetch('./'+file,{signal:controller.signal});
 if(!response.ok)throw new Error('Model request returned HTTP '+response.status);
 const bytes=await response.arrayBuffer();
 const gltf=await loader.parseAsync(bytes,new URL('./',location.href).href);if(id!==loadId)return;
 if(current){scene.remove(current);current.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});}
 current=gltf.scene;current.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});scene.add(current);
 const bounds=new THREE.Box3().setFromObject(current);bounds.getCenter(center);const size=bounds.getSize(new THREE.Vector3());radius=Math.max(size.x,size.y,size.z)*.82;view('front');
 let triangles=0,meshes=0;current.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});
 document.getElementById('status').textContent=Math.round(triangles).toLocaleString()+' triangles · '+meshes+' meshes';
 const tree=file.includes('forest'),rock=file.includes('rock');document.getElementById('title').textContent=tree?'Layered canopy. Natural silhouette.':rock?'Weathered roadside stone.':'Silver cab. Midnight cargo.';
 document.getElementById('caption').textContent=tree?'Branch and leaf geometry · bark material · original procedural mesh':rock?'Irregular surface · vertex color variation · physical material':'Detailed truck geometry · separate wheel pivots · physical materials';
 }catch(e){if(id!==loadId)return;document.getElementById('error').textContent=e.name==='AbortError'?'The model request timed out. Check the preview server and try selecting the model again.':'Could not load asset: '+e.message;document.getElementById('status').textContent='Load failed';console.error(e);}
 finally{clearTimeout(timeout);}
}
for(const mode of ['front','rear','side'])document.getElementById(mode).onclick=()=>view(mode);
document.getElementById('spin').onclick=()=>{controls.autoRotate=!controls.autoRotate;document.getElementById('spin').setAttribute('aria-pressed',String(controls.autoRotate));};
document.getElementById('asset').onchange=e=>load(e.target.value);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});await load('delivery-rigid-truck.glb');
