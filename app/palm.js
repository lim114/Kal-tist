// The glove has a separate palm/finger rig. Rotate that plane about its long
// axis through an edge-on pose; keep the wrist and cuff anchors unchanged.
// This is a 2.5D turn of the existing glove art, not a newly painted palm view.
export function applyPalm(skeleton,amount){
 const t=Math.max(0,Math.min(1,amount)),palm=skeleton.findBone('F_L_Hand_a');
 const raw=Math.cos(Math.PI*t),projection=Math.sign(raw||1)*Math.max(.025,Math.abs(raw));
 // Finger length axis is ~70 degrees in this palm bone, not its local Y axis.
 // Project about that measured axis; a bare scaleX=-1 would bend the wrist.
 const phi=70*Math.PI/180,c=Math.cos(phi),s=Math.sin(phi),a=c*c+projection*s*s,b=(1-projection)*s*c,d=s*s+projection*c*c;
 const angle=Math.atan2(b,a),angleY=Math.atan2(d,b);palm.rotation+=angle*180/Math.PI;palm.scaleX*=Math.hypot(a,b);palm.scaleY*=Math.hypot(b,d);palm.shearY+=(angleY-angle)*180/Math.PI-90;
 const open=Math.sin(t*Math.PI/2);for(const[name,angle]of [['F_L_Finger_a',-12],['F_L_Finger_b',4],['F_L_Finger_c',1],['F_L_Finger_d',-2],['F_L_Finger_e',-7]])skeleton.findBone(name).rotation+=angle*open;
 for(const name of ['F_L_Finger_b2','F_L_Finger_c2','F_L_Finger_d2','F_L_Finger_e2'])skeleton.findBone(name).rotation-=8*open;
 if(t>.5){const order=skeleton.drawOrder,thumb=order.find(s=>s.data.name==='F_L_Finger_a'),i=order.indexOf(thumb);if(i>=0){order.splice(i,1);let last=-1;for(let j=0;j<order.length;j++)if(/^F_L_(Hand$|Finger_[abcde]$)/.test(order[j].data.name))last=j;order.splice(last+1,0,thumb)}}
 return{turn:t,palmSide:t>.5,width:Math.abs(projection)};
}
