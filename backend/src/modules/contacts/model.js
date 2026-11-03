const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['consignor', 'consignee'],
    required: true
  },
  gst: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    default: ''
  },
  state: {
    type: String,
    default: ''
  },
  building: {
    type: String,
    default: ''
  },
  place: {
    type: String,
    default: ''
  },
  city: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Contact', contactSchema);
