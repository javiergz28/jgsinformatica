"""C6.9-B/G1.1: tighter cinematic Bezier for Section 01, external PC only.

Blender master is READ ONLY; temporary camera is never persisted.
Run a cheap gate with --count 25 --shots 0,6,12,18,24 before rendering all 25.
"""
import argparse
import hashlib
import json
import pathlib
import sys
import bpy
from mathutils import Vector

MASTER_SHA = '1169b695582b76c08c5f4f43020f8b188fad3d14ad2d1c00887f494a85c04ce7'
# Intent: 7–10% closer at opening, still entirely outside CORE-01.
# Later part moves sideways, then settles back into an assembled-PC pose.
EYES = (
    (.87, -1.055, .95),
    (1.015, -.965, .935),
    (.755, -.998, .815),
    (.66, -.895, .765),
)
LOOKS = (
    (.038, -.016, .29),
    (.044, -.032, .305),
    (.058, -.054, .325),
    (.07, -.07, .275),
)
LENSES = (63., 62., 59., 55.)

def bezier(control, u):
    v = 1 - u
    return control[0]*v*v*v + 3*control[1]*v*v*u + 3*control[2]*v*u*u + control[3]*u*u*u

def ease(u):
    # C1 continuous at endpoints and reversible; actual scroll controls u.
    return u*u*(3 - 2*u)

def render(argv):
    p=argparse.ArgumentParser()
    p.add_argument('--output',required=True)
    p.add_argument('--shots',default='0,6,12,18,24')
    p.add_argument('--count',type=int,default=25)
    p.add_argument('--size',type=int,default=700)
    p.add_argument('--samples',type=int,default=8)
    a=p.parse_args(argv)
    assert a.count in (25,33) and a.size in (700,768) and 6 <= a.samples <= 16
    src=pathlib.Path(bpy.data.filepath)
    assert src.name=='CORE-01-BOOT.blend' and src.parent.name=='03_Proyecto'
    sha=hashlib.sha256(src.read_bytes()).hexdigest()
    if sha!=MASTER_SHA: raise ValueError('canonical Blender SHA changed: '+sha)
    indices=sorted({int(s.strip()) for s in a.shots.split(',') if s.strip()})
    assert indices and all(0<=i<a.count for i in indices)
    out=pathlib.Path(a.output);out.mkdir(parents=True,exist_ok=True)
    scene=bpy.context.scene
    assert scene.camera is not None
    camera=bpy.data.objects.new('C6.9-B | temporary Bézier camera / NOT SAVED',scene.camera.data.copy())
    scene.collection.objects.link(camera);camera.animation_data_clear();scene.camera=camera
    scene.render.engine='CYCLES';scene.cycles.samples=a.samples
    scene.cycles.use_denoising=True
    scene.render.resolution_x=a.size;scene.render.resolution_y=a.size
    scene.render.resolution_percentage=100;scene.render.film_transparent=True
    scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
    scene.render.image_settings.color_depth='8'
    ground=bpy.data.objects.get('STUDIO ONLY | ground')
    if ground:ground.hide_render=True
    record={'stage':'C6.9-B-G1.1','master_sha256':sha,'eyes':EYES,'looks':LOOKS,
            'lenses':LENSES,'count':a.count,'samples':a.samples,'size':a.size,'frames':[]}
    for i in indices:
        t=i/(a.count-1);u=ease(t)
        eye=Vector([bezier([c[k] for c in EYES],u) for k in range(3)])
        aim=Vector([bezier([c[k] for c in LOOKS],u) for k in range(3)])
        camera.location=eye;camera.rotation_euler=(aim-eye).to_track_quat('-Z','Y').to_euler()
        camera.data.lens=bezier(LENSES,u)
        scene.frame_set(1+round(94*u))
        target=out/f'c6-9-b-{i:02}.png'
        if target.exists():raise FileExistsError('Refusing overwrite: '+str(target))
        scene.render.filepath=str(target);bpy.ops.render.render(write_still=True)
        record['frames'].append({'index':i,'t':t,'eye':list(eye),'aim':list(aim),
                                 'lens':camera.data.lens,'scene_frame':scene.frame_current,'bytes':target.stat().st_size})
        print('JG_C69B_FRAME_OK',i,target.stat().st_size,flush=True)
    (out/'camera-manifest.json').write_text(json.dumps(record,indent=2))
    print('JG_C69B_COMPLETE',len(record['frames']),'MASTER_UNCHANGED',sha,flush=True)

if __name__=='__main__':
    render(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
