# Close-up of the Alenzo hammerhead's mouth: shut, the "Attacking" bite (frame 4), and that bite pushed to 1.5x.
#   blender -b --factory-startup -P mouth_alenzo.py -- <in.glb> <out_dir>
import bpy, sys
from mathutils import Vector, Matrix, Quaternion
a = sys.argv[sys.argv.index("--") + 1:]; src, out = a[0], a[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
for o in list(bpy.context.scene.objects):
    if o.type == "MESH" and ("ocean" in o.name.lower() or "particle" in o.name.lower()): bpy.data.objects.remove(o)
arm = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
pb = arm.pose.bones; mouth = pb["ORG-mouth_HeadHammerSharkRig"]  # the skinned joint (the control bones drove it by constraints, gone in glTF)
act = bpy.data.actions["Attacking"]
arm.animation_data.action = act
if hasattr(arm.animation_data, "action_slot") and act.slots: arm.animation_data.action_slot = act.slots[0]
sc = bpy.context.scene; sc.frame_set(4)
bite = mouth.matrix_basis.to_quaternion(); print("BITE axis", tuple(round(c, 3) for c in bite.axis), "deg", round(bite.angle * 57.3, 1))
M = arm.matrix_world @ mouth.head  # the jaw hinge
sc.render.engine = "BLENDER_WORKBENCH"; sc.display.shading.color_type = "TEXTURE"; sc.display.shading.light = "STUDIO"
sc.render.resolution_x = 800; sc.render.resolution_y = 800
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); cam.data.lens = 45; sc.collection.objects.link(cam); sc.camera = cam
def aim(p, at):
    z = (p - at).normalized(); x = Vector((0, 0, 1)).cross(z).normalized(); y = z.cross(x)
    cam.matrix_world = Matrix((x, y, z)).transposed().to_4x4(); cam.location = p
target = M + Vector((0, -0.25, -0.1))
views = {"front_below": target + Vector((0.35, -1.6, -1.0)), "below": target + Vector((0.05, -0.4, -1.7)), "side": target + Vector((1.8, -0.2, -0.2))}
states = {"shut": Quaternion(), "bite": bite, "wide": Quaternion(bite.axis, bite.angle * 1.5)}
arm.animation_data.action = None
for p in pb: p.matrix_basis = Matrix()
for sname, q in states.items():
    mouth.rotation_mode = "QUATERNION"; mouth.rotation_quaternion = q
    bpy.context.view_layer.update()
    for vname, p in views.items():
        aim(p, target); sc.render.filepath = f"{out}/mouth_{sname}_{vname}.png"; bpy.ops.render.render(write_still=True)
print("MOUTH DONE")
