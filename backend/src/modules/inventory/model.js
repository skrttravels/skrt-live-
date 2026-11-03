const mongoose = require('mongoose');

const challanSchema = new mongoose.Schema({
  challanNo: { type: String, required: true },
  vehicleNumber: { type: String, required: true },
  driverName: { type: String, required: true },
  driverPhone: { type: String, required: true },
  fromLocation: { type: String, required: true },
  toLocation: { type: String, required: true },
  dispatchDate: { type: Date, required: true },
  packages: { type: Number, required: true },
  weight: { type: Number, required: true },
  remarks: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const inventorySchema = new mongoose.Schema({
  inventoryId: { type: String, required: true, unique: true },
  lrNo: { type: String, required: true },
  cargoName: { type: String, required: true },
  senderName: { type: String, required: true },
  senderPhone: { type: String, required: true },
  receiverName: { type: String, required: true },
  receiverPhone: { type: String, required: true },
  origin: { type: String, required: true },
  destination: { type: String, required: true },
  packages: { type: Number, required: true, default: 1 },
  weight: { type: Number, required: true },
  rate: { type: Number, required: true },
  totalFreight: { type: Number, required: true },
  paymentMode: {
    type: String,
    enum: ['To Pay', 'Paid', 'Credit'],
    default: 'To Pay'
  },
  warehouseLocation: { type: String, default: 'Main Warehouse' },
  incomingStatus: {
    type: String,
    enum: ['N/A', 'Pending', 'Received', 'Arrived at Warehouse', 'Checked In'],
    default: 'Pending'
  },
  challanStatus: {
    type: String,
    enum: ['Not Created', 'Created'],
    default: 'Not Created'
  },
  challanData: {
    type: challanSchema,
    default: null
  },
  remarks: { type: String },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update updatedAt on pre-save
inventorySchema.pre('save', function() {
  this.updatedAt = Date.now();
});

inventorySchema.index({ createdAt: -1 });
inventorySchema.index({ incomingStatus: 1 });

module.exports = mongoose.model('Inventory', inventorySchema);
