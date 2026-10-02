// Preserve the source model's full Relax animation (including eye attachments,
// eyelid deform, breath, ears and hair). Only arm channels claimed by a new
// gesture are held to its authored reference; untouched channels remain native.
export class NativeLayer{
 constructor(spine,data){this.spine=spine;this.data=data;this.relax=data.findAnimation('Relax');this.interact=data.findAnimation('Interact');const sk=new spine.Skeleton(data);this.base(sk,0);const attrs=['x','y','rotation','scaleX','scaleY','shearX','shearY'];this.attrs=attrs;
  this.armBones=sk.bones.filter(b=>/^F_[LR]_(Arm$|Forearm$|Hand|Finger)/.test(b.data.name)).map(b=>({index:b.data.index,values:attrs.map(k=>b[k])}));
  this.armSlots=sk.slots.filter(s=>/^F_[LR]_(Arm|Forearm|Hand|Finger)/.test(s.data.name)).map(s=>({index:s.data.index,attachment:s.attachment,deform:s.deform.slice(),alpha:s.color.a}));
  this.headBones=sk.bones.filter(b=>/^F_(Head|Neck|Head_TF|Head_TB)$/.test(b.data.name)).map(b=>({index:b.data.index,values:attrs.map(k=>b[k])}));
  const face=new spine.Skeleton(data);this.base(face,0);this.interact.apply(face,0,.97,false,[],1,spine.MixBlend.replace,spine.MixDirection.mixIn);
  this.touchEyes=face.bones.filter(b=>/^F_[LR]_(Eye|Eyebrow)/.test(b.data.name)).map(b=>({index:b.data.index,values:attrs.map(k=>b[k])}));
  this.touchEyeSlots=face.slots.filter(s=>/^F_[LR]_Eye/.test(s.data.name)).map(s=>({index:s.data.index,attachment:s.attachment,deform:s.deform.slice()}));
 }
 base(sk,time){sk.drawOrder.length=sk.slots.length;sk.setToSetupPose();this.relax.apply(sk,0,time,true,[],1,this.spine.MixBlend.replace,this.spine.MixDirection.mixIn)}
 apply(sk,time,pose){this.base(sk,time);const strength=Math.min(1,Math.max(...pose.slice(0,6).map(Math.abs))/22);
  // Attention/reaction poses own the large head movement. Keep the original
  // eye, ear, hair and breathing tracks; do not stack two competing head poses.
  const attention=Math.max(0,Math.min(1,pose[15]||0));
  for(const r of this.headBones){const b=sk.bones[r.index];this.attrs.forEach((k,i)=>b[k]+=(r.values[i]-b[k])*attention)}
  // Retarget the source Interact's own relaxed eyelids, including its mesh
  // deformation. No independently drawn or scaled substitute eye expression.
  const eyelids=Math.max(0,Math.min(1,pose[17]||0));
  if(eyelids){for(const r of this.touchEyes){const b=sk.bones[r.index];this.attrs.forEach((k,i)=>b[k]+=(r.values[i]-b[k])*eyelids)}
   for(const r of this.touchEyeSlots){const slot=sk.slots[r.index];if(slot.attachment!==r.attachment){if(eyelids>.999)slot.setAttachment(r.attachment);continue}const n=Math.max(slot.deform.length,r.deform.length);for(let i=0;i<n;i++)slot.deform[i]=(slot.deform[i]||0)*(1-eyelids)+(r.deform[i]||0)*eyelids}}
  for(const r of this.armBones){const b=sk.bones[r.index];this.attrs.forEach((k,i)=>b[k]+=(r.values[i]-b[k])*strength)}
  // Keep original garment folds live instead of snapping meshes at half strength.
  for(const r of this.armSlots){const slot=sk.slots[r.index];if(!/Hand|Finger/.test(slot.data.name))continue;if(slot.attachment!==r.attachment){if(strength>=1)slot.setAttachment(r.attachment);continue}slot.color.a+=(r.alpha-slot.color.a)*strength;const n=Math.max(slot.deform.length,r.deform.length);for(let i=0;i<n;i++)slot.deform[i]=(slot.deform[i]||0)*(1-strength)+(r.deform[i]||0)*strength}
  return strength;
 }
 interaction(sk,time){const d=this.interact.duration;if(time<0||time>d)return false;const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)},weight=smooth(time/.28)*smooth((d-time)/.35);this.interact.apply(sk,0,time,false,[],weight,this.spine.MixBlend.replace,this.spine.MixDirection.mixIn);return true}
}
