const mongoose = require('mongoose');

const trackingSchema = new mongoose.Schema({
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true,
    unique: true
  },
  currentLocation: {
    lat: Number,
    lng: Number,
    address: String
  },
  lastUpdate: {
    type: Date,
    default: Date.now
  },
  history: [
    {
      lat: Number,
      lng: Number,
      timestamp: { type: Date, default: Date.now }
    }
  ]
});

module.exports = mongoose.model('Tracking', trackingSchema);
