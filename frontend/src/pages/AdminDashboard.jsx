import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import {
  Container, Row, Col, Card, Table, Badge,
  Button, Form, Nav, ProgressBar, Alert, Modal,
} from 'react-bootstrap';
import {
  FaUsers, FaChartBar, FaBoxes, FaFileMedical,
  FaUserShield, FaTrash, FaDownload, FaExclamationTriangle,
  FaCheckCircle, FaClock, FaTimesCircle, FaTrophy,
  FaMoneyBillWave, FaShoppingCart, FaSyncAlt,
  FaCalendarCheck, FaSlidersH, FaPlus, FaPlusCircle, FaSearch, FaHistory,
  FaUserCheck, FaClipboardList, FaStar,
} from 'react-icons/fa';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, LineElement, PointElement, Filler,
  Title, Tooltip, Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import {
  MOCK_USERS, MONTHLY_SALES, TOP_MEDICINES, SALES_KPI,
  INVENTORY_KPI, LOW_STOCK_ITEMS, RX_KPI, RX_BY_MONTH,
} from '../data/mockAdminData';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import './AdminDashboard.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler, Title, Tooltip, Legend);

/* ─── Shared helpers ─────────────────────────────────────────── */
const ROLES = ['patient','doctor','pharmacist','admin'];
const ROLE_COLOR = { patient:'primary', doctor:'info', pharmacist:'success', admin:'danger' };
const STATUS_COLOR = { active:'success', suspended:'warning' };
const fmtRs = (n) => `Rs. ${n.toLocaleString()}`;
const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-PK', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
  } catch (e) {
    return d;
  }
};
const pdfPlaceholder = (label) => alert(`PDF download for "${label}" will be available once backend is connected.`);
const serverUrl = api.defaults.baseURL ? api.defaults.baseURL.replace('/api', '') : 'https://medeasy-backend-a5yi.onrender.com';

const CHART_OPTS = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { position:'top' }, title: { display: false } },
  scales: { y: { beginAtZero: true, grid: { color:'#f1f5f9' } }, x: { grid:{ display:false } } },
};

/* ─── KPI card ───────────────────────────────────────────────── */
function KpiCard({ label, value, icon, color, sub }) {
  return (
    <Card className="adm-kpi-card" style={{'--adm-accent': color}}>
      <Card.Body>
        <div className="adm-kpi-icon">{icon}</div>
        <div className="adm-kpi-value">{value}</div>
        <div className="adm-kpi-label">{label}</div>
        {sub && <div className="adm-kpi-sub">{sub}</div>}
      </Card.Body>
    </Card>
  );
}

/* ═══════════════ TAB 0 – OVERVIEW (LANDING) ═══════════════════ */
function OverviewTab({ setActive, stats }) {
  const { user } = useAuth();
  const barData = {
    labels: MONTHLY_SALES.labels,
    datasets: [
      { label:'Revenue (Rs.)', data: MONTHLY_SALES.revenue, backgroundColor:'rgba(167, 139, 250, 0.7)', borderRadius:8, borderSkipped:false },
      { label:'Orders',        data: MONTHLY_SALES.orders,  backgroundColor:'rgba(56, 189, 248, 0.7)', borderRadius:8, borderSkipped:false },
    ],
  };

  const shortcuts = [
    { label: 'User Management', tab: 'users', icon: <FaUsers size={24} />, bg: '#e0f2fe', color: '#0369a1', desc: 'Manage patients, doctors & roles' },
    { label: 'Medicine Catalog', tab: 'medicines', icon: <FaBoxes size={24} />, bg: '#f0fdf4', color: '#15803d', desc: 'Pricing controls & inventory stock' },
    { label: 'Appointments', tab: 'appointments', icon: <FaCalendarCheck size={24} />, bg: '#ecfeff', color: '#0891b2', desc: 'Hospital-wide doctor schedules' },
    { label: 'Order Tracking', tab: 'orders', icon: <FaShoppingCart size={24} />, bg: '#fffbeb', color: '#b45309', desc: 'Logistics tracking & refunds' },
    { label: 'Sales Reports', tab: 'reports', icon: <FaChartBar size={24} />, bg: '#faf5ff', color: '#7e22ce', desc: 'Sales trend graphs & leaderboards' },
    { label: 'System Settings', tab: 'settings', icon: <FaSlidersH size={24} />, bg: '#f8fafc', color: '#475569', desc: 'Commission, courier selection' },
  ];

  return (
    <div className="adm-overview">
      {/* Landing Welcome */}
      <div className="adm-welcome-banner mb-4">
        <h2>Welcome back, {user?.name || 'Administrator'}!</h2>
        <p>Real-time analytics monitor and cross-platform medical logistics panel.</p>
      </div>

      {/* KPI Cards Grid */}
      <Row className="g-3 mb-4">
        <Col sm={6} xl={3}><KpiCard label="Total Platform Users" value="5,200" icon={<FaUsers />} color="#818cf8" sub="+12% from last month" /></Col>
        <Col sm={6} xl={3}><KpiCard label="Orders Today" value={stats.ordersCount} icon={<FaShoppingCart />} color="#38bdf8" sub="Processing" /></Col>
        <Col sm={6} xl={3}><KpiCard label="Revenue MTD" value="Rs. 2.4M" icon={<FaMoneyBillWave />} color="#10b981" sub="Target: Rs. 3.0M" /></Col>
        <Col sm={6} xl={3}><KpiCard label="Platform Appointments" value={stats.aptsCount} icon={<FaCalendarCheck />} color="#f59e0b" sub="Active hospital bookings" /></Col>
      </Row>

      {/* Tactile Shortcut Grid */}
      <h5 className="fw-bold mb-3 text-dark">Tactile Command Center</h5>
      <Row className="g-3 mb-4">
        {shortcuts.map(s => (
          <Col md={4} sm={6} key={s.label}>
            <Card className="adm-shortcut-card shadow-sm clickable h-100" onClick={() => setActive(s.tab)}>
              <Card.Body className="d-flex align-items-center gap-3">
                <div className="adm-shortcut-icon" style={{ backgroundColor: s.bg, color: s.color }}>
                  {s.icon}
                </div>
                <div>
                  <h6 className="fw-bold text-dark mb-1">{s.label}</h6>
                  <p className="text-muted extra-small mb-0">{s.desc}</p>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Mini sales trend chart */}
      <Card className="adm-chart-card mb-4 border-0 shadow-sm">
        <Card.Body>
          <h6 className="adm-chart-title"><FaChartBar className="me-2 text-primary" />MedEasy Sales & Logistics Trend</h6>
          <div style={{ height: 250 }}>
            <Bar data={barData} options={CHART_OPTS} />
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}

/* ═══════════════ TAB 1 – USER MANAGEMENT ════════════════════ */
function UsersTab({ users, setUsers }) {
  const { toast } = useToast();
  const [search,  setSearch]  = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Create User Modal States
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('patient');

  const visible = users.filter(u => {
    const matchRole   = roleFilter === 'all' || u.role === roleFilter;
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase())
                     || u.email.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const handleRoleChange = (id, newRole) => {
    setUsers(prev => prev.map(u => u.id === id ? {...u, role: newRole} : u));
    toast.success(`Role updated to ${newRole}`);
  };

  const handleDelete = (id) => {
    if (!window.confirm('Delete this user? This cannot be undone.')) return;
    setUsers(prev => prev.filter(u => u.id !== id));
    toast.success('User removed from platform database');
  };

  const handleToggleStatus = (id) => {
    setUsers(prev => prev.map(u => u.id === id
      ? {...u, status: u.status === 'active' ? 'suspended' : 'active'}
      : u));
    const target = users.find(u => u.id === id);
    if (target) {
      toast.success(`User Account is now ${target.status === 'active' ? 'Suspended' : 'Activated'}`);
    }
  };

  const handleCreateUser = (e) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) return;

    const newUser = {
      id: Math.max(...users.map(u => u.id), 0) + 1,
      name: newName,
      email: newEmail,
      role: newRole,
      status: 'active',
      orders: 0,
      joined: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    };

    setUsers(prev => [newUser, ...prev]);
    toast.success(`Account for ${newName} as ${newRole} created successfully!`);
    setShowModal(false);
    setNewName('');
    setNewEmail('');
    setNewPassword('');
    setNewRole('patient');
  };

  const counts = ROLES.reduce((a, r) => ({...a, [r]: users.filter(u=>u.role===r).length}), {});

  return (
    <>
      {/* Summary pills */}
      <div className="adm-section-toolbar mb-3">
        <div className="adm-user-summary">
          <span className="adm-user-total">{users.length} total users</span>
          {ROLES.map(r => (
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
          {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
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
                  <Form.Select size="sm" className="adm-role-select"
                    value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </Form.Select>
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

/* ═══════════════ TAB 1.5 – PROFESSIONAL VERIFICATIONS ════════ */
function VerificationsTab({ users, setUsers }) {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');

  // Filter professionals whose profiles are NOT verified yet, or pharmacies with pending pharmacist audits
  const pending = users.filter(u => {
    const emailStr = u.email || '';
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || 
                        emailStr.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;

    if (u.role === 'doctor' || u.role === 'pharmacist') {
      return u.isVerifiedProfile === false;
    }
    if (u.role === 'pharmacy') {
      return u.pharmacistDetails?.status === 'pending';
    }
    return false;
  });

  const handleApprove = async (id) => {
    const target = users.find(u => u.id === id);
    if (!target) return;
    
    try {
      const isRealDbUser = typeof id === 'string' && id.length === 24; // Mongo id is 24 chars string
      if (isRealDbUser) {
        await api.put(`/admin/users/${id}/approve`);
      }
      
      setUsers(prev => prev.map(u => u.id === id 
        ? { 
            ...u, 
            isVerifiedProfile: true,
            pharmacistDetails: u.pharmacistDetails ? { ...u.pharmacistDetails, status: 'approved' } : undefined
          } 
        : u
      ));
      
      toast.success(`Success! ${target.name} has been verified and approved.`);

      // Create notification
      try {
        const key = 'medeasy_notifications_' + target.id;
        const rawAlerts = localStorage.getItem(key) || '[]';
        const alerts = JSON.parse(rawAlerts);
        if (target.role === 'pharmacy') {
          alerts.unshift({
            id: 'alert-' + Date.now(),
            text: `Pharmacist Representative Approved! Your store representative ${target.pharmacistDetails?.name || 'pharmacist'} is now verified and active.`,
            time: Date.now(),
            emoji: 'welcome',
            unread: true,
            link: '/pharmacist'
          });
        } else if (target.role === 'doctor') {
          alerts.unshift({
            id: 'alert-' + Date.now(),
            text: `Congratulations Dr. ${target.name}! Your professional clinical profile has been verified and approved.`,
            time: Date.now(),
            emoji: 'booking',
            unread: true,
            link: '/doctor'
          });
        }
        localStorage.setItem(key, JSON.stringify(alerts));
      } catch (err) {
        console.error(err);
      }

      setShowModal(false);
      setSelectedUser(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve credentials.');
    }
  };

  const handleReject = async (id) => {
    const target = users.find(u => u.id === id);
    if (!target) return;
    
    const reason = window.prompt(`Provide a decline reason for ${target.name}:`, 'Credentials did not pass our audit.');
    if (reason === null) return; // cancelled prompt
    
    try {
      const isRealDbUser = typeof id === 'string' && id.length === 24;
      if (isRealDbUser) {
        await api.put(`/admin/users/${id}/decline`, { reason });
      }
      
      setUsers(prev => prev.map(u => u.id === id
        ? {
            ...u,
            pharmacistDetails: u.pharmacistDetails ? { ...u.pharmacistDetails, status: 'declined', declineReason: reason } : undefined
          }
        : u
      ));
      
      toast.error(`Credentials for ${target.name} declined.`);

      // Create notification
      try {
        const key = 'medeasy_notifications_' + target.id;
        const rawAlerts = localStorage.getItem(key) || '[]';
        const alerts = JSON.parse(rawAlerts);
        if (target.role === 'pharmacy') {
          alerts.unshift({
            id: 'alert-' + Date.now(),
            text: `Pharmacist Representative Declined: ${reason}. Please update your representative details.`,
            time: Date.now(),
            emoji: 'cancel',
            unread: true,
            link: '/pharmacist'
          });
        } else if (target.role === 'doctor') {
          alerts.unshift({
            id: 'alert-' + Date.now(),
            text: `Professional Profile Declined: ${reason}. Please review and re-verify your documents.`,
            time: Date.now(),
            emoji: 'cancel',
            unread: true,
            link: '/profile'
          });
        }
        localStorage.setItem(key, JSON.stringify(alerts));
      } catch (err) {
        console.error(err);
      }

      setShowModal(false);
      setSelectedUser(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to decline credentials.');
    }
  };

  const openDetailsModal = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  return (
    <>
      <div className="adm-section-toolbar mb-3">
        <h5 className="adm-section-title"><FaUserCheck className="me-2 text-warning" /> Professional Account Auditing</h5>
        <div className="adm-user-summary">
          <span className="adm-user-total">{pending.length} pending requests</span>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="adm-toolbar mb-3">
        <input className="adm-search" placeholder="Search pending professionals by name or email…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="adm-table-wrap">
        <Table hover responsive className="adm-table">
          <thead>
            <tr>
              <th>#ID</th>
              <th>Applicant</th>
              <th>Role</th>
              <th>Academic Credentials</th>
              <th>PMC/PCP License</th>
              <th>Location</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pending.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-muted py-5">
                  <div className="d-flex flex-column align-items-center gap-2">
                    <FaCheckCircle size={40} className="text-success mb-2" />
                    <h6 className="fw-bold text-dark">All Caught Up!</h6>
                    <p className="extra-small text-muted mb-0">No professional registrations are currently pending verification.</p>
                  </div>
                </td>
              </tr>
            )}
            {pending.map((u, i) => (
              <tr key={u.id}>
                <td className="text-muted small">#U-{u.id}</td>
                <td>
                  <div className="adm-user-cell">
                    <div className="adm-user-av" style={{background: u.role === 'doctor' ? '#6366f1' : '#10b981'}}>
                      {u.name[0]}
                    </div>
                    <div>
                      <div className="adm-user-name">{u.name}</div>
                      <div className="adm-user-email">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <Badge bg={u.role === 'doctor' ? 'info' : 'success'} className="cat-badge text-capitalize">
                    {u.role}
                  </Badge>
                </td>
                <td>
                  <div className="fw-bold small">{u.degree || u.degreeName || '—'}</div>
                  <div className="text-muted extra-small">{u.degreePlace || '—'}</div>
                </td>
                <td>
                  <code>{u.pmcRegistration || u.licenseNumber || '—'}</code>
                </td>
                <td className="text-muted small">
                  {u.pharmacyLocation || u.clinicAddress || u.address || '—'}
                </td>
                <td>
                  <div className="d-flex gap-2">
                    <Button size="sm" variant="outline-primary" onClick={() => openDetailsModal(u)}>
                      View Details
                    </Button>
                    <Button size="sm" variant="success" className="py-1" onClick={() => handleApprove(u.id)}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline-danger" onClick={() => handleReject(u.id)}>
                      Decline
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* Details Audit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton className="ph-modal-header">
          <Modal.Title className="fw-bold">
            <FaUserCheck className="me-2 text-warning" /> 
            Professional Credentials Audit
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {selectedUser && (
            <div>
              {/* Profile Card Header */}
              <div className="d-flex align-items-center gap-3 mb-4 pb-3 border-bottom">
                <div className="adm-user-av" style={{ width: 64, height: 64, fontSize: '1.75rem', background: selectedUser.role === 'doctor' ? '#6366f1' : '#10b981' }}>
                  {selectedUser.name[0]}
                </div>
                <div>
                  <h4 className="fw-bold text-dark mb-1">{selectedUser.name}</h4>
                  <p className="text-muted mb-0 small">{selectedUser.email} | Phone: {selectedUser.phone || 'N/A'}</p>
                  <Badge bg={selectedUser.role === 'doctor' ? 'info' : 'success'} className="cat-badge text-capitalize mt-2">
                    Pending {selectedUser.role} Profile Verification
                  </Badge>
                </div>
              </div>

              {/* Detail Panels */}
              <Row className="g-4">
                <Col md={6}>
                  <Card className="h-100 border-0 shadow-sm bg-light">
                    <Card.Body>
                      <h6 className="fw-bold text-primary mb-3">
                        {selectedUser.role === 'pharmacy' ? 'Pharmacist Credentials' : 'Academic & Experience'}
                      </h6>
                      {selectedUser.role === 'pharmacy' && (
                        <>
                          {selectedUser.pharmacistDetails?.photo && (
                            <div className="mb-3">
                              <span className="text-muted extra-small d-block mb-2">PHARMACIST PHOTO</span>
                              <img src={`${serverUrl}${selectedUser.pharmacistDetails.photo}`} alt="Pharmacist representative" className="rounded border object-fit-cover shadow-sm" style={{ width: 70, height: 70, objectFit: 'cover' }} />
                            </div>
                          )}
                          <div className="mb-2">
                            <span className="text-muted extra-small d-block">LICENSED PHARMACIST</span>
                            <strong className="text-dark small">
                              {selectedUser.pharmacistDetails?.name || selectedUser.pharmacistName || '—'}
                              {selectedUser.pharmacistDetails?.age && ` (Age: ${selectedUser.pharmacistDetails.age} years)`}
                            </strong>
                          </div>
                        </>
                      )}
                      <div className="mb-2">
                        <span className="text-muted extra-small d-block">DEGREE TITLE</span>
                        <strong className="text-dark small">{selectedUser.pharmacistDetails?.degreeName || selectedUser.degree || selectedUser.degreeName || '—'}</strong>
                      </div>
                      <div className="mb-2">
                        <span className="text-muted extra-small d-block">INSTITUTION</span>
                        <strong className="text-dark small">{selectedUser.pharmacistDetails?.degreePlace || selectedUser.degreePlace || '—'}</strong>
                      </div>
                      {selectedUser.role === 'doctor' && (
                        <>
                          <div className="mb-2">
                            <span className="text-muted extra-small d-block">SPECIALTY</span>
                            <strong className="text-dark small">{selectedUser.specialty || '—'}</strong>
                          </div>
                          <div className="mb-2">
                            <span className="text-muted extra-small d-block">PRACTICE EXPERIENCE</span>
                            <strong className="text-dark small">{selectedUser.experience || 0} Years</strong>
                          </div>
                        </>
                      )}
                    </Card.Body>
                  </Card>
                </Col>

                <Col md={6}>
                  <Card className="h-100 border-0 shadow-sm bg-light">
                    <Card.Body>
                      <h6 className="fw-bold text-primary mb-3">
                        {selectedUser.role === 'pharmacy' ? 'Pharmacy Details' : 'Professional Licensing'}
                      </h6>
                      {selectedUser.role === 'pharmacy' && (
                        <div className="mb-2">
                          <span className="text-muted extra-small d-block">STORE NAME</span>
                          <strong className="text-dark small">{selectedUser.pharmacyName || '—'}</strong>
                        </div>
                      )}
                      <div className="mb-3">
                        <span className="text-muted extra-small d-block">
                          {selectedUser.role === 'pharmacy' ? 'PCP REGISTRATION / LICENSE' : 'LICENSE / PMC REGISTRATION'}
                        </span>
                        <code className="fs-6 fw-bold text-danger">{selectedUser.pharmacistDetails?.licenseNumber || selectedUser.pmcRegistration || selectedUser.licenseNumber || '—'}</code>
                      </div>
                      <div className="mb-3">
                        <span className="text-muted extra-small d-block">PRACTICE LOCATION</span>
                        <strong className="text-dark small">{selectedUser.pharmacyLocation || selectedUser.clinicAddress || selectedUser.address || '—'}</strong>
                      </div>
                      {selectedUser.role === 'doctor' && (
                        <div className="mb-2">
                          <span className="text-muted extra-small d-block">CONSULTATION FEE</span>
                          <strong className="text-dark small">Rs. {selectedUser.consultationFee?.toLocaleString() || 0}</strong>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>

                {/* Uploaded Documents & Picture Preview Attachment */}
                <Col md={12}>
                  <Card className="border-0 shadow-sm bg-light">
                    <Card.Body>
                      {selectedUser.role === 'pharmacy' && selectedUser.pharmacyOutsidePicture && (
                        <div className="mb-4 pb-3 border-bottom">
                          <span className="text-muted extra-small d-block mb-2 fw-semibold">PHARMACY OUTSIDE SHOP PICTURE</span>
                          <div className="position-relative overflow-hidden rounded border bg-white p-2" style={{ maxWidth: '100%', maxHeight: '300px', display: 'inline-block' }}>
                            <img 
                              src={`${serverUrl}${selectedUser.pharmacyOutsidePicture}`} 
                              alt="Pharmacy Outside View" 
                              className="img-fluid rounded"
                              style={{ maxHeight: '280px', objectFit: 'contain', transition: 'transform 0.3s' }}
                              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            />
                          </div>
                        </div>
                      )}
                      <h6 className="fw-bold text-primary mb-3">Uploaded Verification Proofs</h6>
                      <div className="p-3 border rounded bg-white d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-3">
                          <FaFileMedical className="text-danger" size={32} />
                          <div>
                            <strong className="d-block small">Professional_License_Certificate.pdf</strong>
                            <span className="text-muted extra-small">Digitally signed & hashed (2.4 MB)</span>
                          </div>
                        </div>
                        <Button variant="outline-secondary" size="sm" onClick={() => pdfPlaceholder('Professional License')}>
                          <FaDownload className="me-1" /> View PDF
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Footer Actions */}
              <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                <Button variant="outline-secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button variant="outline-danger" onClick={() => handleReject(selectedUser.id)}>Decline Applicant</Button>
                <Button variant="success" className="px-4" onClick={() => handleApprove(selectedUser.id)}>Verify & Approve</Button>
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}

/* ═══════════════ TAB 2 – MEDICINE MANAGEMENT ═════════════════ */
function MedicinesTab({ medicines, setMedicines }) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');

  const visible = medicines.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.category.toLowerCase().includes(search.toLowerCase())
  );

  const handlePriceChange = (id, newPrice) => {
    setMedicines(prev => prev.map(m => m.id === id ? { ...m, price: Number(newPrice) } : m));
  };

  const handleStockChange = (id, newStock) => {
    setMedicines(prev => prev.map(m => m.id === id ? { ...m, stock: Number(newStock) } : m));
  };

  const handleRemove = (id) => {
    if (!window.confirm('Remove this medicine from catalog?')) return;
    setMedicines(prev => prev.filter(m => m.id !== id));
    toast.success('Medicine removed from public catalog listings');
  };

  return (
    <>
      <div className="adm-section-toolbar mb-3">
        <h5 className="adm-section-title"><FaBoxes className="me-2 text-primary" />Medicine Inventory Pricing & Stock Control</h5>
      </div>

      <div className="adm-toolbar mb-3">
        <div className="adm-search-wrap" style={{ flex: 1 }}>
          <input className="adm-search w-100" placeholder="Search medicines by name or therapeutic class..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <Card className="adm-table-card border-0 shadow-sm">
        <div className="adm-table-wrap">
          <Table hover className="adm-table">
            <thead>
              <tr><th>#</th><th>Medicine Name</th><th>Category</th><th>Price (Rs.)</th><th>Current Stock</th><th>Availability</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {visible.length === 0 && <tr><td colSpan={7} className="text-center py-4">No medicines match search.</td></tr>}
              {visible.map((m, idx) => (
                <tr key={m.id} className={m.stock === 0 ? 'row-danger' : m.stock < 10 ? 'row-warn' : ''}>
                  <td className="text-muted small">{idx + 1}</td>
                  <td className="fw-bold">{m.name}</td>
                  <td><Badge bg="secondary" className="cat-badge">{m.category}</Badge></td>
                  <td>
                    <Form.Control type="number" size="sm" className="adm-inline-input" value={m.price} onChange={e => handlePriceChange(m.id, e.target.value)} />
                  </td>
                  <td>
                    <Form.Control type="number" size="sm" className="adm-inline-input" value={m.stock} onChange={e => handleStockChange(m.id, e.target.value)} />
                  </td>
                  <td>
                    {m.stock === 0 ? (
                      <Badge bg="danger">Out of Stock</Badge>
                    ) : m.stock < 10 ? (
                      <Badge bg="warning" text="dark">Low Stock</Badge>
                    ) : (
                      <Badge bg="success">In Stock</Badge>
                    )}
                  </td>
                  <td>
                    <Button size="sm" variant="outline-danger" onClick={() => handleRemove(m.id)}>
                      <FaTrash /> Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>
    </>
  );
}

/* ═══════════════ TAB 3 – APPOINTMENT OVERSIGHT ═══════════════ */
function AppointmentsTab({ apts, setApts }) {
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [selectedApt, setSelectedApt] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('10:00 AM');

  const handleCancelOverride = (id) => {
    if (!window.confirm('Force cancel this appointment? This sends a notification to the patient and doctor.')) return;
    setApts(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a));
    toast.success('Appointment cancelled by Administrator Override');
  };

  const openRescheduleModal = (apt) => {
    setSelectedApt(apt);
    setNewDate(apt.date);
    setNewTime(apt.time);
    setShowModal(true);
  };

  const handleRescheduleSave = (e) => {
    e.preventDefault();
    if (!selectedApt) return;
    setApts(prev => prev.map(a => a.id === selectedApt.id ? { ...a, date: newDate, time: newTime } : a));
    toast.success(`Appointment #APT-${selectedApt.id} rescheduled to ${newDate} at ${newTime}`);
    setShowModal(false);
    setSelectedApt(null);
  };

  return (
    <>
      <div className="adm-section-toolbar mb-3">
        <h5 className="adm-section-title"><FaCalendarCheck className="me-2 text-primary" /> Hospital-wide Appointment Oversight</h5>
      </div>

      <Card className="adm-table-card border-0 shadow-sm">
        <div className="adm-table-wrap">
          <Table hover className="adm-table">
            <thead>
              <tr><th>#ID</th><th>Patient</th><th>Assigned Doctor</th><th>Date & Time</th><th>Reason</th><th>Status</th><th>Oversight Actions</th></tr>
            </thead>
            <tbody>
              {apts.length === 0 && <tr><td colSpan={7} className="text-center py-4">No active appointments found.</td></tr>}
              {apts.map(a => (
                <tr key={a.id}>
                  <td className="text-muted small">#APT-{a.id}</td>
                  <td className="fw-bold">{a.patientName}</td>
                  <td>{a.doctorName}</td>
                  <td>{fmtDate(a.date)} at <Badge bg="light" text="dark">{a.time}</Badge></td>
                  <td className="text-muted small">{a.reason || 'General Follow-up'}</td>
                  <td>
                    <Badge bg={STATUS_COLOR[a.status] || 'secondary'} text={a.status === 'scheduled' ? 'dark' : undefined}>
                      {a.status}
                    </Badge>
                  </td>
                  <td>
                    {a.status === 'scheduled' ? (
                      <div className="d-flex gap-2">
                        <Button size="sm" variant="outline-primary" onClick={() => openRescheduleModal(a)}>Reschedule</Button>
                        <Button size="sm" variant="outline-danger" onClick={() => handleCancelOverride(a.id)}>Force Cancel</Button>
                      </div>
                    ) : (
                      <span className="text-muted extra-small">No action available</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>

      {/* Reschedule Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton className="ph-modal-header">
          <Modal.Title className="fw-bold"><FaClock className="me-2 text-primary" /> Reschedule Appointment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleRescheduleSave}>
            <Form.Group className="mb-3">
              <Form.Label>Patient: <strong>{selectedApt?.patientName}</strong></Form.Label>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>New Consultation Date</Form.Label>
              <Form.Control type="date" required value={newDate} onChange={e => setNewDate(e.target.value)} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Consultation Time Slot</Form.Label>
              <Form.Select value={newTime} onChange={e => setNewTime(e.target.value)}>
                <option value="09:00 AM">09:00 AM</option>
                <option value="10:00 AM">10:00 AM</option>
                <option value="11:30 AM">11:30 AM</option>
                <option value="02:00 PM">02:00 PM</option>
                <option value="03:30 PM">03:30 PM</option>
              </Form.Select>
            </Form.Group>
            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button variant="outline-secondary" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" className="btn-adm-save">Update Appointment</Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </>
  );
}

/* ═══════════════ TAB 4 – ORDER MANAGEMENT ════════════════════ */
function OrdersTab({ orders, setOrders }) {
  const { toast } = useToast();

  const handleRefund = (id) => {
    if (!window.confirm(`Issue complete refund for Order #${id} and flag dispute resolved?`)) return;
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'cancelled', paymentStatus: 'refunded' } : o));
    toast.success(`Dispute resolved. Refund of Rs. ${orders.find(o => o.id === id)?.totalAmount.toLocaleString()} credited successfully!`);
  };

  return (
    <>
      <div className="adm-section-toolbar mb-3">
        <h5 className="adm-section-title"><FaShoppingCart className="me-2 text-primary" /> Active Logistics Tracking & Dispute Resolution</h5>
      </div>

      <Card className="adm-table-card border-0 shadow-sm">
        <div className="adm-table-wrap">
          <Table hover className="adm-table">
            <thead>
              <tr><th>Order ID</th><th>Customer</th><th>Date</th><th>Total Items</th><th>Total Amount</th><th>Logistics Status</th><th>Payment</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {orders.length === 0 && <tr><td colSpan={8} className="text-center py-4">No platform orders logged.</td></tr>}
              {orders.map(o => (
                <tr key={o.id}>
                  <td><code>{o.id}</code></td>
                  <td className="fw-bold">{o.shippingAddress?.firstName} {o.shippingAddress?.lastName}</td>
                  <td className="text-muted small">{new Date(o.createdAt).toLocaleDateString('en-PK')}</td>
                  <td>{o.items.length} items</td>
                  <td className="fw-bold">Rs. {o.totalAmount.toLocaleString()}</td>
                  <td>
                    <Badge bg={o.status === 'delivered' ? 'success' : o.status === 'cancelled' ? 'danger' : 'warning'}>
                      {o.status}
                    </Badge>
                  </td>
                  <td>
                    <Badge bg={o.paymentStatus === 'paid' ? 'success' : o.paymentStatus === 'refunded' ? 'info' : 'warning'} text={o.paymentStatus !== 'paid' ? 'dark' : undefined}>
                      {o.paymentStatus || 'pending'}
                    </Badge>
                  </td>
                  <td>
                    {o.status !== 'cancelled' ? (
                      <Button size="sm" variant="danger" className="rounded-8 py-1" onClick={() => handleRefund(o.id)}>
                        Refund / Cancel
                      </Button>
                    ) : (
                      <span className="text-muted extra-small">Resolved</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>
    </>
  );
}

/* ═══════════════ TAB 5 – REPORTS & ANALYTICS ════════════════ */
function ReportsTab() {
  const barData = {
    labels: MONTHLY_SALES.labels,
    datasets: [
      { label:'Revenue (Rs.)', data: MONTHLY_SALES.revenue, backgroundColor:'rgba(56,189,248,0.7)', borderRadius:8, borderSkipped:false },
      { label:'Orders',        data: MONTHLY_SALES.orders,  backgroundColor:'rgba(129,140,248,0.7)', borderRadius:8, borderSkipped:false },
    ],
  };

  const doctorsList = [
    { name: 'Dr. Sara Ali', dept: 'Cardiology', cases: 42, rating: 4.9 },
    { name: 'Dr. Usman Tariq', dept: 'Pediatrics', cases: 38, rating: 4.8 },
    { name: 'Dr. Farhan Qureshi', dept: 'Dermatology', cases: 31, rating: 4.7 },
  ];

  return (
    <>
      <div className="adm-section-toolbar mb-3">
        <h5 className="adm-section-title">MedEasy Health Platform Analytics</h5>
        <Button variant="outline-secondary" size="sm" onClick={() => pdfPlaceholder('Sales Report')}>
          <FaDownload className="me-1" />Export PDF
        </Button>
      </div>

      {/* Bar chart */}
      <Card className="adm-chart-card mb-4 border-0 shadow-sm">
        <Card.Body>
          <h6 className="adm-chart-title">Monthly Revenue & Orders</h6>
          <div style={{height:285}}>
            <Bar data={barData} options={CHART_OPTS} />
          </div>
        </Card.Body>
      </Card>

      <Row className="g-4">
        {/* Top doctors leaderboard */}
        <Col lg={6}>
          <Card className="adm-table-card border-0 shadow-sm">
            <Card.Header className="adm-card-header bg-transparent pt-3 border-0">
              <h6 className="adm-chart-title mb-0"><FaTrophy className="me-2 text-warning" /> Platform Top Doctor Leaderboard</h6>
            </Card.Header>
            <div className="adm-table-wrap">
              <Table hover className="adm-table">
                <thead><tr><th>Doctor Name</th><th>Speciality</th><th>Cases Solved</th><th>Rating</th></tr></thead>
                <tbody>
                  {doctorsList.map((doc, idx) => (
                    <tr key={doc.name}>
                      <td><span className="top-rank me-2">#{idx+1}</span><strong>{doc.name}</strong></td>
                      <td><Badge bg="info" className="cat-badge">{doc.dept}</Badge></td>
                      <td className="fw-bold">{doc.cases} consultations</td>
                      <td><span className="text-warning"><FaStar className="me-1" />{doc.rating}</span></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card>
        </Col>

        {/* Top medicines table */}
        <Col lg={6}>
          <Card className="adm-table-card border-0 shadow-sm">
            <Card.Header className="adm-card-header bg-transparent pt-3 border-0">
              <h6 className="adm-chart-title mb-0"><FaTrophy className="me-2 text-warning" /> Top Selling Pharmaceutics</h6>
            </Card.Header>
            <div className="adm-table-wrap">
              <Table hover className="adm-table">
                <thead><tr><th>Medicine</th><th>Category</th><th>Units Sold</th><th>Revenue</th></tr></thead>
                <tbody>
                  {TOP_MEDICINES.slice(0, 3).map((m, i) => (
                    <tr key={m.name}>
                      <td><span className="top-rank me-2">#{i+1}</span>{m.name}</td>
                      <td><Badge bg="secondary" className="cat-badge">{m.category}</Badge></td>
                      <td>{m.units.toLocaleString()} units</td>
                      <td className="fw-bold">{fmtRs(m.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card>
        </Col>
      </Row>
    </>
  );
}

/* ═══════════════ TAB 6 – SYSTEM CONFIGS (SETTINGS) ═══════════ */
function SettingsTab() {
  const { toast } = useToast();
  const [commission, setCommission] = useState(15);
  const [maintenance, setMaintenance] = useState(false);
  const [couriers, setCouriers] = useState({
    leopard: true,
    tcs: true,
    mp: false,
    rider: true
  });

  const handleSaveConfigs = () => {
    toast.success('Platform configurations saved successfully. Nodes updated.');
  };

  return (
    <Card className="doc-card shadow-sm border-0">
      <Card.Body className="p-4">
        <h5 className="fw-bold text-dark mb-4"><FaSlidersH className="text-primary me-2" /> Global System Variables</h5>

        <Form.Group className="mb-4">
          <Form.Label className="doc-label">Platform Consultation Commission Rate (%)</Form.Label>
          <div className="d-flex align-items-center gap-3">
            <Form.Range style={{ flex: 1 }} min={5} max={30} value={commission} onChange={e => setCommission(e.target.value)} />
            <span className="fw-bold text-primary" style={{ width: '45px' }}>{commission}%</span>
          </div>
          <span className="text-muted extra-small">Platform transaction fee cut deducted automatically from Doctor consult booking prices.</span>
        </Form.Group>

        <Form.Group className="mb-4">
          <Form.Label className="doc-label">Authorized Shipping Courier Partners</Form.Label>
          <div className="d-flex flex-column gap-2 mt-2">
            {[
              { key: 'leopard', label: 'Leopard Courier Services -- Standard Dispatch' },
              { key: 'tcs', label: 'TCS Express Logistics -- Premium Urgent delivery' },
              { key: 'mp', label: 'M&P Pakistan -- Cash On Delivery Integration' },
              { key: 'rider', label: 'Rider Logistics -- Local Suburb Delivery' }
            ].map(c => (
              <Form.Check type="switch" id={`switch-${c.key}`} key={c.key} label={c.label} checked={couriers[c.key]} onChange={e => setCouriers(prev => ({ ...prev, [c.key]: e.target.checked }))} />
            ))}
          </div>
        </Form.Group>

        <Form.Group className="mb-4 pb-3 border-bottom">
          <Form.Label className="doc-label text-danger">Platform Operational Status Flags</Form.Label>
          <Form.Check type="switch" id="maintenance-flag" className="text-dark small fw-bold" label="Under Maintenance Mode (Suspends public checkout)" checked={maintenance} onChange={e => setMaintenance(e.target.checked)} />
        </Form.Group>

        <div className="d-flex justify-content-end">
          <Button className="btn-adm-save py-2 px-4 rounded-10" onClick={handleSaveConfigs}>
            Save Platform Configurations
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}

/* ═══════════════ TAB 8 – RESOLUTION & AUDITS ═════════════════ */
function AuditsTab() {
  const { toast } = useToast();
  const [subTab, setSubTab] = useState('suggestions'); // 'suggestions' | 'doctors' | 'pharmacies'

  const [feedbacks, setFeedbacks] = useState([]);
  const [docReports, setDocReports] = useState([]);
  const [pharmReviews, setPharmReviews] = useState([]);
  const [pharmReports, setPharmReports] = useState([]);

  const loadAllAudits = () => {
    try {
      const fb = JSON.parse(localStorage.getItem('medeasy_feedbacks') || '[]');
      const dr = JSON.parse(localStorage.getItem('medeasy_doctor_reports') || '[]');
      const pr = JSON.parse(localStorage.getItem('medeasy_pharmacy_reviews') || '[]');
      const prep = JSON.parse(localStorage.getItem('medeasy_pharmacy_reports') || '[]');

      // sort by time descending
      setFeedbacks(fb.sort((a,b) => b.time - a.time));
      setDocReports(dr.sort((a,b) => b.time - a.time));
      setPharmReviews(pr.sort((a,b) => b.time - a.time));
      setPharmReports(prep.sort((a,b) => b.time - a.time));
    } catch(e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadAllAudits();
    const interval = setInterval(loadAllAudits, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleResolveFeedback = (id) => {
    try {
      const fb = JSON.parse(localStorage.getItem('medeasy_feedbacks') || '[]');
      const updated = fb.filter(item => item.id !== id);
      localStorage.setItem('medeasy_feedbacks', JSON.stringify(updated));
      setFeedbacks(updated);
      toast.success('Platform suggestion marked as reviewed.');
    } catch (e) {
      toast.error('Operation failed.');
    }
  };

  const handleResolveDocReport = (id, action = 'resolve') => {
    try {
      const dr = JSON.parse(localStorage.getItem('medeasy_doctor_reports') || '[]');
      const updated = dr.map(item => {
        if (item.id === id) {
          return { ...item, status: 'resolved', resolutionAction: action };
        }
        return item;
      });
      localStorage.setItem('medeasy_doctor_reports', JSON.stringify(updated));
      setDocReports(updated);

      const target = dr.find(item => item.id === id);

      if (action === 'sanction') {
        toast.warn(`Doctor ${target?.doctorName} has been sanctioned. Clinical account placed under suspension.`);
        // Send notification alert to the Doctor
        const key = 'medeasy_notifications_' + target?.doctorId;
        const rawAlerts = localStorage.getItem(key) || '[]';
        const alerts = JSON.parse(rawAlerts);
        alerts.unshift({
          id: 'alert-' + Date.now() + '-doc',
          text: `Platform Action: Your medical clinic account has been temporarily suspended by the Admin due to a clinical complaint regarding Appointment #APT-${target?.appointmentId}. Please contact medical support.`,
          time: Date.now(),
          emoji: 'complaint',
          unread: true,
          link: '/doctor'
        });
        localStorage.setItem(key, JSON.stringify(alerts));
      } else {
        toast.success('Clinical complaint has been successfully resolved.');
      }
    } catch (e) {
      toast.error('Operation failed.');
    }
  };

  const handleResolvePharmReport = (id, action = 'resolve') => {
    try {
      const prep = JSON.parse(localStorage.getItem('medeasy_pharmacy_reports') || '[]');
      const updated = prep.map(item => {
        if (item.id === id) {
          return { ...item, status: 'resolved', resolutionAction: action };
        }
        return item;
      });
      localStorage.setItem('medeasy_pharmacy_reports', JSON.stringify(updated));
      setPharmReports(updated);

      const target = prep.find(item => item.id === id);

      if (action === 'sanction') {
        toast.warn(`Pharmacy store has been sanctioned. Store representative verification suspended.`);
        // Send notification alert to Pharmacy Representative
        const key = 'medeasy_notifications_pharmacist';
        const rawAlerts = localStorage.getItem(key) || '[]';
        const alerts = JSON.parse(rawAlerts);
        alerts.unshift({
          id: 'alert-' + Date.now() + '-pharm',
          text: `Platform Action: Your pharmacy store and pharmacist representative verification has been suspended due to fulfillment complaint regarding Order #${target?.orderId}.`,
          time: Date.now(),
          emoji: 'complaint',
          unread: true,
          link: '/pharmacist'
        });
        localStorage.setItem(key, JSON.stringify(alerts));
      } else {
        toast.success('Pharmacy logistics complaint resolved.');
      }
    } catch(e) {
      toast.error('Operation failed.');
    }
  };

  const handleResolveReview = (id) => {
    try {
      const pr = JSON.parse(localStorage.getItem('medeasy_pharmacy_reviews') || '[]');
      const updated = pr.filter(item => item.id !== id);
      localStorage.setItem('medeasy_pharmacy_reviews', JSON.stringify(updated));
      setPharmReviews(updated);
      toast.success('Pharmacy rating reviewed and archived.');
    } catch(e) {
      toast.error('Operation failed.');
    }
  };

  return (
    <div className="adm-audits mt-3 animate-fade-in">
      {/* Sub-tabs Nav */}
      <Nav variant="pills" className="mb-4 bg-light p-1.5 rounded-3 d-inline-flex gap-2">
        <Nav.Item>
          <Nav.Link 
            active={subTab === 'suggestions'} 
            onClick={() => setSubTab('suggestions')}
            className="small px-4 py-2 fw-semibold rounded-3"
            style={{ cursor: 'pointer' }}
          >
            💡 Suggestions & Feedbacks ({feedbacks.length})
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link 
            active={subTab === 'doctors'} 
            onClick={() => setSubTab('doctors')}
            className="small px-4 py-2 fw-semibold rounded-3"
            style={{ cursor: 'pointer' }}
          >
            🩺 Doctor Audits ({docReports.length})
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link 
            active={subTab === 'pharmacies'} 
            onClick={() => setSubTab('pharmacies')}
            className="small px-4 py-2 fw-semibold rounded-3"
            style={{ cursor: 'pointer' }}
          >
            🏪 Pharmacy Audits ({pharmReports.length + pharmReviews.length})
          </Nav.Link>
        </Nav.Item>
      </Nav>

      {/* Sub-tab 1: Platform Suggestions */}
      {subTab === 'suggestions' && (
        <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
          <Card.Body className="p-0">
            <Table responsive hover className="mb-0 align-middle">
              <thead className="table-light text-secondary small">
                <tr>
                  <th className="px-4 py-3">Patient</th>
                  <th className="py-3">Type</th>
                  <th className="py-3">Rating</th>
                  <th className="py-3">Subject & Suggestions</th>
                  <th className="py-3">Date</th>
                  <th className="px-4 py-3 text-end">Action</th>
                </tr>
              </thead>
              <tbody className="small">
                {feedbacks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5 text-muted">
                      No platform suggestions or feedbacks submitted yet.
                    </td>
                  </tr>
                ) : (
                  feedbacks.map(f => (
                    <tr key={f.id}>
                      <td className="px-4 py-3 fw-bold text-dark">{f.patientName}<br/><span className="text-muted extra-small">{f.patientEmail}</span></td>
                      <td className="py-3">
                        <Badge bg={f.feedbackType === 'bug' ? 'danger' : f.feedbackType === 'compliment' ? 'success' : 'info'} className="text-capitalize">
                          {f.feedbackType}
                        </Badge>
                      </td>
                      <td className="py-3 fw-semibold text-warning">
                        {[...Array(f.rating)].map((_, idx) => <FaStar key={idx} className="me-1" />)}
                      </td>
                      <td className="py-3">
                        <strong className="text-dark d-block mb-1">{f.subject}</strong>
                        <span className="text-muted d-block leading-relaxed" style={{ maxWidth: '400px' }}>{f.message}</span>
                      </td>
                      <td className="py-3 text-muted">{new Date(f.time).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-end">
                        <Button variant="outline-success" size="sm" className="rounded-pill px-3" onClick={() => handleResolveFeedback(f.id)}>
                          Mark Reviewed
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}

      {/* Sub-tab 2: Doctor Clinical Audits */}
      {subTab === 'doctors' && (
        <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
          <Card.Body className="p-0">
            <Table responsive hover className="mb-0 align-middle">
              <thead className="table-light text-secondary small">
                <tr>
                  <th className="px-4 py-3">Patient Name</th>
                  <th className="py-3">Doctor / Clinic</th>
                  <th className="py-3">Appointment ID</th>
                  <th className="py-3">Issue Category</th>
                  <th className="py-3">Complaint Details</th>
                  <th className="py-3">Status</th>
                  <th className="px-4 py-3 text-end">Resolution Actions</th>
                </tr>
              </thead>
              <tbody className="small">
                {docReports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5 text-muted">
                      No clinical reports against doctors found.
                    </td>
                  </tr>
                ) : (
                  docReports.map(r => (
                    <tr key={r.id}>
                      <td className="px-4 py-3 fw-bold text-dark">{r.patientName}<br/><span className="text-muted extra-small">{r.patientEmail}</span></td>
                      <td className="py-3"><strong>{r.doctorName}</strong><br/><span className="text-muted extra-small">{r.specialty}</span></td>
                      <td className="py-3"><code>#APT-{r.appointmentId}</code></td>
                      <td className="py-3">
                        <Badge bg="danger" className="text-uppercase small" style={{ fontSize: '0.65rem' }}>
                          {r.issueType}
                        </Badge>
                      </td>
                      <td className="py-3"><span className="text-muted d-block leading-relaxed" style={{ maxWidth: '300px' }}>{r.details}</span></td>
                      <td className="py-3">
                        <Badge bg={r.status === 'resolved' ? 'success' : 'warning'}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-end">
                        {r.status !== 'resolved' ? (
                          <div className="d-flex justify-content-end gap-1.5">
                            <Button variant="outline-success" size="sm" className="rounded-8 px-2.5" onClick={() => handleResolveDocReport(r.id, 'resolve')}>
                              Resolve
                            </Button>
                            <Button variant="danger" size="sm" className="rounded-8 px-2.5 text-white" onClick={() => handleResolveDocReport(r.id, 'sanction')}>
                              Sanction
                            </Button>
                          </div>
                        ) : (
                          <span className="text-success fw-bold d-inline-flex align-items-center gap-1">
                            Resolved {r.resolutionAction === 'sanction' && <Badge bg="danger">Sanctioned</Badge>}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}

      {/* Sub-tab 3: Pharmacy Audits */}
      {subTab === 'pharmacies' && (
        <div className="d-flex flex-column gap-4 animate-fade-in">
          {/* Section A: Pharmacy Complaints */}
          <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
            <Card.Header className="bg-white border-0 py-3 px-4">
              <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                ⚠️ Formal Logistics & Fulfillment Complaints
              </h6>
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive hover className="mb-0 align-middle">
                <thead className="table-light text-secondary small">
                  <tr>
                    <th className="px-4 py-3">Patient</th>
                    <th className="py-3">Pharmacy / Order</th>
                    <th className="py-3">Issue Category</th>
                    <th className="py-3">Description</th>
                    <th className="py-3">Status</th>
                    <th className="px-4 py-3 text-end">Actions</th>
                  </tr>
                </thead>
                <tbody className="small">
                  {pharmReports.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-4 text-muted">
                        No logistics reports against pharmacies.
                      </td>
                    </tr>
                  ) : (
                    pharmReports.map(r => (
                      <tr key={r.id}>
                        <td className="px-4 py-3 fw-bold text-dark">{r.patientName}<br/><span className="text-muted extra-small">{r.patientEmail}</span></td>
                        <td className="py-3"><strong>{r.pharmacyName}</strong><br/><span className="text-muted extra-small">Order #{r.orderId}</span></td>
                        <td className="py-3">
                          <Badge bg="danger" className="text-uppercase" style={{ fontSize: '0.65rem' }}>
                            {r.issueType}
                          </Badge>
                        </td>
                        <td className="py-3"><span className="text-muted d-block leading-relaxed" style={{ maxWidth: '300px' }}>{r.details}</span></td>
                        <td className="py-3">
                          <Badge bg={r.status === 'resolved' ? 'success' : 'warning'}>
                            {r.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-end">
                          {r.status !== 'resolved' ? (
                            <div className="d-flex justify-content-end gap-1.5">
                              <Button variant="outline-success" size="sm" className="rounded-8 px-2.5" onClick={() => handleResolvePharmReport(r.id, 'resolve')}>
                                Resolve
                              </Button>
                              <Button variant="danger" size="sm" className="rounded-8 px-2.5 text-white" onClick={() => handleResolvePharmReport(r.id, 'sanction')}>
                                Sanction
                              </Button>
                            </div>
                          ) : (
                            <span className="text-success fw-bold">
                              Resolved {r.resolutionAction === 'sanction' && <Badge bg="danger">Sanctioned</Badge>}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>

          {/* Section B: Pharmacy Reviews */}
          <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
            <Card.Header className="bg-white border-0 py-3 px-4">
              <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                <FaStar className="text-warning" /> Pharmacy Experience & Pharmacist Behavior Ratings
              </h6>
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive hover className="mb-0 align-middle">
                <thead className="table-light text-secondary small">
                  <tr>
                    <th className="px-4 py-3">Patient</th>
                    <th className="py-3">Order ID</th>
                    <th className="py-3">Fulfillment Partner</th>
                    <th className="py-3">Rating</th>
                    <th className="py-3">Comments</th>
                    <th className="px-4 py-3 text-end">Action</th>
                  </tr>
                </thead>
                <tbody className="small">
                  {pharmReviews.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-4 text-muted">
                        No pharmacy delivery reviews left yet.
                      </td>
                    </tr>
                  ) : (
                    pharmReviews.map(r => (
                      <tr key={r.id}>
                        <td className="px-4 py-3 fw-bold text-dark">{r.patientName}<br/><span className="text-muted extra-small">{r.patientEmail}</span></td>
                        <td className="py-3"><code>#{r.orderId}</code></td>
                        <td className="py-3"><strong>{r.pharmacyName}</strong></td>
                        <td className="py-3 fw-semibold text-warning">{'★'.repeat(r.rating)}</td>
                        <td className="py-3"><span className="text-muted d-block leading-relaxed" style={{ maxWidth: '300px' }}>{r.comment}</span></td>
                        <td className="px-4 py-3 text-end">
                          <Button variant="outline-success" size="sm" className="rounded-pill px-3" onClick={() => handleResolveReview(r.id)}>
                            Archive Review
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ═══════════════ MAIN ADMIN DASHBOARD ═════════════════════════ */
const TABS = [
  { key: 'overview',      label: 'Dashboard Overview',   icon: <FaChartBar /> },
  { key: 'users',         label: 'User Management',       icon: <FaUsers /> },
  { key: 'verifications', label: 'Verification Requests', icon: <FaUserCheck /> },
  { key: 'medicines',     label: 'Medicine Management',   icon: <FaBoxes /> },
  { key: 'appointments',  label: 'Appointment Oversight', icon: <FaClock /> },
  { key: 'orders',        label: 'Order Management',      icon: <FaShoppingCart /> },
  { key: 'reports',       label: 'Reports & Analytics',   icon: <FaTrophy /> },
  { key: 'audits',        label: 'Resolution & Audits',   icon: <FaClipboardList /> },
  { key: 'settings',      label: 'System Settings',       icon: <FaSlidersH /> },
];

export default function AdminDashboard() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const tabParam = queryParams.get('tab') || 'overview';

  const [active, setActive] = useState(tabParam);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setActive(tabParam);
  }, [tabParam]);

  // Parent State so changes in one tab persist / display across other tabs
  const [users, setUsers] = useState([
    ...MOCK_USERS,
    {
      id: 11,
      name: 'Dr. Usama Qureshi',
      email: 'usama@medeasy.pk',
      role: 'doctor',
      status: 'active',
      isVerifiedProfile: false,
      joined: 'May 2026',
      orders: 0,
      specialty: 'Cardiology',
      pmcRegistration: 'PMC-88392-D',
      degree: 'MBBS, FCPS',
      degreePlace: 'King Edward Medical University',
      experience: 8,
      clinicAddress: 'Heart Care Clinic, DHA Phase 5, Lahore',
      consultationFee: 1500,
    },
    {
      id: 12,
      name: 'Zainab Apothecary',
      email: 'zainab.pharmd@medeasy.pk',
      role: 'pharmacist',
      status: 'active',
      isVerifiedProfile: false,
      joined: 'May 2026',
      orders: 0,
      pharmacyName: 'Zainab Family Pharmacy',
      degreeName: 'Pharm.D',
      degreePlace: 'Punjab University College of Pharmacy',
      licenseNumber: 'PCP-55421-P',
      address: 'Johar Town Phase 2, Lahore',
    }
  ]);

  useEffect(() => {
    async function fetchRealPending() {
      try {
        const { data } = await api.get('/admin/users/pending');
        // Map real DB users so they conform to the frontend UI expectations
        const realUsersMapped = data.map(u => ({
          ...u,
          id: u._id, // map Mongo _id to standard id
          joined: new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        }));
        setUsers(prev => {
          // Avoid duplicating if they are already in the array
          const filteredPrev = prev.filter(p => !data.some(d => d._id === p._id || d._id === p.id));
          return [...filteredPrev, ...realUsersMapped];
        });
      } catch (err) {
        console.error("Failed to load real pending professionals:", err);
      }
    }
    fetchRealPending();
  }, []);
  const [medicines, setMedicines] = useState([
    { id: 1, name: 'Paracetamol 500mg', category: 'Analgesics', price: 50, stock: 250 },
    { id: 2, name: 'Amoxicillin 250mg', category: 'Antibiotics', price: 180, stock: 90 },
    { id: 3, name: 'Omeprazole 20mg', category: 'Gastroenterology', price: 95, stock: 175 },
    { id: 4, name: 'Cetirizine 10mg', category: 'Antihistamines', price: 65, stock: 310 },
    { id: 5, name: 'Metformin 500mg', category: 'Diabetes', price: 120, stock: 0 },
    { id: 6, name: 'Amlodipine 5mg', category: 'Cardiology', price: 140, stock: 82 },
  ]);
  const [apts, setApts] = useState([
    { id: 101, patientName: 'Ahmed Khan', doctorName: 'Dr. Sara Ali', date: '2026-05-22', time: '10:00 AM', reason: 'Fever checkup', status: 'scheduled' },
    { id: 102, patientName: 'Ayesha Bibi', doctorName: 'Dr. Usman Tariq', date: '2026-05-22', time: '11:30 AM', reason: 'High blood pressure', status: 'scheduled' },
    { id: 103, patientName: 'Muhammad Ali', doctorName: 'Dr. Sara Ali', date: '2026-05-23', time: '02:00 PM', reason: 'Skin rash', status: 'scheduled' },
    { id: 104, patientName: 'Fatima Sana', doctorName: 'Dr. Usman Tariq', date: '2026-05-24', time: '09:00 AM', reason: 'General checkup', status: 'scheduled' },
  ]);
  const [orders, setOrders] = useState([
    { id: 'ORD-9982', createdAt: new Date().toISOString(), totalAmount: 450, status: 'pending', paymentStatus: 'pending', items: [{ name: 'Panadol' }], shippingAddress: { firstName: 'Bilal', lastName: 'Siddiqui' } },
    { id: 'ORD-4091', createdAt: new Date().toISOString(), totalAmount: 180, status: 'dispatched', paymentStatus: 'paid', items: [{ name: 'Disprin' }], shippingAddress: { firstName: 'Zainab', lastName: 'Fatima' } },
    { id: 'ORD-1224', createdAt: new Date().toISOString(), totalAmount: 1250, status: 'delivered', paymentStatus: 'paid', items: [{ name: 'Amoxicillin' }], shippingAddress: { firstName: 'Ahmed', lastName: 'Khan' } },
  ]);

  const globalStats = {
    ordersCount: orders.filter(o => o.status !== 'cancelled').length,
    aptsCount: apts.filter(a => a.status === 'scheduled').length,
  };

  const activeTabDetails = TABS.find(t => t.key === active);

  return (
    <div className="adm-page">
      <button className="adm-mobile-toggle d-lg-none" onClick={() => setMobileOpen(o => !o)}>
        ☰ Administrator Panel Menu
      </button>

      <div className="adm-layout">
        {/* ── Sidebar ── */}
        <aside className={`adm-sidebar ${mobileOpen ? 'open' : ''}`}>
          <div className="adm-sidebar-brand">
            <FaUserShield className="adm-brand-icon" />
            <div>
              <div className="adm-brand-name">Admin Portal</div>
              <div className="adm-brand-sub">Platform Control Center</div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="adm-sidebar-kpis">
            <div className="adm-sidebar-kpi">
              <span className="adm-sidebar-kpi-val text-primary">{users.length}</span>
              <span className="adm-sidebar-kpi-label">Total Accounts</span>
            </div>
            <div className="adm-sidebar-kpi">
              <span className="adm-sidebar-kpi-val text-success">Rs. 2.4M</span>
              <span className="adm-sidebar-kpi-label">Sales MTD</span>
            </div>
          </div>

          <nav className="adm-nav">
            {TABS.filter(t => !t.hiddenFromSidebar).map(t => (
              <button key={t.key}
                className={`adm-nav-item ${active === t.key ? 'active' : ''}`}
                onClick={() => { setActive(t.key); setMobileOpen(false); }}>
                <span className="adm-nav-icon">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Main ── */}
        <main className="adm-main">
          <div className="adm-main-header">
            <h1 className="adm-main-title">
              {activeTabDetails?.icon}
              <span className="ms-2">{activeTabDetails?.label}</span>
            </h1>
            <p className="doc-subtitle text-muted mt-1">MedEasy network monitoring board.</p>
          </div>
          <div className="adm-content">
            {active === 'overview'      && <OverviewTab setActive={setActive} stats={globalStats} />}
            {active === 'verifications' && <VerificationsTab users={users} setUsers={setUsers} />}
            {active === 'users'         && <UsersTab users={users} setUsers={setUsers} />}
            {active === 'medicines'    && <MedicinesTab medicines={medicines} setMedicines={setMedicines} />}
            {active === 'appointments' && <AppointmentsTab apts={apts} setApts={setApts} />}
            {active === 'orders'       && <OrdersTab orders={orders} setOrders={setOrders} />}
            {active === 'reports'      && <ReportsTab />}
            {active === 'audits'       && <AuditsTab />}
            {active === 'settings'     && <SettingsTab />}
          </div>
        </main>
      </div>
    </div>
  );
}
