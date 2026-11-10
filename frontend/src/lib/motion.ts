import type { Transition, Variants } from "motion/react";

export const springSoft: Transition = {
  type: "spring",
  stiffness: 220,
  damping: 26,
};

export const fadeUp: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};
