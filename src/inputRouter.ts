export interface Bounds {x: number; y: number; width: number; height: number}
export interface PenMotion {x: number; y: number; toolType: number; action: number; eventTime: number; pointerCount?: number}
export interface GestureEvents {start(x:number,y:number):void;move(x:number,y:number):void;end(x:number,y:number):void;cancel():void}
interface Target {bounds?: Bounds; priority: number; disabled(): boolean; press(x: number, y: number): void; hold?(): void;drag?:GestureEvents}
const inside = (b: Bounds, x: number, y: number) => b.width>0&&b.height>0&&x>=b.x&&y>=b.y&&x<=b.x+b.width&&y<=b.y+b.height;
/** Native EMR fallback. Touch remains on RN; matching release timestamps deduplicate both channels. */
export class InputRouter {
  private targets = new Map<string,Target>(); private active = false;
  private observers = new Set<(active:boolean)=>void>();
  private gesture?: {id: string; x: number; y: number; moved: boolean; held: boolean; timer?: ReturnType<typeof setTimeout>};
  private echo?: {id: string; origin: string; stamp: number; wall: number};
  private drag?:{id:string;origin:'rn'|'pen';bounds:Bounds;stamp:number};
  private dragEcho?:{id:string;origin:string;start:number;end:number;wall:number};
  private now:()=>number;
  constructor(now = () => Date.now()) {this.now=now;}
  observeActive(observer:(active:boolean)=>void) {this.observers.add(observer);observer(this.active);return()=>{this.observers.delete(observer);};}
  setActive(active: boolean) {if(this.active===active)return;this.active=active;if(!active)this.cancel();for(const observer of this.observers)observer(active);}
  register(id: string, target: Target) {this.targets.set(id,target); return () => {if(this.drag?.id===id)this.cancelDrag();this.targets.delete(id);if(this.gesture?.id===id)this.cancel();};}
  bounds(id: string, bounds: Bounds) {const target=this.targets.get(id); if(target)target.bounds=bounds;}
  private invoke(id: string, origin: 'pen'|'rn', stamp: number, hold = false, x = 0, y = 0) {
    const target=this.targets.get(id);if(!this.active || !target || target.disabled())return;
    const old=this.echo, timed=old && stamp>0 && old.stamp>0;
    if(old?.id===id && old.origin!==origin && (timed?Math.abs(stamp-old.stamp)<32:this.now()-old.wall<160))return;
    this.echo={id,origin,stamp,wall:this.now()};
    if(hold)target.hold?.();else target.press(x,y);
  }
  press(id: string, stamp = 0, x = 0, y = 0) {this.invoke(id,'rn',stamp,false,x,y);}
  hold(id: string, stamp = 0) {this.invoke(id,'rn',stamp,true);}
  startDrag(id:string,x:number,y:number,stamp=0,origin:'rn'|'pen'='rn') {
    const target=this.targets.get(id),old=this.dragEcho;
    if(!this.active||!target?.drag||target.disabled()||!Number.isFinite(x)||!Number.isFinite(y))return;
    if(this.drag&&this.drag.origin!==origin)return;
    // The second RN/EMR channel can replay a whole drag after the first has ended.
    if(old?.id===id&&(stamp>0&&old.start>0
      ?stamp>=old.start-32&&stamp<=old.end+(old.origin!==origin?32:0):old.origin!==origin&&this.now()-old.wall<160))return;
    this.cancelDrag();this.drag={id,origin,stamp,bounds:{...(target.bounds||{x:0,y:0,width:0,height:0})}};
    target.drag.start(x,y);
  }
  moveDrag(id:string,x:number,y:number,origin:'rn'|'pen'='rn') {
    if(this.drag?.id!==id||this.drag.origin!==origin||!Number.isFinite(x)||!Number.isFinite(y))return;
    const target=this.targets.get(id);if(!this.active||target?.disabled()){this.cancelDrag();return;}target?.drag?.move(x,y);
  }
  endDrag(id:string,x:number,y:number,stamp=0,origin:'rn'|'pen'='rn') {
    const g=this.drag;if(!g||g.id!==id||g.origin!==origin)return;
    const target=this.targets.get(id);if(!this.active||target?.disabled()||!Number.isFinite(x)||!Number.isFinite(y)){this.cancelDrag();return;}
    this.drag=undefined;this.dragEcho={id,origin,start:g.stamp,end:stamp,wall:this.now()};target?.drag?.end(x,y);
  }
  cancelDrag(id?:string) {const g=this.drag;if(!g||(id&&g.id!==id))return;this.drag=undefined;this.targets.get(g.id)?.drag?.cancel();}
  cancel() {if(this.gesture?.timer)clearTimeout(this.gesture.timer);this.gesture=undefined;this.cancelDrag();}
  motion(event: PenMotion, density: number) {
    if(!this.active || event.toolType!==2)return;
    if(event.action===3 || (event.pointerCount ?? 1)>1){this.cancel();return;}
    const x=event.x/density,y=event.y/density;if(!Number.isFinite(x)||!Number.isFinite(y))return;
    if(event.action===0){
      if(this.drag?.origin==='rn'){
        const g=this.drag,target=this.targets.get(g.id);
        // Prefer the complete EMR stream if RN only reported the initial contact.
        // Transfer ownership without activating the anchor a second time.
        if(target?.bounds&&inside(target.bounds,x,y)&&!target.disabled()&&
          (!(g.stamp>0&&event.eventTime>0)||Math.abs(g.stamp-event.eventTime)<32)){
          g.origin='pen';g.bounds={...target.bounds};
        }
        return;
      }
      this.cancel();let id:string|undefined,target:Target|undefined;
      for(const [key,candidate]of this.targets)if(candidate.bounds&&inside(candidate.bounds,x,y)&&(!target||candidate.priority>target.priority)){id=key;target=candidate;}
      if(!id||!target)return;
      if(target.drag){this.startDrag(id,x-target.bounds!.x,y-target.bounds!.y,event.eventTime,'pen');return;}
      this.gesture={id,x,y,moved:false,held:false};
      if(target.hold && !target.disabled())this.gesture.timer=setTimeout(()=>{
        const g=this.gesture;if(g?.id===id && !g.moved){g.held=true;this.invoke(id,'pen',0,true);}
      },600);
    }else if(event.action===2 && this.drag?.origin==='pen'){
      const g=this.drag;this.moveDrag(g.id,x-g.bounds.x,y-g.bounds.y,'pen');
    }else if(event.action===1 && this.drag?.origin==='pen'){
      const g=this.drag;this.endDrag(g.id,x-g.bounds.x,y-g.bounds.y,event.eventTime,'pen');
    }else if(event.action===2 && this.gesture){
      const g=this.gesture,t=this.targets.get(g.id);
      // Crop targets commit the release point; buttons cancel a drag rather than activating.
      if(t?.priority!==0 && Math.hypot(x-g.x,y-g.y)>12){g.moved=true;if(g.timer)clearTimeout(g.timer);}
    }else if(event.action===1 && this.gesture){
      const g=this.gesture,t=this.targets.get(g.id);this.cancel();
      if(g.held){this.echo={id:g.id,origin:'pen',stamp:event.eventTime,wall:this.now()};return;}
      if(t?.bounds && !g.moved && inside(t.bounds,x,y))this.invoke(g.id,'pen',event.eventTime,false,x-t.bounds.x,y-t.bounds.y);
    }
  }
}
export const inputRouter = new InputRouter();
