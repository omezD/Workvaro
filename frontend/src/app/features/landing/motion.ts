import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let registered = false;

/** GSAP with ScrollTrigger registered. Only the landing page imports this, so the app never loads it. */
export function motion(): { gsap: typeof gsap; ScrollTrigger: typeof ScrollTrigger } {
  if (!registered) {
    gsap.registerPlugin(ScrollTrigger);
    registered = true;
  }
  return { gsap, ScrollTrigger };
}

/** True when the visitor asked their system for less motion: show final states, skip animation. */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
