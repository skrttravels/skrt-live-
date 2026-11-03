const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  gst: { type: String, default: '' },
  name: { type: String, default: '' },
  phoneNumber: { type: String, default: '' },
  state: { type: String, default: '' },
  building: { type: String, default: '' },
  place: { type: String, default: '' },
  city: { type: String, default: '' }
}, { _id: false });

const shipmentSchema = new mongoose.Schema({
  consignmentNumber: {
    type: String,
    required: true,
    unique: true
  },
  toBranch: { type: String, default: '' },
  consignor: { type: contactSchema, default: { gst: '', name: '' } },
  consignee: { type: contactSchema, default: { gst: '', name: '' } },
  bookedAt: { type: Date, default: Date.now },
  ewayParta: { type: String, default: '' },
  invoiceNumber: { type: String, default: '' },
  invoiceValue: { type: Number, default: 0 },
  description: { type: String, default: '' },
  quantity: { type: Number, default: 0 },
  packageType: { type: String, default: '' },
  privateNumber: { type: String, default: '' },
  actualWeight: { type: Number, default: 0 },
  chargedWeight: { type: Number, default: 0 },
  rateType: { type: String, default: '' },
  rate: { type: Number, default: 0 },
  paymentMode: { type: String, default: '' },
  hamali: { type: Number, default: 0 },
  stationaryCharge: { type: Number, default: 0 },
  miscellaneousCharge: { type: Number, default: 0 },
  totalFreight: { type: Number, default: 0 },
  totalPayable: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['Booked', 'In Transit', 'Delivered', 'Cancelled', 'Pending'],
    default: 'Booked'
  },
  vehicleNumber: {
    type: String,
    default: ''
  },
  outgoingStatus: {
    type: String,
    enum: ['Pending', 'Loaded', 'Dispatched', 'In Transit', 'Arrived at Branch', 'Out for Delivery', 'Delivered'],
    default: 'Pending'
  },
  challanCreated: {
    type: Boolean,
    default: false
  },
  statusHistory: [
    {
      status: { type: String },
      timestamp: { type: Date, default: Date.now }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

shipmentSchema.index({ createdAt: -1 });
shipmentSchema.index({ toBranch: 1 });
shipmentSchema.index({ status: 1 });
shipmentSchema.index({ status: 1, createdAt: -1 });
shipmentSchema.index({ challanCreated: 1, createdAt: -1 });

module.exports = mongoose.model('Shipment', shipmentSchema);
