// Reserve the whole official idle/move range once, keeping pixels/world-unit.
// Sitting extends below Relax; Sleep is wider. Changing clips never resizes.
function nativeLayout(base,area){
 const scale=base.height/460,padX=Math.max(0,Math.ceil(260*scale-base.width/2)),padBottom=Math.ceil(125*scale);
 const width=base.width+2*padX,height=base.height+padBottom;
 const x=Math.round(Math.max(area.x,Math.min(base.x-padX,area.x+area.width-width))),y=Math.round(Math.max(area.y,Math.min(base.y,area.y+area.height-height)));
 return{bounds:{x,y,width,height},padX,padBottom,frame:{minX:-width/scale/2,minY:-20-padBottom/scale,worldW:width/scale,worldH:height/scale}};
}
module.exports={nativeLayout};
