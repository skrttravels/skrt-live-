const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  vehicleNo: {
    type: String,
    required: [true, 'Please add a vehicle number'],
    unique: true,
    uppercase: true
  },
  model: String,
  type: {
    type: String,
    enum: ['Truck', 'Trailer', 'Container', 'Van'],
    default: 'Truck'
  },
  capacity: {
    type: Number,
    required: [true, 'Please add capacity in kg']
  },
  owner: {
    name: String,
    phone: String
  },
  status: {
    type: String,
    enum: ['available', 'on-trip', 'maintenance', 'inactive'],
    default: 'available'
  },
  lastServiceDate: Date,
  insuranceExpiry: Date,
  currentLocation: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

vehicleSchema.index({ currentLocation: '2dsphere' });
vehicleSchema.index({ status: 1 });

module.exports = mongoose.model('Vehicle', vehicleSchema);
