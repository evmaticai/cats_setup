# Dive Cats 3: rig DC2's hammerhead (CC BY, "sharkingaround", credited in dive-cats-2/downloads/CREDITS.md).
#   blender -b --factory-startup -P rig_hammerhead.py -- <in.glb> <out.blend> <out.glb>
# In: the film's normalised model (length 1 along X, nose +X, centred; Blender Z up). Kept as made: its mesh, UVs and
# textures. Added:
#   - an armature: body -> head (the hammer) -> jaw; body -> spine1 -> spine2 -> tail1 -> tail2; body -> fin_L / fin_R
#   - the lower jaw cut free along the lip line (faces split off by centroid, the region the code jaw used and the
#     block 1 stills approved), hinged at its back
#   - a dark mouth bag and two rows of cartoon teeth inside the head, hidden by the skin while the mouth is shut
#   - weights computed from position (a smooth blend between neighbouring bones along the body), not bone heat:
#     the shell is open at its UV seams, where automatic weights are unreliable
#   - no shape key: a scripted "smile" opened red gaps along the lip seam (pose test, 2026-11-21), so it was dropped
# Export: no tangents (exporting them made 4 validator errors: zero tangents on the UV-less mouth bag and teeth).
# Bone axes for code: every bone's rest is set so that rotating it about the world Z axis bends left/right and about
# world Y pitches (jaw: +Y opens it, nose down). See the pose test (pose_test.py) for the signs.
import bpy, bmesh, sys
from mathutils import Vector

a = sys.argv[sys.argv.index("--") + 1:]
src, out_blend, out_glb = a[0], a[1], a[2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
ob = next(o for o in bpy.context.scene.objects if o.type == "MESH")
ob.name = "hammerhead"; ob.data.name = "hammerhead"
bpy.context.view_layer.objects.active = ob

# ---------------------------------------------------------------------------------------------- the jaw, cut free
HX, HZ = 0.12, -0.06            # hinge (x along the body, z up)
def in_jaw(c): return HX < c.x < 0.345 and c.z < -0.055 and abs(c.y) < 0.05  # |y|: the head's own width, not the pectoral fins below it
bm = bmesh.new(); bm.from_mesh(ob.data)
jaw_faces = [f for f in bm.faces if in_jaw(f.calc_center_median())]
res = bmesh.ops.split(bm, geom=jaw_faces, use_only_faces=False)  # disconnect the jaw from the head along its border
jaw_faces = [g for g in res["geom"] if isinstance(g, bmesh.types.BMFace)]
bmesh.ops.delete(bm, geom=[f for f in bm.faces if in_jaw(f.calc_center_median()) and f not in set(jaw_faces)], context="FACES_ONLY")  # split copies; drop the originals if any remain
bm.verts.index_update()
jaw_verts = {v.index for f in jaw_faces for v in f.verts}
print("JAW faces", len(jaw_faces), "verts", len(jaw_verts))

# ---------------------------------------------------------------------------------------------- mouth bag and teeth
mat_mouth = bpy.data.materials.new("mouth"); mat_mouth.diffuse_color = (0.22, 0.02, 0.04, 1)
mat_mouth.use_nodes = True
bsdf = next(n for n in mat_mouth.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
bsdf.inputs["Base Color"].default_value = (0.22, 0.02, 0.04, 1); bsdf.inputs["Roughness"].default_value = 0.8
mat_tooth = bpy.data.materials.new("teeth"); mat_tooth.use_nodes = True
tb = next(n for n in mat_tooth.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
tb.inputs["Base Color"].default_value = (0.95, 0.95, 0.9, 1); tb.inputs["Roughness"].default_value = 0.5
ob.data.materials.append(mat_mouth); ob.data.materials.append(mat_tooth)
MI_MOUTH, MI_TOOTH = len(ob.data.materials) - 2, len(ob.data.materials) - 1
extra_jaw, extra_head = set(), set()

def add_box(x0, x1, hy, z0, z1, mi):
    """the mouth bag: its lower four corners ride the jaw, the upper four the head"""
    vs = {}
    for ix, x in enumerate((x0, x1)):
        for iy, y in enumerate((-hy, hy)):
            for iz, z in enumerate((z0, z1)):
                vs[ix, iy, iz] = bm.verts.new((x, y, z))
    quads = [((0,0,0),(0,1,0),(0,1,1),(0,0,1)), ((1,0,0),(1,0,1),(1,1,1),(1,1,0)), ((0,0,0),(0,0,1),(1,0,1),(1,0,0)),
             ((0,1,0),(1,1,0),(1,1,1),(0,1,1)), ((0,0,0),(1,0,0),(1,1,0),(0,1,0)), ((0,0,1),(0,1,1),(1,1,1),(1,0,1))]
    for q in quads:
        f = bm.faces.new([vs[k] for k in q]); f.material_index = mi
    for k, v in vs.items(): (extra_jaw if k[2] == 0 else extra_head).add(v)

def add_tooth(base, tip, r, mi, group):
    d = (tip - base).normalized(); side = Vector((0, 1, 0)); fwd = d.cross(side).normalized()
    ring = [bm.verts.new(base + side * r), bm.verts.new(base + fwd * r), bm.verts.new(base - side * r), bm.verts.new(base - fwd * r)]
    t = bm.verts.new(tip)
    for i in range(4):
        f = bm.faces.new((ring[i], ring[(i + 1) % 4], t)); f.material_index = mi
    f = bm.faces.new(list(reversed(ring))); f.material_index = mi
    group.update(ring + [t])

add_box(0.15, 0.33, 0.034, -0.078, -0.035, MI_MOUTH)
for i in range(7):
    y = (i - 3) * 0.0115; bow = 0.006 * (i - 3) ** 2 / 9
    add_tooth(Vector((0.326 - bow, y, -0.063)), Vector((0.326 - bow, y, -0.081)), 0.0055, MI_TOOTH, extra_head)  # upper row, points down
    add_tooth(Vector((0.318 - bow, y, -0.084)), Vector((0.318 - bow, y, -0.066)), 0.0055, MI_TOOTH, extra_jaw)   # lower row, points up
bm.verts.index_update()
extra_jaw_co = [v.co.copy() for v in extra_jaw]; extra_head_co = [v.co.copy() for v in extra_head]
bm.to_mesh(ob.data); bm.free()
ob.data.update()
# the jaw's vertices, read from the finished mesh (bmesh indices shift): the skin faces in the jaw region...
me0 = ob.data
skin_jaw = [p for p in me0.polygons if p.material_index == 0 and in_jaw(p.center)]
jaw_verts = {i for p in skin_jaw for i in p.vertices}
shared = jaw_verts & {i for p in me0.polygons if p.material_index == 0 and not in_jaw(p.center) for i in p.vertices}
print("JAW skin faces", len(skin_jaw), "verts", len(jaw_verts), "shared with head", len(shared))
assert not shared, "the jaw is still attached to the head"
# ...plus the mouth bag's lower corners and the lower teeth (matched by position, mouth/teeth materials only)
def by_co(cos):
    keys = {tuple(round(c, 5) for c in co) for co in cos}
    return {v.index for v in me0.vertices if v.index not in jaw_verts and tuple(round(c, 5) for c in v.co) in keys}
jaw_set = jaw_verts | by_co(extra_jaw_co)
head_set = by_co(extra_head_co)
assert not (jaw_set & head_set)

# ---------------------------------------------------------------------------------------------- armature
arm_data = bpy.data.armatures.new("hammerhead_rig"); arm = bpy.data.objects.new("hammerhead_rig", arm_data)
bpy.context.scene.collection.objects.link(arm)
bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode="EDIT")
eb = arm_data.edit_bones
def bone(name, h, t, parent=None, connect=False):
    b = eb.new(name); b.head = Vector(h); b.tail = Vector(t); b.roll = 0
    if parent: b.parent = eb[parent]; b.use_connect = connect
    return b
CHAIN = [("tail2", -0.5, -0.38), ("tail1", -0.38, -0.27), ("spine2", -0.27, -0.12), ("spine1", -0.12, 0.05), ("body", 0.05, 0.2), ("head", 0.2, 0.47)]
bone("body", (0.05, 0, 0), (0.2, 0, 0))
bone("head", (0.2, 0, 0), (0.47, 0, 0), "body", True)
bone("jaw", (HX, 0, HZ), (0.34, 0, -0.085), "head")
bone("spine1", (0.05, 0, 0), (-0.12, 0, 0), "body")
bone("spine2", (-0.12, 0, 0), (-0.27, 0, 0), "spine1", True)
bone("tail1", (-0.27, 0, 0), (-0.38, 0, 0), "spine2", True)
bone("tail2", (-0.38, 0, 0), (-0.5, 0, 0), "tail1", True)
# pectoral fins: from where each fin meets the body to its tip, measured on the mesh
me = ob.data
for side, s in (("L", 1), ("R", -1)):
    fv = [v.co for v in me.vertices if v.index not in jaw_set and v.index not in head_set and 0.05 < v.co.x < 0.32 and v.co.z < -0.09 and s * v.co.y > 0.045]
    tip = max(fv, key=lambda c: s * c.y + 0.3 * -c.z)
    base = Vector((sum(c.x for c in fv) / len(fv), s * 0.04, -0.075))
    print("FIN", side, len(fv), tuple(round(x, 3) for x in base), tuple(round(x, 3) for x in tip))
    bone("fin_" + side, base, tip, "body")
bpy.ops.object.mode_set(mode="OBJECT")

# ---------------------------------------------------------------------------------------------- weights
groups = {b.name: ob.vertex_groups.new(name=b.name) for b in arm_data.bones}
BLEND = 0.035
joints = sorted({c[1] for c in CHAIN} | {c[2] for c in CHAIN})
seg = {(lo, hi): n for n, a0, a1 in CHAIN for lo, hi in [(min(a0, a1), max(a0, a1))]}
segs = sorted(seg)
def chain_weights(x):
    """weights along the body: the segment x is in, blended with its neighbour within BLEND of a joint"""
    x = min(max(x, -0.5), 0.47)
    i = next(k for k, (lo, hi) in enumerate(segs) if lo <= x <= hi)
    lo, hi = segs[i]; w = {seg[segs[i]]: 1.0}
    for j, edge, other in ((i - 1, lo, -1), (i + 1, hi, 1)):
        if 0 <= j < len(segs) and abs(x - edge) < BLEND:
            k = 0.5 * (1 - abs(x - edge) / BLEND)
            w[seg[segs[i]]] -= k; w[seg[segs[j]]] = w.get(seg[segs[j]], 0) + k
    return w
fins = {s: (arm_data.bones["fin_" + s].head_local, arm_data.bones["fin_" + s].tail_local) for s in ("L", "R")}
for v in me.vertices:
    c = v.co
    if v.index in head_set: w = chain_weights(c.x)  # the bag's top and the upper teeth: as the skin around them
    elif v.index in jaw_set:
        # the jaw takes the head's share of the skin's own weights (the jaw is the head's child), so a shut jaw
        # deforms exactly like the cheek beside it whatever the head and body do: the seam never opens on a turn
        w = {("jaw" if n == "head" else n): x for n, x in chain_weights(c.x).items()}
    else:
        w = chain_weights(c.x)
        for s, sg in (("L", 1), ("R", -1)):  # pectoral fin: outside the body's side, below it
            h, t = fins[s]
            out = (sg * c.y - 0.045) / 0.04
            if 0.05 < c.x < 0.32 and c.z < -0.08 and out > 0:
                k = min(1.0, out)
                w = {n: x * (1 - k) for n, x in w.items()}; w["fin_" + s] = w.get("fin_" + s, 0) + k
    for n, x in w.items():
        if x > 0.001: groups[n].add([v.index], x, "REPLACE")
ob.parent = arm
mod = ob.modifiers.new("Armature", "ARMATURE"); mod.object = arm

bpy.ops.wm.save_as_mainfile(filepath=out_blend)
bpy.ops.object.select_all(action="DESELECT"); ob.select_set(True); arm.select_set(True)
bpy.ops.export_scene.gltf(filepath=out_glb, export_format="GLB", use_selection=True, export_skins=True, export_morph=True,
                          export_morph_normal=True, export_animations=False, export_yup=True, export_apply=False)
print("DONE", len(me.vertices), "verts", [b.name for b in arm_data.bones])
