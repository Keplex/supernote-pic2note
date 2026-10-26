const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const unitless = new Set(['flex', 'flexGrow', 'flexShrink', 'opacity', 'fontWeight', 'zIndex']);
function flatten(style) {return Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean).map(flatten)) : style || {};}
function css(style) {
  if (typeof style === 'function') {style = style({pressed: false});}
  style = flatten(style);
  const expanded = {...style};
  for (const dimension of ['padding', 'margin']) {
    if (style[dimension + 'Horizontal'] != null) {expanded[dimension + 'Left'] = expanded[dimension + 'Right'] = style[dimension + 'Horizontal'];}
    if (style[dimension + 'Vertical'] != null) {expanded[dimension + 'Top'] = expanded[dimension + 'Bottom'] = style[dimension + 'Vertical'];}
  }
  return Object.entries(expanded).filter(([name]) => !/Horizontal|Vertical|fontVariant|includeFontPadding|shadow|elevation/.test(name)).map(([name, value]) => {
    if (name === 'flex' && value === 1) {return 'flex:1 1 0%';}
    if (name === 'borderColor') {return `border-color:${value};border-style:solid`;}
    if (name === 'borderWidth') {return `border-width:${value}px;border-style:solid`;}
    return name.replace(/[A-Z]/g, s => '-' + s.toLowerCase()) + ':' + (typeof value === 'number' && !unitless.has(name) ? value + 'px' : value);
  }).join(';');
}
const label = value => `[data-label="${value}"]`;
function near(a,b,message,tolerance=.1) {assert.ok(Math.abs(a-b)<=tolerance, `${message}: ${a} vs ${b}`);}
function inside(inner,outer,message) {
  assert.ok(inner.x >= outer.x-.1 && inner.y >= outer.y-.1 &&
    inner.x+inner.width <= outer.x+outer.width+.1 && inner.y+inner.height <= outer.y+outer.height+.1,message);
}
async function wordmark(locator) {
  const words = await locator.locator('[data-type=Text]').evaluateAll(nodes => nodes.map(n => ({text:n.textContent,color:getComputedStyle(n).color})));
  assert.deepEqual(words,[{text:'Pic',color:'rgb(31, 31, 31)'},{text:'2Note',color:'rgb(67, 141, 131)'}],'Two-color Pic2Note wordmark');
}

exports.checkLayouts = async ({mount,press,tapAnchor,contactCrop,unmount,act,flush,setStoredLanguage}) => {
  const {chromium} = require(process.env.LOCALIMAGE_PLAYWRIGHT || 'playwright');
  const browser = await chromium.launch({headless:true,executablePath:process.env.LOCALIMAGE_BROWSER});
  const sample = 'data:image/jpeg;base64,'+fs.readFileSync(path.join(root,'samples/sample-grayscale.jpg')).toString('base64');
  const sharp=require(process.env.LOCALIMAGE_SHARP||'sharp');
  const black='data:image/png;base64,'+(await sharp({create:{width:800,height:600,channels:3,background:'#000'}}).png().toBuffer()).toString('base64');
  const out = path.join(root,'build/layout-qa');
  fs.mkdirSync(out,{recursive:true});
  let verified = 0;
  try {
    for (const language of ['zh','en']) {
      const text = (zh,en) => language === 'zh' ? zh : en;
      setStoredLanguage(language);
      const view = await mount(), headers = new Map();
      try {
        for (const stage of ['home','editor','corner','edge','crop-small','crop-edge','inverted','rotated','mirrored','docked-left','docked-right','compare','about']) {
          if (stage === 'editor') {await press(view,text('选择图片','Choose image'));}
          if (stage === 'corner') {await tapAnchor(view,text('右下角锚点','Bottom-right anchor'));}
          if (stage === 'edge') {await tapAnchor(view,text('上边锚点','Top-edge anchor'));}
          if(stage==='crop-small'||stage==='crop-edge'){
            if(stage==='crop-edge')await act(async()=>{view.root.findAllByType('Pressable').find(b=>b.props.accessibilityLabel===text('撤销','Undo')).props.onLongPress();await flush();});
            const canvas=view.root.findAllByType('View').find(v=>v.props.accessibilityLabel===text('裁剪区域','Crop area'));
            await act(async()=>{canvas.props.onLayout({nativeEvent:{layout:{width:600,height:600}}});await flush();});
            const point=async(x,y)=>act(async()=>{contactCrop(view,{nativeEvent:{locationX:18+x*564,locationY:88.5+y*423}});await flush();});
            if(stage==='crop-small'){await tapAnchor(view,text('右下角锚点','Bottom-right anchor'));await point(.8,.8);await tapAnchor(view,text('左上角锚点','Top-left anchor'));await point(.7,.7);}
            else await point(.96,.96);
          }
          if (stage === 'inverted') {await press(view,text('图片反相','Invert image'));await press(view,text('白底遮线','White masks lines'));}
          if (stage === 'rotated') {await press(view,text('顺时针旋转','Rotate clockwise'));}
          if (stage === 'mirrored') {await press(view,text('水平镜像','Flip H'));await press(view,text('垂直镜像','Flip V'));}
          if (stage === 'docked-left') {await press(view,text('工具移到左侧','Move tools to left'));}
          if (stage === 'docked-right') {await press(view,text('工具移到右侧','Move tools to right'));}
          if (stage === 'compare') {await press(view,text('前后对比','Before / after'));}
          if (stage === 'about') {await press(view,text('关于','About'));}
          for (const [width,height] of [[600,800],[800,600],[702,936],[936,702],[936,1248],[1248,936]]) {
            const name = `${stage}-${language}-${width}x${height}`;
            const page = await browser.newPage({viewport:{width,height}});
            try {
              // Feed actual measured sizes back into the rendered React components until layout settles.
              for (let pass=0;pass<5;pass++) {
                const layouts = [];
                function node(item) {
                  if (typeof item === 'string') {return escape(item);}
                  if (!item || item.type === 'StatusBar') {return '';}
                  if (Array.isArray(item)) {return item.map(node).join('');}
                  const {type,props} = item;
                  let layout='';
                  if (props.onLayout) {layout=` data-layout="${layouts.length}"`;layouts.push(props.onLayout);}
                  const style=css(props.style), description=props.accessibilityLabel?` data-label="${escape(props.accessibilityLabel)}"`:'';
                  if (type === 'Image') {
                    const source=typeof props.source==='string'?'data:image/png;base64,'+fs.readFileSync(props.source).toString('base64'):sample;
                    return `<img${layout}${description} style="${style};object-fit:contain" src="${source}">`;
                  }
                  let children=(item.children||[]).map(node).join('');
                  if (type === 'ScrollView') {children=`<div style="min-height:100%;${css(props.contentContainerStyle)}">${children}</div>`;}
                  return `<div${layout}${description} data-type="${type}" style="${style}${props.numberOfLines===1?';white-space:nowrap;overflow:hidden;text-overflow:ellipsis':''}">${children}</div>`;
                }
                const html='<!doctype html><meta charset="utf-8"><title>Pic2Note 1.0.1 layout QA</title><style>html,body{margin:0;width:100%;height:100%;font-family:Arial,"Microsoft YaHei",sans-serif}body{display:flex}div{position:relative;box-sizing:border-box;border-width:0;display:flex;flex-direction:column;flex-shrink:0;min-width:0}img{display:block;min-width:0}[data-type=Text]{display:block;flex-shrink:1;white-space:pre-wrap}[data-type=ScrollView]{overflow:auto;min-height:0}</style>'+node(view.toJSON());
                await page.setContent(html);
                const sizes=await page.locator('[data-layout]').evaluateAll(nodes=>nodes.map(n=>({id:Number(n.dataset.layout),width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height})));
                await act(async()=>{for(const size of sizes) {layouts[size.id]({nativeEvent:{layout:size}});} await flush();});
              }
              // Save evidence before assertions so a failing size remains inspectable.
              await page.screenshot({path:path.join(out,name+'.png')});
              fs.writeFileSync(path.join(out,name+'.html'),await page.content());
              const metrics=await page.locator(stage==='about'?'[data-type=ScrollView]':label('Editor viewport')).evaluate(n=>({visible:n.clientHeight,content:n.scrollHeight,width:n.clientWidth,contentWidth:n.scrollWidth}));
              if (stage !== 'about') {assert.ok(metrics.content<=metrics.visible+2,`${name}: vertical overflow ${JSON.stringify(metrics)}`);}
              assert.ok(metrics.contentWidth<=metrics.width+2,`${name}: horizontal overflow`);
              const documentWidth=await page.locator('body').evaluate(n=>n.scrollWidth);
              const documentHeight=await page.locator('body').evaluate(n=>n.scrollHeight);assert.ok(documentHeight<=height+2,`${name}: body vertical overflow`);
              assert.ok(documentWidth<=width+2,`${name}: body horizontal overflow`);
              const header=await page.locator(label('Pic2Note header')).evaluate(n=>{
                const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height};};
                return {box:rect(n),brand:rect(n.querySelector('[data-label="Pic2Note centered title"]')),buttons:[...n.querySelectorAll('[data-type=Pressable]')].map(rect)};
              });
              near(header.brand.left+header.brand.width/2,width/2,'Centered header');
              if (stage === 'home') {headers.set(width,header);} else {assert.deepEqual(header,headers.get(width),'Stable header positions and height');}
              await wordmark(page.locator(label('Pic2Note header title')));
              const visibleText=await page.locator('body').innerText();
              assert.ok(!visibleText.includes('图加'),'Retired Chinese product name is absent');
              if (['home','about'].includes(stage)) {
                const banner=page.locator(label('Pic2Note brand banner'));
                await wordmark(banner.locator(label('Pic2Note')));
                assert.ok((await banner.innerText()).includes('Local image insertion plugin for Supernote'),'Brand tagline');
                if(stage==='about') {
                  assert.ok(visibleText.includes('1.0.1'));
                  assert.equal(await page.locator('[data-label^="Quick guide "]').count(),8,'Eight illustrated tool descriptions');
                  assert.equal(await page.locator(label('Choose image examples')).locator('[data-type=Pressable]').count(),0,'Guide samples are not live controls');
                  assert.equal(await page.locator(label('Tone preset examples')).locator('[data-type=Pressable]').count(),0);
                  assert.equal(await page.locator(label('Crop anchor examples')).locator(':scope > div').count(),8,'Guide shows all eight anchors');
                }
              } else {
                const rail=await page.locator(label('Editor tools')).boundingBox();
                const workspace=await page.locator(label('Image workspace')).boundingBox();
                const canvas=await page.locator(label(text('裁剪区域','Crop area'))).boundingBox();
                const preview=await page.locator(label(stage==='compare'?text('原图对比','Original comparison'):text('图片预览','Image preview'))).boundingBox();
                assert.ok([64,120,176].includes(rail.width),'Adaptive toolbar width');
                inside(rail,workspace,'Tool panel is within workspace');inside(canvas,workspace,'Canvas is within workspace');
                near(canvas.y,rail.y,'Aligned panel/canvas top');near(canvas.height,rail.height,'Aligned panel/canvas height');
                const left=stage==='docked-left';
                if(left) {near(canvas.x-(rail.x+rail.width),8,'Separate left panel');} else {near(rail.x-(canvas.x+canvas.width),8,'Separate right panel');}
                near(canvas.width,workspace.width-rail.width-8,'Image gets remaining panel width');
                const fitScale=Math.min((canvas.width-36)/800,(canvas.height-36)/600);
                near(preview.width,800*fitScale,'Inset image width');near(preview.height,600*fitScale,'Inset image height');
                near(preview.x+preview.width/2,canvas.x+canvas.width/2,'Centered inset image x');
                near(preview.y+preview.height/2,canvas.y+canvas.height/2,'Centered inset image y');
                const border=await page.locator(label(text('裁剪区域','Crop area'))).locator('div').evaluateAll(nodes=>{
                  const n=nodes.find(n=>n.style.borderStyle==='dashed');if(!n)return null;const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};
                });
                if(border && ['editor','corner'].includes(stage)) {
                  near(border.x+border.width/2,canvas.x+canvas.width/2,'Crop center within half a physical pixel',.25);
                  near(border.y+border.height/2,canvas.y+canvas.height/2,'Crop center within half a physical pixel',.25);
                }
                const buttons=page.locator(label('Editor tools')).locator('[data-type=Pressable]');
                const tools=await buttons.evaluateAll(nodes=>nodes.map(n=>{
                  const circle=n.firstElementChild.getBoundingClientRect(),image=n.querySelector('img').getBoundingClientRect(),box=n.getBoundingClientRect();
                  return {label:n.dataset.label,x:circle.x,y:circle.y,b:circle.bottom,w:circle.width,h:circle.height,border:n.firstElementChild.style.borderWidth,
                    dx:(image.left+image.right-circle.left-circle.right)/2,dy:(image.top+image.bottom-circle.top-circle.bottom)/2,
                    box:{x:box.x,y:box.y,width:box.width,height:box.height}};
                }));
                assert.equal(tools.length,9,'Eight circular tools plus dock control');
                const circles=tools.slice(0,8);
                for(const tool of circles) {
                  assert.ok(tool.w>=24&&tool.w<=38);near(tool.h,tool.w,'Round tool');assert.equal(tool.border,'1.5px');
                  near(tool.dx,0,'Centered glyph x');near(tool.dy,0,'Centered glyph y');inside(tool.box,rail,'Tool and caption fit the panel');
                }
                const surface=await page.locator(label('Tool floating surface')).evaluate(n=>{
                  const r=n.getBoundingClientRect(),c=getComputedStyle(n);return{box:{x:r.x,y:r.y,width:r.width,height:r.height},color:c.backgroundColor,border:c.borderColor,borderWidth:n.style.borderWidth,position:n.style.position,css:n.getAttribute('style')};});
                inside(surface.box,rail,'Toolbar outline stays inside flexible area');
                assert.equal(surface.color,'rgb(255, 255, 255)');assert.equal(surface.border,'rgb(17, 17, 17)');assert.equal(surface.borderWidth,'1.5px');assert.notEqual(surface.position,'absolute');
                assert.ok(!/shadow|elevation/.test(surface.css),'No toolbar shadow');
                const rows=[...new Set(tools.map(t=>t.box.y))];
                const columns=rail.width===64?1:rail.width===120?2:3;
                assert.equal(rows.length,Math.ceil(9/columns),'Adaptive rows fit all controls');
                if(columns===1){
                  for(let i=1;i<tools.length;i++)assert.ok(tools[i].box.y>=tools[i-1].box.y+tools[i-1].box.height+5,'Spaced portrait controls');
                  assert.ok(tools[0].box.y-surface.box.y>=12,'Top padding');
                  assert.ok(surface.box.y+surface.box.height-tools.at(-1).box.y-tools.at(-1).box.height>=12,'Bottom padding');
                }
                inside(tools[8].box,rail,'Dock button fits panel');
                near(tools[8].dx,0,'Dock glyph x');near(tools[8].dy,0,'Dock glyph y');
                assert.equal(tools[8].label,text(left?'工具移到右侧':'工具移到左侧',left?'Move tools to right':'Move tools to left'));
                if(stage!=='compare'){
                  for(const name of [text('左上角锚点','Top-left anchor'),text('右上角锚点','Top-right anchor'),text('左下角锚点','Bottom-left anchor'),text('右下角锚点','Bottom-right anchor'),text('上边锚点','Top-edge anchor'),text('下边锚点','Bottom-edge anchor'),text('左边锚点','Left-edge anchor'),text('右边锚点','Right-edge anchor')]){
                    const b=await page.locator(label(name)).boundingBox();assert.ok(b);inside(b,canvas,'Complete anchor square stays visible');near(b.width,14,'Anchor width');near(b.height,14,'Anchor height');
                  }
                  assert.equal(await page.locator('[data-type=Pressable][data-label^="'+text('切换到','Switch to')+'"]').count(),0,'No extra corner-switch buttons');
                  assert.equal(await page.locator(label('Crop shade')).count(),1,'One shade group');
                  const shadeStyles=await page.locator(label('Crop shade')).locator(':scope > div').evaluateAll(nodes=>nodes.map(n=>({fill:n.style.backgroundColor,border:n.style.borderWidth,opacity:n.style.opacity})));
                  assert.ok(shadeStyles.length<=4);for(const shade of shadeStyles){assert.equal(shade.fill,'rgba(255, 255, 255, 0.75)');assert.equal(shade.border,'');assert.equal(shade.opacity,'');}
                  assert.equal(await page.locator(label(text('裁剪区域','Crop area'))).locator('img[data-label]').count(),1,'One preview image, no duplicate decode layer');
                }
                const tone=await page.locator(label('Tone controls')).evaluate(n=>[...n.children].map(c=>{const r=c.getBoundingClientRect(),style=getComputedStyle(c);return{x:r.x,y:r.y,width:r.width,height:r.height,border:c.style.borderWidth,color:style.borderColor};}));
                const inline=await page.locator(label('Tone controls')).evaluate(n=>[...n.children].map(c=>{
                  const label=c.firstElementChild.getBoundingClientRect(),step=c.lastElementChild.getBoundingClientRect();return {label:{x:label.x,y:label.y,w:label.width,h:label.height},step:{x:step.x,y:step.y,w:step.width,h:step.height}};}));
                for(const item of inline){assert.ok(item.label.x+item.label.w<=item.step.x+.1,'Label left of stepper');near(item.label.y+item.label.h/2,item.step.y+item.step.h/2,'One-line tone controls');}
                assert.equal(tone.length,4);for(let i=0;i<tone.length;i++) {
                  near(tone[i].y,tone[0].y,'Tone controls in one row');assert.equal(tone[i].border,'1.5px');assert.equal(tone[i].color,'rgb(17, 17, 17)');
                  if(i)assert.ok(tone[i].x>=tone[i-1].x+tone[i-1].width+5,'Tone columns do not overlap');
                }
                const adjustments=page.locator(label('Tone controls')).locator('..');
                const presets=await adjustments.locator(':scope > div').first().boundingBox(), toneBox=await page.locator(label('Tone controls')).boundingBox();
                const fileRow=await page.locator(label('Image file controls')).boundingBox();
                assert.ok(presets.y>=fileRow.y+fileRow.height,'Presets below file controls');
                assert.ok(toneBox.y+toneBox.height<=canvas.y-4,'Presets and tone controls above image');
                assert.ok(presets.y+presets.height<=toneBox.y-5,'Presets above tone controls');
                const compactControls=await page.locator(label('Tone controls')).locator('[data-type=Pressable]').evaluateAll(nodes=>nodes.map(n=>({w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height,r:parseFloat(getComputedStyle(n).borderRadius)})));
                assert.equal(compactControls.length,8);for(const control of compactControls){near(control.w,30,'Capsule +/- width');near(control.h,24,'Capsule +/- height');near(control.r,12,'Capsule radius');}
                const bottom=await page.locator(label('Bottom controls')).boundingBox(),actions=await page.locator(label('Insert actions')).boundingBox();
                near(bottom.y+bottom.height,height,'Bottom controls anchored to lower edge');
                near(actions.y+actions.height,height,'Insertion actions remain fully visible');
                assert.ok(workspace.y+workspace.height<=bottom.y,'Workspace cannot cover bottom controls');
                assert.ok(toneBox.y>=0&&toneBox.y+toneBox.height<=height,'Tone controls are fully visible');
                for(const old of ['停止调节' ,'选择一个角','黑 0.0%','Target:','目标:','下一步：灰阶']) {assert.ok(!visibleText.includes(old));}
              }
              if(['crop-small','crop-edge'].includes(stage)){
                // Use a black fixture and inspect pixels across both horizontal join rows.
                // Hide only the crop outline/handles/button; the actual mask and preview stay.
                const hole=await page.locator(label('Crop shade')).evaluate(n=>{
                  const r=[...n.parentElement.children].find(c=>c.style.borderStyle==='dashed').getBoundingClientRect();
                  const hole={left:r.left,top:r.top,right:r.right,bottom:r.bottom};
                  for(const child of n.parentElement.children)if(child!==n&&child.tagName!=='IMG')child.style.visibility='hidden';return hole;
                });
                await page.locator(label(text('图片预览','Image preview'))).evaluate((n,src)=>n.src=src,black);
                await page.locator(label(text('图片预览','Image preview'))).evaluate(n=>n.decode());
                const {data,info}=await sharp(await page.screenshot()).removeAlpha().raw().toBuffer({resolveWithObject:true});
                const centerX=Math.floor((hole.left+hole.right)/2),centerY=Math.floor((hole.top+hole.bottom)/2);
                assert.ok(data[(centerY*info.width+centerX)*3]<=20,'The selected crop remains unmasked');
                const canvas=await page.locator(label(text('裁剪区域','Crop area'))).boundingBox();let checked=0,regions=0;
                const shown=await page.locator(label(text('图片预览','Image preview'))).boundingBox();
                const frame={left:shown.x,top:shown.y,right:shown.x+shown.width,bottom:shown.y+shown.height};
                const xs=[frame.left,hole.left,hole.right,frame.right],ys=[frame.top,hole.top,hole.bottom,frame.bottom];
                for(let col=0;col<3;col++)for(let row=0;row<3;row++){
                  if(col===1&&row===1||xs[col+1]-xs[col]<4||ys[row+1]-ys[row]<4)continue;
                  const x=Math.floor((xs[col]+xs[col+1])/2),y=Math.floor((ys[row]+ys[row+1])/2),v=data[(y*info.width+x)*3];
                  assert.ok(Math.abs(v-191)<=2,`${name}: region ${col},${row} has ${v}, expected uniform 75% white`);regions++;
                }
                for(const edge of [hole.top,hole.bottom])for(let y=Math.floor(edge)-2;y<=Math.ceil(edge)+2;y++)for(let x=Math.ceil(canvas.x)+2;x<canvas.x+canvas.width-2;x++){
                  if(y<canvas.y||y>=canvas.y+canvas.height||!(x<hole.left-4||x>hole.right+4))continue;
                  assert.ok(data[(y*info.width+x)*3]>=180,`${name}: mask leaked dark pixel at ${x},${y}`);checked++;
                  if(x>frame.left+2&&x<frame.right-2&&y>frame.top+2&&y<frame.bottom-2){
                    const v=data[(y*info.width+x)*3];assert.ok(Math.abs(v-191)<=2,`${name}: nonuniform cut join at ${x},${y}: ${v}`);
                  }
                }
                assert.ok(checked>0&&regions>0,'Exterior regions and mask join rows sampled');console.log('Mask pixels fit:',name,checked,regions);
              }
              console.log('Layout fits:' ,name,JSON.stringify(metrics));
              verified++;
            } finally {await page.close();}
          }
        }
      } finally {await unmount(view);}
    }
    assert.equal(verified,156,'All 1.0.1 desktop layout states');
  } finally {await browser.close();}
};

