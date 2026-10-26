export interface Crop {left: number; top: number; right: number; bottom: number}
export interface Tone {brightness: number; contrast: number; shadows: number; highlights: number; black: number; white: number; autoLevels: boolean; opaqueWhite: boolean; invert?: boolean}
export type Recipe = Crop & Tone & {rotation?: number; mirrorX?: boolean; mirrorY?: boolean};
export interface RenderResult {
  path: string; width: number; height: number; black: number; white: number;
}
export const FULL_CROP: Crop = {left: 0, top: 0, right: 1, bottom: 1};
export const NEUTRAL: Tone = {brightness: 0, contrast: 0, shadows: 0, highlights: 0, black: 0, white: 255, autoLevels: false, opaqueWhite: false};
export type Corner = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
export type CropAnchor = Corner | 'top' | 'bottom' | 'left' | 'right';
export const CORNERS:Corner[]=['topLeft','topRight','bottomLeft','bottomRight'];
export const EDGE_ANCHORS:CropAnchor[]=['top','bottom','left','right'];
export const CROP_ANCHORS:CropAnchor[]=[...CORNERS,...EDGE_ANCHORS];
export type ToneControl = 'brightness' | 'contrast' | 'shadows' | 'highlights';
export const PRESETS: {name: string; tone: Tone}[] = [
  {name: '自然', tone: {...NEUTRAL}},
  {name: '均衡', tone: {...NEUTRAL, autoLevels: true}},
  {name: '提亮', tone: {...NEUTRAL, brightness: 2, shadows: 2}},
  {name: '压暗', tone: {...NEUTRAL, brightness: -2, highlights: 2}},
  {name: '线稿', tone: {...NEUTRAL, contrast: 3, autoLevels: true}},
];
function clamp(n: number, min: number, max: number): number {return Math.max(min, Math.min(max, n));}
export function moveAnchor(crop: Crop, anchor: CropAnchor, x: number, y: number): Crop {
  // Return only crop coordinates: never round the booleans in a structural Recipe.
  const bounds = {left: crop.left, top: crop.top, right: crop.right, bottom: crop.bottom};
  if (!Number.isFinite(x) || !Number.isFinite(y)) {return bounds;}
  const result={...bounds};
  if(anchor==='left'||anchor==='topLeft'||anchor==='bottomLeft')result.left=clamp(x,0,crop.right-.02);
  if(anchor==='right'||anchor==='topRight'||anchor==='bottomRight')result.right=clamp(x,crop.left+.02,1);
  if(anchor==='top'||anchor==='topLeft'||anchor==='topRight')result.top=clamp(y,0,crop.bottom-.02);
  if(anchor==='bottom'||anchor==='bottomLeft'||anchor==='bottomRight')result.bottom=clamp(y,crop.top+.02,1);
  return Object.fromEntries(Object.entries(result).map(([key, value]) => [key, Math.round(value * 10000) / 10000])) as unknown as Crop;
}
export function imageFrame(boxWidth: number, boxHeight: number, width: number, height: number) {
  if (boxWidth <= 0 || boxHeight <= 0 || width <= 0 || height <= 0) {return {x: 0, y: 0, width: 0, height: 0};}
  const scale = Math.min(boxWidth / width, boxHeight / height);
  return {x: (boxWidth - width * scale) / 2, y: (boxHeight - height * scale) / 2, width: width * scale, height: height * scale};
}
export function stepTone(tone: Tone, field: ToneControl, direction: number): Tone {
  const minimum = field === 'brightness' || field === 'contrast' ? -4 : 0;
  return {...tone, [field]: clamp(tone[field] + direction, minimum, 4)};
}
export function recipeKey(crop: Crop, tone: Tone, rotation = 0, mirrorX = false, mirrorY = false): string {
  return JSON.stringify([crop.left, crop.top, crop.right, crop.bottom, tone.brightness, tone.contrast,
    tone.shadows, tone.highlights, tone.black, tone.white, tone.autoLevels, tone.opaqueWhite, !!tone.invert, rotation, mirrorX, mirrorY]);
}
export function resolvedRecipe(crop: Crop, tone: Tone, rendered: RenderResult): Recipe {
  return {...crop, ...tone, black: rendered.black, white: rendered.white, autoLevels: false};
}

/** Without auto levels, moving crop bounds changes only the overlay/export region. */
export function canReusePreview(previous: Recipe,next: Recipe): boolean {
  return !previous.autoLevels && !next.autoLevels
    && recipeKey(FULL_CROP,previous,previous.rotation,!!previous.mirrorX,!!previous.mirrorY)
      === recipeKey(FULL_CROP,next,next.rotation,!!next.mirrorX,!!next.mirrorY);
}
