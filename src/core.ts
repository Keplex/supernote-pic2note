import type {PictureElement, PictureSource} from './noteImage.ts';
import {t, translateError} from './i18n.ts';
export const READ = 'plugin.permission.FILE:READ';
export const WRITE = 'plugin.permission.FILE:WRITE';

export interface Context {path: string; page: number}
export interface Selection {path: string; uri: string; width: number; height: number; target: Context; replacement?: PictureElement; temporaryPath?: string}
export interface Dependencies {
  hasPermission(permission: string): Promise<number>;
  requestPermission(permission: string, description: string): Promise<number>;
  currentFile(): Promise<unknown>;
  currentPage(): Promise<unknown>;
  selectFile(params: object): Promise<string[] | null | undefined>;
  exists(path: string): Promise<boolean>;
  measure(uri: string): Promise<{width: number; height: number}>;
  insert(path: string): Promise<unknown>;
  returnToNote(): Promise<boolean>;
  latest?(): Promise<string>;
  selectedPicture?(target: Context): Promise<PictureSource>;
  releasePicture?(element: PictureElement, temporaryPath?: string): void;
  replacePicture?(selection: Selection, path: string): Promise<unknown>;
}

export async function ensurePermission(deps: Pick<Dependencies, 'hasPermission' | 'requestPermission'>, name: string, description?: string): Promise<void> {
  if (await deps.hasPermission(name) === 1) {return;}
  const writing = name === WRITE;
  const choice = await deps.requestPermission(name, t(description || (writing
    ? '保存处理后的图片并插入笔记，需要文件写入权限。'
    : '预览和调整图片需要读取本地文件。')));
  if (choice !== 1 && choice !== 2) {
    throw new Error(choice === -1 ? '已取消授权，尚未修改笔记。'
      : `${writing ? '写入' : '读取'}权限未获允许，请在设置 → 应用 → 插件中更改权限。`);
  }
}

export function errorText(error: unknown): string {
  if (error instanceof Error) {return translateError(error.message);}
  if (error && typeof error === 'object' && 'message' in error) {
    return translateError(String(error.message));
  }
  return translateError(String(error || '未知错误'));
}

function apiError(error: unknown, action: string): Error {
  const data = error as {code?: number; message?: string} | null;
  const hints: Record<number, string> = {
    1500: '权限声明未被系统识别，请重新安装插件。',
    1501: '没有笔记写入权限，请在插件管理中允许文件写入。',
    1503: '没有图片读取权限，请在插件管理中允许文件读取。',
    1217: '文件或文件夹已锁定，请先在系统文件管理器中解锁。',
  };
  const code = data?.code;
  const detail = code != null && hints[code] ? hints[code] : data?.message || '系统没有返回有效结果';
  return new Error(`${action}：${detail}${code != null ? `（代码 ${code}）` : ''}`);
}

function response(result: unknown): {success?: boolean; result?: unknown; error?: unknown} {
  return result && typeof result === 'object' ? result : {};
}

export function imagePath(value: string): string {
  let path = value;
  if (path.startsWith('file://')) {
    try {path = decodeURIComponent(path.slice(7));}
    catch {throw new Error('图片路径编码无效，请重新选择。');}
  }
  if (!path.startsWith('/') || /[\u0000\r\n]/.test(path)) {
    throw new Error('请选择设备上的本地图片文件。');
  }
  if (!/\.(png|jpe?g)$/i.test(path)) {
    throw new Error('仅支持 PNG、JPG、JPEG 图片。请先转换其他格式。');
  }
  return path;
}

export function fileUri(path: string): string {
  return 'file://' + path.split('/').map(encodeURIComponent).join('/');
}

export function basename(path: string): string {
  return path.split('/').pop() || path;
}

export function validateDimensions(width: number, height: number): void {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('无法读取图片尺寸，文件可能损坏。');
  }
  if (width * height > 16000000 || Math.max(width, height) > 8192) {
    throw new Error('图片尺寸过大，请先缩小到 1600 万像素以内，且长边不超过 8192 像素。');
  }
}

export class ImageController {
  private readonly deps: Dependencies;
  private busy = false;
  private consumed = false;
  private selected: Selection | null = null;

  constructor(deps: Dependencies) {this.deps = deps;}
  dispose() {const old=this.selected;this.selected=null;if(old?.replacement)this.deps.releasePicture?.(old.replacement, old.temporaryPath);}
  get selection(): Selection | null {return this.selected;}
  get canInsert(): boolean {return !!this.selected && !this.consumed && !this.busy;}

  private async permission(name: string): Promise<void> {
    await ensurePermission(this.deps, name);
  }

  async context(): Promise<Context> {
    const [fileResult,pageResult]=await Promise.all([this.deps.currentFile(),this.deps.currentPage()]);
    const file = response(fileResult);
    if (file.success !== true || typeof file.result !== 'string') {
      throw apiError(file.error, '读取当前笔记失败');
    }
    if (!/\.note$/i.test(file.result)) {
      throw new Error('请打开一本笔记，从笔记工具栏进入“Pic2Note”。');
    }
    const page = response(pageResult);
    if (page.success !== true || !Number.isInteger(page.result) || Number(page.result) < 0) {
      throw apiError(page.error, '读取当前页失败');
    }
    return {path: file.result, page: Number(page.result)};
  }

  async pick(mode: 'file' | 'latest' | 'selected' = 'file'): Promise<Selection | null> {
    if (this.busy) {throw new Error('操作进行中，请稍候。');}
    this.busy = true;
    let replacement: PictureElement | undefined; let source: PictureSource | undefined;
    try {
      await ensurePermission(this.deps, READ, mode === 'latest' ? '选择最新需要文件读取权限，仅搜索 Document、EXPORT、INBOX、MyStyle、Note、SCREENSHOT。请将待导入图片放入 INBOX 或 EXPORT。' : undefined);
      const target = await this.context();
      let files: string[] | null | undefined;
      if (mode === 'latest') {files = [await this.deps.latest!()];}
      else if (mode === 'selected') {source = await this.deps.selectedPicture!(target); files = [source.path]; replacement = source.element;}
      else {files = await this.deps.selectFile({
        selectType: 1,
        suffixList: ['png', 'jpg', 'jpeg', 'PNG', 'JPG', 'JPEG'],
        maxNum: 1,
        title: t('选择要插入的图片'),
        rightButtonText: t('选择'),
      });}
      if (!files?.length || !files[0]) {return null;}
      const path = imagePath(files[0]);
      // The lasso adapter already verifies its source and size; avoid a second bridge round trip.
      // Opening the native picker may end a one-time permission session.
      if(mode === 'file')await this.permission(READ);
      const uri = fileUri(path);
      let size;
      try {
        if(source?.width && source?.height)size={width:source.width,height:source.height};
        else {if (!(await this.deps.exists(path)))throw new Error('图片不存在或无法读取，请重新选择。');size=await this.deps.measure(uri);}
      }
      catch (error) {if(error instanceof Error && error.message==='图片不存在或无法读取，请重新选择。')throw error;throw new Error(`无法解码图片，请检查文件是否完整、已解锁且可读取。\n${errorText(error)}`);}
      validateDimensions(size.width, size.height);
      this.selected = {path, uri, ...size, target, ...(replacement ? {replacement,temporaryPath:source?.temporaryPath} : {})};
      this.consumed = false;
      return this.selected;
    } catch(error) {if(replacement)this.deps.releasePicture?.(replacement,source?.temporaryPath);throw error;}
    finally {this.busy = false;}
  }

  async insert(prepare?: (selection: Selection) => Promise<string>): Promise<{inserted: true; returned: boolean; warning?: string}> {
    if (this.busy) {throw new Error('操作进行中，请勿重复点击。');}
    if (!this.selected || this.consumed) {throw new Error('请先选择图片；已提交的图片不能重复提交。');}
    this.busy = true;
    try {
      const selection = this.selected;
      await this.permission(READ);
      await this.permission(WRITE);
      if (!(await this.deps.exists(selection.path))) {throw new Error('图片已移动或无法读取，请重新选择。');}
      // The editor exports only after write permission. A failed export never falls back to the source.
      const insertionPath = prepare ? imagePath(await prepare({...selection})) : selection.path;
      if (prepare && !(await this.deps.exists(insertionPath))) {throw new Error('调整后的图片未成功保存，笔记尚未修改。');}
      const current = await this.context();
      if (current.path !== selection.target.path || current.page !== selection.target.page) {
        throw new Error('当前笔记或页码已变化。请返回目标页后重新选择图片。');
      }
      // Mutations are never automatically retried. A rejected bridge call could
      // still have changed the note, so block a second submission of this selection.
      this.consumed = true;
      let completion: Promise<{ok: true; value: unknown} | {ok: false; error: unknown}>;
      try {
        // Queue the insertion before closing the overlay, as the working reference
        // plugin does. Attach rejection handling before starting the handoff.
        completion = (selection.replacement ? this.deps.replacePicture!(selection, insertionPath) : this.deps.insert(insertionPath)).then(
          value => ({ok: true as const, value}), error => ({ok: false as const, error}));
      }
      catch (error) {
        throw new Error(`未能确认插入结果，请先返回笔记检查，避免重复插入。\n${errorText(error)}`);
      }
      const returning = (async () => {
        // Existing-picture modifications must be acknowledged and saved before leaving.
        if (selection.replacement) {const result = await completion; if (!result.ok || response(result.value).success !== true) {return false;}}
        try {return await this.deps.returnToNote() === true;} catch {return false;}
      })();
      const [outcome, returned] = await Promise.all([completion, returning]);
      if (!outcome.ok) {
        throw new Error(`未能确认插入结果，请先返回笔记检查，避免重复插入。\n${errorText(outcome.error)}`);
      }
      const inserted = response(outcome.value);
      if (inserted.success === false || (inserted.success === true && inserted.result === false)) {
        this.consumed = false;
        throw apiError(inserted.error, '图片未插入');
      }
      if (inserted.success !== true || inserted.result !== true) {
        throw new Error('系统没有返回明确的插入结果，请先返回笔记检查，避免重复插入。');
      }
      if(selection.replacement){this.deps.releasePicture?.(selection.replacement,selection.temporaryPath);this.selected=null;}
      return returned ? {inserted:true,returned:true} : {inserted: true, returned: false,
        warning: '图片已插入，但暂时无法返回笔记。请使用左上角返回按钮。'};
    } finally {this.busy = false;}
  }
}
