const EntryRegister = require("./model");

const normalizeGrNo = (v) => String(v || "").trim().toUpperCase();
const ENTRY_METADATA_CACHE_MS = 5000;
let entryMetadataCache = null;
let entryMetadataExpiresAt = 0;
let entryMetadataRequest = null;
let entryMetadataVersion = 0;

const invalidateEntryMetadata = () => {
  entryMetadataVersion++;
  entryMetadataCache = null;
  entryMetadataExpiresAt = 0;
  entryMetadataRequest = null;
};

const readEntryMetadata = async () => {
  if (entryMetadataCache && entryMetadataExpiresAt > Date.now()) {
    return entryMetadataCache;
  }
  if (entryMetadataRequest) return entryMetadataRequest;

  const version = entryMetadataVersion;
  entryMetadataRequest = EntryRegister.aggregate([
    {
      $facet: {
        page: [
          { $project: { value: { $convert: { input: '$pageNo', to: 'int', onError: 0, onNull: 0 } } } },
          { $group: { _id: null, max: { $max: '$value' } } }
        ],
        sno: [
          { $unwind: '$entries' },
          { $project: { value: { $convert: { input: '$entries.sno', to: 'int', onError: 0, onNull: 0 } } } },
          { $group: { _id: null, max: { $max: '$value' } } }
        ]
      }
    }
  ])
    .then(([result]) => {
      const maxPage = result?.page[0]?.max || 0;
      const maxSno = result?.sno[0]?.max || 0;
      const metadata = { maxPage, nextPageNo: String(maxPage + 1), maxSno };
      if (version === entryMetadataVersion) {
        entryMetadataCache = metadata;
        entryMetadataExpiresAt = Date.now() + ENTRY_METADATA_CACHE_MS;
      }
      return metadata;
    })
    .finally(() => {
      if (version === entryMetadataVersion) entryMetadataRequest = null;
    });

  return entryMetadataRequest;
};

const findDuplicateGrNos = async (grNos, excludeRegisterId) => {
  const set = new Set(grNos.map(normalizeGrNo).filter(Boolean));
  if (set.size === 0) return [];
  const matches = await EntryRegister.find({ "entries.grNo": { $in: [...set] } })
    .select('entries.grNo pageNo dateSearch')
    .lean();
  const dups = [];
  for (const reg of matches) {
    if (excludeRegisterId && String(reg._id) === String(excludeRegisterId)) continue;
    for (const e of reg.entries || []) {
      if (set.has(normalizeGrNo(e.grNo))) {
        dups.push({ grNo: e.grNo, pageNo: reg.pageNo, dateSearch: reg.dateSearch });
      }
    }
  }
  return dups;
};

const findInSheetDuplicates = (entries) => {
  const seen = new Set();
  const dups = [];
  for (const e of entries || []) {
    const n = normalizeGrNo(e.grNo);
    if (!n) continue;
    if (seen.has(n)) dups.push({ grNo: e.grNo, inSheet: true });
    else seen.add(n);
  }
  return dups;
};

const dupMessage = (dupes) => {
  const parts = dupes.map((d) =>
    d.inSheet
      ? `G.R. No "${d.grNo}" appears twice in this sheet`
      : `G.R. No "${d.grNo}" already exists (Page ${d.pageNo || "—"}${d.dateSearch ? `, Date ${d.dateSearch}` : ""})`
  );
  return [...new Set(parts)].join(". ");
};

/**
 * Get all Entry Registers
 */
exports.getAllEntries = async (req, res) => {
  try {
    const records = await EntryRegister.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, count: records.length, data: records });
  } catch (error) {
    res.status(500).json({ success: false, error: "Server Error", message: error.message });
  }
};

/**
 * Get flattened inventory rows with server-side search and pagination.
 */
exports.getInventoryEntries = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));
    const search = String(req.query.q || '').trim();
    const match = {};

    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      match.$or = [
        { 'entries.sno': regex },
        { 'entries.grNo': regex },
        { 'entries.deliveryReceiptNo': regex },
        { 'entries.consignor': regex },
        { 'entries.consignee': regex },
        { 'entries.from': regex },
        { 'entries.to': regex },
        { dateSearch: regex }
      ];
    }

    const basePipeline = [
      { $unwind: '$entries' },
      ...(search ? [{ $match: match }] : []),
      {
        $project: {
          _id: '$entries._id',
          sno: '$entries.sno',
          from: '$entries.from',
          to: '$entries.to',
          grNo: '$entries.grNo',
          consignor: '$entries.consignor',
          consignee: '$entries.consignee',
          noOfPackages: '$entries.noOfPackages',
          contents: '$entries.contents',
          freight: '$entries.freight',
          deliveryReceiptNo: '$entries.deliveryReceiptNo',
          dateOfDelivery: '$entries.dateOfDelivery',
          deliveryStatus: { $ifNull: ['$entries.deliveryStatus', { $cond: [{ $ne: ['$entries.dateOfDelivery', ''] }, 'Complete', 'Pending'] }] },
          _registerId: '$_id',
          _registerDate: { $ifNull: ['$dateSearch', '—'] },
          _registerPage: { $ifNull: ['$pageNo', '—'] },
          _registerChallan: { $ifNull: ['$challanNo', ''] },
          _registerVehicleNo: { $ifNull: ['$vehicleNo', ''] },
          _sortSno: { $convert: { input: '$entries.sno', to: 'int', onError: 0, onNull: 0 } }
        }
      }
    ];

    if (req.query.all === 'true') {
      const data = await EntryRegister.aggregate([
        ...basePipeline,
        { $sort: { _registerDate: -1, _sortSno: -1 } },
        { $project: { _sortSno: 0 } }
      ]).allowDiskUse(true);
      return res.json({ success: true, count: data.length, data, page: 1, totalPages: 1 });
    }

    const [result] = await EntryRegister.aggregate([
      ...basePipeline,
      {
        $facet: {
          data: [
            { $sort: { _registerDate: -1, _sortSno: -1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
            { $project: { _sortSno: 0 } }
          ],
          count: [{ $count: 'total' }]
        }
      }
    ]).allowDiskUse(true);
    const data = result?.data || [];
    const total = result?.count[0]?.total || 0;
    res.json({ success: true, count: total, data, page, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server Error', message: error.message });
  }
};

exports.getEntryMetadata = async (req, res) => {
  try {
    const metadata = await readEntryMetadata();
    res.json({ success: true, data: metadata });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Entry Register by Date search
 */
exports.getEntryByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const record = await EntryRegister.findOne({ dateSearch: date });
    if (!record) {
      return res.status(404).json({ success: false, message: "No register found for this date", data: null });
    }
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, error: "Server Error", message: error.message });
  }
};

/**
 * Create a new Entry Register
 */
exports.createEntry = async (req, res) => {
  try {
    const entries = req.body.entries || [];
    const dupes = [
      ...(await findDuplicateGrNos(entries.map((e) => e.grNo))),
      ...findInSheetDuplicates(entries)
    ];
    if (dupes.length > 0) {
      return res.status(400).json({ success: false, message: dupMessage(dupes) });
    }
    const newRecord = await EntryRegister.create(req.body);
    invalidateEntryMetadata();
    res.status(201).json({ success: true, data: newRecord });
  } catch (error) {
    res.status(400).json({ success: false, error: "Bad Request", message: error.message });
  }
};

/**
 * Update an existing Entry Register
 */
exports.getEntryById = async (req, res) => {
  try {
    const record = await EntryRegister.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, error: "Server Error", message: error.message });
  }
};

/**
 * Get Entry by G.R. No.
 */
exports.getEntryByGrNo = async (req, res) => {
  try {
    const { grNo } = req.params;
    const record = await EntryRegister.findOne({ 'entries.grNo': grNo })
      .select({ 'entries.$': 1, pageNo: 1, dateSearch: 1 })
      .lean();
    if (!record) {
      return res.status(404).json({ success: false, message: "No entry found for this G.R. No." });
    }
    const entry = record.entries[0];
    res.json({ success: true, data: { ...entry, registerId: record._id, registerDate: record.dateSearch, registerPage: record.pageNo } });
  } catch (error) {
    res.status(500).json({ success: false, error: "Server Error", message: error.message });
  }
};

/**
 * Get Entry by S.No.
 */
exports.getEntryBySno = async (req, res) => {
  try {
    const { sno } = req.params;
    const record = await EntryRegister.findOne({ 'entries.sno': sno }).sort({ createdAt: -1 });
    if (!record) {
      return res.status(404).json({ success: false, message: "No entry found for this S.No." });
    }
    const entry = record.entries.find(e => e.sno === sno);
    res.json({ success: true, data: { ...entry.toObject(), registerId: record._id, registerDate: record.dateSearch, registerPage: record.pageNo } });
  } catch (error) {
    res.status(500).json({ success: false, error: "Server Error", message: error.message });
  }
};

exports.updateEntry = async (req, res) => {
  try {
    console.log('Update Request ID:', req.params.id);
    const { id } = req.params;
    const entries = req.body.entries || [];
    const dupes = await findDuplicateGrNos(entries.map((e) => e.grNo), id);
    if (dupes.length > 0) {
      return res.status(400).json({ success: false, message: dupMessage(dupes) });
    }
    const updatedRecord = await EntryRegister.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedRecord) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    invalidateEntryMetadata();
    res.json({ success: true, data: updatedRecord });
  } catch (error) {
    res.status(400).json({ success: false, error: "Bad Request", message: error.message });
  }
};

/**
 * Bulk upload entries from Excel
 */
exports.bulkUploadEntries = async (req, res) => {
  try {
    const { dateSearch, entries, pageNo, challanNo, vehicleNo, driverName } = req.body;
    if (!dateSearch || !entries || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ success: false, message: "dateSearch and entries array are required" });
    }

    // Assign sequential S.No starting from the next available
    let existing = await EntryRegister.findOne({ dateSearch });

    const dupes = [
      ...(await findDuplicateGrNos(entries.map((e) => e.grNo))),
      ...findInSheetDuplicates(entries)
    ];
    if (dupes.length > 0) {
      return res.status(400).json({ success: false, message: dupMessage(dupes) });
    }

    let nextSno = 1;
    if (existing) {
      const maxSno = (existing.entries || []).reduce((max, e) => {
        const num = parseInt(e.sno, 10);
        return isNaN(num) ? max : Math.max(max, num);
      }, 0);
      nextSno = maxSno + 1;
    }

    const mapped = entries.map((e, i) => ({
      sno: String(nextSno + i),
      from: e.from || "",
      to: e.to || "",
      grNo: e.grNo || "",
      consignor: e.consignor || "",
      consignee: e.consignee || "",
      noOfPackages: e.noOfPackages || "",
      contents: e.contents || "",
      freight: e.freight || "",
      deliveryReceiptNo: e.deliveryReceiptNo || "",
      dateOfDelivery: e.dateOfDelivery || "",
      deliveryStatus: e.dateOfDelivery ? "Complete" : "Pending"
    }));

    const registerFields = {};
    if (pageNo) registerFields.pageNo = pageNo;
    if (challanNo) registerFields.challanNo = challanNo;
    if (vehicleNo) registerFields.vehicleNo = vehicleNo;
    if (driverName) registerFields.driverName = driverName;

    if (existing) {
      if (Object.keys(registerFields).length > 0) {
        Object.assign(existing, registerFields);
      }
      existing.entries.push(...mapped);
      await existing.save();
      invalidateEntryMetadata();
      return res.json({ success: true, data: existing, count: mapped.length });
    }

    const newRegister = await EntryRegister.create({ dateSearch, ...registerFields, entries: mapped });
    invalidateEntryMetadata();
    res.status(201).json({ success: true, data: newRegister, count: mapped.length });
  } catch (error) {
    res.status(500).json({ success: false, error: "Server Error", message: error.message });
  }
};

/**
 * Update a single entry within a register
 */
exports.updateSingleEntry = async (req, res) => {
  try {
    const { id, entryId } = req.params;
    const updateData = req.body;

    // Recalculate deliveryStatus based on dateOfDelivery
    if (updateData.dateOfDelivery) {
      updateData.deliveryStatus = "Complete";
    } else {
      updateData.deliveryStatus = "Pending";
    }

    const dupes = await findDuplicateGrNos([updateData.grNo], id);
    if (dupes.length > 0) {
      return res.status(400).json({ success: false, message: dupMessage(dupes) });
    }

    const record = await EntryRegister.findOneAndUpdate(
      { _id: id, 'entries._id': entryId },
      { $set: { 'entries.$': { ...updateData, _id: entryId } } },
      { new: true }
    );

    if (!record) {
      return res.status(404).json({ success: false, message: "Register or entry not found" });
    }

    invalidateEntryMetadata();
    const updatedEntry = record.entries.id(entryId);
    res.json({ success: true, data: updatedEntry });
  } catch (error) {
    res.status(400).json({ success: false, error: "Bad Request", message: error.message });
  }
};

/**
 * Delete an Entry Register
 */
exports.deleteEntry = async (req, res) => {
  try {
    const deletedRecord = await EntryRegister.findByIdAndDelete(req.params.id);
    if (!deletedRecord) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }
    invalidateEntryMetadata();
    res.json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, error: "Server Error", message: error.message });
  }
};

/**
 * Delete a single entry within a register
 */
exports.deleteSingleEntry = async (req, res) => {
  try {
    const { id, entryId } = req.params;
    const record = await EntryRegister.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Register not found" });
    }
    const entry = record.entries.id(entryId);
    if (!entry) {
      return res.status(404).json({ success: false, message: "Entry not found" });
    }
    entry.deleteOne();
    await record.save();
    invalidateEntryMetadata();
    res.json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, error: "Server Error", message: error.message });
  }
};
