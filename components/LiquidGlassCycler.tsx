import React, { useEffect, useRef } from 'react';

// WebGL shaders — liquid glass bubble transition (extracted from InnPage hero).
// Same visual as the Inn page's hero. Pass an array of image URLs; the component
// renders a full-bleed canvas that cycles through them every `intervalMs`.

const HW_VERT = `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;

const HW_FRAG = `
  uniform sampler2D uT1, uT2;
  uniform float uP, uF1, uF2;
  uniform vec2 uR, uS1, uS2;
  varying vec2 vUv;

  // Cover-fit UVs with a per-image horizontal focal point (fx: 0=left, .5=centre,
  // 1=right); vertical stays centred. Keeps each photo's subject in frame when a
  // narrow (portrait) viewport crops the sides.
  vec2 cv(vec2 uv, vec2 ts, float fx) {
    vec2 s = uR / ts;
    float sc = max(s.x, s.y);
    vec2 scaled = ts * sc;
    vec2 off = (uR - scaled) * vec2(fx, 0.5); // CSS object-position: 0=left, .5=centre, 1=right
    return (uv * uR - off) / scaled;
  }

  void main() {
    float time = uP * 5.0;
    vec2 u1 = cv(vUv, uS1, uF1); vec2 u2 = cv(vUv, uS2, uF2);
    float maxR = length(uR) * 0.85; float br = uP * maxR;
    vec2 p = vUv * uR; vec2 c = uR * 0.5;
    float d = length(p - c); float nd = d / max(br, 0.001);
    float param = smoothstep(br + 3.0, br - 3.0, d);
    vec4 img;
    if (param > 0.0) {
      float ro = 0.08 * pow(smoothstep(0.3, 1.0, nd), 1.5);
      vec2 dir = (d > 0.0) ? (p - c) / d : vec2(0.0);
      vec2 distUV = u2 - dir * ro;
      distUV += vec2(sin(time + nd * 10.0), cos(time * 0.8 + nd * 8.0)) * 0.015 * nd * param;
      float ca = 0.02 * pow(smoothstep(0.3, 1.0, nd), 1.2);
      img = vec4(
        texture2D(uT2, distUV + dir * ca * 1.2).r,
        texture2D(uT2, distUV + dir * ca * 0.2).g,
        texture2D(uT2, distUV - dir * ca * 0.8).b,
        1.0
      );
      float rim = smoothstep(0.95, 1.0, nd) * (1.0 - smoothstep(1.0, 1.01, nd));
      img.rgb += rim * 0.08;
    } else { img = texture2D(uT2, u2); }
    vec4 old = texture2D(uT1, u1);
    if (uP > 0.95) img = mix(img, texture2D(uT2, u2), (uP - 0.95) / 0.05);
    gl_FragColor = mix(old, img, param);
  }
`;

interface LiquidGlassCyclerProps {
  images: string[];
  focus?: number[]; // per-image horizontal focal point 0..1 (default 0.5 = centred)
  intervalMs?: number;
  className?: string;
}

export const LiquidGlassCycler: React.FC<LiquidGlassCyclerProps> = ({
  images,
  focus,
  intervalMs = 5000,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cssBgRef = useRef<HTMLDivElement>(null);
  const cssFallback = useRef(false);

  useEffect(() => {
    let dead = false;
    const fx = (i: number) => focus?.[i] ?? 0.5; // horizontal focal point per image
    let renderer: any, scene: any, camera: any, mat: any;
    let txs: any[] = [], blobUrls: string[] = [];
    let cur = 0, transitioning = false;
    let auto: ReturnType<typeof setInterval> | null = null;

    const loadScript = (src: string, g: string): Promise<void> =>
      new Promise((res, rej) => {
        if ((window as any)[g]) { res(); return; }
        if (document.querySelector(`script[src="${src}"]`)) {
          const t = setInterval(() => { if ((window as any)[g]) { clearInterval(t); res(); } }, 50);
          setTimeout(() => { clearInterval(t); rej(new Error(`Timeout ${g}`)); }, 10000);
          return;
        }
        const s = document.createElement('script');
        s.src = src; s.onload = () => setTimeout(res, 80); s.onerror = () => rej(new Error(src));
        document.head.appendChild(s);
      });

    const fetchBlobUrl = async (src: string): Promise<string | null> => {
      try {
        const r = await fetch(`https://images.weserv.nl/?url=${encodeURIComponent(src)}`, { mode: 'cors' });
        if (!r.ok) return null;
        return URL.createObjectURL(await r.blob());
      } catch { return null; }
    };

    const loadTex = (url: string): Promise<any> =>
      new Promise(res => {
        const img = new Image();
        img.onload = () => {
          try {
            const THREE = (window as any).THREE;
            const t = new THREE.Texture(img);
            t.minFilter = t.magFilter = THREE.LinearFilter;
            t.needsUpdate = true;
            t.userData = { size: new THREE.Vector2(img.naturalWidth || img.width, img.naturalHeight || img.height) };
            res(t);
          } catch { res(null); }
        };
        img.onerror = () => res(null);
        img.src = url;
      });

    const initCSSFallback = (imgs: string[]) => {
      if (cssFallback.current) return;
      cssFallback.current = true;
      const canvas = canvasRef.current;
      if (canvas) canvas.style.display = 'none';
      const bg = cssBgRef.current;
      if (!bg) return;
      bg.style.display = 'block';
      imgs.forEach((src, i) => {
        const sl = document.createElement('div');
        sl.style.cssText = `position:absolute;inset:0;background:url(${src}) ${(fx(i) * 100).toFixed(1)}% center/cover no-repeat;opacity:${i === 0 ? 1 : 0};transition:opacity 1.8s ease;`;
        bg.appendChild(sl);
      });
      const slides = bg.querySelectorAll<HTMLElement>('div');
      let cssIdx = 0;
      if (auto) clearInterval(auto);
      auto = setInterval(() => {
        if (dead) return;
        slides[cssIdx].style.opacity = '0';
        cssIdx = (cssIdx + 1) % slides.length;
        slides[cssIdx].style.opacity = '1';
      }, intervalMs);
    };

    const doTransition = (next: number) => {
      const THREE = (window as any).THREE;
      const gsap = (window as any).gsap;
      if (transitioning || !mat || txs.length < 2 || next === cur || !THREE || !gsap) return;
      transitioning = true;
      const f = txs[cur], t = txs[next];
      mat.uniforms.uT1.value = f; mat.uniforms.uT2.value = t;
      mat.uniforms.uS1.value = f.userData.size; mat.uniforms.uS2.value = t.userData.size;
      mat.uniforms.uF1.value = fx(cur); mat.uniforms.uF2.value = fx(next);
      gsap.fromTo(mat.uniforms.uP, { value: 0 }, {
        value: 1, duration: 2.5, ease: 'power2.inOut',
        onComplete() {
          mat.uniforms.uT1.value = t; mat.uniforms.uS1.value = t.userData.size;
          mat.uniforms.uF1.value = fx(next);
          mat.uniforms.uP.value = 0; cur = next; transitioning = false;
        },
      });
    };

    const startAuto = () => {
      if (auto) clearInterval(auto);
      auto = setInterval(() => {
        if (!dead) doTransition((cur + 1) % Math.max(txs.length, 1));
      }, intervalMs);
    };

    const init = async () => {
      try {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js', 'gsap');
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', 'THREE');
      } catch { return; }
      if (dead) return;

      const THREE = (window as any).THREE;
      const canvas = canvasRef.current;
      if (!canvas || !THREE) return;

      const W = canvas.clientWidth || window.innerWidth;
      const H = canvas.clientHeight || window.innerHeight;

      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      mat = new THREE.ShaderMaterial({
        uniforms: {
          uT1: { value: null }, uT2: { value: null }, uP: { value: 0 },
          uF1: { value: 0.5 }, uF2: { value: 0.5 },
          uR: { value: new THREE.Vector2(W, H) },
          uS1: { value: new THREE.Vector2(1, 1) }, uS2: { value: new THREE.Vector2(1, 1) },
        },
        vertexShader: HW_VERT, fragmentShader: HW_FRAG,
      });
      scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));

      // Render loop — pauses when canvas is offscreen so the WebGL draw doesn't
      // contend for main-thread time with the rest of the page (caused ~12fps idle
      // on sections far below the hero).
      let visible = true;
      let rafLoopId = 0;
      const loop = () => {
        if (dead) return;
        rafLoopId = requestAnimationFrame(loop);
        if (!visible) return;
        if (renderer && scene && camera) renderer.render(scene, camera);
      };
      const io = new IntersectionObserver((entries) => {
        visible = entries[0]?.isIntersecting ?? true;
      }, { threshold: 0.01 });
      if (canvas) io.observe(canvas);
      loop();
      // Cleanup helpers captured by outer cleanup closure
      (mat as any).__cleanup = () => { io.disconnect(); cancelAnimationFrame(rafLoopId); };

      let glStarted = false;
      const tryGL = () => {
        if (glStarted || !txs[0] || !txs[1]) return;
        glStarted = true;
        mat.uniforms.uT1.value = txs[0]; mat.uniforms.uT2.value = txs[1];
        mat.uniforms.uS1.value = txs[0].userData.size; mat.uniforms.uS2.value = txs[1].userData.size;
        mat.uniforms.uF1.value = fx(0); mat.uniforms.uF2.value = fx(1);
        startAuto();
      };

      await Promise.all(images.map(async (src, i) => {
        if (dead) return;
        const blobUrl = await fetchBlobUrl(src);
        if (blobUrl && !dead) {
          blobUrls.push(blobUrl);
          const t = await loadTex(blobUrl);
          if (t && !dead) { txs[i] = t; tryGL(); }
        }
      }));

      if (!glStarted) initCSSFallback(images);

      const onResize = () => {
        if (!renderer || !mat || !canvas) return;
        const nW = canvas.clientWidth || window.innerWidth;
        const nH = canvas.clientHeight || window.innerHeight;
        renderer.setSize(nW, nH);
        mat.uniforms.uR.value.set(nW, nH);
      };
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    };

    init();

    return () => {
      dead = true;
      if (auto) clearInterval(auto);
      try { (mat as any)?.__cleanup?.(); } catch {}
      blobUrls.forEach(u => URL.revokeObjectURL(u));
      txs.forEach(t => t?.dispose?.());
      if (renderer) renderer.dispose();
    };
  }, [images.join('|'), (focus ?? []).join(','), intervalMs]);

  return (
    <div className={`absolute inset-0 ${className}`} style={{ background: '#0a0808' }}>
      {/* CSS fallback layer (hidden until WebGL fails) */}
      <div ref={cssBgRef} style={{ display: 'none', position: 'absolute', inset: 0, zIndex: 1 }} />
      {/* WebGL canvas */}
      <canvas
        ref={canvasRef}
        style={{ display: 'block', position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1 }}
      />
    </div>
  );
};
