// A separate garment skeleton drives shoulder panels. The body/sleeve rig still
// takes the full arm motion; the collar follows the chest with limited arm tug.
export class ShoulderCloth{
 constructor(spine,data){this.sk=new spine.Skeleton(data);this.stats={panels:0}}
 vertices(body,p){
  const result=new Map(),rig=this.sk,attrs=['x','y','rotation','scaleX','scaleY','shearX','shearY'];
  rig.scaleX=body.scaleX;rig.scaleY=body.scaleY;rig.x=body.x;rig.y=body.y;
  for(let i=0;i<body.bones.length;i++)for(const k of attrs)rig.bones[i][k]=body.bones[i][k];
  // Both Collar2 bones were parented to the upper arms in the source rig.
  // Retain 18% of the authored shoulder turn, preserving native cloth motion.
  rig.findBone('F_L_Arm').rotation-=p[0]*.82;
  rig.findBone('F_R_Arm').rotation-=p[3]*.82;
  rig.updateWorldTransform();
  for(const name of['F_L_Collar','F_R_Collar']){const source=body.findSlot(name),a=source.attachment;if(!a?.triangles)continue;const slot=rig.slots[source.data.index];slot.deform=source.deform;const v=new Float32Array(a.worldVerticesLength);a.computeWorldVertices(slot,0,v.length,v,0,2);result.set(source,v)}
  this.stats={panels:result.size,armFollow:.18};return result;
 }
}
