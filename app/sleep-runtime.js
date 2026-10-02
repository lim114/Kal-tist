import {SleepBridge} from './sleep-bridge.js';
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*x*(10+x*(-15+6*x))};
// Policy is independent of the geometry: all wake targets remain live while
// the approved bridge returns to Relax. No stale task is replayed afterwards.
export class SleepRuntime{
 constructor(spine,data){this.bridge=new SleepBridge(spine,data);this.phase='awake';this.time=0;this.facing=1;this.forcedWake=false;this.detail=null;}
 get busy(){return this.phase!=='awake'}
 get ownsPose(){return this.busy&&this.phase!=='prepare'}
 wake(){this.forcedWake=true}
 setPhase(phase,time=0){this.phase=phase;this.time=time}
 update(wanted,dt,facing,sk){
  const sleep=wanted&&!this.forcedWake;let released=false;
  if(this.phase==='awake'){
   if(sleep){this.facing=facing;this.setPhase('prepare')}
   else if(!wanted)this.forcedWake=false;
  }else if(this.phase==='prepare'){
   if(!sleep){this.from=this.bridge.captureSkeleton(sk,'Relax',this.facing);this.setPhase('abort')}
  }else if(this.phase==='align'){
   if(!sleep){this.from=this.bridge.captureSkeleton(sk,'Relax',this.facing);this.setPhase('abort')}
   else{this.time+=dt;if(this.time>=.22)this.setPhase('down')}
  }else if(this.phase==='down'){
   if(!sleep){const t=this.time;this.setPhase('up',t<=1.1?2.3+(1-t/1.1)*1.25:t<1.32?2.05+(1.32-t)/.22*.25:(1-(t-1.32)/1.93)*2.05)}
   else{this.time+=dt;if(this.time>=3.25)this.setPhase('asleep')}
  }else if(this.phase==='asleep'){
   if(!sleep){this.from=this.bridge.captureSkeleton(sk,'Sleep',this.facing);this.setPhase('wake-align')}
   else this.time+=dt;
  }else if(this.phase==='wake-align'){
   this.time+=dt;if(this.time>=.18)this.setPhase('up');
  }else if(this.phase==='up'){
   this.time+=dt;if(this.time>=3.55)this.setPhase('handoff');
  }else if(this.phase==='abort'){
   this.time+=dt;if(this.time>=.22)this.setPhase('handoff');
  }else if(this.phase==='handoff'){
   this.setPhase('awake');this.forcedWake=false;released=true;
  }
  return{busy:this.busy,ownsPose:this.ownsPose,clip:this.phase==='prepare'||this.phase==='handoff'?'Relax':this.busy?'Sleep':null,released};
 }
 finishFrame(sk,official,ready){
  if(this.phase==='prepare'){
   if(ready&&official.clip==='Relax'&&!official.transition){this.from=this.bridge.captureSkeleton(sk,'Relax',this.facing);this.setPhase('align')}
   return;
  }
  if(!this.ownsPose)return;
  const bridge=this.bridge,side={facing:this.facing};
  if(this.phase==='align'||this.phase==='abort')bridge.apply(sk,this.from,bridge.keys.Relax,ease(this.time/.22),side);
  else if(this.phase==='wake-align')bridge.apply(sk,this.from,bridge.keys.Sleep,ease(this.time/.18),side);
  else if(this.phase==='down'||this.phase==='up')this.detail=bridge.render(sk,this.time,{direction:this.phase,facing:this.facing});
  else if(this.phase==='asleep')this.detail=bridge.loop(sk,'Sleep',this.time,this.facing);
  else if(this.phase==='handoff')bridge.apply(sk,bridge.keys.Relax,bridge.keys.Relax,0,side);
 }
 info(){return{phase:this.phase,time:this.time,facing:this.facing,busy:this.busy,segment:this.detail?.segment||null}}
}
