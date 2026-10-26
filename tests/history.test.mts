import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EditHistory,rotateRecipe,mirrorRecipe,initialRecipe} from '../src/history.ts';
test('crop, tone, rotation and switches share history and new edits cut the redo branch',()=>{
 const h=new EditHistory(); h.commit({...h.current,left:.2});h.commit({...h.current,brightness:2});h.commit(rotateRecipe(h.current));h.commit({...h.current,invert:true});
 h.undo();assert.equal(h.current.invert,false);h.undo();assert.equal(h.current.rotation,0);assert.equal(h.current.left,.2);
 h.redo();assert.equal(h.current.rotation,1);h.commit({...h.current,opaqueWhite:true});assert.equal(h.canRedo,false);
 h.restore();assert.deepEqual(h.current,initialRecipe());h.undo();assert.equal(h.current.opaqueWhite,true);
});
test('four turns preserve the same crop and snapshots cannot be mutated',()=>{
 const initial={...initialRecipe(),left:.2273,top:.3621,right:.8123,bottom:.9745};let r=initial;
 for(let i=0;i<4;i++)r=rotateRecipe(r);assert.deepEqual(r,initial);
 const h=new EditHistory();h.current.left=.8;assert.equal(h.current.left,0);
 for(let i=1;i<=150;i++)h.commit({...h.current,brightness:i});let count=0;while(h.undo())count++;assert.equal(count,100);
});

test('mirrors follow displayed axes, carry crop, compose with rotation and undo',()=>{
 const r={...initialRecipe(),left:.1,top:.2,right:.7,bottom:.9};
 assert.deepEqual(mirrorRecipe(mirrorRecipe(r,'horizontal'),'horizontal'),r);
 assert.deepEqual(mirrorRecipe(mirrorRecipe(r,'vertical'),'vertical'),r);
 const h=new EditHistory();h.commit(r);h.commit(mirrorRecipe(h.current,'horizontal'));
 assert.equal(h.current.left,.3);assert.equal(h.current.right,.9);h.commit(rotateRecipe(h.current));
 assert.equal(h.current.mirrorX,false);assert.equal(h.current.mirrorY,true);h.undo();h.undo();assert.deepEqual(h.current,r);
});
