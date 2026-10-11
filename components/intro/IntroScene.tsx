"use client";

import { motion, useReducedMotion } from "framer-motion";

const foods = [
  { id: "spinach", delay: 0.25, node: <Spinach /> },
  { id: "apple", delay: 0.4, node: <Apple /> },
  { id: "bread", delay: 0.55, node: <Bread /> },
  { id: "milk", delay: 0.7, node: <Milk /> },
  { id: "tomato", delay: 0.85, node: <Tomato /> },
];

export function IntroScene({ play, paused }: { play: boolean; paused: boolean }) {
  const reduce = useReducedMotion();
  const still = Boolean(reduce);
  const run = play && !still;

  return (
    <div className={`ft-scene mx-auto w-full max-w-3xl overflow-hidden ${paused ? "is-paused" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 720 340" className="h-auto max-h-[46vh] w-full sm:max-h-[380px]">
        <rect width="720" height="340" rx="32" fill="#f7f3ec" />
        <ellipse cx="360" cy="286" rx="250" ry="14" fill="#e6dfd4" />
        {foods.map((food, index) => (
          <motion.g
            key={food.id}
            initial={still ? false : { opacity: 0, y: 18 }}
            animate={still || run ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
            transition={{ duration: 0.5, delay: food.delay, ease: "easeOut" }}
          >
            <g className={run ? "ft-float" : undefined} style={run ? { animationDelay: `${index * 0.15}s` } : undefined}>
              {food.node}
            </g>
          </motion.g>
        ))}
        <motion.g
          initial={still ? false : { x: -160, y: 8 }}
          animate={
            still
              ? { x: 0, y: 0 }
              : run
                ? { x: [-160, 20, 150, 24], y: [8, 0, -36, 0] }
                : { x: -160, y: 8 }
          }
          transition={still ? { duration: 0 } : { duration: 2.8, delay: 1.2, times: [0, 0.4, 0.68, 1], ease: "easeInOut" }}
        >
          <Mascot />
        </motion.g>
        {run ? (
          <g className="ft-scan">
            <rect x="118" y="168" width="7" height="78" rx="3" fill="#2c5f7c" />
          </g>
        ) : still ? (
          <rect x="146" y="168" width="7" height="78" rx="3" fill="#2c5f7c" opacity="0.35" />
        ) : null}
        <Labels visible={still || run} delay={run ? 3.9 : 0} />
        <motion.g
          initial={still ? false : { y: -48, opacity: 0 }}
          animate={still || run ? { y: 0, opacity: 1 } : { y: -48, opacity: 0 }}
          transition={run ? { type: "spring", stiffness: 280, damping: 15, delay: 6.7 } : { duration: 0.2 }}
        >
          <Logo />
        </motion.g>
      </svg>
    </div>
  );
}

function Labels({ visible, delay }: { visible: boolean; delay: number }) {
  const items = [
    { x: 210, y: 132, label: "Product" },
    { x: 292, y: 132, label: "Batch" },
    { x: 210, y: 160, label: "Source" },
    { x: 292, y: 160, label: "Evidence" },
  ];
  return (
    <g>
      {items.map((item, index) => (
        <motion.g
          key={item.label}
          initial={delay === 0 ? false : { opacity: 0, y: 6 }}
          animate={visible ? { opacity: 1, y: 0 } : { opacity: 0 }}
          transition={{ duration: 0.28, delay: delay === 0 ? 0 : delay + index * 0.1 }}
        >
          <rect x={item.x} y={item.y} width="74" height="22" rx="11" fill="#fffcf8" stroke="#e4ddd2" />
          <text x={item.x + 37} y={item.y + 15} textAnchor="middle" fontSize="11" fontFamily="Georgia, serif" fill="#1c1915">
            {item.label}
          </text>
        </motion.g>
      ))}
    </g>
  );
}

function Logo() {
  return (
    <g>
      <rect x="286" y="28" width="148" height="40" rx="20" fill="#0e5c4a" />
      <path d="M304 48c5-10 12-14 20-15-1 7-1 11 2 17-6 1-12 1-16 5-3-2-5-4-6-7Z" fill="#f4f1eb" />
      <text x="332" y="53" fill="#fffcf8" fontSize="16" fontFamily="Georgia, serif">FoodTrace</text>
    </g>
  );
}

function Mascot() {
  return (
    <g transform="translate(78 150)">
      <ellipse cx="36" cy="92" rx="18" ry="5" fill="#e6dfd4" />
      <path d="M36 16c18 2 32 20 26 46-10 20-32 26-46 16C2 66 0 40 14 24 20 16 28 14 36 16Z" fill="#0e5c4a" />
      <path d="M32 24c10 2 18 10 16 22-10 2-18 0-22-10 1-5 2-10 6-12Z" fill="#1f8a68" />
      <path d="M36 8c2 7 2 12 0 16" stroke="#083f33" strokeWidth="2" strokeLinecap="round" />
      <circle cx="28" cy="46" r="2.3" fill="#f4f1eb" />
      <circle cx="42" cy="46" r="2.3" fill="#f4f1eb" />
      <path d="M30 56c4 3 10 3 14 0" stroke="#f4f1eb" strokeWidth="1.7" strokeLinecap="round" fill="none" />
      <path d="M24 90c-4 10-2 16 5 16M48 90c4 10 2 16-5 16" stroke="#083f33" strokeWidth="2.2" strokeLinecap="round" />
      <g transform="translate(50 34)">
        <circle cx="13" cy="13" r="10" fill="#fffcf8" stroke="#1c1915" strokeWidth="2" />
        <path d="M20 20 30 30" stroke="#1c1915" strokeWidth="2.6" strokeLinecap="round" />
      </g>
    </g>
  );
}

function Spinach() {
  return (
    <g transform="translate(118 196)">
      <path d="M30 6c12 10 16 24 8 40-14-2-26-14-28-28 5-8 12-12 20-12Z" fill="#1f7a4d" />
      <path d="M20 16c8 4 12 16 8 30" stroke="#d7ebe3" strokeWidth="1.5" fill="none" />
      <path d="M32 46v16" stroke="#3d6b32" strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

function Apple() {
  return (
    <g transform="translate(230 206)">
      <path d="M24 8c2-7 9-9 12-8-1 6 0 9 4 11" stroke="#3d6b32" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="24" cy="32" r="18" fill="#c4513a" />
      <path d="M16 26c3 2 6 2 8 0" stroke="#f4c7bc" strokeWidth="1.6" fill="none" />
    </g>
  );
}

function Bread() {
  return (
    <g transform="translate(330 214)">
      <path d="M8 26C8 12 20 4 36 4s28 8 28 22v18H8V26Z" fill="#e4b56a" />
      <path d="M16 24h32M18 32h24" stroke="#c4893a" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 44h52v8c0 5-5 8-10 8H20c-5 0-10-3-10-8v-8Z" fill="#f0d7a4" />
    </g>
  );
}

function Milk() {
  return (
    <g transform="translate(446 198)">
      <path d="M12 22h28l5 48H8L12 22Z" fill="#f7f7f5" stroke="#d9d1c5" />
      <path d="M12 22 17 12h18l5 10" fill="#e7f1f6" stroke="#d9d1c5" />
      <rect x="18" y="36" width="16" height="18" rx="3" fill="#2c5f7c" />
    </g>
  );
}

function Tomato() {
  return (
    <g transform="translate(548 210)">
      <path d="M18 16c5-9 14-9 18 0" stroke="#1f7a4d" strokeWidth="2" fill="none" />
      <circle cx="26" cy="34" r="18" fill="#d24b3a" />
      <path d="M26 20c-2 7-9 9-14 9 5 2 9 9 14 9s9-7 14-9c-5 0-12-2-14-9Z" fill="#e27164" opacity="0.75" />
    </g>
  );
}
