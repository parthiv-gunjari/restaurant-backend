const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
  tableNumber: { type: String, required: true, unique: true },
  status: {
    type: String,
    enum: ['available', 'occupied', 'reserved', 'cleaning'],
    default: 'available'
  },
  // Reservation fields
  guestCapacity: { type: Number, default: 4 }, // Number of guests the table can hold
  reservedFor: { type: Date, default: null }, // Reservation time
  reservationStatus: {
    type: String,
    enum: ['none', 'reserved', 'seated', 'cancelled'],
    default: 'none'
  },
  reservationNotes: { type: String, default: '' }, // Notes like birthday or special requests
  reservedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation', default: null }, // Link to Reservation if needed
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 }
  },
  currentOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  startedAt: { type: Date, default: null },
  waiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  waiterName: { type: String, default: null }
}, {
  timestamps: true
});

module.exports = mongoose.model('Table', tableSchema);