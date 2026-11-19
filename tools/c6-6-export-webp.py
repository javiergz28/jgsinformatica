"""Lossy WebP packaging of verified C6.6 Cycles RGBA frames.
Run on Mac: python3 tools/c6-6-export-webp.py --input /tmp/jg-C6-6-render-96-final
Only files with matching PNG dimensions and a complete 000..095 sequence are accepted.
"""
from PIL import Image
from pathlib import Path
import argparse,hashlib,json,os,time,sys
repo=Path(__file__).resolve().parents[1]
source_sha='1169b695582b76c08c5f4f43020f8b188fad3d14ad2d1c00887f494a85c04ce7'
p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--quality',type=int,default=86)
args=p.parse_args()
root=Path(args.input)
target=repo/'assets'/'boot'/'c6-6';target.mkdir(parents=True,exist_ok=True)
expected=[root/f'core01-{i:03d}.png' for i in range(96)]
assert all(f.is_file() for f in expected),f'missing {[str(f) for f in expected if not f.is_file()][:6]}'
# Resume a deterministic interrupted export, without overwriting already checked frames.
frames=[];size_total=0
for i,png in enumerate(expected):
 im=Image.open(png).convert('RGBA')
 assert im.size==(960,960),(png,im.size)
 alpha=im.getchannel('A').histogram()[0]
 out=target/f'core01-{i:03d}.webp'
 if not out.exists(): im.save(out,format='WEBP',quality=args.quality,method=6,exact=True)
 b=out.read_bytes();chk=Image.open(out)
 mode='RGB' if im.getchannel('A').getextrema()==(255,255) else 'RGBA'
 assert chk.size==im.size and chk.mode==mode,(out,chk.mode,mode,chk.size)
 frames.append({'index':i,'file':out.name,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'alpha_zero_count':alpha})
 size_total+=len(b)
 if i%12==0:print('C6_6_WEBP_PROGRESS',i,round(size_total/1024,1),'KiB',flush=True)
manifest={'checkpoint':'CP-003.3-C6.6 / DEV-007 — PROTOTYPE, not final BOOT',
 'source_scene_sha256':source_sha,'source_scene':'CORE-01-BOOT.blend',
 'reference':'CORE-01 canonical C6.5 (secondary button absent)',
 'render_engine':'CYCLES','samples':12,'film_transparent':True,
 'frames_total':96,'width':960,'height':960,
 'camera_type':'independent non-animated probe camera; original rig preserved',
 'camera_script':'tools/c6-6-cinematic-prototype.py',
 'format':'image/webp','webp_quality':args.quality,'total_webp_bytes':size_total,
 'scroll_technique':'standalone real 96-frame Cycles Canvas scrub; not default main BOOT',
 'frames':frames}
(target/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('C6_6_WEBP_COMPLETE',len(frames),'BYTES',size_total,'MAX',max(f['bytes'] for f in frames),'ALPHA_0',frames[0]['alpha_zero_count'],'ALPHA_95',frames[-1]['alpha_zero_count'])
