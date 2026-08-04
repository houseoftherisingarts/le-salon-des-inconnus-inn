import React, { useRef, useState, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Tabletop-feel D20 roller. Uses Three.js / R3F for the 3D scene. No physics
// engine — just a tumble-and-slerp toward a target rotation, which is enough
// to feel like a real dice and keeps the bundle modest.
//
// The number is NOT drawn here. The rollWeeklyD20 Cloud Function decides it,
// claims the rebate code, and hands the result back; this component only
// animates the dice onto the face the server chose. Rolling in the browser is
// what let a member pick their own prize tier.
//
// Because the outcome now arrives over the network, pressing the button starts
// a free tumble immediately and the dice only commits to a face once the
// server answers. The wait reads as part of the throw instead of a dead pause.

export interface D20Outcome {
    roll: number;            // 1..20, decided server-side
    rebatePct: number;       // 0 | 5 | 10 | 20
    tier: 'crit-fail' | 'nothing' | 'good' | 'great' | 'nat-20';
    code?: string | null;    // present iff a code was claimed
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

// Presentation only: turn the server's tier into a line of copy. The prize
// ladder itself lives in the Cloud Function, which is the one authority on
// what a roll is worth.
function outcomeLabel(outcome: D20Outcome, language: 'EN' | 'FR'): string {
    const fr = language === 'FR';
    switch (outcome.tier) {
        case 'crit-fail':
            // A Nat 1 costs a chicken sandwich, never money.
            return fr
                ? 'Échec critique : vous devez un sandwich au poulet à votre hôte.'
                : 'Critical failure: you now owe your host a chicken sandwich.';
        case 'nat-20':
            return fr ? 'Nat 20 · 20 % de rabais !' : 'Nat 20 · 20% off!';
        case 'great':
        case 'good':
            return fr ? `${outcome.rebatePct} % de rabais !` : `${outcome.rebatePct}% off!`;
        default:
            return fr ? 'Pas cette fois.' : 'No luck this time.';
    }
}

// ─── The dice mesh + animation ──────────────────────────────────────────
const Dice: React.FC<{
    spinNonce: number;            // bumps on button press → free tumble
    landOn: number | null;        // face the server chose
    landNonce: number;            // bumps when a new outcome arrives
    abortNonce: number;           // bumps when the request failed → back to idle
    onSettled: () => void;
}> = ({ spinNonce, landOn, landNonce, abortNonce, onSettled }) => {
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

    // Animation phases:
    //   idle     → gentle bob
    //   spinning → free tumble while the server decides (hides the latency)
    //   landing  → tumble decays while slerping onto the chosen face
    //   settled  → hold, with a barely-there hover
    const phaseRef     = useRef<'idle' | 'spinning' | 'landing' | 'settled'>('idle');
    const startTimeRef = useRef<number>(0);
    const startQRef    = useRef<THREE.Quaternion>(new THREE.Quaternion());
    const targetQRef   = useRef<THREE.Quaternion>(new THREE.Quaternion());
    const tumbleAxisRef = useRef<THREE.Vector3>(new THREE.Vector3(1, 0, 0));
    const tumbleSpinsRef = useRef<number>(6);

    // Button pressed: start tumbling right away, before we know the number.
    useEffect(() => {
        if (spinNonce === 0 || !groupRef.current) return;
        const r = () => Math.random() * 2 - 1;
        tumbleAxisRef.current.set(r(), r(), r()).normalize();
        tumbleSpinsRef.current = 5 + Math.random() * 3;
        phaseRef.current = 'spinning';
    }, [spinNonce]);

    // Outcome arrived: commit to the face the server chose.
    useEffect(() => {
        if (landOn == null || !groupRef.current) return;
        const faceIdx = Math.max(0, Math.min(19, landOn - 1));
        const face = faces[faceIdx];
        // Land that face up (+Y).
        targetQRef.current = rotationFromTo(face.normal, new THREE.Vector3(0, 1, 0));
        startQRef.current.copy(groupRef.current.quaternion);
        startTimeRef.current = performance.now() / 1000;
        phaseRef.current = 'landing';
    }, [landOn, landNonce, faces]);

    // The request failed. Stop mid-air rather than spinning forever.
    useEffect(() => {
        if (abortNonce === 0) return;
        phaseRef.current = 'idle';
        if (groupRef.current) groupRef.current.position.y = -0.4;
    }, [abortNonce]);

    useFrame((_, dt) => {
        const g = groupRef.current;
        if (!g) return;
        const now = performance.now() / 1000;

        if (phaseRef.current === 'idle') {
            g.rotation.y += dt * 0.35;
            g.rotation.x += dt * 0.20;
            return;
        }

        if (phaseRef.current === 'spinning') {
            // Constant fast tumble with a low hop. Runs until the server
            // answers, so a slow network just means a longer throw.
            const spinQ = new THREE.Quaternion()
                .setFromAxisAngle(tumbleAxisRef.current, dt * 13);
            g.quaternion.multiply(spinQ);
            g.position.y = -0.4 + Math.abs(Math.sin(now * 5.5)) * 0.45;
            return;
        }

        if (phaseRef.current === 'landing') {
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
                onSettled();
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
    /**
     * The server's answer. Setting it lands the dice on that face; leave it
     * null and the dice keeps tumbling.
     */
    outcome: D20Outcome | null;
    /** Bump alongside `outcome` so the same number can be rolled twice. */
    outcomeNonce: number;
    /** Bump when the request failed, to stop the tumble. */
    errorNonce: number;
    /** Pressed the button — the parent calls rollWeeklyD20. */
    onRequestRoll: () => void;
}

export const D20Roller: React.FC<D20RollerProps> = ({
    language, disabled, disabledMessage, outcome, outcomeNonce, errorNonce, onRequestRoll,
}) => {
    const t = (en: string, fr: string) => language === 'FR' ? fr : en;
    const [spinNonce, setSpinNonce] = useState(0);
    const [rolling, setRolling] = useState(false);
    const [revealed, setRevealed] = useState<D20Outcome | null>(null);

    const triggerRoll = () => {
        if (disabled || rolling) return;
        setRevealed(null);
        setRolling(true);
        setSpinNonce(x => x + 1);   // start tumbling now
        onRequestRoll();            // ...and ask the server for the number
    };

    // The request came back empty-handed (cooldown, dry pool, network). Drop
    // out of the roll so the button comes back.
    useEffect(() => {
        if (errorNonce === 0) return;
        setRolling(false);
    }, [errorNonce]);

    const handleSettled = () => {
        setRolling(false);
        setRevealed(outcome);
    };

    const tierClass = (tier: D20Outcome['tier'] | null) => {
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
