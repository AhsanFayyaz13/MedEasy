import { useState } from 'react';
import {
  Container, Row, Col, Card, Table, Badge,
  Button, Form, Nav, ProgressBar, Alert,
} from 'react-bootstrap';
import {
  FaUsers, FaChartBar, FaBoxes, FaFileMedical,
  FaUserShield, FaTrash, FaDownload, FaExclamationTriangle,
  FaCheckCircle, FaClock, FaTimesCircle, FaTrophy,
  FaMoneyBillWave, FaShoppingCart, FaSyncAlt,
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
import './AdminDashboard.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler, Title, Tooltip, Legend);

/* ─── Shared helpers ─────────────────────────────────────────── */
const ROLES = ['patient','doctor','pharmacist','admin'];
const ROLE_COLOR = { patient:'primary', doctor:'info', pharmacist:'success', admin:'danger' };
const STATUS_COLOR = { active:'success', suspended:'warning' };
const fmtRs = (n) => `Rs. ${n.toLocaleString()}`;
const pdfPlaceholder = (label) => alert(`PDF download for "${label}" will be available once backend is connected.`);

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

/* ═══════════════ TAB 1 – USER MANAGEMENT ════════════════════ */
function UsersTab() {
  const { toast } = useToast();
  const [users,   setUsers]   = useState([...MOCK_USERS]);
  const [search,  setSearch]  = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

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
    setUsers(prev => prev.filter(u => u.id !== id));
    toast.success('User removed');
  };

  const handleToggleStatus = (id) => {
    setUsers(prev => prev.map(u => u.id === id
      ? {...u, status: u.status === 'active' ? 'suspended' : 'active'}
      : u));
  };

  const counts = ROLES.reduce((a, r) => ({...a, [r]: users.filter(u=>u.role===r).length}), {});

  return (
    <>
      {/* Summary pills */}
      <div className="adm-user-summary mb-3">
        <span className="adm-user-total">{users.length} total users</span>
        {ROLES.map(r => (
          <Badge key={r} bg={ROLE_COLOR[r]} className="adm-role-pill" onClick={() => setRoleFilter(r)} role="button">
            {counts[r]} {r}s
          </Badge>
        ))}
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
    </>
  );
}

/* ═══════════════ TAB 2 – SALES REPORTS ══════════════════════ */
const CHART_OPTS = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { position:'top' }, title: { display: false } },
  scales: { y: { beginAtZero: true, grid: { color:'#f1f5f9' } }, x: { grid:{ display:false } } },
};

function SalesTab() {
  const barData = {
    labels: MONTHLY_SALES.labels,
    datasets: [
      { label:'Revenue (Rs.)', data: MONTHLY_SALES.revenue, backgroundColor:'rgba(56,189,248,0.7)', borderRadius:8, borderSkipped:false },
      { label:'Orders',        data: MONTHLY_SALES.orders,  backgroundColor:'rgba(129,140,248,0.7)', borderRadius:8, borderSkipped:false },
    ],
  };

  return (
    <>
      <div className="adm-section-toolbar mb-3">
        <h5 className="adm-section-title">Sales Overview</h5>
        <Button variant="outline-secondary" size="sm" onClick={() => pdfPlaceholder('Sales Report')}>
          <FaDownload className="me-1" />Export PDF
        </Button>
      </div>

      {/* KPI cards */}
      <Row className="g-3 mb-4">
        <Col sm={6} xl={3}><KpiCard label="Total Revenue"    value={fmtRs(SALES_KPI.totalRevenue)}  icon={<FaMoneyBillWave />} color="#10b981" sub="All time" /></Col>
        <Col sm={6} xl={3}><KpiCard label="Total Orders"     value={SALES_KPI.totalOrders}           icon={<FaShoppingCart />}  color="#38bdf8" sub="All time" /></Col>
        <Col sm={6} xl={3}><KpiCard label="Avg Order Value"  value={fmtRs(SALES_KPI.avgOrderValue)}  icon={<FaChartBar />}      color="#f59e0b" sub="Per order" /></Col>
        <Col sm={6} xl={3}><KpiCard label="Returning Rate"   value={`${SALES_KPI.returningRate}%`}  icon={<FaSyncAlt />}       color="#a78bfa" sub="Customers" /></Col>
      </Row>

      {/* Bar chart */}
      <Card className="adm-chart-card mb-4">
        <Card.Body>
          <h6 className="adm-chart-title">Monthly Revenue & Orders</h6>
          <div style={{height:280}}>
            <Bar data={barData} options={CHART_OPTS} />
          </div>
        </Card.Body>
      </Card>

      {/* Top medicines table */}
      <Card className="adm-table-card">
        <Card.Header className="adm-card-header">
          <h6 className="adm-chart-title mb-0"><FaTrophy className="me-2 text-warning" />Top Selling Medicines</h6>
        </Card.Header>
        <div className="adm-table-wrap">
          <Table hover responsive className="adm-table">
            <thead><tr><th>Medicine</th><th>Category</th><th>Units Sold</th><th>Revenue</th><th>Share</th></tr></thead>
            <tbody>
              {TOP_MEDICINES.map((m, i) => {
                const maxRev = Math.max(...TOP_MEDICINES.map(x=>x.revenue));
                return (
                  <tr key={m.name}>
                    <td><span className="top-rank me-2">#{i+1}</span>{m.name}</td>
                    <td><Badge bg="secondary" className="cat-badge">{m.category}</Badge></td>
                    <td>{m.units.toLocaleString()}</td>
                    <td className="fw-bold">{fmtRs(m.revenue)}</td>
                    <td style={{minWidth:120}}>
                      <ProgressBar now={Math.round(m.revenue/maxRev*100)} className="adm-progress" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      </Card>
    </>
  );
}

/* ═══════════════ TAB 3 – INVENTORY REPORTS ══════════════════ */
function InventoryTab() {
  return (
    <>
      <div className="adm-section-toolbar mb-3">
        <h5 className="adm-section-title">Inventory Overview</h5>
        <Button variant="outline-secondary" size="sm" onClick={() => pdfPlaceholder('Inventory Report')}>
          <FaDownload className="me-1" />Export PDF
        </Button>
      </div>

      <Row className="g-3 mb-4">
        <Col sm={6} lg={3}><KpiCard label="Total Products"    value={INVENTORY_KPI.totalProducts}                    icon={<FaBoxes />}             color="#38bdf8" /></Col>
        <Col sm={6} lg={3}><KpiCard label="Total Units"       value={INVENTORY_KPI.totalStockUnits.toLocaleString()} icon={<FaChartBar />}          color="#10b981" /></Col>
        <Col sm={6} lg={3}><KpiCard label="Stock Value"       value={fmtRs(INVENTORY_KPI.totalStockValue)}           icon={<FaMoneyBillWave />}     color="#f59e0b" /></Col>
        <Col sm={6} lg={3}><KpiCard label="Low / Out of Stock" value={`${INVENTORY_KPI.lowStockCount} / ${INVENTORY_KPI.outOfStockCount}`} icon={<FaExclamationTriangle />} color="#ef4444" /></Col>
      </Row>

      {/* Low-stock alert */}
      {LOW_STOCK_ITEMS.filter(i=>i.stock===0).length > 0 && (
        <Alert variant="danger" className="adm-alert mb-3">
          <FaTimesCircle className="me-2" />
          <strong>{LOW_STOCK_ITEMS.filter(i=>i.stock===0).length} medicine(s) are completely out of stock.</strong> Reorder immediately.
        </Alert>
      )}

      <Card className="adm-table-card">
        <Card.Header className="adm-card-header">
          <h6 className="adm-chart-title mb-0"><FaExclamationTriangle className="me-2 text-warning" />Low & Out-of-Stock Items</h6>
        </Card.Header>
        <div className="adm-table-wrap">
          <Table hover responsive className="adm-table">
            <thead><tr><th>Medicine</th><th>Category</th><th>Current Stock</th><th>Threshold</th><th>Price</th><th>Suggested Reorder</th><th>Status</th></tr></thead>
            <tbody>
              {LOW_STOCK_ITEMS.map(item => (
                <tr key={item.id} className={item.stock===0?'row-danger':'row-warn'}>
                  <td className="fw-bold">{item.name}</td>
                  <td><Badge bg="secondary" className="cat-badge">{item.category}</Badge></td>
                  <td className={item.stock===0?'text-danger fw-bold':'text-warning fw-bold'}>{item.stock}</td>
                  <td className="text-muted">{item.threshold}</td>
                  <td>{fmtRs(item.price)}</td>
                  <td><Badge bg="info" text="dark">{item.reorderQty} units</Badge></td>
                  <td>
                    {item.stock===0
                      ? <Badge bg="danger">Out of Stock</Badge>
                      : <Badge bg="warning" text="dark">Low Stock</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>

      {/* Full inventory summary */}
      <Card className="adm-table-card mt-4">
        <Card.Header className="adm-card-header">
          <h6 className="adm-chart-title mb-0">All Medicines – Stock Summary</h6>
        </Card.Header>
        <div className="adm-table-wrap">
          <Table hover responsive className="adm-table">
            <thead><tr><th>ID</th><th>Medicine</th><th>Category</th><th>Price</th><th>Stock Level</th></tr></thead>
            <tbody>
              {[
                {id:1,name:'Paracetamol 500mg',  cat:'Analgesics',        price:50,  stock:250},
                {id:2,name:'Amoxicillin 250mg',   cat:'Antibiotics',       price:180, stock:90 },
                {id:3,name:'Omeprazole 20mg',      cat:'Gastroenterology',  price:95,  stock:175},
                {id:4,name:'Cetirizine 10mg',      cat:'Antihistamines',    price:65,  stock:310},
                {id:5,name:'Metformin 500mg',      cat:'Diabetes',          price:120, stock:0  },
                {id:6,name:'Amlodipine 5mg',       cat:'Cardiology',        price:140, stock:82 },
                {id:7,name:'Vitamin D3 5000IU',    cat:'Vitamins',          price:280, stock:400},
                {id:8,name:'Atorvastatin 20mg',    cat:'Cardiology',        price:320, stock:65 },
                {id:9,name:'Salbutamol Inhaler',   cat:'Respiratory',       price:450, stock:8  },
                {id:10,name:'Ibuprofen 400mg',     cat:'Analgesics',        price:75,  stock:195},
                {id:11,name:'Loratadine 10mg',     cat:'Antihistamines',    price:55,  stock:220},
                {id:12,name:'Zinc 20mg Tablets',   cat:'Vitamins',          price:160, stock:300},
              ].map(m => {
                const pct = Math.min(100, Math.round(m.stock/400*100));
                return (
                  <tr key={m.id}>
                    <td className="text-muted small">{m.id}</td>
                    <td className="fw-600">{m.name}</td>
                    <td><Badge bg="secondary" className="cat-badge">{m.cat}</Badge></td>
                    <td>Rs.{m.price}</td>
                    <td style={{minWidth:160}}>
                      <div className="d-flex align-items-center gap-2">
                        <ProgressBar now={pct} style={{flex:1,height:8}} variant={m.stock===0?'danger':m.stock<10?'warning':'success'} />
                        <span className="small fw-bold" style={{minWidth:30}}>{m.stock}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      </Card>
    </>
  );
}

/* ═══════════════ TAB 4 – PRESCRIPTION ANALYTICS ════════════ */
function PrescriptionTab() {
  const lineData = {
    labels: RX_BY_MONTH.labels,
    datasets: [
      { label:'Uploads',  data:RX_BY_MONTH.uploads,  borderColor:'#38bdf8', backgroundColor:'rgba(56,189,248,.12)', tension:.4, fill:true, pointRadius:4 },
      { label:'Verified', data:RX_BY_MONTH.verified, borderColor:'#10b981', backgroundColor:'rgba(16,185,129,.12)', tension:.4, fill:true, pointRadius:4 },
    ],
  };

  const verifyRate   = RX_KPI.verificationRate;
  const rejectRate   = Math.round(RX_KPI.rejected / RX_KPI.totalUploads * 100);
  const pendingRate  = Math.round(RX_KPI.pending  / RX_KPI.totalUploads * 100);

  return (
    <>
      <div className="adm-section-toolbar mb-3">
        <h5 className="adm-section-title">Prescription Analytics</h5>
        <Button variant="outline-secondary" size="sm" onClick={() => pdfPlaceholder('Prescription Report')}>
          <FaDownload className="me-1" />Export PDF
        </Button>
      </div>

      <Row className="g-3 mb-4">
        <Col sm={6} lg={3}><KpiCard label="Total Uploads"   value={RX_KPI.totalUploads}            icon={<FaFileMedical />}  color="#38bdf8" /></Col>
        <Col sm={6} lg={3}><KpiCard label="Verified"        value={RX_KPI.verified}                icon={<FaCheckCircle />}  color="#10b981" sub={`${verifyRate}% rate`} /></Col>
        <Col sm={6} lg={3}><KpiCard label="Rejected"        value={RX_KPI.rejected}                icon={<FaTimesCircle />}  color="#ef4444" sub={`${rejectRate}% rate`} /></Col>
        <Col sm={6} lg={3}><KpiCard label="Avg Review Time" value={RX_KPI.avgReviewTime}           icon={<FaClock />}        color="#f59e0b" sub="Per prescription" /></Col>
      </Row>

      {/* Status breakdown */}
      <Card className="adm-chart-card mb-4">
        <Card.Body>
          <h6 className="adm-chart-title">Verification Breakdown</h6>
          <div className="rx-breakdown">
            {[
              { label:'Verified',  count: RX_KPI.verified, pct: verifyRate,  color:'success' },
              { label:'Rejected',  count: RX_KPI.rejected, pct: rejectRate,  color:'danger'  },
              { label:'Pending',   count: RX_KPI.pending,  pct: pendingRate, color:'warning' },
            ].map(b => (
              <div key={b.label} className="rx-breakdown-row">
                <span className="rx-b-label">{b.label}</span>
                <ProgressBar now={b.pct} variant={b.color} className="rx-b-bar" />
                <span className="rx-b-pct">{b.pct}%</span>
                <Badge bg={b.color} text={b.color==='warning'?'dark':undefined}>{b.count}</Badge>
              </div>
            ))}
          </div>
        </Card.Body>
      </Card>

      {/* Line chart */}
      <Card className="adm-chart-card">
        <Card.Body>
          <h6 className="adm-chart-title">Monthly Upload Trends</h6>
          <div style={{height:260}}>
            <Line data={lineData} options={CHART_OPTS} />
          </div>
        </Card.Body>
      </Card>
    </>
  );
}

/* ═══════════════ MAIN DASHBOARD ════════════════════════════ */
const TABS = [
  { key:'users',         label:'User Management',       icon:<FaUsers /> },
  { key:'sales',         label:'Sales Reports',         icon:<FaChartBar /> },
  { key:'inventory',     label:'Inventory Reports',     icon:<FaBoxes /> },
  { key:'prescriptions', label:'Prescription Analytics',icon:<FaFileMedical /> },
];

const GLOBAL_STATS = [
  { label:'Total Users',    value:'1,240',  color:'#38bdf8', icon:<FaUsers /> },
  { label:'Revenue (May)',  value:'Rs. 95k', color:'#10b981', icon:<FaMoneyBillWave /> },
  { label:'Orders Today',   value:'67',      color:'#f59e0b', icon:<FaShoppingCart /> },
  { label:'Pending Rx',     value:'7',       color:'#a78bfa', icon:<FaFileMedical /> },
];

export default function AdminDashboard() {
  const [active, setActive] = useState('users');
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="adm-page">
      <button className="adm-mobile-toggle d-lg-none" onClick={() => setMobileOpen(o=>!o)}>
        ☰ Admin Menu
      </button>

      <div className="adm-layout">
        {/* ── Sidebar ── */}
        <aside className={`adm-sidebar ${mobileOpen?'open':''}`}>
          <div className="adm-sidebar-brand">
            <FaUserShield className="adm-brand-icon" />
            <div>
              <div className="adm-brand-name">Admin Panel</div>
              <div className="adm-brand-sub">MedEasy Control</div>
            </div>
          </div>

          {/* Global KPI pills */}
          <div className="adm-sidebar-kpis">
            {GLOBAL_STATS.map(s => (
              <div key={s.label} className="adm-sidebar-kpi">
                <span className="adm-sidebar-kpi-val" style={{color:s.color}}>{s.value}</span>
                <span className="adm-sidebar-kpi-label">{s.label}</span>
              </div>
            ))}
          </div>

          <nav className="adm-nav">
            {TABS.map(t => (
              <button key={t.key}
                className={`adm-nav-item ${active===t.key?'active':''}`}
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
              {TABS.find(t=>t.key===active)?.icon}
              <span className="ms-2">{TABS.find(t=>t.key===active)?.label}</span>
            </h1>
          </div>
          <div className="adm-content">
            {active==='users'         && <UsersTab />}
            {active==='sales'         && <SalesTab />}
            {active==='inventory'     && <InventoryTab />}
            {active==='prescriptions' && <PrescriptionTab />}
          </div>
        </main>
      </div>
    </div>
  );
}
