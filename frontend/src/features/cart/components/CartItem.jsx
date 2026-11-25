import { Link } from 'react-router-dom';
import { FiMinus, FiPlus, FiTrash2 } from 'react-icons/fi';
import { Badge } from '../../../components/ui';
import { formatPrice } from '../../../lib/format';
import MedicalIcon from '../../medicines/components/MedicalIcon';

/** One cart line with quantity stepper and remove button. */
export default function CartItem({ item, onQuantity, onRemove }) {
  const { medicineId, name, brand, image, category, price, quantity, stock, requires_prescription: rx } = item;
  const atMax = stock && quantity >= stock;
  // Same naming as the catalogue card: brand first, generic name underneath.
  const title = brand || name;

  return (
    <li className="cart-item">
      <Link to={`/medicines/${medicineId}`} className="cart-item__media" tabIndex={-1} aria-hidden="true">
        <MedicalIcon emoji={image} category={category} alt="" size={22} />
      </Link>
      <div className="cart-item__info">
        <Link to={`/medicines/${medicineId}`} className="cart-item__name">{title}</Link>
        <span className="cart-item__meta">
          {brand && name && <>{name} · </>}
          {formatPrice(price)} each
          {rx && <Badge tone="warning">Rx</Badge>}
        </span>
        {atMax && <span className="cart-item__warn">Maximum available stock reached</span>}
      </div>

      <div className="cart-item__qty" role="group" aria-label={`Quantity of ${title}`}>
        <button type="button" onClick={() => onQuantity(medicineId, quantity - 1)} aria-label={`Decrease quantity of ${title}`}>
          <FiMinus aria-hidden="true" />
        </button>
        <output aria-live="polite">{quantity}</output>
        <button type="button" onClick={() => onQuantity(medicineId, quantity + 1)} disabled={atMax} aria-label={`Increase quantity of ${title}`}>
          <FiPlus aria-hidden="true" />
        </button>
      </div>

      <span className="cart-item__total">{formatPrice(Number(price) * quantity)}</span>

      <button type="button" className="ui-icon-btn cart-item__remove" onClick={() => onRemove(item)} aria-label={`Remove ${title} from cart`}>
        <FiTrash2 aria-hidden="true" />
      </button>
    </li>
  );
}
