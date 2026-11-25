import { useCallback, useEffect, useState } from 'react';
import { FiMessageSquare } from 'react-icons/fi';
import { useAuth } from '../../../context/AuthContext';
import { useAuthModal } from '../../../context/AuthModalContext';
import { useToast } from '../../../context/ToastContext';
import { deleteReview, fetchReviews, postReview, updateReview, SITE_REVIEW_TARGET } from '../../../services/api/reviewService';
import { Alert, Button, Card, EmptyState, ErrorState, PageHeader, SkeletonCard } from '../../../components/ui';
import PageMeta from '../../../components/seo/PageMeta';
import { RatingSummary, ReviewCard, ReviewForm } from '../components/ReviewParts';
import '../reviews.css';

/** Public reviews of the MedEasy service, with a form for signed-in patients. */
export default function Reviews() {
  const { user, isAuthenticated, userRole } = useAuth();
  const { openLoginModal } = useAuthModal();
  const { toast } = useToast();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReviews(await fetchReviews({ ...SITE_REVIEW_TARGET, limit: 60 }));
    } catch {
      setError('We couldn’t load reviews right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
    const created = await postReview({ ...SITE_REVIEW_TARGET, ...values });
    setReviews((prev) => [{ ...created, userId: { _id: myId, name: user?.name } }, ...prev]);
    toast.success('Thanks for sharing your experience!');
  };

  let form;
  if (!isAuthenticated) {
    form = (
      <>
        <p className="text-muted">Ordered from us or booked a doctor? Sign in to share how it went.</p>
        <Button block onClick={openLoginModal}>Sign in to write a review</Button>
      </>
    );
  } else if (userRole !== 'patient') {
    form = <Alert tone="info">Reviews are written by patients.</Alert>;
  } else if (alreadyReviewed) {
    form = <Alert tone="success">Thanks for your review! You can edit or delete it from the list.</Alert>;
  } else {
    form = <ReviewForm onSubmit={submit} placeholder="Delivery speed, ordering, the doctors…" />;
  }

  let list;
  if (loading) {
    list = (
      <div className="rv-page__grid" aria-busy="true">
        {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} media={false} />)}
      </div>
    );
  } else if (error) list = <ErrorState message={error} onRetry={load} />;
  else if (!reviews.length) list = <EmptyState icon={<FiMessageSquare />} title="No reviews yet" description="Be the first to share your experience." />;
  else {
    list = (
      <ul className="rv-page__grid">
        {reviews.map((r) => (
          <li key={r._id}><ReviewCard review={r} onSave={isMine(r) ? saveEdit(r) : undefined} onDelete={isMine(r) ? remove(r) : undefined} /></li>
        ))}
      </ul>
    );
  }

  return (
    <div className="rv-page">
      <PageMeta title="Patient reviews" description="What patients say about ordering medicines and booking doctors with MedEasy." />
      <div className="container">
        <PageHeader eyebrow="Reviews" title="What our patients say" subtitle="Honest feedback from people who order medicines and book doctors with MedEasy." />
        <div className="rv-page__layout">
          <section aria-label="Reviews">{list}</section>
          <aside className="rv-page__aside">
            {/* The list already says "No reviews yet"; an empty score card would only repeat it. */}
            {!loading && !error && reviews.length > 0 && (
              <Card>
                <RatingSummary reviews={reviews} />
              </Card>
            )}
            <Card>
              <h2>Write a review</h2>
              {form}
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
