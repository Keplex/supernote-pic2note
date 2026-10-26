# Pic2Note 1.0.0 · 2026-10-26

Pic2Note 1.0 正式发布：在 Supernote 上离线插入、裁剪和调整本地图片，中英文界面，支持触摸和手写笔。

## 功能

- 一页完成四角裁剪、五个灰阶预设和四项手动调节。
- 顺时针旋转、水平/垂直镜像、反相、白底遮线、前后对比。
- 共用撤销重做；长按撤销恢复初始状态。
- 选择本地 PNG/JPEG，或读取允许目录中创建时间最新的图片。
- 从系统套索菜单直接编辑已有图片，替换原图片并保存。
- 工具栏可左右移动并记忆；横竖屏弹性布局，配图快速入门。

## 本次改进

四角锚点始终完整可见。点按任一锚点即可激活，再点图片定位；也可直接拖动任何锚点，实时跟随笔尖或手指，松开记录一步编辑。独立的角点切换按钮已删除。

白底遮线扩展到最终灰阶 240–255 的白色及很浅灰色区域。较深灰色保留原值；关闭开关可保留高光微小灰阶。预览和导出使用同一规则。

拖动草稿只更新界面，松笔后才提交裁剪并按需处理原生预览，减少重复工作。保留均匀遮罩、源像素缓存和最新任务队列。

## 安装

下载完整 Pic2Note-1.0.0.snplg，原样复制到 MyStyle，不解压。在“设置 → 应用 → 插件 → 选择安装包”安装或升级后重启设备。版本码 17，保留旧版本插件身份。

替换后的图片如需移动或缩放，请用系统套索重新选择；自动选中恢复已移除。白底遮线并非整张图片置顶。墨水屏实际显示和新拖动交互仍需设备试用确认。

## English

Pic2Note 1.0 is an offline, bilingual image insertion and editing plugin for Supernote, supporting pen and touch.

Crop and adjust images on one page, with five tone presets, four manual controls, rotation, horizontal/vertical flips, inversion, white masking, comparison and shared undo/redo. Choose a local PNG/JPEG or the newest creation-time image in allowed folders. Edit an existing picture directly from the system lasso menu and replace/save it. The adaptive toolbar remembers left/right placement; About includes an illustrated quick start.

All four crop anchors stay fully visible. Tap an anchor to activate it and tap elsewhere to position it, or drag any anchor directly for live feedback. One release records one edit; cancellation discards the draft. Separate corner-switch buttons are removed. Native image processing waits until release, avoiding redundant work during dragging.

White masking now includes final gray levels 240–255; darker grays remain unchanged. Turn it off to preserve subtle highlights. Preview and export share the same rule.

Install the complete 1.0.0 .snplg from MyStyle and restart. Version code 17 retains the previous plugin identity. Use the system lasso again if you need to move/resize a replaced picture; automatic selection recovery remains removed. Device firmware and e-ink behavior require hardware verification.

Keplex · Assisted by OpenAI GPT · MIT
