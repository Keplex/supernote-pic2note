import {prepareSelectedPicture, replacePicture} from './noteImage';
import {Image, NativeModules, ToastAndroid} from 'react-native';
import {FileUtils, PluginCommAPI, PluginManager, PluginNoteAPI, RattaFileSelector} from 'sn-plugin-lib';
import type {Dependencies} from './core';
import {ensurePermission, READ, WRITE} from './core';
import type {Recipe, RenderResult} from './editor';
import {inputRouter} from './inputRouter';
import {setLanguage} from './i18n';
import type {Language} from './i18n';

interface Processor {
  inspect(path: string): Promise<{width: number; height: number}>;
  render(path: string, pluginRoot: string, recipe: Recipe, mode: string): Promise<RenderResult>;
  getLanguage(): Promise<string>;
  setLanguage(language: string): Promise<boolean>;
  latestImage(): Promise<string>;
}
function processor(): Processor {
  const module = NativeModules.LocalImageProcessor as Processor | undefined;
  if (!module?.render) {throw new Error('图片编辑模块未加载。请安装完整升级包并重启设备。');}
  return module;
}
export async function loadLanguage(): Promise<Language> {
  const value = await processor().getLanguage();
  const language = value === 'en' ? 'en' : 'zh';
  setLanguage(language); return language;
}
export async function saveLanguage(language: Language): Promise<void> {
  if (!(await processor().setLanguage(language))) {throw new Error('语言设置未保存，请重试切换。');}
}
let rootPath: Promise<string> | undefined;
async function pluginRoot():Promise<string> {
  return rootPath ||= PluginManager.getPluginDirPath().then(path => {
    if(!path){rootPath=undefined;throw Error('无法读取插件私有目录。');}return path.replace(/\/+$/, '');
  },error=>{rootPath=undefined;throw error;});
}
export async function renderImage(path: string, recipe: Recipe, mode: 'base' | 'export' | 'canvas'): Promise<RenderResult> {
  await ensurePermission(dependencies, READ);
  return processor().render(path, await pluginRoot(), recipe, mode);
}
let lassoSequence=0;
function removeTemporary(path:string):void {try{void FileUtils.deleteFile(path).catch(()=>{/* Session cleanup must not mask image writeback. */});}catch{/* The host may already be closing. */}}

export const BUTTON_ID = 101;
let startup: Promise<void> | undefined;

export function initializePlugin(): Promise<void> {
  if (!startup) {
    startup = (async () => {
      await PluginManager.init();
      const registered = await PluginManager.registerButton(1, ['NOTE'], {
        id: BUTTON_ID,
        name: 'Pic2Note',
        icon: Image.resolveAssetSource(require('../assets/icon.png')).uri,
        showType: 1,
      });
      await PluginManager.registerButton(2, ['NOTE'], {id: 102, name: 'Pic2Note', icon: Image.resolveAssetSource(require('../assets/icon.png')).uri, showType: 1, editDataTypes: [2]});
      if (!registered) {throw new Error('工具栏按钮注册失败，请重新启用插件。');}
    })();
  }
  return startup;
}

export async function closePlugin():Promise<boolean> {
  inputRouter.setActive(false);
  try {const closed=await PluginManager.closePluginView();if(!closed)inputRouter.setActive(true);return closed;}
  catch(error){inputRouter.setActive(true);throw error;}
}
export async function showInsertionFailure(message: string): Promise<void> {
  try {if (await PluginManager.showPluginView()) {inputRouter.setActive(true);return;}} catch { /* Fall back to a system message. */ }
  ToastAndroid.show(message, ToastAndroid.LONG);
}

export const dependencies: Dependencies = {
  hasPermission: name => PluginManager.hasPermission(name),
  requestPermission: (name, description) => PluginManager.requestPermission(name, description),
  currentFile: () => PluginCommAPI.getCurrentFilePath(),
  currentPage: () => PluginCommAPI.getCurrentPageNum(),
  selectFile: params => RattaFileSelector.selectFile(params),
  exists: path => FileUtils.exists(path),
  measure: uri => processor().inspect(decodeURIComponent(uri.slice(7))),
  insert: path => PluginNoteAPI.insertImage(path),
  returnToNote: closePlugin,
  latest: () => processor().latestImage(),
  selectedPicture: async () => {
    const response=await PluginCommAPI.getLassoElements() as any;
    try {return await prepareSelectedPicture({
      exists:path=>FileUtils.exists(path),measure:path=>processor().inspect(path),
      previewPath:async()=>{
        // Only the private output path is passed to the host; no storage-wide search.
        const dir=(await pluginRoot())+'/editor-cache';
        if(!(await FileUtils.makeDir(dir)) && !(await FileUtils.exists(dir)))throw Error('无法创建图片编辑缓存目录。');
        return `${dir}/lasso-source-${Date.now()}-${++lassoSequence}.png`;
      },
      generatePreview:async path=>{
        await ensurePermission(dependencies,WRITE,'编辑笔记内嵌图片需要系统导出所选图片，请允许文件写入。');
        return PluginCommAPI.generateLassoPreview(path);
      },removeTemporary,
    },response);}
    catch(error){for(const el of Array.isArray(response?.result)?response.result:[])if(el?.uuid){try{PluginCommAPI.recycleElement(el.uuid);}catch{}}throw error;}
  },
  releasePicture: (element,temporaryPath) => {
    try{PluginCommAPI.recycleElement(element.uuid);}catch{/* Best-effort release must not mask the actual result. */}
    if(temporaryPath)removeTemporary(temporaryPath);
  },
  replacePicture: (selection, path) => replacePicture({
    modify: (target, element) => PluginCommAPI.modifyPageElements([element], target.page, Number.isInteger(element.layerNum)&&element.layerNum!>=0&&element.layerNum!<=3?element.layerNum:null),
    save: () => PluginNoteAPI.saveCurrentNote(), measure: path => processor().inspect(path),
  }, selection.target, selection.replacement!, path),
};
