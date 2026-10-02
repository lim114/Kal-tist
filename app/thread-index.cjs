const fs=require('fs'),path=require('path');
function readThreads(home){
 let db;
 try{const {DatabaseSync}=require('node:sqlite'),file=fs.readdirSync(home).filter(n=>/^state_\d+\.sqlite$/.test(n)).sort((a,b)=>Number(b.match(/\d+/)[0])-Number(a.match(/\d+/)[0]))[0];
  if(!file)return [];db=new DatabaseSync(path.join(home,file),{readOnly:true});
  return db.prepare("SELECT id, COALESCE(NULLIF(name,''),title) AS title,cwd,rollout_path,updated_at FROM threads WHERE archived=0 AND (agent_path IS NULL OR agent_path IN ('','/root')) AND source NOT LIKE '%subagent%' AND source NOT LIKE '%subAgent%' ORDER BY updated_at DESC LIMIT 80").all();
 }catch{return []}finally{db?.close()}
}
module.exports={readThreads};
