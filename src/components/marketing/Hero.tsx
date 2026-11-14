"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 novara-atmosphere" />
      <div className="absolute inset-0 novara-grid" />
      <div className="relative mx-auto flex min-h-[88vh] max-w-7xl flex-col justify-center px-4 py-20 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-3xl"
        >
          <div className="font-display text-5xl leading-[0.92] text-white sm:text-6xl md:text-7xl lg:text-8xl">
            NOVARA
          </div>
          <div className="mt-3 text-sm font-semibold uppercase tracking-[0.28em] text-champagne md:text-base">
            Asset Intelligence™
          </div>
          <div className="novara-gold-rule my-7 max-w-md" />
          <h1 className="max-w-2xl font-display text-3xl leading-tight text-white sm:text-4xl md:text-[2.75rem]">
            Find the asset. Find the owner. Find the opportunity.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-silver md:text-lg">
            A private AI operating system for national asset discovery, recovery, estate intelligence,
            and exclusive partner allocation — without promising guaranteed recoveries.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/app/executive">
              <Button className="animate-pulse-gold">Open Command Center</Button>
            </Link>
            <Link href="/discovery">
              <Button variant="secondary">Explore Discovery</Button>
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.8 }}
          className="mt-16 max-w-xl rounded-[14px] border border-champagne/25 bg-[#18263c]/55 p-5 backdrop-blur-sm"
        >
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-champagne">
            Official-source-first architecture
          </div>
          <p className="mt-2 text-sm leading-relaxed text-silver">
            Continuous monitoring targets 5–15 minute detection after official publication where
            technically and legally supported. Third-party feeds remain secondary.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
