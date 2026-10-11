"use client";

import { motion, useReducedMotion } from "framer-motion";

const foods = [
  { id: "spinach", delay: 0.35, node: <Spinach /> },
  { id: "apple", delay: 0.48, node: <Apple /> },
  { id: "milk", delay: 0.61, node: <Milk /> },
  { id: "bread", delay: 0.74, node: <Bread /> },
  { id: "tomato", delay: 0.87, node: <Tomato /> },
  { id: "cereal", delay: 1, node: <Cereal /> },
];

export function HeroStory({ play, paused }: { play: boolean; paused: boolean }) {
  const reduce = useReducedMotion();
  const settle = Boolean(reduce);
  const run = play && !settle;

  return (
    <div className={`ft-scene relative mx-auto w-full max-w-xl overflow-hidden ${paused ? "is-paused" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 560 390" className="h-auto w-full">
        <rect width="560" height="390" rx="28" fill="#f7f3ec" />
        <ellipse cx="280" cy="312" rx="214" ry="16" fill="#e6dfd4" />
        {foods.map((food, index) => (
          <motion.g
            key={food.id}
            initial={settle ? false : { opacity: 0, y: 16 }}
            animate={settle || run ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.45, delay: food.delay, ease: "easeOut" }}
          >
            <g className={run ? "ft-float" : undefined} style={run ? { animationDelay: `${index * 0.18}s` } : undefined}>
              {food.node}
            </g>
          </motion.g>
        ))}
        <motion.g
          initial={settle ? false : { x: -120, y: 0 }}
          animate={settle ? { x: 0, y: 0 } : run ? { x: [-150, -10, 120, 8], y: [0, 0, -52, 0] } : { x: -150, y: 0 }}
          transition={settle ? { duration: 0 } : { duration: 2.5, delay: 1.35, times: [0, 0.42, 0.62, 1], ease: "easeInOut" }}
        >
          <Mascot />
        </motion.g>
        {run ? (
          <g className="ft-scan">
            <rect x="78" y="214" width="8" height="78" rx="4" fill="#2c5f7c" opacity="0.85" />
          </g>
        ) : settle ? (
          <rect x="104" y="214" width="8" height="78" rx="4" fill="#2c5f7c" opacity="0.35" />
        ) : null}
        <Labels visible={settle || run} delay={run ? 4.15 : 0} />
        <motion.g
          initial={settle ? false : { y: -46, opacity: 0 }}
          animate={settle || run ? { y: 0, opacity: 1 } : { y: -46, opacity: 0 }}
          transition={run ? { type: "spring", stiffness: 260, damping: 16, delay: 7.15 } : { duration: 0.2 }}
        >
          <SceneLogo />
        </motion.g>
      </svg>
    </div>
  );
}

function Labels({ visible, delay }: { visible: boolean; delay: number }) {
  const items = [
    { x: 168, y: 168, label: "Product" },
    { x: 168, y: 196, label: "Batch" },
    { x: 248, y: 168, label: "Source" },
    { x: 248, y: 196, label: "Evidence" },
  ];
  return (
    <g>
      {items.map((item, index) => (
        <motion.g
          key={item.label}
          initial={delay === 0 ? false : { opacity: 0, y: 6 }}
          animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
          transition={{ duration: 0.3, delay: delay === 0 ? 0 : delay + index * 0.12 }}
        >
          <rect x={item.x} y={item.y} width="72" height="22" rx="11" fill="#fffcf8" stroke="#e4ddd2" />
          <text x={item.x + 36} y={item.y + 15} textAnchor="middle" fontSize="11" fontFamily="Segoe UI, sans-serif" fill="#1c1915">
            {item.label}
          </text>
        </motion.g>
      ))}
    </g>
  );
}

function SceneLogo() {
  return (
    <g>
      <rect x="214" y="28" width="132" height="36" rx="18" fill="#0e5c4a" />
      <path d="M228 46c4-8 9-11 16-12-1 6-1 9 1 14-5 1-10 1-13 4-2-1-4-3-4-6Z" fill="#f4f1eb" />
      <text x="252" y="51" fill="#fffcf8" fontSize="14" fontFamily="Georgia, serif">
        FoodTrace
      </text>
    </g>
  );
}

function Mascot() {
  return (
    <g transform="translate(18 176)">
      <ellipse cx="34" cy="78" rx="16" ry="5" fill="#e6dfd4" />
      <path d="M34 18c16 2 28 18 24 40-8 18-28 24-40 16C4 64 2 40 14 26 20 18 26 16 34 18Z" fill="#0e5c4a" />
      <path d="M30 24c8 1 16 8 16 18-8 2-16 0-20-8 0-4 1-8 4-10Z" fill="#1f8a68" />
      <path d="M34 12c2 6 2 10 0 14" stroke="#083f33" strokeWidth="2" strokeLinecap="round" />
      <circle cx="28" cy="42" r="2.2" fill="#f4f1eb" />
      <circle cx="40" cy="42" r="2.2" fill="#f4f1eb" />
      <path d="M30 50c3 3 8 3 11 0" stroke="#f4f1eb" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d="M22 78c-4 8-2 14 4 14M46 78c4 8 2 14-4 14" stroke="#083f33" strokeWidth="2" strokeLinecap="round" />
      <g transform="translate(48 28)">
        <circle cx="12" cy="12" r="9" fill="#fffcf8" stroke="#1c1915" strokeWidth="2" />
        <path d="M18 18l8 8" stroke="#1c1915" strokeWidth="2.4" strokeLinecap="round" />
      </g>
    </g>
  );
}

function Spinach() {
  return (
    <g transform="translate(78 228)">
      <path d="M28 8c10 8 14 20 8 34-12-2-22-12-24-24 4-6 10-10 16-10Z" fill="#1f7a4d" />
      <path d="M18 14c8 4 12 14 8 26" stroke="#d7ebe3" strokeWidth="1.4" fill="none" />
      <path d="M40 20c6 10 4 20-2 28" stroke="#0e5c4a" strokeWidth="1.4" fill="none" />
      <path d="M30 40v18" stroke="#3d6b32" strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

function Apple() {
  return (
    <g transform="translate(168 236)">
      <path d="M22 10c2-6 8-8 10-8-1 5 0 8 3 10" stroke="#3d6b32" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="22" cy="32" r="16" fill="#c4513a" />
      <path d="M16 26c2 2 4 2 6 0" stroke="#f4c7bc" strokeWidth="1.5" fill="none" />
    </g>
  );
}

function Milk() {
  return (
    <g transform="translate(236 232)">
      <path d="M10 18h24l4 40H8L10 18Z" fill="#f7f7f5" stroke="#d9d1c5" />
      <path d="M10 18l4-8h16l4 8" fill="#e7f1f6" stroke="#d9d1c5" />
      <rect x="14" y="30" width="16" height="16" rx="2" fill="#2c5f7c" />
    </g>
  );
}

function Bread() {
  return (
    <g transform="translate(312 246)">
      <path d="M6 24c0-12 10-20 22-20s22 8 22 20v16H6V24Z" fill="#e4b56a" />
      <path d="M12 22h28M16 28h20" stroke="#c4893a" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M8 40h36v8c0 4-4 6-8 6H16c-4 0-8-2-8-6v-8Z" fill="#f0d7a4" />
    </g>
  );
}

function Tomato() {
  return (
    <g transform="translate(400 244)">
      <path d="M16 16c4-8 12-8 16 0" stroke="#1f7a4d" strokeWidth="2" fill="none" />
      <circle cx="24" cy="32" r="16" fill="#d24b3a" />
      <path d="M24 18c-2 6-8 8-12 8 4 2 8 8 12 8s8-6 12-8c-4 0-10-2-12-8Z" fill="#e27164" opacity="0.7" />
    </g>
  );
}

function Cereal() {
  return (
    <g transform="translate(468 226)">
      <rect x="6" y="16" width="36" height="52" rx="4" fill="#f3e2bc" stroke="#e4ddd2" />
      <rect x="12" y="28" width="24" height="16" rx="2" fill="#0e5c4a" />
      <path d="M14 52h20" stroke="#c4893a" strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}
