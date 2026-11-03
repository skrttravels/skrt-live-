const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['Fuel', 'Maintenance', 'Toll', 'Driver Payment', 'Other'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  vehicle: {
    type: mongoose.Schema.ObjectId,
    ref: 'Vehicle'
  },
  description: String,
  status: {
    type: String,
    enum: ['pending', 'paid'],
    default: 'paid'
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }
});

expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1, date: -1 });
expenseSchema.index({ vehicle: 1, date: -1 });
expenseSchema.index({ status: 1, date: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
