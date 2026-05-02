import React, { useRef, useState, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Tabletop-feel D20 roller. Uses Three.js / R3F for the 3D scene; the roll
// itself is true-random via crypto.getRandomValues, then the dice is animated
// to land on the chosen face. No physics engine — just a deterministic
// tumble-and-slerp toward a precomputed target rotation. That's enough to
// feel like a real dice and keeps the bundle modest.

export interface D20Result {
    roll: number;            // 1..20
    rebatePct: number;       // -1 (Nat 1) to +20 (Nat 20)
    tier: 'crit-fail' | 'nothing' | 'good' | 'great' | 'nat-20';
    labelFr: string;
    labelEn: string;
}

const D20_RADIUS = 1.6;
const ROLL_DURATION_SEC = 2.6;

// ─── Geometry helpers ────────────────────────────────────────────────────
// IcosahedronGeometry yields exactly 20 triangular faces. We extract the
// centroid + outward normal of each so we can (a) place a number above
// each face and (b) compute the rotation that brings any chosen face to
// face "up" (+Y) at the end of a roll.
type FaceData = { centroid: THREE.Vector3; normal: THREE.Vector3 };

function getIcosahedronFaces(geometry: THREE.BufferGeometry): FaceData[] {
    // Force non-indexed so each triangle has its own 3 vertices.
    const geom = geometry.index ? geometry.toNonIndexed() : geometry;
    const pos = geom.attributes.position as THREE.BufferAttribute;
    const faces: FaceData[] = [];
    for (let i = 0; i < pos.count; i += 3) {
        const a = new THREE.Vector3().fromBufferAttribute(pos, i);
        const b = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
        const c = new THREE.Vector3().fromBufferAttribute(pos, i + 2);
        const centroid = new THREE.Vector3().add(a).add(b).add(c).divideScalar(3);
        const ab = new THREE.Vector3().subVectors(b, a);
        const ac = new THREE.Vector3().subVectors(c, a);
        const normal = new THREE.Vector3().crossVectors(ab, ac).normalize();
        // Ensure the normal points outward (away from origin).
        if (normal.dot(centroid) < 0) normal.multiplyScalar(-1);
        faces.push({ centroid, normal });
    }
    return faces.slice(0, 20);
}

// Quaternion that rotates `from` to `to` (both unit vectors).
function rotationFromTo(from: THREE.Vector3, to: THREE.Vector3): THREE.Quaternion {
    return new THREE.Quaternion().setFromUnitVectors(from.clone().normalize(), to.clone().normalize());
}

// Build a small CanvasTexture with the number painted on it. We use these
// as flat plane decals laid on each face — synchronous, no font loading,
// no Suspense traps. The decal is barely above the face so depth-fighting
// is avoided.
function makeNumberTexture(n: number): THREE.CanvasTexture {
    const size = 256;
    const cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    const ctx = cv.getContext('2d')!;
    ctx.clearRect(0, 0, size, size);
    // Subtle inset shadow for depth
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.font = `bold ${Math.floor(size * 0.62)}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(n), size / 2 + 4, size / 2 + 6);
    // The number itself
    ctx.fillStyle = n === 20 ? '#f3e5ab' : n === 1 ? '#ee9999' : '#d8c98a';
    ctx.fillText(String(n), size / 2, size / 2);
    // Underline marker for 6 and 9 (so they're not ambiguous on a tumbling dice)
    if (n === 6 || n === 9) {
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(size * 0.32, size * 0.78);
        ctx.lineTo(size * 0.68, size * 0.78);
        ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
}

// Map roll (1..20) to result metadata.
function rollToResult(roll: number): D20Result {
    if (roll === 1)
        return { roll, rebatePct: -1, tier: 'crit-fail',
            labelFr: 'Échec critique : +1 % sur la facture',
            labelEn: 'Critical failure: +1% on the invoice' };
    if (roll <= 10)
        return { roll, rebatePct: 0, tier: 'nothing',
            labelFr: 'Pas cette fois.',
            labelEn: 'No luck this time.' };
    if (roll <= 15)
        return { roll, rebatePct: 5, tier: 'good',
            labelFr: '5 % de rabais !',
            labelEn: '5% off!' };
    if (roll <= 19)
        return { roll, rebatePct: 10, tier: 'great',
            labelFr: '10 % de rabais !',
            labelEn: '10% off!' };
    return { roll, rebatePct: 20, tier: 'nat-20',
        labelFr: 'Nat 20 — 20 % de rabais !',
        labelEn: 'Nat 20 — 20% off!' };
}

// ─── The dice mesh + animation ──────────────────────────────────────────
const Dice: React.FC<{
    targetRoll: number | null;
    rollNonce: number;            // bumps to retrigger the same roll value
    onSettled: (roll: number) => void;
}> = ({ targetRoll, rollNonce, onSettled }) => {
    const groupRef = useRef<THREE.Group>(null);

    // Build geometry once and capture its 20 face descriptors.
    const geometry = useMemo(() => new THREE.IcosahedronGeometry(D20_RADIUS, 0).toNonIndexed(), []);
    const edges    = useMemo(() => new THREE.EdgesGeometry(geometry), [geometry]);
    const faces    = useMemo(() => getIcosahedronFaces(geometry), [geometry]);
    // One CanvasTexture per face value. Painted at module-load time,
    // synchronously — no font fetch, no Suspense surprises.
    const numberTextures = useMemo(
        () => Array.from({ length: 20 }, (_, i) => makeNumberTexture(i + 1)),
        [],
    );

    // Animation phases: idle (gentle bob) → rolling (tumble + slerp) → settled.
    const phaseRef     = useRef<'idle' | 'rolling' | 'settled'>('idle');
    const startTimeRef = useRef<number>(0);
    const startQRef    = useRef<THREE.Quaternion>(new THREE.Quaternion());
    const targetQRef   = useRef<THREE.Quaternion>(new THREE.Quaternion());
    const tumbleAxisRef = useRef<THREE.Vector3>(new THREE.Vector3(1, 0, 0));
    const tumbleSpinsRef = useRef<number>(6);

    // Kick off a new roll whenever the nonce changes (or first roll arrives).
    useEffect(() => {
        if (targetRoll == null || !groupRef.current) return;
        const faceIdx = Math.max(0, Math.min(19, targetRoll - 1));
        const face = faces[faceIdx];
        // Land that face up (+Y).
        targetQRef.current = rotationFromTo(face.normal, new THREE.Vector3(0, 1, 0));
        startQRef.current.copy(groupRef.current.quaternion);
        // Random tumble axis for variety
        const r = () => Math.random() * 2 - 1;
        tumbleAxisRef.current.set(r(), r(), r()).normalize();
        tumbleSpinsRef.current = 5 + Math.random() * 3;
        startTimeRef.current = performance.now() / 1000;
        phaseRef.current = 'rolling';
    }, [targetRoll, rollNonce, faces]);

    useFrame((_, dt) => {
        const g = groupRef.current;
        if (!g) return;
        const now = performance.now() / 1000;

        if (phaseRef.current === 'idle') {
            g.rotation.y += dt * 0.35;
            g.rotation.x += dt * 0.20;
            return;
        }

        if (phaseRef.current === 'rolling') {
            const t = Math.min(1, (now - startTimeRef.current) / ROLL_DURATION_SEC);
            // easeOutQuart — fast tumble at start, settling at end
            const eased = 1 - Math.pow(1 - t, 4);

            // Tumble component: spins around random axis, decaying with eased.
            const tumbleAngle = (1 - eased) * Math.PI * 2 * tumbleSpinsRef.current;
            const tumbleQ = new THREE.Quaternion().setFromAxisAngle(tumbleAxisRef.current, tumbleAngle);

            // Combined: tumble layered on top of slerp(start → target).
            const settled = new THREE.Quaternion().slerpQuaternions(
                startQRef.current, targetQRef.current, eased,
            );
            g.quaternion.copy(tumbleQ.multiply(settled));

            // Subtle vertical bounce (one big arc + a smaller one)
            const bounce = Math.max(0, Math.sin(t * Math.PI) * 1.0)
                         + Math.max(0, Math.sin(t * Math.PI * 2.4) * 0.18);
            g.position.y = bounce - 0.4;

            if (t >= 1) {
                g.quaternion.copy(targetQRef.current);
                g.position.y = -0.4;
                phaseRef.current = 'settled';
                onSettled(targetRoll!);
            }
            return;
        }

        // settled: hold position, very gentle hover so it doesn't look frozen
        g.position.y = -0.4 + Math.sin(now * 1.2) * 0.02;
    });

    return (
        <group ref={groupRef}>
            {/* The body */}
            <mesh geometry={geometry} castShadow receiveShadow>
                <meshPhysicalMaterial
                    color="#1a1208"
                    metalness={0.35}
                    roughness={0.35}
                    clearcoat={0.6}
                    clearcoatRoughness={0.25}
                    emissive="#3a2a10"
                    emissiveIntensity={0.08}
                />
            </mesh>
            {/* Gold edges — gives the d20 the leather-bound book vibe */}
            <lineSegments geometry={edges}>
                <lineBasicMaterial color="#c5a059" />
            </lineSegments>
            {/* Number decals — one transparent plane per face, sitting just
                above the surface and oriented outward. CanvasTexture means
                the numbers paint synchronously, no font loading, no async. */}
            {faces.map((face, i) => {
                const numberValue = i + 1;
                const offset = face.normal.clone().multiplyScalar(0.012);
                const pos = face.centroid.clone().add(offset);
                const q = rotationFromTo(new THREE.Vector3(0, 0, 1), face.normal);
                return (
                    <mesh
                        key={i}
                        position={[pos.x, pos.y, pos.z]}
                        quaternion={[q.x, q.y, q.z, q.w]}
                    >
                        <planeGeometry args={[0.95, 0.95]} />
                        <meshBasicMaterial
                            map={numberTextures[i]}
                            transparent
                            depthWrite={false}
                        />
                    </mesh>
                );
            })}
        </group>
    );
};

// ─── Lighting + felt table ───────────────────────────────────────────────
const Scene: React.FC = () => (
    <>
        <ambientLight intensity={0.45} />
        <directionalLight
            position={[5, 8, 4]}
            intensity={1.4}
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-4}
            shadow-camera-right={4}
            shadow-camera-top={4}
            shadow-camera-bottom={-4}
        />
        {/* Warm rim light suggesting candlelight */}
        <directionalLight position={[-4, 2, -3]} intensity={0.5} color="#c5a059" />
        {/* Felt-table circle */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.2, 0]} receiveShadow>
            <circleGeometry args={[6, 64]} />
            <meshStandardMaterial color="#0c0a07" roughness={1} metalness={0} />
        </mesh>
        {/* Soft inner glow ring for visual interest */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.19, 0]}>
            <ringGeometry args={[2.4, 2.6, 64]} />
            <meshBasicMaterial color="#3a2a10" transparent opacity={0.5} />
        </mesh>
    </>
);

// ─── Public component ───────────────────────────────────────────────────
interface D20RollerProps {
    language: 'EN' | 'FR';
    /** When true, the Roll button is disabled (e.g. cooldown still active). */
    disabled?: boolean;
    /** Optional message under the button when disabled. */
    disabledMessage?: string;
    /** Called once with the result when the dice settles. */
    onResult: (result: D20Result) => void;
}

export const D20Roller: React.FC<D20RollerProps> = ({ language, disabled, disabledMessage, onResult }) => {
    const t = (en: string, fr: string) => language === 'FR' ? fr : en;
    const [pendingRoll, setPendingRoll] = useState<number | null>(null);
    const [rollNonce, setRollNonce] = useState(0);
    const [revealed, setRevealed] = useState<D20Result | null>(null);
    const [rolling, setRolling] = useState(false);

    const triggerRoll = () => {
        if (disabled || rolling) return;
        // True random — uniform over 1..20 via rejection sampling so we don't
        // skew at modulo. Uint32 max = 2^32, 20 doesn't divide evenly.
        const limit = Math.floor(0x100000000 / 20) * 20;
        const buf = new Uint32Array(1);
        let n: number;
        do { crypto.getRandomValues(buf); n = buf[0]; } while (n >= limit);
        const result = (n % 20) + 1;
        setRevealed(null);
        setPendingRoll(result);
        setRollNonce(x => x + 1);
        setRolling(true);
    };

    const handleSettled = (roll: number) => {
        setRolling(false);
        const result = rollToResult(roll);
        setRevealed(result);
        onResult(result);
    };

    const tierClass = (tier: D20Result['tier'] | null) => {
        switch (tier) {
            case 'nat-20':    return 'text-[#f3e5ab]';
            case 'great':     return 'text-[#c5a059]';
            case 'good':      return 'text-amber-300';
            case 'crit-fail': return 'text-rose-400';
            default:          return 'text-neutral-400';
        }
    };

    return (
        <div className="relative">
            {/* 3D viewport */}
            <div className="aspect-square w-full max-w-sm mx-auto rounded-2xl overflow-hidden bg-gradient-to-br from-[#1a1208] via-[#0a0905] to-black border border-[#c5a059]/25 shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
                <Canvas
                    shadows
                    camera={{ position: [0, 2.4, 6.2], fov: 38 }}
                    gl={{ antialias: true, alpha: false }}
                    dpr={[1, 2]}
                >
                    <color attach="background" args={['#0a0805']} />
                    <Scene />
                    {/* Suspense fallback === null means: if any child suspends
                        (font load, async asset), nothing renders inside —
                        but useFrame on already-mounted siblings keeps running.
                        Belt-and-braces: with the CanvasTexture decals there
                        is nothing async left to suspend on. */}
                    <Suspense fallback={null}>
                        <Dice targetRoll={pendingRoll} rollNonce={rollNonce} onSettled={handleSettled} />
                    </Suspense>
                </Canvas>
            </div>

            {/* Roll button + result */}
            <div className="mt-5 flex flex-col items-center gap-3">
                <button
                    onClick={triggerRoll}
                    disabled={disabled || rolling}
                    className="px-10 py-3 border-2 border-[#c5a059] text-[#f3e5ab] font-cinzel text-sm uppercase tracking-[0.4em] hover:bg-[#c5a059] hover:text-[#1a1208] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    {rolling
                        ? t('Rolling…', 'Lancer en cours…')
                        : t('Roll the D20', 'Lancer le D20')}
                </button>

                {disabled && disabledMessage && !rolling && (
                    <p className="font-josefin text-neutral-500 text-[10px] uppercase tracking-[0.3em] text-center">
                        {disabledMessage}
                    </p>
                )}

                {revealed && !rolling && (
                    <div className={`text-center px-4 py-3 ${tierClass(revealed.tier)}`}>
                        <p className="font-prata text-5xl leading-none">{revealed.roll}</p>
                        <p className="font-josefin text-[11px] uppercase tracking-[0.3em] mt-2">
                            {language === 'FR' ? revealed.labelFr : revealed.labelEn}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
