"""CORE-01 C6.7 — higher-density 160-frame Cycles study; canonical master read only.
Example: Blender -b CORE-01-BOOT.blend --python tools/c6-7-cinematic-prototype.py -- --shots 0,32,64,88,112,140,159 --count 160 --size 1080 --samples 10
"""
import bpy,math,argparse,os,json,hashlib,pathlib,sys
from mathutils import Vector
EXPECTED_SHA='1169b695582b76c08c5f4f43020f8b188fad3d14ad2d1c00887f494a85c04ce7'
# Start/end remain compatible with C6.6; more scroll time dedicated to the real power switch.
# [t, eye xyz, aim xyz, lens-mm], main POWER at (.085,-.177,.502).
KEYS=[
 [0.00,1.13,-1.43,.74, .037,-.016,.265,52],
 [0.17,.97,-1.22,.69, .046,-.037,.310,52],
 [0.33,.76,-.96,.65, .066,-.102,.382,53],
 [0.44,.54,-.710,.627, .085,-.177,.502,57],
 [0.52,.393,-.554,.605, .085,-.177,.502,66],
 [0.60,.311,-.468,.575, .085,-.177,.502,73],
 [0.67,.325,-.492,.530, .077,-.139,.450,57],
 [0.79,.248,-.391,.365, -.012,-.025,.329,51],
 [0.90,.125,-.255,.338, -.053,.040,.316,49],
 [1.00,.045,-.143,.334, -.080,.097,.316,49],
]
def smooth(a,b,x):
    u=max(0.0,min(1.0,(x-a)/(b-a)))
    return u*u*(3-2*u)
def pose(t):
    for k in range(1,len(KEYS)):
        if t<=KEYS[k][0]:
            a,b=KEYS[k-1],KEYS[k]
            u=smooth(a[0],b[0],t)
            return [x+(y-x)*u for x,y in zip(a[1:],b[1:])]
    return KEYS[-1][1:]
def bsdf_boost(material_name,factor,max_emission=9.0):
    mat=bpy.data.materials.get(material_name)
    if not mat or not mat.use_nodes:raise RuntimeError('required LED material missing: '+material_name)
    for n in mat.node_tree.nodes:
        if n.type=='BSDF_PRINCIPLED':
            s=n.inputs['Emission Strength']
            s.default_value=min(max_emission,s.default_value*factor)
            return
        if n.type=='EMISSION':
            s=n.inputs['Strength'];s.default_value=min(max_emission,s.default_value*factor);return
    raise RuntimeError('No emission node for '+material_name)
def main(argv):
    p=argparse.ArgumentParser()
    p.add_argument('--shots',required=True)
    p.add_argument('--count',type=int,default=160)
    p.add_argument('--size',type=int,default=1080)
    p.add_argument('--samples',type=int,default=10)
    p.add_argument('--output',default='/tmp/jg-C6-7-render-160-final')
    a=p.parse_args(argv)
    assert a.count==160 and 960<=a.size<=1440 and 6<=a.samples<=128
    src=bpy.data.filepath
    assert src.endswith('/03_Proyecto/CORE-01-BOOT.blend')
    sha=hashlib.sha256(open(src,'rb').read()).hexdigest()
    if sha!=EXPECTED_SHA:raise ValueError('canonical source changed: '+sha)
    out=pathlib.Path(a.output);out.mkdir(parents=True,exist_ok=True)
    scene=bpy.context.scene;old=scene.camera
    if old is None:raise RuntimeError('Missing main camera')
    camera=bpy.data.objects.new('JG C6.7 | probe camera (never saved)',old.data.copy())
    scene.collection.objects.link(camera);scene.camera=camera
    scene.render.engine='CYCLES';scene.cycles.samples=a.samples;scene.cycles.use_denoising=True
    scene.render.resolution_x=a.size;scene.render.resolution_y=a.size;scene.render.resolution_percentage=100
    scene.render.film_transparent=True
    scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.image_settings.color_depth='8'
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
        bsdf_boost(name,factor)
    report={'source_sha256':sha,'count':a.count,'size':a.size,'samples':a.samples,'keys':KEYS,'frames':[]}
    for index in [int(v) for v in a.shots.split(',') if v.strip()]:
        assert 0<=index<a.count
        dest=out/f'core01-{index:03d}.png'
        if dest.exists():raise FileExistsError('refusing to overwrite '+str(dest))
        t=index/(a.count-1)
        powered=smooth(.00,.41,t)
        scene.frame_set(int(round(1+95*powered)))
        spec=pose(t)
        eye=Vector(spec[:3]);aim=Vector(spec[3:6]);camera.location=eye
        camera.rotation_euler=(aim-eye).to_track_quat('-Z','Y').to_euler()
        camera.data.lens=spec[6]
        scene.render.filepath=str(dest)
        bpy.ops.render.render(write_still=True)
        report['frames'].append({'index':index,'t':t,'bytes':dest.stat().st_size,'camera_eye':list(eye),'camera_aim':list(aim),'power_frame':scene.frame_current,'lens':spec[6]})
        print('C6_7_FRAME_OK',index,dest.stat().st_size,flush=True)
    (out/'render-report.json').write_text(json.dumps(report,indent=2))
    print('C6_7_RENDER_COMPLETE',len(report['frames']),'MASTER_UNMODIFIED',sha,flush=True)
if __name__=='__main__':
    main(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
