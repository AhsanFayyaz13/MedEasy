import { Card } from 'react-bootstrap';

/* ─── KPI card ───────────────────────────────────────────────── */
export default function KpiCard({ label, value, icon, color, sub }) {
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
