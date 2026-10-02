const {execFile,spawn}=require('child_process');
const fs=require('fs'),path=require('path');
const query=key=>new Promise(resolve=>execFile('reg.exe',['query',key,'/ve'],{windowsHide:true,encoding:'utf8'},(e,out)=>resolve(e?null:out.match(/REG_SZ\s+(.+)/)?.[1]?.trim())));
async function openNetEase(){
 let exe=null;for(const key of ['HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\cloudmusic.exe','HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\cloudmusic.exe','HKLM\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\App Paths\\cloudmusic.exe']){const v=await query(key);if(v){const p=v.replace(/^"|"$/g,'');if(path.isAbsolute(p)&&path.basename(p).toLowerCase()==='cloudmusic.exe'&&fs.existsSync(p)){exe=p;break}}}
 if(!exe)throw Error('未找到网易云客户端，请先安装或启动网易云音乐。');
 await new Promise((resolve,reject)=>{const c=spawn(exe,['--remote-debugging-address=127.0.0.1','--remote-debugging-port=19263'],{detached:true,stdio:'ignore',windowsHide:false});c.once('error',reject);c.once('spawn',()=>{c.unref();resolve()})});
}
module.exports={openNetEase};
