/**
 * mockOrders.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Comprehensive mock orders dataset for OrderTracking page.
 * Statuses: 'pending' | 'confirmed' | 'dispatched' | 'delivered' | 'cancelled'
 *
 * Each order:
 * {
 *   id, status, createdAt, updatedAt,
 *   paymentMethod, paymentStatus,
 *   totalAmount, deliveryFee,
 *   estimatedDelivery,
 *   prescriptionId?,
 *   shippingAddress: { firstName, lastName, address, city, postalCode, phone },
 *   items: [{ medicineId, name, brand, image, price, quantity, requiresPrescription }],
 * }
 */

const MOCK_ORDERS = [
  {
    id:               'ORD-A1B2C3D4',
    status:           'delivered',
    createdAt:        '2026-05-01T10:30:00Z',
    updatedAt:        '2026-05-04T14:10:00Z',
    paymentMethod:    'cod',
    paymentStatus:    'paid',
    totalAmount:      295,
    deliveryFee:      0,
    estimatedDelivery: 'Delivered on May 4, 2026',
    prescriptionId:   null,
    shippingAddress: {
      firstName: 'Ahmed',
      lastName:  'Khan',
      address:   'House 12, Block F, Clifton',
      city:      'Karachi',
      postalCode: '75600',
      phone:     '+92 300 1234567',
    },
    items: [
      { medicineId: 1, name: 'Paracetamol 500mg', brand: 'Panadol',   image: '💊', price: 50,  quantity: 2, requiresPrescription: false },
      { medicineId: 4, name: 'Cetirizine 10mg',   brand: 'Zyrtec',    image: '🌿', price: 65,  quantity: 1, requiresPrescription: false },
      { medicineId: 7, name: 'Vitamin D3 5000 IU', brand: 'D-Vit',    image: '☀️', price: 280, quantity: 0, requiresPrescription: false },
    ].map(i => ({ ...i, subtotal: i.price * i.quantity })),
  },
  {
    id:               'ORD-E5F6G7H8',
    status:           'dispatched',
    createdAt:        '2026-05-10T08:15:00Z',
    updatedAt:        '2026-05-12T09:00:00Z',
    paymentMethod:    'jazz',
    paymentStatus:    'paid',
    totalAmount:      575,
    deliveryFee:      0,
    estimatedDelivery: 'Expected May 14–15, 2026',
    prescriptionId:   'RX-8F2A1B',
    shippingAddress: {
      firstName: 'Sara',
      lastName:  'Ali',
      address:   '45-B, Gulberg III',
      city:      'Lahore',
      postalCode: '54000',
      phone:     '+92 321 9876543',
    },
    items: [
      { medicineId: 6, name: 'Amlodipine 5mg',    brand: 'Norvasc',   image: '❤️', price: 140, quantity: 2, requiresPrescription: true  },
      { medicineId: 9, name: 'Salbutamol Inhaler', brand: 'Ventolin',  image: '💨', price: 450, quantity: 1, requiresPrescription: true  },
    ].map(i => ({ ...i, subtotal: i.price * i.quantity })),
  },
  {
    id:               'ORD-I9J0K1L2',
    status:           'confirmed',
    createdAt:        '2026-05-13T16:45:00Z',
    updatedAt:        '2026-05-13T17:00:00Z',
    paymentMethod:    'cod',
    paymentStatus:    'pending',
    totalAmount:      420,
    deliveryFee:      0,
    estimatedDelivery: 'Expected May 16–17, 2026',
    prescriptionId:   null,
    shippingAddress: {
      firstName: 'Bilal',
      lastName:  'Raza',
      address:   'Flat 3, Askari Tower, F-11',
      city:      'Islamabad',
      postalCode: '44000',
      phone:     '+92 333 5678901',
    },
    items: [
      { medicineId: 8,  name: 'Atorvastatin 20mg', brand: 'Lipitor',   image: '🫀', price: 320, quantity: 1, requiresPrescription: true  },
      { medicineId: 10, name: 'Ibuprofen 400mg',   brand: 'Brufen',    image: '🩹', price: 75,  quantity: 1, requiresPrescription: false },
      { medicineId: 12, name: 'Zinc 20mg Tablets',  brand: 'Zincovit', image: '⚡', price: 160, quantity: 0, requiresPrescription: false },
    ].map(i => ({ ...i, subtotal: i.price * i.quantity })),
  },
  {
    id:               'ORD-M3N4O5P6',
    status:           'pending',
    createdAt:        '2026-05-14T22:50:00Z',
    updatedAt:        '2026-05-14T22:50:00Z',
    paymentMethod:    'card',
    paymentStatus:    'pending',
    totalAmount:      455,
    deliveryFee:      0,
    estimatedDelivery: 'Expected May 17–18, 2026',
    prescriptionId:   null,
    shippingAddress: {
      firstName: 'Fatima',
      lastName:  'Siddiqui',
      address:   '22, Block 9, PECHS',
      city:      'Karachi',
      postalCode: '75400',
      phone:     '+92 311 2345678',
    },
    items: [
      { medicineId: 3,  name: 'Omeprazole 20mg',   brand: 'Risek',  image: '🔬', price: 95,  quantity: 3, requiresPrescription: false },
      { medicineId: 11, name: 'Loratadine 10mg',   brand: 'Claritin', image: '🌸', price: 55, quantity: 2, requiresPrescription: false },
      { medicineId: 4,  name: 'Cetirizine 10mg',   brand: 'Zyrtec',  image: '🌿', price: 65,  quantity: 1, requiresPrescription: false },
    ].map(i => ({ ...i, subtotal: i.price * i.quantity })),
  },
  {
    id:               'ORD-Q7R8S9T0',
    status:           'cancelled',
    createdAt:        '2026-05-08T11:00:00Z',
    updatedAt:        '2026-05-08T13:30:00Z',
    paymentMethod:    'easy',
    paymentStatus:    'refunded',
    totalAmount:      340,
    deliveryFee:      120,
    estimatedDelivery: 'N/A – cancelled',
    prescriptionId:   null,
    shippingAddress: {
      firstName: 'Umar',
      lastName:  'Farooq',
      address:   '7, Allama Iqbal Road, Model Town',
      city:      'Lahore',
      postalCode: '54700',
      phone:     '+92 345 6789012',
    },
    items: [
      { medicineId: 2, name: 'Amoxicillin 250mg', brand: 'Amoxil', image: '🧪', price: 180, quantity: 1, requiresPrescription: true  },
      { medicineId: 1, name: 'Paracetamol 500mg', brand: 'Panadol', image: '💊', price: 50, quantity: 2, requiresPrescription: false },
    ].map(i => ({ ...i, subtotal: i.price * i.quantity })),
  },
];

export default MOCK_ORDERS;
