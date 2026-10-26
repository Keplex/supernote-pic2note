import {test} from 'node:test';
import assert from 'node:assert/strict';
import {FULL_CROP, NEUTRAL, moveAnchor, stepTone, recipeKey, resolvedRecipe, canReusePreview} from '../src/editor.ts';
test('corners cannot cross, leave image bounds or produce an empty crop', () => {
  const first = moveAnchor({...FULL_CROP}, 'topLeft', 1.1, 0.9);
  assert.deepEqual(first, {left: 0.98, top: 0.9, right: 1, bottom: 1});
  const second = moveAnchor(first, 'bottomRight', -1, -1);
  assert.deepEqual(second, {left: 0.98, top: 0.9, right: 1, bottom: 0.92});
  assert.deepEqual(moveAnchor(second, 'topLeft', NaN, 0), second);
});
test('tone steps respect individual ranges and do not mutate an existing recipe', () => {
  const base = {...NEUTRAL};
  assert.equal(stepTone(base, 'shadows', -1).shadows, 0);
  assert.equal(stepTone({...base, brightness: 4}, 'brightness', 1).brightness, 4);
  assert.equal(stepTone(base, 'contrast', -1).contrast, -1);
  assert.deepEqual(base, NEUTRAL);
});
test('crop or tone changes invalidate the preview key', () => {
  const key = recipeKey(FULL_CROP, NEUTRAL);
  assert.notEqual(key, recipeKey({...FULL_CROP, left: 0.1}, NEUTRAL));
  assert.notEqual(key, recipeKey(FULL_CROP, {...NEUTRAL, brightness: 1}));
  assert.notEqual(key, recipeKey(FULL_CROP, {...NEUTRAL, autoLevels: true}));
  assert.notEqual(key, recipeKey(FULL_CROP, {...NEUTRAL, opaqueWhite: true}));
});
test('export freezes the exact black/white points that were used by preview', () => {
  const result = {path: '/preview.png', width: 100, height: 100, black: 35, white: 215,
    histogram: [], darkPercent: 0, lightPercent: 0};
  const recipe = resolvedRecipe(FULL_CROP, {...NEUTRAL, autoLevels: true, brightness: 2, opaqueWhite: true}, result);
  assert.equal(recipe.black, 35); assert.equal(recipe.white, 215);
  assert.equal(recipe.autoLevels, false); assert.equal(recipe.brightness, 2);
  assert.equal(recipe.opaqueWhite, true);
});

test('moving a crop corner on a full recipe returns only numeric crop bounds',()=>{
 const recipe={...FULL_CROP,...NEUTRAL,autoLevels:true,opaqueWhite:true,invert:true,rotation:1,mirrorX:true};
 const bounds=moveAnchor(recipe,'topLeft',.123456,.234567);
 assert.deepEqual(Object.keys(bounds).sort(),['bottom','left','right','top']);
 const updated={...recipe,...bounds};assert.equal(updated.autoLevels,true);assert.equal(updated.opaqueWhite,true);assert.equal(updated.invert,true);
 assert.equal(updated.mirrorX,true);assert.equal(bounds.left,.1235);
});

test('crop-only changes reuse pixels unless automatic levels depend on the cropped region',()=>{
 const r={...FULL_CROP,...NEUTRAL,rotation:0,mirrorX:false,mirrorY:false};
 assert.equal(canReusePreview(r,{...r,left:.2}),true);
 assert.equal(canReusePreview({...r,autoLevels:true},{...r,autoLevels:true,left:.2}),false);
 assert.equal(canReusePreview(r,{...r,brightness:1}),false);
 assert.equal(canReusePreview(r,{...r,mirrorX:true}),false);
});
