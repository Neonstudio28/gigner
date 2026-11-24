import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, bmesh, lib
from mathutils import Matrix
lib.reset()
out = []
for n, col in (('crate_a', '#b08a55'), ('crate_b', '#3c6e9e')):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1, matrix=Matrix.Translation((0, 0, 0.5)))
    bmesh.ops.bevel(bm, geom=bm.edges[:], offset=0.05, segments=2, affect='EDGES')
    out.append(lib.to_object(n, bm, [lib.colour('paint', col)]))
lib.export('example', out)
lib.preview('example', out, samples=8, res=(640, 360))
