/** Join truthy class names: cx('a', cond && 'b') → 'a b' */
export function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}
