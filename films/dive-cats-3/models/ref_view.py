# The Alenzo hammerhead in the "Attacking" bite (frame 4), seen from below-front like the user's reference picture.
import bpy, sys
from mathutils import Vector, Matrix
a = sys.argv[sys.argv.index("--") + 1:]; src, out = a[0], a[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
for o in list(bpy.context.scene.objects):
    if o.type == "MESH" and ("ocean" in o.name.lower() or "particle" in o.name.lower()): bpy.data.objects.remove(o)
arm = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
act = bpy.data.actions["Attacking"]; arm.animation_data.action = act
if hasattr(arm.animation_data, "action_slot") and act.slots: arm.animation_data.action_slot = act.slots[0]
sc = bpy.context.scene; sc.frame_set(4)
sc.render.engine = "BLENDER_WORKBENCH"; sc.display.shading.color_type = "TEXTURE"; sc.display.shading.light = "STUDIO"
sc.display.shading.studio_light = "outdoor.sl" if "outdoor.sl" in [s.name for s in bpy.context.preferences.studio_lights] else sc.display.shading.studio_light
sc.world = sc.world or bpy.data.worlds.new("w")
sc.render.resolution_x = 1000; sc.render.resolution_y = 1000; sc.render.film_transparent = False
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); cam.data.lens = 40; sc.collection.objects.link(cam); sc.camera = cam
at = Vector((-0.3, 0.4, 0.35)); p = at + Vector((1.6, -5.2, -4.6))
z = (p - at).normalized(); x = Vector((0, 0, 1)).cross(z).normalized(); y = z.cross(x)
cam.matrix_world = Matrix((x, y, z)).transposed().to_4x4(); cam.location = p
sc.render.filepath = out; bpy.ops.render.render(write_still=True); print("REF DONE")
