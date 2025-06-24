const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderCode: {
    type: String,
    required: true,
    unique: true
  },
  name: { type: String, required: true },
  email: { type: String, required: true },
  items: [
    {
      _id: String,
      name: String,
      price: Number,
      quantity: Number
    }
  ],
  notes: { type: String },
  paymentIntentId: { type: String }, // ✅ Stripe PaymentIntent ID
  cardBrand: { type: String },
  last4: { type: String },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Failed', 'succeeded', 'processing', 'requires_payment_method'],
    default: 'Pending'
  },
  timestamp: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['Pending', 'Completed'],
    default: 'Pending'
  }
});

module.exports = mongoose.model('Order', orderSchema);