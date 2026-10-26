import {imagePath, validateDimensions} from './core.ts';
import type {Context} from './core.ts';
export interface Rect {left:number;top:number;right:number;bottom:number}
export interface CachedPictureElement {uuid:string;type:number;numInPage:number;layerNum?:number;pageNum?:number;picture?:{picturePath?:string;rect?:Rect};[key:string]:unknown}
export interface PictureElement extends CachedPictureElement {picture:{picturePath:string;rect:Rect}}
export interface PictureSource {path:string;element:PictureElement;width?:number;height?:number;temporaryPath?:string}
interface IncomingPicture {path:string;element:CachedPictureElement}
const validRect=(r:Rect|undefined):r is Rect=>!!r && [r.left,r.top,r.right,r.bottom].every(Number.isFinite) && r.right>r.left && r.bottom>r.top;
function failure(response:any,fallback:string):Error {
  const error=response?.error;return Error(error?.message ? `${fallback}：${error.message}${error.code!=null?` (${error.code})`:''}` : fallback);
}
/** Identity and content availability are separate: embedded pictures may have no readable external file. */
export function selectedPicture(response:unknown):IncomingPicture {
  const v=response as any;if(!v?.success)throw failure(v,'无法读取选中的图片');
  const list=v.result;
  if(!Array.isArray(list))throw Error('系统没有返回有效套索元素，请返回笔记后从套索菜单重新打开 Pic2Note。');
  if(list.length!==1 || list[0]?.type!==200) {
    const types=list.map((el:any)=>el?.type??'?').join(',') || 'none';
    throw Error(`请先用套索只选中一张图片，再打开 Pic2Note。\n系统返回 ${list.length} 个元素，类型：${types}。`);
  }
  const el=list[0];
  if(typeof el.uuid!=='string' || !el.uuid)throw Error('系统未返回图片缓存标识，暂时无法替换该图片。');
  return {path:typeof el.picture?.picturePath==='string'?el.picture.picturePath:'',element:el};
}
export interface PictureSourceAPI {
  exists(path:string):Promise<boolean>;
  measure(path:string):Promise<{width:number;height:number}>;
  previewPath():Promise<string>;
  generatePreview(path:string):Promise<unknown>;
  removeTemporary(path:string):void;
}
/** Ask the host to rasterize exactly the selected picture when its backing file is unavailable. */
export async function prepareSelectedPicture(api:PictureSourceAPI,response:unknown):Promise<PictureSource> {
  const incoming=selectedPicture(response),original=incoming.element;
  let readable:{path:string;width:number;height:number}|undefined;
  if(incoming.path) {
    try {
      const path=imagePath(incoming.path);
      if(await api.exists(path)) {const size=await api.measure(path);validateDimensions(size.width,size.height);readable={path,...size};}
    } catch { /* The host may refer to an embedded/deleted/inaccessible backing image. Use its export API. */ }
  }
  if(readable && validRect(original.picture?.rect))return {...readable,element:original as PictureElement};
  const requested=await api.previewPath();
  let temporaryPath=requested;
  try {
    const generated=await api.generatePreview(requested) as any;
    if(!generated?.success)throw failure(generated,'系统无法导出选中的图片');
    // Use only the file requested in our private directory, never an unrelated returned path.
    const returned=generated.result?.imagePath;
    if(returned && imagePath(returned)!==requested)throw Error('系统导出的图片路径与请求不一致。');
    if(!(await api.exists(requested)))throw Error('系统未生成所选图片的导出文件，请更新系统后重试。');
    const rect=validRect(original.picture?.rect)?original.picture.rect:generated.result?.rect;
    if(!validRect(rect))throw Error('系统未返回有效图片边界，无法安全替换原图片。');
    const angle=Number(generated.result?.rotateDegree || 0);
    if(!readable && (!Number.isFinite(angle) || ((angle%360)+360)%360!==0))throw Error('系统导出的选区带有旋转，暂无法无损回写。请先在笔记中还原图片角度后重试。');
    const size=readable || await api.measure(requested);validateDimensions(size.width,size.height);
    // Preserve the cached uuid/accessors and all host metadata. Supply only missing picture fields.
    const element=validRect(original.picture?.rect) && original.picture?.picturePath ? original as PictureElement : {
      ...original,picture:{...original.picture,picturePath:incoming.path||requested,rect:{...rect}},
    } as PictureElement;
    if(readable) {api.removeTemporary(requested);temporaryPath='';return {...readable,element};}
    temporaryPath='';
    return {path:requested,element,width:size.width,height:size.height,temporaryPath:requested};
  } finally {if(temporaryPath)api.removeTemporary(temporaryPath);}
}
export interface PictureAPI {
  modify(target:Context,element:PictureElement):Promise<unknown>;
  save():Promise<unknown>;
  measure(path:string):Promise<{width:number;height:number}>;
}
/** Host validates cache/existence. Retain uuid/accessors and update only this picture. */
export async function replacePicture(api:PictureAPI,target:Context,original:PictureElement,path:string):Promise<unknown> {
  const size=await api.measure(path),r=original.picture.rect;
  if(!(size.width>0&&size.height>0))throw Error('无法读取图片尺寸，文件可能损坏。');
  const scale=Math.min((r.right-r.left)/size.width,(r.bottom-r.top)/size.height);
  const w=size.width*scale,h=size.height*scale,cx=(r.left+r.right)/2,cy=(r.top+r.bottom)/2;
  // Lasso snapshots can carry pageNum=-1. The SDK validates every element before
  // invoking the host, even though the current-page API also takes a page argument.
  const element={...original,pageNum:target.page,picture:{...original.picture,picturePath:path,rect:{left:cx-w/2,top:cy-h/2,right:cx+w/2,bottom:cy+h/2}}};
  const changed=await api.modify(target,element) as any;
  if(changed?.success===false)return changed;
  if(!changed?.success || !Array.isArray(changed.result) || changed.result.length!==1 ||
    (Number.isInteger(original.numInPage)&&original.numInPage>0&&!changed.result.includes(original.numInPage))) {
    throw Error('未能确认替换结果，请返回笔记检查。');
  }
  const saved=await api.save() as any;
  if(!saved?.success||saved.result!==true)throw Error('图片已替换，但保存未确认，请返回笔记检查并保存。');
  return {success:true,result:true};
}
