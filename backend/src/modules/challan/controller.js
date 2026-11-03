const Challan = require("./model");
const Shipment = require("../shipments/model");

async function markShipmentsFromEntries(entries) {
  const grNos = entries
    .map(e => e.grNo)
    .filter(Boolean)
    .map(g => g.trim());
  if (grNos.length === 0) return;
  await Shipment.updateMany(
    { consignmentNumber: { $in: grNos } },
    { challanCreated: true }
  );
}

exports.getAll = async (req, res) => {
  try {
    const records = await Challan.find().sort({ createdAt: -1 });
    res.json({ success: true, count: records.length, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getByDate = async (req, res) => {
  try {
    const record = await Challan.findOne({ date: req.params.date });
    if (!record) return res.status(404).json({ success: false, message: "No record found for this date" });
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const record = await Challan.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: "Record not found" });
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const newRecord = await Challan.create(req.body);
    markShipmentsFromEntries(newRecord.entries || []);
    res.status(201).json({ success: true, data: newRecord });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const updated = await Challan.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ success: false, message: "Record not found" });
    markShipmentsFromEntries(updated.entries || []);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const deleted = await Challan.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Record not found" });
    res.json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
