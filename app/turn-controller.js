const clamp=t=>Math.max(0,Math.min(1,t)),ease=t=>{t=clamp(t);return t*t*(3-2*t)},pulse=(u,a,b)=>u<a||u>b?0:Math.sin(Math.PI*(u-a)/(b-a));
const curve=(points,t)=>{for(let i=1;i<points.length;i++)if(t<=points[i][0]){const[a,x]=points[i-1],[b,y]=points[i];return x+(y-x)*ease((t-a)/(b-a))}return points.at(-1)[1]};
export class TurnController{
 constructor(spine,data,facing=1){this.facing=facing;this.desired=facing;this.turn=null;
  const sk=new spine.Skeleton(data);data.findAnimation('Interact').apply(sk,0,.97,false,[],1,spine.MixBlend.replace,spine.MixDirection.mixIn);
  this.attrs=['x','y','rotation','scaleX','scaleY','shearX','shearY'];this.eyes=sk.bones.filter(b=>/^F_[LR]_(Eye|Eyebrow)/.test(b.data.name)).map(b=>({index:b.data.index,values:this.attrs.map(k=>b[k])}));this.eyeSlots=sk.slots.filter(s=>/^F_[LR]_Eye/.test(s.data.name)).map(s=>({index:s.data.index,attachment:s.attachment,deform:s.deform.slice()}));
 }
 reset(facing=1){this.facing=facing;this.desired=facing;this.turn=null}
 update(dt,desired,{allowed=true,walking=false}={}){
  this.desired=desired<0?-1:1;
  if(!this.turn&&allowed&&this.desired!==this.facing)this.turn={from:this.facing,to:this.desired,time:0,duration:walking?.56:.78,pivot:.48,walking};
  if(this.turn){const tr=this.turn;tr.time+=dt;if(tr.time/tr.duration>=tr.pivot)this.facing=tr.to;if(tr.time>=tr.duration)this.turn=null}
  return this.facing;
 }
 apply(sk){const tr=this.turn;if(!tr)return;const u=clamp(tr.time/tr.duration),side=this.facing,goal=tr.to;
  // Eyes/head lead, weight shifts over a supporting foot, then the second foot
  // completes the turn. Hair/ears settle later. The sprite never scales to zero.
  const head=curve([[0,0],[.23,1],[.48,1],[.78,.25],[1,0]],u),weight=pulse(u,.1,.9),settle=pulse(u,.5,1);
  const shift=(name,x,y)=>{const b=sk.findBone(name);if(b){b.x+=x;b.y+=y}};
  shift('F_Head_TF',goal*side*9*head,-1.2*head);
  shift('F_Waist',goal*side*5*weight,-2.8*weight);
  sk.findBone('F_Head').rotation+=goal*side*2.2*head;
  sk.findBone('F_Chest').rotation+=goal*side*1.4*weight;
  // Original leg IK targets move the feet without changing native layer order.
  const lead=tr.from>0?'F_R_Leg_IK':'F_L_Leg_IK',follow=tr.from>0?'F_L_Leg_IK':'F_R_Leg_IK';
  shift(lead,goal*side*4*pulse(u,.12,.54),7*pulse(u,.12,.54));
  shift(follow,-goal*side*3*pulse(u,.48,.93),5*pulse(u,.48,.93));
  for(const name of ['F_L_Ear','F_R_Ear'])sk.findBone(name).rotation+=goal*side*2.5*settle;
  const blink=curve([[0,0],[.23,0],[.39,1],[.56,1],[.74,0],[1,0]],u);
  if(blink){for(const r of this.eyes){const b=sk.bones[r.index];this.attrs.forEach((k,i)=>b[k]+=(r.values[i]-b[k])*blink)}for(const r of this.eyeSlots){const s=sk.slots[r.index];if(s.attachment!==r.attachment){if(blink>.99)s.setAttachment(r.attachment);else continue}const n=Math.max(s.deform.length,r.deform.length);for(let i=0;i<n;i++)s.deform[i]=(s.deform[i]||0)*(1-blink)+(r.deform[i]||0)*blink}}
 }
 info(){const tr=this.turn;return{facing:this.facing,desired:this.desired,active:!!tr,from:tr?.from,to:tr?.to,progress:tr?tr.time/tr.duration:1,phase:tr?(tr.time/tr.duration<.3?'视线先行、移重心':tr.time/tr.duration<.56?'换脚转向':'落脚、耳发回稳'):null}}
}
