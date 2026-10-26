import React from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {t} from './i18n';
import {refreshInputBounds,useInputTarget} from './useInputTarget';
import {toolImages} from './toolIcons';
import type {ToolbarSide} from './preferences';
import {toolbarLayout} from './toolbarLayout';
export interface Tool {id: string; label: string; caption?: string; icon?: keyof typeof toolImages; selected?: boolean; disabled?: boolean; onPress(): void; onLongPress?(): void}
function ToolButton({tool,circle}:{tool:Tool;circle:number}) {
  const input=useInputTarget(tool.onPress,!!tool.disabled,tool.onLongPress);
  const sources=toolImages[tool.icon || tool.id as keyof typeof toolImages];
  return <Pressable ref={input.ref} onLayout={input.onLayout} collapsable={false}
      accessibilityRole="button" accessibilityLabel={t(tool.label)} accessibilityHint={tool.id==='undo'?t('长按恢复初始状态'):undefined}
      accessibilityState={{disabled:!!tool.disabled,selected:!!tool.selected}} disabled={tool.disabled}
      onPress={input.onPress} onLongPress={input.onLongPress} delayLongPress={600} style={[s.item,tool.disabled&&s.disabled]}>
      <View pointerEvents="none" style={[s.button,{width:circle,height:circle,borderRadius:circle/2},tool.selected&&s.selected]}>
        <Image source={sources[tool.selected&&sources.length>1?1:0]} style={{width:Math.min(24,circle-8),height:Math.min(24,circle-8)}} resizeMode="contain" accessible={false} accessibilityLabel={'Tool icon '+tool.id}/>
      </View>
      <Text pointerEvents="none" style={s.caption} numberOfLines={1} adjustsFontSizeToFit>{t(tool.caption||tool.label)}</Text>
    </Pressable>;
}
export function ToolRail({tools,height,side,onDock,disabled}:{tools:Tool[];height:number;side:ToolbarSide;onDock():void;disabled:boolean}) {
  const layout=toolbarLayout(height,tools.length+1);
  const dock:Tool={id:'dock',label:side==='right'?'工具移到左侧':'工具移到右侧',caption:side==='right'?'移左':'移右',
    icon:side==='right'?'dockLeft':'dockRight',disabled,onPress:onDock};
  return <View style={[s.rail,{height,width:layout.width}]} accessibilityLabel="Editor tools" onLayout={refreshInputBounds}>
    {height>=layout.height&&<View style={[s.surface,{width:layout.width,paddingVertical:layout.padding,borderRadius:layout.columns===1?30:22}]} accessibilityLabel="Tool floating surface">
      <View style={[s.grid,{width:layout.columns*48+(layout.columns-1)*8,rowGap:layout.gap}]} accessibilityLabel="Tool grid">
        {tools.map(tool=><ToolButton key={tool.id} tool={tool} circle={layout.circle}/>)}
        <ToolButton tool={dock} circle={layout.circle}/>
      </View>
    </View>}
  </View>;
}
const s=StyleSheet.create({
  rail:{backgroundColor:'#fff',alignItems:'center',justifyContent:'center',overflow:'hidden'},
  surface:{paddingHorizontal:6.5,borderWidth:1.5,borderColor:'#111',backgroundColor:'#fff'},
  grid:{flexDirection:'row',flexWrap:'wrap',columnGap:8},item:{width:48,alignItems:'center',gap:1},
  button:{borderWidth:1.5,borderColor:'#111',backgroundColor:'#fff',alignItems:'center',justifyContent:'center'},
  selected:{backgroundColor:'#111'},disabled:{opacity:.3},
  caption:{width:48,fontSize:10,lineHeight:12,color:'#111',textAlign:'center'},
});
