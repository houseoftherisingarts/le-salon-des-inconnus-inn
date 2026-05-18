// HighsTestPage — premium scrollytelling intro to the Creator Studio.
//
// "Going into a world." A WebGL cosmic-tunnel shader fills the entire
// viewport and serves as the always-visible environment (the world). A
// sparse 3D card flythrough (10 cards along Z) layers above it — camera
// scroll-driven through the cards (Tympanus-style). Capability copy and
// hero typography overlay as HTML. The journey ends arriving at a large
// hextech portal.
//
// Stack
//   • GSAP ScrollTrigger scrubs progressRef from 0 → 1.
//   • react-three-fiber: shader plane, 3D card flythrough, hextech portal.
//   • All HTML overlays are sparse — one moment visible at a time, big
//     breathing room. The world (shader + flythrough) is the constant.
//
// Reference shader adapted from the tunnel-flow GLSL ES 3.0 sample, ported
// to GLSL ES 1.0 for three.js ShaderMaterial and tinted to the Studio's
// NEON ARCADE palette.

import React, { useEffect, useRef, useMemo, useState, Suspense } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface HighsTestPageProps {
    onEnterStudio: () => void;
    onBack: () => void;
}

// ── Palette: Creator Studio's default NEON ARCADE theme ─────────────────
const C = {
    base:    '#050505',
    fuchsia: '#e879f9',  // fuchsia-400
    cyan:    '#22d3ee',  // cyan-400
    yellow:  '#fde047',  // yellow-300
    purple:  '#a855f7',  // purple-500
    pink:    '#f472b6',  // pink-400
    cream:   '#f0e6d2',  // hextech ivory accent
};

// ── Reliable artwork pool (Picsum proxied through wsrv for CORS) ────────
const wsrv = (url: string) =>
    `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=720&h=960&fit=cover&output=jpg&q=82`;

const ARTWORK_URLS: string[] = Array.from({ length: 12 }, (_, i) =>
    wsrv(`https://picsum.photos/seed/sdi-hs3-${String(i + 1).padStart(2, '0')}/900/1200`)
);

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const seg = (p: number, start: number, end: number) =>
    end <= start ? (p >= end ? 1 : 0) : clamp01((p - start) / (end - start));
const smoothstep = (a: number, b: number, x: number) => {
    const t = clamp01((x - a) / (b - a));
    return t * t * (3 - 2 * t);
};

// ─────────────────────────────────────────────────────────────────────────
// CosmicTunnel — the world. Fragment shader adapted from a Codrops/X
// reference and ported to GLSL ES 1.0. Produces a continuously-flowing
// neon caustic field with the appearance of forward motion. Time advances
// even when scroll is still, so the world breathes; scroll adds extra
// forward momentum via uProgress.
// ─────────────────────────────────────────────────────────────────────────
function CosmicTunnel({ progressRef }: { progressRef: React.MutableRefObject<number> }) {
    const matRef = useRef<THREE.ShaderMaterial>(null);
    const { size } = useThree();
    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uResolution: { value: new THREE.Vector2(size.width, size.height) },
        uFuchsia: { value: new THREE.Color(C.fuchsia) },
        uCyan: { value: new THREE.Color(C.cyan) },
        uYellow: { value: new THREE.Color(C.yellow) },
        uPurple: { value: new THREE.Color(C.purple) },
    }), [size.width, size.height]);

    useFrame((s) => {
        if (!matRef.current) return;
        matRef.current.uniforms.uTime.value = s.clock.elapsedTime;
        matRef.current.uniforms.uProgress.value = progressRef.current;
        matRef.current.uniforms.uResolution.value.set(s.size.width, s.size.height);
    });

    return (
        <mesh position={[0, 0, -25]}>
            {/* Big enough to fill the camera's fullscreen view */}
            <planeGeometry args={[80, 50]} />
            <shaderMaterial
                ref={matRef}
                uniforms={uniforms}
                depthWrite={false}
                vertexShader={`
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `}
                fragmentShader={`
                    precision highp float;
                    uniform float uTime;
                    uniform float uProgress;
                    uniform vec2 uResolution;
                    uniform vec3 uFuchsia;
                    uniform vec3 uCyan;
                    uniform vec3 uYellow;
                    uniform vec3 uPurple;
                    varying vec2 vUv;

                    // Tunnel-flow caustic field — adapted from a Codrops sample.
                    // Iterates a 3D ray, accumulates a colored "haze" along the
                    // path, then tone-maps. Time bias and a small scroll-driven
                    // forward shift give the impression of flying forward.
                    void main() {
                        vec2 fragCoord = vUv * uResolution;
                        vec2 r = uResolution;
                        float t = uTime * 0.45 + uProgress * 8.0;
                        vec3 FC = vec3(fragCoord, t);
                        vec3 o = vec3(0.0);
                        vec3 s = normalize(FC * 2.1 - vec3(r, r.x));
                        vec3 p;
                        vec3 c = s / max(s.y, 0.001);
                        float d = 0.0;
                        float z = 0.0;
                        for (float i = 0.0; i < 30.0; i++) {
                            p = s * z;
                            p.z -= t;
                            p.y += 1.0;
                            d = p.y;
                            p.y = abs(mod(d - 2.0, 4.0) - 2.0);
                            p += 0.03 * sin(dot(cos(c), sin(c / 0.6 - t)) / 0.1) * (p.y - d);
                            vec2 swirl = (p + sin(p.z * vec3(0.7, 1.0, 0.0) + t)).xy;
                            float stepLen = 0.7 * length(vec3(cos(p.z / 0.1) * 0.1, swirl) - 0.1);
                            o += (1.1 - sin(p)) / max(stepLen, 0.05);
                            z += stepLen;
                        }
                        // Tone map
                        vec3 col = tanh(o / 200.0);
                        // Tint to the Studio's neon palette — bias channels into
                        // fuchsia / cyan / yellow / purple bands without losing
                        // the original luminance structure.
                        float luma = dot(col, vec3(0.299, 0.587, 0.114));
                        vec3 tinted =
                            uPurple  * smoothstep(0.0, 0.35, luma) * 0.6 +
                            uFuchsia * smoothstep(0.18, 0.65, luma) * 0.7 +
                            uCyan    * smoothstep(0.42, 0.85, luma) * 0.6 +
                            uYellow  * smoothstep(0.75, 1.0, luma)  * 0.5;
                        tinted = mix(col * 0.4, tinted, 0.95);
                        gl_FragColor = vec4(tinted, 1.0);
                    }
                `}
            />
        </mesh>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// Photo flythrough — 12 cards arranged sparsely along Z, slightly off-axis,
// camera dollies through them as scroll advances. Imperative texture
// binding so r3f's prop-diff doesn't strand the map property on null.
// ─────────────────────────────────────────────────────────────────────────
interface FlyCard {
    x: number;
    y: number;
    z: number;
    rot: number;
    scale: number;
    texIdx: number;
}

function buildFlyCards(): FlyCard[] {
    // Sparse: one card every 4 units of Z, spread x/y around the axis but
    // never directly center (so the camera has a clear path through).
    const cards: FlyCard[] = [];
    const COUNT = 12;
    const STEP = 4.2;
    for (let i = 0; i < COUNT; i++) {
        const seed = (i * 7919) % 1000 / 1000; // deterministic
        const seed2 = (i * 4733 + 31) % 1000 / 1000;
        const side = i % 2 === 0 ? -1 : 1;
        // Push cards out from the centerline so the camera's path is clear.
        const xMag = 2.0 + seed * 1.8;
        const yMag = (seed2 - 0.5) * 1.4;
        cards.push({
            x: side * xMag,
            y: yMag,
            z: -2 - i * STEP,
            rot: (seed - 0.5) * 0.5,
            scale: 0.95 + seed2 * 0.35,
            texIdx: i % ARTWORK_URLS.length,
        });
    }
    return cards;
}

function useDefensiveTextures(urls: string[]): (THREE.Texture | null)[] {
    const [textures, setTextures] = useState<(THREE.Texture | null)[]>(() => urls.map(() => null));
    useEffect(() => {
        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin('anonymous');
        let cancelled = false;
        urls.forEach((url, idx) => {
            loader.load(url, (tex) => {
                if (cancelled) { tex.dispose(); return; }
                tex.colorSpace = THREE.SRGBColorSpace;
                tex.anisotropy = 4;
                tex.minFilter = THREE.LinearFilter;
                setTextures((prev) => {
                    const next = prev.slice();
                    next[idx] = tex;
                    return next;
                });
            }, undefined, () => { /* allow individual failures */ });
        });
        return () => { cancelled = true; };
    }, [urls]);
    return textures;
}

function FlyCard({ card, textures, progressRef }: {
    card: FlyCard;
    textures: (THREE.Texture | null)[];
    progressRef: React.MutableRefObject<number>;
}) {
    const meshRef = useRef<THREE.Mesh>(null);
    const matRef = useRef<THREE.MeshBasicMaterial>(null);
    const edgeMatRef = useRef<THREE.ShaderMaterial>(null);
    const myTexture = textures[card.texIdx] ?? null;

    // Imperatively bind map when texture lands (r3f's prop diff doesn't
    // flip needsUpdate for an after-mount texture attach).
    useEffect(() => {
        if (!matRef.current || !myTexture) return;
        matRef.current.map = myTexture;
        matRef.current.color.set('#ffffff');
        matRef.current.needsUpdate = true;
    }, [myTexture]);

    const edgeUniforms = useMemo(() => ({
        uTime: { value: 0 },
        uIntensity: { value: 0 },
        uColor: { value: new THREE.Color(C.fuchsia) },
    }), []);

    useFrame((s) => {
        if (!meshRef.current) return;
        const t = s.clock.elapsedTime;
        const p = progressRef.current;
        // Camera Z runs from +5 to -42 across the photo-flight portion of
        // the scroll (0.15 → 0.85 in global progress).
        const flyP = clamp01((p - 0.10) / 0.75);
        const camZ = lerp(5, -42, flyP);
        const ahead = camZ - card.z;
        // Visible window: in [-3, 20]. Smooth fade in/out at both edges.
        const approachFade = clamp01((20 - ahead) / 14);
        const pastFade = clamp01((ahead + 3) / 3);
        const alpha = approachFade * pastFade;

        if (matRef.current) matRef.current.opacity = alpha;
        if (edgeMatRef.current) {
            edgeMatRef.current.uniforms.uTime.value = t;
            edgeMatRef.current.uniforms.uIntensity.value = alpha;
        }
        // Subtle breathing
        meshRef.current.rotation.y = card.rot + Math.sin(t * 0.3 + card.x) * 0.05;
    });

    return (
        <group position={[card.x, card.y, card.z]} scale={card.scale}>
            {/* Neon edge glow plate — sits behind, alpha tied to card alpha. */}
            <mesh position={[0, 0, -0.04]}>
                <planeGeometry args={[2.4, 3.0]} />
                <shaderMaterial
                    ref={edgeMatRef}
                    transparent
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                    uniforms={edgeUniforms}
                    vertexShader={`
                        varying vec2 vUv;
                        void main() {
                            vUv = uv;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                        }
                    `}
                    fragmentShader={`
                        uniform float uTime;
                        uniform float uIntensity;
                        uniform vec3 uColor;
                        varying vec2 vUv;
                        void main() {
                            vec2 c = vUv - 0.5;
                            float border = max(abs(c.x) * 2.0, abs(c.y) * 2.0);
                            float edge = smoothstep(0.88, 1.02, border);
                            float pulse = 0.85 + 0.15 * sin(uTime * 1.4);
                            gl_FragColor = vec4(uColor, edge * pulse * uIntensity * 0.65);
                        }
                    `}
                />
            </mesh>
            {/* Artwork plane */}
            <mesh ref={meshRef}>
                <planeGeometry args={[2.1, 2.7]} />
                <meshBasicMaterial
                    ref={matRef}
                    color={C.purple}
                    transparent
                    toneMapped={false}
                    opacity={0}
                />
            </mesh>
        </group>
    );
}

function PhotoFlythrough({ progressRef }: { progressRef: React.MutableRefObject<number> }) {
    const textures = useDefensiveTextures(ARTWORK_URLS);
    const cards = useMemo(buildFlyCards, []);
    return (
        <group>
            {cards.map((card, i) => (
                <FlyCard key={i} card={card} textures={textures} progressRef={progressRef} />
            ))}
        </group>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// Hextech portal — large, dramatic. Hidden until scroll reaches 0.82.
// Gold rim, brass rune ticks, cyan crystal core with hex distance falloff.
// ─────────────────────────────────────────────────────────────────────────
function HextechPortal({ progressRef }: { progressRef: React.MutableRefObject<number> }) {
    const groupRef = useRef<THREE.Group>(null);
    const innerRingRef = useRef<THREE.Mesh>(null);
    const outerRingRef = useRef<THREE.Mesh>(null);
    const coreMatRef = useRef<THREE.ShaderMaterial>(null);
    const runeGroupRef = useRef<THREE.Group>(null);

    const HEXTECH_GOLD = useMemo(() => new THREE.Color('#c8aa6e'), []);
    const HEXTECH_CREAM = useMemo(() => new THREE.Color('#f0e6d2'), []);
    const HEXTECH_CYAN = useMemo(() => new THREE.Color('#0ac8b9'), []);

    const coreUniforms = useMemo(() => ({
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uCyan: { value: HEXTECH_CYAN },
        uCream: { value: HEXTECH_CREAM },
    }), [HEXTECH_CYAN, HEXTECH_CREAM]);

    // Hexagonal ring built from 6 segments along a hex curve. Tube width
    // bumped so the ring reads as substantial metal, not wire.
    const hexRingGeom = useMemo(() => {
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= 6; i++) {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
            pts.push(new THREE.Vector3(Math.cos(a), Math.sin(a), 0));
        }
        const curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0);
        return new THREE.TubeGeometry(curve, 96, 0.07, 12, true);
    }, []);

    useFrame((s) => {
        const t = s.clock.elapsedTime;
        const p = progressRef.current;
        const portalIn = seg(p, 0.78, 0.96);
        if (groupRef.current) {
            // Larger overall scale than before — the portal is the finale.
            groupRef.current.scale.setScalar(0.4 + portalIn * 2.4);
            groupRef.current.position.y = Math.sin(t * 0.7) * 0.05;
            groupRef.current.visible = portalIn > 0.001;
        }
        if (innerRingRef.current) {
            innerRingRef.current.rotation.z = t * 0.18 + p * 1.5;
            (innerRingRef.current.material as THREE.MeshBasicMaterial).opacity = portalIn * 0.95;
        }
        if (outerRingRef.current) {
            outerRingRef.current.rotation.z = -t * 0.11 - p * 1.2;
            (outerRingRef.current.material as THREE.MeshBasicMaterial).opacity = portalIn * 0.9;
        }
        if (runeGroupRef.current) {
            runeGroupRef.current.children.forEach((child) => {
                const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
                mat.opacity = portalIn;
            });
        }
        if (coreMatRef.current) {
            coreMatRef.current.uniforms.uTime.value = t;
            coreMatRef.current.uniforms.uProgress.value = p;
        }
    });

    const RUNE_COUNT = 6;
    const runePositions = useMemo(() => {
        const arr: [number, number, number][] = [];
        for (let i = 0; i < RUNE_COUNT; i++) {
            const a = (i / RUNE_COUNT) * Math.PI * 2 - Math.PI / 2;
            arr.push([Math.cos(a) * 2.05, Math.sin(a) * 2.05, 0.05]);
        }
        return arr;
    }, []);

    return (
        <group ref={groupRef} position={[0, 0, 0]}>
            <mesh position={[0, 0, -0.05]}>
                <planeGeometry args={[5.0, 5.0]} />
                <shaderMaterial
                    ref={coreMatRef}
                    transparent
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                    uniforms={coreUniforms}
                    vertexShader={`
                        varying vec2 vUv;
                        void main() {
                            vUv = uv;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                        }
                    `}
                    fragmentShader={`
                        uniform float uTime;
                        uniform float uProgress;
                        uniform vec3 uCyan;
                        uniform vec3 uCream;
                        varying vec2 vUv;
                        float hexDist(vec2 p, float r) {
                            p = abs(p);
                            float c = max(p.x * 0.866025 + p.y * 0.5, p.y);
                            return c - r;
                        }
                        void main() {
                            float in_ = smoothstep(0.78, 0.94, uProgress);
                            if (in_ < 0.001) discard;
                            vec2 c = (vUv - 0.5) * 2.0;
                            float d = hexDist(c, 0.78);
                            float core = smoothstep(0.0, -0.6, d);
                            float halo = smoothstep(0.2, -0.1, d);
                            float pulse = 0.85 + 0.15 * sin(uTime * 1.6);
                            float stroke = smoothstep(0.02, 0.0, abs(d)) * smoothstep(0.0, -0.04, d);
                            vec3 col = mix(uCyan, uCream, stroke);
                            float intensity = (core * 0.9 + halo * 0.35) * pulse + stroke * 1.4;
                            gl_FragColor = vec4(col, intensity * in_);
                        }
                    `}
                />
            </mesh>
            <mesh ref={innerRingRef} scale={[1.2, 1.2, 1]}>
                <primitive object={hexRingGeom} attach="geometry" />
                <meshBasicMaterial color={HEXTECH_GOLD} toneMapped={false} transparent opacity={0} />
            </mesh>
            <mesh ref={outerRingRef} scale={[2.0, 2.0, 1]}>
                <primitive object={hexRingGeom} attach="geometry" />
                <meshBasicMaterial color={HEXTECH_CREAM} toneMapped={false} transparent opacity={0} />
            </mesh>
            <group ref={runeGroupRef}>
                {runePositions.map((pos, i) => (
                    <mesh key={i} position={pos as any}>
                        <boxGeometry args={[0.14, 0.14, 0.05]} />
                        <meshBasicMaterial color={HEXTECH_GOLD} toneMapped={false} transparent opacity={0} />
                    </mesh>
                ))}
            </group>
        </group>
    );
}

// Camera follows the photo flythrough Z curve, then settles at the portal.
function CameraRig({ progressRef }: { progressRef: React.MutableRefObject<number> }) {
    const { camera } = useThree();
    useFrame((s) => {
        const t = s.clock.elapsedTime;
        const p = progressRef.current;
        const flyP = clamp01((p - 0.10) / 0.75);
        const camZ = lerp(5, -42, flyP);
        // Pull back slightly at the portal moment so we see the full hex.
        const portalIn = seg(p, 0.82, 0.96);
        const finalZ = lerp(camZ, 6, portalIn);
        camera.position.z += (finalZ - camera.position.z) * 0.15;
        // Gentle handheld sway, peaks mid-flight.
        const sway = 0.35 * (1 - Math.abs(flyP - 0.5) * 2);
        camera.position.x = Math.sin(t * 0.18) * sway;
        camera.position.y = Math.cos(t * 0.14) * sway * 0.7;
        camera.lookAt(0, 0, lerp(camZ, 0, portalIn) - 4);
        const persp = camera as THREE.PerspectiveCamera;
        if (persp.fov !== undefined) {
            persp.fov = lerp(58, 68, smoothstep(0.4, 0.85, p));
            persp.updateProjectionMatrix();
        }
    });
    return null;
}

// ─────────────────────────────────────────────────────────────────────────
// Arcane-style cold open (unchanged — landed well).
// ─────────────────────────────────────────────────────────────────────────
const ArcaneIntro: React.FC<{
    progressRef: React.MutableRefObject<number>;
    onSkip: () => void;
}> = ({ progressRef, onSkip }) => {
    const [done, setDone] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => setDone(true), 4800);
        let raf = 0;
        const tick = () => {
            if (progressRef.current > 0.005) setDone(true);
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => { clearTimeout(timer); cancelAnimationFrame(raf); };
    }, [progressRef]);
    if (done) return null;
    return (
        <div
            onClick={() => { setDone(true); onSkip(); }}
            className="fixed inset-0 z-[60] flex items-center justify-center cursor-pointer hs-arcane-fade"
            style={{ background: 'radial-gradient(ellipse at center, #0a0510 0%, #050505 65%, #000 100%)' }}
        >
            <div aria-hidden className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.85) 100%)' }} />
            <div aria-hidden className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 mix-blend-screen pointer-events-none" />
            <div className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2">
                <div className="hs-ember w-3 h-3 rounded-full"
                    style={{
                        background: '#c8aa6e',
                        boxShadow: '0 0 30px 4px rgba(200,170,110,0.55), 0 0 80px 10px rgba(200,170,110,0.25)',
                    }} />
            </div>
            <div className="absolute left-1/2 top-[48%] -translate-x-1/2 -translate-y-1/2 text-center">
                <p className="font-cinzel uppercase hs-arcane-line"
                    style={{
                        color: '#c8aa6e',
                        fontSize: 'clamp(0.7rem, 1vw, 0.9rem)',
                        letterSpacing: '0.6em',
                        textShadow: '0 0 24px rgba(200,170,110,0.35)',
                    }}>
                    Le Salon des Inconnus
                </p>
            </div>
            <div className="absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2 text-center">
                <p className="font-cormorant italic hs-arcane-presents"
                    style={{
                        color: '#f0e6d2',
                        fontSize: 'clamp(2rem, 5vw, 4.5rem)',
                        textShadow: '0 0 28px rgba(240,230,210,0.35), 0 0 60px rgba(200,170,110,0.25)',
                    }}>
                    presents
                </p>
                <div className="mx-auto mt-3 h-[1px] hs-arcane-rule"
                    style={{ background: 'linear-gradient(90deg, transparent, #c8aa6e 50%, transparent)' }} />
            </div>
            <p className="absolute bottom-10 left-1/2 -translate-x-1/2 font-cinzel uppercase hs-arcane-skip"
                style={{ color: 'rgba(240,230,210,0.32)', fontSize: '0.6rem', letterSpacing: '0.5em' }}>
                click anywhere · or scroll
            </p>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────
// HUD line — fades in/out for a scroll window. Solid color + glow, no
// bg-clip gradient (which renders washed-out on some browsers / screenshot
// tools). Each line is its own RAF so they're cheap.
// ─────────────────────────────────────────────────────────────────────────
const HudLine: React.FC<{
    progressRef: React.MutableRefObject<number>;
    start: number;
    peak: number;
    end: number;
    children: React.ReactNode;
    className?: string;
}> = ({ progressRef, start, peak, end, children, className }) => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        let raf = 0;
        const tick = () => {
            const p = progressRef.current;
            const inA = clamp01((p - start) / Math.max(0.001, peak - start));
            const outA = 1 - clamp01((p - peak) / Math.max(0.001, end - peak));
            const a = Math.min(inA, outA);
            if (ref.current) {
                ref.current.style.opacity = a.toFixed(3);
                ref.current.style.transform = `translate3d(0, ${(1 - a) * 24}px, 0)`;
            }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [progressRef, start, peak, end]);
    return (
        <div
            ref={ref}
            className={`absolute pointer-events-none will-change-transform ${className ?? ''}`}
            style={{ opacity: 0 }}
        >
            {children}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────
export const HighsTestPage: React.FC<HighsTestPageProps> = ({ onEnterStudio, onBack }) => {
    const scrollerRef = useRef<HTMLDivElement>(null);
    const runwayRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef<number>(0);
    const progressBarRef = useRef<HTMLDivElement>(null);
    const ctaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!scrollerRef.current || !runwayRef.current) return;
        const scroller = scrollerRef.current;
        const runway = runwayRef.current;
        const trigger = ScrollTrigger.create({
            scroller,
            trigger: runway,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.6,
            onUpdate: (self) => {
                progressRef.current = self.progress;
                if (progressBarRef.current) {
                    progressBarRef.current.style.width = `${self.progress * 100}%`;
                }
                if (ctaRef.current) {
                    const a = clamp01((self.progress - 0.92) / 0.06);
                    ctaRef.current.style.opacity = a.toFixed(3);
                    ctaRef.current.style.pointerEvents = a > 0.9 ? 'auto' : 'none';
                }
            },
        });
        const ro = new ResizeObserver(() => ScrollTrigger.refresh());
        ro.observe(scroller);
        return () => { trigger.kill(); ro.disconnect(); };
    }, []);

    return (
        <div className="fixed inset-0 z-30 text-white font-lato" style={{ background: C.base }}>
            <ArcaneIntro
                progressRef={progressRef}
                onSkip={() => { if (scrollerRef.current) scrollerRef.current.scrollTop = 1; }}
            />

            {/* Chrome */}
            <button
                onClick={onBack}
                className="fixed top-5 left-5 z-50 px-3 py-2 font-cinzel text-[9px] uppercase tracking-[0.4em] text-neutral-500 hover:text-[#e879f9] transition-colors"
            >
                ← Le Salon
            </button>
            <button
                onClick={onEnterStudio}
                className="fixed top-5 right-5 z-50 px-4 py-2 border border-[#e879f9]/40 bg-black/40 backdrop-blur-md font-cinzel text-[9px] uppercase tracking-[0.4em] text-[#e879f9] hover:bg-[#e879f9] hover:text-[#050505] transition-all"
            >
                Skip · Enter Studio →
            </button>
            <div className="fixed top-0 left-0 z-50 h-[2px] bg-gradient-to-r from-[#e879f9] via-[#22d3ee] to-[#fde047]"
                 style={{ width: 0 }} ref={progressBarRef} />

            <div ref={scrollerRef} className="absolute inset-0 overflow-y-auto overflow-x-hidden hs-no-scrollbar">
                <div ref={runwayRef} className="relative" style={{ height: '700vh' }}>
                    <div className="sticky top-0 h-screen w-full overflow-hidden">

                        {/* The world — WebGL: cosmic tunnel shader + photo flythrough + portal */}
                        <div className="absolute inset-0 z-0">
                            <Suspense fallback={<div className="absolute inset-0 hs-fallback" />}>
                                <Canvas
                                    camera={{ position: [0, 0, 5], fov: 58 }}
                                    gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
                                    style={{ background: C.base }}
                                    dpr={[1, 1.6]}
                                >
                                    <CameraRig progressRef={progressRef} />
                                    <CosmicTunnel progressRef={progressRef} />
                                    <PhotoFlythrough progressRef={progressRef} />
                                    <HextechPortal progressRef={progressRef} />
                                </Canvas>
                            </Suspense>
                            {/* Cinematic vignette over the WebGL. */}
                            <div aria-hidden className="absolute inset-0 pointer-events-none"
                                style={{ background: 'radial-gradient(ellipse at center, transparent 35%, rgba(5,5,5,0.55) 80%, rgba(5,5,5,0.95) 100%)' }} />
                            <div aria-hidden className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-screen pointer-events-none" />
                        </div>

                        {/* HUD overlays */}
                        <div className="absolute inset-0 z-10">

                            {/* 1. HERO — appears just after the cold open ends.
                                Solid cream type + glow, NO bg-clip gradient. */}
                            <HudLine progressRef={progressRef} start={0.06} peak={0.13} end={0.24}
                                className="left-6 md:left-12 right-6 md:right-12 bottom-12 md:bottom-16">
                                <p className="font-cinzel text-[10px] uppercase tracking-[0.5em] mb-4"
                                   style={{ color: '#c8aa6e' }}>
                                    Welcome to the lab
                                </p>
                                <h1
                                    className="font-prata leading-[0.85]"
                                    style={{
                                        fontSize: 'clamp(3rem, 13vw, 13rem)',
                                        color: C.cream,
                                        textShadow:
                                            '0 0 40px rgba(232,121,249,0.35), 0 0 80px rgba(34,211,238,0.25), 0 0 4px rgba(240,230,210,0.7)',
                                        letterSpacing: '-0.02em',
                                    }}
                                >
                                    Creator<br />Studio.
                                </h1>
                            </HudLine>

                            {/* 2. As the camera enters the photo flight, top-left
                                kicker introducing what's flying past. */}
                            <HudLine progressRef={progressRef} start={0.24} peak={0.32} end={0.44}
                                className="top-[14%] left-6 md:left-12 max-w-md">
                                <p className="font-cinzel text-[10px] uppercase tracking-[0.5em] mb-3"
                                   style={{ color: C.cyan }}>
                                    01 · The work
                                </p>
                                <h2 className="font-prata leading-[0.95]"
                                    style={{ fontSize: 'clamp(2rem, 4.5vw, 3.8rem)', color: C.cream,
                                             textShadow: '0 0 24px rgba(34,211,238,0.35)' }}>
                                    A residence for<br />
                                    <em className="font-cormorant italic" style={{ color: C.fuchsia }}>
                                        art that matters.
                                    </em>
                                </h2>
                            </HudLine>

                            {/* 3. Mid-flight: the values. */}
                            <HudLine progressRef={progressRef} start={0.44} peak={0.52} end={0.62}
                                className="bottom-[14%] right-6 md:right-12 max-w-md text-right">
                                <p className="font-cinzel text-[10px] uppercase tracking-[0.5em] mb-3"
                                   style={{ color: C.fuchsia }}>
                                    02 · Curated
                                </p>
                                <h2 className="font-prata leading-[0.95]"
                                    style={{ fontSize: 'clamp(2rem, 4.5vw, 3.8rem)', color: C.cream,
                                             textShadow: '0 0 24px rgba(232,121,249,0.35)' }}>
                                    Read by humans,<br />
                                    <em className="font-cormorant italic" style={{ color: C.cyan }}>
                                        never algorithms.
                                    </em>
                                </h2>
                            </HudLine>

                            {/* 4. Late flight: capabilities chip row. */}
                            <HudLine progressRef={progressRef} start={0.62} peak={0.70} end={0.80}
                                className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center max-w-3xl px-6">
                                <p className="font-cinzel uppercase mb-6"
                                   style={{
                                       fontSize: 'clamp(0.8rem, 1.1vw, 1rem)',
                                       letterSpacing: '0.6em',
                                       color: C.yellow,
                                       textShadow: '0 0 24px rgba(253,224,71,0.35)',
                                   }}>
                                    Publish · Collaborate · Showcase · Earn
                                </p>
                                <p className="font-cormorant italic"
                                   style={{
                                       fontSize: 'clamp(1.2rem, 2vw, 1.6rem)',
                                       color: 'rgba(240,230,210,0.78)',
                                   }}>
                                    Every door opens onto another.
                                </p>
                            </HudLine>

                            {/* 5. Portal title — fades in with the portal. */}
                            <HudLine progressRef={progressRef} start={0.80} peak={0.90} end={1.05}
                                className="top-[12%] left-1/2 -translate-x-1/2 text-center w-full max-w-2xl px-6">
                                <p className="font-cinzel uppercase mb-3"
                                   style={{
                                       color: '#c8aa6e',
                                       fontSize: '0.8rem',
                                       letterSpacing: '0.55em',
                                       textShadow: '0 0 24px rgba(200,170,110,0.5)',
                                   }}>
                                    The Creator Studio
                                </p>
                                <h2 className="font-prata leading-[0.88]"
                                    style={{
                                        fontSize: 'clamp(2.6rem, 6vw, 5rem)',
                                        color: '#f0e6d2',
                                        textShadow:
                                            '0 0 32px rgba(200,170,110,0.45), 0 0 80px rgba(10,200,185,0.3)',
                                    }}>
                                    Step inside.
                                </h2>
                            </HudLine>

                            {/* Final CTA — pinned bottom, becomes clickable at the end. */}
                            <div
                                ref={ctaRef}
                                className="absolute bottom-[10vh] left-1/2 -translate-x-1/2 z-20 transition-opacity duration-300"
                                style={{ opacity: 0, pointerEvents: 'none' }}
                            >
                                <button
                                    onClick={onEnterStudio}
                                    className="group inline-flex items-center gap-4 px-10 py-5 font-cinzel text-sm uppercase tracking-[0.4em] transition-transform hover:scale-[1.04]"
                                    style={{
                                        background: 'linear-gradient(135deg, #c8aa6e 0%, #0ac8b9 100%)',
                                        color: '#050505',
                                        boxShadow:
                                            '0 24px 90px rgba(200,170,110,0.55), 0 0 60px rgba(10,200,185,0.35)',
                                    }}
                                >
                                    <span>Enter the Studio</span>
                                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M5 12h14M13 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>

                            {/* Scroll cue — fades on first scroll */}
                            <div
                                className="absolute bottom-[6vh] left-1/2 -translate-x-1/2 font-cinzel text-neutral-500 text-[9px] uppercase tracking-[0.5em] hs-bob"
                                ref={(el) => {
                                    if (!el) return;
                                    let raf = 0;
                                    const tick = () => {
                                        const p = progressRef.current;
                                        const a = 1 - clamp01(p / 0.06);
                                        el.style.opacity = a.toFixed(3);
                                        raf = requestAnimationFrame(tick);
                                    };
                                    raf = requestAnimationFrame(tick);
                                }}
                            >
                                ↓ Scroll
                            </div>
                        </div>
                    </div>
                </div>
                <div className="h-[20vh]" style={{ background: C.base }} />
            </div>

            <style>{`
                .hs-bob { animation: hsBobArc 2s ease-in-out infinite; }
                @keyframes hsBobArc {
                    0%, 100% { transform: translate(-50%, 0); }
                    50%      { transform: translate(-50%, 8px); }
                }
                .hs-no-scrollbar::-webkit-scrollbar { display: none; }
                .hs-no-scrollbar { scrollbar-width: none; }
                .hs-fallback {
                    background:
                        radial-gradient(ellipse at 30% 30%, rgba(232,121,249,0.25), transparent 60%),
                        radial-gradient(ellipse at 70% 70%, rgba(34,211,238,0.25), transparent 60%),
                        #050505;
                }

                /* ── Arcane cold-open animations ─────────────────────────── */
                .hs-arcane-fade { animation: hsArcaneFadeOut 0.8s ease 4.4s forwards; }
                @keyframes hsArcaneFadeOut { from { opacity: 1; } to { opacity: 0; pointer-events: none; } }
                .hs-ember {
                    opacity: 0;
                    animation: hsEmberIn 1.2s ease 0.2s forwards, hsEmberPulse 2.4s ease-in-out 1.4s infinite;
                }
                @keyframes hsEmberIn { from { opacity: 0; transform: scale(0.4); } to { opacity: 1; transform: scale(1); } }
                @keyframes hsEmberPulse {
                    0%, 100% { transform: scale(1); filter: brightness(1); }
                    50%      { transform: scale(1.15); filter: brightness(1.4); }
                }
                .hs-arcane-line {
                    opacity: 0;
                    animation: hsArcaneLineIn 1.6s cubic-bezier(0.16, 1, 0.3, 1) 1.0s forwards;
                }
                @keyframes hsArcaneLineIn {
                    from { opacity: 0; letter-spacing: 1.4em; filter: blur(6px); }
                    to   { opacity: 1; letter-spacing: 0.6em; filter: blur(0); }
                }
                .hs-arcane-presents {
                    opacity: 0;
                    animation: hsArcanePresentsIn 1.8s cubic-bezier(0.16, 1, 0.3, 1) 2.1s forwards;
                }
                @keyframes hsArcanePresentsIn {
                    from { opacity: 0; letter-spacing: 0.8em; transform: scale(1.08); }
                    to   { opacity: 1; letter-spacing: normal; transform: scale(1); }
                }
                .hs-arcane-rule {
                    width: 0;
                    animation: hsArcaneRule 1.4s ease 2.7s forwards;
                }
                @keyframes hsArcaneRule { from { width: 0; } to { width: clamp(160px, 22vw, 320px); } }
                .hs-arcane-skip {
                    opacity: 0;
                    animation: hsArcaneSkipIn 1.0s ease 3.4s forwards;
                }
                @keyframes hsArcaneSkipIn { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
        </div>
    );
};
