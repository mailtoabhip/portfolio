const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
test('favicon animation preserves React metadata nodes during navigation',()=>{
 let effect,interval,cleanup;
 function icon(owned=false){
  const attributes={href:'/favicon.gif',type:'image/gif'};
  return {isConnected:true,attributes,getAttribute:n=>attributes[n]??null,setAttribute:(n,v)=>{attributes[n]=v;},removeAttribute:n=>{delete attributes[n];},
   set href(v){attributes.href=v;},set type(v){attributes.type=v;},remove(){assert.ok(owned,'Must not remove framework-owned icons');this.isConnected=false;}};
 }
 const frameworkIcon=icon(),icons=[frameworkIcon];
 const context={exports:{},navigator:{userAgent:'Chrome'},Image:class{},document:{
  querySelector:()=>null,createElement:()=>icon(true),head:{appendChild:i=>icons.push(i)},querySelectorAll:()=>icons.filter(i=>i.isConnected),
 },window:{matchMedia:()=>({matches:false}),setInterval:f=>{interval=f;return 1;},clearInterval:()=>{}},require:name=>name==='react'?{useEffect:f=>{effect=f;}}:require(name)};
 const source=fs.readFileSync(path.join(__dirname,'../src/components/FaviconCycler.tsx'),'utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017}}).outputText,context);
 context.exports.default();cleanup=effect();interval();
 assert.ok(frameworkIcon.isConnected);assert.match(frameworkIcon.attributes.href,/fav-[01]\.png/);
 cleanup();assert.ok(frameworkIcon.isConnected);assert.equal(frameworkIcon.attributes.href,'/favicon.gif');assert.equal(icons[1].isConnected,false);
});
