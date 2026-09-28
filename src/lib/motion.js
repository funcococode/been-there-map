// Shared easing curves & helpers so every animation speaks the same language.
export const EASE = {
  expo: [0.16, 1, 0.3, 1],
  quart: [0.76, 0, 0.24, 1],
  soft: [0.33, 1, 0.68, 1],
}

export const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 1, ease: EASE.expo, delay: i * 0.08 },
  }),
}

export const pad = (n, l = 2) => String(n).padStart(l, '0')
