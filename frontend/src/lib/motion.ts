import type { Transition, Variants } from "motion/react";

export const springTransition: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 28,
};

export const pageFadeRise: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.16, ease: "easeOut" } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.12, ease: "easeIn" } },
};

export const cardStagger: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.04,
      duration: 0.18,
      ease: "easeOut",
    },
  }),
};

