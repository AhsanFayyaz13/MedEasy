import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FiAlertTriangle, FiArrowLeft, FiCheck, FiFileText, FiMinus, FiPlus, FiShoppingCart } from 'react-icons/fi';
import { useCart } from '../../../context/CartContext';
import { useToast } from '../../../context/ToastContext';
import { useAuth, ROLE_DASHBOARD } from '../../../context/AuthContext';
import { useAuthModal } from '../../../context/AuthModalContext';
import api from '../../../services/api/client';
import { Alert, Badge, Button, Card, EmptyState, ErrorState, Skeleton } from '../../../components/ui';
import PageMeta from '../../../components/seo/PageMeta';
import { formatDate, formatPrice } from '../../../lib/format';
import MedicalIcon from '../components/MedicalIcon';
import normalizeMedicine from '../lib/normalizeMedicine';
import './MedicineDetail.css';

const LOW_STOCK = 20;

function useMedicine(id) {
  const [state, setState] = useState({ med: null, loading: true, error: null, notFound: false });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    api
      .get(`/medicines/${id}`)
      .then(({ data }) => alive && setState({ med: normalizeMedicine(data), loading: false, error: null, notFound: false }))
      .catch((e) => {
        if (!alive) return;
        const status = e.response?.status ?? e.status;
        setState({ med: null, loading: false, notFound: status === 404 || status === 400, error: e.response?.data?.message || 'Could not load this medicine.' });
      });
    return () => {
      alive = false;
    };
  }, [id, attempt]);

  return { ...state, retry: () => setAttempt((n) => n + 1) };
}

function DetailSkeleton() {
  return (
    <div className="mdd-layout" aria-busy="true" aria-label="Loading medicine">
      <Skeleton variant="rect" height={320} />
      <div>
        <Skeleton width="30%" />
        <Skeleton width="70%" height={36} />
        <Skeleton lines={4} />
      </div>
    </div>
  );
}

export default function MedicineDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, isInCart } = useCart();
  const { toast } = useToast();
  const { isAuthenticated, userRole } = useAuth();
  const { openLoginModal } = useAuthModal();
  const { med, loading, error, notFound, retry } = useMedicine(id);
  const [qty, setQty] = useState(1);

  // Shopping is for patients; staff go back to their dashboards.
  useEffect(() => {
    if (isAuthenticated && userRole && userRole !== 'patient' && ROLE_DASHBOARD[userRole]) {
      navigate(ROLE_DASHBOARD[userRole], { replace: true });
    }
  }, [isAuthenticated, userRole, navigate]);

  const goUpload = () => {
    if (!isAuthenticated) return openLoginModal();
    navigate('/prescriptions/upload', { state: { requiredForMedicine: med.name } });
  };

  const add = () => {
    const result = addToCart(med, qty);
    if (result === 'capped') toast.warning(`You already have the maximum (${med.stock}) of ${med.name} in your cart.`);
    else toast.cart(`${qty > 1 ? `${qty} × ` : ''}${med.name} added to cart`, { duration: 2500 });
  };

  let content;
  if (loading) content = <DetailSkeleton />;
  else if (notFound) {
    content = (
      <EmptyState
        title="Medicine not found"
        description="It may have been removed or the link is wrong."
        action={<Button to="/medicines" leftIcon={<FiArrowLeft aria-hidden="true" />}>Browse medicines</Button>}
      />
    );
  } else if (error || !med) content = <ErrorState title="Couldn’t load this medicine" message={error} onRetry={retry} />;
  else {
    const title = med.brand || med.name;
    const inStock = med.stock > 0;
    const lowStock = inStock && med.stock <= LOW_STOCK;
    const rx = med.requires_prescription;
    const inCart = isInCart(med.id);

    content = (
      <>
        <PageMeta
          title={`${title}${med.brand ? ` — ${med.name}` : ''}`}
          description={`Buy ${med.name}${med.brand ? ` (${med.brand})` : ''} online at MedEasy. ${med.description || ''}`.trim().slice(0, 160)}
        />

        <nav aria-label="Breadcrumb" className="mdd-crumbs">
          <ol>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/medicines">Medicines</Link></li>
            <li><Link to={`/medicines?category=${encodeURIComponent(med.category)}`}>{med.category}</Link></li>
            <li aria-current="page">{title}</li>
          </ol>
        </nav>

        <div className="mdd-layout">
          <div className="mdd-media">
            <MedicalIcon emoji={med.image || '💊'} category={med.category} size={72} alt={title} />
            <div className="mdd-media__flags">
              {rx ? <Badge tone="warning" icon={<FiFileText />}>Prescription</Badge> : <Badge tone="success">Over the counter</Badge>}
              {med.discount_pct > 0 && inStock && <Badge tone="error" solid>-{med.discount_pct}%</Badge>}
            </div>
          </div>

          <div className="mdd-info">
            <p className="mdd-category">{med.category}</p>
            <h1 className="mdd-title">{title}</h1>
            <p className="mdd-sub">
              {med.brand && <>{med.name} · </>}
              {med.manufacturer ? <>by <strong>{med.manufacturer}</strong></> : null}
            </p>

            <div className="mdd-price">
              <span className="mdd-price__now">{formatPrice(med.price)}</span>
              {med.original_price && <s className="mdd-price__was">{formatPrice(med.original_price)}</s>}
            </div>

            <p className="mdd-stock">
              {!inStock && <Badge tone="error">Out of stock</Badge>}
              {lowStock && <Badge tone="warning">Only {med.stock} left</Badge>}
              {inStock && !lowStock && <Badge tone="success" icon={<FiCheck />}>In stock</Badge>}
            </p>

            {med.description && <p className="mdd-desc">{med.description}</p>}

            {rx ? (
              <Alert tone="warning" title="Prescription required">
                <p>A licensed pharmacist must verify your doctor’s prescription before this medicine can be ordered.</p>
                <Button size="sm" leftIcon={<FiFileText aria-hidden="true" />} onClick={goUpload} className="mdd-rx-btn">
                  Upload prescription
                </Button>
              </Alert>
            ) : inStock ? (
              <div className="mdd-buy">
                <div className="mdd-qty" role="group" aria-label="Quantity">
                  <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Decrease quantity">
                    <FiMinus aria-hidden="true" />
                  </button>
                  <output aria-live="polite">{qty}</output>
                  <button type="button" onClick={() => setQty((q) => Math.min(med.stock, q + 1))} disabled={qty >= med.stock} aria-label="Increase quantity">
                    <FiPlus aria-hidden="true" />
                  </button>
                </div>
                <Button size="lg" leftIcon={<FiShoppingCart aria-hidden="true" />} onClick={add}>
                  Add to cart · {formatPrice(med.price * qty)}
                </Button>
                {inCart && (
                  <Button size="lg" variant="secondary" to="/cart">
                    View cart
                  </Button>
                )}
              </div>
            ) : (
              <Button size="lg" variant="secondary" disabled>
                Out of stock
              </Button>
            )}

            <dl className="mdd-facts">
              <div><dt>Category</dt><dd>{med.category}</dd></div>
              {med.manufacturer && <div><dt>Manufacturer</dt><dd>{med.manufacturer}</dd></div>}
              <div><dt>Prescription</dt><dd>{rx ? 'Required' : 'Not required'}</dd></div>
              {med.expiryDate && <div><dt>Expires</dt><dd>{formatDate(med.expiryDate, { month: 'long', year: 'numeric' })}</dd></div>}
            </dl>
          </div>
        </div>

        <Card className="mdd-safety">
          <FiAlertTriangle aria-hidden="true" />
          <p>
            Read the patient leaflet and follow the dose your doctor or pharmacist gives you. Information on this page is not
            medical advice — see our <Link to="/medical-disclaimer">medical disclaimer</Link>.
          </p>
        </Card>
      </>
    );
  }

  return (
    <div className="mdd-page">
      {!med && <PageMeta title="Medicine" />}
      <div className="container">
        <Button variant="ghost" size="sm" leftIcon={<FiArrowLeft aria-hidden="true" />} onClick={() => navigate(-1)} className="mdd-back">
          Back
        </Button>
        {content}
      </div>
    </div>
  );
}
