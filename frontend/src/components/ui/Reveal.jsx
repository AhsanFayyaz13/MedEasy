import useReveal from '../../hooks/useReveal';
import { cx } from '../../lib/cx';

/**
 * Fades/slides children in when scrolled into view.
 * Honors prefers-reduced-motion (content is shown immediately).
 */
export default function Reveal({ as: Tag = 'div', delay = 0, className, children, ...rest }) {
  const [ref, visible] = useReveal();
  return (
    <Tag
      ref={ref}
      className={cx('ui-reveal', visible && 'is-visible', className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}
