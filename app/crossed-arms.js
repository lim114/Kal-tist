// Opposite-biceps grip, based on the visible/hidden anatomy of folded arms.
export function applyCrossedArms(sk,p){const amount=Math.max(0,Math.min(1,p[14]||0));if(!amount)return;
 // The wrist root also weights the forearm/cuff meshes. Keep its dimensions;
 // curl the fingers to grip the opposite sleeve without shortening the wrist.
 for(const side of ['L','R'])for(const finger of ['b','c','d','e']){const first=sk.findBone('F_'+side+'_Finger_'+finger),tip=sk.findBone('F_'+side+'_Finger_'+finger+'2');if(first)first.rotation+=(side==='L'?-8:8)*amount;if(tip)tip.rotation+=(side==='L'?-30:30)*amount}
}
