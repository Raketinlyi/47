import { gsap } from 'gsap';

if (typeof window !== 'undefined') {
  // Smooth out occasional frame spikes but keep responsiveness for gameplay-scale animations.
  gsap.ticker.lagSmoothing(500, 16);
}

export { gsap };
