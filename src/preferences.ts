import {NativeModules} from 'react-native';
export type ToolbarSide = 'left' | 'right';
const processor = () => NativeModules.LocalImageProcessor;
export async function loadToolbarSide(): Promise<ToolbarSide> {
  const value = await processor().getToolbarSide();
  return value === 'left' ? 'left' : 'right';
}
export async function saveToolbarSide(value: ToolbarSide): Promise<void> {
  if (await processor().setToolbarSide(value) !== true) {throw new Error('工具栏位置未保存，请重试。');}
}
