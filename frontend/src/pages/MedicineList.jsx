import { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Spinner, Badge } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MedicineCard from '../components/MedicineCard';
import api from '../services/api';
import './MedicineList.css';

const CATEGORIES = [
  'Analgesics', 
  'Antibiotics', 
  'Antihistamines', 
  'Gastroenterology', 
  'Diabetes', 
  'Cardiology', 
  'Vitamins & Supplements', 
  'Respiratory', 
  'First Aid',
  'Dermatology',
  'Eye Care',
  'Child Health',
];

const SORT_OPTIONS = [
  { value: 'default',    label: 'Default Sort'        },
  { value: 'price_asc',  label: 'Price: Low → High'   },
  { value: 'price_desc', label: 'Price: High → Low'   },
  { value: 'rating',     label: 'Highest Rated'        },
  { value: 'name',       label: 'Name A–Z'             },
];

function useMedicines() {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchMeds = async () => {
      try {
        const res = await api.get('/medicines?limit=100');
        if (isMounted) {
          const mapped = res.data.medicines.map(m => ({
            ...m,
            id: m._id,
            requires_prescription: m.requiresPrescription
          }));
          setData(mapped);
        }
      } catch (err) {
        if (isMounted) setError('Failed to load medicines. Please try again.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchMeds();
    return () => { isMounted = false; };
  }, []);

  return { data, loading, error };
}

export default function MedicineList() {
  const navigate = useNavigate();
  const { isAuthenticated, userRole } = useAuth();

  useEffect(() => {
    if (isAuthenticated && userRole && userRole !== 'patient') {
      if (userRole === 'admin') navigate('/admin', { replace: true });
      else if (userRole === 'doctor') navigate('/doctor', { replace: true });
      else if (userRole === 'pharmacist') navigate('/pharmacist', { replace: true });
    }
  }, [isAuthenticated, userRole, navigate]);

  const { data: medicines, loading, error } = useMedicines();

  const [searchParams] = useSearchParams();
  const [query,        setQuery]        = useState('');
  const [category,     setCategory]     = useState(searchParams.get('category') || '');
  const [sort,         setSort]         = useState('default');
  const [typeFilter,   setTypeFilter]   = useState('all');
  const [inStockOnly,  setInStockOnly]  = useState(false);

  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat !== null) {
      setCategory(cat);
    }
  }, [searchParams]);

  // ── Derived filtered + sorted list ────────────────────────────
  const displayed = useMemo(() => {
    let list = [...medicines];

    // Text search: name, brand, category, tags
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q)       ||
          m.brand?.toLowerCase().includes(q)      ||
          m.category.toLowerCase().includes(q)    ||
          m.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Category filter
    if (category) list = list.filter((m) => m.category === category);

    // Type filter (All Types, Rx Required, OTC)
    if (typeFilter === 'rx') {
      list = list.filter((m) => m.requires_prescription);
    } else if (typeFilter === 'otc') {
      list = list.filter((m) => !m.requires_prescription);
    }

    // In stock filter
    if (inStockOnly) {
      list = list.filter((m) => m.stock > 0);
    }

    // Sort
    switch (sort) {
      case 'price_asc':  list.sort((a, b) => a.price  - b.price);  break;
      case 'price_desc': list.sort((a, b) => b.price  - a.price);  break;
      case 'rating':     list.sort((a, b) => b.rating - a.rating); break;
      case 'name':       list.sort((a, b) => a.name.localeCompare(b.name)); break;
      default: break;
    }

    return list;
  }, [medicines, query, category, sort, typeFilter, inStockOnly]);

  const hasFilters = query || category || typeFilter !== 'all' || inStockOnly || sort !== 'default';

  const clearFilters = () => {
    setQuery('');
    setCategory('');
    setSort('default');
    setTypeFilter('all');
    setInStockOnly(false);
  };

  return (
    <div className="medicine-list-page">
      <Container>

        {/* ── Page Header ────────────────────────────────────── */}
        <div className="ml-header mb-5">
          <div>
            <h1 className="page-title">Pharmacy Marketplace</h1>
            <p className="page-subtitle">
              {loading
                ? 'Loading…'
                : `${displayed.length} medicine${displayed.length !== 1 ? 's' : ''} found`}
            </p>
          </div>
          {hasFilters && (
            <button className="clear-btn btn btn-outline-danger" onClick={clearFilters}>
              <span className="material-symbols-outlined text-[16px]">close</span>
              Clear Filters
            </button>
          )}
        </div>

        {/* ── Search + Filter Bar ─────────────────────────────── */}
        <Row className="mb-4 gy-3 align-items-center">
          {/* Search */}
          <Col lg={4} md={6}>
            <div className="search-wrapper">
              <span className="material-symbols-outlined search-icon">search</span>
              <input
                type="text"
                placeholder="Search medications..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="search-input form-control"
                id="medicine-search"
                aria-label="Search medicines"
              />
              {query && (
                <button className="clear-search-btn" onClick={() => setQuery('')}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              )}
            </div>
          </Col>

          {/* Category Filter */}
          <Col lg={3} md={3} sm={6}>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Category filter"
              className="filter-select form-select"
              id="category-filter"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Col>

          {/* Type Filter */}
          <Col lg={2} md={3} sm={6}>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Type filter"
              className="filter-select form-select"
              id="type-filter"
            >
              <option value="all">All Types</option>
              <option value="rx">Rx Required</option>
              <option value="otc">OTC</option>
            </select>
          </Col>

          {/* Sort Option */}
          <Col lg={2} md={3} sm={6}>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort by"
              className="filter-select form-select"
              id="sort-select"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Col>

          {/* Toggle Switch */}
          <Col lg={1} md={3} sm={6} className="d-flex align-items-center">
            <div className="filter-switch form-check form-switch">
              <input
                type="checkbox"
                id="in-stock-toggle"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="form-check-input"
              />
              <label htmlFor="in-stock-toggle" className="form-check-label">
                In Stock
              </label>
            </div>
          </Col>
        </Row>

        {/* ── Active Filter Badges ─────────────────────────────── */}
        {hasFilters && (
          <div className="active-filters mb-4">
            {query && <Badge bg="primary" className="filter-tag">🔍 "{query}"</Badge>}
            {category && <Badge bg="secondary" className="filter-tag">{category}</Badge>}
            {inStockOnly && <Badge bg="success" className="filter-tag">In Stock</Badge>}
            {typeFilter === 'rx' && <Badge bg="warning" text="dark" className="filter-tag">Rx Required</Badge>}
            {typeFilter === 'otc' && <Badge bg="info" className="filter-tag">OTC</Badge>}
            {sort !== 'default' && (
              <Badge bg="dark" className="filter-tag">
                {SORT_OPTIONS.find((o) => o.value === sort)?.label}
              </Badge>
            )}
          </div>
        )}

        {/* ── Loading, Empty, and Error States ────────────────── */}
        {loading && (
          <div className="loading-state">
            <Spinner animation="border" variant="primary" className="mb-3" />
            <p className="text-muted mb-0">Fetching medicines…</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <div className="error-emoji">⚠️</div>
            <h5>Something went wrong</h5>
            <p className="mb-0">{error}</p>
          </div>
        )}

        {!loading && !error && displayed.length === 0 && (
          <div className="empty-state">
            <div className="empty-emoji">🔍</div>
            <h5>No medicines found</h5>
            <p>Try adjusting your search or filters.</p>
            <button className="btn btn-outline-primary rounded-8 px-4" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        )}

        {/* ── Medicine Grid ─────────────────────────────────── */}
        {!loading && !error && displayed.length > 0 && (
          <Row xs={1} sm={2} md={3} lg={4} className="g-4">
            {displayed.map((med) => (
              <Col key={med.id}>
                <MedicineCard medicine={med} />
              </Col>
            ))}
          </Row>
        )}

      </Container>
    </div>
  );
}
