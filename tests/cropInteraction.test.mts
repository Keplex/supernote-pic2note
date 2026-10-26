import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CropInteraction} from '../src/cropInteraction.ts';
import {CORNERS,CROP_ANCHORS,EDGE_ANCHORS,FULL_CROP} from '../src/editor.ts';
import type {CropAnchor,Crop} from '../src/editor.ts';
import {cropEdges,anchorPoint} from '../src/cropLayout.ts';
function fixture(crop:Crop={...FULL_CROP},anchor:CropAnchor='topLeft'){
  const frame={x:30,y:40,width:400,height:300},commits:Crop[]=[],previews:(Crop|null)[]=[],activated:CropAnchor[]=[];
  const state={crop,anchor,frame,edges:cropEdges(frame,crop,2)};
  const interaction=new CropInteraction(()=>state,c=>{state.anchor=c;activated.push(c);},c=>previews.push(c),c=>commits.push(c));
  return {state,interaction,commits,previews,activated};
}
test('all eight anchors activate by tap without moving the crop or recording an edit',()=>{
  for(const c of CROP_ANCHORS){const f=fixture(),p=anchorPoint(f.state.edges,c);f.interaction.start(p.x,p.y);f.interaction.end(p.x,p.y);
    assert.deepEqual(f.activated,[c]);assert.deepEqual(f.commits,[]);assert.deepEqual(f.state.crop,FULL_CROP);}
});
test('dragging any inactive anchor previews immediately and commits only the final position once',()=>{
  for(const c of CORNERS){const f=fixture(undefined,c==='topLeft'?'bottomRight':'topLeft'),p=anchorPoint(f.state.edges,c);
    f.interaction.start(p.x,p.y);f.interaction.move(p.x+(p.x<200?30:-30),p.y+(p.y<200?20:-20));
    assert.equal(f.previews.length,1);assert.equal(f.commits.length,0);assert.equal(f.state.anchor,c);
    const left=c==='topLeft'||c==='bottomLeft',top=c==='topLeft'||c==='topRight';
    const x=left?110:350,y=top?100:280;f.interaction.end(x,y);f.interaction.end(x,y);
    assert.equal(f.commits.length,1);assert.deepEqual(f.commits[0],{left:left ? .2 : 0,top:top ? .2 : 0,right:left?1:.8,bottom:top?1:.8});
    assert.equal(f.previews.at(-1),null);
  }
});
test('tapping elsewhere moves the active corner while preserving its opposite corner',()=>{
  for(const c of CORNERS){const f=fixture(undefined,c);f.interaction.start(230,190);f.interaction.end(230,190);
    const left=c==='topLeft'||c==='bottomLeft',top=c==='topLeft'||c==='topRight';
    assert.deepEqual(f.commits,[{left:left ? .5 : 0,top:top ? .5 : 0,right:left?1:.5,bottom:top?1:.5}]);assert.deepEqual(f.activated,[]);
  }
});
test('drag capture follows pointer outside the image, clamps safely and preserves the grab offset',()=>{
  const f=fixture(),p=anchorPoint(f.state.edges,'bottomRight');f.interaction.start(p.x-4,p.y-3);f.interaction.move(p.x-44,p.y-33);
  assert.deepEqual(f.previews[0],{left:0,top:0,right:.9,bottom:.9});f.interaction.end(-100,-100);
  assert.deepEqual(f.commits[0],{left:0,top:0,right:.02,bottom:.02});
});
test('cancelled anchor drag discards the draft and never commits; the next gesture still works',()=>{
  const f=fixture();f.interaction.start(30,40);f.interaction.move(100,100);f.interaction.cancel();f.interaction.end(150,150);
  assert.equal(f.commits.length,0);assert.equal(f.previews.at(-1),null);f.interaction.start(230,190);f.interaction.end(230,190);assert.equal(f.commits.length,1);
});
test('small crops choose the nearest anchor, rather than a fixed overlapping hit-box order',()=>{
  for(const c of CROP_ANCHORS){const f=fixture({left:.4,top:.4,right:.42,bottom:.42}),p=anchorPoint(f.state.edges,c);
    f.interaction.start(p.x,p.y);f.interaction.end(p.x,p.y);assert.deepEqual(f.activated,[c]);assert.equal(f.commits.length,0);}
});
test('active edge anchors place only their own edge when tapping elsewhere',()=>{
  for(const c of EDGE_ANCHORS){const f=fixture({left:.1,top:.2,right:.9,bottom:.8},c);
    f.interaction.start(230,190);f.interaction.end(230,190);
    assert.deepEqual(f.commits,[{...f.state.crop,[c]:.5}]);assert.deepEqual(f.activated,[]);
  }
});
test('each inactive edge drags live along one axis and releases exactly once',()=>{
  for(const c of EDGE_ANCHORS){const f=fixture(),p=anchorPoint(f.state.edges,c);
    const dx=c==='left'?40:c==='right'?-40:70,dy=c==='top'?30:c==='bottom'?-30:70;
    f.interaction.start(p.x,p.y);f.interaction.move(p.x+dx,p.y+dy);
    const expected={...FULL_CROP,[c]:(c==='left'||c==='top') ? .1 : .9};
    assert.equal(f.state.anchor,c);assert.deepEqual(f.previews,[expected]);assert.equal(f.commits.length,0);
    f.interaction.end(p.x+dx,p.y+dy);f.interaction.end(p.x+dx,p.y+dy);assert.deepEqual(f.commits,[expected]);
  }
});
test('edge dragging clamps at the opposite edge, ignores parallel motion and cancels without edits',()=>{
  for(const c of EDGE_ANCHORS){const f=fixture(),p=anchorPoint(f.state.edges,c);f.interaction.start(p.x,p.y);
    f.interaction.move(p.x+(c==='top'||c==='bottom'?50:0),p.y+(c==='left'||c==='right'?50:0));
    assert.deepEqual(f.previews,[],'Moving parallel to an edge does not change the crop');
    f.interaction.move(c==='left'?10000:-10000,c==='top'?10000:-10000);
    assert.deepEqual(f.previews.at(-1),{...FULL_CROP,[c]:(c==='left'||c==='top') ? .98 : .02});
    f.interaction.cancel();f.interaction.end(p.x,p.y);assert.deepEqual(f.commits,[]);assert.equal(f.previews.at(-1),null);
  }
});
test('parallel edge movement does not drift a fractional crop onto rounded display pixels',()=>{
 for(const c of EDGE_ANCHORS){const f=fixture({left:.1234,top:.2345,right:.8765,bottom:.7891}),p=anchorPoint(f.state.edges,c);
   f.interaction.start(p.x,p.y);f.interaction.move(p.x+(c==='top'||c==='bottom'?30:0),p.y+(c==='left'||c==='right'?30:0));
   assert.deepEqual(f.previews,[]);f.interaction.end(p.x+(c==='top'||c==='bottom'?30:0),p.y+(c==='left'||c==='right'?30:0));
   assert.deepEqual(f.commits,[f.state.crop]);
 }
});
test('invalid or unmeasured input never creates a crop',()=>{
  const f=fixture();f.state.frame.width=0;f.interaction.start(100,100);f.interaction.end(200,200);assert.equal(f.commits.length,0);
  f.state.frame.width=400;f.interaction.start(NaN,0);f.interaction.end(200,200);assert.equal(f.commits.length,0);
  f.interaction.start(30,40);f.interaction.move(100,100);f.interaction.end(Infinity,100);assert.equal(f.commits.length,0);assert.equal(f.previews.at(-1),null);
});
test('repeated or boundary-clamped moves do not republish an identical visual draft',()=>{
 const f=fixture();f.interaction.start(30,40);f.interaction.move(100,100);f.interaction.move(100,100);
 assert.equal(f.previews.length,1);f.interaction.move(-100,-100);f.interaction.move(-200,-200);
 assert.equal(f.previews.length,2);assert.deepEqual(f.previews[1],FULL_CROP);assert.equal(f.commits.length,0);
});
