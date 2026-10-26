import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ImageController, READ, WRITE, fileUri, imagePath, validateDimensions} from '../src/core.ts';

const ok = (result: unknown) => ({success: true, result, error: null});
function fixture() {
  const calls: string[] = [];
  const state = {file: '/storage/emulated/0/Note/测试.note', page: 2,
    paths: ['/storage/emulated/0/MyStyle/中文 #图.JPG'] as string[] | null,
    granted: 1, choice: 1, exists: true, width: 1200, height: 1600};
  const deps = {
    async hasPermission(p: string) {calls.push('check:' + p); return state.granted;},
    async requestPermission(p: string) {calls.push('request:' + p); return state.choice;},
    async currentFile() {return ok(state.file);},
    async currentPage() {return ok(state.page);},
    async selectFile(params: object) {
      calls.push('pick'); assert.equal((params as {selectType: number}).selectType, 1);
      return state.paths;
    },
    async exists(_p: string) {return state.exists;},
    async measure(_uri: string) {return {width: state.width, height: state.height};},
    async insert(_p: string): Promise<unknown> {calls.push('insert'); return ok(true);},
    async returnToNote(): Promise<boolean> {calls.push('close'); return true;},
    async save(): Promise<unknown> {calls.push('save'); return ok(true);},
  };
  return {state, calls, deps, controller: new ImageController(deps)};
}

test('successful insertion hands off without saving or rebuilding selection', async () => {
  const f = fixture();
  const image = await f.controller.pick();
  assert.equal(image?.path, f.state.paths?.[0]);
  assert.equal(image?.target.page, 2);
  assert.match(image!.uri, /%23/);
  assert.deepEqual(await f.controller.insert(), {inserted: true, returned: true});
  assert.equal(f.controller.canInsert, false);
  assert.ok(f.calls.indexOf('check:' + WRITE) < f.calls.indexOf('insert'));
  assert.ok(f.calls.indexOf('insert') < f.calls.indexOf('close'));
  assert.ok(!f.calls.includes('save'));
  assert.equal(f.calls.filter(c => c === 'insert').length, 1);
  await assert.rejects(f.controller.insert(), /重复提交/);
});

test('cancelling picker does not mutate note and preserves an existing preview', async () => {
  const f = fixture();
  f.state.paths = null;
  assert.equal(await f.controller.pick(), null);
  assert.equal(f.controller.canInsert, false);
  f.state.paths = ['/storage/emulated/0/MyStyle/a.png'];
  const previous = await f.controller.pick();
  f.state.paths = [];
  assert.equal(await f.controller.pick(), null);
  assert.equal(f.controller.selection, previous);
  assert.ok(!f.calls.includes('insert'));
});

for (const choice of [-1, 0]) {
  test(`permission choice ${choice} stops before reading and inserting`, async () => {
    const f = fixture(); f.state.granted = 0; f.state.choice = choice;
    await assert.rejects(f.controller.pick(), /授权|权限/);
    assert.ok(!f.calls.includes('pick'));
    assert.ok(!f.calls.includes('insert'));
  });
}

for (const choice of [1, 2]) {
  test(`permission choice ${choice} is accepted and rechecked after picker and before mutation`, async () => {
    const f = fixture(); f.state.granted = 0; f.state.choice = choice;
    await f.controller.pick(); await f.controller.insert();
    assert.equal(f.calls.filter(c => c === 'request:' + READ).length, 3);
    assert.equal(f.calls.filter(c => c === 'request:' + WRITE).length, 1);
  });
}

test('revoked write permission prevents insertion but allows retry after grant', async () => {
  const f = fixture(); await f.controller.pick();
  f.deps.hasPermission = async name => name === WRITE ? 0 : 1;
  f.state.choice = 0;
  await assert.rejects(f.controller.insert(), /写入权限/);
  assert.equal(f.controller.canInsert, true);
  assert.ok(!f.calls.includes('insert'));
  f.state.choice = 2;
  assert.equal((await f.controller.insert()).inserted, true);
});

test('reject unsupported extensions and non-file URIs', () => {
  for (const path of ['/a.webp', '/a.gif', '/a.svg', '/a.png.exe', 'content://file/a.jpg', 'https://a/b.jpg']) {
    assert.throws(() => imagePath(path));
  }
  assert.equal(imagePath('/中文 文件.JPEG'), '/中文 文件.JPEG');
  assert.equal(imagePath('file:///folder/a%20b.png'), '/folder/a b.png');
  assert.equal(fileUri('/a b/#100%.png'), 'file:///a%20b/%23100%25.png');
});

test('bad dimensions and oversized images cannot be inserted', async () => {
  for (const size of [[0, 2], [NaN, 10], [Infinity, 1], [9000, 100], [5000, 5000]]) {
    assert.throws(() => validateDimensions(...size as [number, number]));
  }
  const f = fixture(); f.state.width = 9000;
  await assert.rejects(f.controller.pick(), /尺寸过大/);
  assert.equal(f.controller.canInsert, false);
});

test('corrupt image decode blocks insertion', async () => {
  const f = fixture(); f.deps.measure = async () => {throw new Error('decode');};
  await assert.rejects(f.controller.pick(), /解码/);
  assert.equal(f.controller.canInsert, false);
});

test('missing image and image deleted after preview are rejected', async () => {
  const f = fixture(); f.state.exists = false;
  await assert.rejects(f.controller.pick(), /不存在/);
  f.state.exists = true; await f.controller.pick(); f.state.exists = false;
  await assert.rejects(f.controller.insert(), /已移动/);
  assert.ok(!f.calls.includes('insert'));
});

test('PDF context is rejected before the picker', async () => {
  const f = fixture(); f.state.file = '/Document/test.pdf';
  await assert.rejects(f.controller.pick(), /笔记工具栏/);
  assert.ok(!f.calls.includes('pick'));
});

for (const change of ['file', 'page']) {
  test(`changing ${change} after preview stops mutation`, async () => {
    const f = fixture(); await f.controller.pick();
    if (change === 'file') {f.state.file = '/Note/other.note';} else {f.state.page++;}
    await assert.rejects(f.controller.insert(), /页码已变化/);
    assert.ok(!f.calls.includes('insert'));
  });
}

test('invalid current page response blocks mutation', async () => {
  const f = fixture(); f.state.page = -1;
  await assert.rejects(f.controller.pick(), /当前页/);
});

test('known native failure preserves error code, does not save, and permits explicit retry', async () => {
  const f = fixture(); await f.controller.pick();
  f.deps.insert = async () => ({success: false, error: {code: 1217, message: 'locked'}});
  await assert.rejects(f.controller.insert(), /1217/);
  assert.equal(f.controller.canInsert, true);
  assert.ok(!f.calls.includes('save'));
});

test('success true with result false is not a successful insertion', async () => {
  const f = fixture(); await f.controller.pick(); f.deps.insert = async () => ok(false);
  await assert.rejects(f.controller.insert(), /图片未插入/);
  assert.ok(!f.calls.includes('save'));
});

for (const mode of ['reject', 'null', 'malformed']) {
  test(`ambiguous insert ${mode} blocks duplicate submission`, async () => {
    const f = fixture(); await f.controller.pick();
    f.deps.insert = async () => {
      f.calls.push('insert');
      if (mode === 'reject') {throw new Error('connection lost');}
      return mode === 'null' ? null : {success: true};
    };
    await assert.rejects(f.controller.insert(), /返回笔记检查/);
    await assert.rejects(f.controller.insert(), /重复提交/);
    assert.equal(f.calls.filter(c => c === 'insert').length, 1);
    assert.ok(!f.calls.includes('save'));
  });
}

for (const mode of ['false', 'reject']) {
  test(`return ${mode} reports successful insertion and prevents duplicate`, async () => {
    const f = fixture(); await f.controller.pick();
    f.deps.returnToNote = async () => {
      f.calls.push('close');
      if (mode === 'reject') {throw new Error('close failed');}
      return false;
    };
    const result = await f.controller.insert();
    assert.equal(result.inserted, true); assert.equal(result.returned, false);
    assert.match(result.warning!, /图片已插入/);
    await assert.rejects(f.controller.insert(), /重复提交/);
    assert.equal(f.calls.filter(c => c === 'insert').length, 1);
    assert.equal(f.calls.filter(c => c === 'close').length, 1);
    assert.ok(!f.calls.includes('save'));
  });
}

test('return begins before a pending insertion resolves', async () => {
  const f = fixture(); await f.controller.pick();
  let release!: (value: unknown) => void;
  const pending = new Promise<unknown>(resolve => {release = resolve;});
  f.deps.insert = () => {f.calls.push('insert'); return pending;};
  const result = f.controller.insert();
  for (let i = 0; i < 30; i++) {await Promise.resolve();}
  assert.deepEqual(f.calls.filter(c => ['insert', 'close', 'save'].includes(c)), ['insert', 'close']);
  release(ok(true));
  assert.deepEqual(await result, {inserted: true, returned: true});
});

test('an insertion rejected after handoff remains consumed and is never retried', async () => {
  const f = fixture(); await f.controller.pick();
  let reject!: (error: Error) => void;
  f.deps.insert = () => {f.calls.push('insert'); return new Promise((_, fail) => {reject = fail;});};
  const result = f.controller.insert();
  for (let i = 0; i < 30; i++) {await Promise.resolve();}
  assert.ok(f.calls.includes('close'));
  reject(new Error('bridge lost'));
  await assert.rejects(result, /返回笔记检查/);
  await assert.rejects(f.controller.insert(), /重复提交/);
  assert.equal(f.calls.filter(c => c === 'insert').length, 1);
});

test('concurrent taps cannot insert twice or launch picker during mutation', async () => {
  const f = fixture(); await f.controller.pick();
  let release!: () => void;
  const waiting = new Promise<void>(resolve => {release = resolve;});
  f.deps.insert = async () => {f.calls.push('insert'); await waiting; return ok(true);};
  const first = f.controller.insert();
  await assert.rejects(f.controller.insert(), /进行中/);
  await assert.rejects(f.controller.pick(), /进行中/);
  release(); await first;
  assert.equal(f.calls.filter(c => c === 'insert').length, 1);
});

test('selecting another image explicitly allows another insertion', async () => {
  const f = fixture(); await f.controller.pick(); await f.controller.insert();
  f.state.paths = ['/storage/emulated/0/MyStyle/next.jpeg'];
  await f.controller.pick(); await f.controller.insert();
  assert.equal(f.calls.filter(c => c === 'insert').length, 2);
});

test('editor exports after permission and inserts the generated PNG rather than the source', async () => {
  const f = fixture(); await f.controller.pick();
  let inserted = '';
  f.deps.insert = async path => {inserted = path; return ok(true);};
  await f.controller.insert(async selection => {
    assert.equal(selection.path, f.state.paths![0]);
    assert.ok(f.calls.includes('check:' + WRITE));
    return '/storage/emulated/0/MyStyle/LocalImage/adjusted.png';
  });
  assert.equal(inserted, '/storage/emulated/0/MyStyle/LocalImage/adjusted.png');
});
test('failed export never falls back to inserting the original and can be retried', async () => {
  const f = fixture(); await f.controller.pick();
  await assert.rejects(f.controller.insert(async () => {throw new Error('disk full');}), /disk full/);
  assert.equal(f.controller.canInsert, true); assert.ok(!f.calls.includes('insert'));
});
test('note context is checked after slow image processing before insertion', async () => {
  const f = fixture(); await f.controller.pick();
  await assert.rejects(f.controller.insert(async () => {
    f.state.page++; return '/storage/emulated/0/MyStyle/LocalImage/adjusted.png';
  }), /页码已变化/);
  assert.ok(!f.calls.includes('insert'));
});
test('denying write permission stops export before any file is created', async () => {
  const f = fixture(); await f.controller.pick();
  f.deps.hasPermission = async name => name === WRITE ? 0 : 1;
  f.state.choice = 0;
  let called = false;
  await assert.rejects(f.controller.insert(async () => {called = true; return '/adjusted.png';}));
  assert.equal(called, false);
});

test('latest scan requests read permission with folder guidance before scanning',async()=>{
 const f=fixture();f.state.granted=0;let scans=0,description='';
 const deps={...f.deps,requestPermission:async(permission:string,text:string)=>{assert.equal(permission,READ);description=text;f.state.granted=1;return 2;},latest:async()=>{scans++;return '/storage/emulated/0/INBOX/new.png';}};
 const c=new ImageController(deps);await c.pick('latest');assert.match(description,/INBOX/);assert.match(description,/SCREENSHOT/);assert.equal(scans,1);
});
test('denied latest permission shows settings guidance without touching directories',async()=>{
 const f=fixture();f.state.granted=0;f.state.choice=0;let scans=0;
 const c=new ImageController({...f.deps,latest:async()=>{scans++;return '/storage/emulated/0/INBOX/new.png';}});
 await assert.rejects(c.pick('latest'),/设置.*插件/);assert.equal(scans,0);
});


test('selected-picture adapter dimensions are reused and temporary source lives until writeback',async()=>{
 const f=fixture(),released:any[]=[],element={uuid:'selected',type:200,numInPage:7,picture:{picturePath:'embedded.png',rect:{left:0,top:0,right:100,bottom:100}}};
 let exists=0,measures=0,modified=0;
 const c=new ImageController({...f.deps,exists:async()=>{exists++;return true;},measure:async()=>{measures++;return {width:1,height:1};},
  selectedPicture:async()=>({path:'/private/lasso-source.png',element,width:800,height:600,temporaryPath:'/private/lasso-source.png'}),
  releasePicture:(el,path)=>released.push([el.uuid,path]),replacePicture:async()=>{modified++;assert.equal(released.length,0);return ok(true);}});
 const selected=await c.pick('selected');assert.equal(selected?.width,800);assert.equal(exists,0);assert.equal(measures,0);assert.deepEqual(released,[]);
 await c.insert(async()=>'/edited.png');assert.equal(modified,1);assert.deepEqual(released,[['selected','/private/lasso-source.png']]);c.dispose();assert.equal(released.length,1);
});
test('selected-picture cancellation releases only its own cache and temporary source once',async()=>{
 const f=fixture(),released:any[]=[],element={uuid:'selected',type:200,numInPage:7,picture:{picturePath:'embedded.png',rect:{left:0,top:0,right:100,bottom:100}}};
 const c=new ImageController({...f.deps,selectedPicture:async()=>({path:'/private/lasso-source.png',element,width:800,height:600,temporaryPath:'/private/lasso-source.png'}),releasePicture:(el,path)=>released.push([el.uuid,path])});
 await c.pick('selected');c.dispose();c.dispose();assert.deepEqual(released,[['selected','/private/lasso-source.png']]);assert.ok(!f.calls.includes('insert'));
});

test('replacement saves, closes and releases without selection recovery or duplicate mutation',async()=>{
 const f=fixture(),events:string[]=[],element={uuid:'selected',type:200,numInPage:7,picture:{picturePath:'/source.png',rect:{left:0,top:0,right:100,bottom:100}}};
 const c=new ImageController({...f.deps,selectedPicture:async()=>({path:'/source.png',element,width:100,height:100}),
   replacePicture:async()=>{events.push('replace+save');return ok(true);},returnToNote:async()=>{events.push('close');return true;},
   releasePicture:()=>events.push('release')});
 await c.pick('selected');const result=await c.insert(async()=>'/edited.png');assert.deepEqual(events,['replace+save','close','release']);
 assert.deepEqual(result,{inserted:true,returned:true});assert.equal(c.canInsert,false);await assert.rejects(c.insert());
});
