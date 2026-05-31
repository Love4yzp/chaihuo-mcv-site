import type { Variants } from 'motion/react';

// ─── Animation Variants ───

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
};

export const fadeDown: Variants = {
  hidden: { opacity: 0, y: -40 },
  visible: { opacity: 1, y: 0 },
};

export const fadeLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0 },
};

export const fadeRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0 },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
};

// ─── Stagger Container ───

export const stagger = (staggerMs = 0.15): Variants => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren: staggerMs,
    },
  },
});

// ─── Shared Transition ───

export const springTransition = {
  type: 'spring' as const,
  damping: 25,
  stiffness: 120,
};

export const defaultViewport = {
  once: true,
  amount: 0.2 as const,
};

// ─── Micro-interactions ───

export const hoverLift = {
  whileHover: { y: -4 },
  transition: { type: 'spring' as const, damping: 20, stiffness: 300 },
};

export const buttonPress = {
  whileHover: { scale: 1.03 },
  whileTap: { scale: 0.97 },
};
