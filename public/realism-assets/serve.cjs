const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=__dirname;
const types={'.html':'text/html','.js':'text/javascript','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.json':'application/json'};
const url='http://127.0.0.1:3118/';
const server=http.createServer((req,res)=>{
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
 const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.stat(file,(error,stat)=>{if(error||!stat.isFile()){res.writeHead(404).end();return;}
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':stat.size});
 fs.createReadStream(file).pipe(res);});
});
function openPreview(){
 if(process.argv.includes('--open')&&process.platform==='win32'){
  const child=require('node:child_process').spawn('rundll32.exe',['url.dll,FileProtocolHandler',url],{windowsHide:true,stdio:'ignore'});
  child.on('error',()=>console.log('Open '+url+' in your browser.'));
 }
}
server.on('error',error=>{
 if(error.code==='EADDRINUSE'){console.error('Port 3118 is already in use. If the preview is already running, open '+url+'. Otherwise close the other server and try again.');}
 else console.error('Preview server could not start: '+error.message);
 process.exitCode=1;
});
server.listen(3118,'127.0.0.1',()=>{console.log('Asset preview: '+url+'\nKeep this window open while reviewing the assets.');openPreview();});
