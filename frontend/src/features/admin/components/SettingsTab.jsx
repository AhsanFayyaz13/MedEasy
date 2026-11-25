import { useState } from 'react';
import { Card, Button, Form } from 'react-bootstrap';
import { FaSlidersH } from 'react-icons/fa';
import { useToast } from '../../../context/ToastContext';


/* ═══════════════ TAB 6 – SYSTEM CONFIGS (SETTINGS) ═══════════ */
export default function SettingsTab() {
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
