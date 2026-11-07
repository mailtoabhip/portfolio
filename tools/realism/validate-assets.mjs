import fs from 'node:fs';
import path from 'node:path';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const dir=path.resolve('public/realism-assets');
const reports=JSON.parse(fs.readFileSync(path.join(dir,'model-stats.json'),'utf8'));
for(const report of reports){
 const bytes=fs.readFileSync(path.join(dir,report.file));
 if(bytes.toString('ascii',0,4)!=='glTF'||bytes.readUInt32LE(4)!==2||bytes.readUInt32LE(8)!==bytes.length)throw Error('Invalid GLB header: '+report.file);
 const array=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
 const model=await new GLTFLoader().parseAsync(array,'');
 let triangles=0,meshes=0,spins=0;
 model.scene.traverse(o=>{
  if(o.name==='wheel_spin'||o.name.startsWith('wheel_spin_'))spins++;
  if(!o.isMesh)return;
  meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;
  for(const key of ['position','normal'])for(const v of o.geometry.attributes[key].array)if(!Number.isFinite(v))throw Error('Invalid '+key);
 });
 if(triangles!==report.triangles||meshes!==report.meshes)throw Error('Export mismatch: '+report.file);
 if(report.file.includes('truck')&&spins<4)throw Error('Missing wheel pivots');
 console.log('PASS '+report.file+' — '+triangles+' triangles, '+meshes+' meshes, '+spins+' wheel pivots');
}
