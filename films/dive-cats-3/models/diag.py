import bpy
from mathutils import Vector, Quaternion
arm=bpy.data.objects["hammerhead_rig"]; ob=bpy.data.objects["hammerhead"]
me=ob.data; rest=[v.co.copy() for v in me.vertices]
pb=arm.pose.bones["jaw"]; pb.rotation_mode="QUATERNION"
pb.rotation_quaternion=Quaternion(pb.bone.matrix_local.to_3x3().inverted()@Vector((0,1,0)),0.66)
bpy.context.view_layer.update()
dg=bpy.context.evaluated_depsgraph_get(); ev=ob.evaluated_get(dg).to_mesh()
pos=[v.co.copy() for v in ev.vertices]
gname={g.index:g.name for g in ob.vertex_groups}
def groups(i): return {gname[g.group]:round(g.weight,2) for g in me.vertices[i].groups}
bad=[]
for f in me.polygons:
    vs=list(f.vertices)
    r=max((rest[a]-rest[b]).length for a in vs for b in vs); p=max((pos[a]-pos[b]).length for a in vs for b in vs)
    if p>r*1.6+0.01: bad.append((p-r,f.index,vs))
bad.sort(reverse=True); print("BAD",len(bad))
for d,fi,vs in bad[:8]:
    print(round(d,3),fi,[(tuple(round(c,3) for c in rest[v]),groups(v)) for v in vs])
