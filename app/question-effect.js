// A vector question mark: follows the head position, never mirrors the glyph.
// A separate overlay keeps the thinking spinner's timing and opacity intact.
export class QuestionEffect{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.amount=0;this.last=null;this.color='#53614a'}
 draw({w,h,dpr,time,dt,active,weight,head,frame,freeze}){
  const c=this.canvas,ctx=this.ctx;
  if(c.width!==Math.round(w*dpr)||c.height!==Math.round(h*dpr)){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr)}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const target=active?weight:0;
  // Touch interaction hides the icon immediately; state transitions fade it.
  this.amount=freeze||!active?target:this.amount+(target-this.amount)*(1-Math.exp(-dt*9));
  if(this.amount<.005){this.last={visible:false,opacity:this.amount};return}
  const scale=h/frame.worldH,margin=23*scale+3;
  let x=(head.x-frame.minX)/frame.worldW*w,y=h-(head.y-frame.minY)/frame.worldH*h;
  x=Math.max(margin,Math.min(w-margin,x));y=Math.max(margin,Math.min(h-margin,y));
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.globalAlpha=this.amount;
  ctx.rotate(.05*Math.sin(time*1.5));ctx.lineCap='round';ctx.lineJoin='round';
  const hook=()=>{ctx.beginPath();ctx.moveTo(-8,-8);ctx.bezierCurveTo(-8,-22,12,-22,12,-9);ctx.bezierCurveTo(12,-1,1,-2,1,7)};
  hook();ctx.strokeStyle='#f5f2dc';ctx.lineWidth=7;ctx.stroke();
  hook();ctx.strokeStyle=this.color;ctx.lineWidth=3.6;ctx.stroke();
  ctx.beginPath();ctx.arc(1,16,3.5,0,Math.PI*2);ctx.fillStyle='#f5f2dc';ctx.fill();
  ctx.beginPath();ctx.arc(1,16,1.9,0,Math.PI*2);ctx.fillStyle=this.color;ctx.fill();
  ctx.restore();this.last={visible:true,opacity:this.amount,x,y,r:margin,style:'question',mirrored:false};
 }
}
