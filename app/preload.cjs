const {contextBridge,ipcRenderer}=require('electron');
addEventListener('DOMContentLoaded',()=>{for(const event of ['pointerdown','focusin'])document.addEventListener(event,()=>ipcRenderer.send('pet-above-panel'),true)});
contextBridge.exposeInMainWorld('petHost',{
 onMedia(fn){ipcRenderer.on('media-status',(_e,s)=>fn(s))},
 mediaReady(){ipcRenderer.send('media-ready')},
 onStatus(fn){ipcRenderer.on('status',(_e,s)=>fn(s))},
 onPointer(fn){ipcRenderer.on('pointer',(_e,p)=>fn(p))},
 onPreview(fn){ipcRenderer.on('preview',(_e,s)=>fn(s))},
 typing(active){ipcRenderer.send('typing',!!active)},
 ready(){ipcRenderer.send('ready')},
 panel(){ipcRenderer.send('panel')},
 panelReady(){ipcRenderer.send('panel-ready')},
 bubbleResize(height){ipcRenderer.send('bubble-resize',height)},
 bubbleDismiss(){ipcRenderer.send('bubble-dismiss')},
 keepPetAbove(){ipcRenderer.send('pet-above-panel')},
 interactionFrame(bounds){return ipcRenderer.invoke('interaction-frame',bounds)},
 resizeStep(delta){ipcRenderer.send('resize-step',delta)},
 action(name,payload){return ipcRenderer.invoke('action',name,payload)},
 drag(active){ipcRenderer.send('drag',!!active)},
 menu(){ipcRenderer.send('menu')},
 hit(on){ipcRenderer.send('hit',!!on)},
 report(data){ipcRenderer.send('report',data)}
});
