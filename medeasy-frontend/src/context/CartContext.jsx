import { createContext, useContext, useState, useEffect, useCallback } from 'react';

/**
 * CartContext
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages the global shopping cart with localStorage persistence.
 *
 * Cart item shape:
 *   { medicineId, id, name, brand, image, price, stock, quantity }
 *
 * Exposed values:
 *   cartItems       Array of cart item objects
 *   addToCart(medicine, qty?)  Adds or increments; enforces stock cap
 *   removeFromCart(medicineId)
 *   updateQuantity(medicineId, newQty)  Removes if qty < 1
 *   clearCart()
 *   cartTotal       Computed sum of price × quantity (rounded to 2dp)
 *   cartCount       Total number of individual units across all items
 *   isInCart(id)    Helper – returns true if a medicine is in the cart
 *   getItemQty(id)  Helper – returns current quantity of a medicine in cart
 *
 * Toast notifications are emitted via the ToastContext (separate file).
 */

const CartContext = createContext(null);

const CART_KEY = 'medeasy_cart_v2';

// ─── Storage helpers ──────────────────────────────────────────────────────────
function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(loadCart);

  // Persist on every change
  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  /**
   * addToCart – adds a medicine or increments its quantity.
   * @param {Object} medicine  Full medicine object from mockMedicines / API
   * @param {number} [qty=1]   Number of units to add
   * @returns {'added'|'updated'|'capped'}  Result token for toast messaging
   */
  const addToCart = useCallback((medicine, qty = 1) => {
    let result = 'added';

    setCartItems((prev) => {
      const existing = prev.find((i) => i.medicineId === medicine.id);

      if (existing) {
        const newQty = existing.quantity + qty;
        const capped = Math.min(newQty, medicine.stock ?? Infinity);
        result = capped < newQty ? 'capped' : 'updated';
        return prev.map((i) =>
          i.medicineId === medicine.id ? { ...i, quantity: capped } : i
        );
      }

      // New item
      const quantity = Math.min(qty, medicine.stock ?? qty);
      return [
        ...prev,
        {
          medicineId:  medicine.id,
          id:          medicine.id,       // kept for legacy compat
          name:        medicine.name,
          brand:       medicine.brand ?? '',
          image:       medicine.image ?? '💊',
          price:       medicine.price,
          stock:       medicine.stock ?? 999,
          quantity,
        },
      ];
    });

    return result;
  }, []);

  /** Remove an item completely */
  const removeFromCart = useCallback((medicineId) => {
    setCartItems((prev) => prev.filter((i) => i.medicineId !== medicineId));
  }, []);

  /**
   * Update quantity.  Removes item if qty < 1.
   * Enforces stock cap if item has stock info.
   */
  const updateQuantity = useCallback((medicineId, newQty) => {
    if (newQty < 1) {
      removeFromCart(medicineId);
      return;
    }
    setCartItems((prev) =>
      prev.map((i) => {
        if (i.medicineId !== medicineId) return i;
        const capped = i.stock ? Math.min(newQty, i.stock) : newQty;
        return { ...i, quantity: capped };
      })
    );
  }, [removeFromCart]);

  /** Clear the whole cart */
  const clearCart = useCallback(() => setCartItems([]), []);

  // ── Derived values ─────────────────────────────────────────────
  const cartTotal = parseFloat(
    cartItems.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0).toFixed(2)
  );
  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  // ── Helper accessors ────────────────────────────────────────────
  const isInCart  = useCallback((id) => cartItems.some((i) => i.medicineId === id), [cartItems]);
  const getItemQty = useCallback((id) => cartItems.find((i) => i.medicineId === id)?.quantity ?? 0, [cartItems]);

  // ── Legacy aliases (so nothing breaks) ─────────────────────────
  const totalItems = cartCount;
  const totalPrice = cartTotal;

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartTotal,
    cartCount,
    isInCart,
    getItemQty,
    // legacy
    totalItems,
    totalPrice,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}

export default CartContext;
