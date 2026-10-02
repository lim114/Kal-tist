// Depth belongs to source slots, not the direction of a bone or the screen.
// Both hands and wrist ornaments stay BELOW their own front sleeves; the far
// hand also stays behind the torso. Native Interact owns its skirt order key.
// See ../occlusion-map.md for the complete source attachment inventory.
export class OcclusionAudit {
 constructor(data){
  this.names=data.slots.map(s=>s.name);
  this.orders=new Set([this.names.join('|')]);
  for(const animation of data.animations)for(const timeline of animation.timelines){
   if(!timeline.drawOrders)continue;
   for(const order of timeline.drawOrders)this.orders.add((order?Array.from(order,i=>this.names[i]):this.names).join('|'));
  }
 }
 validate(sk){
  const actual=sk.drawOrder.map(s=>s.data.name),native=actual.filter(n=>!/^F_[LR]_WristSurface$/.test(n)),problems=[];
  if(native.length!==this.names.length)problems.push('原生图层数量变化');
  if(new Set(actual).size!==actual.length)problems.push('重复图层');
  if(!this.orders.has(native.join('|')))problems.push('层序偏离官方原始轨道（手、衣物、头发、眼部等全部纳入）');
  for(const side of ['L','R']){
   const surface='F_'+side+'_WristSurface',at=actual.indexOf(surface),cuff=side==='L'?'F_L_Forearm_v':'F_R_Forearm_a';
   if(at>=0&&actual[at+1]!==cuff)problems.push(surface+' 必须紧邻原腕饰下方');
  }
  return{ok:problems.length===0,problems,protectedCount:this.names.length,nativeOrders:this.orders.size,wristSurfaces:actual.length-native.length};
 }
}
