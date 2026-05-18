// InteractivePhotoStack — a stack of photo cards that spreads out on hover.
//
// Adapted from a snippet the user provided. Cards stack at center; on hover,
// they fan out to non-overlapping positions; clicking a card brings it to
// the front of the stack.
//
// Used by VisualArtTemplate as the orbiting portfolio around the cutout.
//
// Fixes vs source snippet:
//   • `!clickedIndex` evaluated to `true` when clickedIndex was 0, so clicking
//     the first card and then mousing out collapsed mid-animation. Now uses
//     `clickedIndex === null`.
//   • Hardcoded 5-card cap is now a `maxCards` prop (still defaults to 5).
//   • Dropped the shadcn cn() dep — we inline the className join.

import * as React from 'react';

export interface PhotoStackItem {
    src: string;
    name: string;
}

export interface InteractivePhotoStackProps {
    items: PhotoStackItem[];
    title?: React.ReactNode;
    maxCards?: number;
    className?: string;
}

const cls = (...parts: Array<string | false | null | undefined>) =>
    parts.filter(Boolean).join(' ');

const random = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

function generateNonOverlappingTransforms(count: number): string[] {
    const positions: { x: number; y: number; r: number }[] = [];
    const cardWidthVW = 25;
    const cardHeightVH = 45;
    const maxRetries = 100;
    for (let i = 0; i < count; i++) {
        let newPos: { x: number; y: number; r: number };
        let collision: boolean;
        let retries = 0;
        do {
            collision = false;
            newPos = {
                x: random(-45, 45),
                y: random(-25, 25),
                r: random(-25, 25),
            };
            for (const pos of positions) {
                const dx = Math.abs(newPos.x - pos.x);
                const dy = Math.abs(newPos.y - pos.y);
                if (dx < cardWidthVW && dy < cardHeightVH) {
                    collision = true;
                    break;
                }
            }
            retries++;
        } while (collision && retries < maxRetries);
        positions.push(newPos);
    }
    return positions.map(p => `translate(${p.x}vw, ${p.y}vh) rotate(${p.r}deg)`);
}

export const InteractivePhotoStack = React.forwardRef<
    HTMLDivElement,
    InteractivePhotoStackProps
>(({ items, title, maxCards = 5, className }, ref) => {
    const displayed = items.slice(0, maxCards);
    const [topCardIndex, setTopCardIndex] = React.useState(0);
    const [isGroupHovered, setIsGroupHovered] = React.useState(false);
    const [clickedIndex, setClickedIndex] = React.useState<number | null>(null);
    const [spreadTransforms, setSpreadTransforms] = React.useState<string[]>([]);

    const baseRotations = ['rotate-2', '-rotate-2', 'rotate-4', '-rotate-4', 'rotate-6'];

    const handleMouseEnter = () => {
        setSpreadTransforms(generateNonOverlappingTransforms(displayed.length));
        setIsGroupHovered(true);
    };

    const handleMouseLeave = () => {
        if (clickedIndex === null) setIsGroupHovered(false);
    };

    const handleCardClick = (index: number) => {
        if (isGroupHovered) {
            setClickedIndex(index);
            setTimeout(() => {
                setIsGroupHovered(false);
                setTopCardIndex(index);
                setClickedIndex(null);
            }, 700);
        } else {
            setTopCardIndex(index);
        }
    };

    if (displayed.length === 0) return null;

    return (
        <div
            ref={ref}
            className={cls('flex flex-col items-center justify-center gap-12', className)}
        >
            <div
                className="relative h-96 w-full"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <div className="relative left-1/2 top-1/2 h-80 w-64 -translate-x-1/2 -translate-y-1/2">
                    {displayed.map((item, index) => {
                        const isTopCard = index === topCardIndex;
                        let stackPosition = index - topCardIndex;
                        if (stackPosition < 0) stackPosition += displayed.length;
                        const isClicked = index === clickedIndex;
                        const transform = isGroupHovered
                            ? spreadTransforms[index] ?? ''
                            : `translateY(${stackPosition * 0.5}rem) scale(${1 - stackPosition * 0.05})`;
                        const baseRotation = baseRotations[stackPosition % baseRotations.length];

                        return (
                            <div
                                key={`${item.name}-${index}`}
                                onClick={() => handleCardClick(index)}
                                className={cls(
                                    'absolute inset-0 h-80 w-64 cursor-pointer rounded-xl bg-black/40 p-2 shadow-2xl transition-all duration-500 ease-in-out',
                                    isGroupHovered && 'rotate-0',
                                    !isGroupHovered && !isTopCard && baseRotation,
                                    isGroupHovered && !isClicked && 'hover:scale-110',
                                )}
                                style={{
                                    transform,
                                    zIndex: isClicked
                                        ? 200
                                        : isGroupHovered
                                            ? 100
                                            : isTopCard
                                                ? displayed.length
                                                : displayed.length - stackPosition,
                                }}
                            >
                                <div className="flex h-full w-full flex-col items-center justify-start">
                                    <div className="h-64 w-full">
                                        <img
                                            src={item.src}
                                            alt={item.name}
                                            className="h-full w-full rounded-md object-cover"
                                            loading="lazy"
                                        />
                                    </div>
                                    <div className="flex h-12 flex-grow items-center justify-center">
                                        <p className="font-cinzel text-base italic text-[#f3e5ab] tracking-wider">
                                            {item.name}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            {title && (
                <h3 className="text-center text-2xl font-prata text-[#f3e5ab]">
                    {title}
                </h3>
            )}
        </div>
    );
});

InteractivePhotoStack.displayName = 'InteractivePhotoStack';
