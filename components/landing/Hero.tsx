"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { HeroStory } from "@/components/landing/HeroStory";

const phases = ["Checking sources", "Evidence found", "Check complete"] as const;

export function Hero() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const [play, setPlay] = useState(false);
  const [cue, setCue] = useState(Boolean(reduce));
  const [phase, setPhase] = useState(reduce ? 2 : 0);
  const [showCard, setShowCard] = useState(Boolean(reduce));
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    if (reduce || play || !inView) return;
    setPlay(true);
  }, [inView, play, reduce]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const apply = () => setCompact(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (reduce || compact) setCue(true);
  }, [reduce, compact]);

  useEffect(() => {
    if (reduce || !play) return;
    const timers = [
      window.setTimeout(() => setShowCard(true), 4600),
      window.setTimeout(() => setPhase(1), 5600),
      window.setTimeout(() => setPhase(2), 6600),
      window.setTimeout(() => setCue(true), 7400),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [play, reduce]);

  return (
    <section id="product" ref={ref} className="hero-wash overflow-x-clip">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:py-20">
        <motion.div
          className="order-2 lg:order-1"
          initial={reduce || compact ? false : { opacity: 0, y: 12 }}
          animate={reduce || compact || cue ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-pine">Food recall evidence</p>
          <h1 className="mt-4 max-w-xl font-serif text-4xl leading-tight text-ink sm:text-6xl">Know what&apos;s happening with the food you buy.</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-muted">FoodTrace checks product and batch information against trusted recall sources and shows the evidence behind every result.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/lookup" className="rounded-full bg-pine px-5 py-3 text-center font-semibold text-white transition hover:bg-pine-dark">Check a Product</Link>
            <a href="#how-it-works" className="rounded-full border border-line bg-white px-5 py-3 text-center font-semibold transition hover:border-pine">See How It Works</a>
          </div>
          <p className="sr-only">Illustrated demo: foods appear, a leaf mascot checks a package, and a sample card moves from checking sources to evidence found to check complete. This is not a real product result.</p>
        </motion.div>
        <div className="order-1 lg:order-2">
          <HeroStory play={play} paused={!inView} />
          <div className="mx-auto mt-3 min-h-16 w-full max-w-xl">
            {showCard ? (
              <div className="ft-card flex items-center justify-between gap-3 px-4 py-3" aria-live="polite">
                <p className="text-sm font-semibold">{phases[phase]}</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber">Demo</p>
              </div>
            ) : (
              <p className="text-sm text-muted">A short illustrated introduction.</p>
            )}
            <p className="mt-2 text-xs leading-5 text-muted">Illustrated demo. Not a real product check, and not a statement about a real package.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
