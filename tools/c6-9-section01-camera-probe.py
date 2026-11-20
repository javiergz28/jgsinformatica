"""C6.9-A G1: isolated 01 exterior-camera Bezier probe (never saves Blender master).
blender -b /path/to/03_Proyecto/CORE-01-BOOT.blend --python tools/c6-9-section01-camera-probe.py -- --output /path/to/04_Revisiones/C6-9-A
"""
import argparse
import hashlib
import json
import math
import pathlib
import sys
import bpy
from mathutils import Vector

MASTER_SHA = "1169b695582b76c08c5f4f43020f8b188fad3d14ad2d1c00887f494a85c04ce7"
# First eye is ABOVE C6.7's z=.74 and closer to make CORE-01 larger.
# Control points bend laterally around the assembled PC, rather than approaching
# the power button/glass. The final eye remains outside and can be held by 02.
EYES = ((.93, -1.15, .94), (1.03, -.99, .91), (.73, -1.00, .79), (.66, -.89, .76))
LOOKS = ((.038, -.016, .29), (.035, -.036, .305), (.055, -.057, .32), (.07, -.07, .34))
LENSES = (60., 60., 58., 55.)
TIMES = (0., .17, .33, .50, .67, .83, 1.)

def bezier(controls, t):
    q=1.-t
    return q**3*controls[0]+3*q*q*t*controls[1]+3*q*t*t*controls[2]+t**3*controls[3]

def easing(t):
    # C1 with zero terminal velocity, preserving pause before the 02 despiece.
    return t*t*(3-2*t)

def main(argv):
    parser=argparse.ArgumentParser()
    parser.add_argument("--output",required=True)
    parser.add_argument("--size",type=int,default=700)
    parser.add_argument("--samples",type=int,default=8)
    a=parser.parse_args(argv)
    assert 500<=a.size<=960 and 6<=a.samples<=24, "G1 only"
    source=pathlib.Path(bpy.data.filepath)
    assert source.name=="CORE-01-BOOT.blend" and source.parent.name=="03_Proyecto"
    sha=hashlib.sha256(source.read_bytes()).hexdigest()
    if sha!=MASTER_SHA: raise RuntimeError("MASTER SHA mismatch: "+sha)
    output=pathlib.Path(a.output)
    output.mkdir(parents=True,exist_ok=True)
    scene=bpy.context.scene
    assert scene.camera is not None
    camera=bpy.data.objects.new("JG C6.9 G1 | unsaved curved eye",scene.camera.data.copy())
    scene.collection.objects.link(camera)
    camera.animation_data_clear()
    scene.camera=camera
    scene.render.engine="CYCLES"
    scene.cycles.samples=a.samples
    scene.cycles.use_denoising=True
    scene.render.resolution_x=scene.render.resolution_y=a.size
    scene.render.resolution_percentage=100
    scene.render.film_transparent=True
    scene.render.image_settings.file_format="PNG"
    scene.render.image_settings.color_mode="RGBA"
    scene.render.image_settings.color_depth="8"
    ground=bpy.data.objects.get("STUDIO ONLY | ground")
    if ground: ground.hide_render=True
    info={"checkpoint":"C6.9-A/G1 only","master_sha256":sha,"samples":a.samples,"size":a.size,
          "bezier_eyes":EYES,"bezier_looks":LOOKS,"lenses":LENSES,"frames":[]}
    for n,t in enumerate(TIMES):
        pos=easing(t)
        eye=Vector(tuple(bezier([p[k] for p in EYES],pos) for k in range(3)))
        aim=Vector(tuple(bezier([p[k] for p in LOOKS],pos) for k in range(3)))
        camera.location=eye
        camera.rotation_euler=(aim-eye).to_track_quat("-Z","Y").to_euler()
        camera.data.lens=bezier(LENSES,pos)
        # Keep genuine progressive light behavior without changing materials.
        scene.frame_set(1+round(94*easing(t)))
        target=output/("g1-section01-%02d.png"%n)
        if target.exists():raise FileExistsError("Refuse to overwrite probe: "+str(target))
        scene.render.filepath=str(target)
        bpy.ops.render.render(write_still=True)
        info["frames"].append({"index":n,"t":t,"eye":list(eye),"aim":list(aim),
                               "lens_mm":camera.data.lens,"source_frame":scene.frame_current,
                               "bytes":target.stat().st_size})
        print("C6_9_G1_RENDERED",n,target.stat().st_size,flush=True)
    (output/"g1-camera-manifest.json").write_text(json.dumps(info,indent=2))
    print("C6_9_G1_COMPLETE",len(TIMES),"MASTER_READ_ONLY",sha,flush=True)

if __name__=="__main__":
    main(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
