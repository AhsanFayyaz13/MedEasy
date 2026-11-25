import { FaStar, FaRegStar } from 'react-icons/fa';

/** Read-only 5-star rating with an accessible text label. */
export default function StarRating({ value = 0, count, size = 14 }) {
  const rounded = Math.round(value);
  const label = count
    ? `Rated ${value.toFixed(1)} out of 5 from ${count} review${count === 1 ? '' : 's'}`
    : 'No reviews yet';

  return (
    <div className="star-rating" role="img" aria-label={label}>
      {Array.from({ length: 5 }, (_, i) =>
        i < rounded ? (
          <FaStar key={i} size={size} className="star-rating__on" aria-hidden="true" />
        ) : (
          <FaRegStar key={i} size={size} className="star-rating__off" aria-hidden="true" />
        )
      )}
      {count !== undefined && (
        <span className="star-rating__count" aria-hidden="true">
          {count ? `(${count})` : 'No reviews'}
        </span>
      )}
    </div>
  );
}
