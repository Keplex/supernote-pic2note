import {test} from 'node:test';
import assert from 'node:assert/strict';
import {toolbarLayout} from '../src/toolbarLayout.ts';
test('toolbar fits all nine controls into the available portrait and landscape height',()=>{
  for(let height=180;height<=1200;height+=5){const v=toolbarLayout(height);assert.ok(v.height<=height);assert.ok(v.circle>=24);assert.ok(v.columns>=1&&v.columns<=3);}
});
test('tall portrait tools have generous gaps and padding while short windows use columns',()=>{
  const portrait=toolbarLayout(650),landscape=toolbarLayout(410);
  assert.equal(portrait.columns,1);assert.equal(portrait.gap,14);assert.equal(portrait.padding,16);
  assert.equal(landscape.columns,2);assert.ok(landscape.height<=410);assert.equal(portrait.width,64);assert.equal(landscape.width,120);
});
