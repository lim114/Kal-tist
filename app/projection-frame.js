// One pixels/world-unit scale for both axes, even while Windows changes the
// actual client rectangle. Preserve the existing foot anchor in CSS pixels.
export function projectionFrame(source,width,height,size){
 const oldH=source?.worldH||460,oldW=source?.worldW||oldH*width/height;
 const minX=source?.minX??-oldW/2,minY=source?.minY??-20;
 const scale=Number.isFinite(size)&&size>0?(size+40)/460:Math.min(width/oldW,height/oldH);
 const worldW=width/scale,worldH=height/scale;
 return{...source,minX,minY:minY+oldH-worldH,worldW,worldH,scale};
}
