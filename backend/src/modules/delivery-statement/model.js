const mongoose = require("mongoose");

const dsRowSchema = new mongoose.Schema({
  sno: { type: String, default: "" },
  drNo: { type: String, default: "" },
  receiptNo: { type: String, default: "" },
  freight: { type: String, default: "" },
  labour: { type: String, default: "" },
  receiptCh: { type: String, default: "" },
  dCom: { type: String, default: "" },
  demurage: { type: String, default: "" }
});

const dsRegisterSchema = new mongoose.Schema({
  pageNo: { type: String, default: "" },
  dateSearch: { type: String, default: "" },
  entries: [dsRowSchema],
  totals: {
    freight: { type: Number, default: 0 },
    labour: { type: Number, default: 0 },
    receiptCh: { type: Number, default: 0 },
    dCom: { type: Number, default: 0 },
    demurage: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  }
}, { timestamps: true });

dsRegisterSchema.index({ createdAt: -1 });
dsRegisterSchema.index({ dateSearch: 1 });

module.exports = mongoose.model("DeliveryStatement", dsRegisterSchema);
