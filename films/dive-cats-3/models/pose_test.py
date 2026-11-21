# Pose test for the rigged hammerhead: each pose rendered from the side and from front-below, full size.
#   blender -b --factory-startup <hammerhead_rigged.blend> -P pose_test.py -- <out_dir>
# Rotations are given about WORLD axes (Z = bend left/right, Y = pitch; jaw +Y opens), as code will apply them.
import bpy, sys, math
from mathutils import Vector, Matrix, Quaternion
out = sys.argv[sys.argv.index("--") + 1]
sc = bpy.context.scene
arm = bpy.data.objects["hammerhead_rig"]; ob = bpy.data.objects["hammerhead"]
sc.render.engine = "BLENDER_WORKBENCH"; sc.display.shading.color_type = "TEXTURE"; sc.display.shading.light = "STUDIO"
sc.render.resolution_x = 900; sc.render.resolution_y = 700
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.lens = 50

def aim(p, at):
    p, at = Vector(p), Vector(at); z = (p - at).normalized(); x = Vector((0, 0, 1)).cross(z).normalized(); y = z.cross(x)
    cam.matrix_world = Matrix((x, y, z)).transposed().to_4x4(); cam.location = p

def rot(name, axis, ang):
    pb = arm.pose.bones[name]
    loc = pb.bone.matrix_local.to_3x3().inverted() @ Vector(axis)
    pb.rotation_mode = "QUATERNION"; pb.rotation_quaternion = Quaternion(loc, ang)

POSES = {
    "rest": {},
    "jaw_open": {"jaw": ((0, 1, 0), 0.66)},
    "tail_curl": {"spine1": ((0, 0, 1), 0.25), "spine2": ((0, 0, 1), 0.35), "tail1": ((0, 0, 1), 0.4), "tail2": ((0, 0, 1), 0.4)},
    "s_bend": {"head": ((0, 0, 1), 0.3), "spine1": ((0, 0, 1), -0.25), "spine2": ((0, 0, 1), -0.25), "tail1": ((0, 0, 1), 0.45), "tail2": ((0, 0, 1), 0.45)},
    "fins_nose_down": {"head": ((0, 1, 0), 0.3), "fin_L": ((1, 0, 0), 0.5), "fin_R": ((1, 0, 0), -0.5)},
    "jaw_ajar": {"jaw": ((0, 1, 0), 0.15)},
    "head_turn_jaw": {"head": ((0, 0, 1), 0.35), "jaw": ((0, 1, 0), 0.5)},
}
for name, pose in POSES.items():
    for pb in arm.pose.bones: pb.rotation_mode = "QUATERNION"; pb.rotation_quaternion = (1, 0, 0, 0)
    for b, (ax, an) in pose.items(): rot(b, ax, an)
    bpy.context.view_layer.update()
    for view, (p, at) in {"side": ((0.0, -2.2, -0.05), (0.0, 0, -0.03)), "below": ((0.95, -0.55, -0.45), (0.27, 0, -0.08)), "top": ((0.0, 0.0, 2.4), (0.0, 0, 0))}.items():
        aim(p, at)
        if view == "top": cam.matrix_world = Matrix(((1, 0, 0, 0), (0, 1, 0, 0), (0, 0, 1, 2.4), (0, 0, 0, 1)))
        sc.render.filepath = f"{out}/{name}_{view}.png"; bpy.ops.render.render(write_still=True)
print("POSES DONE")
