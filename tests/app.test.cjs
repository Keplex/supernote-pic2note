// Render the actual App and controls with a mocked native bridge, not a copy of the UI logic.
const {test, beforeEach} = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const React = require('react');
const {create, act} = require('react-test-renderer');
const {transformFileSync} = require('@babel/core');
global.IS_REACT_ACT_ENVIRONMENT = true;
for (const ext of ['.ts', '.tsx']) {
  Module._extensions[ext] = (module, file) => module._compile(transformFileSync(file, {
    presets: ['module:@react-native/babel-preset'], babelrc: false, configFile: false,
  }).code, file);
}
const hitKey=label=>/MIT/.test(label||'')?'license':(['关于','About'].includes(label)?'about':(['返回笔记','Back to note'].includes(label)?'back':label));
const originalPath = '/storage/emulated/0/MyStyle/original.jpg';
let cropStamp=100;
let renders, insertions, saves, closes, reopens, toasts, storedLanguage, storedToolbarSide, selectionCancelled, renderFailure;
let renderHook, insertHook, closeFailure, reopenFailure, pickerPath, changes, lasso, listener, alerts, initialEntry, motionListener, hitBoxes, liveCache, pageReads, released;
const image = path => ({path, width: 800, height: 600, black: 0, white: 255,
  histogram: new Array(16).fill(20), darkPercent: 0, lightPercent: 0});
const processor = {
  async inspect() {return {width: 4000, height: 3000};},
  async render(path, _root, recipe, mode) {
    for (const key of ['autoLevels','opaqueWhite','invert','mirrorX','mirrorY']) {
      if (recipe[key] != null && typeof recipe[key] !== 'boolean') {throw Error(`Value for ${key} cannot be cast from Double to boolean`);}
    }
    renders.push({path, recipe, mode});
    if (renderHook) {await renderHook(mode);}
    if (renderFailure) {throw new Error('PNG 保存失败');}
    return image(`/private/${mode}-${renders.length}.png`);
  },
  async latestImage() {return '/storage/emulated/0/EXPORT/latest.png';},
  async getLanguage() {return storedLanguage;},
  async setLanguage(value) {storedLanguage = value; return true;},
  async getToolbarSide() {return storedToolbarSide;},
  async setToolbarSide(value) {storedToolbarSide=value;return true;},
};
const sdk = {
  PluginManager: {
    async init() {}, async registerButton() {return true;},
    registerMotionListener(_priority,value) {motionListener=value;return {remove(){motionListener=null;}};},
    registerButtonListener(value) {listener = value; if (initialEntry) value.onButtonPress({id:initialEntry}); return {remove() {}};},
    async hasPermission() {return 1;}, async requestPermission() {return 1;},
    async getPluginDirPath() {return '/private/plugins/limg26nomad00001';},
    async closePluginView() {closes++; return !closeFailure;},
    async showPluginView() {reopens++; return !reopenFailure;},
  },
  PluginCommAPI: {async getCurrentFilePath() {return {success: true, result: '/Note/Test.note'};},
    async getCurrentPageNum() {return {success: true, result: 0};},
    async getLassoElements() {for(const el of lasso)if(el.uuid)liveCache.add(el.uuid);return {success: true, result: lasso};}, recycleElement(uuid) {liveCache.delete(uuid);released.push(uuid);},
    async setLassoBoxState(){throw Error('Replacement must not try to restore selection');},
    async modifyPageElements(items,page,layer) {assert.ok(liveCache.has(items[0].uuid),'Host cache must still be live');assert.equal(items[0].pageNum,page);changes.push({page,layer,items});return {success:true,result:[7]};}},
  PluginFileAPI: {async getElements() {pageReads++;throw Error('Do not scan the page');}, async getElement() {pageReads++;throw Error('Do not refetch the element');},
    async modifyElements(path,page,items) {assert.ok(liveCache.has(items[0].uuid),'Host cache must still be live');changes.push({path,page,items});return {success:true,result:[7]};}},
  FileUtils: {async exists() {return true;}},
  RattaFileSelector: {async selectFile() {return selectionCancelled ? null : [pickerPath];}},
  PluginNoteAPI: {async insertImage(path) {insertions.push(path); return insertHook ? insertHook() : {success: true, result: true};},
    async saveCurrentNote() {saves++; return {success: true, result: true};}},
};
const NativeImage = props => React.createElement('Image', props);
NativeImage.resolveAssetSource = () => ({uri: 'icon.png'});
const native = {PixelRatio:{get:()=>2},Alert: {alert: (...args) => alerts.push(args)}, Image: NativeImage, NativeModules: {LocalImageProcessor: processor},
  ToastAndroid: {LONG: 1, show: message => {toasts.push(message);}},
  StyleSheet: {create: value => value, absoluteFill: {position: 'absolute', top: 0, bottom: 0, left: 0, right: 0}},
  BackHandler: {addEventListener: () => ({remove() {}})}};
for (const name of ['SafeAreaView', 'ScrollView', 'StatusBar', 'Text', 'View', 'Pressable']) {native[name] = name;}
const originalLoad = Module._load;
Module._load = function(id, ...rest) {
  if (id === 'react-native') {return native;}
  if (id === 'sn-plugin-lib') {return sdk;}
  if (id.endsWith('.png')) {return require('node:path').resolve(require('node:path').dirname(rest[0].filename), id);}
  return originalLoad.call(this, id, ...rest);
};
const App = require('../App.tsx').default;
const {setLanguage} = require('../src/i18n.ts');
const flush = async () => {for (let i = 0; i < 30; i++) {await Promise.resolve();}};
beforeEach(() => {
  cropStamp=100;renders = []; insertions = []; saves = 0; closes = 0; reopens = 0; toasts = []; storedLanguage = 'zh';storedToolbarSide='right';
  hitBoxes={};liveCache=new Set();pageReads=0;released=[];motionListener=null;initialEntry=0; pickerPath = originalPath; changes = []; alerts = []; lasso = [{uuid:'picture-7',type:200,numInPage:7,layerNum:1,pageNum:-1,picture:{picturePath:originalPath,rect:{left:10,top:20,right:810,bottom:620}}}];
  selectionCancelled = false; renderFailure = false; renderHook = null; insertHook = null;
  closeFailure = false; reopenFailure = false; setLanguage('zh');
});
async function layoutCanvas(view) {const canvas=view.root.findAllByType('View').find(v=>['裁剪区域','Crop area'].includes(v.props.accessibilityLabel));if(canvas)await act(async()=>{canvas.props.onLayout({nativeEvent:{layout:{width:600,height:600}}});await flush();});}
async function mount() {
  let view;
  await act(async () => {view = create(React.createElement(App), {createNodeMock: element => ({scrollTo() {},measureInWindow(callback) {const b=hitBoxes[hitKey(element.props.accessibilityLabel)];callback(b?.x||0,b?.y||0,b?.width||0,b?.height||0);}})}); await flush();});
  await layoutCanvas(view);return view;
}
function contactCrop(view,event) {
 const input=view.root.findAllByType('View').find(v=>v.props.accessibilityLabel==='Crop input');
 const timestamp=event.nativeEvent.timestamp??(cropStamp+=100);
 input.props.onResponderGrant({nativeEvent:{...event.nativeEvent,timestamp}});
 input.props.onResponderRelease({nativeEvent:{...event.nativeEvent,timestamp:timestamp+10}});
}
function anchor(view,label){return view.root.findAllByType('View').find(v=>v.props.accessibilityLabel===label);}
function styleOf(node){return Object.assign({},...([node.props.style].flat(Infinity).filter(Boolean)));}
async function tapAnchor(view,label){const p=styleOf(anchor(view,label));await act(async()=>{contactCrop(view,{nativeEvent:{locationX:p.left+7,locationY:p.top+7}});await flush();});}
const button = (view, label) => view.root.findAllByType('Pressable').find(b => b.props.accessibilityLabel === label);
async function press(view, label) {
  const found = button(view, label); assert.ok(found, `Missing button: ${label}`); assert.ok(!found.props.disabled, `Disabled: ${label}`);
  await act(async () => {found.props.onPress(); await flush();});
  if(['选择图片','选择最新','换一张','Choose image','Latest image','Change image'].includes(label))await layoutCanvas(view);
}
async function unmount(view) {await act(async () => {view.unmount(); await flush();});}

test('one-page editor exposes ordered tools and exports the latest complete recipe', async context => {
  const view = await mount(); await press(view, '选择图片');
  const labels = view.root.findAllByType('Pressable').map(b => b.props.accessibilityLabel);
  const start = labels.indexOf('前后对比');
  assert.deepEqual(labels.slice(start,start+8), ['前后对比','撤销','重做','顺时针旋转','水平镜像','垂直镜像','图片反相','白底遮线']);
  for (const old of ['下一步：灰阶','↺ 还原全图','↺ 还原灰阶','⚡ 直接插入']) {assert.equal(button(view,old),undefined);}
  await press(view,'亮度 +'); await press(view,'顺时针旋转'); await press(view,'水平镜像'); await press(view,'垂直镜像'); await press(view,'图片反相'); await press(view,'白底遮线');
  assert.equal(button(view,'插入图片').props.disabled,false);
  
  assert.equal(renders.at(-1).mode,'canvas'); assert.equal(renders.at(-1).recipe.rotation,1);
  await press(view,'前后对比'); assert.ok(button(view,'插入图片').props.disabled); await press(view,'前后对比');
  await press(view,'插入图片');
  const exported=renders.at(-1); assert.equal(exported.mode,'export'); assert.equal(exported.recipe.brightness,1);
  assert.equal(exported.recipe.mirrorX,true); assert.equal(exported.recipe.mirrorY,true); assert.equal(exported.recipe.invert,true); assert.equal(exported.recipe.opaqueWhite,true);
  assert.equal(insertions.length,1); assert.equal(closes,1); assert.equal(saves,0); await unmount(view);
});

test('crop gestures and tone share undo/redo, long-undo restores everything', async context => {
  const view=await mount(); await press(view,'选择图片');
  const canvas=()=>view.root.findAllByType('View').find(v=>v.props.accessibilityLabel==='裁剪区域');
  await act(async()=>{canvas().props.onLayout({nativeEvent:{layout:{width:500,height:500}}});await flush();});
  await act(async()=>{contactCrop(view,{nativeEvent:{locationX:100,locationY:150}});await flush();});
  await press(view,'亮度 +'); await press(view,'撤销'); await press(view,'重做');
  
  assert.ok(renders.at(-1).recipe.left>0);assert.equal(renders.at(-1).recipe.brightness,1);
  await act(async()=>{button(view,'撤销').props.onLongPress();await flush();});
  
  assert.equal(renders.at(-1).recipe.left,0); assert.equal(renders.at(-1).recipe.brightness,0);
  await press(view,'撤销'); 
  assert.ok(renders.at(-1).recipe.left>0); assert.equal(renders.at(-1).recipe.brightness,1); await unmount(view);
});

test('latest image opens the editor without picker or insertion, cancellation is silent',async()=>{
  const view=await mount(); await press(view,'选择最新');
  assert.equal(renders[0].path,'/storage/emulated/0/EXPORT/latest.png'); assert.equal(insertions.length,0);
  selectionCancelled=true;await press(view,'换一张');assert.equal(alerts.length,0);assert.equal(renders.length,1);await unmount(view);
});

test('lasso editor modifies exactly the original picture and saves before closing',async()=>{
  const view=await mount();assert.equal(button(view,'编辑选中图片'),undefined);await act(async()=>{listener.onButtonPress({id:102});await flush();});assert.equal(button(view,'插入原图'),undefined);
  await press(view,'替换原图片');assert.equal(changes.length,1);assert.equal(changes[0].items.length,1);
  assert.equal(changes[0].items[0].numInPage,7);assert.match(changes[0].items[0].picture.picturePath,/export/);
  assert.equal(pageReads,0);assert.deepEqual(released,['picture-7']);assert.equal(insertions.length,0);assert.equal(saves,1);assert.equal(closes,1);await unmount(view);
});

test('mixed lasso selection is rejected in a popup without touching the note',async()=>{
  const view=await mount();lasso.push({type:0});await act(async()=>{listener.onButtonPress({id:102});await flush();});
  assert.match(JSON.stringify(alerts),/只选中一张图片/);assert.equal(changes.length,0);assert.equal(insertions.length,0);await unmount(view);
});

test('cold-start lasso event auto-loads before preferences and ignores raw pageNum indexing',async()=>{
  initialEntry=102;const view=await mount();assert.ok(button(view,'替换原图片'));assert.equal(alerts.length,0);
  assert.equal(button(view,'编辑选中图片'),undefined);await unmount(view);
});
test('lasso cache survives editing and is released on cancellation without any page scan',async()=>{
 initialEntry=102;const view=await mount();assert.ok(liveCache.has('picture-7'));assert.equal(pageReads,0);
 await press(view,'亮度 +');assert.ok(liveCache.has('picture-7'));await unmount(view);assert.deepEqual(released,['picture-7']);
});
test('every preset after a real crop sends strict boolean values and eight anchors remain selectable',async context=>{
  const view=await mount();await press(view,'选择图片');
  const canvas=()=>view.root.findAllByType('View').find(v=>v.props.accessibilityLabel==='裁剪区域');
  await act(async()=>{canvas().props.onLayout({nativeEvent:{layout:{width:600,height:600}}});await flush();});
  for(const preset of ['自然','均衡','提亮','压暗','线稿']) {
    await act(async()=>{contactCrop(view,{nativeEvent:{locationX:100,locationY:150}});await flush();});
    await press(view,preset);
    assert.equal(alerts.length,0);for(const key of ['autoLevels','opaqueWhite','invert','mirrorX','mirrorY'])assert.equal(typeof renders.at(-1).recipe[key],'boolean');
  }
  await tapAnchor(view,'右下角锚点');assert.ok(anchor(view,'右下角锚点').props.accessibilityState.selected);
  assert.equal(view.root.findAllByType('View').filter(v=>/锚点$/.test(v.props.accessibilityLabel||'')).length,8);await unmount(view);
});

test('failed new-image rendering preserves the previous controller and editor',async()=>{
  const view=await mount();await press(view,'选择图片');pickerPath='/storage/emulated/0/new.png';renderFailure=true;
  await press(view,'换一张');assert.ok(alerts.length);alerts.at(-1)[2][0].onPress();renderFailure=false;await press(view,'插入原图');
  assert.deepEqual(insertions,[originalPath]);await unmount(view);
});

test('bilingual About preserves edit history and the language preference',async context=>{
  const view=await mount();await press(view,'选择图片');await press(view,'亮度 +');
  await press(view,'关于');assert.match(JSON.stringify(view.toJSON()),/Keplex/);await press(view,'查看 MIT 许可证全文');
  assert.match(JSON.stringify(view.toJSON()),/Permission is hereby granted/);await press(view,'中文 / English');assert.equal(storedLanguage,'en');
  await press(view,'About');assert.ok(button(view,'Undo'));
  assert.equal(renders.at(-1).recipe.brightness,1);await unmount(view);
});

test('insertion failure reopens the overlay, shows a popup and blocks ambiguous repeat',async()=>{
  const view=await mount();await press(view,'选择图片');insertHook=async()=>{throw Error('bridge lost');};
  await press(view,'插入原图');assert.equal(reopens,1);assert.match(JSON.stringify(alerts),/返回笔记检查/);
  assert.ok(button(view,'插入原图').props.disabled);assert.equal(insertions.length,1);await unmount(view);
});

test('native pen operates every circular tool and ordinary controls, without duplicate RN activation',async()=>{
 const view=await mount();await press(view,'选择图片');let stamp=1000;
 async function pen(label,echo=false) {
   const b=button(view,label);assert.ok(b&&!b.props.disabled,label);const measure=b.props.onLayout;const rect={x:600,y:200,width:68,height:52};
   hitBoxes[hitKey(label)]=rect;b.props.onLayout();
   await act(async()=>{motionListener.onMsg({x:1260,y:450,toolType:2,action:0,eventTime:stamp});motionListener.onMsg({x:1260,y:450,toolType:2,action:1,eventTime:stamp});if(echo)b.props.onPress({nativeEvent:{timestamp:stamp}});await flush();});
   delete hitBoxes[hitKey(label)];stamp+=100;
   // Move this synthetic target away before placing another one at the same test location.
   hitBoxes[hitKey(label)]={x:-500,y:-500,width:1,height:1};measure();
 }
 await pen('亮度 +',true);assert.equal(renders.at(-1).recipe.brightness,1);
 await pen('撤销');await pen('重做');await pen('顺时针旋转');
 await pen('水平镜像');await pen('垂直镜像');await pen('图片反相',true);await pen('白底遮线',true);
 assert.equal(renders.at(-1).recipe.invert,true);assert.equal(renders.at(-1).recipe.opaqueWhite,true);
 await pen('前后对比');await pen('前后对比');await pen('关于');assert.match(JSON.stringify(view.toJSON()),/Pic2Note/);
 await unmount(view);
});
test('pen supports language, About, license, note return and latest selection; close releases lasso cache',async()=>{
 initialEntry=102;let view=await mount(),stamp=5000;
 async function pen(label) {
   const control=button(view,label);assert.ok(control&&!control.props.disabled,label);const measure=control.props.onLayout;
   hitBoxes[hitKey(label)]={x:300,y:10,width:80,height:44};measure();
   await act(async()=>{motionListener.onMsg({x:680,y:60,toolType:2,action:0,eventTime:stamp});motionListener.onMsg({x:680,y:60,toolType:2,action:1,eventTime:stamp});await flush();});
   hitBoxes[hitKey(label)]={x:-500,y:-500,width:1,height:1};measure();for(const b of view.root.findAllByType('Pressable'))b.props.onLayout?.();stamp+=100;
 }
 await pen('关于');await pen('中文 / English');assert.equal(storedLanguage,'en');await pen('Read the MIT license');
 assert.match(JSON.stringify(view.toJSON()),/Permission is hereby granted/);await pen('Back to note');
 assert.equal(closes,1);assert.equal(motionListener,null);assert.deepEqual(released,['picture-7']);await unmount(view);
 initialEntry=0;storedLanguage='zh';setLanguage('zh');view=await mount();await pen('选择最新');assert.equal(renders.at(-1).path,'/storage/emulated/0/EXPORT/latest.png');await unmount(view);
});

test('a neutral crop updates immediately without a native render and exports the correct bounds',async()=>{
 const view=await mount();await press(view,'选择图片');
 const canvas=view.root.findAllByType('View').find(v=>v.props.accessibilityLabel==='裁剪区域');
 await act(async()=>{canvas.props.onLayout({nativeEvent:{layout:{width:600,height:600}}});await flush();});
 await act(async()=>{contactCrop(view,{nativeEvent:{locationX:130.8,locationY:200}});await flush();});
 assert.equal(renders.length,1);assert.equal(button(view,'插入图片').props.disabled,false);await press(view,'插入图片');
 assert.equal(renders.at(-1).mode,'export');assert.equal(renders.at(-1).recipe.left,.2);assert.ok(renders.at(-1).recipe.top>0);await unmount(view);
});

test('undo to the displayed recipe cancels a pending preview and never publishes the obsolete image',async()=>{
 const view=await mount();await press(view,'选择图片');
 let finish;renderHook=mode=>mode==='canvas'?new Promise(resolve=>{finish=resolve;}):Promise.resolve();
 await press(view,'亮度 +');assert.equal(typeof finish,'function');
 await press(view,'撤销');
 const readyBeforeFinish=!button(view,'插入图片').props.disabled;
 await act(async()=>{finish();await flush();});
 const shown=view.root.findAllByType('Image').find(image=>image.props.accessibilityLabel==='图片预览');
 assert.equal(shown.props.source.uri,'file:///private/base-1.png','Obsolete brightened result must not replace the original');
 assert.equal(readyBeforeFinish,true,'The already displayed original needs no new render');
 assert.equal(button(view,'插入图片').props.disabled,false,'Stale results must not leave insertion permanently blocked');
 await unmount(view);
});

test('new recipe starts preview without waiting and stale work cannot enable insertion',async()=>{
 const view=await mount();await press(view,'选择图片');let release;renderHook=mode=>mode==='canvas'?new Promise(r=>{release=r;}):Promise.resolve();
 await press(view,'亮度 +');assert.equal(renders.at(-1).recipe.brightness,1);assert.ok(button(view,'插入图片').props.disabled);
 await press(view,'亮度 +');await act(async()=>{release();await flush();});assert.equal(renders.at(-1).recipe.brightness,2);
 renderHook=null;await act(async()=>{release();await flush();});assert.equal(button(view,'插入图片').props.disabled,false);await unmount(view);
});

if(process.env.LOCALIMAGE_LAYOUT_QA){test('desktop layout snapshots fit unified editor and About',async()=>{
  await require('../scripts/layout-qa.cjs').checkLayouts({mount,press,tapAnchor,contactCrop,unmount,act,flush,setStoredLanguage:v=>{storedLanguage=v;}});
});}

test('toolbar docking remembers its side and does not render the image again',async()=>{
 let view=await mount();await press(view,'选择图片');const count=renders.length;
 await press(view,'工具移到左侧');assert.equal(storedToolbarSide,'left');assert.ok(button(view,'工具移到右侧'));
 assert.equal(renders.length,count);await unmount(view);
 view=await mount();await press(view,'选择图片');assert.ok(button(view,'工具移到右侧'));
 await press(view,'工具移到右侧');assert.equal(storedToolbarSide,'right');await unmount(view);
});

test('docking refreshes every pen target without depending on each child layout event',async()=>{
 const view=await mount();await press(view,'选择图片');
 hitBoxes['水平镜像']={x:600,y:200,width:50,height:44};button(view,'水平镜像').props.onLayout();
 await press(view,'工具移到左侧');hitBoxes['水平镜像']={x:10,y:200,width:50,height:44};
 const panel=view.root.findAllByType('View').find(v=>v.props.accessibilityLabel==='Editor tools');
 await act(async()=>{panel.props.onLayout();motionListener.onMsg({x:60,y:440,toolType:2,action:0,eventTime:8000});motionListener.onMsg({x:60,y:440,toolType:2,action:1,eventTime:8000});await flush();});
 assert.equal(renders.at(-1).recipe.mirrorX,true);await unmount(view);
});

test('eight full-image anchors activate by touch, pen drag follows live and one undo reverts the complete gesture',async()=>{
 const view=await mount();await press(view,'选择图片');const count=renders.length;
 const canvas=view.root.findAllByType('View').find(v=>v.props.accessibilityLabel==='裁剪区域');
 hitBoxes['裁剪区域']={x:100,y:100,width:600,height:600};canvas.props.onLayout({nativeEvent:{layout:{width:600,height:600}}});
 for(const label of ['左上角锚点','右上角锚点','左下角锚点','右下角锚点','上边锚点','下边锚点','左边锚点','右边锚点']){
   await tapAnchor(view,label);assert.ok(anchor(view,label).props.accessibilityState.selected);const p=styleOf(anchor(view,label));
   assert.ok(p.left>=0&&p.top>=0&&p.left+14<=600&&p.top+14<=600);
 }
 assert.ok(button(view,'撤销').props.disabled);assert.equal(renders.length,count);
 const p=styleOf(anchor(view,'左下角锚点')),x=p.left+7,y=p.top+7,stamp=10000;
 const pen=(action,px,py,time)=>motionListener.onMsg({x:(100+px)*2,y:(100+py)*2,toolType:2,action,eventTime:time});
 await act(async()=>{pen(0,x,y,stamp);pen(2,x+80,y-50,stamp+10);await flush();});
 assert.ok(anchor(view,'左下角锚点').props.accessibilityState.selected);assert.equal(renders.length,count);assert.ok(button(view,'撤销').props.disabled);
 let moved=styleOf(anchor(view,'左下角锚点'));assert.ok(Math.abs(moved.left-(p.left+80))<.6);assert.ok(Math.abs(moved.top-(p.top-50))<.6);
 await act(async()=>{pen(1,x+100,y-60,stamp+20);contactCrop(view,{nativeEvent:{locationX:x,locationY:y,timestamp:stamp}});await flush();});
 assert.ok(!button(view,'撤销').props.disabled);assert.equal(renders.length,count);
 await press(view,'撤销');assert.ok(button(view,'撤销').props.disabled);assert.deepEqual(styleOf(anchor(view,'左下角锚点')),{...p,backgroundColor:'#000',zIndex:1});
 await press(view,'前后对比');assert.equal(anchor(view,'左下角锚点'),undefined);await unmount(view);
});

test('every edge anchor supports pen and touch live drag, changes only its own edge and undoes once',async()=>{
 const view=await mount();await press(view,'选择图片');const count=renders.length;
 const canvas=view.root.findAllByType('View').find(v=>v.props.accessibilityLabel==='裁剪区域');
 hitBoxes['裁剪区域']={x:100,y:100,width:600,height:600};canvas.props.onLayout({nativeEvent:{layout:{width:600,height:600}}});
 let stamp=40000;
 for(const mode of ['touch','pen'])for(const [label,dx,dy]of [['上边锚点',60,30],['下边锚点',60,-30],['左边锚点',40,50],['右边锚点',-40,50]]){
   const before=styleOf(view.root.findByProps({accessibilityLabel:'Crop selection'})),p=styleOf(anchor(view,label));
   const x=p.left+7,y=p.top+7,input=()=>view.root.findAllByType('View').find(v=>v.props.accessibilityLabel==='Crop input');
   const event=(px,py,time)=>({nativeEvent:{locationX:px,locationY:py,timestamp:time}});
   const pen=(action,px,py,time)=>motionListener.onMsg({x:(100+px)*2,y:(100+py)*2,toolType:2,action,eventTime:time});
   await act(async()=>{if(mode==='touch'){input().props.onResponderGrant(event(x,y,stamp));input().props.onResponderMove(event(x+dx,y+dy,stamp+10));}
     else{pen(0,x,y,stamp);pen(2,x+dx,y+dy,stamp+10);}await flush();});
   const next=styleOf(view.root.findByProps({accessibilityLabel:'Crop selection'}));
   const expected=label==='上边锚点'?{left:before.left,top:before.top+dy,width:before.width,height:before.height-dy}:
     label==='下边锚点'?{left:before.left,top:before.top,width:before.width,height:before.height+dy}:
     label==='左边锚点'?{left:before.left+dx,top:before.top,width:before.width-dx,height:before.height}:
     {left:before.left,top:before.top,width:before.width+dx,height:before.height};
   for(const key of ['left','top','width','height'])assert.ok(Math.abs(next[key]-expected[key])<.6,`${mode} ${label} ${key}`);
   assert.ok(anchor(view,label).props.accessibilityState.selected);assert.ok(button(view,'撤销').props.disabled);assert.equal(renders.length,count);
   await act(async()=>{if(mode==='touch')input().props.onResponderRelease(event(x+dx,y+dy,stamp+20));else pen(1,x+dx,y+dy,stamp+20);await flush();});
   assert.ok(!button(view,'撤销').props.disabled);await press(view,'撤销');assert.ok(button(view,'撤销').props.disabled);
   assert.deepEqual(styleOf(view.root.findByProps({accessibilityLabel:'Crop selection'})),before);stamp+=200;
 }
 await unmount(view);
});

test('touch drags an inactive anchor immediately and termination discards the draft',async()=>{
 const view=await mount();await press(view,'选择图片');const before=styleOf(anchor(view,'右上角锚点')),count=renders.length;
 const input=()=>view.root.findAllByType('View').find(v=>v.props.accessibilityLabel==='Crop input');
 const event=(x,y,timestamp)=>({nativeEvent:{locationX:x,locationY:y,timestamp}}),x=before.left+7,y=before.top+7;
 await act(async()=>{input().props.onResponderGrant(event(x,y,20000));input().props.onResponderMove(event(x-80,y+50,20010));await flush();});
 assert.ok(anchor(view,'右上角锚点').props.accessibilityState.selected);assert.ok(styleOf(anchor(view,'右上角锚点')).left<before.left);assert.equal(renders.length,count);assert.ok(button(view,'撤销').props.disabled);
 await act(async()=>{input().props.onResponderTerminate();await flush();});assert.deepEqual(styleOf(anchor(view,'右上角锚点')), {...before,backgroundColor:'#000',zIndex:1});assert.ok(button(view,'撤销').props.disabled);
 await act(async()=>{input().props.onResponderGrant(event(x,y,20200));input().props.onResponderMove(event(x-80,y+50,20210));input().props.onResponderRelease(event(x-80,y+50,20220));await flush();});
 assert.ok(!button(view,'撤销').props.disabled);await press(view,'撤销');assert.ok(button(view,'撤销').props.disabled);assert.equal(renders.length,count);await unmount(view);
});

test('auto-level crop drag has live feedback without processing until one release, then exports that result',async()=>{
 const view=await mount();await press(view,'选择图片');await press(view,'均衡');const count=renders.length;
 const before=styleOf(anchor(view,'右上角锚点')),x=before.left+7,y=before.top+7;
 const input=()=>view.root.findAllByType('View').find(v=>v.props.accessibilityLabel==='Crop input');
 const event=(px,py,timestamp)=>({nativeEvent:{locationX:px,locationY:py,timestamp}});
 await act(async()=>{input().props.onResponderGrant(event(x,y,30000));await flush();});
 for(let i=1;i<=5;i++)await act(async()=>{input().props.onResponderMove(event(x-i*10,y+i*5,30000+i*10));await flush();});
 assert.equal(renders.length,count);assert.ok(styleOf(anchor(view,'右上角锚点')).left<before.left);
 await act(async()=>{input().props.onResponderRelease(event(x-60,y+30,30100));await flush();});
 assert.equal(renders.length,count+1);assert.ok(renders.at(-1).recipe.right<1&&renders.at(-1).recipe.top>0);
 const bounds={right:renders.at(-1).recipe.right,top:renders.at(-1).recipe.top};await press(view,'插入图片');
 assert.equal(renders.at(-1).mode,'export');assert.equal(renders.at(-1).recipe.right,bounds.right);assert.equal(renders.at(-1).recipe.top,bounds.top);assert.equal(renders.at(-1).recipe.autoLevels,false);await unmount(view);
});

test('workspace orientation relayout resizes canvas and tools without another image render',async()=>{
 const view=await mount();await press(view,'选择图片');const count=renders.length;
 for(const height of [410,650]){
   const workspace=view.root.findAllByType('View').find(v=>v.props.accessibilityLabel==='Image workspace');
   await act(async()=>{workspace.props.onLayout({nativeEvent:{layout:{width:900,height}}});await flush();});
   const canvas=view.root.findAllByType('View').find(v=>v.props.accessibilityLabel==='裁剪区域');
   assert.equal(canvas.props.style[1].height,height);
   const rail=view.root.findAllByType('View').find(v=>v.props.accessibilityLabel==='Editor tools');
   assert.equal(rail.props.style[1].width,height===410?120:64);
 }
 assert.equal(renders.length,count);assert.equal(view.root.findAllByType('ScrollView').length,0);await unmount(view);
});
