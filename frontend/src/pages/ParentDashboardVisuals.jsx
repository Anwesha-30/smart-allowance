import React, { useEffect, useState } from "react";
import { Shield, Wallet, CheckCircle2, XCircle } from "lucide-react";
import { useCardTilt } from "./ParentDashboardMotion";

export function spendingTone(spent, limit, available = true) {
  if (!available || limit <= 0) return "neutral";
  const ratio = spent / limit;
  return ratio >= 1 ? "danger" : ratio > .7 ? "warning" : "safe";
}

export function ProtectionScene({ spent, limit, available }) {
  const tilt = useCardTilt();
  const tone = spendingTone(spent, limit, available);
  const label = tone === "neutral" ? "Awaiting spending limits" : tone === "danger" ? "Daily limit reached" : tone === "warning" ? "Approaching daily limit" : "Within daily spending limit";
  return <div {...tilt} className="pd-shield-scene" data-tone={tone}>
    <div className="pd-scene-copy"><span className="pd-scene-kicker">KIDSAFE CONTROL CENTER</span><h2>Freedom to explore.<br />Protection built in.</h2><p>Your family allowance, secured by on-chain guardrails.</p><div className="pd-scene-caption"><i aria-hidden="true" />{label}</div></div><div className="pd-scene-stage" aria-hidden="true"><div className="pd-scene-grid" /><div className="pd-scene-ring pd-scene-ring-one" /><div className="pd-scene-ring pd-scene-ring-two" /><span className="pd-scene-node pd-node-one" /><span className="pd-scene-node pd-node-two" /><div className="pd-scene-halo" /><div className="pd-scene-float"><div className="pd-shield-solid"><Shield className="pd-shield-back" size={106} strokeWidth={4} /><Shield className="pd-shield-edge" size={106} strokeWidth={3} /><Shield className="pd-shield-face" size={106} strokeWidth={1.2} /><span className="pd-shield-mark"><CheckCircle2 size={31} strokeWidth={1.4} /></span></div><div className="pd-coin-orbit"><span className="pd-orbit-coin"><Wallet size={21} /></span></div></div></div>
  </div>;
}

export function LiquidGauge({ spent, limit, available, label }) {
  const pct = limit > 0 ? Math.min(100, Math.max(0, spent / limit * 100)) : 0;
  const [fill, setFill] = useState(0);
  useEffect(() => {
    const frame = globalThis.requestAnimationFrame(() => setFill(pct));
    return () => globalThis.cancelAnimationFrame(frame);
  }, [pct]);
  const tone = spendingTone(spent, limit, available);
  return <div className="pd-gauge-layout"><div className="pd-liquid-gauge" data-tone={tone} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-valuetext={!available ? "Data unavailable" : limit <= 0 ? "Limit not set" : `${Math.round(spent / limit * 100)}% of limit spent`}>
    <div className="pd-liquid-shell" aria-hidden="true"><div className="pd-liquid" style={{ height: `${fill}%` }}><span className="pd-liquid-wave" /></div><div className="pd-gauge-readout"><strong>{available && limit > 0 ? `${Math.round(spent / limit * 100)}%` : "—"}</strong><span>{available && limit > 0 ? "of limit used" : "Not set"}</span></div></div>
  </div><span className="pd-gauge-note">{tone === "danger" ? "Limit reached" : tone === "warning" ? "Approaching limit" : tone === "safe" ? "Within your limit" : "Set a limit to track spending"}</span></div>;
}

export function DecisionFeedback({ decision, onDone }) {
  useEffect(() => {
    if (!decision) return;
    const timer = globalThis.setTimeout(onDone, 1900);
    return () => globalThis.clearTimeout(timer);
  }, [decision, onDone]);
  if (!decision) return null;
  const approved = decision.type === "approved";
  return <div key={decision.id + decision.type} className={`pd-decision ${approved ? "pd-decision-approved" : "pd-decision-rejected"}`}>
    <div className="pd-decision-card" role="status">{approved ? <CheckCircle2 size={22} /> : <XCircle size={22} />}<div><strong>Request {approved ? "approved" : "rejected"}</strong><p>{decision.demo ? "Demo action completed · no blockchain transaction" : "Confirmed on-chain"}</p></div></div>
    {approved && <div className="pd-confetti" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ "--piece": i, "--drift": `${(i - 5.5) * 14}px`, "--turn": `${i % 2 ? 180 : -180}deg` }} />)}</div>}
  </div>;
}
