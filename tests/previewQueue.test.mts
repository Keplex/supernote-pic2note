import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PreviewQueue} from '../src/previewQueue.ts';
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
test('preview starts synchronously with no timer or idle delay',async()=>{
 const rendered:number[]=[],published:number[]=[];const q=new PreviewQueue(async(n:number)=>{rendered.push(n);return n;},n=>published.push(n),assert.fail,()=>{});
 q.request(1);assert.deepEqual(rendered,[1]);await flush();assert.deepEqual(published,[1]);q.cancel();
});
test('a running render keeps only the newest pending recipe and never publishes an obsolete result',async()=>{
 const rendered:number[]=[],published:number[]=[];let release!:(n:number)=>void;
 const q=new PreviewQueue((n:number)=>{rendered.push(n);return new Promise<number>(r=>{release=r;});},n=>published.push(n),assert.fail,()=>{});
 q.request(1);q.request(2);q.request(3);assert.deepEqual(rendered,[1]);release(1);await flush();assert.deepEqual(rendered,[1,3]);assert.deepEqual(published,[]);
 release(3);await flush();assert.deepEqual(published,[3]);
});
test('cancel ignores in-flight results and clears the pending render',async()=>{
 let release!:(n:number)=>void;const published:number[]=[],rendered:number[]=[];
 const q=new PreviewQueue((n:number)=>{rendered.push(n);return new Promise<number>(r=>{release=r;});},n=>published.push(n),assert.fail,()=>{});
 q.request(1);q.request(2);q.cancel();release(1);await flush();assert.deepEqual(published,[]);assert.deepEqual(rendered,[1]);
});
test('errors are reported once without an automatic retry loop',async()=>{
 const errors:unknown[]=[];let runs=0;const q=new PreviewQueue(async(_n:number)=>{runs++;throw Error('fail');},assert.fail,e=>errors.push(e),()=>{});
 q.request(1);await flush();assert.equal(runs,1);assert.equal(errors.length,1);q.request(1);await flush();assert.equal(runs,2);
});
test('new image can render immediately after a cancelled obsolete error',async()=>{
 let reject!:(e:Error)=>void;const errors:unknown[]=[],published:number[]=[];
 const q=new PreviewQueue((n:number)=>n===1?new Promise<number>((_,r)=>{reject=r;}):Promise.resolve(n),n=>published.push(n),e=>errors.push(e),()=>{});
 q.request(1);q.cancel();q.request(2);reject(Error('old'));await flush();assert.deepEqual(errors,[]);assert.deepEqual(published,[2]);
});
