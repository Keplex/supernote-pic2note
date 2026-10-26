import {CROP_ANCHORS,moveAnchor} from './editor.ts';
import type {CropAnchor,Crop} from './editor.ts';
import {ANCHOR_RADIUS,anchorPoint} from './cropLayout.ts';
import type {Box,Edges} from './cropLayout.ts';

interface State {crop:Crop;anchor:CropAnchor;frame:Box;edges:Edges}
interface Gesture {state:State;anchor:CropAnchor;grabbed:boolean;x:number;y:number;dx:number;dy:number;moved:boolean;draft?:Crop}
/** Drag drafts are local display state. One release creates at most one history entry/render. */
export class CropInteraction {
  private gesture?:Gesture;
  private read:()=>State;private activate:(anchor:CropAnchor)=>void;
  private preview:(crop:Crop|null)=>void;private commit:(crop:Crop)=>void;
  constructor(read:()=>State,activate:(anchor:CropAnchor)=>void,preview:(crop:Crop|null)=>void,commit:(crop:Crop)=>void) {
    this.read=read;this.activate=activate;this.preview=preview;this.commit=commit;
  }
  start(x:number,y:number) {
    this.cancel();const state=this.read();if(state.frame.width<=0||state.frame.height<=0||!Number.isFinite(x)||!Number.isFinite(y))return;
    let chosen:CropAnchor|undefined,distance=Infinity;
    for(const c of [state.anchor,...CROP_ANCHORS.filter(c=>c!==state.anchor)]){
      const p=anchorPoint(state.edges,c),d=Math.hypot(x-p.x,y-p.y);
      if(Math.abs(x-p.x)<=ANCHOR_RADIUS&&Math.abs(y-p.y)<=ANCHOR_RADIUS&&d<distance){chosen=c;distance=d;}
    }
    const anchor=chosen||state.anchor,f=state.frame,crop=state.crop;
    // Hit testing uses rounded display pixels; dragging starts from the exact crop
    // coordinate so parallel edge movement cannot introduce a rounding-only edit.
    const p=anchorPoint({left:f.x+f.width*crop.left,right:f.x+f.width*crop.right,
      top:f.y+f.height*crop.top,bottom:f.y+f.height*crop.bottom},anchor);
    this.gesture={state,anchor,grabbed:!!chosen,x,y,dx:chosen?p.x-x:0,dy:chosen?p.y-y:0,moved:false};
    if(chosen)this.activate(chosen);
  }
  private at(g:Gesture,x:number,y:number) {
    const f=g.state.frame;
    return moveAnchor(g.state.crop,g.anchor,(x+g.dx-f.x)/f.width,(y+g.dy-f.y)/f.height);
  }
  move(x:number,y:number) {
    const g=this.gesture;if(!g||!Number.isFinite(x)||!Number.isFinite(y))return;
    if(!g.moved&&Math.hypot(x-g.x,y-g.y)<2)return;
    g.moved=true;const draft=this.at(g,x,y),previous=g.draft||g.state.crop;
    if(draft.left===previous.left&&draft.top===previous.top&&draft.right===previous.right&&draft.bottom===previous.bottom)return;
    g.draft=draft;this.preview(draft);
  }
  end(x:number,y:number) {
    if(!Number.isFinite(x)||!Number.isFinite(y)){this.cancel();return;}
    const g=this.gesture;if(!g)return;this.gesture=undefined;
    const moved=g.moved||Math.hypot(x-g.x,y-g.y)>=2;
    this.preview(null);
    if(!g.grabbed||moved)this.commit(this.at(g,x,y));
  }
  cancel() {if(!this.gesture)return;this.gesture=undefined;this.preview(null);}
}
