import { useCallback, useEffect, useState } from 'react';
import { FiAlertTriangle, FiEdit2, FiPackage, FiPlus, FiSlash, FiXCircle } from 'react-icons/fi';
import { useToast } from '../../../context/ToastContext';
import { Badge, Button, EmptyState, ErrorState, Modal, SearchInput, Skeleton, Table, Tabs } from '../../../components/ui';
import { StatGrid } from '../../../components/layout/DashboardLayout/widgets';
import { formatPrice } from '../../../lib/format';
import MedicalIcon from '../../medicines/components/MedicalIcon';
import { fetchAllMedicines, createMedicine, updateMedicine } from '../../../services/api/pharmacistService';
import MedicineFormModal from './MedicineFormModal';

const LOW = 10;
const FILTERS = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'low', label: 'Low stock', test: (m) => m.stock > 0 && m.stock < LOW },
  { id: 'out', label: 'Out of stock', test: (m) => m.stock === 0 },
  { id: 'rx', label: 'Prescription', test: (m) => m.requires_prescription },
];

/**
 * Pharmacy inventory: add and edit medicines, spot low stock.
 * Deleting from the catalogue is admin-only (API), so staff mark items out of stock instead.
 */
export default function MedicinesPage() {
  const { toast } = useToast();
  const [meds, setMeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null); // null | 'new' | medicine
  const [clearing, setClearing] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMeds(await fetchAllMedicines());
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load the inventory.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (payload) => {
    try {
      if (editing === 'new') {
        const created = await createMedicine(payload);
        setMeds((prev) => [created, ...prev]);
        toast.success(`${created.brand || created.name} added.`);
      } else {
        const updated = await updateMedicine(editing.id, payload);
        setMeds((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        toast.success(`${updated.brand || updated.name} updated.`);
      }
      setEditing(null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not save the medicine.');
    }
  };

  const confirmOutOfStock = async () => {
    setBusy(true);
    try {
      const updated = await updateMedicine(clearing.id, { ...clearing, stock: 0 });
      setMeds((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      toast.success(`${clearing.brand || clearing.name} marked out of stock.`);
      setClearing(null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not update the stock.');
    } finally {
      setBusy(false);
    }
  };

  const q = search.trim().toLowerCase();
  const active = FILTERS.find((f) => f.id === filter);
  const visible = meds.filter((m) => active.test(m) && (!q || `${m.name} ${m.brand} ${m.category} ${m.manufacturer || ''}`.toLowerCase().includes(q)));
  const count = (id) => meds.filter(FILTERS.find((f) => f.id === id).test).length;

  const columns = [
    {
      key: 'medicine',
      header: 'Medicine',
      render: (m) => (
        <div className="ph-med">
          <span className="ph-med__icon"><MedicalIcon emoji={m.image} category={m.category} size={18} /></span>
          <div>
            <strong>{m.brand || m.name}</strong>
            <span>{m.brand ? m.name : m.manufacturer || ''}</span>
          </div>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (m) => <span className="ph-muted">{m.category}</span> },
    { key: 'price', header: 'Price', render: (m) => <strong>{formatPrice(m.price)}</strong> },
    {
      key: 'stock',
      header: 'Stock',
      render: (m) =>
        m.stock === 0 ? <Badge tone="error">Out of stock</Badge> : m.stock < LOW ? <Badge tone="warning" icon={<FiAlertTriangle />}>{m.stock} left</Badge> : <span>{m.stock}</span>,
    },
    { key: 'rx', header: 'Type', render: (m) => (m.requires_prescription ? <Badge tone="warning">Rx</Badge> : <Badge tone="success">OTC</Badge>) },
    {
      key: 'actions',
      header: 'Actions',
      align: 'end',
      render: (m) => (
        <div className="ph-row-actions">
          <Button size="sm" variant="secondary" leftIcon={<FiEdit2 aria-hidden="true" />} onClick={() => setEditing(m)} aria-label={`Edit ${m.brand || m.name}`}>Edit</Button>
          {m.stock > 0 && (
            <Button size="sm" variant="ghost" className="ph-danger" leftIcon={<FiSlash aria-hidden="true" />} onClick={() => setClearing(m)} aria-label={`Mark ${m.brand || m.name} out of stock`}>
              Out of stock
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="ph-section">
      <StatGrid
        loading={loading}
        stats={[
          { label: 'Medicines listed', value: meds.length, icon: <FiPackage />, tone: 'primary' },
          { label: 'Low stock', value: count('low'), icon: <FiAlertTriangle />, tone: 'warning', hint: `Fewer than ${LOW} units` },
          { label: 'Out of stock', value: count('out'), icon: <FiXCircle />, tone: 'error' },
        ]}
      />

      <div className="ph-toolbar">
        <Tabs tabs={FILTERS.map((f) => ({ id: f.id, label: f.label, badge: f.id === 'all' ? null : count(f.id) || null }))} active={filter} onChange={setFilter} label="Filter inventory" />
        <div className="ph-toolbar__end">
          <SearchInput label="Search inventory" placeholder="Name, brand, category" value={search} onChange={setSearch} />
          <Button leftIcon={<FiPlus aria-hidden="true" />} onClick={() => setEditing('new')}>Add medicine</Button>
        </div>
      </div>

      {loading ? (
        <Skeleton lines={8} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <Table
          columns={columns}
          data={visible}
          rowKey="id"
          caption="Inventory"
          empty={<EmptyState icon={<FiPackage />} title={q || filter !== 'all' ? 'No medicines match' : 'No medicines yet'} description={!meds.length ? 'Add your first medicine to start selling.' : undefined} />}
        />
      )}

      {editing && (
        <MedicineFormModal key={editing === 'new' ? 'new' : editing.id} show medicine={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSave={save} />
      )}

      <Modal
        show={!!clearing}
        onClose={() => setClearing(null)}
        title={`Mark ${clearing?.brand || clearing?.name || 'medicine'} out of stock?`}
        description="Customers can’t order it until you add stock again. To remove it from the catalogue entirely, ask an admin."
        footer={
          <>
            <Button variant="secondary" onClick={() => setClearing(null)}>Cancel</Button>
            <Button variant="danger" loading={busy} onClick={confirmOutOfStock}>Mark out of stock</Button>
          </>
        }
      />
    </div>
  );
}
