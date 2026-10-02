// Screen-space, inward ink for exposed garment edges. Each attachment is
// composited at its original depth, so its ink cannot paint over later layers.
// Inspect the rendered silhouette rather than neighboring regions in the atlas.
export class GarmentOutline {
 constructor(gl){
  this.gl=gl;this.width=0;this.height=0;this.stats={panels:0};
  const compile=(type,code)=>{const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};
  this.program=gl.createProgram();const vs=compile(gl.VERTEX_SHADER,'attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}');
  const fs=compile(gl.FRAGMENT_SHADER,`precision mediump float;
   uniform sampler2D surface;uniform vec2 viewport;uniform float radius;
   void main(){
    vec2 p=gl_FragCoord.xy/viewport,stepSize=vec2(radius)/viewport;
    vec4 c=texture2D(surface,p);if(c.a<.015){gl_FragColor=vec4(0.);return;}
    float neighbor=1.;
    neighbor=min(neighbor,texture2D(surface,p+stepSize*vec2(1.,0.)).a);
    neighbor=min(neighbor,texture2D(surface,p+stepSize*vec2(-1.,0.)).a);
    neighbor=min(neighbor,texture2D(surface,p+stepSize*vec2(0.,1.)).a);
    neighbor=min(neighbor,texture2D(surface,p+stepSize*vec2(0.,-1.)).a);
    neighbor=min(neighbor,texture2D(surface,p+stepSize*vec2(.707,.707)).a);
    neighbor=min(neighbor,texture2D(surface,p+stepSize*vec2(-.707,.707)).a);
    neighbor=min(neighbor,texture2D(surface,p+stepSize*vec2(.707,-.707)).a);
    neighbor=min(neighbor,texture2D(surface,p+stepSize*vec2(-.707,-.707)).a);
    float luminance=dot(c.rgb/max(c.a,.001),vec3(.2126,.7152,.0722));
    // Existing dark ink is left intact. Cloth interiors and texture shadows
    // away from the silhouette never receive the supplementary line.
    float missingInk=smoothstep(.23,.40,luminance);
    float edge=clamp((c.a-neighbor)*1.3,0.,1.)*missingInk*c.a;
    gl_FragColor=vec4(vec3(.1608,.1608,.1333)*edge,edge);
   }`);
  gl.attachShader(this.program,vs);gl.attachShader(this.program,fs);gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.program));gl.deleteShader(vs);gl.deleteShader(fs);
  this.position=gl.getAttribLocation(this.program,'position');this.viewport=gl.getUniformLocation(this.program,'viewport');this.radius=gl.getUniformLocation(this.program,'radius');this.surface=gl.getUniformLocation(this.program,'surface');this.buffer=gl.createBuffer();this.texture=gl.createTexture();this.framebuffer=gl.createFramebuffer();
 }
 resize(width,height){if(width===this.width&&height===this.height)return;const g=this.gl;this.width=width;this.height=height;g.bindTexture(g.TEXTURE_2D,this.texture);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,width,height,0,g.RGBA,g.UNSIGNED_BYTE,null);g.bindFramebuffer(g.FRAMEBUFFER,this.framebuffer);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,this.texture,0);if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('Garment outline framebuffer incomplete');g.bindFramebuffer(g.FRAMEBUFFER,null)}
 draw(renderer,batcher,shader,sk,mvp,frame,enabled=true){
  const gl=this.gl,{width,height,worldW,worldH,minX,minY}=frame,normal=slots=>{if(!slots.length)return;const proxy=Object.create(sk);proxy.drawOrder=slots;shader.bind();shader.setUniformi('u_texture',0);shader.setUniform4x4f('u_projTrans',mvp.values);batcher.begin(shader);renderer.draw(batcher,proxy);batcher.end();shader.unbind()};
  if(!enabled){normal(sk.drawOrder);this.stats={panels:0};return}
  this.resize(width,height);let group=[],panels=0;const radius=Math.max(.6,.9*height/worldH),pad=Math.ceil(radius)+2;
  for(const slot of sk.drawOrder){group.push(slot);const a=slot.attachment;if(!a?.triangles||slot.color.a<.01||!/^F_[LR]_(Forearm_[bcrs]$|Arm_b$|Collar$|Elbow_cover$)/.test(slot.data.name)&&slot.data.name!=='F_L_Forearm_a')continue;
   const vertices=new Float32Array(a.worldVerticesLength);a.computeWorldVertices(slot,0,vertices.length,vertices,0,2);let x0=width,y0=height,x1=0,y1=0;
   for(let i=0;i<vertices.length;i+=2){const x=(vertices[i]-minX)/worldW*width,y=(vertices[i+1]-minY)/worldH*height;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y)}
   x0=Math.max(0,Math.floor(x0)-pad);y0=Math.max(0,Math.floor(y0)-pad);x1=Math.min(width,Math.ceil(x1)+pad);y1=Math.min(height,Math.ceil(y1)+pad);if(x1<=x0||y1<=y0)continue;
   normal(group);group=[];
   gl.bindFramebuffer(gl.FRAMEBUFFER,this.framebuffer);gl.enable(gl.SCISSOR_TEST);gl.scissor(x0,y0,x1-x0,y1-y0);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);normal([slot]);
   gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.useProgram(this.program);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.uniform1i(this.surface,0);gl.uniform2f(this.viewport,width,height);gl.uniform1f(this.radius,radius);
   gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STREAM_DRAW);gl.enableVertexAttribArray(this.position);gl.vertexAttribPointer(this.position,2,gl.FLOAT,false,0,0);gl.enable(gl.BLEND);
   // Preserve silhouette alpha. Only RGB at an existing fabric edge is inked.
   gl.blendFuncSeparate(gl.ONE,gl.ONE_MINUS_SRC_ALPHA,gl.ZERO,gl.ONE);gl.drawArrays(gl.TRIANGLES,0,6);gl.disableVertexAttribArray(this.position);gl.disable(gl.SCISSOR_TEST);panels++;
  }
  normal(group);this.stats={panels,radiusPixels:radius};
 }
}

