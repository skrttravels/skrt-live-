const mongoose = require('mongoose');

const cashMemoSchema = new mongoose.Schema({
  drNo: { type: String, required: true, trim: true },
  grNo: { type: String, default: '', trim: true },
  date: { type: Date, required: true },
  receivedOn: { type: String, default: '', trim: true },
  from: { type: String, default: '', trim: true },
  consignee: { type: String, default: '', trim: true },
  through: { type: String, default: '', trim: true },
  freight: { type: Number, default: 0 },
  freightPaise: { type: Number, default: 0 },
  labour: { type: Number, default: 0 },
  labourPaise: { type: Number, default: 0 },
  stationery: { type: Number, default: 0 },
  stationeryPaise: { type: Number, default: 0 },
  commission: { type: Number, default: 0 },
  commissionPaise: { type: Number, default: 0 },
  aoc: { type: Number, default: 0 },
  aocPaise: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

cashMemoSchema.index({ createdAt: -1 });
cashMemoSchema.index({ grNo: 1, createdAt: -1 });
cashMemoSchema.index({ drNo: 1 });

module.exports = mongoose.model('CashMemo', cashMemoSchema);
