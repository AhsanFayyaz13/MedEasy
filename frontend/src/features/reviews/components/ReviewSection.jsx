import { useCallback, useEffect, useState } from 'react';
import { FiLock } from 'react-icons/fi';
import { useAuth } from '../../../context/AuthContext';
import { useAuthModal } from '../../../context/AuthModalContext';
import { useToast } from '../../../context/ToastContext';
import { deleteReview, fetchReviews, postReview, updateReview } from '../../../services/api/reviewService';
import { fetchMyAppointments } from '../../../services/api/appointmentService';
import { Alert, Button, Card, ErrorState, Skeleton } from '../../../components/ui';
import { RatingSummary, ReviewCard, ReviewForm } from './ReviewParts';

/**
 * Reviews for one target (currently doctors on the booking page).
 * Doctor reviews are open only after a completed consultation (the API enforces this too).
 */
export default function ReviewSection({ targetType, targetId }) {
  const { user, isAuthenticated, userRole } = useAuth();
  const { openLoginModal } = useAuthModal();
  const { toast } = useToast();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [eligible, setEligible] = useState(null); // null = checking

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReviews(await fetchReviews({ targetType, targetId }));
    } catch {
      setError('We couldn’t load the reviews.');
    } finally {
      setLoading(false);
    }
  }, [targetType, targetId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let alive = true;
    if (!isAuthenticated || userRole !== 'patient' || targetType !== 'doctor') return undefined;
    fetchMyAppointments()
      .then((list) => alive && setEligible(list.some((a) => String(a.doctorId) === String(targetId) && a.status === 'completed')))
      .catch(() => alive && setEligible(false));
    return () => {
      alive = false;
    };
  }, [isAuthenticated, userRole, targetType, targetId]);

  const myId = String(user?._id || user?.id || '');
  const alreadyReviewed = reviews.some((r) => String(r.userId?._id || r.userId) === myId);
  const isMine = (r) => String(r.userId?._id || r.userId) === myId;
  const saveEdit = (r) => async (values) => {
    const updated = await updateReview(r._id, values);
    setReviews((prev) => prev.map((x) => (x._id === r._id ? updated : x)));
    toast.success('Your review has been updated.');
  };
  const remove = (r) => async () => {
    try {
      await deleteReview(r._id);
      setReviews((prev) => prev.filter((x) => x._id !== r._id));
      toast.success('Your review has been deleted.');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not delete the review.');
    }
  };


  const submit = async (values) => {
    const created = await postReview({ targetType, targetId, ...values });
    setReviews((prev) => [{ ...created, userId: { _id: user?._id || user?.id, name: user?.name } }, ...prev]);
    toast.success('Thanks! Your review has been published.');
  };

  let formArea;
  if (!isAuthenticated) {
    formArea = (
      <Alert tone="info">
        <Button variant="link" onClick={openLoginModal}>Sign in</Button> to review this doctor after your consultation.
      </Alert>
    );
  } else if (userRole !== 'patient') {
    formArea = null;
  } else if (alreadyReviewed) {
    formArea = <Alert tone="success">Thanks for your review! You can edit or delete it below.</Alert>;
  } else if (eligible === null) {
    formArea = <Skeleton lines={2} />;
  } else if (!eligible) {
    formArea = (
      <Alert tone="info" title={<><FiLock aria-hidden="true" /> Verified reviews only</>}>
        You can review a doctor once you’ve had a completed consultation with them, so every rating comes from a real patient.
      </Alert>
    );
  } else {
    formArea = (
      <Card>
        <ReviewForm onSubmit={submit} placeholder="How was your consultation?" />
      </Card>
    );
  }

  return (
    <div className="rv-section">
      {!loading && !error && <RatingSummary reviews={reviews} />}
      {formArea}
      {loading && <Skeleton lines={3} />}
      {error && <ErrorState title="Reviews unavailable" message={error} onRetry={load} />}
      {!loading && !error && reviews.length > 0 && (
        <ul className="rv-list">
          {reviews.map((r) => (
            <li key={r._id || r.id}><ReviewCard review={r} onSave={isMine(r) ? saveEdit(r) : undefined} onDelete={isMine(r) ? remove(r) : undefined} /></li>
          ))}
        </ul>
      )}
    </div>
  );
}
