import { useId, useState } from 'react';
import { FaRegStar, FaStar } from 'react-icons/fa';
import { Avatar, Button, Textarea } from '../../../components/ui';
import { formatDate } from '../../../lib/format';
import StarRating from '../../medicines/components/StarRating';
import '../reviews.css';

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

/** The reviewer's display name: the API populates userId; mocks use user. */
const reviewerName = (r) => r.userId?.name || r.user?.name || r.user_name || 'Patient';

/** Accessible 1–5 star picker (a radio group, so arrow keys work). */
export function RatingInput({ value, onChange, label = 'Your rating' }) {
  const name = useId();
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <fieldset className="rv-rating">
      <legend className="ui-field__label">{label}</legend>
      <div className="rv-rating__stars" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className={n <= shown ? 'is-on' : undefined} onMouseEnter={() => setHover(n)}>
            <input type="radio" name={name} value={n} checked={value === n} onChange={() => onChange(n)} className="visually-hidden" />
            {n <= shown ? <FaStar aria-hidden="true" /> : <FaRegStar aria-hidden="true" />}
            <span className="visually-hidden">{n} star{n > 1 ? 's' : ''} — {LABELS[n]}</span>
          </label>
        ))}
        <span className="rv-rating__label" aria-hidden="true">{shown ? LABELS[shown] : 'Select'}</span>
      </div>
    </fieldset>
  );
}

/** Rating + comment form. onSubmit({ rating, comment }) may throw to show an error. */
export function ReviewForm({ onSubmit, placeholder = 'Share your experience…' }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) return setError('Please choose a star rating.');
    if (!comment.trim()) return setError('Please write a few words about your experience.');
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ rating, comment: comment.trim() });
      setRating(0);
      setComment('');
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Could not submit your review.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="rv-form" onSubmit={submit} noValidate>
      <RatingInput value={rating} onChange={setRating} />
      <Textarea label="Your review" rows={4} maxLength={2000} placeholder={placeholder} value={comment} onChange={(e) => setComment(e.target.value)} error={error || undefined} />
      <Button type="submit" loading={saving}>Submit review</Button>
    </form>
  );
}

export function ReviewCard({ review }) {
  const name = reviewerName(review);
  return (
    <article className="rv-card">
      <header>
        <Avatar name={name} size={36} />
        <div className="rv-card__who">
          <strong>{name}</strong>
          <time dateTime={review.createdAt}>{formatDate(review.createdAt)}</time>
        </div>
        <StarRating value={review.rating} />
      </header>
      {review.comment && <p>{review.comment}</p>}
    </article>
  );
}

/** Average score with a star row and count. */
export function RatingSummary({ reviews }) {
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  return (
    <div className="rv-summary">
      <span className="rv-summary__score">{reviews.length ? avg.toFixed(1) : '–'}</span>
      <div>
        <StarRating value={avg} />
        <p>{reviews.length ? `Based on ${reviews.length} review${reviews.length > 1 ? 's' : ''}` : 'No reviews yet'}</p>
      </div>
    </div>
  );
}
