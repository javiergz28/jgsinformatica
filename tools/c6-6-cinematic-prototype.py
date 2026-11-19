"""JG Next Gen C6.6 — reproducible non-destructive camera study for CORE-01.
Reads canonical Blender master, overrides camera/lighting in memory; does not save .blend.
Run: blender -b CORE-01-BOOT.blend --python tools/c6-6-cinematic-prototype.py -- --shots 0,24,48,72,95 --size 960 --samples 16
"""
import bpy, math, argparse, os, json, pathlib, hashlib, sys
from mathutils import Vector

def smooth(a,b,x):
    t=max(0.,min(1.,(x-a)/(b-a)))
    return t*t*(3-2*t)
def interpolate(t,knots):
    if t<=knots[0][0]: return knots[0][1:]
    for i in range(1,len(knots)):
        if t<=knots[i][0]:
            u=smooth(knots[i-1][0],knots[i][0],t)
            return [a+(b-a)*u for a,b in zip(knots[i-1][1:],knots[i][1:])]
    return knots[-1][1:]

# t, eye xyz, aim xyz, focal-mm: product narrative with a deliberate button hold.
# Aim MUST target actual main button (.085,-.177,.502), never old secondary (.05555,-.2214,.502).
KEYS=[
 [0.00, 1.13,-1.43,.74,   .037,-.016,.265, 52],
 [0.18, .98,-1.23,.70,   .046,-.037,.300, 52],
 [0.36, .76,-.96,.65,   .066,-.102,.374, 53],
 [0.49, .48,-.66,.622,  .085,-.177,.502, 57],
 [0.58, .405,-.575,.607, .085,-.177,.502, 61],
 [0.67, .365,-.530,.449, .075,-.122,.403, 51],
 [0.79, .278,-.416,.332, -.007,-.035,.302, 50],
 [0.91, .117,-.234,.333, -.051,.048,.315, 49],
 [1.00, .045,-.143,.334, -.080,.097,.316, 49]
]
def camera_pose(t):
    # interpolate each scalar independently to avoid abrupt line changes
    result=[]
    for k in range(1,8):
      result.append(interpolate(t,[[x[0],x[k]] for x in KEYS])[0])
    return result
def main(argv):
    p=argparse.ArgumentParser()
    p.add_argument('--shots',default='0,18,36,48,58,67,79,91,95')
    p.add_argument('--size',type=int,default=960)
    p.add_argument('--samples',type=int,default=14)
    p.add_argument('--output',default='/tmp/jg-C6-6-camera-study')
    args=p.parse_args(argv)
    source=bpy.data.filepath
    if not source.endswith('/03_Proyecto/CORE-01-BOOT.blend'): raise ValueError('only canonical Blender master is accepted')
    sha=hashlib.sha256(open(source,'rb').read()).hexdigest()
    if sha!='1169b695582b76c08c5f4f43020f8b188fad3d14ad2d1c00887f494a85c04ce7': raise ValueError('master source sha changed '+sha)
    out=pathlib.Path(args.output);out.mkdir(exist_ok=True,parents=True)
    sc=bpy.context.scene
    # A separate, non-animated render camera is essential: Cycles may re-evaluate
    # the original rig's action during bpy.ops.render.render(), overwriting its pose.
    original=sc.camera
    preview_data=original.data.copy()
    camera=bpy.data.objects.new('JG C6.6 | unanimated render camera (temp)',preview_data)
    sc.collection.objects.link(camera)
    sc.camera=camera
    sc.render.engine='CYCLES';sc.cycles.samples=args.samples;sc.cycles.use_denoising=True
    sc.render.resolution_x=args.size;sc.render.resolution_y=args.size;sc.render.resolution_percentage=100
    sc.render.film_transparent=True
    sc.render.image_settings.file_format='PNG';sc.render.image_settings.color_mode='RGBA'
    sc.render.image_settings.color_depth='8'
    sc.render.use_file_extension=True
    ground=bpy.data.objects.get('STUDIO ONLY | ground')
    if ground:ground.hide_render=True
    for label,mult in [('STUDIO ONLY | interior fill',1.5),('STUDIO ONLY | soft key',1.23),('STUDIO ONLY | trim light',1.25)]:
      obj=bpy.data.objects.get(label)
      if obj and obj.type=='LIGHT':obj.data.energy*=mult
    report={'master_sha256':sha,'frames':[],'size':args.size,'samples':args.samples,'camera_keys':KEYS}
    for frame in [int(x) for x in args.shots.split(',') if x.strip()]:
      assert 0<=frame<=95
      t=frame/95
      # Source power animation is separate from camera; charge to full before close-up.
      lighting=smooth(.00,.29,t)
      sc.frame_set(int(round(1+95*lighting)))
      eyeX,eyeY,eyeZ,atX,atY,atZ,lens=camera_pose(t)
      eye=Vector((eyeX,eyeY,eyeZ))
      at=Vector((atX,atY,atZ))
      camera.location=eye
      camera.rotation_euler=(at-eye).to_track_quat('-Z','Y').to_euler()
      camera.data.lens=lens
      sc.render.filepath=str(out/('core01-%03d.png'%frame))
      bpy.ops.render.render(write_still=True)
      report['frames'].append({'index':frame,'t':t,'file':sc.render.filepath,'size':os.stat(sc.render.filepath).st_size,'eye':list(eye),'aim':list(at),'lens':lens,'lighting_frame':sc.frame_current})
      print('C6_6_FRAME_OK',frame,sc.render.filepath,os.stat(sc.render.filepath).st_size,flush=True)
    (out/'preview-manifest.json').write_text(json.dumps(report,indent=2))
    print('C6_6_FINISHED',len(report['frames']),'NO_MASTER_SAVE',flush=True)
if __name__=='__main__':
    main(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
