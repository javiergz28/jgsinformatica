"""C6.11-C visual gate: replace ONLY camera driver expressions in-memory.
Open the existing Blender C6.11 scene; don't save .blend and don't touch LIVE.

Preview path is an independent degree-seven Bezier crane/dolly shot with real
vertical descent. Render selected frames at higher Cycles samples for approval.
Do not confuse these sparse stills with a finished 450-frame film.
"""
import bpy, sys, math, argparse, json, hashlib, pathlib
from mathutils import Vector
EXPECTED_SHA = "6522cbb38d303554fb9c25b13975bfa2c728d5ce1908b9e9dc3b1b403fa6f7d2"
EYE = [
 (.63,-.94,.84), (.66,-.885,.82), (.59,-.71,.71), (.49,-.54,.60),
 (.35,-.31,.47), (.23,-.135,.40), (.115,-.040,.365), (.085,-.035,.36)
]
AIM = [
 (.0,0,.30), (.02,-.025,.35), (.045,-.055,.36), (.055,-.04,.385),
 (.0,-.018,.375), (-.045,.022,.355), (-.065,.035,.34), (-.065,.035,.34)
]
LENS = [53,52,50,46,40,33,24,20]

def coeff(points):
 n=len(points)-1
 return [sum(points[i]*math.comb(n,i)*math.comb(n-i,k-i)*(-1)**(k-i) for i in range(k+1)) for k in range(n+1)]
def poly(values):
 c=coeff(values);expression=f"{c[-1]:.10g}"
 for value in reversed(c[:-1]):
  expression=f"({expression}*u{value:+.10g})"
 return expression

def update_driver(ob, prop, component, values):
 animation=ob.animation_data
 assert animation is not None
 f=animation.drivers.find(prop, index=component) if component is not None else animation.drivers.find(prop)
 assert f is not None, (ob.name,prop,component)
 f.driver.expression=poly(values)

def main(argv):
 p=argparse.ArgumentParser()
 p.add_argument("--output",required=True)
 p.add_argument("--indices",default="0,60,120,180,240,300,350,400,449")
 p.add_argument("--size",type=int,default=1080)
 p.add_argument("--aspect",choices=["square","wide","tall"],default="square")
 p.add_argument("--samples",type=int,default=32)
 args=p.parse_args(argv)
 assert args.size in (768,1080,1440,1600) and 24<=args.samples<=96
 path=pathlib.Path(bpy.data.filepath)
 assert path.name=="CORE-01-BOOT.blend"
 sha=hashlib.sha256(path.read_bytes()).hexdigest()
 if sha!=EXPECTED_SHA:raise RuntimeError("Source master changed "+sha)
 scene=bpy.context.scene
 cam=bpy.data.objects["C6.11 | fresh continuous camera"]
 aim=bpy.data.objects["C6.11 | fresh continuous aim"]
 # Give the dolly/crane tangible travel in the first third; the previous timing
 # left the camera almost stationary until frame 120 (a zoom-like experience).
 timing=scene.animation_data.drivers.find('["c611_u"]')
 assert timing is not None
 timing.driver.expression=".75*u+.25*u*u*u*(10+u*(-15+6*u))"

 assert scene.camera==cam
 for i in range(3):
  update_driver(cam,"location",i,[row[i] for row in EYE])
  update_driver(aim,"location",i,[row[i] for row in AIM])
 update_driver(cam.data,"lens",None,LENS)
 # Preserve materials, all geometry and cyan light setup.
 out=pathlib.Path(args.output)
 out.mkdir(parents=True,exist_ok=True)
 scene.render.engine='CYCLES';scene.cycles.samples=args.samples
 scene.cycles.use_denoising=True
 if args.aspect=="wide":
  scene.render.resolution_x=1920
  scene.render.resolution_y=1080
  cam.data.sensor_fit="VERTICAL"
  cam.data.sensor_height=36
 elif args.aspect=="tall":
  scene.render.resolution_x=720
  scene.render.resolution_y=1280
  cam.data.sensor_fit="HORIZONTAL"
  cam.data.sensor_width=36
 else:
  scene.render.resolution_x=args.size
  scene.render.resolution_y=args.size
 scene.render.resolution_percentage=100
 scene.render.film_transparent=True
 scene.render.image_settings.file_format="PNG"
 scene.render.image_settings.color_mode="RGBA"
 scene.render.image_settings.color_depth="8"
 scene.render.use_file_extension=True
 ground=bpy.data.objects.get("STUDIO ONLY | ground")
 if ground:ground.hide_render=True
 report={"status":"experiment-not-approved","checkpoint":"C6.11-C","sha256_of_original_master":sha,"eye_control_points":EYE,"aim_control_points":AIM,"lens_control_points":LENS,"frames":[]}
 indexes=sorted(set(int(i) for i in args.indices.split(",") if i.strip()))
 assert indexes and all(0<=i<450 for i in indexes)
 for i in indexes:
  target=out/f"cinematic-{args.aspect}-probe-{i:03}.png"
  if target.exists(): raise FileExistsError("No overwrite "+str(target))
  scene.frame_set(i+1)
  bpy.context.view_layer.update()
  p=cam.matrix_world.translation
  q=cam.matrix_world.to_quaternion()
  scene.render.filepath=str(target)
  bpy.ops.render.render(write_still=True)
  report["frames"].append({"index":i,"eye":list(p),"quaternion":list(q),"lens":cam.data.lens,"bytes":target.stat().st_size})
  print("C6_11_C_PROBE",i,"xyz",[round(v,4) for v in p],"lens",round(cam.data.lens,2),"bytes",target.stat().st_size,flush=True)
 (out/"experiment-camera.json").write_text(json.dumps(report,indent=2))
 print("PROBE_DONE",len(indexes),"MASTER_READ_ONLY",sha,flush=True)

if __name__=="__main__":
 main(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
