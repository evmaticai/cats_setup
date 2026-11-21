# Render the shark from side, below, front and top (Workbench, textured), one PNG per view.
import bpy, sys, math
from mathutils import Vector
a=sys.argv[sys.argv.index("--")+1:]; src, out = a[0], a[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
if src.endswith(".blend"): bpy.ops.wm.open_mainfile(filepath=src)
else: bpy.ops.import_scene.gltf(filepath=src)
sc=bpy.context.scene; sc.render.engine="BLENDER_WORKBENCH"
sc.display.shading.color_type="TEXTURE"; sc.display.shading.light="STUDIO"
sc.display.shading.show_xray=False
sc.render.resolution_x=900; sc.render.resolution_y=600
sc.world=bpy.data.worlds.new("w") if not sc.world else sc.world
cam=bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera=cam
cam.data.type="ORTHO"; cam.data.ortho_scale=1.15
views={"side":(Vector((0,-3,0)),), "below":(Vector((0,0,-3)),), "front":(Vector((3,0,0)),), "top":(Vector((0,0,3)),)}
for name,(p,) in views.items():
    cam.location=p
    d=(Vector((0,0,0))-p).normalized()
    up=Vector((0,0,1)) if abs(d.z)<0.9 else Vector((1,0,0))
    cam.rotation_euler=d.to_track_quat('-Z','Y' if False else 'Y').to_euler()
    # aim with explicit up
    z=-d; x=up.cross(z).normalized(); y=z.cross(x)
    from mathutils import Matrix
    cam.matrix_world=Matrix((x,y,z)).transposed().to_4x4(); cam.location=p
    if name=="front": cam.data.ortho_scale=0.5
    else: cam.data.ortho_scale=1.15
    sc.render.filepath=out+"_"+name+".png"; bpy.ops.render.render(write_still=True)
