// schem_viewer_rt.js — 外置光追桥（Mini-HRR 接入层）
//
// 不复制、不修改 SHADER 项目的任何文件：运行时动态 import 它的 js/gl.js（WebGL2 工具库），
// fetch 它的 shaders/common.glsl（DDA 光追内核 + 天空），只在内存里做两处字符串补丁：
//   1. MAXSTEP 64 -> 1024（演示世界很小，schematic 场景大，光线要走更远）
//   2. voxelAt/albedoOf 的"程序化演示世界"替换为"采样 schematic 3D 纹理"
//      —— 这正是他 README 里 SEUS HRR 的做法：运行时把方块世界烘进 3D 体素结构。
// traceDDA / sky（v1 已验证的心脏）原样使用。着色（太阳+光追阴影+天空环境光+反射）
// 在本文件的 frag 里实现，不用他的 shadeSurface（那里面有个演示用的写死点光源）。
//
// 依赖路径：V2.0/external/mini-hrr 是指向 D:\PROJECTS\01_ACTIVE_当前项目\SHADER 的 junction。

const HRR = new URL('../../external/mini-hrr/rt2/', import.meta.url).href;

const HEADER = `#version 300 es
precision highp float;
precision highp int;
`;

// 在 common.glsl 之前注入的声明（补丁后的 voxelAt/albedoOf 会用到）
const PRELUDE = `
uniform highp sampler3D uVoxTex;   // rgb=方块颜色, a*255=材质类别(0空气/1漫反射/3水玻璃/6发光/7金属)
uniform ivec3 uGrid;               // 模型尺寸 W,H,L
uniform vec3  uClipV;              // 剖切(体素坐标, 超过即视为空气)
`;

const VOXEL_AT = `int voxelAt(ivec3 p){
  if (p.y == -1) return 9;                              // 无限地面(接住影子)
  if (p.x < 0 || p.y < 0 || p.z < 0 ||
      p.x >= uGrid.x || p.y >= uGrid.y || p.z >= uGrid.z) return 0;
  if (float(p.x) > uClipV.x || float(p.y) > uClipV.y || float(p.z) > uClipV.z) return 0;
  return int(texelFetch(uVoxTex, p, 0).a * 255.0 + 0.5);
}`;

const ALBEDO_OF = `vec3 albedoOf(int m, ivec3 p){
  if (m == 9)                                            // 地面:淡色棋盘
    return ((p.x + p.z) & 1) == 0 ? vec3(0.62,0.63,0.62) : vec3(0.52,0.53,0.52);
  vec3 c = texelFetch(uVoxTex, p, 0).rgb;
  return c * c;                                          // sRGB→线性 近似
}`;

// 本桥自己的着色 pass：主光线 + 光追阴影 + 天空环境光 + 水/金属反射(Schlick)
const FRAG_MAIN = `
uniform vec2 uRes;
uniform vec3 uCamPos, uCamRt, uCamUp, uCamFw;
uniform vec3 uSunDir;
out vec4 fragColor;

vec3 lit(int m, vec3 pos, vec3 nrm, ivec3 cell){
  vec3 alb = albedoOf(m, cell);
  if (m == 6) return alb * 3.0;                          // 发光块
  float diff = max(dot(nrm, uSunDir), 0.0);
  if (diff > 0.0){                                       // 光追阴影
    vec3 hp, hn; ivec3 hc;
    if (traceDDA(pos + nrm*0.002, uSunDir, hp, hn, hc) != 0) diff = 0.0;
  }
  vec3 ambient = sky(normalize(nrm + vec3(0.0,1.0,0.0)), uSunDir) * 0.38;
  return alb * (vec3(1.0,0.93,0.80) * 1.5 * diff + ambient);
}

void main(){
  vec2 ndc = (gl_FragCoord.xy * 2.0 - uRes) / uRes.y;
  vec3 ro = uCamPos;
  vec3 rd = normalize(uCamFw * FOCAL + uCamRt * ndc.x + uCamUp * ndc.y);
  vec3 hp, hn; ivec3 hc;
  int m = traceDDA(ro, rd, hp, hn, hc);
  vec3 col;
  if (m == 0) col = sky(rd, uSunDir);
  else {
    col = lit(m, hp, hn, hc);
    if (m == 3 || m == 7){                               // 水/玻璃(3)、金属(7):追一条反射线
      vec3 rrd = reflect(rd, hn);
      vec3 rp, rn; ivec3 rc;
      int rm = traceDDA(hp + hn*0.002, rrd, rp, rn, rc);
      vec3 rcol = (rm == 0) ? sky(rrd, uSunDir) : lit(rm, rp, rn, rc);
      float f0 = (m == 7) ? 0.6 : 0.05;
      float fr = f0 + (1.0 - f0) * pow(1.0 - max(dot(-rd, hn), 0.0), 5.0);
      col = mix(col, rcol, clamp(fr, 0.0, 1.0));
    }
  }
  col = col / (col + 1.0);                               // Reinhard(与 rt2 final.frag 一致)
  col = pow(col, vec3(1.0/2.2));
  fragColor = vec4(col, 1.0);
}
`;

// 花括号配对替换整个函数体(签名在 ARCHITECTURE.md §5 里钉死,可放心定位)
function replaceFn(src, sig, replacement) {
  const i = src.indexOf(sig);
  if (i < 0) throw new Error('common.glsl 中未找到签名: ' + sig);
  let k = src.indexOf('{', i), depth = 0;
  for (; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}') { depth--; if (!depth) { k++; break; } }
  }
  return src.slice(0, i) + replacement + src.slice(k);
}

export async function createRT(canvas) {
  const glu = await import(HRR + 'js/gl.js');            // 他的 WebGL2 工具库(ES module)
  const [vert, commonRaw] = await Promise.all([
    fetch(HRR + 'shaders/fullscreen.vert').then(r => { if (!r.ok) throw new Error('fullscreen.vert HTTP ' + r.status); return r.text(); }),
    fetch(HRR + 'shaders/common.glsl').then(r => { if (!r.ok) throw new Error('common.glsl HTTP ' + r.status); return r.text(); }),
  ]);
  let common = commonRaw.replace(/const\s+int\s+MAXSTEP\s*=\s*\d+\s*;/, 'const int   MAXSTEP  = 1024;');
  common = replaceFn(common, 'int voxelAt(ivec3 p)', VOXEL_AT);
  common = replaceFn(common, 'vec3 albedoOf(int m, ivec3 p)', ALBEDO_OF);

  const gl = glu.createContext(canvas);
  const prog = glu.createProgram(gl, vert, HEADER + PRELUDE + common + FRAG_MAIN);
  const draw = glu.createFullscreenTriangle(gl);
  const U = glu.getUniforms(gl, prog,
    ['uRes', 'uCamPos', 'uCamRt', 'uCamUp', 'uCamFw', 'uSunDir', 'uVoxTex', 'uGrid', 'uClipV']);
  gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);

  let voxTex = null, grid = [1, 1, 1];

  return {
    gl,
    // 把统一模型烘成 3D 纹理。classify(paletteIdx) -> {rgb:[r,g,b 0-255], cls:0|1|3|6|7}
    uploadModel(model, classify) {
      const { W, H, L, data } = model;
      grid = [W, H, L];
      const buf = new Uint8Array(W * H * L * 4);
      const WL = W * L, WH = W * H;
      for (let y = 0; y < H; y++) for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
        const v = classify(data[x + z * W + y * WL]);
        const o = (x + y * W + z * WH) * 4;               // texImage3D 布局: x + y*W + z*W*H
        buf[o] = v.rgb[0]; buf[o + 1] = v.rgb[1]; buf[o + 2] = v.rgb[2]; buf[o + 3] = v.cls;
      }
      if (voxTex) gl.deleteTexture(voxTex);
      voxTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_3D, voxTex);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
      gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, W, H, L, 0, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    },
    // eye/target: 世界坐标; clip: [x,y,z] 体素上限; sunAngle: 弧度
    render(eye, target, clip, sunAngle) {
      if (!voxTex) return;
      // 内部分辨率: 高度封顶 540(继承 rt2 的教学决策), CSS 拉伸显示
      const ch = Math.max(1, canvas.clientHeight), cw = Math.max(1, canvas.clientWidth);
      const h = Math.min(540, ch), w = Math.round(cw * h / ch);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);

      // 相机基向量(ARCHITECTURE.md §4: JS 算好传入, shader 不自己 cross)
      const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
      const norm = v => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
      const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
      const fw = norm(sub(target, eye));
      const rt = norm(cross(fw, [0, 1, 0]));
      const up = cross(rt, fw);
      const sun = norm([Math.cos(sunAngle) * 0.6, 0.75, Math.sin(sunAngle) * 0.6]);

      gl.useProgram(prog);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_3D, voxTex);
      gl.uniform1i(U.uVoxTex, 0);
      gl.uniform2f(U.uRes, w, h);
      gl.uniform3f(U.uCamPos, ...eye);
      gl.uniform3f(U.uCamRt, ...rt);
      gl.uniform3f(U.uCamUp, ...up);
      gl.uniform3f(U.uCamFw, ...fw);
      gl.uniform3f(U.uSunDir, ...sun);
      gl.uniform3i(U.uGrid, ...grid);
      gl.uniform3f(U.uClipV, ...clip);
      draw();
    },
  };
}
