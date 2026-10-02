// Separate, direction-specific pose paths, sourced from the official poses.
// Every point is a progress fraction between original rig poses, not an invented
// garment patch or image opacity blend. Original attachments and UVs are retained.
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(10+t*(-15+6*t))};
const path=(points,t)=>{for(let i=1;i<points.length;i++)if(t<=points[i][0]){const[a,x]=points[i-1],[b,y]=points[i];return x+(y-x)*smooth((t-a)/(b-a))}return 1};
export const nativeTransitions={
 'Relax>Sit':{duration:1.15,label:'屈膝降重心 → 收拢坐定',lower:[[0,0],[.3,.32],[.7,.94],[1,1]],upper:[[0,0],[.3,.12],[.7,.78],[1,1]]},
 'Sit>Relax':{duration:1.25,label:'坐姿前移重心 → 伸腿站稳 → 上身舒展',lower:[[0,0],[.25,.08],[.73,.92],[1,1]],upper:[[0,0],[.25,.24],[.73,.8],[1,1]]},
 'Sit>Move':{duration:.55,label:'起身 → 迈步',lower:[[0,0],[.45,.55],[1,1]],upper:[[0,0],[.45,.28],[1,1]]},
 'Relax>Move':{duration:.32,label:'重心进入步态',lower:[[0,0],[.4,.6],[1,1]],upper:[[0,0],[.4,.25],[1,1]]},
 'Move>Relax':{duration:.48,label:'收步 → 放松站稳',lower:[[0,0],[.5,.85],[1,1]],upper:[[0,0],[.5,.4],[1,1]]}
};
const attrs=['x','y','rotation','scaleX','scaleY','shearX','shearY'];
const constraintAttrs=['mix','softness','rotateMix','translateMix','scaleMix','shearMix','position','spacing'];
const color=c=>c?{r:c.r,g:c.g,b:c.b,a:c.a}:null;
function capture(sk){return{bones:sk.bones.map(b=>attrs.map(k=>b[k])),slots:sk.slots.map(s=>({attachment:s.attachment,deform:s.deform.slice(),color:color(s.color),dark:color(s.darkColor)})),order:sk.drawOrder.map(s=>s.data.index),constraints:['ikConstraints','transformConstraints','pathConstraints'].map(k=>(sk[k]||[]).map(c=>Object.fromEntries(constraintAttrs.filter(a=>typeof c[a]==='number').map(a=>[a,c[a]]))))}}
function applyBlend(sk,a,b,u,profile){
 const whole=smooth(u),lower=profile?path(profile.lower,u):whole,upper=profile?path(profile.upper,u):whole;
 for(let i=0;i<sk.bones.length;i++){const bone=sk.bones[i],weight=/Calf|Foot|Thigh|Leg|Pelvis|Hip/.test(bone.data.name)?lower:/Head|Neck|Chest|Arm|Forearm|Hand|Finger|Hair|Ear/.test(bone.data.name)?upper:whole;attrs.forEach((k,j)=>{let diff=b.bones[i][j]-a.bones[i][j];if(k==='rotation'||k.startsWith('shear'))diff=((diff+180)%360+360)%360-180;bone[k]=a.bones[i][j]+diff*weight})}
 // One coherent native slot order at a time; never raise a whole skin arm layer.
 const useIncoming=u>=.5,selected=useIncoming?b:a;
 for(let i=0;i<sk.slots.length;i++){const s=sk.slots[i],x=a.slots[i],y=b.slots[i],chosen=selected.slots[i];s.setAttachment(chosen.attachment);for(const k of ['r','g','b','a'])s.color[k]=x.color[k]+(y.color[k]-x.color[k])*whole;if(s.darkColor&&x.dark&&y.dark)for(const k of ['r','g','b','a'])s.darkColor[k]=x.dark[k]+(y.dark[k]-x.dark[k])*whole;
  if(x.attachment===y.attachment){const n=Math.max(x.deform.length,y.deform.length);s.deform.length=n;for(let j=0;j<n;j++)s.deform[j]=(x.deform[j]||0)*(1-whole)+(y.deform[j]||0)*whole}else{s.deform.length=chosen.deform.length;for(let j=0;j<chosen.deform.length;j++)s.deform[j]=chosen.deform[j]}}
 sk.drawOrder=selected.order.map(i=>sk.slots[i]);
 ['ikConstraints','transformConstraints','pathConstraints'].forEach((k,i)=>(sk[k]||[]).forEach((c,j)=>{for(const key of Object.keys(b.constraints[i][j]))c[key]=a.constraints[i][j][key]+(b.constraints[i][j][key]-a.constraints[i][j][key])*whole}));
}
export class OfficialMotion{
 constructor(spine,data){this.spine=spine;this.data=data;this.scratch=new spine.Skeleton(data);this.key=null;this.time=0;this.last=null;this.transition=null}
 resetRelax(){this.scratch.setToSetupPose();this.data.findAnimation('Relax').apply(this.scratch,0,0,false,[],1,this.spine.MixBlend.replace,this.spine.MixDirection.mixIn);this.key='Relax';this.time=0;this.last=capture(this.scratch);this.transition=null}
 render(sk,clip,dt,custom='idle'){
  const key=clip||custom;
  if(key!==this.key){const route=(this.key||'Relax')+'>'+key,profile=nativeTransitions[route]||(this.key==='Sit'&&!clip?nativeTransitions['Sit>Relax']:null);const reflected=(this.key==='Sleep'||key==='Sleep');this.transition=this.last&&!reflected?{from:this.last,route,time:0,duration:profile?.duration||.48,profile}:null;this.key=key;this.time=0}
  this.time+=dt;
  if(clip){sk.setToSetupPose();this.data.findAnimation(clip).apply(sk,0,this.time,true,[],1,this.spine.MixBlend.replace,this.spine.MixDirection.mixIn)}
  const target=capture(sk);
  if(this.transition){const tr=this.transition;tr.time+=dt;applyBlend(sk,tr.from,target,Math.min(1,tr.time/tr.duration),tr.profile);if(tr.time>=tr.duration)this.transition=null}
  this.last=capture(sk);return this.info();
 }
 info(){return{clip:this.key,time:this.time,transition:this.transition?{route:this.transition.route,progress:this.transition.time/this.transition.duration,label:this.transition.profile?.label||'收势 → 进入当前动作'}:null}}
}
