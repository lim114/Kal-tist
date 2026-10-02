// 6 sustained states, 30 directed paths. Source releases and destination entries
// are distinct and composable. Sleep is deliberately outside this graph.
export const stateLabels={idle:'待机',wave:'点头回应',thinking:'摸下巴思考',waiting:'单手叉腰等待',error:'困惑',typing:'输入中'};
export const stateIds=Object.keys(stateLabels);
const z=()=>Array(18).fill(0),P=(v={})=>Object.assign(z(),v);
export const anchors={idle:P(),wave:P(),thinking:P({0:-4,1:127,2:30,6:2,7:5,8:1.2,9:-2,10:.24,11:1}),waiting:P({0:-40,1:37,2:72,6:-2,7:-1,8:-.4,9:1,11:1}),error:P({6:7,7:-2,8:-1,9:-5,10:.12}),typing:P({0:-6,1:38,2:-12,6:3,7:26,8:1.6,11:1,15:1,16:-3})};
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(10+t*(-15+6*t))};
export function samplePoints(points,u){if(u<=points[0][0])return points[0][1].slice();for(let i=1;i<points.length;i++)if(u<=points[i][0]){const [a,p]=points[i-1],[b,q]=points[i],f=smooth((u-a)/(b-a));return p.map((v,j)=>v+(q[j]-v)*f)}return points.at(-1)[1].slice()}
const exit={
 idle:{time:.16,note:'保持站稳，视线先转向下一动作',pose:P({15:.25})},
 wave:{time:.3,note:'结束轻点头，头颈回正',pose:P({7:2,15:.45})},
 thinking:{time:.48,note:'手先离下巴，肘向下收，不擦过衣领',pose:P({0:-3,1:85,2:17,6:1,7:3,11:1})},
 waiting:{time:.42,note:'叉腰手向外离开腰侧，再沿袖外下放',pose:P({0:-28,1:15,2:30,6:-1,11:1})},
 error:{time:.26,note:'侧头回正，耳部恢复',pose:P({6:2,7:-1,9:-1})},
 typing:{time:.32,note:'先停手腕、再抬头结束读字',pose:P({0:-4,1:23,2:-5,6:2,7:12,11:1,15:.7,16:-1})}
};
const enter={
 idle:{time:.36,note:'手臂自然垂放、上身回稳，接原呼吸',pose:P({15:.4})},
 wave:{time:.55,note:'小幅低头示意，再回正接回应',pose:P({7:8,6:1,15:.9})},
 thinking:{time:.58,note:'大臂贴身，小臂沿衣物外侧到下巴',pose:P({0:-3,1:94,2:19,6:1,7:2,11:1})},
 waiting:{time:.46,note:'近侧手沿外侧到腰，另一臂不动',pose:P({0:-30,1:12,2:28,6:-1,11:1})},
 error:{time:.38,note:'短暂停顿，再侧头、垂耳',pose:P({6:2,7:-.5,9:-1})},
 typing:{time:.5,note:'视线下移、手腕就位，进入读字',pose:P({0:-4,1:25,2:-7,6:2,7:15,11:1,15:.8,16:-2})}
};
const arm=s=>['waiting','thinking','typing'].includes(s)?'near':null;
export const transitionRoutes={};
for(const a of stateIds)for(const b of stateIds)if(a!==b){
 const sameArm=arm(a)&&arm(a)===arm(b),switchArm=arm(a)&&arm(b)&&arm(a)!==arm(b);
 const release=exit[a].pose.slice(),prepare=enter[b].pose.slice(),middle=P({15:(anchors[a][15]+anchors[b][15])*.3});
 if(sameArm){for(let i=0;i<6;i++){middle[i]=(release[i]+prepare[i])*.5;release[i]=anchors[a][i]*.7+middle[i]*.3;prepare[i]=anchors[b][i]*.7+middle[i]*.3}middle[11]=1}
 const duration=Number((exit[a].time+enter[b].time+(switchArm?.38:sameArm?.14:.24)).toFixed(2));
 // Short facial changes can overlap; opposite arms clear in strict sequence.
 const r=switchArm?.32:sameArm?.23:.28,m=switchArm?.53:sameArm?.47:.5,e=switchArm?.78:sameArm?.73:.76;
 transitionRoutes[a+'>'+b]={from:a,to:b,duration,points:[[0,anchors[a]],[r,release],[m,middle],[e,prepare],[1,anchors[b]]],label:exit[a].note+' → '+enter[b].note,clearance:switchArm?'先放下源动作手臂，再启动另一侧手臂':sameArm?'同侧手臂沿连续路径转接，不回落再抬起':arm(a)?'先解除接触，沿衣物外侧下放手臂，再进入头颈动作':arm(b)?'另一臂自然垂放，目标手沿外侧路径进入动作':'手臂自然保持，头颈按先后次序转接'};
}
export function routePose(key,u,start=null){const tr=transitionRoutes[key];if(!tr)throw Error('Unknown transition '+key);const points=tr.points.map(([t,p])=>[t,p.slice()]);
 if(start){points[0][1]=start.slice();const released=points[1][1];for(let i=0;i<6;i++){const ratio=Math.abs(anchors[tr.from][i])>1e-6?Math.min(1,Math.abs(released[i]/anchors[tr.from][i])):.45;released[i]=start[i]*ratio}for(const i of [6,7,8,9,15,16,17])released[i]+=(start[i]-anchors[tr.from][i])*.35}
 return samplePoints(points,u);
}
export class TransitionController{
 constructor(){this.state='idle';this.desired='idle';this.current=anchors.idle.slice();this.time=0;this.transition=null}
 request(s){if(s==='review')s='thinking';if(stateIds.includes(s))this.desired=s}
 update(dt,loop){
  if(this.desired!==(this.transition?.to||this.state)){const from=this.transition?.to||this.state,key=from+'>'+this.desired;this.transition={key,from,to:this.desired,time:0,start:this.current.slice(),duration:transitionRoutes[key].duration};this.state=from}
  if(this.transition){const tr=this.transition;tr.time+=dt;this.current=routePose(tr.key,tr.time/tr.duration,tr.start);if(tr.time>=tr.duration){this.state=tr.to;this.transition=null;this.time=0;this.current=anchors[this.state].slice()}}
  else{this.time+=dt;this.current=loop?loop(this.state,this.time):anchors[this.state].slice()}
  return this.current;
 }
}
