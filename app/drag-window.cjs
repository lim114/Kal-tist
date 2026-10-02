// At fractional Windows DPI, setPosition can round the previous size upward
// on every call. Keep one size for the entire drag; never feed it back.
function startWindowDrag(win,p,size){
 const b=win.getBounds();
 return{x:p.x-b.x,y:p.y-b.y,lastX:p.x,width:size?.width??b.width,height:size?.height??b.height,lastLeft:b.x,lastTop:b.y};
}
function moveWindowDrag(win,drag,p){
 const dx=p.x-drag.lastX;drag.lastX=p.x;
 const x=Math.round(p.x-drag.x),y=Math.round(p.y-drag.y);
 if(x!==drag.lastLeft||y!==drag.lastTop){
  win.setBounds({x,y,width:drag.width,height:drag.height});
  drag.lastLeft=x;drag.lastTop=y;
 }
 return dx;
}
module.exports={startWindowDrag,moveWindowDrag};
