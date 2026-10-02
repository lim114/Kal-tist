import{targets,transitions,transitionPose,loopPose}from'./choreography.js';
export class GestureController{
 constructor(){this.state='idle';this.desired='idle';this.time=0;this.current=targets.idle.slice();this.transition=null}
 request(s){if(s==='review')s='thinking';if((targets[s]&&transitions['idle>'+s])||s==='idle')this.desired=s}
 update(dt){if(!this.transition&&this.state!==this.desired){const key=this.state+'>'+this.desired;this.transition={key,to:this.desired,time:0,start:this.current.slice(),duration:transitions[key].duration}}
  if(this.transition){const tr=this.transition;tr.time+=dt;this.current=transitionPose(tr.key,tr.time/tr.duration,tr.start);if(tr.time>=tr.duration){this.state=tr.to;this.transition=null;this.time=0}}
  else{this.time+=dt;this.current=loopPose(this.state,this.state==='wave'?this.time%3.2:this.time)}return this.current;
 }
}
