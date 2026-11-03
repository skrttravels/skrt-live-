const mongoose = require("mongoose");

const challanRowSchema = new mongoose.Schema({
  grNo: { type: String, default: "" },
  pkg: { type: String, default: "" },
  dest: { type: String, default: "" },
  content: { type: String, default: "" },
  consignor: { type: String, default: "" },
  consignee: { type: String, default: "" },
  total: { type: String, default: "" },
  wt: { type: String, default: "" }
});

const challanSchema = new mongoose.Schema({
  date: { type: String, default: "" },
  challanNo: { type: String, default: "" },
  from: { type: String, default: "" },
  vehicleNo: { type: String, default: "" },
  ownerName: { type: String, default: "" },
  driverName: { type: String, default: "" },
  entries: [challanRowSchema],
  commission: { type: String, default: "" },
  labour: { type: String, default: "" },
  gr: { type: String, default: "" },
  crossing: { type: String, default: "" },
  truckFreight: { type: String, default: "" },
  advance: { type: String, default: "" },
  tfCredit: { type: String, default: "" },
  totalToPay: { type: String, default: "" },
  otherCharge: { type: String, default: "" },
  lcdc: { type: String, default: "" },
  crossing2: { type: String, default: "" },
  doorDelivery: { type: String, default: "" },
  balanceFreight: { type: String, default: "" },
  note: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.model("Challan", challanSchema);
