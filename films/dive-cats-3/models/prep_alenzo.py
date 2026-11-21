# Dive Cats 3 shark: "Great Hammerhead Shark" by Alenzo (CC BY 4.0, Sketchfab 4af6f335bb9c416985e42af05dc08c06),
# cleaned for the film.
#   blender -b --factory-startup -P prep_alenzo.py -- <in.glb> <out.blend> <out.glb>
# - drops the ocean plane, the particle meshes and the importer's bone-shape icosphere
# - warms the mouth interior (the red-brown parts of the base colour texture) toward the reference's pink; the grey
#   skin is untouched (only reddish texels move, weighted by how red they are, so there are no hard edges)
# - normalises like the old film shark: nose +X, length 1 (nose to tail tip), centred, Z up in Blender (Y up in glTF).
#   This is a transform on the top node, never applied to the rig, so the 11 clips stay valid.
# - keeps the rig and all 11 animations. The mesh is skinned to the ORG-* bones: drive those from code (Rigify's
#   control bones moved them by constraints, which glTF does not carry). Jaw: ORG-mouth_HeadHammerSharkRig.
import bpy, sys, math
import numpy as np
from mathutils import Matrix, Vector
a = sys.argv[sys.argv.index("--") + 1:]; src, out_blend, out_glb = a[0], a[1], a[2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
for o in list(bpy.context.scene.objects):
    n = o.name.lower()
    if "ocean" in n or "particle" in n or n.startswith("icosphere"): bpy.data.objects.remove(o)
top = bpy.data.objects["Sketchfab_model"]
arm = bpy.data.objects["HeadHammerSharkRig"]; mesh = bpy.data.objects["HeadHammerShark_0"]

# ---------------------------------------------------------------- the mouth, warmer and pinker
img = next(n.image for n in bpy.data.materials["SharkHeadHammer"].node_tree.nodes if n.type == "TEX_IMAGE" and any(l.to_socket.name == "Base Color" for l in n.outputs[0].links))
px = np.array(img.pixels[:], dtype=np.float32).reshape(-1, 4)
r, g, b = px[:, 0], px[:, 1], px[:, 2]
red = np.clip((r - (g + b) / 2 - 0.03) / 0.05, 0, 1)  # 0 on grey skin, 1 on the red-brown mouth
pink = np.stack([np.clip(r * 2.1, 0, 1), np.clip(g * 1.55, 0, 1), np.clip(b * 1.7, 0, 1)], 1)
px[:, :3] = px[:, :3] * (1 - red[:, None]) + pink * red[:, None]
img.pixels[:] = px.ravel().tolist(); img.update(); img.pack()
print("TINT texels moved", int((red > 0.5).sum()), "of", len(red))

# ---------------------------------------------------------------- normalise: nose +X, length 1, centred
bpy.context.view_layer.update()
ev = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
pts = [ev.matrix_world @ v.co for v in ev.data.vertices]
lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))); hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
length = hi.y - lo.y; c = (lo + hi) / 2
print("RAW length", round(length, 3), "centre", tuple(round(v, 3) for v in c))
top.matrix_world = Matrix.Scale(1 / length, 4) @ Matrix.Rotation(math.radians(90), 4, "Z") @ Matrix.Translation(-c) @ top.matrix_world
bpy.context.view_layer.update()
ev = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
pts = [ev.matrix_world @ v.co for v in ev.data.vertices]
xs = [p.x for p in pts]; print("NORMALISED x", round(min(xs), 3), round(max(xs), 3))
mouth = arm.pose.bones["ORG-mouth_HeadHammerSharkRig"]
print("MOUTH hinge", tuple(round(v, 3) for v in arm.matrix_world @ mouth.head))

bpy.ops.wm.save_as_mainfile(filepath=out_blend)
bpy.ops.object.select_all(action="DESELECT")
for o in [top, bpy.data.objects["Root"], arm, mesh] + [o for o in arm.children if o.type == "EMPTY"]: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=out_glb, export_format="GLB", use_selection=True, export_skins=True, export_animations=True,
                          export_animation_mode="ACTIONS", export_yup=True, export_apply=False)
print("PREP DONE")
