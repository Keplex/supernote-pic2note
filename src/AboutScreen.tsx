import React, {useState} from 'react';
import {Image, SafeAreaView, ScrollView, StyleSheet, Text, View} from 'react-native';
import {Button,STEP_BUTTON_STYLE} from './EditorControls';
import {AppHeader} from './AppHeader';
import {BrandBanner} from './Brand';
import {CROP_ANCHORS,PRESETS} from './editor';
import type {Language} from './i18n';
import {t} from './i18n';
import {refreshInputBounds} from './useInputTarget';
import {toolImages, type ToolIcon} from './toolIcons';
import {MIT_LICENSE} from './license';

export const ABOUT = {
  zh: [
    ['Pic2Note 1.0.1', '开发者：Keplex\n借助 OpenAI GPT 辅助开发、研究与测试。\n离线本地图片编辑与插入工具；独立社区项目，非 Supernote 官方插件。'],
    ['原图与编辑记录', '原始文件不覆盖；编辑副本保存在 MyStyle/LocalImage。撤销记录仅在本次编辑中有效，最多 100 步；换图后重新开始。白底遮线将白色和很浅的灰色合并为遮线白色，不会将整张图片置于笔迹或模板上方。'],
    ['版本日志', '1.0.1 · 2026-10-26\n新增上、下、左、右四个边缘锚点，共八个锚点；点按激活、点图定位和实时拖动逻辑相同，边缘锚点只移动对应的一条裁剪边；操作界面加减号与教程统一为胶囊形。\n\n1.0.0 · 2026-10-26\n正式发布；四角锚点可直接点按激活、拖动实时跟随，松笔提交；取消角点切换按钮；修复完整图片锚点被裁掉；白底遮线扩展至很浅的灰色区域。\n\n0.9.6 · 2026-10-26\n移除替换后的选中恢复；修复裁剪遮罩四角透明度叠加；预设与灰阶控制移至图片上方；精简回写流程与预设、历史计算。\n\n0.9.5 · 2026-10-26\n替换保存并返回笔记后恢复单图选框；工具列改黑色边框、无阴影，竖屏留白更宽、空间较矮时紧凑分列；灰阶独立框分组；底部控制固定，中间区域随横竖屏弹性缩放。\n\n0.9.4 · 2026-10-26\n修复套索回写负页码；裁剪角切换移到锚点旁并自动避让；单块裁剪遮罩消除拼缝；工具列改为白色圆角悬浮视觉，取消分组；灰阶文字与圆形加减同排，更新图文指南。\n\n0.9.3 · 2026-10-23\n品牌字标统一分色并恢复介绍小字；独立工具面板，可左右切换并记忆；预设移至图片下方，四项灰阶控制合为一行；增加图文快速入门；套索图片增加系统导出回退；修复撤销预览竞态，减少重复绘制与缩放。\n\n0.9.2 · 2026-10-23\n统一 Pic2Note 名称；重画旋转及对比图标；按钮支持手写笔；立即预览与源像素缓存；放大分组空白；调整套索图片回写。\n\n0.9.1 · 2026-10-23\n修复最新检索目录与创建时间、裁剪后布尔参数；工具增加文字标签及水平、垂直镜像。\n\n0.9.0 · 2026-10-23\n裁剪、灰阶合并为单页编辑；统一撤销、重做，增加旋转、反相及选择最新。'],
    ['许可与兼容性', '代码与原创图形采用 MIT 许可证；第三方组件详见 THIRD-PARTY-NOTICES.txt。仅声明文件读写权限，不请求网络权限。系统功能取决于设备的官方插件接口版本。'],
  ],
  en: [
    ['Pic2Note 1.0.1', 'Developer: Keplex\nBuilt with assistance from OpenAI GPT for development, research and testing.\nAn offline image editor and insertion tool. Independent community project; not an official Supernote plugin.'],
    ['Originals and history', 'Originals are never overwritten. Edited copies go to MyStyle/LocalImage. History holds up to 100 steps in the current editing session; choosing another image starts fresh. White masking merges white and near-white highlights into masking white; it does not move the whole image above ink or the template.'],
    ['Changelog', '1.0.1 · 2026-10-26\nAdd top, bottom, left and right edge anchors for eight total. Tap activation, point placement and live dragging work consistently; each edge anchor moves only its own crop edge. Editor +/- buttons share the guide’s capsule shape.\n\n1.0.0 · 2026-10-26\nFirst stable release; four directly selectable anchors with live dragging and one commit on release; remove corner-switch buttons; keep full-image anchors visible; expand white masking to near-white highlights.\n\n0.9.6 · 2026-10-26\nRemove post-replacement selection recovery; fix doubled crop-mask alpha at corners; move presets and tone controls above the image; simplify writeback, preset matching and history updates.\n\n0.9.5 · 2026-10-26\nRestore single-picture selection after replacement/save and note handoff; black toolbar outline without shadows, more portrait spacing and compact columns in shorter windows; boxed inline tone controls; bottom-anchored adjustments and a flexible image workspace.\n\n0.9.4 · 2026-10-26\nNormalize negative lasso page metadata before writeback; crop-corner switch beside the active anchor with automatic placement; seamless single crop mask; white floating-style toolbar without groups; inline tone labels and round +/- controls; updated illustrated guide.\n\n0.9.3 · 2026-10-23\nTwo-color wordmark and restored tagline; a separate toolbar panel with remembered left/right placement; presets below the image and four tone controls in one row; illustrated quick start; host export fallback for lasso images; fixed stale previews after undo and reduced redundant draws and resizing.\n\n0.9.2 · 2026-10-23\nUnified Pic2Note name; new rotation/comparison icons; stylus support; immediate previews and source-pixel cache; larger group gaps; revised lasso-image writeback.\n\n0.9.1 · 2026-10-23\nFixed allowed-folder scanning with creation time and cropped boolean parameters; labeled tools and horizontal/vertical flips.\n\n0.9.0 · 2026-10-23\nUnified crop and tone editing, shared undo/redo, rotation, inversion and latest-image selection.'],
    ['License and compatibility', 'Code and original graphics are MIT licensed; see THIRD-PARTY-NOTICES.txt for dependencies. File read/write permissions only, no network access. Host features depend on the official plugin API version.'],
  ],
};

interface GuideTool {icon: ToolIcon; title: string; body: string}
const GUIDE = {
  zh: {
    title: '快速入门', sample: '下面是界面示意，实际操作请返回编辑器。',
    chooseTitle: '1 · 选择图片',
    choose: '“选择图片”打开系统文件选择器；“选择最新”自动读取允许目录中创建时间最新的 PNG / JPG / JPEG。首次使用按系统提示授予文件读取权限。',
    latest: '建议把新图片放入 INBOX 或 EXPORT。最新检索仅覆盖 Document、EXPORT、INBOX、MyStyle、Note、SCREENSHOT；Download 无法授权。系统创建时间不一定等于上传时间。拒绝读取权限后，可在设置 → 应用 → 插件中更改。',
    editTitle: '2 · 裁剪与调整',
    edit: '四角及上下左右边缘中点共八个锚点，点按任一方块即可激活，黑色表示当前激活点。再用笔或手指点图片其他位置，将该锚点移到相应位置；边缘锚点只移动对应的一条边。也可直接拖动任一锚点，不必先激活。拖动时锚点和裁剪框实时跟随，松笔后记录一次编辑；中途取消不改变裁剪。图片周围留有操作空间，八个锚点始终可见。浅色区域不会导出。预设和四项灰阶控制位于图片上方，调整后立即开始预览。',
    saveTitle: '3 · 返回笔记',
    save: '新图片点“插入图片”应用全部编辑；“插入原图”忽略编辑。返回笔记后，用系统控件调整并确认图片位置。',
    lassoTitle: '编辑笔记里已有的图片',
    lasso: '在笔记里用套索只选中一张图片 → 点套索菜单里的 Pic2Note 图标 → 自动进入编辑 → 点“替换原图片”。替换并保存后返回笔记；如需继续移动或缩放，请用系统套索重新选择图片。无需从首页再次选择。',
    toolsTitle: '工具速查',
    tools: [
      [{icon: 'compare', title: '前后对比', body: '显示最初的完整原图；再点返回编辑效果，不改变参数。'},
       {icon: 'undo', title: '撤销 · 长按复原', body: '点按退回上一步；长按恢复全部初始参数。复原本身也能撤销。'},
       {icon: 'redo', title: '重做', body: '重新执行已撤销的操作；进行新编辑后清空重做记录。'}],
      [{icon: 'rotate', title: '顺时针旋转', body: '每次旋转 90°；裁剪框跟随图片旋转。'},
       {icon: 'mirrorX', title: '水平镜像', body: '沿当前显示方向左右翻转。'},
       {icon: 'mirrorY', title: '垂直镜像', body: '沿当前显示方向上下翻转。'},
       {icon: 'invert', title: '图片反相', body: '切换黑白反相；黑底按钮表示已开启，再点关闭。'},
       {icon: 'mask', title: '白底遮线', body: '开启后，白色及很浅的灰色区域遮住模板线；较深灰色仍可能透线。若浅灰细节变淡，可关闭。'}],
    ] as GuideTool[][],
    dock: '工具列位于图片旁的独立空间，白底黑色圆角线框只是悬浮视觉，无阴影、不遮挡图片。竖屏间距更宽；空间较矮时自动分列。预设和灰阶控制在图片上方，插入按钮靠底部排列，中间区域随屏幕方向弹性缩放。底部移侧按钮可切换到左侧或右侧，下次打开保留位置。',
  },
  en: {
    title: 'Quick start', sample: 'Illustrations below are read-only. Return to the editor to use the controls.',
    chooseTitle: '1 · Choose an image',
    choose: 'Choose image opens the system picker. Latest image finds the PNG / JPG / JPEG with the newest creation time in allowed folders. Allow file read access when prompted.',
    latest: 'Put new images in INBOX or EXPORT. Latest image searches Document, EXPORT, INBOX, MyStyle, Note and SCREENSHOT only; Download cannot be granted. Creation time is not always upload time. After denial, change access in Settings > Apps > Plugins.',
    editTitle: '2 · Crop and adjust',
    edit: 'Tap any of eight square anchors at the corners and edge midpoints; black marks the active one. Tap elsewhere in the image to place it, or drag any anchor directly without selecting it first. Edge anchors move only their corresponding edge. The anchor and crop frame follow the pointer live; release records one edit, while cancellation keeps the original crop. A small margin keeps all eight full-image anchors visible. Faded areas are not exported. Presets and tone controls sit above the image; preview starts immediately.',
    saveTitle: '3 · Return to the note',
    save: 'Insert image applies your edits. Insert original ignores all edits. Back in the note, adjust and confirm placement with the system controls.',
    lassoTitle: 'Edit an image already in a note',
    lasso: 'Lasso exactly one image in the note → tap Pic2Note in the lasso menu → edit the image → tap Replace image. The edited picture is saved before returning to the note. Use the system lasso again if you need to move or resize it. There is no need to choose the image again on the home screen.',
    toolsTitle: 'Tools at a glance',
    tools: [
      [{icon: 'compare', title: 'Before / after', body: 'Show the original full image. Tap again to return to edits without changing parameters.'},
       {icon: 'undo', title: 'Undo · hold to restore', body: 'Tap to undo one edit. Hold to restore initial settings; this restoration can also be undone.'},
       {icon: 'redo', title: 'Redo', body: 'Reapply an undone edit. Making a new edit clears the redo branch.'}],
      [{icon: 'rotate', title: 'Rotate clockwise', body: 'Rotate 90° each time, carrying the crop with the image.'},
       {icon: 'mirrorX', title: 'Flip H', body: 'Mirror left and right in the displayed orientation.'},
       {icon: 'mirrorY', title: 'Flip V', body: 'Mirror top and bottom in the displayed orientation.'},
       {icon: 'invert', title: 'Invert image', body: 'Reverse black and white. A black button means on; tap again to turn it off.'},
       {icon: 'mask', title: 'White masks lines', body: 'Mask lines beneath white and near-white highlights. Darker grays may still show lines. Turn off to retain subtle highlight details.'}],
    ] as GuideTool[][],
    dock: 'The white toolbar has a black rounded outline and no shadow, with its own space beside the image. Tall windows have wider spacing; shorter windows use compact columns. Presets and tone controls stay above the image; insertion buttons remain at the bottom while the middle workspace flexes. Use its bottom move-side button to dock left or right. Pic2Note remembers your choice next time.',
  },
};

/** Read-only illustrations deliberately do not register pen targets or edit callbacks. */
function SampleButton({label, primary = false, latest = false, small = false, step = false}: {
  label: string; primary?: boolean; latest?: boolean; small?: boolean; step?: boolean;
}) {
  return <View style={[s.sampleButton, primary && s.samplePrimary, small && s.sampleSmall, step && s.sampleStep]}>
    {latest && <Image source={require('../assets/latest.png')} style={s.sampleIcon} accessible={false} />}
    <Text style={[s.sampleText, primary && s.white, small && s.sampleSmallText]}>{label}</Text>
  </View>;
}

function ToolExample({icon}: {icon: ToolIcon}) {
  return <View style={s.toolCircle}><Image source={toolImages[icon][0]} style={s.toolIcon} accessible={false} /></View>;
}

function QuickStart({language}: {language: Language}) {
  const guide = GUIDE[language];
  return <View style={s.guide}>
    <View style={s.section}><Text style={s.title}>{guide.title}</Text><Text style={s.note}>{guide.sample}</Text></View>
    <View style={s.card}>
      <Text style={s.stepTitle}>{guide.chooseTitle}</Text>
      <View pointerEvents="none" style={s.sampleRow} accessibilityLabel="Choose image examples">
        <SampleButton label={t('选择图片')} /><SampleButton label={t('选择最新')} primary latest />
      </View>
      <Text style={s.body}>{guide.choose}</Text><Text style={s.note}>{guide.latest}</Text>
    </View>
    <View style={s.card}>
      <Text style={s.stepTitle}>{guide.editTitle}</Text>
      <View pointerEvents="none" style={s.cropMini} accessibilityLabel="Crop anchor examples">
        {CROP_ANCHORS.map(c=><View key={c} style={[s.miniHandle,c==='topLeft'&&s.activeHandle,
          c==='topLeft'||c==='bottomLeft'||c==='left'?{left:-7}:
            c==='topRight'||c==='bottomRight'||c==='right'?{right:-7}:{left:'50%',marginLeft:-7},
          c==='topLeft'||c==='topRight'||c==='top'?{top:-7}:
            c==='bottomLeft'||c==='bottomRight'||c==='bottom'?{bottom:-7}:{top:'50%',marginTop:-7}]}/>) }
      </View>
      <View pointerEvents="none" style={s.presetRow} accessibilityLabel="Tone preset examples">
        {PRESETS.map((preset, index) => <View style={s.flex} key={preset.name}><SampleButton label={t(preset.name)} primary={index === 0} small /></View>)}
      </View>
      <View pointerEvents="none" style={s.toneExample} accessibilityLabel="Tone control example">
        <Text style={s.sampleText}>{t('亮度')}</Text><SampleButton label="−" step /><Text style={s.sampleText}>0</Text><SampleButton label="+" step />
      </View>
      <Text style={s.body}>{guide.edit}</Text>
    </View>
    <View style={s.card}>
      <Text style={s.stepTitle}>{guide.saveTitle}</Text>
      <View pointerEvents="none" style={s.sampleRow} accessibilityLabel="Insert image examples">
        <SampleButton label={t('插入原图')} /><SampleButton label={t('插入图片')} primary />
      </View>
      <Text style={s.body}>{guide.save}</Text>
      <View style={s.lassoHeading}>
        <Image source={require('../assets/icon.png')} style={s.toolIcon} accessible={false} /><Text style={s.stepTitle}>{guide.lassoTitle}</Text>
      </View>
      <Text style={s.body}>{guide.lasso}</Text>
      <View pointerEvents="none" style={s.sampleRow}><SampleButton label={t('替换原图片')} primary /></View>
    </View>
    <Text style={s.title}>{guide.toolsTitle}</Text>
    <View style={s.card}>
      {guide.tools.flat().map(tool=><View key={tool.icon} style={s.toolRow} accessibilityLabel={'Quick guide '+tool.icon}>
        <View pointerEvents="none" style={s.toolSample}><ToolExample icon={tool.icon}/></View>
        <View style={s.flex}><Text style={s.toolTitle}>{tool.title}</Text><Text style={s.body}>{tool.body}</Text></View>
      </View>)}
    </View>
    <View style={[s.card, s.toolRow]} accessibilityLabel="Move toolbar guide">
      <View pointerEvents="none" style={s.toolSample}><ToolExample icon="dockLeft" /></View>
      <Text style={[s.body, s.flex]}>{guide.dock}</Text>
    </View>
  </View>;
}

export function AboutScreen({onBack, onNote, noteName, language, onLanguage, languageDisabled}: {
  onBack: () => void; onNote: () => void; noteName: string; language: Language; onLanguage: () => void; languageDisabled: boolean;
}) {
  const [license, setLicense] = useState(false);
  const [intro, ...details] = ABOUT[language];
  return <SafeAreaView style={s.screen}>
    <AppHeader about noteName={noteName} language={language} onBack={onNote} onLanguage={onLanguage} onAbout={onBack} languageDisabled={languageDisabled} />
    <ScrollView onScroll={refreshInputBounds} scrollEventThrottle={32} style={s.scroll} contentContainerStyle={s.content}>
      <BrandBanner horizontal style={s.banner} />
      <View style={s.section}><Text style={s.title}>{intro[0]}</Text><Text selectable style={s.body}>{intro[1]}</Text></View>
      <QuickStart language={language} />
      {details.map(([title, body]) => <View key={title} style={s.section}>
        <Text style={s.title}>{title}</Text><Text selectable style={s.body}>{body}</Text>
      </View>)}
      <Button label={license ? (language === 'zh' ? '收起 MIT 许可证' : 'Hide MIT license') : (language === 'zh' ? '查看 MIT 许可证全文' : 'Read the MIT license')}
        onPress={() => setLicense(!license)} secondary />
      {license && <Text selectable style={s.body}>{MIT_LICENSE}</Text>}
    </ScrollView>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#fff'}, scroll: {flex: 1}, flex: {flex: 1},
  content: {padding: 16, gap: 20}, banner: {backgroundColor: '#f8f8f8', borderRadius: 8},
  section: {gap: 8}, guide: {gap: 14},
  title: {fontSize: 19, lineHeight: 26, fontWeight: '700', color: '#111'},
  stepTitle: {fontSize: 16, lineHeight: 23, fontWeight: '700', color: '#111', flexShrink: 1},
  body: {fontSize: 14, lineHeight: 22, color: '#111'}, note: {fontSize: 12, lineHeight: 19, color: '#555'},
  card: {borderWidth: 1, borderColor: '#bbb', borderRadius: 6, padding: 14, gap: 12},
  sampleRow: {flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8},
  presetRow: {flexDirection: 'row', gap: 5},
  cropMini:{height:104,borderWidth:2,borderStyle:'dashed',borderColor:'#111',margin:8},
  miniHandle:{position:'absolute',width:14,height:14,borderColor:'#111',borderWidth:2,backgroundColor:'#fff'},activeHandle:{backgroundColor:'#111'},
  sampleStep:STEP_BUTTON_STYLE,
  sampleButton: {minHeight: 36, minWidth: 30, paddingVertical: 5, paddingHorizontal: 9, borderWidth: 1.5, borderColor: '#111', borderRadius: 4,
    flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff'},
  samplePrimary: {backgroundColor: '#111'}, sampleSmall: {minHeight: 30, paddingHorizontal: 6, paddingVertical: 3},
  sampleText: {fontSize: 14, lineHeight: 20, fontWeight: '600', color: '#111', textAlign: 'center'},
  sampleSmallText: {fontSize: 12, lineHeight: 18}, white: {color: '#fff'}, sampleIcon: {width: 18, height: 18},
  toneExample: {flexDirection:'row',gap:8,alignItems:'center',alignSelf:'flex-start',padding:5,borderWidth:1.5,borderColor:'#111',borderRadius:4},
  lassoHeading: {flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4},
  toolRow: {flexDirection: 'row', alignItems: 'center', gap: 12}, toolSample: {width: 44, alignItems: 'center'},
  toolCircle: {width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: '#111', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center'},
  toolIcon: {width: 24, height: 24}, toolTitle: {fontSize: 14, lineHeight: 21, fontWeight: '700', color: '#111', flexShrink: 1},
});

