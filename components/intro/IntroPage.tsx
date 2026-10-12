"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { IntroScene } from "@/components/intro/IntroScene";

const phases = ["Checking sources", "Evidence found", "Check complete"] as const;

const steps = [
  ["01", "Enter the product", "Barcode, name, brand, lot, date, or region."],
  ["02", "Check sources", "Configured recall sources are read and labeled."],
  ["03", "Read the evidence", "The result keeps the excerpts and the time they were retrieved."],
  ["04", "Open the app", "The same FoodTrace check you already use."],
];

export function IntroPage() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.2 });
  const [play, setPlay] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [phase, setPhase] = useState(reduce ? 2 : 0);
  const [showCard, setShowCard] = useState(Boolean(reduce));
  const [cue, setCue] = useState(Boolean(reduce));

  useEffect(() => {
    if (reduce || play || !inView) return;
    setPlay(true);
  }, [inView, play, reduce]);

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (reduce || !play) return;
    const timers = [
      window.setTimeout(() => setShowCard(true), 4500),
      window.setTimeout(() => setPhase(1), 5450),
      window.setTimeout(() => setPhase(2), 6400),
      window.setTimeout(() => setCue(true), 7600),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [play, reduce]);

  return (
    <main id="main" ref={ref} className="hero-wash min-h-screen overflow-x-clip px-4 py-10 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl flex-col items-center justify-center text-center">
        <IntroScene play={play} paused={!inView || hidden} />
        <div className="mt-4 min-h-14 w-full max-w-sm">
          {showCard ? (
            <div className="ft-card flex items-center justify-between gap-3 px-4 py-3 text-left" aria-live="polite">
              <p className="text-sm font-semibold">{phases[phase]}</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber">Demo</p>
            </div>
          ) : null}
        </div>
        <p className="sr-only">Illustrated introduction. The card is a demo, not a real product result.</p>
        <motion.div
          className="mt-2 max-w-2xl"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={reduce || cue ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <h1 className="font-serif text-4xl leading-tight text-ink sm:text-6xl">Know what&apos;s happening with the food you buy.</h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-muted">FoodTrace helps you trace products, check recall information, and understand the evidence behind every result.</p>
          <div className="mt-8 flex flex-col items-center gap-4">
            <Link
              href="/lookup"
              className="group relative inline-flex min-h-12 items-center justify-center gap-3 overflow-hidden rounded-full bg-pine px-8 py-3 text-base font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-pine-dark"
            >
              Enter FoodTrace
              <ArrowRight aria-hidden="true" className="h-4 w-4 transition duration-200 group-hover:translate-x-1" />
              <span className="absolute bottom-1.5 left-8 right-8 h-px origin-left scale-x-0 bg-white/80 transition duration-300 group-hover:scale-x-100" />
            </Link>
            <Link href="/lookup#demo-scenarios" className="inline-flex min-h-12 items-center justify-center rounded-full border border-line bg-white px-8 py-3 text-base font-semibold text-ink">
              Try Demo
            </Link>
            <a href="#how-it-works" className="text-sm font-semibold text-lake underline-offset-4 hover:underline">How It Works</a>
          </div>
        </motion.div>
      </div>
      <section id="how-it-works" className="mx-auto mt-16 max-w-5xl pb-16">
        <h2 className="text-center font-serif text-3xl">How it works</h2>
        <ol className="mt-8 grid gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(([number, title, body]) => (
            <li key={number} className="rounded-[24px] border border-line bg-card p-5">
              <p className="font-serif text-2xl text-lake">{number}</p>
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
