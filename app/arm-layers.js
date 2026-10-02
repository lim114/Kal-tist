// Use stable depth planes. Skin and broad clothing keep their source order;
// only the two glove/cuff groups need a different plane from the source idle.
export function applyArmLayers(sk,p){
 let order=sk.drawOrder.slice();
 const far=order.filter(s=>/^F_R_(Hand$|Finger_[abcde]$|Fist$|Fist_fin$|Forearm_a$)/.test(s.data.name));
 order=order.filter(s=>!far.includes(s));
 // The far glove grips the OUTSIDE of the opposite sleeve. Keep it above the
 // sleeve panels, beneath the front tape and nearer hand; leave arm skin back.
 const at=order.findIndex(s=>s.data.name==='F_L_Tape');
 order.splice(at<0?order.length:at,0,...far);
 const near=order.filter(s=>/^F_L_(Hand$|Finger_[abcde]$|Forearm_v$)/.test(s.data.name));
 // The near hand keeps its front plane throughout raising and releasing.
 // No angle threshold can suddenly promote a bare upper arm or sleeve.
 sk.drawOrder=order.filter(s=>!near.includes(s)).concat(near);
}
