import React from 'react';
import {Image, StyleSheet, Text, View, type StyleProp, type ViewStyle} from 'react-native';

export const BRAND_JADE = '#438d83';
export const BRAND_TAGLINE = 'Local image insertion plugin for Supernote';

/** Native text stays crisp on e-ink; all brand placements share the same two colors. */
export function BrandWordmark({size = 32, accessibilityLabel = 'Pic2Note', style}: {
  size?: number; accessibilityLabel?: string; style?: StyleProp<ViewStyle>;
}) {
  const type = {fontSize: size, lineHeight: Math.round(size * 1.3)};
  return <View accessible accessibilityLabel={accessibilityLabel} style={[s.wordmark, style]}>
    <Text style={[s.word, type, s.pic]}>Pic</Text>
    <Text style={[s.word, type, s.note]}>2Note</Text>
  </View>;
}

export function BrandBanner({horizontal = false, style}: {horizontal?: boolean; style?: StyleProp<ViewStyle>}) {
  return <View style={[s.banner, style]} accessibilityLabel="Pic2Note brand banner">
    <View style={[s.mark, horizontal && s.horizontal]}>
      <Image source={require('../assets/brand.png')} style={s.logo} accessibilityLabel="Pic2Note brand logo" />
      <BrandWordmark size={horizontal ? 30 : 32} />
    </View>
    <Text style={s.tagline}>{BRAND_TAGLINE}</Text>
  </View>;
}

const s = StyleSheet.create({
  wordmark: {flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', flexShrink: 1},
  word: {fontWeight: '700', includeFontPadding: false}, pic: {color: '#1f1f1f'}, note: {color: BRAND_JADE},
  banner: {alignItems: 'center', gap: 12, paddingVertical: 16, paddingHorizontal: 12, width: '100%'},
  mark: {alignItems: 'center', gap: 12}, horizontal: {flexDirection: 'row', gap: 20},
  logo: {width: 100, height: 100},
  tagline: {fontSize: 13, lineHeight: 19, letterSpacing: 0.5, color: '#555', textAlign: 'center', maxWidth: 370},
});
