import { useState } from 'react';
import api from '../../../services/api/client';
import { Table, Badge, Button, Form, Modal } from 'react-bootstrap';
import { FaTrash, FaDownload, FaPlusCircle } from 'react-icons/fa';
import { useToast } from '../../../context/ToastContext';
import { ROLES, ROLE_COLOR, STATUS_COLOR, safeFmtJoined, pdfPlaceholder } from './adminShared';


/* ═══════════════ TAB 1 – USER MANAGEMENT ════════════════════ */
export default function UsersTab({ users, setUsers }) {
  const { toast } = useToast();
  const [search,  setSearch]  = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Create User Modal States
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState('patient');

  const visible = users.filter(u => {
    if (u.role === 'admin') return false;
    const matchRole   = roleFilter === 'all' || u.role === roleFilter;
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase())
                     || (u.email && u.email.toLowerCase().includes(search.toLowerCase()));
    return matchRole && matchSearch;
  });


  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user? This cannot be undone.')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers(prev => prev.filter(u => u.id !== id));
      toast.success('User removed from platform database');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      const { data } = await api.put(`/admin/users/${id}/status`);
      setUsers(prev => prev.map(u => u.id === id
        ? {...u, status: data.user.status}
        : u));
      toast.success(`User Account is now ${data.user.status === 'suspended' ? 'Suspended' : 'Activated'}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user status');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim() || !newPhone.trim()) {
      toast.error('All required fields (*) must be filled.');
      return;
    }

    try {
      const { data } = await api.post('/admin/users', {
        name: newName,
        email: newEmail,
        password: newPassword,
        role: newRole,
        phone: newPhone
      });

      const newUser = {
        ...data,
        id: data._id,
        joined: safeFmtJoined(data.createdAt),
        orders: 0
      };

      setUsers(prev => [newUser, ...prev]);
      toast.success(`Account for ${newName} as ${newRole} created successfully!`);
      setShowModal(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewPhone('');
      setNewRole('patient');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to register account');
    }
  };

  const nonAdminUsers = users.filter(u => u.role !== 'admin');
  const counts = ROLES.filter(r => r !== 'admin').reduce((a, r) => ({...a, [r]: nonAdminUsers.filter(u=>u.role===r).length}), {});

  return (
    <>
      {/* Summary pills */}
      <div className="adm-section-toolbar mb-3">
        <div className="adm-user-summary">
          <span className="adm-user-total">{nonAdminUsers.length} total users</span>
          {ROLES.filter(r => r !== 'admin').map(r => (
            <Badge key={r} bg={ROLE_COLOR[r]} className="adm-role-pill" onClick={() => setRoleFilter(r)} role="button">
              {counts[r]} {r}s
            </Badge>
          ))}
        </div>
        <Button className="btn-adm-save d-flex align-items-center gap-2" onClick={() => setShowModal(true)}>
          <FaPlusCircle /> Create New User
        </Button>
      </div>

      {/* Toolbar */}
      <div className="adm-toolbar mb-3">
        <input className="adm-search" placeholder="Search by name or email…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <Form.Select className="adm-role-filter" value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}>
          <option value="all">All Roles</option>
          {ROLES.filter(r => r !== 'admin').map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
        </Form.Select>
        <Button variant="outline-secondary" size="sm" className="adm-dl-btn"
          onClick={() => pdfPlaceholder('User List')}>
          <FaDownload className="me-1" />Export PDF
        </Button>
      </div>

      <div className="adm-table-wrap">
        <Table hover responsive className="adm-table">
          <thead>
            <tr><th>#</th><th>User</th><th>Role</th><th>Status</th><th>Orders</th><th>Joined</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {visible.length === 0 && <tr><td colSpan={7} className="text-center text-muted py-4">No users found.</td></tr>}
            {visible.map((u, i) => (
              <tr key={u.id}>
                <td className="text-muted small">{i+1}</td>
                <td>
                  <div className="adm-user-cell">
                    <div className="adm-user-av" style={{background: `var(--role-${u.role})`}}>
                      {u.name[0]}
                    </div>
                    <div>
                      <div className="adm-user-name">{u.name}</div>
                      <div className="adm-user-email">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <Badge bg={ROLE_COLOR[u.role]} className="cat-badge">
                    {u.role}
                  </Badge>
                </td>
                <td>
                  <Badge bg={STATUS_COLOR[u.status]} text={u.status==='suspended'?'dark':undefined}
                    className="status-pill" role="button" onClick={() => handleToggleStatus(u.id)}>
                    {u.status}
                  </Badge>
                </td>
                <td className="text-center">{u.orders}</td>
                <td className="text-muted small">{u.joined}</td>
                <td>
                  <Button size="sm" variant="outline-danger" onClick={() => handleDelete(u.id)}>
                    <FaTrash />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* Create User Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton className="ph-modal-header">
          <Modal.Title className="fw-bold"><FaPlusCircle className="me-2 text-primary" /> Create User Account</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleCreateUser}>
            <Form.Group className="mb-3">
              <Form.Label>Full Name *</Form.Label>
              <Form.Control required placeholder="Ahmed Raza" value={newName} onChange={e => setNewName(e.target.value)} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email Address *</Form.Label>
              <Form.Control required type="email" placeholder="ahmed@example.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Phone Number *</Form.Label>
              <Form.Control required placeholder="03001234567" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Secure Password *</Form.Label>
              <Form.Control required type="password" placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Access Level Role *</Form.Label>
              <Form.Select value={newRole} onChange={e => setNewRole(e.target.value)}>
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
                <option value="pharmacist">Pharmacist</option>
                <option value="admin">Platform Admin</option>
              </Form.Select>
            </Form.Group>
            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button variant="outline-secondary" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" className="btn-adm-save">Register Account</Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </>
  );
}
