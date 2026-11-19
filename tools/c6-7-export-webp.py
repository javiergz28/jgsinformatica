"""Pack 160 verified C6.7 Cycles PNGs as optimized WebP in a reproducible manifest.
Reads /tmp render output and writes only assets/boot/c6-7; never modifies Blender.
"""
from PIL import Image
from pathlib import Path
import argparse,hashlib,json,datetime
repo=Path(__file__).resolve().parents[1]
EXPECTED_SHA='1169b695582b76c08c5f4f43020f8b188fad3d14ad2d1c00887f494a85c04ce7'
parser=argparse.ArgumentParser()
parser.add_argument('--input',default='/tmp/jg-C6-7-render-160-final')
parser.add_argument('--quality',type=int,default=83)
args=parser.parse_args()
assert 75<=args.quality<=90
src=Path(args.input)
dest=repo/'assets/boot/c6-7'
dest.mkdir(parents=True,exist_ok=True)
files=[src/f'core01-{i:03d}.png' for i in range(160)]
assert all(p.is_file() for p in files),('missing', [p.name for p in files if not p.is_file()][:10])
frames=[];total_bytes=0
for i,png in enumerate(files):
 with Image.open(png) as opened:
  assert opened.size==(1080,1080)
  image=opened.convert('RGBA')
  alpha_zero=image.getchannel('A').histogram()[0]
  out=dest/f'core01-{i:03d}.webp'
  if not out.exists():image.save(out,'WEBP',quality=args.quality,method=6,exact=True)
  data=out.read_bytes()
  verify=Image.open(out)
  expected_mode='RGB' if image.getchannel('A').getextrema()==(255,255) else 'RGBA'
  assert verify.size==(1080,1080) and verify.mode==expected_mode,(i,verify.mode,expected_mode)
  assert len(data)>1000 and data[:4]==b'RIFF' and data[8:12]==b'WEBP'
  total_bytes+=len(data)
  frames.append({'index':i,'file':out.name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'alpha_zero_count':alpha_zero})
  if i%20==0:print('C6_7_WEBP_PROGRESS',i,'bytes',total_bytes,flush=True)
assert frames[0]['alpha_zero_count']>500000
assert total_bytes<15_000_000,total_bytes
manifest={'checkpoint':'CP-003.3-C6.7 / DEV-008 — high-density visual preview',
 'status':'experimental, not approved main BOOT',
 'source_scene':'CORE-01-BOOT.blend','source_scene_sha256':EXPECTED_SHA,
 'render':'Blender 5.3 Cycles, 10 samples, denoise, physical camera with C6.7 LEDs',
 'render_script':'tools/c6-7-cinematic-prototype.py','film_transparent':True,
 'frames_total':160,'width':1080,'height':1080,'format':'image/webp','webp_quality':args.quality,
 'total_webp_bytes':total_bytes,'frames':frames}
(dest/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('C6_7_WEBP_COMPLETE',len(frames),total_bytes,'max',max(x['bytes'] for x in frames),flush=True)
