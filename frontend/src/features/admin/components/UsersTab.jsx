import { useState } from 'react';
import { FiDownload, FiPauseCircle, FiPlayCircle, FiPlus, FiTrash2, FiUsers } from 'react-icons/fi';
import api from '../../../services/api/client';
import { useToast } from '../../../context/ToastContext';
import { Avatar, Badge, Button, EmptyState, Input, Modal, SearchInput, Select, Table, Tabs } from '../../../components/ui';
import { downloadCsv } from '../../../lib/csv';
import { formatDate, formatPhone } from '../../../lib/format';
import PasswordField from '../../auth/components/PasswordField';
import { MIN_PASSWORD } from '../../auth/lib/validation';
import { ROLES, ROLE_TONE } from './adminShared';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NEW_USER = { name: '', email: '', phone: '', password: '', role: 'patient' };
const CREATE_ROLES = [
  { value: 'patient', label: 'Patient' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'pharmacist', label: 'Pharmacist (staff)' },
  { value: 'admin', label: 'Admin' },
];

function validateNew(f) {
  const e = {};
  if (f.name.trim().length < 2) e.name = 'Enter a full name.';
  if (!EMAIL_RE.test(f.email.trim())) e.email = 'Enter a valid email.';
  if (f.phone.trim().length < 7) e.phone = 'Enter a valid phone number.';
  if (f.password.length < MIN_PASSWORD) e.password = `At least ${MIN_PASSWORD} characters.`;
  return e;
}

function CreateUserModal({ onClose, onCreated }) {
  const { toast } = useToast();
  const [f, setF] = useState(NEW_USER);
  const [touched, setTouched] = useState({});
  const [saving, setSaving] = useState(false);
  const errors = validateNew(f);
  const field = (k) => ({
    name: k,
    value: f[k],
    onChange: (e) => setF((p) => ({ ...p, [k]: e.target.value })),
    onBlur: () => setTouched((t) => ({ ...t, [k]: true })),
    error: touched[k] ? errors[k] : undefined,
  });

  const submit = async (e) => {
    e.preventDefault();
    setTouched({ name: true, email: true, phone: true, password: true });
    if (Object.keys(errors).length) return;
    setSaving(true);
    try {
      const { data } = await api.post('/admin/users', { ...f, name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim() });
      onCreated({ ...data, id: data._id, orders: 0 });
      toast.success(`Account created for ${f.name.trim()}.`);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create the account.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      show
      onClose={onClose}
      title="Create an account"
      description="The person can sign in straight away with these details."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="create-user-form" loading={saving}>Create account</Button>
        </>
      }
    >
      <form id="create-user-form" onSubmit={submit} noValidate>
        <Input label="Full name" required autoComplete="off" {...field('name')} />
        <div className="row g-3">
          <div className="col-sm-6"><Input label="Email" type="email" required autoComplete="off" {...field('email')} /></div>
          <div className="col-sm-6"><Input label="Phone" type="tel" required placeholder="03001234567" {...field('phone')} /></div>
        </div>
        <PasswordField label="Temporary password" required showStrength autoComplete="new-password" hint="Share it securely and ask them to change it." {...field('password')} />
        <Select label="Role" options={CREATE_ROLES} {...field('role')} />
      </form>
    </Modal>
  );
}

/** All non-admin accounts: search, filter by role, suspend, delete, create, export. */
export default function UsersTab({ users, setUsers }) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(null);

  const list = users.filter((u) => u.role !== 'admin');
  const q = search.trim().toLowerCase();
  const visible = list.filter((u) => (role === 'all' || u.role === role) && (!q || `${u.name} ${u.email || ''} ${u.phone || ''}`.toLowerCase().includes(q)));
  const tabs = [{ id: 'all', label: 'All', badge: list.length || null }, ...ROLES.map((r) => ({ id: r.id, label: r.label, badge: list.filter((u) => u.role === r.id).length || null }))];

  const toggleStatus = async (u) => {
    setBusy(u.id);
    try {
      const { data } = await api.put(`/admin/users/${u.id}/status`);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, status: data.user.status } : x)));
      toast.success(`${u.name} is now ${data.user.status === 'suspended' ? 'suspended' : 'active'}.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not change the account status.');
    } finally {
      setBusy(null);
    }
  };

  const confirmDelete = async () => {
    setBusy('delete');
    try {
      await api.delete(`/admin/users/${deleting.id}`);
      setUsers((prev) => prev.filter((x) => x.id !== deleting.id));
      toast.success(`${deleting.name} was deleted.`);
      setDeleting(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete the account.');
    } finally {
      setBusy(null);
    }
  };

  const exportCsv = () =>
    downloadCsv(`medeasy-users-${new Date().toISOString().slice(0, 10)}`, [
      { header: 'Name', value: (u) => u.name },
      { header: 'Email', value: (u) => u.email },
      { header: 'Phone', value: (u) => u.phone },
      { header: 'Role', value: (u) => u.role },
      { header: 'Status', value: (u) => u.status },
      { header: 'Orders', value: (u) => u.orders },
      { header: 'Joined', value: (u) => formatDate(u.createdAt) },
    ], visible);

  const columns = [
    {
      key: 'user',
      header: 'User',
      render: (u) => (
        <div className="adm-person">
          <Avatar name={u.name} size={34} />
          <div>
            <strong>{u.name}</strong>
            <span>{u.email || formatPhone(u.phone)}</span>
          </div>
        </div>
      ),
    },
    { key: 'role', header: 'Role', render: (u) => <Badge tone={ROLE_TONE[u.role] || 'neutral'}>{u.role}</Badge> },
    { key: 'status', header: 'Status', render: (u) => <Badge tone={u.status === 'suspended' ? 'warning' : 'success'}>{u.status || 'active'}</Badge> },
    { key: 'orders', header: 'Orders', render: (u) => u.orders || 0 },
    { key: 'joined', header: 'Joined', render: (u) => <span className="adm-muted">{formatDate(u.createdAt, { month: 'short', year: 'numeric' })}</span> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'end',
      render: (u) => (
        <div className="adm-actions">
          <Button
            size="sm"
            variant="secondary"
            loading={busy === u.id}
            leftIcon={u.status === 'suspended' ? <FiPlayCircle aria-hidden="true" /> : <FiPauseCircle aria-hidden="true" />}
            onClick={() => toggleStatus(u)}
          >
            {u.status === 'suspended' ? 'Reactivate' : 'Suspend'}
          </Button>
          <Button size="sm" variant="ghost" className="adm-danger" leftIcon={<FiTrash2 aria-hidden="true" />} onClick={() => setDeleting(u)} aria-label={`Delete ${u.name}`}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="adm-section">
      <div className="adm-toolbar">
        <Tabs tabs={tabs} active={role} onChange={setRole} label="Filter by role" />
        <div className="adm-toolbar__end">
          <SearchInput label="Search users" placeholder="Name, email or phone" value={search} onChange={setSearch} />
          <Button variant="secondary" leftIcon={<FiDownload aria-hidden="true" />} onClick={exportCsv} disabled={!visible.length}>Export CSV</Button>
          <Button leftIcon={<FiPlus aria-hidden="true" />} onClick={() => setCreating(true)}>New account</Button>
        </div>
      </div>

      <Table columns={columns} data={visible} rowKey="id" caption="Users" empty={<EmptyState icon={<FiUsers />} title="No users match" />} />

      {creating && <CreateUserModal onClose={() => setCreating(false)} onCreated={(u) => setUsers((prev) => [u, ...prev])} />}

      <Modal
        show={!!deleting}
        onClose={() => setDeleting(null)}
        title={`Delete ${deleting?.name || 'this account'}?`}
        description="This permanently removes the account. Consider suspending it instead if you may need it later."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="danger" loading={busy === 'delete'} onClick={confirmDelete}>Delete permanently</Button>
          </>
        }
      />
    </div>
  );
}
