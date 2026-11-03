const mongoose = require("mongoose");

const summaryRowSchema = new mongoose.Schema({
  sno: { type: String, default: "" },
  truckNo: { type: String, default: "" },
  driverName: { type: String, default: "" },
  from: { type: String, default: "" },
  to: { type: String, default: "" },
  transportName: { type: String, default: "" },
  challanNo: { type: String, default: "" },
  totalCount: { type: String, default: "" },
  fareDelivery: { type: String, default: "" },
  crossing: { type: String, default: "" },
  crossingFare: { type: String, default: "" },
  labor: { type: String, default: "" },
  deliveryCommission: { type: String, default: "" },
  credit: { type: Number, default: 0 },
  debit: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  note: { type: String, default: "" },
  note2: { type: String, default: "" }
});

const summaryRegisterSchema = new mongoose.Schema({
  date: { type: String, default: "" },
  entries: [summaryRowSchema]
}, { timestamps: true });

summaryRegisterSchema.index({ date: 1 });
summaryRegisterSchema.index({ createdAt: -1 });

module.exports = mongoose.model("SummaryRegister", summaryRegisterSchema);
