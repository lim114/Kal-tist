const {execFile,spawn}=require('child_process'),path=require('path'),fs=require('fs');
const run=(file,args)=>new Promise((resolve,reject)=>execFile(file,args,{windowsHide:true,env:{...process.env,PSModulePath:path.join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','Modules')+';'+path.join(process.env.ProgramFiles||'C:\\Program Files','WindowsPowerShell','Modules')}},(e,out)=>e?reject(e):resolve(out)));
async function setAutostart(root,enabled){
 const launcher=path.join(root,'EsperantaLauncher.exe');await run(launcher,[enabled?'--configure=on':'--configure=off']);
 if(enabled)spawn(launcher,['--watch'],{windowsHide:true,detached:true,stdio:'ignore'}).unref();
}
async function codexOpen(){
 try{const out=await run('powershell.exe',['-NoProfile','-NonInteractive','-Command',"@(Get-Process ChatGPT -ErrorAction SilentlyContinue | Where-Object {$_.Path -match '\\\\OpenAI\\.Codex_[^\\\\]+\\\\app\\\\ChatGPT\\.exe$'}).Count"]);return Number(out.trim())>0}catch{return false}
}
module.exports={setAutostart,codexOpen};
