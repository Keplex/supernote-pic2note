import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cropEdges,cropShades,cropFrame,anchorPoint} from '../src/cropLayout.ts';
import {imageFrame,FULL_CROP,CORNERS,CROP_ANCHORS,EDGE_ANCHORS} from '../src/editor.ts';
test('all display crop edges land on the same physical grid without modifying export coordinates',()=>{
  const crop={left:.1234,top:.2345,right:.6789,bottom:.7891},before={...crop};
  for(const density of [1,1.5,2,2.625,3]){
    const bounds=cropEdges(imageFrame(601.5,713.25,817,1031),crop,density);
    for(const edge of Object.values(bounds))assert.ok(Math.abs(edge*density-Math.round(edge*density))<1e-8);
  }
  assert.deepEqual(crop,before);
});
test('shade partitions cover every exterior region exactly once, including all four corners and cut joins',()=>{
  for(const density of [1,1.5,2,2.625,3])for(const crop of [FULL_CROP,
    {left:.25,top:.2,right:.75,bottom:.8},{left:0,top:.8,right:.02,bottom:1},
    {left:.97,top:0,right:1,bottom:.02}]){
    const box={width:601.5,height:713.25},frame=imageFrame(box.width,box.height,817,1031);
    const e=cropEdges(frame,crop,density),rects=cropShades(box,e);
    // Testing cell centers across every partition and exact shared edges checks both
    // the former double-alpha corners and the earlier uncovered cut rows.
    const xs=[0,e.left,e.right,box.width],ys=[0,e.top,e.bottom,box.height];
    for(let x=0;x<3;x++)for(let y=0;y<3;y++){
      if(xs[x]>=xs[x+1]||ys[y]>=ys[y+1])continue;
      const px=(xs[x]+xs[x+1])/2,py=(ys[y]+ys[y+1])/2;
      const count=rects.filter(r=>px>=r.x&&px<r.x+r.width&&py>=r.y&&py<r.y+r.height).length;
      assert.equal(count,x===1&&y===1?0:1);
    }
    for(const py of [e.top-1/density,e.top,e.bottom-1/density,e.bottom]){
      if(py<0||py>=box.height)continue;
      const px=Math.max(0,e.left-2/density);
      if(px>=e.left)continue;
      assert.equal(rects.filter(r=>px>=r.x&&px<r.x+r.width&&py>=r.y&&py<r.y+r.height).length,1);
    }
  }
});

test('every full-image anchor stays completely visible across aspect ratios and densities',()=>{
  for(const [width,height]of [[600,600],[800,360],[340,800],[80,100]])for(const [iw,ih]of [[800,600],[600,800],[20,2000],[2000,20]])for(const density of [1,1.5,2,2.625,3]){
    const edges=cropEdges(cropFrame(width,height,iw,ih),FULL_CROP,density);
    for(const c of CROP_ANCHORS){const p=anchorPoint(edges,c);assert.ok(p.x-7>=0&&p.x+7<=width);assert.ok(p.y-7>=0&&p.y+7<=height);}
  }
});
test('edge anchors remain at the midpoint of the current crop, including fractional coordinates',()=>{
 const e={left:20.5,top:30,right:201,bottom:300.5};
 assert.deepEqual(EDGE_ANCHORS.map(c=>anchorPoint(e,c)),[{x:110.75,y:30},{x:110.75,y:300.5},{x:20.5,y:165.25},{x:201,y:165.25}]);
});
test('four corner coordinates independently pair left/right with top/bottom',()=>{
 const e={left:20,top:30,right:200,bottom:300};
 assert.deepEqual(CORNERS.map(c=>anchorPoint(e,c)),[{x:20,y:30},{x:200,y:30},{x:20,y:300},{x:200,y:300}]);
});
