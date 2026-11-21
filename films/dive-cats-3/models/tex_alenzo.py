import bpy, sys
a = sys.argv[sys.argv.index("--") + 1:]; src, out = a[0], a[1]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
for o in bpy.context.scene.objects: print("OB", o.name, o.type, "parent", o.parent.name if o.parent else None, tuple(round(v,3) for v in o.rotation_euler), tuple(round(v,3) for v in o.scale))
m = bpy.data.materials["SharkHeadHammer"]
for n in m.node_tree.nodes:
    if n.type == "TEX_IMAGE":
        links = [l.to_socket.name for l in n.outputs[0].links]
        print("TEX", n.image.name, tuple(n.image.size), "->", links)
        n.image.filepath_raw = f"{out}/tex_{n.image.name}.png"; n.image.file_format = "PNG"; n.image.save()
