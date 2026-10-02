// Keep only the existing skin beneath each bracelet in the bracelet's plane.
// This reuses source vertices/UVs; it neither fills clothing nor paints colors.
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
function hull(points){const q=points.sort((a,b)=>a.x-b.x||a.y-b.y),lo=[],hi=[];for(const p of q){while(lo.length>1&&cross(lo.at(-2),lo.at(-1),p)<=0)lo.pop();lo.push(p)}for(const p of q.slice().reverse()){while(hi.length>1&&cross(hi.at(-2),hi.at(-1),p)<=0)hi.pop();hi.push(p)}return lo.slice(0,-1).concat(hi.slice(0,-1))}
function clip(poly,a,b){const result=[];for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],dp=cross(a,b,p),dq=cross(a,b,q);if(dp>=-1e-6)result.push(p);if((dp>=0)!==(dq>=0)){const t=dp/(dp-dq);result.push({x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t,u:p.u+(q.u-p.u)*t,v:p.v+(q.v-p.v)*t})}}return result}
function world(slot){const a=slot.attachment;if(!a?.triangles)return null;const v=new Float32Array(a.worldVerticesLength);a.computeWorldVertices(slot,0,v.length,v,0,2);return Array.from({length:v.length/2},(_,i)=>({x:v[i*2],y:v[i*2+1],u:a.uvs[i*2],v:a.uvs[i*2+1]}))}
export function applyWristSurfaces(sk){const stats=[];
 for(const side of ['L','R']){const skin=sk.findSlot('F_'+side+'_Forearm'),cuff=sk.findSlot(side==='L'?'F_L_Forearm_v':'F_R_Forearm_a'),points=world(skin),cuffPoints=world(cuff);if(!points||!cuffPoints)continue;
  const outline=hull(cuffPoints),vertices=[],uvs=[],triangles=[];if(outline.length<3)continue;
  for(let i=0;i<skin.attachment.triangles.length;i+=3){let poly=skin.attachment.triangles.slice(i,i+3).map(j=>points[j]);for(let j=0;j<outline.length&&poly.length;j++)poly=clip(poly,outline[j],outline[(j+1)%outline.length]);if(poly.length<3)continue;const base=vertices.length/2;for(const p of poly){vertices.push(p.x,p.y);uvs.push(p.u,p.v)}for(let j=1;j<poly.length-1;j++)if(Math.abs(cross(poly[0],poly[j],poly[j+1]))>1e-5)triangles.push(base,base+j,base+j+1)}
  if(!triangles.length)continue;
  const proxy=Object.create(skin.attachment);proxy.worldVerticesLength=vertices.length;proxy.uvs=new Float32Array(uvs);proxy.triangles=triangles;
  proxy.computeWorldVertices=(_slot,start,count,out,offset,stride)=>{for(let i=start;i<start+count;i+=2){out[offset]=vertices[i];out[offset+1]=vertices[i+1];offset+=stride}};
  const surface=Object.create(skin);surface.data={...skin.data,name:'F_'+side+'_WristSurface'};surface.attachment=proxy;
  const at=sk.drawOrder.indexOf(cuff);if(at<0)continue;sk.drawOrder.splice(at,0,surface);stats.push({side,triangles:triangles.length/3,source:skin.attachment.name});
 }return stats;
}
