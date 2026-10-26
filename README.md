# Pic2Note 1.0.1

![Pic2Note](assets/brand.png)

Supernote 离线图片插入与编辑插件，中英文界面。开发者 **Keplex**，借助 OpenAI GPT 辅助开发、研究与测试。独立社区项目；代码与原创图形采用 [MIT](LICENSE)。

## 安装与升级

把完整的 **Pic2Note-1.0.1.snplg** 原样复制到设备 MyStyle，不解压。在“设置 → 应用 → 插件 → 选择安装包”中安装或升级，然后**重启设备**。版本号 1.0.1，版本码 18。内部 pluginKey、JS 模块和插件 ID 保持 LocalImage / limg26nomad00001，沿用旧版本安装身份。原始构建输出为 LocalImage-1.0.1.snplg，交付包内容相同。

## 开始使用

- **选择图片**：通过系统文件选择器打开 PNG / JPG / JPEG。
- **选择最新**：授予文件读取权限后，只搜索 Document、EXPORT、INBOX、MyStyle、Note、SCREENSHOT 六个允许目录，按系统创建时间选择最新图片。推荐把新图片放入 INBOX 或 EXPORT。Download 无法授权；创建时间由文件系统提供，不保证等于上传时间。
- **灰阶调整**：五个预设与亮度、对比度、提亮暗部、压暗亮部四项控制位于图片上方。每项的文字、数值和胶囊形加减号在同一个框内。调整后立即处理预览，忙碌时只保留最新待处理参数。
- **八点裁剪**：四角及上、下、左、右边缘中点共八个方形锚点。点按任一点激活，黑色表示当前激活点；再点图片其他位置进行定位。角点移动相邻两条边，边缘锚点只移动对应的一条边。也可直接拖动任一锚点，不必先激活，锚点、边框和遮罩实时跟随。松笔记录一次编辑，中途取消不改变裁剪。图片周围留有操作空间，完整原图的八个锚点都可见。笔和触摸均支持。
- **插入图片**：插入编辑副本；“插入原图”忽略全部编辑，使用原文件。底部按钮保持可见，中间图片和工具区域随横竖屏弹性缩放。
- **编辑笔记里的图片**：用套索只选中一张图片，从套索菜单点 Pic2Note，自动载入编辑；点“替换原图片”回写同一图片并保存。原图可读时复用原始文件，否则请求系统导出所选图片。替换后需要移动缩放时，请用系统套索重新选择；不再尝试自动恢复选框。
- **关于**：右上角提供图文快速入门、工具说明、版本记录和 MIT 许可证。

## 工具

工具栏位于图片旁，黑色线框、无阴影；底部移侧按钮可左右切换，并记忆下次位置。较矮的窗口自动紧凑分列。

| 工具 | 操作 |
| --- | --- |
| 对比 | 显示最初完整图片，再点返回当前效果 |
| 撤销 | 撤销一步；长按恢复初始状态，恢复本身也可撤销 |
| 重做 | 重做已撤销的操作；新编辑会清除重做分支 |
| 旋转 | 顺时针 90°，裁剪框随之旋转 |
| 水平镜像 / 垂直镜像 | 按当前显示方向左右 / 上下翻转 |
| 反相 | 反转黑白灰阶 |
| 白底遮线 | 将最终灰阶 240–255 的白色及很浅灰色合并成遮线白色，扩大覆盖模板线的范围。较深灰色仍可能透线；需要保留高光的细微灰阶时关闭 |

遮线通过 #FEFEFE 白色笔迹特性实现，不是把整张图片移到模板或手写笔迹上方。处理发生在缩放、灰阶及反相之后，预览和导出采用同一规则；关闭开关不合并浅灰阶。裁剪外的淡色遮罩仅用于编辑显示，不写入导出图片。

原文件不覆盖；编辑副本保存在 MyStyle/LocalImage。历史最多 100 步，换图重置。仅申请文件读写权限，不请求网络权限。

## 1.0.1 调整

操作界面与关于教程共用 30×24 的胶囊形加减按钮，四项灰阶调节仍在同一行。

新增上下左右四个边缘中点锚点，共八点裁剪。激活、点图定位、直接拖动、实时反馈、取消及撤销机制与角点共用；边缘锚点只改变一条裁剪边。八个锚点均支持手写笔和触摸，较小裁剪框按距离选择最近锚点。

## 1.0 发布调整

- 四角锚点完整可见，可直接激活和拖动；删除独立“左上 / 右下”切换按钮及旧图标、几何逻辑。
- 拖动草稿留在裁剪组件内，不处理原生图像、不写撤销历史；松笔只提交一次。手写笔与 RN 事件共用捕获和去重，支持拖出图片边界时安全限制坐标，取消、关闭和尺寸变化会丢弃未提交草稿。
- 白底遮线由仅处理纯白扩大到 240–255 的浅灰范围；低于 240 不变。
- 保留 0.9.6 的均匀裁剪遮罩、上方灰阶控制、黑边工具栏、位置记忆和套索替换流程。移除旧角点切换组件与无用图片资源，更新图文教程。

详见 [发布说明](RELEASE_NOTES_1.0.1.md)、[输入与预览](docs/input-and-preview.md)、[图片替换](docs/picture-editing.md) 和 [白底遮线研究](docs/white-mask-research.md)。

## 真机验证

安装完整包并重启后，测试八个锚点的点按激活、图片点位、直接拖动、取消和撤销；检查横竖屏、工具移侧以及未裁剪时的锚点边缘。再以含浅灰背景的图片开关遮线，检查模板线与高光细节的取舍。

桌面测试模拟 SDK 回执、笔事件和 RN 布局，不能替代实际固件和墨水屏测试；没有宣称设备上实测提速比例。

## English

Offline, bilingual image insertion and editing for Supernote. Install **Pic2Note-1.0.1.snplg** in MyStyle through Settings > Apps > Plugins, then restart. Version code 18 retains the existing plugin identity.

Choose a local PNG/JPEG or the newest creation-time image in allowed folders. Presets and boxed tone controls sit above the image; insertion actions remain at the bottom. The toolbar occupies its own space, remembers left/right docking and adapts to shorter windows.

Tap any of eight square anchors at the corners and edge midpoints to activate it, then tap elsewhere in the image to position it. Corner anchors move two adjacent edges; edge anchors move only their corresponding edge. Drag any anchor directly for live feedback, regardless of its previous active state. Each release records one edit; cancellation discards the draft. An inset keeps all full-image anchors visible. Dragging changes only the local overlay; native image processing waits for release.

White masking now maps final gray values 240–255 to #FEFEFE white ink after tone/inversion, covering near-white areas that e-ink may display as white. Darker values remain unchanged. Turn it off to preserve subtle highlight detail. This does not move the whole image above ink or the template.

Lasso exactly one existing picture and open Pic2Note from its menu. Editing updates that picture and saves before returning. Select it again with the system lasso to move/resize afterward; automatic post-replacement selection recovery remains removed. Originals remain intact. See the illustrated About guide for all tools.

## 构建

Node >=22.18，pnpm 11.25.0，React 19.0.0 / React Native 0.79.2 / sn-plugin-lib 0.2.3。工具链见 [native/BUILD.md](native/BUILD.md)。PNG 已包含；重绘 SVG 可选安装 sharp 并运行 scripts/assets.cjs。

```powershell
pnpm install --frozen-lockfile --ignore-scripts
pnpm run typecheck
pnpm run test
pnpm run test:native
pnpm run build
```

## 官方依据

- [文件权限](https://docs.supernote.com/en/plugin-base/permission)
- [套索流程](https://docs.supernote.com/en/plugin-base/lasso)
- [MotionEvent](https://docs.supernote.com/en/api-reference/supernote-plugin/types/motion-event)
- [元素缓存与释放](https://docs.supernote.com/en/plugin-base/file-op/element-op)
- [选区图片导出](https://docs.supernote.com/en/api-reference/supernote-plugin/plugin-comm-api/generate-lasso-preview)
- [当前页元素回写](https://docs.supernote.com/en/api-reference/supernote-plugin/plugin-comm-api/modify-page-elements)

## 版本记录

- 1.0.1 / 2026-10-26：新增上下左右边缘锚点，八个锚点共用激活与实时拖动操作；边缘锚点只移动对应一条边。

- 1.0.0 / 2026-10-26：正式发布；可见四角锚点、直接激活和实时拖动；移除角点切换；扩展浅灰遮线范围。
- 0.9.6 / 2026-10-26：移除替换后选中恢复；修复遮罩透明度叠加；灰阶控制上移；精简重复计算。
- 0.9.5 / 2026-10-26：尝试替换后选中（后移除）；黑边工具栏和横竖屏弹性布局。
- 0.9.4 / 2026-10-26：修复负页码回写；锚点旁切换；单行灰阶控制。
- 0.9.3 / 2026-10-23：字标分色、独立工具栏与位置记忆、图文教程、套索导出回退、修复撤销预览竞态。
- 0.9.2 / 2026-10-23：统一 Pic2Note 名称、重画图标、笔触支持、即时预览与缓存。
- 0.9.1 / 2026-10-23：目录白名单与创建时间、裁剪布尔值修复、镜像与工具文字。
- 0.9.0 / 2026-10-23：单页编辑、统一撤销重做、旋转反相与图片替换。
