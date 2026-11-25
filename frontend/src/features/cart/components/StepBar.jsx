import { ProgressBar } from 'react-bootstrap';


// ─── Step indicator ───────────────────────────────────────────────────────────
export default function StepBar({ step }) {
  const steps = ['Cart', 'Shipping', 'Payment', 'Confirm'];
  const pct   = Math.round(((step + 1) / steps.length) * 100);
  return (
    <div className="step-bar mb-4">
      <ProgressBar now={pct} className="step-progress" />
      <div className="step-labels">
        {steps.map((s, i) => (
          <span key={s} className={`step-label ${i <= step ? 'active' : ''}`}>{s}</span>
        ))}
      </div>
    </div>
  );
}
