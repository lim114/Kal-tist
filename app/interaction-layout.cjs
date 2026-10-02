// Keep world (0,0), the character's foot anchor, at the exact same screen pixel.
// Window clamping changes the projection, never the character's size/position.
function layoutInteraction(b,area,bounds){const scale=b.height/460,anchorX=b.x+b.width/2,anchorY=b.y+b.height-20*scale;
 const padding=22,minX=bounds.minX-padding,minY=Math.min(-20,bounds.minY-padding),maxX=bounds.maxX+padding,maxY=bounds.maxY+padding;
 const width=Math.min(Math.ceil((maxX-minX)*scale),area.width-16),height=Math.min(Math.ceil((maxY-minY)*scale),area.height-16);
 const x=Math.round(Math.max(area.x,Math.min(anchorX+minX*scale,area.x+area.width-width))),y=Math.round(Math.max(area.y,Math.min(anchorY-maxY*scale,area.y+area.height-height)));
 const anchor={x:anchorX,y:anchorY,scale},rect={x,y,width,height};
 return{bounds:rect,frame:frameForBounds(rect,anchor,bounds),anchor};
}
function frameForBounds(rect,anchor,bounds){
 const {x,y,width,height}=rect,{x:anchorX,y:anchorY,scale}=anchor;
 const frame={minX:(x-anchorX)/scale,minY:(anchorY-y-height)/scale,worldW:width/scale,worldH:height/scale};
 // Only the separate companion root is placed into spare screen space at edges.
 const fit=Math.min(1,(frame.worldW-16)/(bounds.maxX-bounds.minX),(frame.worldH-16)/(bounds.maxY-bounds.minY));
 const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));frame.companionScale=fit;frame.companionX=clamp(0,frame.minX+8-bounds.minX*fit,frame.minX+frame.worldW-8-bounds.maxX*fit);frame.companionY=clamp(0,frame.minY+8-bounds.minY*fit,frame.minY+frame.worldH-8-bounds.maxY*fit);
 return frame;
}
module.exports={layoutInteraction,frameForBounds};
