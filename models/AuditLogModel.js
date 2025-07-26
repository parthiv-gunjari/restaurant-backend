const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true // e.g., "Cancel Item", "Edit Quantity", "Refund"
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  performedByName: {
    type: String,
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  tableId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table'
  },
  before: { type: mongoose.Schema.Types.Mixed }, // optional: store original state
  after: { type: mongoose.Schema.Types.Mixed },  // optional: store changed state
  reason: { type: String },

}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);