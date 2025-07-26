const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderCode: {
    type: String,
    required: true,
    unique: true
  },
  name: { type: String, required: true },
  email: { type: String }, // changed to optional
  phone: { type: String }, // new field
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
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'ready'],
      default: 'pending'
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
      },
      status: {
        type: String,
        enum: ['pending', 'in-progress', 'ready'],
        default: 'pending'
      }
    }
  ],
  modifications: [
    {
      modifiedAt: { type: Date, default: Date.now },
      modifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      modifiedByName: { type: String },
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
  enum: ['succeeded', 'pending', 'failed', 'canceled', 'unpaid', 'paid'],
  default: 'pending',
},
  paymentMode: {
    type: String,
    enum: ['cash', 'card', 'upi', 'mixed', 'other'],
    default: 'cash'
  },
  splitPayDetails: [
    {
      payerName: String,
      amount: Number,
      items: [String] // optional item breakdown
    }
  ],
  discount: {
    type: Number,
    default: 0
  },
  tax: {
    type: Number,
    default: 0
  },
  receiptPrinted: {
    type: Boolean,
    default: false
  },
  timestamp: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['Pending', 'Completed'],
    default: 'Pending'
  },
  tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', default: null },
  waiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  waiterName: { type: String, default: null },
  orderType: {
    type: String,
    enum: ['online', 'dine-in', 'walkin', 'togo', 'callin'],
    default: 'online'
  },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  startedCookingAt: { type: Date, default: null }
});

module.exports = mongoose.model('Order', orderSchema);