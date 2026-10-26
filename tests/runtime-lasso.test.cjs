const {test,beforeEach}=require('node:test');
const assert=require('node:assert/strict'),Module=require('node:module'),{transformFileSync}=require('@babel/core');
for(const ext of ['.ts','.tsx'])Module._extensions[ext]=(module,file)=>module._compile(transformFileSync(file,{presets:['module:@react-native/babel-preset'],babelrc:false,configFile:false}).code,file);
let elements,files,calls,released,granted,previewResult;
const cached=()=>({uuid:'live-image',type:200,numInPage:7,pageNum:-1,layerNum:2,angles:{privateAccessor:'keep'},picture:{picturePath:'/missing-original.png',rect:{left:10,top:20,right:210,bottom:120}}});
const native={Image:{resolveAssetSource:()=>({uri:'icon.png'})},NativeModules:{LocalImageProcessor:{
 render:async()=>{throw Error('Not used');},inspect:async path=>{calls.push('inspect:'+path);assert.ok(files.has(path));return {width:800,height:400};}}},ToastAndroid:{show(){}}};
const sdk={PluginManager:{async hasPermission(){return granted;},async requestPermission(p){calls.push('permission:'+p);granted=1;return 2;},async getPluginDirPath(){return '/private/plugins/limg26nomad00001/';},async closePluginView(){calls.push('close');return true;}},
 PluginCommAPI:{async getCurrentFilePath(){return {success:true,result:'/Note/current.note'};},async getCurrentPageNum(){return {success:true,result:3};},async getLassoElements(){calls.push('lasso');return {success:true,result:elements};},
 async generateLassoPreview(path){calls.push('preview:'+path);assert.ok(path.startsWith('/private/plugins/limg26nomad00001/editor-cache/lasso-source-'));assert.ok(!path.includes('//'));files.add(path);return previewResult?previewResult:{success:true,result:{imagePath:path,rect:{left:0,top:0,right:200,bottom:100},rotateDegree:0}};},
 async setLassoBoxState(){throw Error('Replacement must leave selection to the host');},
 recycleElement(uuid){released.push(uuid);},async modifyPageElements(list,page,layer){calls.push('modify');assert.equal(list.length,1);assert.equal(list[0].uuid,'live-image');assert.equal(list[0].angles,elements[0].angles);assert.equal(page,3);assert.equal(list[0].pageNum,page);assert.equal(elements[0].pageNum,-1);assert.equal(layer,2);assert.equal(released.length,0);return {success:true,result:[7]};}},
 PluginNoteAPI:{async saveCurrentNote(){calls.push('save');return {success:true,result:true};}},
 FileUtils:{async exists(path){calls.push('exists:'+path);return files.has(path);},async makeDir(path){calls.push('mkdir:'+path);return true;},async deleteFile(path){calls.push('delete:'+path);files.delete(path);return true;}},RattaFileSelector:{}};
const load=Module._load;Module._load=function(id,...rest){if(id==='react-native')return native;if(id==='sn-plugin-lib')return sdk;return load.call(this,id,...rest);};
const {dependencies}=require('../src/runtime.ts'),{ImageController}=require('../src/core.ts');
beforeEach(()=>{elements=[cached()];files=new Set(['/edited.png']);calls=[];released=[];granted=1;previewResult=null;});
test('real runtime adapter exports inaccessible cached picture into plugin private storage, then writes one element to its original layer',async()=>{
 const controller=new ImageController(dependencies),selection=await controller.pick('selected');
 assert.match(selection.path,/lasso-source-/);assert.equal(selection.replacement,elements[0]);assert.equal(selection.width,800);assert.equal(calls.filter(c=>c.startsWith('inspect:')).length,1);assert.equal(released.length,0);
 const result=await controller.insert(async()=>'/edited.png');assert.ok(calls.indexOf('modify')<calls.indexOf('save'));assert.ok(calls.indexOf('save')<calls.indexOf('close'));
 assert.equal(calls.filter(c=>c==='lasso').length,1,'No selection readback after replacement');assert.deepEqual(result,{inserted:true,returned:true});
 assert.deepEqual(released,['live-image']);assert.equal(files.has(selection.path),false);assert.ok(files.has('/edited.png'));
});
test('runtime handles a type=200 image whose metadata omits picture/path/rect without falsely calling it an empty selection',async()=>{
 elements=[{uuid:'live-image',type:200,numInPage:7,pageNum:-1,layerNum:2,angles:{privateAccessor:'keep'}}];
 const controller=new ImageController(dependencies),selection=await controller.pick('selected');assert.equal(selection.replacement.uuid,'live-image');assert.deepEqual(selection.replacement.picture.rect,{left:0,top:0,right:200,bottom:100});controller.dispose();assert.deepEqual(released,['live-image']);assert.ok(calls.some(c=>c.startsWith('delete:')));
});
test('runtime preview rejection releases cache and temporary file without modifying the note',async()=>{
 previewResult={success:false,error:{code:1501,message:'host rejected'}};
 const controller=new ImageController(dependencies);await assert.rejects(controller.pick('selected'),/1501/);assert.deepEqual(released,['live-image']);assert.ok(calls.some(c=>c.startsWith('delete:')));assert.ok(!calls.includes('modify'));assert.equal(controller.selection,null);
});
test('runtime does not export an accessible original or make redundant source probes',async()=>{
 files.add('/missing-original.png');const controller=new ImageController(dependencies),selection=await controller.pick('selected');assert.equal(selection.path,'/missing-original.png');assert.ok(!calls.some(c=>c.startsWith('preview:')));assert.equal(calls.filter(c=>c==='inspect:/missing-original.png').length,1);controller.dispose();assert.ok(!calls.some(c=>c.startsWith('delete:')));
});
test('actual empty selection reports returned count and no preview/write/cache guesses',async()=>{
 elements=[];const controller=new ImageController(dependencies);await assert.rejects(controller.pick('selected'),/0 个元素/);assert.ok(!calls.some(c=>c.startsWith('preview:')));assert.ok(!calls.includes('modify'));assert.deepEqual(released,[]);
});
