const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../public/realism-assets');
test('opening the HTML directly explains how to launch instead of loading forever',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const bootstrap=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 const elements={status:{},error:{}},controls=[{},{}];
 vm.runInNewContext(bootstrap,{
  location:{protocol:'file:'},
  document:{getElementById:id=>elements[id],querySelectorAll:()=>controls},
  setTimeout:()=>{throw Error('File mode must not start loading');},
 });
 assert.equal(elements.status.textContent,'Start the local preview');
 assert.match(elements.error.innerHTML,/Start Preview.cmd/);
 assert.ok(controls.every(control=>control.disabled));
});
test('every browser-module import is present in the downloadable viewer',()=>{
 const visited=new Set();
 function walk(file){
  if(visited.has(file))return;
  assert.ok(fs.existsSync(file),'Missing module: '+file);visited.add(file);
  const source=fs.readFileSync(file,'utf8');
  for(const match of source.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)){
   const spec=match[1];
   const target=spec==='three'?path.join(root,'vendor/three.module.js'):spec.startsWith('three/addons/')?path.join(root,'vendor/addons',spec.slice('three/addons/'.length)):spec.startsWith('.')?path.resolve(path.dirname(file),spec):null;
   if(target)walk(target);
  }
 }
 walk(path.join(root,'viewer.js'));
 assert.ok(visited.has(path.join(root,'vendor/addons/utils/SkeletonUtils.js')));
});
