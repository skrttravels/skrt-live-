const mongoose = require('mongoose');

const companySettingsSchema = new mongoose.Schema({
  companyName: {
    type: String,
    default: 'SKRT CORP'
  },
  gstin: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    default: ''
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

companySettingsSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('CompanySettings', companySettingsSchema);
