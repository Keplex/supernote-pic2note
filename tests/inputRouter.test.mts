import {test} from 'node:test';
import assert from 'node:assert/strict';
import {InputRouter} from '../src/inputRouter.ts';
function fixture(){let clock=1000;const r=new InputRouter(()=>clock),calls:string[]=[];r.setActive(true);
 r.register('crop',{priority:0,bounds:{x:0,y:0,width:300,height:500},disabled:()=>false,press:(x,y)=>calls.push('crop:'+x+','+y)});
 r.register('tool',{priority:10,bounds:{x:200,y:50,width:60,height:50},disabled:()=>false,press:()=>calls.push('tool'),hold:()=>calls.push('hold')});
 const pen=(action:number,x=460,y=150,stamp=clock)=>r.motion({action,x,y,toolType:2,eventTime:stamp},2);
 return{r,calls,pen,time:(n:number)=>{clock=n;}};}
test('EMR uses screen-pixel density and selects overlay tool ahead of crop',()=>{
 const f=fixture();f.pen(0);f.pen(1);assert.deepEqual(f.calls,['tool']);f.r.press('tool',1000);assert.deepEqual(f.calls,['tool']);
 f.time(1020);f.pen(0);f.pen(1,460,150,1020);assert.deepEqual(f.calls,['tool','tool']);
});
test('RN-first duplicate is suppressed, finger-only press remains immediate',()=>{
 const f=fixture();f.r.press('tool',1000);f.pen(0);f.pen(1);assert.deepEqual(f.calls,['tool']);f.r.press('tool',1200);assert.deepEqual(f.calls,['tool','tool']);
 f.r.motion({toolType:1,action:1,x:230,y:75,eventTime:1200},1);assert.equal(f.calls.length,2);
});
test('disabled tool consumes pen hit without cropping behind it',()=>{
 const f=fixture();f.r.register('tool',{priority:10,bounds:{x:200,y:50,width:60,height:50},disabled:()=>true,press:assert.fail});f.pen(0);f.pen(1);assert.deepEqual(f.calls,[]);
});
test('pen drag commits crop release coordinates but cancels dragging a button',()=>{
 const f=fixture();f.pen(0);f.pen(2,500,180);f.pen(1,460,150);assert.deepEqual(f.calls,[]);
 f.pen(0,40,40);f.pen(2,160,200);f.pen(1,160,200);assert.deepEqual(f.calls,['crop:80,100']);
});
test('pen cancel, multiple pointers and closed overlay never activate',()=>{
 const f=fixture();f.pen(0);f.pen(3);f.pen(1);f.pen(0);f.r.motion({toolType:2,action:2,x:460,y:150,eventTime:1000,pointerCount:2},2);f.pen(1);
 f.r.setActive(false);f.r.press('tool');f.pen(0);f.pen(1);assert.deepEqual(f.calls,[]);
});
test('long pen hold fires once and release does not also invoke a tap',context=>{
 context.mock.timers.enable({apis:['setTimeout']});const f=fixture();f.pen(0);context.mock.timers.tick(600);assert.deepEqual(f.calls,['hold']);f.pen(1);f.r.press('tool',1000);assert.deepEqual(f.calls,['hold']);
});
test('layout updates and target removal take effect immediately',()=>{
 const f=fixture();f.r.bounds('tool',{x:100,y:50,width:60,height:50});f.pen(0);f.pen(1);assert.match(f.calls[0],/^crop:/);
 const remove=f.r.register('temp',{priority:20,bounds:{x:200,y:50,width:60,height:50},disabled:()=>false,press:assert.fail});f.pen(0);remove();f.pen(1);assert.equal(f.calls.length,1);
});

test('active observers detach input on close and ignore redundant state notifications',()=>{
 const r=new InputRouter(),states:boolean[]=[];const remove=r.observeActive(v=>states.push(v));r.setActive(true);r.setActive(true);r.setActive(false);remove();r.setActive(true);assert.deepEqual(states,[false,true,false]);
});

test('zero-sized bounds invalidate a control during orientation relayout',()=>{
 const f=fixture();f.r.bounds('tool',{x:230,y:75,width:0,height:0});f.pen(0);f.pen(1);
 assert.match(f.calls[0],/^crop:/);assert.ok(!f.calls.includes('tool'));
});

function dragFixture(){const r=new InputRouter(()=>1000),events:any[]=[],bounds={x:10,y:20,width:100,height:100};let disabled=false;r.setActive(true);
 const remove=r.register('canvas',{priority:0,bounds,disabled:()=>disabled,press:assert.fail,
   drag:{start:(x,y)=>events.push(['start',x,y]),move:(x,y)=>events.push(['move',x,y]),end:(x,y)=>events.push(['end',x,y]),cancel:()=>events.push(['cancel'])}});
 const pen=(action:number,x:number,y:number,stamp:number)=>r.motion({toolType:2,action,x:x*2,y:y*2,eventTime:stamp},2);
 return {r,events,pen,remove,disable:()=>{disabled=true;}};
}
test('continuous pen drag streams live positions, captures initial origin and ends outside the canvas',()=>{
 const f=dragFixture();f.pen(0,30,50,100);f.r.bounds('canvas',{x:20,y:40,width:100,height:100});f.pen(2,90,100,150);f.pen(1,250,280,200);
 assert.deepEqual(f.events,[['start',20,30],['move',80,80],['end',240,260]]);
});
test('RN/EMR drag echoes commit once in either channel order, including a delayed full replay',()=>{
 for(const first of ['rn','pen']){const f=dragFixture();
   if(first==='rn'){f.r.startDrag('canvas',20,30,100);f.pen(0,30,50,100);f.r.moveDrag('canvas',50,60);f.pen(2,60,80,150);f.r.endDrag('canvas',70,80,200);f.pen(1,80,100,200);
     f.pen(0,30,50,100);f.pen(2,60,80,150);f.pen(1,80,100,200);
   }else{f.pen(0,30,50,100);f.r.startDrag('canvas',20,30,100);f.pen(2,60,80,150);f.r.moveDrag('canvas',50,60);f.pen(1,80,100,200);f.r.endDrag('canvas',70,80,200);
     f.r.startDrag('canvas',20,30,100);f.r.moveDrag('canvas',50,60);f.r.endDrag('canvas',70,80,200);
   }
   assert.deepEqual(f.events,[['start',20,30],['move',50,60],['end',70,80]]);
   f.r.startDrag('canvas',20,30,400);f.r.endDrag('canvas',20,30,450);assert.equal(f.events.length,5,'A genuinely later touch remains responsive');
 }
});
test('cancellation, disabled state, removal and closing discard continuous drag without committing',()=>{
 for(const mode of ['cancel','disable','remove','close']){const f=dragFixture();f.pen(0,30,50,100);f.pen(2,60,80,150);
   if(mode==='cancel')f.pen(3,60,80,160);if(mode==='disable'){f.disable();f.pen(2,60,80,160);}if(mode==='remove')f.remove();if(mode==='close')f.r.setActive(false);
   f.pen(1,80,100,200);assert.deepEqual(f.events,[['start',20,30],['move',50,60],['cancel']]);
 }
});
test('native EMR takes over a partial RN contact without a second activation or waiting for RN release',()=>{
 const f=dragFixture();f.r.startDrag('canvas',20,30,100);f.pen(0,30,50,100);f.pen(2,60,80,150);f.pen(1,80,100,200);
 assert.deepEqual(f.events,[['start',20,30],['move',50,60],['end',70,80]]);
 f.r.endDrag('canvas',70,80,200);assert.equal(f.events.length,3);
});
