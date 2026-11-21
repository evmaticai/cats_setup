# Dive Cats 2: turn a downloaded fish GLB into a PS1 low-poly fish for the three.js film.
# blender -b --factory-startup -P lowpoly_fish.py -- <in.glb> <out.glb> <faces> [flip]   (faces 0 = keep mesh + textures, -N = keep textures, cut to N faces)
# Steps: import, pose the rest (armatures applied, then removed), join all meshes, decimate to <faces>,
# bake the texture into one flat colour per face (sampled at the face centre), normalise: length 1 along X,
# centred, nose toward +X (the long axis is found from the bounding box; "flip" turns it 180 degrees when the
# automatic nose guess is wrong), and export geometry + vertex colours only (no textures, no rig).
import sys, bpy, bmesh, numpy as np
from mathutils import Vector, Matrix

a = sys.argv[sys.argv.index("--") + 1:]
src, dst, faces = a[0], a[1], int(a[2])
flip = len(a) > 3 and a[3] == "flip"

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
scene_obs = list(bpy.context.scene.objects)  # not the importer's bone-shape icospheres
for ob in scene_obs:
    if ob.type == "MESH":
        for m in list(ob.modifiers):  # rigs: apply the rest pose, then the armature goes
            try:
                with bpy.context.temp_override(object=ob, active_object=ob, selected_objects=[ob], selected_editable_objects=[ob]):
                    bpy.ops.object.modifier_apply(modifier=m.name)
            except Exception as e:
                print("APPLY FAILED", ob.name, e); ob.modifiers.remove(m)
meshes = [o for o in scene_obs if o.type == "MESH" and len(o.data.polygons)]
big = max(max(o.dimensions) for o in meshes)
meshes = [o for o in meshes if max(o.dimensions) > big * 0.15 or len(o.data.polygons) >= 200]  # drop a scan's colour-checker card
for o in [o for o in scene_obs if o.type == "MESH" and o not in meshes]: bpy.data.objects.remove(o)
# every mesh into world space, unparented
for ob in meshes:
    mw = ob.matrix_world.copy(); ob.parent = None; ob.matrix_world = mw
for ob in list(bpy.data.objects):
    if ob not in meshes: bpy.data.objects.remove(ob)
bpy.ops.object.select_all(action="DESELECT")
for ob in meshes: ob.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1: bpy.ops.object.join()
ob = bpy.context.view_layer.objects.active
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
me = ob.data

keep = faces <= 0  # 0 = keep the model as made: its mesh, UVs and textures (only turned and scaled)
if faces < 0 and len(me.polygons) > -faces:  # -N = keep the textures but cut the mesh to about N faces (a heavy sculpt)
    d = ob.modifiers.new("dec", "DECIMATE"); d.ratio = -faces / len(me.polygons)
    bpy.ops.object.modifier_apply(modifier="dec"); me = ob.data
if not keep:
  # per-face colour from the material's base-colour texture (or its flat colour), sampled before decimation
  def tex_of(mat):
      if not mat or not mat.use_nodes: return None, (0.6, 0.6, 0.6)
      bsdf = next((n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
      if not bsdf:  # unlit scans: the image node feeds an emission shader
          n = next((n for n in mat.node_tree.nodes if n.type == "TEX_IMAGE" and n.image), None)
          if not n: return None, (0.6, 0.6, 0.6)
          im = n.image; w, h = im.size
          return np.array(im.pixels[:], dtype=np.float32).reshape(h, w, im.channels)[:, :, :3], (0.6, 0.6, 0.6)
      inp = bsdf.inputs["Base Color"]
      col = tuple(inp.default_value[:3])
      for l in inp.links:
          n = l.from_node
          while n and n.type != "TEX_IMAGE" and n.inputs:
              nxt = next((i.links[0].from_node for i in n.inputs if i.is_linked), None); n = nxt
          if n and n.type == "TEX_IMAGE" and n.image:
              im = n.image; w, h = im.size
              px = np.array(im.pixels[:], dtype=np.float32).reshape(h, w, im.channels)[:, :, :3]
              return px, col
      return None, col
  texs = [tex_of(s.material) for s in ob.material_slots] or [(None, (0.6, 0.6, 0.6))]

  uv = me.uv_layers.active
  fc = np.zeros((len(me.polygons), 3), np.float32)
  vc = me.color_attributes.active_color if len(me.color_attributes) else None  # scans: colour per vertex, no texture
  for p in me.polygons:
      if vc is not None and texs[min(p.material_index, len(texs) - 1)][0] is None:
          if vc.domain == "CORNER": c = sum((Vector(vc.data[li].color[:3]) for li in p.loop_indices), Vector()) / p.loop_total
          else: c = sum((Vector(vc.data[me.loops[li].vertex_index].color[:3]) for li in p.loop_indices), Vector()) / p.loop_total
          fc[p.index] = c[:]; continue
      px, col = texs[min(p.material_index, len(texs) - 1)]
      if px is None or uv is None: fc[p.index] = col; continue
      u = sum(uv.data[li].uv.x for li in p.loop_indices) / p.loop_total
      v = sum(uv.data[li].uv.y for li in p.loop_indices) / p.loop_total
      h, w = px.shape[:2]
      fc[p.index] = px[int((v % 1) * (h - 1)), int((u % 1) * (w - 1))]
  # keep the colour through decimation: a face colour attribute (decimate interpolates corner data)
  attr = me.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
  for p in me.polygons:
      for li in p.loop_indices: attr.data[li].color = (*fc[p.index], 1.0)

  # scans come as loose triangles (split at every UV seam): weld them first or the decimation stalls
  if len(me.polygons) > 50000:  # only scans need welding
      bm = bmesh.new(); bm.from_mesh(me)
      bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=max(ob.dimensions) * 0.002)
      bm.to_mesh(me); bm.free()
  for _ in range(3):
    if len(me.polygons) <= faces * 1.1: break
    d = ob.modifiers.new("dec", "DECIMATE"); d.ratio = faces / len(me.polygons)
    bpy.ops.object.modifier_apply(modifier="dec")
  me = ob.data
  if len(me.polygons) > faces * 2:
      # scans (millions of loose triangles) will not decimate: rebuild the surface with a voxel remesh, decimate
      # that, then take each new face's colour from the nearest face of the original
      from mathutils.bvhtree import BVHTree
      src_bm = bmesh.new(); src_bm.from_mesh(me); src_bm.faces.ensure_lookup_table()
      tree = BVHTree.FromBMesh(src_bm)
      cattr = me.color_attributes["Col"]
      fcol = [Vector(cattr.data[p.loop_indices[0]].color[:3]) for p in me.polygons]
      r = ob.modifiers.new("rm", "REMESH"); r.mode = "VOXEL"; r.voxel_size = max(ob.dimensions) / 140
      bpy.ops.object.modifier_apply(modifier="rm")
      d = ob.modifiers.new("dec", "DECIMATE"); d.ratio = faces / max(1, len(ob.data.polygons))
      bpy.ops.object.modifier_apply(modifier="dec")
      me = ob.data
      if "Col" not in me.color_attributes: me.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
      cattr = me.color_attributes["Col"]
      for p in me.polygons:
          hit = tree.find_nearest(p.center)
          c = fcol[hit[2]] if hit[2] is not None else Vector((0.6, 0.6, 0.6))
          for li in p.loop_indices: cattr.data[li].color = (*c, 1.0)
      src_bm.free()
      print("REMESHED", len(me.polygons))
  bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.triangulate(bm, faces=bm.faces); bm.to_mesh(me); bm.free()

  # flat colour per face (average of its corners): the PS1 look
  attr = me.color_attributes["Col"]
  me.color_attributes.active_color = attr
  for p in me.polygons:
      c = sum((Vector(attr.data[li].color[:3]) for li in p.loop_indices), Vector()) / p.loop_total
      for li in p.loop_indices: attr.data[li].color = (*c, 1.0)

# normalise: long axis -> X, length 1, centred; nose = the thicker end (the tail end is thin, then the fin)
V = np.array([v.co[:] for v in me.vertices])
ext = V.max(0) - V.min(0); ax = int(np.argmax(ext))
order = [ax] + [i for i in range(3) if i != ax]
up = 2 if 2 in order[1:] else 1  # glTF imports Y-up as Blender Z-up: keep Blender Z as "up"
side = [i for i in range(3) if i not in (ax, up)][0]
c = (V.max(0) + V.min(0)) / 2; L = ext[ax]
X = (V[:, ax] - c[ax]) / L
thick = lambda m: np.ptp(V[m][:, up]) if m.sum() > 3 else 0
s = 1.0 if thick((X > 0.2) & (X < 0.35)) >= thick((X < -0.2) & (X > -0.35)) else -1.0
if flip: s = -s
for v in me.vertices:
    p = v.co
    x, y, z = (p[ax] - c[ax]) / L * s, (p[up] - c[up]) / L, (p[side] - c[side]) / L * s
    v.co = Vector((x, -z, y))  # Blender (x, y, z) with z up -> glTF exports z as +Y
ob.location = (0, 0, 0)
if not keep:
    me.materials.clear()
    mat = bpy.data.materials.new("fish"); me.materials.append(mat)
print("FISH", src.split("/")[-1], "faces", len(me.polygons), "ext", ext.round(3).tolist(), "axis", ax, "nose", s)
if keep:
    bpy.ops.export_scene.gltf(filepath=dst, export_format="GLB", use_selection=False, export_materials="EXPORT",
                              export_animations=False, export_skins=False)
else:
    bpy.ops.export_scene.gltf(filepath=dst, export_format="GLB", use_selection=False, export_materials="NONE",
                              export_vertex_color="ACTIVE", export_all_vertex_colors=False, export_animations=False, export_skins=False)
