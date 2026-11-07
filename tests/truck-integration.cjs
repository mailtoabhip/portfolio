const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
function load(name){
 const source=fs.readFileSync(path.join(__dirname,'../src/lib',name+'.ts'),'utf8');
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 const context={exports:{},require};vm.runInNewContext(compiled,context);return context.exports;
}
test('rigid exterior endpoints match the existing delivery collision footprint',()=>{
 const {fitTruck}=load('truckFit');
 const stats=JSON.parse(fs.readFileSync(path.join(__dirname,'../public/realism-assets/model-stats.json'),'utf8'))[0];
 const {min,max}=stats.bounds;
 const fit=fitTruck(min[2],max[2],min[1],2.7,3.8);
 assert.ok(Math.abs(min[2]*fit.scaleZ+fit.z+2.7)<1e-10);
 assert.ok(Math.abs(max[2]*fit.scaleZ+fit.z-3.8)<1e-10);
 assert.equal(min[1]+fit.y,0);
 assert.throws(()=>fitTruck(1,1,0,2.7,3.8));
});
test('camera toggle waits for the asset and a load failure restores the cabin',()=>{
 const {useTruckView}=load('truckView');
 const store=useTruckView.getState;
 store().toggle();assert.equal(store().mode,'cabin');
 store().setAsset('ready');store().toggle();assert.equal(store().mode,'chase');
 store().toggle();assert.equal(store().mode,'cabin');
 store().toggle();store().setAsset('error');assert.equal(store().mode,'cabin');
 store().toggle();assert.equal(store().mode,'cabin');
});
