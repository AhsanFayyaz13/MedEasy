import { useState, useEffect, useMemo } from 'react';
import {
  Container, Row, Col, Form, InputGroup,
  Button, Spinner, Badge, Dropdown,
} from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaSearch, FaTimes, FaSlidersH, FaSortAmountDown } from 'react-icons/fa';
import MedicineCard from '../components/MedicineCard';
import api from '../services/api';

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
import './MedicineList.css';

// ─── Sort options ─────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { value: 'default',    label: 'Default'             },
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
            requires_prescription: m.requiresPrescription // Map camelCase to snake_case for UI
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

// ─── Component ────────────────────────────────────────────────────────────────
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
  const [rxOnly,       setRxOnly]       = useState(false);
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

    // Toggle filters
    if (rxOnly)      list = list.filter((m) => m.requires_prescription);
    if (inStockOnly) list = list.filter((m) => m.stock > 0);

    // Sort
    switch (sort) {
      case 'price_asc':  list.sort((a, b) => a.price  - b.price);  break;
      case 'price_desc': list.sort((a, b) => b.price  - a.price);  break;
      case 'rating':     list.sort((a, b) => b.rating - a.rating); break;
      case 'name':       list.sort((a, b) => a.name.localeCompare(b.name)); break;
      default: break;
    }

    return list;
  }, [medicines, query, category, sort, rxOnly, inStockOnly]);

  const hasFilters = query || category || rxOnly || inStockOnly || sort !== 'default';

  const clearFilters = () => {
    setQuery('');
    setCategory('');
    setSort('default');
    setRxOnly(false);
    setInStockOnly(false);
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="medicine-list-page">
      <Container className="py-5">

        {/* ── Page header ────────────────────────────────────── */}
        <div className="ml-header mb-4">
          <div>
            <h1 className="page-title">Browse Medicines</h1>
            <p className="page-subtitle">
              {loading
                ? 'Loading…'
                : `${displayed.length} medicine${displayed.length !== 1 ? 's' : ''} found`}
            </p>
          </div>
          {hasFilters && (
            <Button variant="outline-danger" size="sm" className="clear-btn" onClick={clearFilters}>
              <FaTimes className="me-1" /> Clear Filters
            </Button>
          )}
        </div>

        {/* ── Search + filter bar ─────────────────────────────── */}
        <Row className="mb-4 gy-2 align-items-center">
          {/* Search */}
          <Col lg={5} md={6}>
            <InputGroup className="search-group">
              <InputGroup.Text className="search-icon-wrap">
                <FaSearch />
              </InputGroup.Text>
              <Form.Control
                type="search"
                placeholder="Search by name, brand, category…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="search-input"
                id="medicine-search"
                aria-label="Search medicines"
              />
              {query && (
                <Button variant="light" className="clear-search" onClick={() => setQuery('')}>
                  <FaTimes />
                </Button>
              )}
            </InputGroup>
          </Col>

          {/* Category */}
          <Col lg={3} md={3} sm={6}>
            <Form.Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Category filter"
              className="filter-select"
              id="category-filter"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Form.Select>
          </Col>

          {/* Sort */}
          <Col lg={2} md={3} sm={6}>
            <Form.Select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort by"
              className="filter-select"
              id="sort-select"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Form.Select>
          </Col>

          {/* Toggle chips */}
          <Col lg={2} className="d-flex gap-2 flex-wrap">
            <Form.Check
              type="switch"
              id="in-stock-toggle"
              label="In stock"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              className="filter-switch"
            />
            <Form.Check
              type="switch"
              id="rx-toggle"
              label="Rx only"
              checked={rxOnly}
              onChange={(e) => setRxOnly(e.target.checked)}
              className="filter-switch"
            />
          </Col>
        </Row>

        {/* ── Active filter badges ─────────────────────────────── */}
        {hasFilters && (
          <div className="active-filters mb-3">
            {query      && <Badge bg="primary" className="filter-tag">🔍 "{query}"</Badge>}
            {category   && <Badge bg="secondary" className="filter-tag">{category}</Badge>}
            {inStockOnly && <Badge bg="success" className="filter-tag">In Stock</Badge>}
            {rxOnly     && <Badge bg="warning" text="dark" className="filter-tag">Rx Only</Badge>}
            {sort !== 'default' && (
              <Badge bg="info" className="filter-tag">
                {SORT_OPTIONS.find((o) => o.value === sort)?.label}
              </Badge>
            )}
          </div>
        )}

        {/* ── States ──────────────────────────────────────────── */}
        {loading && (
          <div className="loading-state">
            <Spinner animation="border" variant="primary" className="mb-3" />
            <p className="text-muted">Fetching medicines…</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <div className="error-emoji">⚠️</div>
            <h5>Something went wrong</h5>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && displayed.length === 0 && (
          <div className="empty-state">
            <div className="empty-emoji">🔍</div>
            <h5>No medicines found</h5>
            <p>Try adjusting your search or filters.</p>
            <Button variant="outline-primary" onClick={clearFilters}>Clear Filters</Button>
          </div>
        )}

        {/* ── Medicine grid ─────────────────────────────────── */}
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
