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
  timestamp: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['Pending', 'Completed'],
    default: 'Pending'
  }
});

module.exports = mongoose.model('Order', orderSchema);