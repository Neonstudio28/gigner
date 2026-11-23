import * as THREE from 'three';

const HEAD = /* glsl */ `
uniform float uWindowGlow;
varying vec3 vWinWorld;
varying vec2 vWinUv;
vec3 winGlow = vec3(0.0);
float iHash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
vec3 iPick(float h, vec3 a, vec3 b, vec3 c, vec3 d) { return h < 0.25 ? a : h < 0.5 ? b : h < 0.75 ? c : d; }
// ray vs box: returns the entry distance (or 1e9) and the face normal
float iBox(vec3 ro, vec3 rd, vec3 lo, vec3 hi, out vec3 n) {
  vec3 inv = 1.0 / rd;
  vec3 t0 = (lo - ro) * inv;
  vec3 t1 = (hi - ro) * inv;
  vec3 tn = min(t0, t1);
  vec3 tf = max(t0, t1);
  float a = max(max(tn.x, tn.y), tn.z);
  float b = min(min(tf.x, tf.y), tf.z);
  n = a == tn.x ? vec3(1.0, 0.0, 0.0) : a == tn.y ? vec3(0.0, 1.0, 0.0) : vec3(0.0, 0.0, 1.0);
  return a > 0.0 && a < b ? a : 1e9;
}
vec3 interiorColor() {
  vec2 code = floor(vWinUv);
  vec2 st = clamp((fract(vWinUv) - 0.25) * 2.0, 0.0, 1.0);
  vec3 dPx = dFdx(vWinWorld);
  vec3 dPy = dFdy(vWinWorld);
  vec2 dUx = dFdx(vWinUv);
  vec2 dUy = dFdy(vWinUv);
  float det = dUx.x * dUy.y - dUx.y * dUy.x;
  if (abs(det) < 1e-14) return vec3(0.12, 0.15, 0.18);
  vec3 T = (dPx * dUy.y - dPy * dUx.y) / det;
  vec3 B = (dPy * dUx.x - dPx * dUy.x) / det;
  float w = length(T) * 0.5;
  float h = length(B) * 0.5;
  T = normalize(T);
  B = normalize(B);
  vec3 N = normalize(cross(T, B));
  vec3 rdW = normalize(vWinWorld - cameraPosition);
  if (dot(N, rdW) > 0.0) N = -N;
  vec3 rd = vec3(dot(rdW, T), dot(rdW, B), -dot(rdW, N));
  rd += step(abs(rd), vec3(1e-4)) * 2e-4;
  vec3 ro = vec3(st.x * w, st.y * h, 0.0);
  // one seed per pane, from its lower-left corner
  vec3 corner = vWinWorld - T * ro.x - B * ro.y;
  float seed = iHash(floor(corner * 2.0 + 0.5));
  float s2 = fract(seed * 17.31);
  float s3 = fract(seed * 91.7);
  float s4 = fract(seed * 253.3);
  float style = code.x;
  float sill = code.y * 0.1;
  bool shop = style > 0.5 && style < 1.5;
  bool office = style > 1.5 && style < 2.5;
  bool shed = style > 2.5;
  float side = shop ? 2.5 : 0.6 + 1.6 * s2;
  float depth = shop ? 7.0 : shed ? 9.0 : 3.6 + 1.6 * s3;
  vec3 lo = vec3(-side * s4 - 0.3, -sill, 0.0);
  vec3 hi = vec3(w + side * (1.0 - s4) + 0.3, max(h + 0.35, 2.5 - sill), depth);
  // room shell
  vec3 tA = (mix(lo, hi, step(0.0, rd)) - ro) / rd;
  float t = min(min(tA.x, tA.y), tA.z);
  vec3 hit = ro + rd * t;
  vec3 wallC = iPick(seed, vec3(0.78, 0.72, 0.6), vec3(0.62, 0.68, 0.6), vec3(0.74, 0.66, 0.58), vec3(0.6, 0.66, 0.72));
  if (shop) wallC = iPick(seed, vec3(0.8, 0.77, 0.7), vec3(0.74, 0.7, 0.6), vec3(0.7, 0.74, 0.72), vec3(0.78, 0.7, 0.62));
  if (office) wallC = iPick(seed, vec3(0.74, 0.74, 0.7), vec3(0.68, 0.7, 0.66), vec3(0.76, 0.72, 0.64), vec3(0.66, 0.68, 0.7));
  if (shed) wallC = vec3(0.42, 0.4, 0.37);
  vec3 col;
  if (t == tA.y) {
    if (rd.y > 0.0) {
      col = vec3(0.82, 0.8, 0.76);
      // ceiling fixtures: fluorescent strips in shops and offices, one lamp at home
      vec2 q = hit.xz;
      float fx = (shop || office) ? step(abs(fract(q.y / 2.4) - 0.5), 0.07) * step(abs(fract(q.x / 3.0) - 0.5), 0.3) : step(length(q - vec2((lo.x + hi.x) * 0.5, depth * 0.5)), 0.28);
      col = mix(col, vec3(2.2, 2.1, 1.8), fx);
    } else {
      vec3 wood = mix(vec3(0.36, 0.25, 0.16), vec3(0.3, 0.2, 0.13), step(0.5, fract(hit.x * 2.2)));
      vec3 carpet = iPick(s3, vec3(0.34, 0.3, 0.26), vec3(0.3, 0.34, 0.3), vec3(0.4, 0.26, 0.22), vec3(0.28, 0.3, 0.36));
      vec2 tile = step(0.5, fract(hit.xz * 1.6));
      vec3 lino = mix(vec3(0.62, 0.6, 0.55), vec3(0.3, 0.3, 0.3), abs(tile.x - tile.y) * 0.55);
      col = shop ? lino : office ? carpet : shed ? vec3(0.34, 0.34, 0.33) : (s2 < 0.55 ? wood : carpet);
    }
  } else if (t == tA.x) {
    col = wallC * 0.86;
    if (shop) {
      // shelving down the side walls
      float yy = hit.y + sill;
      float shelf = step(yy, 2.0) * step(0.25, yy);
      vec2 cell = floor(vec2(hit.z * 3.0, yy * 2.6));
      vec3 goods = 0.35 + 0.6 * vec3(iHash(vec3(cell, seed)), iHash(vec3(cell, seed + 1.3)), iHash(vec3(cell, seed + 2.7)));
      col = mix(col, mix(goods, vec3(0.3, 0.24, 0.18), step(0.82, fract(yy * 2.6))), shelf);
    }
  } else {
    col = wallC;
    float yy = hit.y + sill;
    float bx = hit.x - lo.x;
    float bw = hi.x - lo.x;
    if (shop) {
      float shelf = step(yy, 2.1) * step(0.2, yy);
      vec2 cell = floor(vec2(bx * 3.2, yy * 2.6));
      vec3 goods = 0.3 + 0.65 * vec3(iHash(vec3(cell, seed)), iHash(vec3(cell, seed + 1.3)), iHash(vec3(cell, seed + 2.7)));
      col = mix(col, mix(goods, vec3(0.28, 0.22, 0.17), step(0.82, fract(yy * 2.6))), shelf);
    } else {
      // wainscot, a doorway and a framed picture on the back wall
      col = mix(col, wallC * 0.72, step(yy, 0.9) * (office ? 0.0 : step(0.5, s4)));
      float dx = bw * (0.2 + 0.6 * s3);
      float door = step(abs(bx - dx), 0.45) * step(yy, 2.05);
      col = mix(col, vec3(0.2, 0.15, 0.11), door);
      col = mix(col, vec3(0.12, 0.1, 0.09), step(abs(bx - dx), 0.38) * step(yy, 1.98) * step(0.5, s2));
      float px = bw * fract(s3 + 0.45);
      vec2 pd = abs(vec2(bx - px, yy - 1.55));
      float pic = step(pd.x, 0.42) * step(pd.y, 0.3) * (1.0 - door);
      col = mix(col, vec3(0.16, 0.12, 0.08), pic);
      col = mix(col, iPick(s4, vec3(0.5, 0.6, 0.7), vec3(0.7, 0.55, 0.4), vec3(0.45, 0.6, 0.45), vec3(0.75, 0.7, 0.55)), pic * step(pd.x, 0.36) * step(pd.y, 0.24));
    }
  }
  float tRoom = t;
  // furniture: a long low piece (sofa, counter, desk, workbench) and a tall one (bookcase, fridge, cabinet)
  vec3 n;
  float cx = mix(lo.x + 1.2, hi.x - 1.2, s2);
  float cz = shop ? 2.4 + 2.0 * s3 : 1.6 + 1.2 * s3;
  float lowH = shop ? 1.0 : office ? 0.76 : 0.5 + 0.3 * s4;
  vec3 sofa = iPick(s4, vec3(0.5, 0.26, 0.2), vec3(0.28, 0.36, 0.44), vec3(0.42, 0.4, 0.3), vec3(0.5, 0.42, 0.3));
  vec3 aLo = vec3(cx - (shop ? 1.6 : 1.0), -sill, cz);
  vec3 aHi = vec3(cx + (shop ? 1.6 : 1.0), -sill + lowH, cz + (shop ? 0.7 : 0.85));
  float ta = iBox(ro, rd, aLo, aHi, n);
  if (ta < t) {
    t = ta;
    vec3 fc = shop ? vec3(0.5, 0.36, 0.24) : office ? vec3(0.46, 0.34, 0.24) : sofa;
    col = fc * (n.y > 0.5 ? 1.15 : n.z > 0.5 ? 0.9 : 0.72);
  }
  // sofa back / till / monitor on top of it
  vec3 bLo = vec3(cx - (shop ? 0.25 : 1.0), -sill + lowH, cz + (shop ? 0.1 : 0.6));
  vec3 bHi = vec3(cx + (shop ? 0.25 : 1.0), -sill + lowH + (shop ? 0.4 : 0.42), cz + (shop ? 0.5 : 0.85));
  float tb = iBox(ro, rd, bLo, bHi, n);
  if (tb < t) {
    t = tb;
    vec3 fc = shop ? vec3(0.2, 0.2, 0.22) : office ? vec3(0.16, 0.17, 0.2) : sofa;
    col = fc * (n.y > 0.5 ? 1.15 : n.z > 0.5 ? 0.9 : 0.72);
  }
  float tx = s4 < 0.5 ? lo.x : hi.x - 0.5;
  vec3 cLo = vec3(tx, -sill, depth - 1.9 - 1.2 * s2);
  vec3 cHi = vec3(tx + 0.5, -sill + 1.9, depth - 0.5 - 1.2 * s2);
  float tc = iBox(ro, rd, cLo, cHi, n);
  if (tc < t && !shed) {
    t = tc;
    vec3 h2 = ro + rd * t;
    vec2 cell = floor(vec2(h2.z * 5.0, (h2.y + sill) * 3.0));
    vec3 books = 0.25 + 0.55 * vec3(iHash(vec3(cell, seed)), iHash(vec3(cell, seed + 4.0)), iHash(vec3(cell, seed + 9.0)));
    vec3 fc = office ? vec3(0.5, 0.52, 0.5) : s3 < 0.4 ? vec3(0.86, 0.86, 0.84) : mix(books, vec3(0.3, 0.2, 0.13), step(0.85, fract((h2.y + sill) * 3.0)));
    col = fc * (n.x > 0.5 ? 0.95 : 0.7);
  }
  // soft falloff into the room and contact shade near the floor
  vec3 p = ro + rd * t;
  col *= mix(1.0, 0.55, clamp(p.z / depth, 0.0, 1.0)) * (0.8 + 0.2 * smoothstep(0.0, 0.5, p.y + sill));
  if (t < tRoom) col *= 0.95;
  // lights: about half the homes after dark, most shops until closing, a few offices
  float lit = step(shop ? 0.3 : office ? 0.72 : 0.48, s3);
  // curtains and blinds hang on the glass itself
  float dress = shop || shed ? 1.0 : s2;
  vec3 cloth = iPick(s4, vec3(0.86, 0.82, 0.74), vec3(0.72, 0.5, 0.42), vec3(0.6, 0.66, 0.6), vec3(0.8, 0.78, 0.66));
  float cw = 0.14 + 0.2 * s3;
  if (dress < 0.5) {
    float e = min(st.x, 1.0 - st.x);
    if (e < cw) col = cloth * (0.75 + 0.25 * sin(st.x * w * 42.0));
    if (st.y > 0.9) col = cloth * 0.85;
  } else if (dress < 0.72 || office) {
    float drop = 0.25 + 0.55 * s4;
    if (st.y > 1.0 - drop) col = mix(vec3(0.84, 0.82, 0.76), vec3(0.5, 0.5, 0.46), step(0.7, fract(st.y * h * 14.0)));
  }
  // far away the room collapses to its average tone (no shimmer)
  float dist = length(vWinWorld - cameraPosition);
  col = mix(col, wallC * 0.6, smoothstep(140.0, 260.0, dist));
  // grazing views turn to reflection
  float fres = pow(1.0 - abs(dot(rdW, N)), 4.0);
  vec3 tone = shop || office ? vec3(1.0, 0.95, 0.85) : mix(vec3(1.0, 0.72, 0.42), vec3(1.0, 0.88, 0.66), s2);
  winGlow = col * tone * lit * (1.0 - 0.6 * fres);
  return col * (1.0 - 0.75 * fres);
}`;

/**
 * Interior-mapped window glass: every pane ray-casts a small furnished room behind it (walls, floor,
 * ceiling, furniture, curtains or blinds), so buildings read as inhabited without any extra geometry.
 * The pane's UVs carry the room style (integer part of u) and the height of the glass above the floor in
 * decimetres (integer part of v); the fractional parts span 0.25..0.75 across it. See `Kit.pane`.
 */
export function windowMaterial(glow: { value: number }): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.06, metalness: 0, envMapIntensity: 1.6 });
  m.onBeforeCompile = (s) => {
    s.uniforms.uWindowGlow = glow;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWinWorld;\nvarying vec2 vWinUv;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvWinUv = uv;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWinWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\n' + HEAD)
      // rooms sit in shade behind the glass
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= interiorColor() * 0.62;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += winGlow * (uWindowGlow * 0.95 + 0.05);');
  };
  m.customProgramCacheKey = () => 'pinehollow-window';
  return m;
}
