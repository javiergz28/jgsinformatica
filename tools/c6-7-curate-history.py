"""Curate CORE-01 branding evolution while preserving master/reference/provenance.
Default: dry-run, create two chronological contact sheets; --apply deletes only explicitly
classified disposable review images and exact duplicate review MP4s.
"""
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw,ImageFont
import argparse,hashlib,json,datetime
PROJECT=Path('/Users/javiergutierrez/Documents/Creaciones IA/JG Soluciones Informáticas/2026-11-16 - JG Next Gen - CORE-01 BOOT')
MASTER=PROJECT/'03_Proyecto/CORE-01-BOOT.blend'
MASTER_SHA='1169b695582b76c08c5f4f43020f8b188fad3d14ad2d1c00887f494a85c04ce7'
QA=PROJECT/'04_Revisiones/hardware-lookdev-QA'
DELIVERY=PROJECT/'01_Entregas'
KEEP={
 'CORE-01-CP0033-A2-BOOT-00-50-100-contact-sheet-Cycles.png',
 'CORE-01-CP0033-A2-MASTER-Cycles-16x9.png',
 'CORE-01-CP0033-B2-AIO-BEFORE-AFTER-real-Cycles.png',
 'CORE-01-CP0033-C2-ANTES-DESPUES-real-Cycles.png',
 'CORE-01-CP0033-C3-F-comparacion-ventiladores-blancos-vs-detallados.png',
 'CORE-01-CP0033-C4-ANTES-DESPUES-reflejo-AIO-Cycles.png',
 'CORE-01-CP0033-C5-ANTES-DESPUES-limpieza-hardware-Cycles.png',
 'CORE-01-CP0033-GPU-before-after-real-Cycles.png',
 'CORE-01-C6-HERO-ANTES-DESPUES-real-Cycles.png',
 'CORE-01-C6-AIO-ANTES-DESPUES-macro-Cycles.png',
 'CORE-01-C6-1-ANTES-DESPUES-laminas-blancas-Cycles.png',
 'CORE-01-C6-2-IO-comparacion-macro-Cycles.png',
 'CORE-01-C6-3-DEV-003-scroll-desktop-contact-sheet.jpg',
 'CORE-01-C6-3-transparent-glass-approach-test.png',
 'CORE-01-C6-4-RAM-CYAN-LED-ANTES-DESPUES-QA.jpg',
 'CORE-01-C6-4-AIO-RAM-ANTES-DESPUES-QA.jpg',
 'CORE-01-C6-4-cinematic-RAM-LED-wide-powered-900-Cycles-RGBA.png',
 'CORE-01-C6-5-BOTON-CIAN-Y-CHASIS-ANTES-DESPUES-Cycles.png',
}
DUPS=[
 ('04_Revisiones/hardware-lookdev-QA/CORE-01-C6.6-animatic-Cycles-960-20fps-idavuelta.mp4','01_Entregas/jg-next-gen-core01-c6-6-animatic-ida-vuelta-v01.mp4'),
 ('04_Revisiones/boot-v02/boot-ida-vuelta.mp4','01_Entregas/jg-next-gen-boot-v02-recorrido-de-ida-y-vuelta-v01.mp4'),
 ('04_Revisiones/boot-v02/before-after-desktop.png','01_Entregas/jg-next-gen-boot-opcion-c-registro-visual-antes-y-despues-del-encuadre-v01.png'),
 ('04_Revisiones/boot-opcion-c-revision.html','01_Entregas/jg-next-gen-boot-opcion-c-revision-de-tres-encuadres-pendiente-de-aprobacion-v01.html'),
 ('04_Revisiones/boot-v02/boot-opcion-c-comparativa-v02.html','01_Entregas/jg-next-gen-boot-opcion-c-comparacion-del-encuadre-al-50-por-ciento-v01.html'),
]
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for buf in iter(lambda:f.read(1<<20),b''):h.update(buf)
 return h.hexdigest()
def stage(fn):
 s=fn.upper()
 for i,k in enumerate(['CP0033-A2','CP0033-B2','CP0033-C2','CP0033-C3','CP0033-C4','CP0033-C5','CP0033-GPU','C6-HERO','C6-AIO','C6-1','C6-2','C6-3','C6-4','C6-5','C6.6']):
  if k in s:return i
 return 20
def make_sheet(files,out,label):
 columns=5;tile_w=360;tile_h=265
 rows=(len(files)+columns-1)//columns
 sheet=Image.new('RGB',(columns*tile_w,rows*tile_h+70),'#080f1b')
 draw=ImageDraw.Draw(sheet)
 try:font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',15)
 except:font=ImageFont.load_default()
 draw.text((28,15),label,fill='#eaf7fb',font=font)
 for i,p in enumerate(files):
  with Image.open(p) as opened:im=opened.convert('RGBA')
  bg=Image.new('RGBA',im.size,(10,18,30,255));bg.alpha_composite(im)
  thumb=ImageOps.contain(bg.convert('RGB'),(tile_w-15,tile_h-65))
  x=(i%columns)*tile_w; y=(i//columns)*tile_h+70
  sheet.paste(thumb,(x+(tile_w-thumb.width)//2,y+(tile_h-65-thumb.height)//2))
  a=p.stem
  draw.text((x+9,y+tile_h-54),f'{i+1:02d}  '+a[:43],font=font,fill='#bfdbdf')
  draw.text((x+9,y+tile_h-35),a[43:87],font=font,fill='#779ba9')
 if not out.exists():sheet.save(out,'JPEG',quality=88,optimize=True)
 assert out.stat().st_size>10000
 return out
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--apply',action='store_true')
 opt=parser.parse_args()
 assert PROJECT.is_dir() and QA.is_dir() and DELIVERY.is_dir()
 assert sha(MASTER)==MASTER_SHA,'Master changed, halt'
 files=sorted((x for x in QA.iterdir() if x.is_file()),key=lambda p:(stage(p.name),p.name))
 expected_media=[p for p in files if p.suffix.lower() in {'.png','.jpg','.jpeg'}]
 assert len(expected_media)>=60,'QA inventory changed; inspect first'
 names={p.name for p in expected_media}
 assert KEEP.issubset(names),('Missing selected originals',KEEP-names)
 deletions=[p for p in expected_media if p.name not in KEEP]
 assert all(p.name.startswith(('CORE-01-','AIO-','GPU-','candidate-','current-','fan-','fans-')) for p in deletions)
 for dup,primary in DUPS:
  src,dst=PROJECT/dup,PROJECT/primary
  assert src.is_file() and dst.is_file() and sha(src)==sha(dst),dup
  assert not src.is_symlink()
 full=[(p,sha(p),p.stat().st_size) for p in files if p.suffix.lower() in {'.png','.jpg','.jpeg'}]
 half=(len(expected_media)+1)//2
 sheet1=make_sheet(expected_media[:half],DELIVERY/'jg-nextgen-evolucion-branding-01-de-02.jpg','JG NEXT GEN / EVOLUCION DE BRANDING — PRIMERA PARTE')
 sheet2=make_sheet(expected_media[half:],DELIVERY/'jg-nextgen-evolucion-branding-02-de-02.jpg','JG NEXT GEN / EVOLUCION DE BRANDING — SEGUNDA PARTE')
 candidates=deletions+[PROJECT/x for x,_ in DUPS]
 candidates=sorted(candidates,key=lambda x:str(x))
 report={'source_sha256':MASTER_SHA,'version':'C6.7','created_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'status':'APPLIED' if opt.apply else 'DRY_RUN','pre_cleanup_media_count':len(expected_media),
 'retained_full_resolution':sorted(KEEP),'thumbnail_contact_sheets':[str(sheet1.relative_to(PROJECT)),str(sheet2.relative_to(PROJECT))],
 'duplicates_checked':[list(pair) for pair in DUPS],
 'deletions':[{'path':str(p.relative_to(PROJECT)),'size_bytes':p.stat().st_size,'sha256':sha(p)} for p in candidates],
 'deleted_bytes':sum(p.stat().st_size for p in candidates),
 'preserved_source_files':['03_Proyecto/CORE-01-BOOT.blend','02_Material/referencia-atx-cc0/atx-motherboard.glb','02_Material/referencia-gpu-cc0/graphics-card-with-fans.glb']}
 manifest=DELIVERY/'jg-nextgen-archivo-evolucion-C6-7-manifest.json'
 if opt.apply:
  assert not manifest.exists(),'manifest exists; do not repeat destructive cleanup'
  for file in candidates:file.unlink()
  assert sha(MASTER)==MASTER_SHA
  assert len([p for p in QA.iterdir() if p.suffix.lower() in {'.png','.jpg','.jpeg'}])==len(KEEP)
  manifest.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 else:
  Path('/tmp/jg-C6-7-cleanup-dryrun.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print('C6_7_CLEANUP',report['status'],'QA_FILES',len(expected_media),'RETAINED_HIRES',len(KEEP),
 'REMOVE_FILES',len(candidates),'FREE_BYTES',report['deleted_bytes'],'SHEETS',[str(sheet1),str(sheet2)])
if __name__=='__main__':main()
