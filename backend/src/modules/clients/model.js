const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a client name'],
    unique: true
  },
  contactPerson: String,
  email: {
    type: String,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email']
  },
  phone: {
    type: String,
    default: ''
  },
  address: String,
  gstin: String,
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

clientSchema.index({ createdAt: -1 });
clientSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Client', clientSchema);
