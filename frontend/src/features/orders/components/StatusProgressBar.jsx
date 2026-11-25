import { ProgressBar } from 'react-bootstrap';
import { FaBan } from 'react-icons/fa';
import { STATUS_CONFIG, STEPS } from './orderShared';


// ─── Progress bar row ─────────────────────────────────────────────────────────
export default function StatusProgressBar({ status }) {
  const cfg  = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const step = cfg.step; // -1 for cancelled

  if (status === 'cancelled') {
    return (
      <div className="status-pb-wrap cancelled">
        <div className="pb-steps">
          {STEPS.map((s) => (
            <div key={s.key} className="pb-step inactive">
              <div className="pb-bubble">{s.icon}</div>
              <span className="pb-label">{s.label}</span>
            </div>
          ))}
        </div>
        <ProgressBar now={0} className="track-bar" />
        <p className="cancelled-note"><FaBan className="me-1" />This order was cancelled.</p>
      </div>
    );
  }

  const pct = step < 0 ? 0 : Math.round((step / (STEPS.length - 1)) * 100);

  return (
    <div className="status-pb-wrap">
      <ProgressBar now={pct} className="track-bar" />
      <div className="pb-steps">
        {STEPS.map((s, i) => {
          const done    = i < step;
          const current = i === step;
          return (
            <div key={s.key} className={`pb-step ${done ? 'done' : ''} ${current ? 'current' : ''}`}>
              <div className="pb-bubble">{s.icon}</div>
              <span className="pb-label">{s.label}</span>
              {current && <span className="pb-now-dot" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
