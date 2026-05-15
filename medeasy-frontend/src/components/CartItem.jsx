import { Row, Col, Image, Button } from 'react-bootstrap';
import { FaTrash, FaMinus, FaPlus } from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import './CartItem.css';

/**
 * CartItem – renders a single row inside the cart page.
 * @param {Object} item - cart item (medicine + quantity)
 */
export default function CartItem({ item }) {
  const { updateQuantity, removeFromCart } = useCart();
  const { id, name, image, price, quantity } = item;

  return (
    <div className="cart-item">
      <Row className="align-items-center">
        {/* Image */}
        <Col xs={3} sm={2}>
          <Image
            src={image || '/placeholder-medicine.png'}
            alt={name}
            className="cart-item-img"
            rounded
          />
        </Col>

        {/* Name & price */}
        <Col xs={9} sm={4}>
          <p className="item-name">{name}</p>
          <p className="item-unit-price">Rs. {Number(price).toFixed(2)} / unit</p>
        </Col>

        {/* Quantity controls */}
        <Col xs={6} sm={3} className="mt-2 mt-sm-0">
          <div className="qty-controls">
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => updateQuantity(id, quantity - 1)}
              aria-label="Decrease quantity"
            >
              <FaMinus />
            </Button>
            <span className="qty-value">{quantity}</span>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => updateQuantity(id, quantity + 1)}
              aria-label="Increase quantity"
            >
              <FaPlus />
            </Button>
          </div>
        </Col>

        {/* Subtotal */}
        <Col xs={4} sm={2} className="mt-2 mt-sm-0 text-end">
          <p className="item-subtotal">
            Rs. {(Number(price) * quantity).toFixed(2)}
          </p>
        </Col>

        {/* Remove */}
        <Col xs={2} sm={1} className="text-end">
          <Button
            variant="link"
            className="remove-btn"
            onClick={() => removeFromCart(id)}
            aria-label="Remove item"
          >
            <FaTrash />
          </Button>
        </Col>
      </Row>
    </div>
  );
}
