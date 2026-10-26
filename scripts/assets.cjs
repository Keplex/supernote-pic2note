const fs = require('node:fs');
const path = require('node:path');
const sharp = require(process.env.LOCALIMAGE_SHARP || 'sharp');
const folder = path.join(__dirname, '../assets');
const drawings = {
  compare: c => `<defs><clipPath id="frame"><rect x="3" y="5" width="18" height="14" rx="2"/></clipPath></defs><path fill="${c}" stroke="none" clip-path="url(#frame)" d="M12 4h10v16H12z"/><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M9 10l-2 2 2 2"/><path stroke="${c==='black'?'white':'black'}" d="M15 10l2 2-2 2"/>`,
  rotate: c => `<path d="M18 6a8 8 0 1 0 2 8M18 2v5h-5"/>`,
  'mirror-x': c => `<path stroke-width="1.5" stroke-dasharray="2 2" d="M12 3v18"/><path d="M3 17V7l5 10H3zM21 17V7l-5 10h5z"/>`,
  'mirror-y': c => `<path stroke-width="1.5" stroke-dasharray="2 2" d="M3 12h18"/><path d="M7 3h10L7 8V3zM7 21h10l-10-5v5z"/>`,
  mask: c => `<path d="M2 7h20M2 12h20M2 17h20"/><rect x="6" y="4" width="12" height="16" rx="1.5" fill="${c==='black'?'white':'black'}"/><path d="M8 16l3-4 4 4h1"/><circle cx="14" cy="8" r="1" fill="${c}" stroke="none"/>`,
  'dock-left': c => `<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M8 4v16M18 12h-7m3-3l-3 3 3 3"/>`,
  'dock-right': c => `<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M16 4v16M6 12h7m-3-3l3 3-3 3"/>`,
};
(async()=>{for(const [name,draw]of Object.entries(drawings))for(const white of [false,true]){
 if(white && !['compare','mask','rotate'].includes(name))continue;
 let offset='0 0';
 const color=white?'white':'black';let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24"><g transform="translate(${offset})" fill="none" stroke="${color}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${draw(color)}</g></svg>`;
 const raw=await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let left=96,top=96,right=0,bottom=0;for(let y=0;y<96;y++)for(let x=0;x<96;x++)if(raw.data[(y*96+x)*4+3]){left=Math.min(left,x);right=Math.max(right,x+1);top=Math.min(top,y);bottom=Math.max(bottom,y+1);}
 offset=`${(96-left-right)/8} ${(96-top-bottom)/8}`;svg=svg.replace('translate(0 0)',`translate(${offset})`);
 const stem=name+(white?'-white':'');fs.writeFileSync(path.join(folder,stem+'.svg'),svg);await sharp(Buffer.from(svg)).png().toFile(path.join(folder,stem+'.png'));
}})().catch(e=>{console.error(e);process.exitCode=1});
