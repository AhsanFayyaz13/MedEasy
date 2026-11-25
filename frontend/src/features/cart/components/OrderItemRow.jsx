import { Badge } from 'react-bootstrap';
import MedicalIcon from '../../medicines/components/MedicalIcon';


// ─── Order item row ───────────────────────────────────────────────────────────
export default function OrderItemRow({ item }) {
  return (
    <div className="checkout-item-row" style={{ display: 'flex', alignItems: 'center' }}>
      <div className="checkout-item-icon-wrap me-2">
        <MedicalIcon emoji={item.image} size={18} />
      </div>
      <div className="checkout-item-info">
        <span className="checkout-item-name">{item.name}</span>
        <span className="checkout-item-meta">
          {item.brand && `${item.brand} · `}×{item.quantity}
          {item.requires_prescription && (
            <Badge bg="warning" text="dark" className="rx-pill ms-1">Rx</Badge>
          )}
        </span>
      </div>
      <span className="checkout-item-subtotal">
        Rs. {(item.price * item.quantity).toLocaleString()}
      </span>
    </div>
  );
}
