import React from 'react';
import {Image, Pressable, StatusBar, StyleSheet, Text, View} from 'react-native';
import {t} from './i18n';
import type {Language} from './i18n';
import {useInputTarget} from './useInputTarget';
import {BrandWordmark} from './Brand';

export function AppHeader({noteName, language, about = false, onBack, onLanguage, onAbout, disabled = false, languageDisabled = false}: {
  noteName: string; language: Language; about?: boolean; onBack: () => void; onLanguage: () => void; onAbout: () => void;
  disabled?: boolean; languageDisabled?: boolean;
}) {
  const back=useInputTarget(onBack,disabled), lang=useInputTarget(onLanguage,disabled||languageDisabled), info=useInputTarget(onAbout,disabled);
  return <>
    <StatusBar barStyle="dark-content" backgroundColor="#fff" />
    <View style={s.header} accessibilityLabel="Pic2Note header">
      <View style={s.side}>
        <Pressable ref={back.ref} onLayout={back.onLayout} collapsable={false} accessibilityRole="button" accessibilityLabel={t('返回笔记')} accessibilityHint={noteName}
          accessibilityState={{disabled}} disabled={disabled} onPress={back.onPress} style={[s.back, disabled && s.disabled]}>
          <Text style={s.noteName} numberOfLines={1}>{noteName || t('返回笔记')}</Text>
          <Image source={require('../assets/note-arrow.png')} resizeMode="contain" style={s.arrow} accessibilityLabel="Return to note icon" accessible={false} />
        </Pressable>
      </View>
      <View style={s.brand} accessibilityLabel="Pic2Note centered title">
        <Image source={require('../assets/icon.png')} style={s.logo} accessibilityLabel="Pic2Note logo" />
        <BrandWordmark size={20} accessibilityLabel="Pic2Note header title" />
      </View>
      <View style={[s.side, s.actions]}>
        <Pressable ref={lang.ref} onLayout={lang.onLayout} collapsable={false} accessibilityRole="button" accessibilityLabel="中文 / English" accessibilityHint={t('切换界面语言')}
          accessibilityValue={{text: language === 'zh' ? '中文' : 'English'}}
          accessibilityState={{disabled: disabled || languageDisabled}} disabled={disabled || languageDisabled} onPress={lang.onPress}
          style={[s.languageButton, disabled && s.disabled]}>
          <Text style={[s.languageText, language === 'zh' ? s.currentLanguage : s.otherLanguage]} accessibilityLabel="Chinese language label">中文</Text>
          <Text style={s.languageDivider}>/</Text>
          <Text style={[s.languageText, language === 'en' ? s.currentLanguage : s.otherLanguage]} accessibilityLabel="English language label">En</Text>
        </Pressable>
        <Pressable ref={info.ref} onLayout={info.onLayout} collapsable={false} accessibilityRole="button" accessibilityLabel={t('关于')} accessibilityHint={t(about ? '返回编辑' : '查看插件介绍')}
          accessibilityState={{disabled, selected: about}} disabled={disabled} onPress={info.onPress}
          style={({pressed}) => [s.iconButton, (about || pressed) && s.selected, disabled && s.disabled]}>
          <Image source={require('../assets/about.png')} style={s.actionIcon} accessibilityLabel="About icon" accessible={false} />
        </Pressable>
      </View>
    </View>
  </>;
}
const s = StyleSheet.create({
  header: {height: 60, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: '#111', flexDirection: 'row', alignItems: 'center'},
  side: {width: 160}, actions: {flexDirection: 'row', justifyContent: 'flex-end', gap: 8},
  back: {width: 146, height: 38, borderRadius: 3, backgroundColor: '#000', justifyContent: 'center', paddingLeft: 14, paddingRight: 26},
  noteName: {fontSize: 16, lineHeight: 22, color: '#fff', includeFontPadding: false},
  arrow: {position: 'absolute', right: -10, top: 5, width: 30, height: 28},
  brand: {flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6},
  logo: {width: 28, height: 28},
  iconButton: {width: 44, height: 44, borderRadius: 4, alignItems: 'center', justifyContent: 'center'},
  languageButton: {width: 96, height: 44, borderRadius: 4, flexDirection: 'row', gap: 3, alignItems: 'center', justifyContent: 'center'},
  languageText: {fontSize: 16, lineHeight: 22, includeFontPadding: false},
  currentLanguage: {color: '#111', fontWeight: '600'}, otherLanguage: {color: '#999', fontWeight: '400'},
  languageDivider: {fontSize: 16, lineHeight: 22, color: '#999', includeFontPadding: false},
  actionIcon: {width: 28, height: 28}, selected: {backgroundColor: '#ddd'}, disabled: {opacity: 0.35},
});
