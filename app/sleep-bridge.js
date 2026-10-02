// User-approved sleep bridge (2026-09-30). No edits to the source skeleton, weights, atlas or layers.
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{x=clamp(x);return x*x*x*(10+x*(-15+6*x))};
const lerp=(a,b,t)=>a+(b-a)*t;
const angle=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
const matrix=b=>({a:b.a,b:b.b,c:b.c,d:b.d,x:b.worldX,y:b.worldY});
const det=m=>m.a*m.d-m.b*m.c;
function relative(m,p){
 if(!p)return m;const z=det(p),a=p.d/z,b=-p.b/z,c=-p.c/z,d=p.a/z,x=m.x-p.x,y=m.y-p.y;
 return{a:a*m.a+b*m.c,b:a*m.b+b*m.d,c:c*m.a+d*m.c,d:c*m.b+d*m.d,x:a*x+b*y,y:c*x+d*y};
}
function compose(m,p){if(!p)return m;return{a:p.a*m.a+p.b*m.c,b:p.a*m.b+p.b*m.d,c:p.c*m.a+p.d*m.c,d:p.c*m.b+p.d*m.d,x:p.a*m.x+p.b*m.y+p.x,y:p.c*m.x+p.d*m.y+p.y}}
function split(m){const sx=Math.hypot(m.a,m.c);return{x:m.x,y:m.y,r:Math.atan2(m.c,m.a),sx,sy:det(m)/sx,k:(m.a*m.b+m.c*m.d)/sx}}
function join(m){const c=Math.cos(m.r),s=Math.sin(m.r);return{a:c*m.sx,b:c*m.k-s*m.sy,c:s*m.sx,d:s*m.k+c*m.sy,x:m.x,y:m.y}}
function mix(a,b,t){
 // Capture converts native reflection/FFD together; all solved body and
 // attachment bases therefore have the same handedness before interpolation.
 const same=Math.sign(a.sy)===Math.sign(b.sy);
 const sy=same?Math.sign(a.sy)*Math.exp(lerp(Math.log(Math.abs(a.sy)),Math.log(Math.abs(b.sy)),t)):lerp(a.sy,b.sy,t);
 return join({x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t),r:angle(a.r,b.r,t),sx:Math.exp(lerp(Math.log(a.sx),Math.log(b.sx),t)),sy,k:lerp(a.k,b.k,t)});
}
export class SleepBridge{
 constructor(spine,data){this.spine=spine;this.data=data;this.source=new spine.Skeleton(data);this.parents=data.bones.map(b=>b.parent?.index??-1);this.keys={};for(const name of ['Relax','Sit','Sleep'])this.keys[name]=this.capture(name,0);this.reflections=this.keys.Sit.bones.map((b,i)=>Math.sign(b.sy)!==Math.sign(this.keys.Sleep.bones[i].sy)?data.bones[i].name:null).filter(Boolean);}
 capture(clip,time){
  const sk=this.source;sk.setToSetupPose();sk.scaleX=clip==='Sleep'?-1:1;sk.scaleY=1;
  this.data.findAnimation(clip).apply(sk,0,time,true,[],1,this.spine.MixBlend.replace,this.spine.MixDirection.mixIn);sk.updateWorldTransform();
  return this.captureSkeleton(sk,clip);
 }
 captureSkeleton(sk,clip="runtime",facing=1){
  const original=sk.bones.map(b=>{const m=matrix(b);m.a*=facing;m.b*=facing;m.x*=facing;return m}),world=original.map(m=>({...m}));
  // A few native hair/ribbon meshes change coordinate handedness as well as FFD.
  // Convert BOTH the solved bone basis and its vertex coordinates. Interpolating
  // a negative bone axis while leaving native FFD in the old basis flattens it.
  for(const m of world)if(det(m)<0){m.b=-m.b;m.d=-m.d;}
  // These three coordinate containers have no artwork. Keep their basis stable;
  // the first visible pelvis bone receives the exact relative target instead.
  for(let i=0;i<3;i++){world[i].a=1;world[i].b=0;world[i].c=0;world[i].d=1;}
  const bones=world.map((m,i)=>split(relative(m,this.parents[i]<0?null:world[this.parents[i]])));
  const change=world.map((m,i)=>relative(original[i],m));
  const slots=sk.slots.map(s=>{
   const a=s.attachment,deform=s.deform.slice();
   if(a?.worldVerticesLength){
    const v=a.vertices,transform=(index,x,y)=>{const m=change[index];return[m.a*x+m.b*y+m.x,m.c*x+m.d*y+m.y]};
    if(!a.bones){const before=deform.length?deform.slice():Array.from(v);deform.length=before.length;for(let j=0;j<before.length;j+=2){const p=transform(s.bone.data.index,before[j],before[j+1]);deform[j]=p[0];deform[j+1]=p[1];}}
    else{let bi=0,vi=0,di=0;const before=deform.slice();deform.length=v.length/3*2;while(bi<a.bones.length){const n=a.bones[bi++];for(let q=0;q<n;q++,vi+=3,di+=2){const p=transform(a.bones[bi++],v[vi]+(before[di]||0),v[vi+1]+(before[di+1]||0));deform[di]=p[0]-v[vi];deform[di+1]=p[1]-v[vi+1];}}}
   }
   // Native long hair/ribbon turns are distributed from root to tip. Use the
   // original vertex positions to keep each influence of a vertex synchronous.
   let phase=null;
   if(a?.worldVerticesLength&&/^(F_Hair_[LR]_Braid|F_L_Tape)$/.test(s.data.name)){
    const points=new Float32Array(a.worldVerticesLength);a.computeWorldVertices(s,0,points.length,points,0,2);
    const xs=Array.from(points).filter((_,i)=>i%2===0),ys=Array.from(points).filter((_,i)=>i%2===1),vx=Math.max(...xs)-Math.min(...xs),vy=Math.max(...ys)-Math.min(...ys),values=vx>vy?xs:ys,lo=Math.min(...values),span=Math.max(...values)-lo;
    const q=values.map(v=>2*(v-lo)/(span||1)-1);phase=[];
    if(!a.bones)for(const v of q)phase.push(v,v);else{let i=0,j=0;while(i<a.bones.length){const n=a.bones[i++];for(let k=0;k<n;k++)phase.push(q[j],q[j]);i+=n;j++}}
   }
   return{attachment:a,deform,phase,color:{...s.color},dark:s.darkColor?{...s.darkColor}:null};
  });
  return{clip,bones,world,slots,order:sk.drawOrder.filter(s=>sk.slots[s.data.index]===s).map(s=>s.data.index)};
 }
 apply(sk,a,b,t,{facing=1,order=null}={}){
  const world=[];for(let i=0;i<sk.bones.length;i++){
   const m=compose(mix(a.bones[i],b.bones[i],t),this.parents[i]<0?null:world[this.parents[i]]);world.push(m);
   const bone=sk.bones[i];Object.assign(bone,{a:m.a*facing,b:m.b*facing,c:m.c,d:m.d,worldX:m.x*facing,worldY:m.y,appliedValid:false});
  }
  const chosen=t<.5?a:b;
  for(let i=0;i<sk.slots.length;i++){
   const s=sk.slots[i],x=a.slots[i],y=b.slots[i],p=chosen.slots[i];s.setAttachment(p.attachment);
   for(const k of ['r','g','b','a'])s.color[k]=lerp(x.color[k],y.color[k],t);
   if(s.darkColor&&x.dark&&y.dark)for(const k of ['r','g','b','a'])s.darkColor[k]=lerp(x.dark[k],y.dark[k],t);
   if(x.attachment===y.attachment){s.deform.length=Math.max(x.deform.length,y.deform.length);for(let j=0;j<s.deform.length;j++){
    const turn=a.clip!==b.clip&&(a.clip==='Sleep'||b.clip==='Sleep'),phase=turn?(a.clip==='Sleep'?-(y.phase?.[j]||0):(x.phase?.[j]||0)):0,w=clamp(t+.34*Math.sin(Math.PI*t)*phase);
    s.deform[j]=lerp(x.deform[j]||0,y.deform[j]||0,w);
   }}else{s.deform.length=p.deform.length;for(let j=0;j<p.deform.length;j++)s.deform[j]=p.deform[j]}
  }
  sk.drawOrder=(order||chosen.order).map(i=>sk.slots[i]);return world;
 }
 // Two separately timed actions share geometric poses for reversible, inspectable
 // contact points. The entrance begins/ends at exact original-loop frames.
 render(sk,seconds,{direction='down',facing=1}={}){
  const wake=direction==='up',duration=wake?3.55:3.25,t=clamp(seconds/duration)*duration;
  let a,b,u,label,order;
  if(!wake){
   if(t<1.1){a=this.keys.Relax;b=this.keys.Sit;u=ease(t/1.1);label='放松 → 降低重心';}
   else if(t<1.32){a=b=this.keys.Sit;u=0;label='坐稳 · 准备侧卧';}
   else{a=this.keys.Sit;b=this.keys.Sleep;u=ease((t-1.32)/(duration-1.32));label='侧卧 → 头发与衣摆落定';order=u<.55?a.order:b.order;}
  }else{
   if(t<2.05){a=this.keys.Sleep;b=this.keys.Sit;u=ease(t/2.05);label='醒来 → 侧坐抬身';order=u<.45?a.order:b.order;}
   else if(t<2.3){a=b=this.keys.Sit;u=0;label='坐稳 · 准备起身';}
   else{a=this.keys.Sit;b=this.keys.Relax;u=ease((t-2.3)/(duration-2.3));label='抬身 → 回到放松';}
  }
  this.apply(sk,a,b,u,{facing,order});return{direction,duration,t,label,segment:a.clip+' → '+b.clip,progress:u,reflections:this.reflections};
 }
 loop(sk,clip,time,facing=1){const p=this.capture(clip,time);this.apply(sk,p,p,0,{facing});return{label:clip==='Sleep'?'官方 Sleep 循环（整体镜像）':'官方 Relax 循环',segment:clip,duration:this.data.findAnimation(clip).duration,t:time}}
 verifyEndpoints(){
  let maximum=0,vertices=0;const scratch=new this.spine.Skeleton(this.data);
  for(const clip of ['Relax','Sit','Sleep'])for(const time of [0,.5,1.2]){
   const pose=this.capture(clip,time);this.apply(scratch,pose,pose,0);
   for(let i=0;i<scratch.slots.length;i++){const a=scratch.slots[i].attachment;if(!a?.worldVerticesLength)continue;const expected=new Float32Array(a.worldVerticesLength),actual=new Float32Array(a.worldVerticesLength);a.computeWorldVertices(this.source.slots[i],0,expected.length,expected,0,2);a.computeWorldVertices(scratch.slots[i],0,actual.length,actual,0,2);for(let j=0;j<actual.length;j++){maximum=Math.max(maximum,Math.abs(actual[j]-expected[j]));vertices++;}}
  }return{maximumWorldCoordinateError:maximum,coordinatesCompared:vertices};
 }
}
