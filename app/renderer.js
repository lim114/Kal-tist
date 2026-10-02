import spine from'./vendor/spine-webgl.js';
import{projectionFrame}from'./projection-frame.js';
import{QuestionEffect}from'./question-effect.js';
import{OcclusionAudit}from'./occlusion-rules.js';
import{TurnController}from'./turn-controller.js';
import{TransitionController,anchors,transitionRoutes,routePose}from'./transition-library.js';
import{applyWristSurfaces}from'./wrist-surface.js';
import{GarmentOutline}from'./garment-outline.js';


import{PetBehavior,resolveBase}from'./behavior.js';
import{OfficialMotion}from'./official-motion.js';
import{SleepRuntime}from'./sleep-runtime.js';
const behavior=new PetBehavior();
import{NativeLayer}from'./native-layer.js';import{Cloth}from'./cloth.js';import{applyPalm}from'./palm.js';import{targets,sample,loopPose,ease}from'./choreography.js';import{ThinkingEffect}from'./thinking-effect.js';
const canvas=document.querySelector('#pet'),label=document.querySelector('#label'),host=window.petHost,motion=new TransitionController();
const effectCanvas=document.createElement('canvas');effectCanvas.id='thinking-effect';effectCanvas.style.cssText='position:absolute;inset:0;pointer-events:none';canvas.after(effectCanvas);const thinkingEffect=new ThinkingEffect(effectCanvas);
const questionCanvas=document.createElement('canvas');questionCanvas.id='question-effect';questionCanvas.style.cssText='position:absolute;inset:0;pointer-events:none';effectCanvas.after(questionCanvas);const questionEffect=new QuestionEffect(questionCanvas);
const names={idle:'待机',wave:'放松示意',typing:'输入中',thinking:'思考中',waiting:'等待回应',error:'有些困惑'};
let nativeClock=0,sleepMotion=null,pendingInteraction=false;
let status={},cursor={x:0,y:0},gaze={x:0,y:0},pointerHit=false,press=null,drag=false,touchTimer=null,touch=null,interaction=null,interactionWorld=null,interactionRange=null,interactionOpening=false,total=0,last=performance.now(),loaded=false,manual=null,freeze=null,box={x:0,y:0,w:1,h:1},facing=1,clothAccumulator=0,fps=0,frames=0,fpsStart=last;
const desired=()=>resolveBase({manual,input:status.inputActive,waiting:status.stage==='waiting',running:status.running||status.stage==='review',error:status.stage==='error'});
host.onStatus(s=>{status=s;manual=s.manual;document.body.classList.toggle('busy',s.running);motion.request(desired())});
host.onPointer(p=>{cursor=p;if(p.dragging){behavior.direction(p.dx);return}const hit=loaded&&p.x>box.x&&p.x<box.x+box.w&&p.y>box.y&&p.y<box.y+box.h;if(hit!==pointerHit){pointerHit=hit;host.hit(hit)}});
async function interact(){clearTimeout(touchTimer);touch=null;if(sleepMotion?.busy){pendingInteraction=true;sleepMotion.wake();return}if(interactionOpening)return;if(interaction){interaction.time=0;return}interactionOpening=true;try{const b=interactionRange,side=facing,range=side===-1?{minX:-b.maxX,maxX:-b.minX,minY:b.minY,maxY:b.maxY}:b;interactionWorld=await host.interactionFrame(range);if(drag){await host.interactionFrame(null);interactionWorld=null;return}interaction={time:0,facing:side};}finally{interactionOpening=false}}
canvas.addEventListener('pointerdown',e=>{if(e.button===0){press={x:e.clientX,y:e.clientY,region:e.clientY<box.y+box.h*.43?'headtouch':'bodytouch'};canvas.setPointerCapture(e.pointerId)}});
canvas.addEventListener('pointermove',async e=>{if(press&&!drag&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>6){drag=true;behavior.facing=facing;behavior.direction(e.clientX-press.x);clearTimeout(touchTimer);touch=null;if(interaction){interaction=null;await host.interactionFrame(null);interactionWorld=null}if(drag&&press)host.drag(true)}});
canvas.addEventListener('pointerup',e=>{if(drag){drag=false;host.drag(false)}else if(press&&e.detail<2){const region=press.region;clearTimeout(touchTimer);touchTimer=setTimeout(()=>{if(!interaction)touch={region,time:0}},320)}press=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId)});
canvas.addEventListener('lostpointercapture',()=>{press=null;if(drag){drag=false;host.drag(false)}});
canvas.addEventListener('dblclick',e=>{e.preventDefault();interact()});
canvas.addEventListener('wheel',e=>{if(e.ctrlKey){e.preventDefault();host.resizeStep(-Math.sign(e.deltaY)*6)}},{passive:false});canvas.addEventListener('contextmenu',e=>{e.preventDefault();host.menu()});
async function init(){const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true,preserveDrawingBuffer:true});if(!gl)throw Error('无法启动 WebGL');
 const[atlasText,bytes,img]=await Promise.all([fetch('./assets/model.atlas').then(r=>r.text()),fetch('./assets/model.skel').then(r=>r.arrayBuffer()),new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src='./assets/model.png'})]);
 const texture=new spine.webgl.GLTexture(gl,img),atlas=new spine.TextureAtlas(atlasText,()=>texture),data=new spine.SkeletonBinary(new spine.AtlasAttachmentLoader(atlas)).readSkeletonData(new Uint8Array(bytes)),sk=new spine.Skeleton(data),native=new NativeLayer(spine,data),official=new OfficialMotion(spine,data),cloth=new Cloth(),turn=new TurnController(spine,data,facing);
 sleepMotion=new SleepRuntime(spine,data);
 interactionRange={minX:Infinity,minY:Infinity,maxX:-Infinity,maxY:-Infinity};for(let t=0;t<=native.interact.duration;t+=.08){native.base(sk,0);native.interact.apply(sk,0,t,false,[],1,spine.MixBlend.replace,spine.MixDirection.mixIn);sk.updateWorldTransform();for(const slot of sk.slots)if(slot.color.a<.01)slot.setAttachment(null);const o=new spine.Vector2(),z=new spine.Vector2();sk.getBounds(o,z,[]);interactionRange.minX=Math.min(interactionRange.minX,o.x);interactionRange.minY=Math.min(interactionRange.minY,o.y);interactionRange.maxX=Math.max(interactionRange.maxX,o.x+z.x);interactionRange.maxY=Math.max(interactionRange.maxY,o.y+z.y)}
 native.base(sk,0);const occlusion=new OcclusionAudit(data);let layerCheck=null,previousClip=null;
 const shader=spine.webgl.Shader.newTwoColoredTextured(gl),batcher=new spine.webgl.PolygonBatcher(gl),renderer=new spine.webgl.SkeletonRenderer(gl),mvp=new spine.webgl.Matrix4();renderer.premultipliedAlpha=true;const garmentOutline=new GarmentOutline(gl);
 function shift(n,x,y){sk.updateWorldTransform();const b=sk.findBone(n),v=new spine.Vector2(b.worldX+x,b.worldY+y);b.parent.worldToLocal(v);b.x=v.x;b.y=v.y}
 function render(now){const dt=freeze?0:Math.min(.05,(now-last)/1000);last=now;if(!freeze)total+=dt;const t=freeze?.time??total,w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.max(2,devicePixelRatio||1);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}
  const base=desired(),officialClip=freeze?null:behavior.update(now,{base,dragging:drag,interaction:!!(interaction||interactionOpening||touch||pendingInteraction)});
  const sleepPlan=freeze?{busy:false,ownsPose:false,released:false}:sleepMotion.update(officialClip==='Sleep',dt,facing,sk);
  if(sleepPlan.released){official.resetRelax();motion.state='idle';motion.transition=null;motion.current=anchors.idle.slice();motion.time=0;cloth.reset(motion.current);previousClip='Relax';}
  motion.request(sleepPlan.busy?'idle':base);
  if(!freeze&&!sleepPlan.busy&&pendingInteraction){pendingInteraction=false;void interact();}
  // Native clips own their entire rig; preserve the current pose when custom
  // actions resume. Idle waits for its authored release route before Relax.
  const returning=base==='idle'&&(motion.transition||motion.state!=='idle');
  let activeClip=freeze?.nativeClip||officialClip;if(!freeze&&returning&&officialClip==='Relax')activeClip=null;
  if(sleepPlan.busy)activeClip=sleepPlan.clip;
  if(!freeze&&previousClip&&!activeClip&&previousClip!=='Sleep'&&base!=='idle'){motion.state='idle';motion.transition=null;motion.current=anchors.idle.slice();motion.time=0;motion.request(base)}
  let p=freeze?(freeze.pose|| (freeze.clip?sample(freeze.state,freeze.time).p:loopPose(freeze.state,freeze.time))):motion.update(dt,loopPose);p=p.slice();if(activeClip)p=Array(18).fill(0);
  if(touch&&!freeze&&!sleepPlan.busy){touch.time+=dt;const r=sample(touch.region,touch.time);for(const i of [6,7,8,9,15,16,17])p[i]=p[i]*(1-r.weight)+r.p[i];if(touch.time>=r.duration)touch=null}
  nativeClock+=dt;
  native.apply(sk,freeze?t:nativeClock,p);const mode=status.config?.facing||'auto',wantedFacing=freeze?.facing||interaction?.facing||(drag?behavior.facing:(mode==='left'?-1:mode==='right'?1:cursor.x<w/2-65?-1:cursor.x>w/2+65?1:turn.desired));sk.scaleX=1;
  for(const[n,i]of[['F_L_Arm',0],['F_L_Forearm',1],['F_L_Hand',2],['F_R_Arm',3],['F_R_Forearm',4],['F_R_Hand',5],['F_Head',6],['F_Chest',8],['F_L_Ear',9]])sk.findBone(n).rotation+=p[i];sk.findBone('F_R_Ear').rotation-=p[9]*.7;
  shift('F_Head_TF',p[16]||0,-p[7]*.32);shift('F_Head',0,-p[7]*.17);
  clothAccumulator+=dt;while(clothAccumulator>=1/120){cloth.step(p);clothAccumulator-=1/120}if(!activeClip)cloth.apply(sk);if(!activeClip)applyPalm(sk,p[12]||0);
  if(interaction&&!freeze){interaction.time+=dt;if(interaction.time>native.interact.duration){interaction=null;host.interactionFrame(null).then(()=>{interactionWorld=null})}else native.interaction(sk,interaction.time)}
  if(freeze?.interaction!=null)native.interaction(sk,freeze.interaction);
  // Exact native frames for review, using the same original rig and renderer.
  if(freeze?.nativeClip){sk.drawOrder.length=sk.slots.length;sk.setToSetupPose();data.findAnimation(activeClip).apply(sk,0,t,false,[],1,spine.MixBlend.replace,spine.MixDirection.mixIn)}
  if(interactionWorld&&(interaction||freeze?.interaction!=null)){sk.updateWorldTransform();const b=sk.findBone('F_Common'),s=interactionWorld.companionScale||1,v=new spine.Vector2(b.worldX*s+(interactionWorld.companionX||0),b.worldY*s+(interactionWorld.companionY||0));b.parent.worldToLocal(v);b.x=v.x;b.y=v.y;b.scaleX*=s;b.scaleY*=s;}
  if(!freeze&&!interaction&&!interactionOpening&&!sleepPlan.ownsPose)official.render(sk,activeClip,dt,'custom');
  if(sleepPlan.busy){turn.reset(sleepMotion.facing)}else if(interaction||freeze){turn.reset(wantedFacing)}else turn.update(dt,wantedFacing,{allowed:!interactionOpening,walking:activeClip==='Move'});
  facing=turn.facing;sk.scaleX=facing;if(!interaction&&!freeze)turn.apply(sk);previousClip=activeClip;
  sk.scaleX=facing;sk.updateWorldTransform();const tracking=!sleepPlan.busy&&activeClip!=='Sleep'&&status.config?.gaze!==false;
  const viewForEyes=projectionFrame(interactionWorld||status.viewport,w,h,status.config?.size),eyeWorldH=viewForEyes.worldH||460,eyeWorldW=viewForEyes.worldW||eyeWorldH*w/h,eyeMinX=viewForEyes.minX??-eyeWorldW/2,eyeMinY=viewForEyes.minY??-20;
  const eyeBones=['F_L_Eyeball','F_R_Eyeball'].map(n=>sk.findBone(n)),eyeCenter={x:eyeBones.reduce((v,b)=>v+b.worldX,0)/2,y:eyeBones.reduce((v,b)=>v+b.worldY,0)/2};
  // Resolve against the actual eye centre, including Sit and expanded Interact.
  // Offsets are screen/world-space; parent.worldToLocal handles mirrored rigs.
  const mouseWorld={x:eyeMinX+cursor.x/w*eyeWorldW,y:eyeMinY+(1-cursor.y/h)*eyeWorldH};
  const goal=freeze?.gaze||(tracking?{x:Math.tanh((mouseWorld.x-eyeCenter.x)/180),y:Math.tanh((mouseWorld.y-eyeCenter.y)/210)}:{x:0,y:0}),easing=freeze?1:1-Math.exp(-dt*10);
  gaze.x+=(goal.x-gaze.x)*easing;gaze.y+=(goal.y-gaze.y)*easing;
  if(tracking||freeze?.gaze)for(const b of eyeBones){const v=new spine.Vector2(b.worldX+gaze.x*2.4,b.worldY+gaze.y*1.5);b.parent.worldToLocal(v);b.x=v.x;b.y=v.y}sk.updateWorldTransform();
  if(!freeze)sleepMotion.finishFrame(sk,official.info(),motion.state==='idle'&&!motion.transition);
  // Approved v3: no garment patches, shoulder rebinding, or old joint repairs.
  
  if(!activeClip&&!interaction&&freeze?.interaction==null&&freeze?.wrists!==false)window.wristStats=applyWristSurfaces(sk);
  // Validate the FINAL rendered order, after official mixing and wrist inserts.
  // Checking only before those stages used to hide hand/sleeve ordering errors.
  layerCheck=occlusion.validate(sk);
  if(freeze?.keep)for(const slot of sk.slots)if(!freeze.keep.includes(slot.data.name))slot.color.a=0;
  if(freeze?.hide)for(const name of freeze.hide){const slot=sk.findSlot(name);if(slot)slot.color.a=0}
  if(freeze?.highlight){const slot=sk.findSlot(freeze.highlight);if(slot){slot.color.r=1;slot.color.g=.08;slot.color.b=.08}}
  const view=projectionFrame(interactionWorld||status.viewport,w,h,status.config?.size);const worldH=view?.worldH||460,worldW=view?.worldW||worldH*w/h,minX=view?.minX??-worldW/2,minY=view?.minY??-20;mvp.ortho2d(minX,minY,worldW,worldH);gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);garmentOutline.draw(renderer,batcher,shader,sk,mvp,{width:canvas.width,height:canvas.height,worldW,worldH,minX,minY},!activeClip&&freeze?.outlines!==false&&!interaction&&freeze?.interaction==null);
  const tr=motion.transition,thinkingWeight=freeze?(freeze.state==='thinking'?1:0):tr?(tr.to==='thinking'?ease(tr.time/tr.duration):motion.state==='thinking'?1-ease(tr.time/tr.duration):0):motion.state==='thinking'?1:0;
  const head=sk.findBone('F_Head');thinkingEffect.draw({w,h,dpr,time:t,dt,active:!activeClip&&!interaction&&!interactionOpening&&freeze?.interaction==null,weight:thinkingWeight,head:{x:head.worldX-facing*125,y:head.worldY+65},frame:{worldH,worldW,minX,minY},freeze:!!freeze});
  const questionWeight=freeze?(freeze.state==='error'?(freeze.clip?sample('error',t).weight:1):0):tr?(tr.to==='error'?ease(tr.time/tr.duration):motion.state==='error'?1-ease(tr.time/tr.duration):0):motion.state==='error'?1:0;
  questionEffect.draw({w,h,dpr,time:t,dt,active:!activeClip&&!interaction&&!interactionOpening&&freeze?.interaction==null,weight:questionWeight,head:{x:head.worldX-facing*132,y:head.worldY+72},frame:{worldH,worldW,minX,minY},freeze:!!freeze});
  const offset=new spine.Vector2(),size=new spine.Vector2();sk.getBounds(offset,size,[]);box={x:(offset.x-minX)/worldW*w,y:h-(offset.y+size.y-minY)/worldH*h,w:size.x/worldW*w,h:size.y/worldH*h};
  label.textContent=interaction?'触摸互动':activeClip?({Relax:'待机 · 放松',Sit:'待机 · 坐姿',Sleep:'熟睡',Move:'移动中'}[activeClip]):names[motion.transition?.to||motion.state]+(status.running?` · ${status.count} 个任务`:'');frames++;if(now-fpsStart>2000){fps=Math.round(frames*1000/(now-fpsStart));frames=0;fpsStart=now;host.report({fps,state:motion.state,interaction:!!interaction,runningTasks:status.count,nativeIdle:true,nativeEyes:true,renderer:'Spine only v11',sleep:sleepMotion.info(),transition:motion.transition?.key||null,turn:turn.info(),occlusion:layerCheck,native:official.info(),monitorError:status.error||null})}
 }
 window.petQA={info:()=>({loaded,state:motion.state,sleep:sleepMotion.info(),native:official.info(),transition:motion.transition?.key||null,turn:turn.info(),occlusion:layerCheck,behavior:behavior.info(performance.now()),drag,desired:motion.desired,interaction:interaction?.time??null,touch:touch?.region||null,fps,facing,gaze,status:{count:status.count},eyes:['F_L_Eye3','F_R_Eye3'].map(n=>sk.findBone(n).scaleY),ears:['F_L_Ear3','F_R_Ear3'].map(n=>sk.findBone(n).rotation)}),hitbox:()=>({...box}),freeze(state,time=0,extra={}){freeze={state,time,...extra};cloth.reset(freeze.pose||targets[freeze.state]||targets.idle);render(performance.now())},resume(){freeze=null},interact,bones:()=>sk.bones.map(b=>({name:b.data.name,x:b.x,y:b.y,rotation:b.rotation,scaleX:b.scaleX,scaleY:b.scaleY})),request(s){manual=s;motion.request(s)}};
 window.petQA.viewport=()=>{const w=canvas.clientWidth,h=canvas.clientHeight,f=projectionFrame(interactionWorld||status.viewport,w,h,status.config?.size);return{scale:h/f.worldH,scaleX:w/f.worldW,x:-f.minX/f.worldW*w,y:h+f.minY/f.worldH*h}};
 window.petQA.native=(clip,time,extra={})=>window.petQA.freeze('idle',time,{...extra,nativeClip:clip});
 window.petQA.layerInventory=()=>({bones:data.bones.length,slots:data.slots.map(s=>({index:s.index,name:s.name,bone:s.boneData.name})),orders:[...occlusion.orders].map(s=>s.split('|')),animations:data.animations.map(a=>({name:a.name,duration:a.duration,orderKeys:a.timelines.filter(t=>t.drawOrders).map(t=>({times:Array.from(t.frames),orders:t.drawOrders}))}))});
 window.petQA.idleFor=seconds=>{const now=performance.now();behavior.since=now-seconds*1000;behavior.next=now+30000};
 window.petQA.thinkingEffect=()=>thinkingEffect.last;window.petQA.questionEffect=()=>questionEffect.last;
 window.petQA.clip=(state,time,extra={})=>{freeze={state,time,clip:true,...extra};cloth.reset(sample(state,0).p);cloth.seek(time,t=>sample(state,t).p);render(performance.now())};
 window.petQA.route=(key,time,extra={})=>{const tr=transitionRoutes[key];freeze={state:tr.to,time,pose:routePose(key,time/tr.duration),...extra};cloth.reset(routePose(key,0));cloth.seek(time,t=>routePose(key,t/tr.duration));render(performance.now())};
 window.petQA.slots=()=>sk.drawOrder.map(s=>({name:s.data.name,alpha:s.color.a,attachment:s.attachment?.name}));window.petQA.pose=()=>motion.current;
 window.petQA.outline=()=>garmentOutline.stats;window.petQA.cloth=()=>cloth.snapshot();window.petQA.garment=()=>({enabled:false});
 window.petQA.meshes=()=>sk.slots.filter(s=>s.attachment?.triangles&&/^F_[LR]_(Forearm|Arm_b)/.test(s.data.name)).map(s=>{const a=s.attachment,v=new Float32Array(a.worldVerticesLength);a.computeWorldVertices(s,0,v.length,v,0,2);return{name:s.data.name,world:Array.from(v),uv:Array.from(a.uvs),tri:Array.from(a.triangles)}});window.petQA.joints=()=>Object.fromEntries(['F_L_Arm','F_L_Forearm','F_L_Hand','F_Mouth'].map(n=>{const b=sk.findBone(n);return[n,{x:b.worldX,y:b.worldY}]}));
 window.petQA.rig=()=>({bones:sk.bones.map(b=>({name:b.data.name,x:b.worldX,y:b.worldY,rotation:b.rotation,scaleX:b.scaleX,scaleY:b.scaleY})),box,viewport:window.petQA.viewport()});
 loaded=true;host.ready();function loop(now){if(now-last>=1000/60-1)render(now);requestAnimationFrame(loop)}requestAnimationFrame(loop);
}init().catch(e=>{document.querySelector('#error').style.display='block';document.querySelector('#error').textContent=String(e);host.report({error:String(e),stack:e.stack})});











