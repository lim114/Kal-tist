// Browser-only visual review; the installed Electron app always supplies petHost.
if(!window.petHost&&new URLSearchParams(location.search).has('review')){
 const state={manual:'wave',running:false,count:0,stage:'idle',config:{facing:'right',gaze:true},client:{},tasks:[]};let push=()=>{},pointer=()=>{};
 const host={onStatus(fn){push=fn;queueMicrotask(()=>push(state))},onPointer(fn){pointer=fn},onPreview(){},ready(){push(state)},hit(){},report(data){window.reviewReport=data},interactionFrame(){return Promise.resolve(null)},drag(){},resizeStep(){},menu(){},typing(){},panel(){}};
 window.petHost=host;window.reviewAction=(action,value)=>{if(action==='state'){state.manual=value;state.running=value==='thinking';state.stage=state.running?'thinking':'idle';state.count=state.running?1:0}if(action==='facing')state.config.facing=value;if(action==='gaze')state.config.gaze=!!value;push(state)};
 addEventListener('pointermove',e=>pointer({x:e.clientX,y:e.clientY}));
}
