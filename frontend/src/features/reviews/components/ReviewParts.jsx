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
export function ReviewForm({ onSubmit, onCancel, initial, submitLabel = 'Submit review', placeholder = 'Share your experience…' }) {
  const [rating, setRating] = useState(initial?.rating || 0);
  const [comment, setComment] = useState(initial?.comment || '');
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
      if (!initial) {
        setRating(0);
        setComment('');
      }
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
      <div className="rv-form__actions">
        <Button type="submit" loading={saving}>{submitLabel}</Button>
        {onCancel && <Button variant="ghost" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  );
}

const wasEdited = (r) => r.updatedAt && r.createdAt && new Date(r.updatedAt) - new Date(r.createdAt) > 60_000;

/** One review. Pass onSave/onDelete for the signed-in author to edit or remove it. */
export function ReviewCard({ review, onSave, onDelete }) {
  const name = reviewerName(review);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const mine = Boolean(onSave);

  if (editing) {
    return (
      <article className="rv-card rv-card--editing">
        <ReviewForm
          initial={review}
          submitLabel="Save changes"
          onCancel={() => setEditing(false)}
          onSubmit={async (values) => {
            await onSave(values);
            setEditing(false);
          }}
        />
      </article>
    );
  }

  return (
    <article className={`rv-card${mine ? ' rv-card--mine' : ''}`}>
      <header>
        <Avatar name={name} size={36} />
        <div className="rv-card__who">
          <strong>{name}{mine && <span className="rv-card__you"> (you)</span>}</strong>
          <time dateTime={review.createdAt}>
            {formatDate(review.createdAt)}
            {wasEdited(review) && ' · edited'}
          </time>
        </div>
        <StarRating value={review.rating} />
      </header>
      {review.comment && <p>{review.comment}</p>}
      {mine && (
        <div className="rv-card__actions">
          {confirming ? (
            <>
              <span>Delete your review?</span>
              <Button size="sm" variant="danger" onClick={onDelete}>Delete</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>Keep</Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Edit</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>Delete</Button>
            </>
          )}
        </div>
      )}
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
