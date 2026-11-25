import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiSearch, FiX } from 'react-icons/fi';
import { Badge, Button, EmptyState, ErrorState, PageHeader, SkeletonGrid } from '../../../components/ui';
import PageMeta from '../../../components/seo/PageMeta';
import useStaffRedirect from '../../../hooks/useStaffRedirect';
import useDebounce from '../../../hooks/useDebounce';
import MedicineCard from '../components/MedicineCard';
import useMedicines from '../hooks/useMedicines';
import { MEDICINE_CATEGORIES } from '../lib/normalizeMedicine';
import './MedicineList.css';

const SORT_OPTIONS = [
  { value: 'default', label: 'Recommended' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'name', label: 'Name A–Z' },
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'otc', label: 'Over the counter' },
  { value: 'rx', label: 'Prescription (Rx)' },
];

export default function MedicineList() {
  useStaffRedirect();
  const { medicines, loading, error, retry } = useMedicines();

  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('category') || '';
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [sort, setSort] = useState('default');
  const [typeFilter, setTypeFilter] = useState('all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const debouncedQuery = useDebounce(query);

  const setCategory = (value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('category', value);
    else next.delete('category');
    setSearchParams(next, { replace: true });
  };

  const displayed = useMemo(() => {
    let list = medicines;
    const q = debouncedQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.brand?.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q) ||
          m.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (category) list = list.filter((m) => m.category === category);
    if (typeFilter === 'rx') list = list.filter((m) => m.requires_prescription);
    if (typeFilter === 'otc') list = list.filter((m) => !m.requires_prescription);
    if (inStockOnly) list = list.filter((m) => m.stock > 0);

    const sorted = [...list];
    switch (sort) {
      case 'price_asc': sorted.sort((a, b) => a.price - b.price); break;
      case 'price_desc': sorted.sort((a, b) => b.price - a.price); break;
      case 'rating': sorted.sort((a, b) => b.rating - a.rating); break;
      case 'name': sorted.sort((a, b) => a.name.localeCompare(b.name)); break;
      default: break;
    }
    return sorted;
  }, [medicines, debouncedQuery, category, sort, typeFilter, inStockOnly]);

  const activeFilters = [
    debouncedQuery && { key: 'q', label: `“${debouncedQuery}”`, clear: () => setQuery('') },
    category && { key: 'cat', label: category, clear: () => setCategory('') },
    typeFilter !== 'all' && { key: 'type', label: TYPE_OPTIONS.find((o) => o.value === typeFilter)?.label, clear: () => setTypeFilter('all') },
    inStockOnly && { key: 'stock', label: 'In stock', clear: () => setInStockOnly(false) },
  ].filter(Boolean);

  const clearFilters = () => {
    setQuery('');
    setSort('default');
    setTypeFilter('all');
    setInStockOnly(false);
    setCategory('');
  };

  const countLabel = loading ? 'Loading catalogue…' : `${displayed.length} medicine${displayed.length === 1 ? '' : 's'} available`;

  return (
    <div className="ml-page">
      <PageMeta
        title={category ? `${category} medicines` : 'Shop medicines'}
        description="Browse authentic OTC and prescription medicines with transparent prices and fast delivery across Pakistan."
      />
      <div className="container">
        <PageHeader eyebrow="Pharmacy" title="Shop medicines" subtitle={countLabel} />

        <section className="ml-filters" aria-label="Search and filters">
          <div className="ml-search">
            <FiSearch className="ml-search__icon" aria-hidden="true" />
            <label htmlFor="medicine-search" className="sr-only">Search medicines</label>
            <input
              id="medicine-search"
              type="search"
              className="ui-control"
              placeholder="Search by name, brand or category"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
            {query && (
              <button type="button" className="ui-icon-btn ui-icon-btn--sm ml-search__clear" onClick={() => setQuery('')} aria-label="Clear search">
                <FiX aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="ml-filters__row">
            <label className="ml-select">
              <span className="sr-only">Category</span>
              <select className="ui-control ui-control--select" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">All categories</option>
                {MEDICINE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="ml-select">
              <span className="sr-only">Medicine type</span>
              <select className="ui-control ui-control--select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className="ml-select">
              <span className="sr-only">Sort by</span>
              <select className="ui-control ui-control--select" value={sort} onChange={(e) => setSort(e.target.value)}>
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className="ml-toggle">
              <input type="checkbox" role="switch" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} />
              <span className="ml-toggle__track" aria-hidden="true" />
              <span>In stock only</span>
            </label>
          </div>

          {activeFilters.length > 0 && (
            <div className="ml-chips" aria-label="Active filters">
              {activeFilters.map((f) => (
                <button key={f.key} type="button" className="ml-chip" onClick={f.clear} aria-label={`Remove filter ${f.label}`}>
                  <Badge tone="primary">{f.label}</Badge>
                  <FiX aria-hidden="true" />
                </button>
              ))}
              <Button variant="link" size="sm" onClick={clearFilters}>
                Clear all
              </Button>
            </div>
          )}
        </section>

        <div aria-live="polite" aria-busy={loading}>
          {loading ? (
            <SkeletonGrid count={8} />
          ) : error ? (
            <ErrorState title="Couldn’t load medicines" message={error} onRetry={retry} />
          ) : displayed.length === 0 ? (
            <EmptyState
              icon={<FiSearch />}
              title="No medicines match your filters"
              description="Try a different search term or remove some filters."
              action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>}
            />
          ) : (
            <ul className="ml-grid" aria-label="Medicines">
              {displayed.map((med) => (
                <li key={med.id}>
                  <MedicineCard medicine={med} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
