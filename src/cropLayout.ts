import {imageFrame} from './editor.ts';
import type {CropAnchor,Crop} from './editor.ts';
export interface Box {x:number;y:number;width:number;height:number}
export interface Edges {left:number;top:number;right:number;bottom:number}
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));

/** All four display edges share physical-pixel coordinates. Export uses the original recipe. */
export function cropEdges(frame:Box,crop:Crop,density:number):Edges {
  const scale=density>0?density:1,snap=(n:number)=>Math.round(n*scale)/scale;
  return {left:snap(frame.x+frame.width*crop.left),top:snap(frame.y+frame.height*crop.top),
    right:snap(frame.x+frame.width*crop.right),bottom:snap(frame.y+frame.height*crop.bottom)};
}

/** Partition the exterior once: full-width top/bottom and middle-only sides.
 * Filled rectangles avoid Android's border renderer painting corners twice.
 * Shared physical-pixel edges prevent gaps without overlapping translucent fills.
 */
export function cropShades(box:{width:number;height:number},edges:Edges):Box[] {
  const {width,height}=box,left=clamp(edges.left,0,width),right=clamp(edges.right,left,width);
  const top=clamp(edges.top,0,height),bottom=clamp(edges.bottom,top,height);
  return [
    {x:0,y:0,width,height:top},
    {x:0,y:bottom,width,height:height-bottom},
    {x:0,y:top,width:left,height:bottom-top},
    {x:right,y:top,width:width-right,height:bottom-top},
  ].filter(rect=>rect.width>0&&rect.height>0);
}

// Reserve a complete 36-dp anchor hit area even at the original image boundary.
export const ANCHOR_RADIUS=18;
export function cropFrame(width:number,height:number,imageWidth:number,imageHeight:number):Box {
  const inset=Math.min(ANCHOR_RADIUS,Math.max(0,width/2),Math.max(0,height/2));
  const frame=imageFrame(Math.max(0,width-inset*2),Math.max(0,height-inset*2),imageWidth,imageHeight);
  return {...frame,x:frame.x+inset,y:frame.y+inset};
}
export function anchorPoint(edges:Edges,anchor:CropAnchor) {
  const middleX=(edges.left+edges.right)/2,middleY=(edges.top+edges.bottom)/2;
  if(anchor==='top')return {x:middleX,y:edges.top};
  if(anchor==='bottom')return {x:middleX,y:edges.bottom};
  if(anchor==='left')return {x:edges.left,y:middleY};
  if(anchor==='right')return {x:edges.right,y:middleY};
  return {x:anchor==='topLeft'||anchor==='bottomLeft'?edges.left:edges.right,
    y:anchor==='topLeft'||anchor==='topRight'?edges.top:edges.bottom};
}
