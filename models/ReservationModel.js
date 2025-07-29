
const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  guestCount: { type: Number, required: true },
  date: { type: Date, required: true },
  tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: false },
  notes: { type: String },
  source: { type: String, enum: ['callin', 'online'], default: 'callin' },
  status: {
    type: String,
    enum: ['reserved', 'seated', 'completed', 'cancelled'],
    default: 'reserved'
  },
  reminderSent: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Reservation', reservationSchema);