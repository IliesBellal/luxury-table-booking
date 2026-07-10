import { motion } from "framer-motion";

/** Coche dessinée progressivement (SVG pathLength) pour la confirmation. */
export function AnimatedCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 52 52" className={className} aria-hidden="true">
      <motion.circle
        cx="26"
        cy="26"
        r="23.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        initial={{ pathLength: 0, opacity: 0.9 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
      <motion.path
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 27.5l7.5 7.5L37 19"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.35, delay: 0.45, ease: "easeOut" }}
      />
    </svg>
  );
}
