// Order only this pet's own windows, without activating the character.
// alwaysOnTop alone does not order two topmost windows on Windows.
class PetWindowStack {
 constructor(pet){this.pet=pet;this.panels=new Set();this.pending=false;this.lastError=null}
 raise(){const pet=this.pet;if(pet.isDestroyed()||!pet.isVisible())return;try{if([...this.panels].some(panel=>!panel.isDestroyed()&&panel.isVisible()))pet.moveTop();this.lastError=null}catch(e){this.lastError=e.message}}
 schedule(){this.raise();if(this.pending)return;this.pending=true;setImmediate(()=>{this.pending=false;this.raise()})}
 attach(panel){this.panels.add(panel);for(const event of ['show','focus','restore','move','resize'])panel.on(event,()=>this.schedule());panel.on('closed',()=>this.panels.delete(panel));panel.webContents.on('before-input-event',()=>this.schedule());this.schedule()}
 accepts(contents){return[...this.panels].some(w=>!w.isDestroyed()&&w.webContents===contents)}
}
module.exports={PetWindowStack};
