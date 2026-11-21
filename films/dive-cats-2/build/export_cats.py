# Dive Cats 2: export each cat from the approved Dive Cats build WITH its fitted dive mask, for three.js.
# The mask (bone-parented to Head in dive-cats.blend) becomes a mesh skinned 100% to Head, so it follows every pose.
# blender -b --factory-startup <dive-team>/build/dive-cats.blend --python export_cats.py -- <out_dir>
import bpy, sys, os
out = sys.argv[sys.argv.index("--") + 1]
os.makedirs(out, exist_ok=True)
for key in ["paw", "silent", "zhenya", "yeji", "lusya", "franko"]:
    arm = bpy.data.objects[key]; body = bpy.data.objects[key + "_body"]; mask = bpy.data.objects[key + "_mask"]
    if arm.animation_data: arm.animation_data_clear()
    arm.location = (0, 0, 0); arm.rotation_mode = "QUATERNION"; arm.rotation_quaternion = (1, 0, 0, 0)
    for p in arm.pose.bones: p.matrix_basis.identity()
    arm.data.pose_position = "REST"
    bpy.context.view_layer.update()
    w = mask.matrix_world.copy()
    mask.parent = None; mask.matrix_world = w
    bpy.ops.object.select_all(action="DESELECT"); mask.select_set(True); bpy.context.view_layer.objects.active = mask
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    mask.vertex_groups.clear()
    vg = mask.vertex_groups.new(name="Head"); vg.add(list(range(len(mask.data.vertices))), 1.0, "REPLACE")
    mod = mask.modifiers.new("Armature", "ARMATURE"); mod.object = arm
    mask.parent = arm; mask.matrix_parent_inverse = arm.matrix_world.inverted()
    arm.data.pose_position = "POSE"
    bpy.ops.object.select_all(action="DESELECT")
    for o in (arm, body, mask): o.select_set(True)
    bpy.context.view_layer.objects.active = arm
    path = os.path.join(out, key + ".glb")
    bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_animations=False, export_yup=True)
    print("EXPORTED", path, os.path.getsize(path))
