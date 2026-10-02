const {execFile,spawn}=require('child_process'),path=require('path'),fs=require('fs');
const run=(file,args)=>new Promise((resolve,reject)=>execFile(file,args,{windowsHide:true},(e,out)=>e?reject(e):resolve(out)));
async function setAutostart(root,enabled){
 const key='HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',name='EsperantaCodexCompanion';
 if(enabled){const launcher=path.join(root,'随Codex启动.vbs');await run('reg.exe',['add',key,'/v',name,'/t','REG_SZ','/d',`wscript.exe "${launcher}"`,'/f']);spawn('wscript.exe',[launcher],{windowsHide:true,detached:true,stdio:'ignore'}).unref()}
 else{try{await run('reg.exe',['delete',key,'/v',name,'/f'])}catch(e){if(e.code!==1)throw e}}
}
async function codexOpen(){
 try{const out=await run('powershell.exe',['-NoProfile','-NonInteractive','-Command',"@(Get-Process ChatGPT -ErrorAction SilentlyContinue | Where-Object {$_.Path -match '\\\\OpenAI\\.Codex_[^\\\\]+\\\\app\\\\ChatGPT\\.exe$'}).Count"]);return Number(out.trim())>0}catch{return false}
}
module.exports={setAutostart,codexOpen};
