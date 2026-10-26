import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Image,PixelRatio,StyleSheet,View} from 'react-native';
import {fileUri} from './core';
import {CROP_ANCHORS} from './editor';
import type {CropAnchor,Crop,RenderResult} from './editor';
import {cropFrame,cropEdges,cropShades,anchorPoint} from './cropLayout';
import {CropInteraction} from './cropInteraction';
import {useInputTarget} from './useInputTarget';
import {t} from './i18n';

export const ANCHOR_LABELS:Record<CropAnchor,string>={topLeft:'左上角锚点',topRight:'右上角锚点',bottomLeft:'左下角锚点',bottomRight:'右下角锚点',top:'上边锚点',bottom:'下边锚点',left:'左边锚点',right:'右边锚点'};
export function CropCanvas({image,crop,anchor,setCrop,onSelectAnchor,disabled,height,compare=false,onError}:{
  image:RenderResult;crop:Crop;anchor:CropAnchor;setCrop(crop:Crop):void;onSelectAnchor(anchor:CropAnchor):void;
  disabled:boolean;height:number;compare?:boolean;onError?():void;
}) {
  const [box,setBox]=useState({width:0,height:0}),[draft,setDraft]=useState<Crop|null>(null);
  const source=useMemo(()=>({uri:fileUri(image.path)}),[image.path]);
  const frame=cropFrame(box.width,box.height,image.width,image.height),density=PixelRatio.get();
  const latest=useRef({crop,anchor,frame,edges:cropEdges(frame,crop,density),setCrop,onSelectAnchor});
  latest.current={crop,anchor,frame,edges:cropEdges(frame,crop,density),setCrop,onSelectAnchor};
  const [interaction]=useState(()=>new CropInteraction(()=>latest.current,c=>latest.current.onSelectAnchor(c),setDraft,c=>latest.current.setCrop(c)));
  const input=useInputTarget(()=>{},disabled||compare,undefined,0,{
    start:(x,y)=>interaction.start(x,y),move:(x,y)=>interaction.move(x,y),
    end:(x,y)=>interaction.end(x,y),cancel:()=>interaction.cancel(),
  });
  useEffect(()=>{interaction.cancel();},[interaction,crop,image.path,disabled,compare,box.width,box.height]);
  const edges=cropEdges(frame,draft||crop,density),{left,top,right,bottom}=edges;
  return <View ref={input.ref} collapsable={false} style={[s.canvas,{height}]} accessibilityLabel={t('裁剪区域')}
    onLayout={event=>{const {width,height:nextHeight}=event.nativeEvent.layout;
      if(box.width!==width||box.height!==nextHeight){input.cancelGesture?.();setBox({width,height:nextHeight});}input.onLayout();}}>
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image source={source} resizeMode="contain" onError={onError} style={[s.preview,{left:frame.x,top:frame.y,width:frame.width,height:frame.height}]}
        accessibilityLabel={t(compare?'原图对比':'图片预览')}/>
      {frame.width>0&&frame.height>0&&!compare&&<>
        <View accessibilityLabel="Crop shade" style={StyleSheet.absoluteFill}>
          {cropShades(box,edges).map((rect,index)=><View key={index} style={[s.shade,{left:rect.x,top:rect.y,width:rect.width,height:rect.height}]}/>)}
        </View>
        <View accessibilityLabel="Crop selection" style={[s.cropBorder,{left,top,width:right-left,height:bottom-top}]}/>
        {CROP_ANCHORS.map(c=>{const p=anchorPoint(edges,c);return <View key={c} accessible accessibilityRole="button"
          accessibilityLabel={t(ANCHOR_LABELS[c])} accessibilityState={{selected:anchor===c,disabled}}
          accessibilityActions={[{name:'activate'}]} onAccessibilityAction={()=>{if(!disabled)onSelectAnchor(c);}}
          style={[s.handle,anchor===c&&s.activeHandle,{left:p.x-7,top:p.y-7}]}/>;})}
      </>}
    </View>
    <View accessibilityLabel="Crop input" style={StyleSheet.absoluteFill}
      onStartShouldSetResponder={()=>!disabled&&!compare} onMoveShouldSetResponder={()=>!disabled&&!compare}
      onResponderTerminationRequest={()=>false} onResponderGrant={input.onGestureStart} onResponderMove={input.onGestureMove}
      onResponderRelease={input.onGestureEnd} onResponderTerminate={input.cancelGesture}/>
  </View>;
}
const s=StyleSheet.create({
  canvas:{backgroundColor:'#fff',overflow:'hidden'},preview:{position:'absolute'},
  shade:{position:'absolute',backgroundColor:'rgba(255,255,255,0.75)'},
  cropBorder:{position:'absolute',borderColor:'#000',borderWidth:2,borderStyle:'dashed'},
  handle:{position:'absolute',width:14,height:14,borderColor:'#000',borderWidth:2,backgroundColor:'#fff'},activeHandle:{backgroundColor:'#000',zIndex:1},
});
