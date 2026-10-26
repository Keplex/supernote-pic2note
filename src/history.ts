import {FULL_CROP, NEUTRAL} from './editor.ts';
import type {Recipe} from './editor.ts';
export const initialRecipe = (): Recipe => ({...FULL_CROP, ...NEUTRAL, invert: false, rotation: 0, mirrorX: false, mirrorY: false});
const key = (value: Recipe) => JSON.stringify(value);
/** One history entry per released crop gesture, tone step, preset or toggle. */
export class EditHistory {
  private past: Recipe[] = [];
  private future: Recipe[] = [];
  private value = initialRecipe();
  get current(): Recipe {return {...this.value};}
  get canUndo() {return this.past.length > 0;}
  get canRedo() {return this.future.length > 0;}
  commit(next: Recipe) {
    if (key(next) === key(this.value)) {return false;}
    this.past.push(this.value);if(this.past.length>100)this.past.shift();
    this.value = {...next}; this.future = []; return true;
  }
  undo() {if (!this.canUndo) {return false;} this.future.push(this.value); this.value = this.past.pop()!; return true;}
  redo() {if (!this.canRedo) {return false;} this.past.push(this.value); this.value = this.future.pop()!; return true;}
  restore() {return this.commit(initialRecipe());}
}
export function rotateRecipe(r: Recipe): Recipe {
  const round = (n: number) => Math.round(n * 10000) / 10000;
  return {...r, rotation: ((r.rotation || 0) + 1) % 4, mirrorX: !!r.mirrorY, mirrorY: !!r.mirrorX,
    left: round(1 - r.bottom), top: r.left, right: round(1 - r.top), bottom: r.right};
}

/** Mirror in the displayed axes, including the crop rectangle. */
export function mirrorRecipe(r: Recipe, axis: 'horizontal' | 'vertical'): Recipe {
  const round = (n: number) => Math.round(n * 10000) / 10000;
  return axis === 'horizontal'
    ? {...r, mirrorX: !r.mirrorX, left: round(1-r.right), right: round(1-r.left)}
    : {...r, mirrorY: !r.mirrorY, top: round(1-r.bottom), bottom: round(1-r.top)};
}
