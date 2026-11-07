import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// All coordinates are metres. +Y up, forward -Z. No reference photos embedded.
const OUT = path.resolve(process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
fs.mkdirSync(OUT, { recursive: true });
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result=result; this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then(result => { this.result='data:'+blob.type+';base64,'+Buffer.from(result).toString('base64'); this.onloadend?.(); }); }
};

function material(name, color, roughness, metalness=0, extra={}) {
  const m=new THREE.MeshStandardMaterial({color,roughness,metalness,...extra});m.name=name;return m;
}
const mats={
  silver:new THREE.MeshPhysicalMaterial({name:'Cab • metallic blue silver',color:'#829ca9',roughness:.31,metalness:.55,clearcoat:.65,clearcoatRoughness:.24}),
  navy:material('Cargo • midnight blue coated steel','#14202a',.66,.32),
  black:material('Chassis • powder coated black','#202326',.76,.2),
  rubber:material('Tires • vulcanized rubber','#151618',.96),
  chrome:material('Brushed stainless steel','#b3b8ba',.26,.9),
  aluminum:material('Extruded aluminum trim','#9caaaf',.44,.8),
  white:material('Rear • weathered white enamel','#d3d5d0',.7,.12),
  seal:material('Door and glass seals','#0c1114',.93),
  glass:material('Smoked blue safety glass','#263b45',.12,.48),
  red:material('Red tail lenses','#8c0c12',.26,.15,{emissive:'#d51a18',emissiveIntensity:.24}),
  amber:material('Amber marker lenses','#c47b16',.32,.1,{emissive:'#ee8a13',emissiveIntensity:.18}),
  lamp:material('Headlamp lenses','#e5edf0',.15,.38),
  mud:material('Lower body road dust','#69645b',.95),
  label:material('Reflective white lettering','#e9ebe6',.55,.1),
};

function makeTruck(articulated=false) {
  const root=new THREE.Group();root.name=articulated?'Delivery tractor and articulated trailer':'Delivery rigid truck • gameplay footprint';
  root.userData={units:'metres',forward:'-Z',up:'+Y',reference:'Original geometry inspired by supplied truck photographs',variant:articulated?'tractor-trailer':'rigid',collisionHalfWidth:articulated?1.25:1.1};
  const W=articulated?2.48:2.2, front=articulated?-3.15:-2.7;
  const cabinBack=articulated?-.55:-.65;
  const cargoFront=articulated?1.1:-.65, cargoBack=articulated?13.5:3.65;
  const floor=articulated?1.45:1.2, top=articulated?4.1:3.7, cargoH=top-floor;
  const groups=new Map();
  function geo(name,g,m,pos=[0,0,0],rot=[0,0,0],parent=root,merge=true) {
    if(g.index) { const indexed=g; g=g.toNonIndexed(); indexed.dispose(); }
    const mesh=new THREE.Mesh(g,m);mesh.name=name;mesh.position.set(...pos);mesh.rotation.set(...rot);mesh.castShadow=true;mesh.receiveShadow=true;
    // Bucket by parent and material, retaining steering/spin transforms.
    mesh.updateMatrix();g.applyMatrix4(mesh.matrix);
    if(!groups.has(parent))groups.set(parent,new Map());
    const bucket=groups.get(parent);
    if(!bucket.has(m))bucket.set(m,[]);
    bucket.get(m).push(g);
    return mesh;
  }
  function box(name,size,pos,m,r=.015,parent=root) {
    return geo(name,r?new RoundedBoxGeometry(...size,2,Math.min(r,...size.map(n=>n/3))):new THREE.BoxGeometry(...size),m,pos,[0,0,0],parent,parent===root);
  }
  function rod(name,a,b,r,m,parent=root) {
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
    const g=new THREE.CylinderGeometry(r,r,delta.length(),10);
    const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
    g.applyQuaternion(q);return geo(name,g,m,start.add(end).multiplyScalar(.5).toArray(),[0,0,0],parent,parent===root);
  }
  const wheelRadius=articulated?.51:.48;
  const wheelCenters=articulated?[front+.9,.25,1.4,10.2,11.4,12.6]:[-1.65,2.45];
  for(const z of wheelCenters) {
    rod('Axle',[-W*.43,wheelRadius,z],[W*.43,wheelRadius,z],.085,mats.black);
    for(const side of [-1,1]) {
      const steering=new THREE.Group();steering.name=(z===wheelCenters[0]?'steer_':'axle_')+(side<0?'left_':'right_')+z;
      steering.position.set(side*(W/2-.12),wheelRadius,z);root.add(steering);
      const wheel=new THREE.Group();wheel.name='wheel_spin';steering.add(wheel);
      // Tire axis +X: turn steering group around Y, rotate wheel_spin around X.
      geo('Tire sidewall',new THREE.TorusGeometry(wheelRadius-.11,.115,12,48),mats.rubber,[0,0,0],[0,Math.PI/2,0],wheel,false);
      geo('Tread barrel',new THREE.CylinderGeometry(wheelRadius,wheelRadius,.255,48,1,true),mats.rubber,[0,0,0],[0,0,Math.PI/2],wheel,false);
      geo('Wheel rim',new THREE.CylinderGeometry(.292,.292,.27,32),mats.aluminum,[0,0,0],[0,0,Math.PI/2],wheel,false);
      geo('Hub',new THREE.CylinderGeometry(.12,.12,.31,24),mats.chrome,[0,0,0],[0,0,Math.PI/2],wheel,false);
      for(let i=0;i<10;i++){
        const a=i*Math.PI/5;
        geo('Wheel bolt',new THREE.CylinderGeometry(.022,.022,.3,6),mats.chrome,[0,Math.cos(a)*.19,Math.sin(a)*.19],[0,0,Math.PI/2],wheel,false);
      }
      // Three longitudinal grooves make real tire relief rather than painted bands.
      for(const x of [-.072,0,.072]) geo('Tread groove',new THREE.TorusGeometry(wheelRadius+.001,.008,4,48),mats.seal,[x,0,0],[0,Math.PI/2,0],wheel,false);
      geo('Curved wheel arch',new THREE.TorusGeometry(wheelRadius+.105,.07,8,40,Math.PI),mats.black,[side*(W/2+.005),wheelRadius,z],[0,Math.PI/2,0]);
      box('Mud flap',[.39,.46,.035],[side*(W/2-.12),.4,z+.6],mats.rubber,.006);
    }
  }
  // Ladder chassis, cross members, suspension and fuel tank.
  for(const x of [-.66,.66])box('Chassis rail',[.16,.24,cargoBack-front-.25],[x,.79,(cargoBack+front)/2],mats.black,.015);
  for(let z=front+.5;z<cargoBack;z+=.85)box('Chassis crossmember',[1.58,.12,.13],[0,.81,z],mats.black,.01);
  for(const side of [-1,1]){
    box('Fuel tank',[.34,.48,articulated?1.1:.62],[side*(W/2-.29),.75,articulated?-.15:.1],mats.aluminum,.09);
    rod('Fuel tank strap',[side*(W/2-.09),.55,-.16],[side*(W/2-.09),.95,-.16],.023,mats.black);
  }
  // Sculpted cab: rounded horizontal sections taper and sweep rearward
  // with height, rather than using one upright box for the entire shell.
  const cabLength=cabinBack-front;
  function loft(name,profiles,m) {
    const positions=[],indices=[],uv=[],segments=12;
    for(let j=0;j<profiles.length;j++){
      const {y,w,f,b,r}=profiles[j];
      const corners=[[-w/2+r,f+r,Math.PI],[w/2-r,f+r,-Math.PI/2],[w/2-r,b-r,0],[-w/2+r,b-r,Math.PI/2]];
      for(const [cx,cz,angle] of corners)for(let k=0;k<=segments;k++){
        const a=angle+k/segments*Math.PI/2;
        positions.push(cx+Math.cos(a)*r,y,cz+Math.sin(a)*r);
        uv.push((positions.length/3-1)%52/52,j/(profiles.length-1));
      }
    }
    const ring=4*(segments+1);
    for(let j=0;j<profiles.length-1;j++)for(let i=0;i<ring;i++){
      const a=j*ring+i,b=j*ring+(i+1)%ring,c=(j+1)*ring+i,d=(j+1)*ring+(i+1)%ring;
      indices.push(a,c,b,b,c,d);
    }
    // Section contours wind counter-clockwise in XZ, clockwise from above.
    for(let i=1;i<ring-1;i++){indices.push(0,i,i+1);const a=(profiles.length-1)*ring;indices.push(a,a+i+1,a+i);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
    return geo(name,g,m);
  }
  const bodyProfiles=[
    {y:1.19,w:W*.96,f:front+.015,b:cabinBack,r:.19},
    {y:1.35,w:W,f:front-.015,b:cabinBack,r:.24},
    {y:1.9,w:W,f:front+.015,b:cabinBack,r:.25},
    {y:2.24,w:W*.99,f:front+.07,b:cabinBack,r:.24},
    {y:2.36,w:W*.985,f:front+.1,b:cabinBack,r:.24},
    {y:2.78,w:W*.96,f:front+.235,b:cabinBack,r:.23},
    {y:3.12,w:W*.925,f:front+.39,b:cabinBack,r:.22},
    {y:3.23,w:W*.9,f:front+.46,b:cabinBack,r:.21},
  ];
  loft('Swept cab shell',bodyProfiles,mats.silver);
  function frontZ(y){
    for(let i=1;i<bodyProfiles.length;i++){
      if(y<=bodyProfiles[i].y){const a=bodyProfiles[i-1],b=bodyProfiles[i];return THREE.MathUtils.lerp(a.f,b.f,(y-a.y)/(b.y-a.y));}
    }
    return bodyProfiles.at(-1).f;
  }
  function face(name,width,y0,y1,offset,m,taper=.04){
    const pos=[],uv=[],idx=[],nx=24,ny=8;
    for(let j=0;j<=ny;j++){
      const t=j/ny,y=THREE.MathUtils.lerp(y0,y1,t);
      for(let i=0;i<=nx;i++){
        const u=i/nx,x=(u-.5)*width*(1-taper*t);
        pos.push(x,y,frontZ(y)-offset+.065*Math.pow(Math.abs(x)/(W*.5),4));uv.push(u,t);
      }
    }
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i;idx.push(a,a+nx+1,a+1,a+1,a+nx+1,a+nx+2);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();geo(name,g,m);
  }
  face('Swept panoramic windshield seal',W*.86,2.33,3.105,.018,mats.seal,.065);
  face('Curved inclined windshield',W*.805,2.385,3.05,.03,mats.glass,.055);
  rod('Windshield center mullion',[0,2.39,frontZ(2.39)-.046],[0,3.04,frontZ(3.04)-.046],.009,mats.seal);
  // Dark sun visor follows the windshield rake, with a rounded roof brow.
  box('Integrated roof brow',[W*.9,.075,.2],[0,3.13,front+.38],mats.silver,.035);
  face('Windshield sunshade band',W*.8,2.965,3.047,.038,mats.seal,.04);
  function sideShape(name,points,side,material,depth=.025,bevel=.018){
    const shape=new THREE.Shape(points.map(([z,y])=>new THREE.Vector2(-z,y)));
    const g=new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3,curveSegments:10});
    g.rotateY(Math.PI/2);
    g.translate(side*(W/2-.035)-(side<0?depth:0),0,0);
    return geo(name,g,material);
  }
  for(const side of [-1,1]){
    // Sloping A pillar and a broad rear window edge, as on a cab-over tractor.
    sideShape('Sculpted side window seal',[[front+.34,2.37],[front+.59,3.04],[cabinBack-.22,3.04],[cabinBack-.14,2.4]],side,mats.seal,.028,.025);
    sideShape('Side safety glass',[[front+.42,2.43],[front+.65,2.97],[cabinBack-.28,2.97],[cabinBack-.21,2.45]],side,mats.glass,.04,.017);
    // Door edge and pressed inset sit within the cab silhouette.
    sideShape('Door pressed panel',[[front+.27,1.5],[front+.29,2.24],[cabinBack-.18,2.24],[cabinBack-.18,1.48]],side,mats.silver,.012,.035);
    box('Door seam',[.015,1.5,.014],[side*(W/2-.012),2.2,cabinBack-.11],mats.seal,.003);
    box('Recessed handle',[.045,.065,.21],[side*(W/2+.009),2.24,cabinBack-.34],mats.black,.025);
    for(let i=0;i<2;i++)box('Cab access step',[.26,.075,.49],[side*(W/2+.045),.72+i*.22,cabinBack-.2],mats.aluminum,.025);
    // Lower side panels shaped around the front tire, rather than covering it.
    const axle=wheelCenters[0],r=wheelRadius+.16;
    const arch=new THREE.Shape();
    arch.moveTo(-(front+.17),1.45);arch.lineTo(-cabinBack,1.45);arch.lineTo(-cabinBack,.74);
    arch.lineTo(-(axle+r),.74);
    for(let i=0;i<=32;i++){const a=i/32*Math.PI;arch.lineTo(-(axle+Math.cos(a)*r),wheelRadius+Math.sin(a)*r);}
    arch.lineTo(-(front+.17),.68);arch.closePath();
    const archGeo=new THREE.ExtrudeGeometry(arch,{depth:.07,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:3});
    archGeo.rotateY(Math.PI/2);archGeo.translate(side*(W/2-.065)-(side<0?.07:0),0,0);geo('Wheel-cut lower cab skirt',archGeo,mats.silver);
    rod('Mirror top support',[side*(W/2-.09),3,front+.63],[side*(W/2+.27),2.92,front+.53],.024,mats.black);
    rod('Mirror lower support',[side*(W/2-.025),2.25,front+.45],[side*(W/2+.27),2.32,front+.51],.024,mats.black);
    box('Rounded mirror pod',[.18,.62,.27],[side*(W/2+.29),2.63,front+.48],mats.black,.075);
    box('Mirror glass',[.13,.49,.025],[side*(W/2+.29),2.64,front+.625],mats.chrome,.035);
    box('Side repeater',[.035,.055,.15],[side*(W/2+.01),2.03,front+.33],mats.amber,.016);
    box('Cab reflective stripe',[.02,.035,cabLength*.7],[side*(W/2+.01),1.97,(front+cabinBack)/2+.14],mats.amber,.006);
    rod('Windscreen wiper',[side*.1,2.39,frontZ(2.39)-.05],[side*.67,2.46,frontZ(2.46)-.05],.012,mats.black);
  }
  // A dark recessed upper band, tapered lower grille and tall corner lamps.
  face('Upper grille and badge band',W*.83,1.96,2.27,.025,mats.black,.02);
  for(const y of [2.01,2.19])face('Upper grille highlight',W*.78,y,y+.018,.045,mats.chrome,.015);
  rod('Diagonal grille accent',[-W*.2,2.025,frontZ(2.025)-.052],[W*.2,2.22,frontZ(2.22)-.052],.016,mats.chrome);
  face('Tapered lower intake',W*.72,1.23,1.86,.04,mats.seal,-.08);
  for(let i=0;i<5;i++)face('Recessed intake louvre',W*(.64+i*.013),1.29+i*.112,1.316+i*.112,.065,mats.black,0);
  loft('Wraparound bumper',[
    {y:.66,w:W*.94,f:front-.095,b:front+.46,r:.13},
    {y:.76,w:W*1.015,f:front-.14,b:front+.48,r:.18},
    {y:1.12,w:W*1.01,f:front-.1,b:front+.45,r:.18},
    {y:1.23,w:W*.965,f:front-.025,b:front+.41,r:.16},
  ],mats.black);
  box('Bumper center insert',[W*.55,.15,.06],[0,.91,front-.155],mats.black,.045);
  for(const side of [-1,1]){
    box('Vertical lamp pocket',[.25,.59,.12],[side*(W*.393),1.47,front+.02],mats.black,.075);
    box('Tall headlamp glass',[.18,.46,.07],[side*(W*.393),1.48,front-.055],mats.lamp,.045);
    for(let i=0;i<3;i++)box('Headlamp internal reflector',[.145,.06,.017],[side*(W*.393),1.32+i*.14,front-.095],mats.chrome,.018);
    box('Amber indicator lens',[.17,.065,.03],[side*(W*.393),1.72,front-.085],mats.amber,.018);
    box('Fog lamp',[.18,.075,.055],[side*(W*.38),.82,front-.16],mats.lamp,.026);
  }
  box('Front registration plate',[.4,.115,.026],[0,.75,front-.17],mats.amber,.009);
  // Smooth roof fairing rises gradually into the cargo box, with swept sides.
  loft('Swept aerodynamic roof fairing',[
    {y:3.19,w:W*.9,f:front+.46,b:cabinBack-.015,r:.21},
    {y:3.29,w:W*.925,f:front+.56,b:cabinBack-.015,r:.24},
    {y:3.46,w:W*.9,f:front+.82,b:cabinBack-.035,r:.25},
    {y:top-.15,w:W*.855,f:front+cabLength*.61,b:cabinBack-.07,r:.21},
    {y:top-.09,w:W*.81,f:front+cabLength*.67,b:cabinBack-.1,r:.17},
  ],mats.silver);

  // Cargo box has full geometry, roof ribs, aluminum rails and fasteners.
  const cargoLen=cargoBack-cargoFront, middle=(cargoBack+cargoFront)/2;
  box('Cargo body',[W,cargoH,cargoLen],[0,floor+cargoH/2,middle],mats.navy,.025);
  box('Cargo roof',[W+.035,.065,cargoLen+.035],[0,top+.025,middle],mats.aluminum,.012);
  for(let z=cargoFront+.13;z<cargoBack;z+=.15)box('Roof corrugation',[W-.07,.019,.022],[0,top+.068,z],mats.aluminum,.005);
  for(const side of [-1,1]){
    for(const y of [floor,top])box('Cargo edge rail',[.055,.065,cargoLen],[side*(W/2+.012),y,middle],mats.aluminum,.009);
    for(const z of [cargoFront,cargoBack])box('Corner extrusion',[.06,cargoH,.06],[side*(W/2+.017),floor+cargoH/2,z],mats.aluminum,.008);
    for(let z=cargoFront+.18;z<cargoBack;z+=.34){
      geo('Body rivet',new THREE.SphereGeometry(.012,5,4),mats.aluminum,[side*(W/2+.025),floor+.115,z]);
      geo('Body rivet',new THREE.SphereGeometry(.012,5,4),mats.aluminum,[side*(W/2+.025),top-.115,z]);
    }
    box('Side underrun rail',[.065,.1,cargoLen*.7],[side*(W/2-.015),.62,middle],mats.aluminum,.012);
    for(let z=cargoFront+.45;z<cargoBack;z+=1.2)box('Amber side marker',[.035,.065,.13],[side*(W/2+.049),floor-.055,z],mats.amber,.01);
    // Diagonal high-visibility side tape along the bottom rail.
    for(let z=cargoFront+.1;z<cargoBack;z+=.22)box('Reflective lower tape',[.014,.035,.11],[side*(W/2+.046),floor+.02,z],Math.floor(z*10)%2?mats.label:mats.amber,.001);
  }
  // Reference-inspired white roll-up rear, joints, fasteners, latch and bumper.
  const rear=cargoBack+.026;
  box('Rear perimeter seal',[W-.09,cargoH-.09,.03],[0,floor+cargoH/2,rear],mats.seal,.012);
  const panels=7, panelH=(cargoH-.19)/panels;
  for(let i=0;i<panels;i++){
    const y=floor+.1+panelH*(i+.5);
    box('Roll-up door panel',[W-.2,panelH-.012,.034],[0,y,rear+.022],mats.white,.006);
    for(const x of [-W*.26,W*.26]) {
      box('Roll-up door hinge',[.075,.027,.012],[x,y+panelH*.32,rear+.046],mats.aluminum,.003);
      for(const dx of [-.022,.022])geo('Door hinge rivet',new THREE.SphereGeometry(.008,5,4),mats.chrome,[x+dx,y+panelH*.32,rear+.055]);
    }
  }
  for(const side of [-1,1]){
    box('Rear pillar',[.075,cargoH+.08,.075],[side*(W/2-.025),floor+cargoH/2,rear+.025],mats.white,.008);
    box('Tail lamp bezel',[.105,.36,.055],[side*(W/2-.025),floor+.26,rear+.071],mats.seal,.02);
    box('Red tail lamp',[.073,.22,.038],[side*(W/2-.025),floor+.3,rear+.105],mats.red,.02);
    box('Reverse lamp',[.073,.075,.038],[side*(W/2-.025),floor+.14,rear+.105],mats.lamp,.012);
    box('Rear bumper reflector',[.19,.06,.02],[side*.75,.62,rear+.12],mats.red,.01);
  }
  box('Door lift handle',[.32,.035,.045],[0,floor+.22,rear+.085],mats.black,.01);
  rod('Latch arm',[-.24,floor+.17,rear+.075],[.18,floor+.23,rear+.075],.021,mats.chrome);
  box('Latch keeper',[.055,.14,.055],[.18,floor+.21,rear+.07],mats.black,.009);
  box('Rear top brake light',[.23,.07,.04],[0,top-.08,rear+.06],mats.red,.009);
  box('Rear black sill',[W+.06,.22,.1],[0,floor-.07,rear+.045],mats.black,.012);
  box('Rear underrun bumper',[W+.12,.14,.16],[0,.61,rear+.12],mats.aluminum,.018);
  for(const x of [-.72,.72])box('Bumper mount',[.1,.39,.11],[x,.79,rear-.12],mats.black,.01);
  box('Rear registration plate',[.38,.11,.018],[-.45,floor-.065,rear+.11],mats.white,.005);
  // Merge static geometry by material. Animated wheels keep their own hierarchy.
  for(const [parent,bucket] of groups) for(const [m,geometries] of bucket){
    const merged=mergeGeometries(geometries,false);
    if(!merged)throw new Error('Geometry merge failed: '+m.name);
    const mesh=new THREE.Mesh(merged,m);mesh.name=m.name;mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
    geometries.forEach(g=>g.dispose());
  }
  root.updateMatrixWorld(true);
  return root;
}

async function saveModel(name,object) {
  const exporter=new GLTFExporter();
  const binary=await exporter.parseAsync(object,{binary:true,onlyVisible:true});
  fs.writeFileSync(path.join(OUT,name),Buffer.from(binary));
  let triangles=0,meshes=0;
  object.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});
  const bounds=new THREE.Box3().setFromObject(object);
  return {file:name,triangles,meshes,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},bytes:binary.byteLength};
}
const report=[];
report.push(await saveModel('delivery-rigid-truck.glb',makeTruck(false)));
report.push(await saveModel('delivery-tractor-trailer.glb',makeTruck(true)));
function random(seed) {
  let state=seed>>>0;return()=>{state=(1664525*state+1013904223)>>>0;return state/4294967296;};
}
function forestTree(species,seed) {
 const rng=random(seed),root=new THREE.Group();root.name='Forest '+species;
 const buckets=new Map(),trunk=material('Bark • '+species,species==='birch'?'#d3cbb8':'#625242',.96);
 const greens=[material('Foliage • shade','#203c22',.92),material('Foliage • mid','#355736',.9),material('Foliage • sun','#506e3b',.9)];
 greens.forEach(m=>m.side=THREE.DoubleSide);
 function add(g,m){if(g.index){const old=g;g=g.toNonIndexed();old.dispose();}if(!buckets.has(m))buckets.set(m,[]);buckets.get(m).push(g);}
 function branch(a,b,r0,r1){
  const delta=b.clone().sub(a),g=new THREE.CylinderGeometry(r1,r0,delta.length(),7);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));g.translate(...a.clone().add(b).multiplyScalar(.5).toArray());add(g,trunk);
 }
 const H=species==='fir'?15.5:species==='pine'?13:11.8;
 branch(new THREE.Vector3(0,0,0),new THREE.Vector3(.14,H,0),.25,.025);
 // Each branch carries clusters of actual leaf/needle geometry. No alpha cards.
 const positions=[[],[],[]],normals=[[],[],[]],uvs=[[],[],[]];
 function leaf(center,length,width,direction,tone) {
   const axis=direction.clone().normalize(),cross=new THREE.Vector3().crossVectors(axis,new THREE.Vector3(.3,1,.1)).normalize().multiplyScalar(width);
   const tip=center.clone().addScaledVector(axis,length),base=center.clone().addScaledVector(axis,-length*.25);
   const left=center.clone().add(cross),right=center.clone().sub(cross),n=new THREE.Vector3().crossVectors(tip.clone().sub(left),base.clone().sub(left)).normalize();
   for(const v of [base,left,tip,base,tip,right]){positions[tone].push(v.x,v.y,v.z);normals[tone].push(n.x,n.y,n.z);}
   uvs[tone].push(.5,0,0,.5,.5,1,.5,0,.5,1,1,.5);
 }
 const levels=species==='birch'?10:16;
 for(let level=0;level<levels;level++) {
   const t=level/(levels-1),y=H*(species==='birch'?.34:.2)+t*H*(species==='birch'?.62:.76);
   const radius=species==='birch'?1.6+Math.sin(t*Math.PI)*1.2:(species==='fir'?3:3.25)*(1-t)*(.85+rng()*.2)+.15;
   const count=species==='birch'?5:7;
   for(let j=0;j<count;j++) {
     const angle=j/count*Math.PI*2+level*2.399+rng()*.5;
     const end=new THREE.Vector3(Math.cos(angle)*radius,y+(species==='birch'?1:.12+rng()*.55),Math.sin(angle)*radius);
     const start=new THREE.Vector3(0,y-.25,0);
     branch(start,end,.045*(1-t)+.012,.008);
     const clusters=species==='birch'?8:7;
     for(let k=0;k<clusters;k++){
       const along=.25+k/clusters*.8,anchor=start.clone().lerp(end,along);
       const side=new THREE.Vector3(-Math.sin(angle),.35,Math.cos(angle)).multiplyScalar((k%2?1:-1)*(.25+radius*.13));
       const twig=anchor.clone().add(side);branch(anchor,twig,.011,.003);
       for(let l=0;l<(species==='birch'?12:17);l++){
         const a=rng()*Math.PI*2,rr=Math.sqrt(rng())*(species==='birch'?.42:.34);
         const c=twig.clone().add(new THREE.Vector3(Math.cos(a)*rr,(rng()-.5)*.25,Math.sin(a)*rr));
         leaf(c,species==='birch'?.17:.27,species==='birch'?.065:.032,new THREE.Vector3(rng()-.5,rng()*.65-.1,rng()-.5),Math.floor(rng()*3));
       }
     }
   }
 }
 for(let i=0;i<3;i++){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions[i],3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals[i],3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs[i],2));add(g,greens[i]);}
 for(const [m,gs] of buckets){const mesh=new THREE.Mesh(mergeGeometries(gs,false),m);mesh.name=m.name;mesh.castShadow=true;root.add(mesh);gs.forEach(g=>g.dispose());}
 root.userData={units:'metres',seed,species,foliage:'Opaque leaf geometry, no alpha textures',lod:'Detailed source asset; make lower-detail variants for distant instances'};
 return root;
}
for(const [species,seed] of [['pine',714],['fir',291],['birch',911]]) report.push(await saveModel('forest-'+species+'.glb',forestTree(species,seed)));
{
 const root=new THREE.Group(),g=new THREE.IcosahedronGeometry(1,3),p=g.attributes.position,rng=random(129);
 const colors=[];
 for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
   // Position-based noise keeps shared vertices together.
   const n=1+.15*Math.sin(x*9+z*7)*Math.cos(y*8);
   p.setXYZ(i,x*n*1.5,Math.max(.02,(y*n+1)*.65),z*n);
   const shade=.3+.07*Math.sin(x*19+y*13+z*11)+(rng()-.5)*.025;colors.push(shade*1.06,shade,shade*.88);
 }
 g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();
 const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.98}));mesh.name='Weathered rock';root.add(mesh);
 report.push(await saveModel('roadside-rock.glb',root));
}
fs.writeFileSync(path.join(OUT,'model-stats.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
