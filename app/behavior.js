// Monotonic wall time drives the policy; rendering FPS must not change 30s/5min.
export class PetBehavior {
 constructor(random=Math.random){this.random=random;this.since=null;this.next=0;this.clip='Relax';this.facing=1;this.decisions=[]}
 reset(){this.since=null;this.next=0;this.clip='Relax';this.decisions=[]}
 direction(dx){if(Math.abs(dx)>=1)this.facing=dx<0?-1:1;return this.facing}
 update(now,{base='idle',dragging=false,interaction=false}={}){
  if(dragging||interaction||base!=='idle'){this.reset();return dragging?'Move':null}
  if(this.since===null){this.since=now;this.next=now+30000}
  // Sleep wins over the random decision at the five-minute boundary.
  if(now-this.since>=300000){this.clip='Sleep';return this.clip}
  while(now>=this.next){const change=this.random()<.5;this.decisions.push({at:this.next-this.since,change});if(change)this.clip=this.clip==='Relax'?'Sit':'Relax';this.next+=30000}
  return this.clip;
 }
 info(now){return{clip:this.clip,idleSeconds:this.since===null?0:(now-this.since)/1000,nextDecisionSeconds:this.clip==='Sleep'||this.since===null?null:Math.max(0,(this.next-now)/1000),facing:this.facing,decisions:this.decisions.slice()}}
}
export function resolveBase({manual=null,input=false,waiting=false,running=false,error=false}={}){
 if(manual)return manual==='review'?'thinking':manual;
 return input?'typing':waiting?'waiting':running?'thinking':error?'error':'idle';
}
