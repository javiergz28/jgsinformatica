"""Read-only C6.11-C camera-path collision and motion audit."""
import bpy,json,sys,runpy,pathlib,hashlib,math
from mathutils import Vector
from mathutils.bvhtree import BVHTree
P=pathlib.Path(__file__).resolve().parent
module=runpy.run_path(str(P/'c6-11-c-cinematic-probe.py'),run_name='c611_probe_import')
out=pathlib.Path(sys.argv[sys.argv.index('--')+1]) if '--' in sys.argv else None
assert out is not None
source=pathlib.Path(bpy.data.filepath)
sha=hashlib.sha256(source.read_bytes()).hexdigest()
assert sha==module['EXPECTED_SHA']
scene=bpy.context.scene
cam=bpy.data.objects['C6.11 | fresh continuous camera']
aim=bpy.data.objects['C6.11 | fresh continuous aim']
timing=scene.animation_data.drivers.find('["c611_u"]')
assert timing is not None
timing.driver.expression=".75*u+.25*u*u*u*(10+u*(-15+6*u))"
for i in range(3):
 module['update_driver'](cam,'location',i,[row[i] for row in module['EYE']])
 module['update_driver'](aim,'location',i,[row[i] for row in module['AIM']])
module['update_driver'](cam.data,'lens',None,module['LENS'])
scene.frame_set(1);bpy.context.view_layer.update()
deps=bpy.context.evaluated_depsgraph_get()
trees=[]
for obj in scene.objects:
 if obj.type!='MESH' or obj.hide_render or obj.name=='STUDIO ONLY | ground':continue
 ev=obj.evaluated_get(deps)
 mesh=ev.to_mesh()
 vertices=[ev.matrix_world@v.co for v in mesh.vertices]
 faces=[list(poly.vertices) for poly in mesh.polygons]
 trees.append((obj.name,BVHTree.FromPolygons(vertices,faces,all_triangles=False)))
 ev.to_mesh_clear()
samples=901
positions=[];rotations=[];hits=[];nearest=[]
for i in range(samples):
 f=1+449*i/(samples-1)
 scene.frame_set(int(f),subframe=f-int(f))
 bpy.context.view_layer.update()
 p=cam.matrix_world.translation.copy()
 q=cam.matrix_world.to_quaternion()
 if positions:
  prev=positions[-1];delta=p-prev
  if delta.length>1e-9:
   for name,tree in trees:
    hit,n,index,distance=tree.ray_cast(prev,delta.normalized(),delta.length)
    if hit is not None:hits.append({'frame':round(f,2),'object':name,'point':list(hit)})
 positions.append(p)
 rotations.append(q)
 if i%10==0:
  distances=[(tree.find_nearest(p)[3],name) for name,tree in trees if 'glass' not in name and 'side_panel' not in name]
  if distances:nearest.append((f,*min(distances)))
deltas=[(b-a).length for a,b in zip(positions,positions[1:])]
rot=[math.degrees(a.rotation_difference(b).angle) for a,b in zip(rotations,rotations[1:])]
other=[h for h in hits if h['object'] not in ('gaming-pc_front_glass','gaming-pc_side_panel')]
record={
 'status':'experiment-not-approved','source_sha256':sha,'num_samples':samples,
 'camera_descent_m':round(positions[0].z-positions[-1].z,4),
 'distance_travelled_m':round(sum(deltas),4),
 'max_half_frame_distance_m':max(deltas),
 'max_half_frame_rotation_deg':max(rot),
 'hits':hits[:50],'solid_collision_count':len(other),'solid_collisions':other[:50],
 'min_clearance':min(nearest,key=lambda x:x[1]) if nearest else None,
 'camera_point_0':list(positions[0]),'camera_point_180':list(positions[360]),'camera_point_449':list(positions[-1]),
}
out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(record,indent=2))
print('C6_11_C_AUDIT',json.dumps(record)[:2400],flush=True)
if other:raise RuntimeError(str(len(other))+' solid collisions; reject trajectory')
print('C6_11_C_AUDIT_PASS source read-only',flush=True)
