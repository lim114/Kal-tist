import {anchors,transitionRoutes,routePose} from './transition-library.js';
// Authored gestures layered over the original breathing, ears and facial animation.
// Channels: near shoulder/elbow/wrist, far shoulder/elbow/wrist, head tilt,
// head pitch (face-depth controller), chest lean, ears, eye focus, hand depth.
// Keep the legacy "wave" event ID for the greeting, now using the former idle.
export const names={idle:'待机 · 官方 Relax / Sit',wave:'示意 · 放松回应',thinking:'思考 · 凝神',waiting:'等待 · 单手叉腰',error:'困惑 · 侧头问号',typing:'输入中 · 低头读字',headtouch:'摸头 · 依偎轻蹭',bodytouch:'触碰 · 后仰回望'};
export const states=Object.keys(names).filter(s=>!['headtouch','bodytouch'].includes(s));
// Channel 12 is forearm pronation / palm presentation, independent of wrist bend.
// Channel 14 controls the opposite-arm grip / tucked-hand layer for folded arms.
// Channel 15 owns head pose; 16 moves the existing face-depth look controller.
const zero=()=>Array(18).fill(0);
const P=(v={})=>Object.assign(zero(),v);
export const targets={...anchors,headtouch:P({6:-17,7:11,8:-1.5,9:-8,15:1,16:-3,17:1}),bodytouch:P({6:12,7:-10,8:-4.5,9:4,15:1,16:5})};
const clamp=t=>Math.max(0,Math.min(1,t));
export const ease=t=>{t=clamp(t);return t*t*t*(10+t*(-15+6*t))};
const lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*ease(t));
function keys(points,t){if(t<=points[0][0])return points[0][1].slice();for(let i=1;i<points.length;i++)if(t<=points[i][0])return lerp(points[i-1][1],points[i][1],(t-points[i-1][0])/(points[i][0]-points[i-1][0]));return points.at(-1)[1].slice()}
function tweak(p,v){return Object.assign(p.slice(),v)}
const nod=t=>keys([[0,[0]],[.18,[0]],[.52,[1]],[.7,[1]],[1.16,[0]],[1.5,[0]],[1.8,[.48]],[2.22,[0]],[3,[0]]],t%3)[0];
export function loopPose(s,t){const p=targets[s].slice();const fade=ease(t/.45);
 // "wave" intentionally adds nothing: the former native idle is its response.

 if(s==='typing'){const q=keys([[0,[0,0,0]],[.5,[0,0,0]],[1.35,[2,3,3]],[1.8,[2,3,3]],[2.25,[-1,-2,-2]],[3.2,[0,0,0]]],t%3.2);p[7]+=q[0];p[16]+=q[1];p[2]+=q[2]}
 if(s==='bodytouch'){const q=keys([[0,[0,0,0]],[.25,[1,1,-.5]],[.7,[-3,2,1]],[.95,[-4,2,1.3]]],t);p[6]+=q[0];p[7]+=q[1];p[8]+=q[2]}
 if(s==='thinking'){
  // A deliberate 8.4 second phrase: consider, rub the chin, tilt, then a small nod.
  // Keep the elbow folded and the hand below the mouth throughout the phrase.
  const q=keys([[0,[0,0,0,0,0,0]],
   [1.2,[0,0,0,0,0,0]],[2,[.8,-1.8,4,1,1,.25]],
   [2.6,[-.5,1.4,-3,1.5,2,.4]],[3.2,[.6,-1.4,4,2,2,.4]],
   [4.4,[1,-2,2,4,3,.8]],[5.5,[1,-2,2,4,3,.8]],
   [6.2,[0,0,1,1,9,1.3]],[7.1,[0,0,0,0,-1,-.2]],
   [8.4,[0,0,0,0,0,0]]],t%8.4);
  for(const [j,i]of [0,1,2,6,7,8].entries())p[i]+=q[j]*fade;
 }
 if(s==='waiting'){p[6]+=.5*Math.sin(t*.8)*fade;p[7]+=.35*Math.sin(t*.65)*fade}
 if(s==='error'){p[6]+=1.3*Math.sin(t*1.1)*fade}
 if(s==='headtouch'){const q=keys([[0,[0,0]],[.35,[-3,2]],[.7,[2,-1]],[1.15,[0,0]]],t);p[6]+=q[0];p[7]+=q[1]}
 return p;
}
// Each source releases its own gesture before the destination's distinct preparation.
const release={idle:P({15:.5}),wave:P(),typing:P({0:-3,1:18,2:-5,7:7,11:1,15:.6}),thinking:P({0:0,1:75,2:15,7:2,11:1}),waiting:P({0:-28,1:15,2:30,11:1}),error:P({6:3,9:-2})};
const prepare={idle:P({15:.5}),wave:P(),typing:P({0:-3,1:22,2:-6,7:10,8:.6,11:1,15:.7,16:-1}),thinking:P({0:0,1:90,2:18,7:2,11:1}),waiting:P({0:-30,1:12,2:28,11:1}),error:P({6:2,7:-1,9:1})};
export const transitions=transitionRoutes;
export const transitionPose=routePose;
export function sample(s,t){
 const enter=s==='headtouch'?.38:s==='bodytouch'?.22:1.35,hold=s==='idle'?12:s==='typing'?6.4:s==='headtouch'?1.15:s==='bodytouch'?.95:4,exit=s==='headtouch'?.85:s==='bodytouch'?.7:1.45,duration=enter+hold+exit+.6;
 let p,phase;
 const prep=prepare[s]||tweak(targets[s],{6:0,7:1,9:0,10:0});
 if(t<enter){p=keys([[0,zero()],[enter*.15,zero()],[enter*.55,prep],[enter,targets[s]]],t);phase='准备 → 进入动作'}
 else if(t<enter+hold){p=loopPose(s,t-enter);phase=s==='idle'?'站立放松 → 缓慢环顾':s==='wave'?'原待机 · 自然放松回应':s==='typing'?'低头读字 → 目光缓慢移动':s==='headtouch'?'靠向手心 → 轻蹭 → 回正':s==='bodytouch'?'短促后仰 → 回望 → 放松':s==='thinking'?'持续思考循环':'动作保持与细微变化'}
 else {const last=loopPose(s,hold);p=keys([[enter+hold,last],[enter+hold+exit*.45,release[s]||zero()],[enter+hold+exit,zero()]],t);phase='收势 → 回到待机'}
 return{p,phase,duration,weight:ease(t/enter)*ease((enter+hold+exit-t)/exit)};
}



