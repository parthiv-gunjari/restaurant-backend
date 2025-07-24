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
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true
    },
    name: { type: String, required: true },
    price: { type: Number, required: true }, 
    quantity: {
      type: Number,
      required: true
    }
  }
],
  initialItems: [
    {
      itemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MenuItem',
        required: true
      },
      name: { type: String, required: true },
      price: { type: Number, required: true },
      quantity: {
        type: Number,
        required: true
      }
    }
  ],
  modifications: [
    {
      modifiedAt: { type: Date, default: Date.now },
      modifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      action: { type: String, enum: ['add', 'remove', 'update', 'cancel'], required: true },
      item: {
        itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
        name: String,
        price: Number,
        quantity: Number
      },
      reason: String
    }
  ],
  notes: { type: String },
  paymentIntentId: { type: String }, 
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
  },
  tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', default: null },
  waiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  orderType: {
    type: String,
    enum: ['online', 'dine-in', 'takeout'],
    default: 'online'
  },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null }
});

module.exports = mongoose.model('Order', orderSchema);