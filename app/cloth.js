import{nativeClothProfile as profile}from'./cloth-profile.js';
// Original Interact sleeve folds are retargeted to both garment chains.
// Root keeps the free sleeve hanging down; source fold keys shape its segments.
const chains=[
 ['F_L_Forearm_b',0,1,0,210],['F_L_Forearm_b2',0,0,1,28],['F_L_Forearm_b3',0,0,2,32],['F_L_Forearm_b4',0,0,3,30],
 ['F_L_Forearm_s',0,1,4,210],['F_L_Forearm_s2',0,0,5,32],['F_L_Forearm_s3',0,0,6,34],
 ['F_R_Forearm_b',1,1,0,210],['F_R_Forearm_b2',1,0,1,28],['F_R_Forearm_r',1,0,2,32],['F_R_Forearm_r2',1,0,3,30],
 ['F_R_Forearm_c',1,1,4,210],['F_R_Forearm_c2',1,0,5,32],['F_R_Forearm_c3',1,0,6,34],
 ['F_L_Skirt4',0,0,-1,7],['F_L_Skirt5',0,0,-1,8],['F_L_Skirt6',0,0,-1,9],['F_L_Skirt7',0,0,-1,10],['F_L_Skirt8',0,0,-1,11]
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function fold(rows,u,index){if(u<=rows[0][0])return rows[0][index+1];for(let i=1;i<rows.length;i++){if(u<=rows[i][0]){const a=rows[i-1],b=rows[i],t=(u-a[0])/Math.max(.0001,b[0]-a[0]);return a[index+1]+(b[index+1]-a[index+1])*t}}return rows.at(-1)[index+1]}
export class Cloth{
 constructor(){this.reset()}
 reset(initial){this.time=0;this.values=chains.map(()=>({x:0,v:0}));this.previous=[0,0];this.velocity=[0,0];this.rising=[1,1];if(initial){this.previous=[initial[0]+initial[1],initial[3]+initial[4]];for(let i=0;i<960;i++)this.step(initial);this.time=0}}
 step(p,dt=1/120){
  const drives=[p[0]+p[1],p[3]+p[4]];
  for(let arm=0;arm<2;arm++){const v=clamp((drives[arm]-this.previous[arm])/dt,-320,320);this.velocity[arm]+=(v-this.velocity[arm])*(1-Math.exp(-dt*10));const speed=this.velocity[arm]*Math.sign(drives[arm]);const goal=(Math.tanh(speed/14)+1)/2;this.rising[arm]+=(goal-this.rising[arm])*(1-Math.exp(-dt*8))}
  chains.forEach(([name,arm,weight,index,limit],i)=>{
   const d=drives[arm],u=clamp(Math.abs(d)/profile.liftDegrees,0,1),activation=Math.tanh(Math.abs(d)/28),sign=Math.tanh(d/12),s=this.values[i];
   const native=index<0?0:(fold(profile.rise,u,index)*this.rising[arm]+fold(profile.fall,u,index)*(1-this.rising[arm]))*sign*.65*activation;
   const target=clamp(-d*weight+native+(index===0?18:index===4?4:0)*activation,-limit,limit);
   // Critical damping avoids reversal overshoot. Distal bones lag the seam.
   const omega=index===0||index===4?12:index<0?7:9;
   const inertia=clamp(-this.velocity[arm]*.025*(index<0?.18:1),-6,6);
   s.v+=(omega*omega*(target-s.x)+inertia-2*omega*s.v)*dt;s.x+=s.v*dt;
  });this.previous=drives;this.time+=dt;
 }
 seek(t,poseAt){if(t<this.time||t-this.time>.09)this.reset(poseAt(0));while(this.time+1/120<=t+1e-8)this.step(poseAt(this.time+1/120))}
 apply(sk){chains.forEach(([name],i)=>{sk.findBone(name).rotation+=this.values[i].x})}
 snapshot(){return chains.map(([name],i)=>({name,...this.values[i]}))}
}
