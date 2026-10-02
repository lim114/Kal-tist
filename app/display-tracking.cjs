// Electron screen points and window bounds are DIP. Do not multiply them by
// scaleFactor. The renderer alone chooses its physical backing-store density.
const key=d=>[d.id,d.scaleFactor,d.workArea.x,d.workArea.y,d.workArea.width,d.workArea.height,d.rotation].join(':');
class DisplayTracking{
 constructor({screen,win,canApply,apply}){
  Object.assign(this,{screen,win,canApply,apply});this.pending=false;this.timer=null;this.closed=false;
  this.current=key(screen.getDisplayMatching(win.getBounds()));
  this.onMetrics=()=>this.queue();
  this.onMove=()=>{if(this.closed||win.isDestroyed())return;const next=key(screen.getDisplayMatching(win.getBounds()));if(next!==this.current){this.current=next;this.queue()}};
  for(const event of ['display-metrics-changed','display-added','display-removed'])screen.on(event,this.onMetrics);
  win.on('move',this.onMove);
 }
 queue(){if(this.closed)return;this.pending=true;clearTimeout(this.timer);this.timer=setTimeout(()=>this.flush(),120)}
 flush(){
  clearTimeout(this.timer);this.timer=null;
  if(this.closed||!this.pending||this.win.isDestroyed()||!this.canApply())return;
  this.pending=false;const display=this.screen.getDisplayMatching(this.win.getBounds());this.current=key(display);
  this.apply(display);
 }
 close(){this.closed=true;clearTimeout(this.timer);for(const event of ['display-metrics-changed','display-added','display-removed'])this.screen.removeListener(event,this.onMetrics);this.win.removeListener('move',this.onMove)}
}
module.exports={DisplayTracking};
