# 白底遮线研究 / White masking research

## 1.0.0 实现更新

下文保留最初样例分析。1.0 将遮线范围从仅最终纯白 255 扩展为最终灰阶 240–255，统一写为 #FEFEFE；0–239 保持原值。发生在缩放、灰阶调整及反相之后，预览和导出使用同一实现；关闭开关不合并浅灰。此范围是针对浅灰在墨水屏上接近白色的折中，并不保证所有固件显示阈值相同；可能合并细微高光，用户可关闭开关。

原始遮线特性和整图置顶的限制未改变。实际模板遮挡效果仍取决于宿主渲染；桌面测试验证的是像素映射。

## 历史研究

日期：2026-10-14。依据用户提供的 `Manta.png` 和 `20261014_113452.png` 原始文件进行分析；交付源码不包含这两张用户图片及其元数据。

0.9.3 界面说明：当前名称为“白底遮线”，以独立工具面板中的图标开关呈现，不再标注实验版。以下 0.4.0 的像素研究与机制说明保留作为历史依据；去掉实验标记不代表获得整图置顶能力。关于页面的图文工具指南说明此开关的范围，开关变化纳入统一撤销、重做。

## 观察

- 原图 1920×2560、RGB，截图 1404×1872、RGB。原图没有 alpha 通道。
- 原图中 `#FEFEFE` 有 1,455,938 个像素，`#FFFFFF` 有 994,974 个像素；还存在大量其他近白色，包括 `(254,255,250)`。
- 截图中插图约在 x=300…1103、y=400…1471，大小 804×1072。横线在 y=414、509、604、699、794、889、984、1079、1174、1269、1364、1459 穿过图片。
- 为避免把图案边缘误判为模板线，在各横线位置，仅采样上下相邻行颜色相同且均为指定灰度的像素，再检查横线行的值。

| 上下相邻像素灰度 | 样本数 | 横线被遮住 | 横线仍在 |
| --- | ---: | ---: | ---: |
| 255 (`#FFFFFF`) | 1339 | 0 | 1339 |
| 254 (`#FEFEFE`) | 3649 | 3649 | 0 |
| 253 | 1022 | 0 | 1022 |
| 252 | 59 | 0 | 59 |
| 250 | 47 | 0 | 47 |
| 240 | 1 | 0 | 1 |
| 157 | 2 | 0 | 2 |

透线样本在横线位置的灰度是 1；254 样本该位置仍为 254。外框遮线区域与原图近白色框相符。

## 推断与实现

这组证据支持 **特定白色色值在 Supernote 合成时有特殊含义**，而不是 PNG alpha 透明度导致。社区解析工具 [supernote-tool](https://github.com/jya-dev/supernote-tool) 也记录 `#fefefe` 表示 white、`#ffffff` 表示 transparent。它佐证笔记格式中的白色约定，但不是官方对图片置顶能力的承诺。

官方 [insertImage](https://docs.supernote.com/en/api-reference/supernote-plugin/plugin-note-api/insert-image) / SDK 0.2.3 只接收文件路径，没有插入层级或 alpha 模式参数。本版本不修改笔记文件结构，不搬动用户已有图层。

0.4.0 提供默认关闭的“白底遮线（实验）”。编辑图片经裁剪、缩放、灰阶处理后，最后将灰度 255 转为 254，PNG 保持不透明；预览与导出都执行相同规则。灰度 0…254 保持当前处理结果。这样可利用白色区域的遮线行为，**不构成整图置顶**，也不能保证手写内容被遮住。预览本身没有模板，不显示遮线模拟。

关闭开关保持旧版像素处理；直接插入原图完全绕过转换。原图已有的 254 像素仍可能遮线。未采用二值化、额外蒙版对象或重建图层，以免损失灰阶、改变已有笔记或产生多个需同步缩放的对象。

## 验证范围

已用实际 Java 像素处理代码测试全部 256 个灰阶：开启时仅 255→254，其他值不变；也验证自动黑白点导致的高光白色在最终步骤转换。参数经实际 React 组件传入预览和最终导出，切换预设与还原灰阶均保留开关。

仍需在设备上比较开启/关闭后的插入效果，并检查缩放、保存重开、重启、导出 PDF 后是否保持。主机插入或缩放过程若再次插值，可能改变特殊白色边缘。不能从这一个样本推断所有系统版本、所有图层和全部非白颜色的行为。

复现像素统计（需要 Python、Pillow 和 NumPy）：

```powershell
python scripts/analyze-white-mask.py "path/to/Manta.png" "path/to/20261014_113452.png"
```

此脚本仅用于这组截图的已定位区域；不同截图应重新确定图像矩形与模板线坐标。

## English

Both supplied PNGs are RGB with no alpha. In the screenshot, 3,649 locally uniform gray-254 samples mask the ruled lines, while all 1,339 white-255 samples and the other sampled grays let the lines show through. This supports a special-white convention, consistent with supernote-tool, rather than ordinary PNG transparency.

The experimental option maps final edited white (255) to 254 after resizing and tone processing. It masks white areas only; it is not a whole-image foreground mode. Host scaling, reopening, handwriting coverage and PDF export remain to be verified on hardware.
