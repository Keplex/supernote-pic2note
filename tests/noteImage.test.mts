import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectedPicture,prepareSelectedPicture,replacePicture} from '../src/noteImage.ts';
const picture=()=>({uuid:'cached-p',type:200,numInPage:7,layerNum:1,picture:{picturePath:'/original.png',rect:{left:0,top:0,right:200,bottom:100}}});
const ok=(result:unknown)=>({success:true,result});
test('single-picture input retains the exact cached host object and its uuid/accessors',()=>{
 const p=picture();assert.equal(selectedPicture(ok([p])).element,p);
 for(const list of [[],[p,{type:0}],[{...p,type:0}],[{...p,uuid:''}]])assert.throws(()=>selectedPicture(ok(list)));
});
test('writeback passes original uuid directly, without page matching or element refetch',async()=>{
 const original=picture(),calls:string[]=[];let changed:any;
 await replacePicture({measure:async()=>({width:100,height:200}),modify:async(_,element)=>{changed=element;calls.push('modify');return ok([7]);},save:async()=>{calls.push('save');return ok(true);}}, {path:'/n.note',page:0},original,'/edited.png');
 assert.deepEqual(calls,['modify','save']);assert.equal(changed.uuid,original.uuid);assert.equal(changed.numInPage,7);
 assert.deepEqual(changed.picture.rect,{left:75,top:0,right:125,bottom:100});assert.equal(original.picture.picturePath,'/original.png');
});
for(const mode of ['reject','empty','save','size'])test('writeback delegates validation to host and checks its result: '+mode,async()=>{
 let writes=0,saves=0;const api={measure:async()=>({width:mode==='size'?0:100,height:100}),modify:async()=>{writes++;return mode==='reject'?{success:false,error:{message:'host rejected'}}:ok([]);},save:async()=>{saves++;return ok(false);}};
 if(mode==='save')api.modify=async()=>{writes++;return ok([7]);};
 if(mode==='reject')assert.equal((await replacePicture(api,{path:'/n.note',page:0},picture(),'/edited.png') as any).success,false);
 else await assert.rejects(replacePicture(api,{path:'/n.note',page:0},picture(),'/edited.png'));
 assert.equal(writes,mode==='size'?0:1);assert.equal(saves,mode==='save'?1:0);
});

function sourceFixture() {
 const calls:string[]=[],files=new Set(['/readable.png']),removed:string[]=[];
 const result={success:true,result:{imagePath:'/private/lasso.png',rect:{left:10,top:20,right:210,bottom:120},rotateDegree:0}};
 const api={exists:async(path:string)=>{calls.push('exists:'+path);return files.has(path);},measure:async(path:string)=>{calls.push('measure:'+path);return {width:800,height:400};},
  previewPath:async()=>{calls.push('allocate');return '/private/lasso.png';},generatePreview:async(path:string)=>{calls.push('generate:'+path);files.add(path);return result;},removeTemporary:(path:string)=>removed.push(path)};
 return {api,calls,files,removed,result};
}
test('embedded picture without a backing path uses the official host preview and retains its cached metadata',async()=>{
 const f=sourceFixture(),original={...picture(),picture:null as any,angles:{hostAccessor:true},userData:'keep'};
 const source=await prepareSelectedPicture(f.api,ok([original]));
 assert.equal(source.path,'/private/lasso.png');assert.equal(source.temporaryPath,source.path);assert.equal(source.width,800);
 assert.deepEqual(source.element.picture.rect,f.result.result.rect);assert.equal(source.element.uuid,original.uuid);assert.equal(source.element.angles,original.angles);assert.equal(source.element.userData,'keep');
 assert.equal(original.picture,null);assert.deepEqual(f.calls,['allocate','generate:/private/lasso.png','exists:/private/lasso.png','measure:/private/lasso.png']);assert.deepEqual(f.removed,[]);
});
test('deleted original path uses single-picture preview without scanning or replacing page data',async()=>{
 const f=sourceFixture(),original=picture(),source=await prepareSelectedPicture(f.api,ok([original]));
 assert.equal(source.path,'/private/lasso.png');assert.equal(source.element,original);assert.deepEqual(source.element.picture.rect,original.picture.rect);
 assert.ok(f.calls.includes('generate:/private/lasso.png'));assert.equal(source.element.picture.picturePath,'/original.png');
});
test('unreadable host-private/relative source is exported by the host instead of requesting broad filesystem access',async()=>{
 for(const path of ['embedded-image-id.png','/data/host/image.png','file:///data/host/image.png']) {
  const f=sourceFixture();f.api.exists=async p=>{if(p!=='/private/lasso.png')throw Error('not allowed to access');return true;};
  const source=await prepareSelectedPicture(f.api,ok([{...picture(),picture:{...picture().picture,picturePath:path}}]));assert.equal(source.path,'/private/lasso.png');
 }
});
test('valid accessible source skips preview export and avoids losing original resolution',async()=>{
 const f=sourceFixture(),p={...picture(),picture:{...picture().picture,picturePath:'file:///readable.png'}};
 const source=await prepareSelectedPicture(f.api,ok([p]));assert.equal(source.path,'/readable.png');assert.equal(source.element,p);assert.equal(source.temporaryPath,undefined);
 assert.deepEqual(f.calls,['exists:/readable.png','measure:/readable.png']);
});
test('readable file with missing bounds uses preview bounds but retains full-resolution source',async()=>{
 const f=sourceFixture(),p={...picture(),picture:{picturePath:'/readable.png'}};
 const source=await prepareSelectedPicture(f.api,ok([p]));assert.equal(source.path,'/readable.png');assert.deepEqual(source.element.picture.rect,f.result.result.rect);
 assert.deepEqual(f.removed,['/private/lasso.png']);assert.equal(source.temporaryPath,undefined);
});
test('incomplete payload no longer masquerades as a multiple-image selection, while true empty/mixed lasso stays rejected',()=>{
 const only={uuid:'cache',type:200,numInPage:1};assert.equal(selectedPicture(ok([only])).element,only);
 assert.throws(()=>selectedPicture(ok([])),/0 个元素/);assert.throws(()=>selectedPicture(ok([only,{type:0}])),/2 个元素/);
 assert.throws(()=>selectedPicture(ok([{...only,type:0}])),/类型：0/);
});
for(const mode of ['rejected','missing-file','wrong-path','no-bounds','rotated','damaged'])test('host-preview failure cleans its private output and never mutates a note: '+mode,async()=>{
 const f=sourceFixture();
 if(mode==='rejected')f.api.generatePreview=async()=>({success:false,error:{code:1501,message:'permission denied'}} as any);
 if(mode==='missing-file')f.api.exists=async()=>false;
 if(mode==='wrong-path')f.result.result.imagePath='/unrelated.png';
 if(mode==='no-bounds')f.result.result.rect={left:0,top:0,right:0,bottom:0};
 if(mode==='rotated')f.result.result.rotateDegree=90;
 if(mode==='damaged')f.api.measure=async()=>({width:0,height:1});
 await assert.rejects(prepareSelectedPicture(f.api,ok([{uuid:'p',type:200,numInPage:1}])));assert.deepEqual(f.removed,['/private/lasso.png']);
});
