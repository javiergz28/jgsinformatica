"""C6.10: render only 0..60 of a continuous CORE-01 camera path. Frames 61..159
reuse verified C6.7 original. Canonical Blender master is opened READ-ONLY.
"""
import argparse, hashlib, json, pathlib, runpy, sys, math
import bpy
from mathutils import Vector

MASTER = '1169b695582b76c08c5f4f43020f8b188fad3d14ad2d1c00887f494a85c04ce7'
C6_END = 60
KNOTS=[
    (0.0, (.87,-1.055,.95,.038,-.016,.290,63.)),
    (.115,(.965,-1.000,.930,.044,-.032,.310,62.)),
    (.265,(.770,-.958,.780,.058,-.061,.350,59.)),
]

def hermite(a,b,m0,m1,t,dt):
    t2=t*t;t3=t2*t
    return (2*t3-3*t2+1)*a+(t3-2*t2+t)*dt*m0+(-2*t3+3*t2)*b+(t3-t2)*dt*m1

def main(args):
    ap=argparse.ArgumentParser()
    ap.add_argument('--output',required=True)
    ap.add_argument('--shots',required=True)
    ap.add_argument('--size',type=int,default=1080)
    ap.add_argument('--samples',type=int,default=10)
    a=ap.parse_args(args)
    assert a.size in (768,960,1080) and 6<=a.samples<=16
    scene_path=pathlib.Path(bpy.data.filepath)
    assert scene_path.name=='CORE-01-BOOT.blend' and scene_path.parent.name=='03_Proyecto'
    sha=hashlib.sha256(scene_path.read_bytes()).hexdigest()
    if sha!=MASTER:raise RuntimeError('SOURCE CHANGED '+sha)
    script=pathlib.Path(__file__).with_name('c6-7-cinematic-prototype.py')
    ref=runpy.run_path(str(script))
    pose=ref['pose']; smooth=ref['smooth']
    te=C6_END/159
    # Preserve exact positions and velocity of the C6.7 source at the handoff.
    p_end=tuple(pose(te))
    dots=KNOTS+[(te,p_end)]
    slopes=[]
    for j,(time,point) in enumerate(dots):
        if j==len(dots)-1:
            h=.0001
            xp=pose(te+h);xm=pose(te-h)
            slopes.append(tuple((xp[k]-xm[k])/(2*h) for k in range(7)))
        elif j==0:
            later=dots[1]
            slopes.append(tuple((later[1][k]-point[k])/(later[0]-time) for k in range(7)))
        else:
            prev=dots[j-1];nxt=dots[j+1]
            slopes.append(tuple((nxt[1][k]-prev[1][k])/(nxt[0]-prev[0]) for k in range(7)))
    def camera_at(t):
        for j in range(1,len(dots)):
            if t<=dots[j][0] or j==len(dots)-1:
                a0,xa=dots[j-1];a1,xb=dots[j]
                u=max(0.,min(1.,(t-a0)/(a1-a0)))
                return [hermite(xa[k],xb[k],slopes[j-1][k],slopes[j][k],u,a1-a0) for k in range(7)]
    out=pathlib.Path(a.output);out.mkdir(parents=True,exist_ok=True)
    stage=bpy.context.scene
    assert stage.camera is not None
    cam=bpy.data.objects.new('C6.10 | temporary continuous track (NOT SAVED)',stage.camera.data.copy())
    stage.collection.objects.link(cam);cam.animation_data_clear();stage.camera=cam
    stage.render.engine='CYCLES';stage.cycles.samples=a.samples;stage.cycles.use_denoising=True
    stage.render.resolution_x=stage.render.resolution_y=a.size
    stage.render.resolution_percentage=100;stage.render.film_transparent=True
    stage.render.image_settings.file_format='PNG'
    stage.render.image_settings.color_mode='RGBA';stage.render.image_settings.color_depth='8'
    ground=bpy.data.objects.get('STUDIO ONLY | ground')
    if ground:ground.hide_render=True
    for name,factor in [('STUDIO ONLY | interior fill',1.5),('STUDIO ONLY | soft key',1.23),('STUDIO ONLY | trim light',1.25)]:
        lamp=bpy.data.objects.get(name)
        if lamp and lamp.type=='LIGHT':lamp.data.energy*=factor
    for name,factor in [
        ('JG / subtle power icon',1.9),('JG / cyan power progress',1.18),
        ('JG RAM | V2 smoked cyan light diffuser',1.45),
        ('JG / AIO smoked cyan lens',1.5),
        ('gaming-pc_rgb_cyan_x',1.12)]:
        ref['bsdf_boost'](name,factor)
    report={'checkpoint':'C6.10 / Continuity bridge to C6.7 core','source_sha256':sha,
      'h​​andoff_index':C6_END,'handoff_original_t':te,'handoff_expected_pose':list(p_end),
      'knots':[(t,list(p)) for t,p in dots],'samples':a.samples,'size':a.size,'frames':[]}
    indices=sorted(set(int(x) for x in a.shots.split(',') if x.strip()))
    assert indices and all(0<=n<=C6_END for n in indices)
    for i in indices:
        target=out/f'core01-{i:03}.png'
        if target.exists():raise FileExistsError(f'No overwrite: {target}')
        t=i/159
        spec=camera_at(t)
        eye=Vector(spec[:3]);aim=Vector(spec[3:6])
        cam.location=eye
        cam.rotation_euler=(aim-eye).to_track_quat('-Z','Y').to_euler()
        cam.data.lens=spec[6]
        powered=smooth(.00,.41,t)
        stage.frame_set(int(round(1+95*powered)))
        stage.render.filepath=str(target)
        bpy.ops.render.render(write_still=True)
        report['frames'].append({'i':i,'t':t,'eye':list(eye),'aim':list(aim),'lens':spec[6],'scene_frame':stage.frame_current,'bytes':target.stat().st_size})
        print('JG_C610_RENDER',i,target.stat().st_size,flush=True)
    (out/'bridge-report.json').write_text(json.dumps(report,indent=2))
    print('JG_C610_OK',len(report['frames']),sha,flush=True)

if __name__=='__main__':
    main(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
