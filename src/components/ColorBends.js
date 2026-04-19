import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import './ColorBends.css';

const MAX_COLORS = 8;

const frag = `
#define MAX_COLORS ${MAX_COLORS}
uniform vec2 uCanvas;
uniform float uTime;
uniform float uSpeed;
uniform vec2 uRot;
uniform int uColorCount;
uniform vec3 uColors[MAX_COLORS];
uniform int uTransparent;
uniform float uScale;
uniform float uFrequency;
uniform float uWarpStrength;
uniform vec2 uPointer;
uniform float uMouseInfluence;
uniform float uParallax;
uniform float uNoise;
varying vec2 vUv;

void main() {
  float t = uTime * uSpeed;
  vec2 p = vUv * 2.0 - 1.0;
  p += uPointer * uParallax * 0.1;
  vec2 rp = vec2(p.x * uRot.x - p.y * uRot.y, p.x * uRot.y + p.y * uRot.x);
  vec2 q = vec2(rp.x * (uCanvas.x / uCanvas.y), rp.y);
  q /= max(uScale, 0.0001);
  q /= 0.5 + 0.2 * dot(q, q);
  q += 0.2 * cos(t) - 7.56;
  vec2 toward = (uPointer - rp);
  q += toward * uMouseInfluence * 0.55;

  vec3 col = vec3(0.0);
  float a = 1.0;

  if (uColorCount > 0) {
    vec2 s = q;
    vec3 sumCol = vec3(0.0);
    float cover = 0.0;
    for (int i = 0; i < MAX_COLORS; ++i) {
      if (i >= uColorCount) break;
      s -= 0.01;
      vec2 r = sin(1.5 * (s.yx * uFrequency) + 2.0 * cos(s * uFrequency));
      float m0 = length(r + sin(5.0 * r.y * uFrequency - 3.0 * t + float(i)) / 4.0);
      float kBelow = clamp(uWarpStrength, 0.0, 1.0);
      float kMix = pow(kBelow, 0.3);
      float gain = 1.0 + max(uWarpStrength - 1.0, 0.0);
      vec2 disp = (r - s) * kBelow;
      vec2 warped = s + disp * gain;
      float m1 = length(warped + sin(5.0 * warped.y * uFrequency - 3.0 * t + float(i)) / 4.0);
      float m = mix(m0, m1, kMix);
      float w = 1.0 - exp(-6.0 / exp(6.0 * m));
      sumCol += uColors[i] * w;
      cover = max(cover, w);
    }
    col = clamp(sumCol, 0.0, 1.0);
    a = uTransparent > 0 ? cover : 1.0;
  } else {
    vec2 s = q;
    for (int k = 0; k < 3; ++k) {
      s -= 0.01;
      vec2 r = sin(1.5 * (s.yx * uFrequency) + 2.0 * cos(s * uFrequency));
      float m0 = length(r + sin(5.0 * r.y * uFrequency - 3.0 * t + float(k)) / 4.0);
      float kBelow = clamp(uWarpStrength, 0.0, 1.0);
      float kMix = pow(kBelow, 0.3);
      float gain = 1.0 + max(uWarpStrength - 1.0, 0.0);
      vec2 disp = (r - s) * kBelow;
      vec2 warped = s + disp * gain;
      float m1 = length(warped + sin(5.0 * warped.y * uFrequency - 3.0 * t + float(k)) / 4.0);
      float m = mix(m0, m1, kMix);
      col[k] = 1.0 - exp(-6.0 / exp(6.0 * m));
    }
    a = uTransparent > 0 ? max(max(col.r, col.g), col.b) : 1.0;
  }

  if (uNoise > 0.0001) {
    float n = fract(sin(dot(gl_FragCoord.xy + vec2(uTime), vec2(12.9898, 78.233))) * 43758.5453123);
    col += (n - 0.5) * uNoise;
    col = clamp(col, 0.0, 1.0);
  }

  vec3 rgb = (uTransparent > 0) ? col * a : col;
  gl_FragColor = vec4(rgb, a);
}
`;

const vert = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

export default function ColorBends({
  className = '',
  style,
  rotation = 45,
  speed = 0.2,
  colors = [],
  color,
  transparent = true,
  autoRotate = 0,
  scale = 1,
  frequency = 1,
  warpStrength = 1,
  mouseInfluence = 1,
  parallax = 0.5,
  noise = 0.1
}) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const rafRef = useRef(null);
  const materialRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const intersectionObserverRef = useRef(null);
  const rotationRef = useRef(rotation);
  const autoRotateRef = useRef(autoRotate);
  const pointerTargetRef = useRef(new THREE.Vector2(0, 0));
  const pointerCurrentRef = useRef(new THREE.Vector2(0, 0));
  const pointerSmoothRef = useRef(8);
  const isVisibleRef = useRef(true);
  const isInViewportRef = useRef(true);
  const frameAccumulatorRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const geometry = new THREE.PlaneGeometry(2, 2);
    const uColorsArray = Array.from({ length: MAX_COLORS }, () => new THREE.Vector3(0, 0, 0));
    const material = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: {
        uCanvas: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uSpeed: { value: speed },
        uRot: { value: new THREE.Vector2(1, 0) },
        uColorCount: { value: 0 },
        uColors: { value: uColorsArray },
        uTransparent: { value: transparent ? 1 : 0 },
        uScale: { value: scale },
        uFrequency: { value: frequency },
        uWarpStrength: { value: warpStrength },
        uPointer: { value: new THREE.Vector2(0, 0) },
        uMouseInfluence: { value: mouseInfluence },
        uParallax: { value: parallax },
        uNoise: { value: noise }
      },
      premultipliedAlpha: true,
      transparent: true
    });
    materialRef.current = material;

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
      alpha: true
    });

    rendererRef.current = renderer;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isCoarsePointer ? 1.25 : 1.6));
    renderer.setClearColor(0x000000, transparent ? 0 : 1);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    const clock = new THREE.Clock();
    let rafId = null;
    const targetFps = isCoarsePointer ? 24 : 30;
    const targetFrameInterval = 1 / targetFps;
    const enablePointerEffects = mouseInfluence > 0 || parallax > 0;

    const shouldAnimate = () => isVisibleRef.current && isInViewportRef.current;

    const handleResize = () => {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      renderer.setSize(w, h, false);
      material.uniforms.uCanvas.value.set(w, h);
    };

    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState !== 'hidden';
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    handleResize();

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => {
          isInViewportRef.current = entries.some((entry) => entry.isIntersecting);
        },
        { threshold: 0.01 }
      );
      io.observe(container);
      intersectionObserverRef.current = io;
    }

    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(handleResize);
      ro.observe(container);
      resizeObserverRef.current = ro;
    } else {
      window.addEventListener('resize', handleResize);
    }

    const loop = () => {
      if (!shouldAnimate()) {
        clock.getDelta();
        rafId = requestAnimationFrame(loop);
        rafRef.current = rafId;
        return;
      }

      const dt = clock.getDelta();
      frameAccumulatorRef.current += dt;

      if (frameAccumulatorRef.current < targetFrameInterval) {
        rafId = requestAnimationFrame(loop);
        rafRef.current = rafId;
        return;
      }

      frameAccumulatorRef.current = 0;
      const elapsed = clock.elapsedTime;
      material.uniforms.uTime.value = elapsed;

      const deg = (rotationRef.current % 360) + autoRotateRef.current * elapsed;
      const rad = (deg * Math.PI) / 180;
      material.uniforms.uRot.value.set(Math.cos(rad), Math.sin(rad));

      if (enablePointerEffects) {
        const cur = pointerCurrentRef.current;
        const tgt = pointerTargetRef.current;
        const amt = Math.min(1, dt * pointerSmoothRef.current);
        cur.lerp(tgt, amt);
        material.uniforms.uPointer.value.copy(cur);
      }

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(loop);
      rafRef.current = rafId;
    };

    rafId = requestAnimationFrame(loop);
    rafRef.current = rafId;

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (intersectionObserverRef.current) intersectionObserverRef.current.disconnect();
      if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
      else window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();

      if (renderer.domElement && renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [frequency, mouseInfluence, noise, parallax, scale, speed, transparent, warpStrength]);

  useEffect(() => {
    const material = materialRef.current;
    const renderer = rendererRef.current;
    if (!material) return;

    rotationRef.current = rotation;
    autoRotateRef.current = autoRotate;
    material.uniforms.uSpeed.value = speed;
    material.uniforms.uScale.value = scale;
    material.uniforms.uFrequency.value = frequency;
    material.uniforms.uWarpStrength.value = warpStrength;
    material.uniforms.uMouseInfluence.value = mouseInfluence;
    material.uniforms.uParallax.value = parallax;
    material.uniforms.uNoise.value = noise;

    const toVec3 = (hex) => {
      const clean = (hex || '').replace('#', '').trim();
      const valid = /^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(clean) ? clean : '14b8a6';
      const parts = valid.length === 3
        ? [valid[0] + valid[0], valid[1] + valid[1], valid[2] + valid[2]]
        : [valid.slice(0, 2), valid.slice(2, 4), valid.slice(4, 6)];
      return new THREE.Vector3(
        parseInt(parts[0], 16) / 255,
        parseInt(parts[1], 16) / 255,
        parseInt(parts[2], 16) / 255
      );
    };

    const sourceColors = colors && colors.length ? colors : (color ? [color] : []);
    const arr = sourceColors.filter(Boolean).slice(0, MAX_COLORS).map(toVec3);

    for (let i = 0; i < MAX_COLORS; i += 1) {
      const vec = material.uniforms.uColors.value[i];
      if (i < arr.length) vec.copy(arr[i]);
      else vec.set(0, 0, 0);
    }

    material.uniforms.uColorCount.value = arr.length;
    material.uniforms.uTransparent.value = transparent ? 1 : 0;

    if (renderer) renderer.setClearColor(0x000000, transparent ? 0 : 1);
  }, [
    rotation,
    autoRotate,
    speed,
    scale,
    frequency,
    warpStrength,
    mouseInfluence,
    parallax,
    noise,
    colors,
    color,
    transparent
  ]);

  useEffect(() => {
    if (mouseInfluence <= 0 && parallax <= 0) {
      pointerTargetRef.current.set(0, 0);
      pointerCurrentRef.current.set(0, 0);
      return undefined;
    }

    const container = containerRef.current;
    if (!container) return undefined;

    const handlePointerMove = (event) => {
      const rect = container.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / (rect.width || 1)) * 2 - 1;
      const y = -(((event.clientY - rect.top) / (rect.height || 1)) * 2 - 1);
      pointerTargetRef.current.set(x, y);
    };

    const handlePointerLeaveWindow = () => pointerTargetRef.current.set(0, 0);

    container.addEventListener('pointermove', handlePointerMove, { passive: true });
    container.addEventListener('pointerleave', handlePointerLeaveWindow);

    return () => {
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeaveWindow);
    };
  }, [mouseInfluence, parallax]);

  return <div ref={containerRef} className={`color-bends-container ${className}`.trim()} style={style} />;
}
