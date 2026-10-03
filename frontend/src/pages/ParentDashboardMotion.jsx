import React, { useCallback, useEffect, useRef, useState } from "react";

// Motion is presentation only; every target comes from the dashboard's data.
export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? true);
  useEffect(() => {
    const query = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return;
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function AnimatedNumber({ value, format = String }) {
  const reduced = useReducedMotion();
  const previous = useRef(null);
  const [display, setDisplay] = useState(() => reduced || value === null ? value : 0);
  useEffect(() => {
    if (value === null || !Number.isFinite(value)) {
      previous.current = null;
      setDisplay(value);
      return;
    }
    if (reduced || previous.current === value) {
      previous.current = value;
      setDisplay(value);
      return;
    }
    const from = previous.current ?? 0;
    let frame;
    let start;
    const tick = time => {
      start ??= time;
      const progress = Math.min(1, (time - start) / 650);
      const next = from + (value - from) * (1 - Math.pow(1 - progress, 3));
      previous.current = next;
      setDisplay(next);
      if (progress < 1) frame = globalThis.requestAnimationFrame(tick);
      else previous.current = value;
    };
    frame = globalThis.requestAnimationFrame(tick);
    return () => globalThis.cancelAnimationFrame(frame);
  }, [value, reduced]);
  if (value === null || !Number.isFinite(value)) return null;
  return <span><span className="sr-only">{format(value)}</span><span aria-hidden="true">{format(reduced ? value : (display ?? value))}</span></span>;
}

export function useCardTilt() {
  const ref = useRef(null);
  const frame = useRef(null);
  const reduced = useReducedMotion();
  const reset = useCallback(() => {
    if (frame.current !== null) globalThis.cancelAnimationFrame(frame.current);
    frame.current = null;
    const node = ref.current;
    if (!node) return;
    ["--tilt-x", "--tilt-y", "--light-x", "--light-y"].forEach(name => node.style.removeProperty(name));
    node.removeAttribute("data-tilting");
  }, []);
  useEffect(() => {
    if (reduced) reset();
    return () => {
      if (frame.current !== null) globalThis.cancelAnimationFrame(frame.current);
    };
  }, [reduced, reset]);
  const move = event => {
    if (reduced || event.pointerType !== "mouse" || !globalThis.matchMedia?.("(hover: hover) and (pointer: fine)").matches) return;
    const node = ref.current;
    if (!node) return;
    const bounds = node.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
    if (frame.current !== null) globalThis.cancelAnimationFrame(frame.current);
    frame.current = globalThis.requestAnimationFrame(() => {
      node.style.setProperty("--tilt-x", `${(0.5 - y) * 5}deg`);
      node.style.setProperty("--tilt-y", `${(x - 0.5) * 5}deg`);
      node.style.setProperty("--light-x", `${x * 100}%`);
      node.style.setProperty("--light-y", `${y * 100}%`);
      node.setAttribute("data-tilting", "true");
      frame.current = null;
    });
  };
  return { ref, onPointerMove: move, onPointerLeave: reset, onPointerCancel: reset };
}
