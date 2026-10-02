const DEFAULT_GLASS=Object.freeze({glassColor:'#365949',glassTransparency:60,glassBlur:true});
function readGlass(config={}){
 return{glassColor:/^#[0-9a-f]{6}$/i.test(config.glassColor)?config.glassColor.toLowerCase():DEFAULT_GLASS.glassColor,
 glassTransparency:Number.isFinite(config.glassTransparency)?Math.round(Math.max(0,Math.min(100,config.glassTransparency))):DEFAULT_GLASS.glassTransparency,
 glassBlur:typeof config.glassBlur==='boolean'?config.glassBlur:DEFAULT_GLASS.glassBlur};
}
function validateGlass(p){
 const out={};
 if(p.glassColor!==undefined){if(typeof p.glassColor!=='string'||!/^#[0-9a-f]{6}$/i.test(p.glassColor))throw Error('颜色需要使用 #RRGGBB 格式');out.glassColor=p.glassColor.toLowerCase()}
 if(p.glassTransparency!==undefined){if(!Number.isFinite(p.glassTransparency)||p.glassTransparency<0||p.glassTransparency>100)throw Error('透明度范围为 0–100');out.glassTransparency=Math.round(p.glassTransparency)}
 if(p.glassBlur!==undefined){if(typeof p.glassBlur!=='boolean')throw Error('背景模糊设置无效');out.glassBlur=p.glassBlur}
 return out;
}
module.exports={DEFAULT_GLASS,readGlass,validateGlass};
