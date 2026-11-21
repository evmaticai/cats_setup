import bpy, sys
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=sys.argv[sys.argv.index("--")+1])
for o in bpy.context.scene.objects:
    print("OB", o.name, o.type, tuple(round(v,3) for v in o.dimensions), o.location[:], o.rotation_euler[:], o.scale[:])
    if o.type=="MESH":
        me=o.data
        print(" verts",len(me.vertices),"faces",len(me.polygons),"mats",[m.name for m in me.materials], "uv", [u.name for u in me.uv_layers])
        import bmesh
        bm=bmesh.new(); bm.from_mesh(me)
        nm=[e for e in bm.edges if not e.is_manifold]; print(" nonmanifold edges",len(nm))
        print(" islands?", len(set()))
        for m in me.materials:
            n=[x for x in m.node_tree.nodes if x.type=="TEX_IMAGE"]
            print(" mat",m.name,[x.image.name+" %dx%d"%tuple(x.image.size) for x in n], m.blend_method if hasattr(m,'blend_method') else '')
