# Dive Cats 2 cover: paint a scared expression into Franko's own skin texture (his model and rig stay as they are).
# blender -b --factory-startup -P scared_franko.py -- <franko.glb> <out_texture.png> <out_check.png>
# The face is designed in a front orthographic view of his rest pose (800 px, the same camera as the measuring render):
# eyes at (345, 318) and (448, 318), nose (397, 362), chin about 405. Every texel of every front-facing triangle of
# the head is mapped to that view through its UVs and barycentrics, and painted if a feature covers it there.
import bpy, sys, math, mathutils, numpy as np

a = sys.argv[sys.argv.index("--") + 1:]
src, out_png, out_check = a
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
arm = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
hf = arm.matrix_world @ arm.data.bones["headfront"].head_local
body = next(o for o in bpy.context.scene.objects if o.type == "MESH" and "body" in o.name)
img = next(n.image for n in body.material_slots[0].material.node_tree.nodes if n.type == "TEX_IMAGE")
W, Hh = img.size
px = np.array(img.pixels[:], dtype=np.float32).reshape(Hh, W, 4)

# the measuring camera: orthographic, 0.84 units across 800 px, in front of headfront looking back at the face
SC = 800 / 0.84
fd = mathutils.Vector((0, -1, 0))
right = mathutils.Vector((-1, 0, 0)); up = mathutils.Vector((0, 0, 1))
def view(p):  # world -> front-view pixel (x right, y down)
    d = p - hf
    return 400 + d.dot(right) * SC * -1, 401 - d.dot(up) * SC

# --- the scared face, as colour functions of a front-view pixel (x, y); None = keep the skin
L, R = (345.0, 318.0), (449.0, 318.0)
def ell(x, y, cx, cy, rx, ry): return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
def seg_d(x, y, ax, ay, bx, by):
    vx, vy = bx - ax, by - ay; t = max(0, min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)))
    return math.hypot(x - ax - t * vx, y - ay - t * vy)
OUT, WHITE, PUPIL, GLINT = (0.07, 0.05, 0.07), (0.98, 0.98, 0.96), (0.03, 0.03, 0.04), (1, 1, 1)
MOUTH, LIP, TONGUE, FANG, BROW, TEAR = (0.22, 0.04, 0.07), (0.78, 0.42, 0.47), (0.98, 0.45, 0.55), (0.99, 0.99, 0.97), (0.12, 0.09, 0.1), (0.62, 0.88, 1.0)
def face(x, y):
    for sd, (cx, cy) in ((-1, L), (1, R)):
        e = ell(x, y, cx, cy - 2, 27, 26)
        if e < 1:  # a wide-open eye: white, a pin-prick pupil looking up (at the shark), a glint
            if ell(x, y, cx + sd * -1, cy - 9, 5.2, 5.6) < 1:
                return GLINT if ell(x, y, cx + sd * -1 + 1.8, cy - 11, 1.6, 1.6) < 1 else PUPIL
            return WHITE if e < 0.78 else OUT
        # worried brows: inner ends up
        if seg_d(x, y, cx - sd * 20, cy - 46, cx + sd * 18, cy - 31) < 3.4: return BROW
    # screaming mouth between nose and chin: dark oval, lip rim, tongue, two fangs
    m = ell(x, y, 397, 387, 15.5, 17.5)
    if m < 1:
        if m > 0.72: return LIP
        if ell(x, y, 397, 397, 9.5, 6) < 1: return TONGUE
        for fx in (390, 404):
            if y > 372 and y < 372 + 8 * (1 - abs(x - fx) / 3.6) and abs(x - fx) < 3.6: return FANG
        return MOUTH
    # a tear/sweat drop on his right cheek
    if ell(x, y, 470, 352, 6, 7) < 1 or (y < 352 and y > 336 and abs(x - 470) < (y - 336) / 16 * 6): return TEAR
    return None

# --- rasterise in UV space
me = body.data
me.calc_loop_triangles()
uvl = me.uv_layers.active.data
mw = body.matrix_world
painted = 0
for tri in me.loop_triangles:
    vs = [mw @ me.vertices[v].co for v in tri.vertices]
    n = (vs[1] - vs[0]).cross(vs[2] - vs[0])
    if n.length == 0 or n.normalized().dot(fd) < 0.25: continue  # only faces looking at the camera
    if (sum(vs, mathutils.Vector()) / 3 - hf).length > 0.14: continue  # only the head front
    P = [view(v) for v in vs]
    if max(p[0] for p in P) < 300 or min(p[0] for p in P) > 500 or max(p[1] for p in P) < 250 or min(p[1] for p in P) > 420: continue
    U = [uvl[li].uv for li in tri.loops]
    tx = [u.x * W for u in U]; ty = [(u.y) * Hh for u in U]
    x0, x1, y0, y1 = int(min(tx)), int(max(tx)) + 1, int(min(ty)), int(max(ty)) + 1
    den = (ty[1] - ty[2]) * (tx[0] - tx[2]) + (tx[2] - tx[1]) * (ty[0] - ty[2])
    if abs(den) < 1e-9: continue
    for j in range(max(0, y0), min(Hh, y1)):
        for i in range(max(0, x0), min(W, x1)):
            X, Y = i + 0.5, j + 0.5
            w0 = ((ty[1] - ty[2]) * (X - tx[2]) + (tx[2] - tx[1]) * (Y - ty[2])) / den
            w1 = ((ty[2] - ty[0]) * (X - tx[2]) + (tx[0] - tx[2]) * (Y - ty[2])) / den
            w2 = 1 - w0 - w1
            if w0 < -0.01 or w1 < -0.01 or w2 < -0.01: continue
            fx = w0 * P[0][0] + w1 * P[1][0] + w2 * P[2][0]
            fy = w0 * P[0][1] + w1 * P[1][1] + w2 * P[2][1]
            c = face(fx, fy)
            if c is not None: px[j, i, :3] = c; painted += 1
print("PAINTED", painted, "TEX", W, Hh)
img.pixels.foreach_set(px.ravel())
img.update()
img.filepath_raw = out_png; img.file_format = "PNG"; img.save()

# check render: the same front view, textured
sc = bpy.context.scene
sc.render.engine = "BLENDER_WORKBENCH"; sc.display.shading.light = "FLAT"; sc.display.shading.color_type = "TEXTURE"
sc.render.resolution_x = sc.render.resolution_y = 800
cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = "ORTHO"; cam.data.ortho_scale = 0.84
cam.location = hf + fd * 4; cam.rotation_euler = (-fd).to_track_quat("-Z", "Z").to_euler()
sc.render.filepath = out_check; bpy.ops.render.render(write_still=True)
