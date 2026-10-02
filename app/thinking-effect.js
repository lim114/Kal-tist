// Vector overlay uses the same world projection as the character, including DPI.
export class ThinkingEffect{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.amount=0;this.last=null;this.color='#d6e6df'}
 draw({w,h,dpr,time,dt,active,weight,head,frame,freeze}){
  const c=this.canvas,ctx=this.ctx;
  if(c.width!==Math.round(w*dpr)||c.height!==Math.round(h*dpr)){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr)}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const target=active?weight:0;this.amount=freeze?target:this.amount+(target-this.amount)*(1-Math.exp(-dt*7));
  if(this.amount<.005){this.last={visible:false,opacity:this.amount};return}
  const scale=h/frame.worldH,r=18*scale;
  let x=(head.x-frame.minX)/frame.worldW*w,y=h-(head.y-frame.minY)/frame.worldH*h;
  x=Math.max(r+4,Math.min(w-r-4,x));y=Math.max(r+4,Math.min(h-r-4,y));
  // iOS-style activity indicator: stationary radial bars with staggered fading.
  // Visual timing reference: Ionic's public "lines" spinner (8 bars / 1000 ms).
  ctx.save();ctx.translate(x,y);ctx.strokeStyle=this.color;ctx.lineWidth=Math.max(1.5,3.2*scale);ctx.lineCap='round';
  for(let i=0;i<8;i++){const angle=i*Math.PI/4-Math.PI/2,age=((time-i/8)%1+1)%1;ctx.globalAlpha=this.amount*(.18+.82*(1-age));ctx.beginPath();ctx.moveTo(Math.cos(angle)*r*.55,Math.sin(angle)*r*.55);ctx.lineTo(Math.cos(angle)*r,Math.sin(angle)*r);ctx.stroke()}
  ctx.restore();this.last={visible:true,opacity:this.amount,x,y,r,angle:time*Math.PI*2,bars:8,style:'ios-lines'};
 }
}
