const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNo: {
    type: String,
    required: true,
    unique: true
  },
  shipment: {
    type: mongoose.Schema.ObjectId,
    ref: 'Shipment',
    required: true
  },
  client: {
    name: String,
    email: String,
    phone: String
  },
  amount: {
    type: Number,
    required: true
  },
  tax: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['unpaid', 'paid', 'cancelled'],
    default: 'unpaid'
  },
  dueDate: Date,
  paidDate: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

invoiceSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
