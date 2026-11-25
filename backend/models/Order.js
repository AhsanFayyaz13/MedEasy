const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // Signed-in customer. Empty for guest orders (see `guest`).
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Contact details for orders placed without an account (OTC medicines only).
  guest: {
    name: { type: String, trim: true, maxlength: 120 },
    phone: { type: String, trim: true }, // normalized, used with orderNumber to track the order
    email: { type: String, trim: true, lowercase: true, maxlength: 254 }
  },
  // Short human-friendly reference, e.g. ME-7K2Q9XAB. Guests track orders with it.
  orderNumber: { type: String, unique: true, sparse: true },
  items: [{
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Medicine'
    },
    quantity: { type: Number, required: true, min: 1, max: 100 },
    price: { type: Number, required: true, min: 0 }
  }],
  prescriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription'
  },
  deliveryFee: { type: Number, min: 0, default: 0 },
  // Items subtotal + deliveryFee: the amount the patient pays.
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'dispatched', 'delivered', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cod', 'jazz', 'easy', 'card'],
    default: 'cod'
  },
  cancellationReason: {
    type: String,
    trim: true,
    maxlength: 500
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending'
  },
  shippingAddress: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    postalCode: { type: String },
    phone: { type: String, required: true },
    // Rider instructions (gate code, landmark, preferred time).
    notes: { type: String, maxlength: 500 },
    // Optional map pin the customer dropped at checkout (WGS84, as in Google/OSM links).
    location: {
      lat: { type: Number, min: -90, max: 90 },
      lng: { type: Number, min: -180, max: 180 },
    },
  }
}, {
  timestamps: true
});

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ 'guest.phone': 1, status: 1 });
orderSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
