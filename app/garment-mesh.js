
// Preserve texture topology when an authored elbow angle exceeds the source rig.
// A small positional correction keeps cloth triangles from folding inside-out.
// Shared seam vertices receive the same correction; the sleeve remains mobile.
export class GarmentMesh{
 constructor(){this.stats={before:0,after:0};this.records=[]}
 capture(sk){this.records=[];sk.updateWorldTransform();for(const slot of sk.slots){const a=slot.attachment;if(!a?.triangles||!/^F_[LR]_(Forearm|Arm_b|Collar)/.test(slot.data.name))continue;
  // Forearm skin and bracelets share the wrist joint. Never run cloth-area
  // corrections on one of those surfaces: they must retain the same anchors.
  if(/^F_[LR]_Forearm$|^F_R_Forearm_a$|^F_L_Forearm_v$/.test(slot.data.name))continue;
  const rest=new Float32Array(a.worldVerticesLength);a.computeWorldVertices(slot,0,rest.length,rest,0,2);this.records.push({slot,a,rest})}}
 apply(sk,enabled=true,garmentVertices=new Map()){if(!enabled){this.stats={before:0,after:0};return}sk.updateWorldTransform();const points=[],triangles=[],meshes=[];
  for(const r of this.records){if(r.slot.attachment!==r.a)continue;const v=new Float32Array(r.rest.length);r.a.computeWorldVertices(r.slot,0,v.length,v,0,2);if(garmentVertices.has(r.slot))v.set(garmentVertices.get(r.slot));const start=points.length;for(let i=0;i<v.length;i+=2)points.push({x:v[i],y:v[i+1],ox:v[i],oy:v[i+1],rx:r.rest[i],ry:r.rest[i+1]});for(let i=0;i<r.a.triangles.length;i+=3){const ids=Array.from(r.a.triangles.slice(i,i+3),j=>j+start),[a,b,c]=ids.map(j=>points[j]),area=(b.rx-a.rx)*(c.ry-a.ry)-(b.ry-a.ry)*(c.rx-a.rx);if(Math.abs(area)>.1)triangles.push({ids,sign:Math.sign(area),min:Math.abs(area)*.065})}meshes.push({...r,start,length:v.length})}
  const seams=[];for(let m=0;m<meshes.length;m++)for(let n=m+1;n<meshes.length;n++){const a=meshes[m],b=meshes[n];if(a.slot.data.name.slice(0,3)!==b.slot.data.name.slice(0,3))continue;for(let i=a.start;i<a.start+a.length/2;i++)for(let j=b.start;j<b.start+b.length/2;j++)if(Math.hypot(points[i].rx-points[j].rx,points[i].ry-points[j].ry)<.65)seams.push([i,j])}
  const area=t=>{const[a,b,c]=t.ids.map(i=>points[i]);return t.sign*((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x))};
  const before=triangles.filter(t=>area(t)<0).length;
  for(let iter=0;iter<36;iter++){
   for(const t of triangles){const actual=area(t);if(actual>=t.min)continue;const[a,b,c]=t.ids.map(i=>points[i]),g=[[b.y-c.y,c.x-b.x],[c.y-a.y,a.x-c.x],[a.y-b.y,b.x-a.x]],sum=g.reduce((v,p)=>v+p[0]*p[0]+p[1]*p[1],0);if(sum<1e-8)continue;const k=(t.min-actual)/sum*t.sign*.85;for(let j=0;j<3;j++){const p=points[t.ids[j]];p.x+=k*g[j][0];p.y+=k*g[j][1]}}
   for(const[i,j]of seams){const a=points[i],b=points[j],dx=((a.x-a.ox)+(b.x-b.ox))/2,dy=((a.y-a.oy)+(b.y-b.oy))/2;a.x=a.ox+dx;a.y=a.oy+dy;b.x=b.ox+dx;b.y=b.oy+dy}
  }
  for(const r of meshes){const proxy=Object.create(r.a);proxy.computeWorldVertices=(_slot,start,count,out,offset,stride)=>{for(let i=start;i<start+count;i+=2){const p=points[r.start+i/2];out[offset]=p.x;out[offset+1]=p.y;offset+=stride}};r.slot.attachment=proxy}
  this.stats={before,after:triangles.filter(t=>area(t)<-.001).length,seams:seams.length,maxCorrection:Math.max(0,...points.map(p=>Math.hypot(p.x-p.ox,p.y-p.oy)))};
 }
}



