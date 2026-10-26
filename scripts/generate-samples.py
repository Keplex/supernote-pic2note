"""Regenerate deterministic visual test fixtures; does not touch the product logos."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import os
root=Path(__file__).resolve().parent.parent
samples=root/'samples'
candidates=[os.environ.get('PIC2NOTE_TEST_FONT',''),'C:/Windows/Fonts/arial.ttf','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']
fontpath=next((p for p in candidates if p and Path(p).is_file()),None)
font=ImageFont.truetype(fontpath,32) if fontpath else ImageFont.load_default()
small=ImageFont.truetype(fontpath,20) if fontpath else ImageFont.load_default()
for transparent in [False,True]:
 image=Image.new('RGBA' if transparent else 'RGB',(800,600),(255,255,255,0) if transparent else 'white')
 d=ImageDraw.Draw(image);d.rectangle((12,12,787,587),outline='black',width=5)
 d.text((40,40),'Pic2Note / SUPERNOTE',font=font,fill='black')
 d.text((40,100),'PNG alpha check' if transparent else 'JPEG grayscale check',font=small,fill='black')
 for i in range(16):
  c=i*17;d.rectangle((40+i*45,170,84+i*45,310),fill=(c,c,c))
 d.ellipse((50,360,210,520),fill='black');d.rectangle((270,360,430,520),outline='black',width=8);d.line((510,510,690,360),fill='black',width=6)
 if transparent:image.save(samples/'sample-transparent.png')
 else:image.save(samples/'sample-grayscale.jpg',quality=94)
