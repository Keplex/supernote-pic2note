import React from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {stepTone, PRESETS, recipeKey, FULL_CROP} from './editor';
import type {Tone, ToneControl} from './editor';
import {getLanguage,t} from './i18n';
import {useInputTarget} from './useInputTarget';

export const STEP_BUTTON_STYLE={width:30,height:24,minWidth:30,minHeight:24,paddingHorizontal:0,paddingVertical:0,borderRadius:12} as const;

export function Button({label, onPress, disabled = false, primary = false, selected = false, small = false, compact = false, secondary = false,
  accessibilityLabel, icon}: {
  label: string; onPress: () => void; disabled?: boolean; primary?: boolean; selected?: boolean;
  small?: boolean; compact?: boolean; secondary?: boolean; accessibilityLabel?: string; icon?: 'latest';
}) {
  const input=useInputTarget(onPress,disabled);
  return <Pressable ref={input.ref} onLayout={input.onLayout} collapsable={false} accessibilityRole="button" accessibilityLabel={accessibilityLabel || label}
    accessibilityState={{disabled, selected}} disabled={disabled} onPress={input.onPress}
    style={[s.button, secondary && s.secondary, (primary || selected) && s.primary, disabled && s.disabled, small && s.small, compact && s.compact]}>
    {icon === 'latest' && <Image source={require('../assets/latest.png')} style={s.buttonIcon} accessibilityLabel="Latest image icon" accessible={false} />}
    <Text style={[s.buttonText, (primary || selected) && s.white, (small || compact) && s.smallText]}>{label}</Text>
  </Pressable>;
}

export {CropCanvas} from './CropCanvas';

const PRESET_KEYS=PRESETS.map(preset=>recipeKey(FULL_CROP,preset.tone));
export function TonePresets({tone, setTone, disabled}: {tone: Tone; setTone: (tone: Tone) => void; disabled: boolean}) {
  // Inversion and white masking do not change the selected tone preset.
  const selectedKey=recipeKey(FULL_CROP,{...tone,opaqueWhite:false,invert:false});
  return <View style={s.row}>{PRESETS.map((preset,index) => <View key={preset.name} style={s.flex}>
      <Button small label={t(preset.name)} disabled={disabled}
        selected={selectedKey===PRESET_KEYS[index]}
        onPress={() => setTone({...preset.tone, opaqueWhite: tone.opaqueWhite, invert: tone.invert})} />
    </View>)}</View>;
}

const TONE_CONTROLS: {field:ToneControl;label:string;shortZh?:string;shortEn?:string}[]=[
  {field:'brightness',label:'亮度'},{field:'contrast',label:'对比度'},
  {field:'shadows',label:'提亮暗部',shortZh:'提亮',shortEn:'Shadows'},
  {field:'highlights',label:'压暗亮部',shortZh:'压暗',shortEn:'Highlights'},
];
export function ToneControls({tone, setTone, disabled}: {tone: Tone; setTone: (tone: Tone) => void; disabled: boolean}) {
  return <View style={s.grid} accessibilityLabel="Tone controls">{TONE_CONTROLS.map(({field,label,shortZh,shortEn}) => <View style={s.control} key={field}>
      <Text style={s.label} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.8}>{shortZh?(getLanguage()==='en'?shortEn:shortZh):t(label)}</Text>
      <View style={s.stepper}>
      <Button compact label="−" accessibilityLabel={`${t(label)} −`}
        disabled={disabled || tone[field] <= (field === 'brightness' || field === 'contrast' ? -4 : 0)}
        onPress={() => setTone(stepTone(tone, field, -1))} />
      <Text accessibilityLabel={`${t(label)} ${tone[field]}`} style={s.value}>{tone[field] > 0 ? '+' : ''}{tone[field]}</Text>
      <Button compact label="+" accessibilityLabel={`${t(label)} +`} disabled={disabled || tone[field] >= 4}
        onPress={() => setTone(stepTone(tone, field, 1))} />
      </View>
    </View>)}</View>;
}

const s = StyleSheet.create({
  row: {flexDirection: 'row', gap: 6, alignItems: 'center'}, flex: {flex: 1},
  button: {minHeight: 44, paddingVertical: 7, paddingHorizontal: 10, borderWidth: 1.5, borderRadius: 4, borderColor: '#111', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', flexDirection: 'row', gap: 5},
  buttonIcon: {width: 18, height: 18},
  buttonText: {fontSize: 16, lineHeight: 20, fontWeight: '600', color: '#111', textAlign: 'center'},
  small: {paddingHorizontal: 7, minHeight: 40, minWidth: 36}, smallText: {fontSize: 14, lineHeight: 18},
  compact: STEP_BUTTON_STYLE,
  secondary: {backgroundColor: '#eee', borderColor: '#888'},
  primary: {backgroundColor: '#111'}, white: {color: '#fff'}, disabled: {opacity: 0.35},
  grid: {flexDirection: 'row', gap: 6},
  control: {flex:1,flexDirection:'row',alignItems:'center',gap:3,paddingVertical:5,paddingHorizontal:4,
    borderWidth:1.5,borderColor:'#111',borderRadius:4},
  stepper: {flexDirection:'row',gap:1,alignItems:'center'},
  label: {flex:1,fontSize:11,lineHeight:16,color:'#111'},
  value: {fontSize:14,lineHeight:18,color:'#111',width:18,textAlign:'center',fontVariant:['tabular-nums']},
});
