const mongoose = require("mongoose");

const entryRowSchema = new mongoose.Schema({
  sno: { type: String, default: "" },
  from: { type: String, default: "" },
  to: { type: String, default: "" },
  grNo: { type: String, default: "" },
  consignor: { type: String, default: "" },
  consignee: { type: String, default: "" },
  noOfPackages: { type: String, default: "" },
  contents: { type: String, default: "" },
  freight: { type: String, default: "" },
  deliveryReceiptNo: { type: String, default: "" },
  dateOfDelivery: { type: String, default: "" },
  deliveryStatus: { type: String, default: "Pending", enum: ["Pending", "Complete"] }
});

const entryRegisterSchema = new mongoose.Schema({
  pageNo: {
    type: String,
    default: ""
  },
  dateSearch: {
    type: String,
    default: ""
  },
  challanNo: {
    type: String,
    default: ""
  },
  fromData: {
    type: String,
    default: ""
  },
  toData: {
    type: String,
    default: ""
  },
  vehicleNo: {
    type: String,
    default: ""
  },
  driverName: {
    type: String,
    default: ""
  },
  entries: [entryRowSchema]
}, {
  timestamps: true
});

entryRegisterSchema.index({ createdAt: -1 });
entryRegisterSchema.index({ dateSearch: 1 });
entryRegisterSchema.index({ 'entries.grNo': 1 });
entryRegisterSchema.index({ 'entries.sno': 1 });
entryRegisterSchema.index({ 'entries.deliveryReceiptNo': 1 });

module.exports = mongoose.model("EntryRegister", entryRegisterSchema);
