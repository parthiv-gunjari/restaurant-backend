// models/OrderModel.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
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
  notes: { type: String }, // 🆕 Order notes (optional)
  timestamp: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['Pending', 'Completed'],
    default: 'Pending'
  }
});

module.exports = mongoose.model('Order', orderSchema);