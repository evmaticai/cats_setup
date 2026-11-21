# Look at the Alenzo hammerhead: strip the ocean and particles, find the nose and the widest bite in "Attacking",
# and render rest / bite from the side and from below-front (the user's reference angle).
#   blender -b --factory-startup -P look_alenzo.py -- <in.glb> <out_dir>
import bpy, sys, math
from mathutils import Vector, Matrix
a = sys.argv[sys.argv.index("--") + 1:]; src, out = a[0], a[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
for o in list(bpy.context.scene.objects):
    if o.type == "MESH" and ("ocean" in o.name.lower() or "particle" in o.name.lower()): bpy.data.objects.remove(o)
arm = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
mesh = next(o for o in bpy.context.scene.objects if o.type == "MESH")
print("ARM", arm.name, "MESH", mesh.name, "verts", len(mesh.data.vertices), "mats", [m.name for m in mesh.data.materials])
print("ACTIONS", [act.name for act in bpy.data.actions])
dg = bpy.context.evaluated_depsgraph_get()
def bbox():
    ev = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get()); m = ev.matrix_world
    pts = [m @ Vector(c) for c in ev.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))); hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return lo, hi
pb = arm.pose.bones
head = arm.matrix_world @ pb["head_HeadHammerSharkRig"].head if "head_HeadHammerSharkRig" in pb else None
tail = arm.matrix_world @ pb["tailMd02_HeadHammerSharkRig"].tail if "tailMd02_HeadHammerSharkRig" in pb else None
mouth = pb.get("mouth_HeadHammerSharkRig")
print("HEAD", head, "TAIL", tail, "MOUTH", mouth and (arm.matrix_world @ mouth.head, arm.matrix_world @ mouth.tail))
lo, hi = bbox(); print("BBOX", lo, hi, "size", hi - lo)
# the bite: the frame of "Attacking" where the mouth bone turns furthest from rest
act = bpy.data.actions.get("Attacking")
if arm.animation_data is None: arm.animation_data_create()
arm.animation_data.action = act
if hasattr(arm.animation_data, "action_slot") and act.slots: arm.animation_data.action_slot = act.slots[0]
f0, f1 = map(int, act.frame_range); best = (0, f0)
for f in range(f0, f1 + 1):
    bpy.context.scene.frame_set(f)
    ang = mouth.matrix_basis.to_quaternion().angle if mouth else 0
    if ang > best[0]: best = (ang, f)
print("BITE frame", best[1], "angle", round(math.degrees(best[0]), 1), "range", f0, f1)
# render
sc = bpy.context.scene; sc.render.engine = "BLENDER_WORKBENCH"; sc.display.shading.color_type = "TEXTURE"; sc.display.shading.light = "STUDIO"
sc.render.resolution_x = 900; sc.render.resolution_y = 900
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
nose_dir = (head - tail).normalized(); C = (lo + hi) / 2; L = (hi - lo).length
up = Vector((0, 0, 1)); side = nose_dir.cross(up).normalized()
def aim(p, at):
    z = (p - at).normalized(); x = Vector((0, 0, 1)).cross(z).normalized(); y = z.cross(x)
    cam.matrix_world = Matrix((x, y, z)).transposed().to_4x4(); cam.location = p
views = {"side": C + side * L * 1.3, "below_front": head + nose_dir * L * 0.55 - up * L * 0.55 + side * L * 0.25}
for label, frame in (("rest", None), ("bite", best[1])):
    if frame is None: arm.animation_data.action = None; [setattr(p, "matrix_basis", Matrix()) for p in pb]
    else: arm.animation_data.action = act; sc.frame_set(frame)
    bpy.context.view_layer.update()
    for v, p in views.items():
        aim(p, C if v == "side" else head - nose_dir * L * 0.15)
        sc.render.filepath = f"{out}/alenzo_{label}_{v}.png"; bpy.ops.render.render(write_still=True)
print("LOOK DONE")
