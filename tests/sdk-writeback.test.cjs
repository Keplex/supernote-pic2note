// Exercise the shipped SDK's real JS validator. Only the native host is simulated.
const {test}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module');
const {transformFileSync}=require('@babel/core');
for(const ext of ['.ts','.tsx'])Module._extensions[ext]=(module,file)=>module._compile(transformFileSync(file,{
  presets:['module:@react-native/babel-preset'],babelrc:false,configFile:false,
}).code,file);
let calls=[];
const host={async modifyPageElements(elements,page,layer){calls.push({elements,page,layer});return {success:true,result:[7]};}};
const load=Module._load;
Module._load=function(id,...rest){if(id.endsWith('/module/NativePluginAPI'))return {__esModule:true,default:host};return load.call(this,id,...rest);};
const PluginCommAPI=require('../node_modules/sn-plugin-lib/src/sdk/PluginCommAPI.ts').default;
const {Element,transformElement}=require('../node_modules/sn-plugin-lib/src/model/Element.ts');
const {replacePicture}=require('../src/noteImage.ts');
function original(pageNum){const element=Object.assign(new Element(),{uuid:'live-p',type:200,numInPage:7,pageNum,layerNum:2,
  picture:{picturePath:'/old.png',rect:{left:10,top:20,right:210,bottom:120}}});transformElement(element);return element;}
test('real SDK reproduces the reported negative pageNum rejection before reaching the host',async()=>{
  calls=[];const result=await PluginCommAPI.modifyPageElements([original(-1)],3,2);
  assert.equal(result.success,false);assert.equal(result.error.code,107);assert.match(result.error.message,/elements\[0\]\.pageNum must be >= 0/);
  assert.equal(calls.length,0);
});
test('replacement normalizes snapshot page metadata and passes real SDK validation with accessors intact',async()=>{
  for(const oldPage of [-1,undefined,99]){
    calls=[];const element=original(oldPage);let saved=0;
    await replacePicture({measure:async()=>({width:400,height:300}),
      modify:async(target,out)=>PluginCommAPI.modifyPageElements([out],target.page,out.layerNum),
      save:async()=>{saved++;return {success:true,result:true};}}, {path:'/n.note',page:3},element,'/edited.png');
    assert.equal(calls.length,1);assert.equal(calls[0].page,3);assert.equal(calls[0].elements[0].pageNum,3);
    assert.equal(calls[0].elements[0].uuid,element.uuid);assert.equal(calls[0].elements[0].angles,element.angles);
    assert.equal(element.pageNum,oldPage);assert.equal(saved,1);
  }
});
