import { useState } from 'react';
import { Card, Table, Badge, Button, Spinner, Nav } from 'react-bootstrap';
import { FaNotesMedical, FaSearch, FaFilePrescription } from 'react-icons/fa';
import { fmtDate, STATUS_CFG } from './doctorShared';


/* ═══════════════════ SCHEDULE TAB ══════════════════════════════ */
export default function ScheduleTab({ apts, loading, openComplete, handleCancel, setViewRx, setChatApt }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const visible = apts.filter(a => {
    const matchFilter = filter === 'all' || a.status === filter;
    const matchSearch = a.patientName.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <Card className="doc-card shadow-sm border-0">
      <Card.Body>
        <div className="doc-toolbar mb-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
          <Nav variant="pills" className="doc-tabs" activeKey={filter} onSelect={setFilter}>
            {['all','scheduled','completed','cancelled'].map(t => (
              <Nav.Item key={t}>
                <Nav.Link eventKey={t} className="doc-tab">
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                  {t !== 'all' && (
                    <span className="doc-tab-count">{apts.filter(a => a.status === t).length}</span>
                  )}
                </Nav.Link>
              </Nav.Item>
            ))}
          </Nav>
          <div className="doc-search-wrap">
            <FaSearch className="doc-search-icon" />
            <input className="doc-search" placeholder="Search patient…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="doc-loading"><Spinner animation="border" variant="primary" /></div>
        ) : (
          <div className="table-responsive">
            <Table hover className="doc-table">
              <thead>
                <tr><th>Patient</th><th>Date</th><th>Time</th><th>Reason</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-muted py-4">No appointments found.</td></tr>
                )}
                {visible.map((a) => {
                  const cfg = STATUS_CFG[a.status] || STATUS_CFG.scheduled;
                  const isScheduled = a.status === 'scheduled';
                  return (
                    <tr key={a.id}>
                      <td>
                        <div className="patient-cell">
                          <div className="patient-avatar">{(a.patientName || 'P')[0]}</div>
                          <div>
                            <div className="patient-name">{a.patientName}</div>
                            <div className="patient-email">{a.patientEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td className="apt-date">{fmtDate(a.date)}</td>
                      <td><Badge bg="light" text="dark" className="time-badge">{a.time}</Badge></td>
                      <td className="apt-reason">{a.reason || '—'}</td>
                      <td>
                        <Badge bg={cfg.color} className="status-pill">
                          {cfg.icon} <span className="ms-1">{a.status}</span>
                        </Badge>
                      </td>
                      <td>
                        <div className="apt-actions gap-2">
                          {isScheduled ? (
                            <>
                              <Button size="sm" className="btn-complete" onClick={() => openComplete(a)}>
                                <FaNotesMedical className="me-1" /> Complete
                              </Button>
                              <Button size="sm" variant="outline-primary" className="rounded-8 px-2.5" onClick={() => setChatApt(a)}>
                                💬 Chat
                              </Button>
                              <Button size="sm" variant="outline-danger" className="rounded-8" onClick={() => handleCancel(a.id)}>
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="outline-primary" className="rounded-8 px-2.5 me-2" onClick={() => setChatApt(a)}>
                                💬 Chat
                              </Button>
                              {a.status === 'completed' && a.prescription && (
                                <Button size="sm" variant="outline-success" className="rounded-8 me-2" onClick={() => setViewRx(a)}>
                                  <FaFilePrescription className="me-1" /> View Rx
                                </Button>
                              )}
                              {a.status === 'completed' && (
                                <Button size="sm" variant="outline-secondary" className="rounded-8" onClick={() => openComplete(a)}>
                                  Edit Notes
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
