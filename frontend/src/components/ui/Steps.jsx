import { FiCheck } from 'react-icons/fi';
import { cx } from '../../lib/cx';

/** Numbered progress steps (e.g. Cart → Delivery → Payment → Done). */
export default function Steps({ steps, current, className }) {
  return (
    <ol className={cx('ui-steps', className)} aria-label="Progress">
      {steps.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo';
        return (
          <li key={label} className={`ui-steps__item is-${state}`} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="ui-steps__dot" aria-hidden="true">{state === 'done' ? <FiCheck /> : i + 1}</span>
            <span className="ui-steps__label">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
