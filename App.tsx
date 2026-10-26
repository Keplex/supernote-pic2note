import React, {useEffect, useRef, useState} from 'react';
import {Alert, BackHandler, PixelRatio, SafeAreaView, StyleSheet, Text, View} from 'react-native';
import {PluginManager} from 'sn-plugin-lib';
import {basename, errorText, ImageController} from './src/core';
import type {Selection} from './src/core';
import {BUTTON_ID, dependencies, initializePlugin, renderImage, loadLanguage, saveLanguage, showInsertionFailure, closePlugin} from './src/runtime';
import {recipeKey, resolvedRecipe, canReusePreview} from './src/editor';
import type {CropAnchor, Recipe, RenderResult, Tone} from './src/editor';
import {EditHistory, initialRecipe, rotateRecipe, mirrorRecipe} from './src/history';
import {Button, CropCanvas, ToneControls, TonePresets} from './src/EditorControls';
import {ToolRail} from './src/ToolRail';
import {PreviewQueue} from './src/previewQueue';
import type {PreviewStatus} from './src/previewQueue';
import {AboutScreen} from './src/AboutScreen';
import {AppHeader} from './src/AppHeader';
import {BrandBanner} from './src/Brand';
import {loadToolbarSide, saveToolbarSide} from './src/preferences';
import type {ToolbarSide} from './src/preferences';
import {inputRouter} from './src/inputRouter';
import {refreshInputBounds} from './src/useInputTarget';
import {getLanguage, setLanguage, t} from './src/i18n';
interface Preview {image: RenderResult; key: string; applied: Recipe}
interface Request {path: string; recipe: Recipe}
const keyOf = (recipe: Recipe) => recipeKey(recipe, recipe, recipe.rotation, !!recipe.mirrorX, !!recipe.mirrorY);
export default function App(): React.JSX.Element {
  const [controller] = useState(() => ({current:new ImageController(dependencies)}));
  const [history] = useState(() => ({current:new EditHistory()}));
  const alive = useRef(true), working = useRef(false), readyRef = useRef(false), aboutRef = useRef(false);
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [about, setAbout] = useState(false);
  aboutRef.current = about;
  const [language, showLanguage] = useState(getLanguage()), [languageBusy, setLanguageBusy] = useState(false);
  const [toolbarSide,setToolbarSide]=useState<ToolbarSide>('right');
  const [noteName, setNoteName] = useState(''); const noteRevision = useRef(0);
  const [selection, setSelection] = useState<Selection | null>(null), [submitted, setSubmitted] = useState(false);
  const [recipe, setRecipe] = useState(initialRecipe), [anchor, setAnchor] = useState<CropAnchor>('topLeft');
  const [base, setBase] = useState<RenderResult | null>(null), [preview, setPreview] = useState<Preview | null>(null);
  const [compare, setCompare] = useState(false), [previewError, setPreviewError] = useState(false);
  const [status, setStatus] = useState<PreviewStatus>('idle');
  const [workspaceHeight,setWorkspaceHeight]=useState(600);
  const notify = (error: unknown) => {inputRouter.setActive(false);const resume=()=>{if(alive.current&&readyRef.current)inputRouter.setActive(true);};Alert.alert('Pic2Note',errorText(error),[{text:'OK',onPress:resume}],{onDismiss:resume});};
  const [queue] = useState(() => new PreviewQueue<Request, Preview>(async request => {
    const image = await renderImage(request.path, request.recipe, 'canvas');
    return {image, key: keyOf(request.recipe), applied: resolvedRecipe(request.recipe,request.recipe,image)};
  }, value => {if (alive.current) {setPreview(value); setPreviewError(false);}},
  error => {if (alive.current) {setPreviewError(true); notify(error);}}, value => {if (alive.current) {setStatus(value);}}));
  async function updateNoteName() {
    const revision = ++noteRevision.current;
    try {const current = await dependencies.currentFile() as any;
      if (alive.current && revision === noteRevision.current) {setNoteName(current?.success && typeof current.result === 'string' ? basename(current.result) : '');}
    } catch { /* A missing file name uses the normal return label. */ }
  }
  function resetEditor(updateName=true) {
    inputRouter.setActive(true);controller.current.dispose();
    queue.cancel(); controller.current = new ImageController(dependencies); history.current = new EditHistory();
    setRecipe(initialRecipe()); setSelection(null); setBase(null); setPreview(null); setCompare(false); setAnchor('topLeft');
    setSubmitted(false); setPreviewError(false); setAbout(false); if(updateName)void updateNoteName();
  }
  async function close() {
    if (working.current) {return;} queue.cancel();
    try {if(await closePlugin())controller.current.dispose();else notify(t('暂时无法关闭插件，请使用系统返回操作。'));}
    catch (error) {notify(error);}
  }
  const chooseRef = useRef<(mode: 'file' | 'latest' | 'selected') => Promise<void>>(async () => {});
  useEffect(() => {
    alive.current = true; let listener: {remove(): void} | undefined, motion: {remove():void}|undefined;
    const stopInput=inputRouter.observeActive(active=>{
      if(active && !motion)motion=PluginManager.registerMotionListener(1,{onMsg:event=>inputRouter.motion(event as any,PixelRatio.get())});
      if(!active && motion){motion.remove();motion=undefined;}
    });
    // Subscribe before asynchronous startup/preferences. The SDK has a short replay window.
    let pending: number | undefined;
    const handleEntry = (id: number) => {
      if (working.current || (id !== BUTTON_ID && id !== 102)) {return;}
      if (!readyRef.current) {pending = id; return;}
      resetEditor(id!==102); if (id === 102) {void chooseRef.current('selected');}
    };
    listener = PluginManager.registerButtonListener({onButtonPress: event => handleEntry(event.id)});
    void initializePlugin().then(async () => {
      if (!alive.current) {return;}
      inputRouter.setActive(true);
      readyRef.current = true; setReady(true);
      if (pending != null) {const entry = pending; pending = undefined; handleEntry(entry);}
      const [value,side] = await Promise.all([loadLanguage(),loadToolbarSide()]); if (!alive.current) {return;} showLanguage(value);setToolbarSide(side);
      await updateNoteName();
    }).catch(notify);
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (aboutRef.current) {setAbout(false);} else {void close();} return true;
    });
    return () => {alive.current = false; readyRef.current = false; queue.cancel(); listener?.remove(); inputRouter.setActive(false); stopInput(); controller.current.dispose(); back.remove();};
  }, []);
  const dirty = !preview || preview.key !== keyOf(recipe);
  useEffect(() => {
    if (!about && selection && !busy && !submitted && dirty && !previewError) {queue.request({path: selection.path, recipe});}
    else if(about || !selection || busy || submitted)queue.cancel();
  }, [queue, about, selection, busy, submitted, recipe]);
  async function switchLanguage() {
    if (languageBusy) {return;} const value = language === 'zh' ? 'en' : 'zh';
    setLanguage(value); showLanguage(value); setLanguageBusy(true);
    try {await saveLanguage(value);} catch (error) {notify(error);} finally {if (alive.current) {setLanguageBusy(false);}}
  }
  function switchToolbarSide() {
    const side=toolbarSide==='right'?'left':'right';setToolbarSide(side);
    void saveToolbarSide(side).catch(notify);
  }
  function showRecipe(previous:Recipe,next:Recipe) {
    // A result for an abandoned recipe must never overwrite an undo/redo target already on screen.
    queue.cancel();
    if(preview?.key===keyOf(previous) && canReusePreview(previous,next)) {
      setPreview({...preview,key:keyOf(next),applied:{...next,black:preview.applied.black,white:preview.applied.white,autoLevels:false}});
    }
    setRecipe(next);setPreviewError(false);setCompare(false);
  }
  function change(next: Recipe) {
    if (working.current || submitted) {return;}
    const previous=history.current.current;
    if (history.current.commit(next) || previewError)showRecipe(previous,history.current.current);
  }
  function travel(action: 'undo' | 'redo' | 'restore') {
    if (working.current || submitted) {return;}
    const previous=history.current.current;
    if (history.current[action]())showRecipe(previous,history.current.current);
  }
  const changeTone = (tone: Tone) => change({...history.current.current, ...tone});
  async function choose(mode: 'file' | 'latest' | 'selected' = 'file') {
    if (working.current || !readyRef.current) {return;} queue.cancel(); working.current = true; setBusy(true);
    const candidate = new ImageController(dependencies);
    try {
      const selected = await candidate.pick(mode); if (!selected || !alive.current) {return;}
      // Render before replacing the current editing session, so failures preserve the previous one.
      const fresh = initialRecipe(), image = await renderImage(selected.path, fresh, 'base');
      if (!alive.current) {return;} controller.current.dispose();controller.current = candidate; history.current = new EditHistory(); setRecipe(fresh); setSelection(selected);
      ++noteRevision.current; setNoteName(basename(selected.target.path)); setBase(image);
      setPreview({image, key: keyOf(fresh), applied: fresh}); setAnchor('topLeft'); setCompare(false); setSubmitted(false); setPreviewError(false);
    } catch (error) {notify(error);} finally {if(candidate!==controller.current)candidate.dispose();working.current = false; if (alive.current) {setBusy(false);}}
  }
  chooseRef.current = choose;
  async function submit(original = false) {
    if (working.current || !controller.current.canInsert || (!original && (dirty || previewError || compare || status !== 'idle'))) {return;}
    working.current = true; queue.cancel(); setBusy(true);
    try {
      const applied = preview!.applied;
      const result = await controller.current.insert(original ? undefined : async selected => (await renderImage(selected.path, applied, 'export')).path);
      if (alive.current) {setSubmitted(true);} if (result.warning) {notify(result.warning);}
    } catch (error) {
      if (alive.current) {setSubmitted(!controller.current.canInsert);}
      await showInsertionFailure(errorText(error)); notify(error);
    } finally {working.current = false; if (alive.current) {setBusy(false);}}
  }
  const locked = busy || submitted, image = compare ? base : preview?.image;
  const canCrop = !locked && !compare && !!preview && (preview.applied.rotation || 0) === (recipe.rotation || 0)
    && !!preview.applied.mirrorX === !!recipe.mirrorX && !!preview.applied.mirrorY === !!recipe.mirrorY;
  if (about) {return <AboutScreen onBack={() => setAbout(false)} onNote={() => void close()} noteName={noteName} language={language}
    onLanguage={() => void switchLanguage()} languageDisabled={languageBusy} />;}
  return <SafeAreaView style={s.screen}>
    <AppHeader noteName={noteName} language={language} onBack={() => void close()} onLanguage={() => void switchLanguage()}
      onAbout={() => {queue.cancel(); setAbout(true);}} disabled={busy} languageDisabled={!ready || languageBusy} />
    <View style={s.fileRow} accessibilityLabel="Image file controls">
      <Text style={s.filename} numberOfLines={1}>{selection ? basename(selection.path) : 'PNG / JPG / JPEG'}</Text>
      <Button label={t(selection ? '换一张' : '选择图片')} onPress={() => void choose()} disabled={!ready || busy} small />
      <Button label={t('选择最新')} primary icon="latest" onPress={() => void choose('latest')} disabled={!ready || busy} small />
    </View>
    {selection && <View style={s.adjustments} accessibilityLabel="Image adjustments">
      <TonePresets tone={recipe} setTone={changeTone} disabled={locked || compare}/>
      <ToneControls tone={recipe} setTone={changeTone} disabled={locked || compare}/>
    </View>}
    <View style={s.main} accessibilityLabel="Editor viewport">
      {selection ?
        image && <View accessibilityLabel="Image workspace" onLayout={event=>{setWorkspaceHeight(event.nativeEvent.layout.height);refreshInputBounds();}} style={[s.workspace,toolbarSide==='left'&&s.workspaceLeft]}>
          <View style={s.canvasColumn}><CropCanvas image={image} crop={recipe} anchor={anchor} setCrop={crop => change({...history.current.current, ...crop})}
          onSelectAnchor={setAnchor}
          onError={() => {setPreviewError(true); notify(t('预览文件读取失败，请重新调整参数后重试。'));}}
          disabled={!canCrop} compare={compare} height={workspaceHeight} /></View>
          <ToolRail height={workspaceHeight} side={toolbarSide} onDock={switchToolbarSide} disabled={locked} tools={[
            {id: 'compare', label: '前后对比', caption: '对比', selected: compare, disabled: locked || !base, onPress: () => setCompare(!compare)},
            {id: 'undo', label: '撤销', disabled: locked || !history.current.canUndo, onPress: () => travel('undo'), onLongPress: () => travel('restore')},
            {id: 'redo', label: '重做', disabled: locked || !history.current.canRedo, onPress: () => travel('redo')},
            {id: 'rotate', label: '顺时针旋转', caption: '旋转', disabled: locked || compare, onPress: () => change(rotateRecipe(history.current.current))},
            {id: 'mirrorX', label: '水平镜像', disabled: locked || compare, onPress: () => change(mirrorRecipe(history.current.current, 'horizontal'))},
            {id: 'mirrorY', label: '垂直镜像', disabled: locked || compare, onPress: () => change(mirrorRecipe(history.current.current, 'vertical'))},
            {id: 'invert', label: '图片反相', caption: '反相', selected: !!recipe.invert, disabled: locked || compare, onPress: () => change({...history.current.current, invert: !history.current.current.invert})},
            {id: 'mask', label: '白底遮线', caption: '遮线', selected: recipe.opaqueWhite, disabled: locked || compare, onPress: () => change({...history.current.current, opaqueWhite: !history.current.current.opaqueWhite})},
          ]} />
        </View>
       : <View style={s.empty}>
        <BrandBanner />
      </View>}
    </View>
    {selection && <View style={s.bottom} accessibilityLabel="Bottom controls">
      <View style={s.footer} accessibilityLabel="Insert actions">
      {!selection.replacement && <View style={s.flex}><Button label={t('插入原图')} disabled={locked} onPress={() => void submit(true)} /></View>}
      <View style={s.flex}><Button label={t(selection.replacement ? '替换原图片' : '插入图片')} primary
        disabled={locked || dirty || previewError || compare || status !== 'idle'} onPress={() => void submit()} /></View>
      </View>
    </View>}
  </SafeAreaView>;
}
const s = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#fff'}, flex: {flex: 1},
  fileRow: {flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6},
  filename: {flex: 1, fontSize: 14, lineHeight: 20, color: '#111'},
  main:{flex:1,minHeight:0,paddingHorizontal:12,paddingVertical:4,overflow:'hidden'},
  footer: {flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 6, borderTopWidth: 1, borderColor: '#aaa', gap: 6},
  workspace:{flex:1,minHeight:0,flexDirection:'row',gap:8},workspaceLeft:{flexDirection:'row-reverse'},canvasColumn:{flex:1,minHeight:0},
  bottom:{flexShrink:0,backgroundColor:'#fff'},adjustments:{paddingHorizontal:12,paddingVertical:6,gap:6},
  empty: {flex: 1, alignItems: 'center', justifyContent: 'center'},
});

