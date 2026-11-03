const CashMemo = require('./model');
const EntryRegister = require('../entry/model');
const DSRegister = require('../delivery-statement/model');
const sendResponse = require('../../utils/response');

const getLocalDateString = (dateObj) => {
  const d = new Date(dateObj);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findMemoByGrNo = (grNo, excludeId) => {
  const trimmed = String(grNo || '').trim();
  if (!trimmed) return null;
  const filter = {
    grNo: { $regex: new RegExp('^' + escapeRegExp(trimmed) + '$', 'i') }
  };
  if (excludeId) filter._id = { $ne: excludeId };
  return CashMemo.findOne(filter);
};

const syncDeliveryStatementForDate = async (dateStr) => {
  try {
    const start = new Date(`${dateStr}T00:00:00.000Z`);
    const end = new Date(`${dateStr}T23:59:59.999Z`);

    const cashMemos = await CashMemo.find({
      date: { $gte: start, $lte: end }
    }).sort({ createdAt: 1 });

    let dsRegister = await DSRegister.findOne({ dateSearch: dateStr });

    if (cashMemos.length === 0) {
      if (dsRegister) {
        await DSRegister.findByIdAndDelete(dsRegister._id);
      }
      return;
    }

    const existingEntries = dsRegister ? dsRegister.entries || [] : [];
    const existingSnoMap = new Map();
    for (const e of existingEntries) {
      if (e.drNo && e.sno) {
        existingSnoMap.set(e.drNo, e.sno);
      }
    }

    let maxSno = 0;
    const allDs = await DSRegister.find();
    for (const r of allDs) {
      for (const entry of (r.entries || [])) {
        const num = parseInt(entry.sno, 10);
        if (!isNaN(num) && num > maxSno) maxSno = num;
      }
    }

    const entries = cashMemos.map((cm, idx) => {
      const freightVal = (cm.freight || 0) + (cm.freightPaise || 0) / 100;
      const labourVal = (cm.labour || 0) + (cm.labourPaise || 0) / 100;
      const stationeryVal = (cm.stationery || 0) + (cm.stationeryPaise || 0) / 100;
      const commissionVal = (cm.commission || 0) + (cm.commissionPaise || 0) / 100;
      const aocVal = (cm.aoc || 0) + (cm.aocPaise || 0) / 100;

      const existingSno = existingSnoMap.get(cm.drNo);
      let sno;
      if (existingSno) {
        sno = existingSno;
      } else {
        maxSno++;
        sno = String(maxSno);
      }

      return {
        sno,
        drNo: cm.drNo,
        receiptNo: "",
        freight: String(freightVal.toFixed(2)),
        labour: String(labourVal.toFixed(2)),
        receiptCh: String(stationeryVal.toFixed(2)),
        dCom: String(commissionVal.toFixed(2)),
        demurage: String(aocVal.toFixed(2))
      };
    });

    const totals = entries.reduce(
      (acc, e) => {
        const fr = parseFloat(e.freight) || 0;
        const lb = parseFloat(e.labour) || 0;
        const rc = parseFloat(e.receiptCh) || 0;
        const dc = parseFloat(e.dCom) || 0;
        const dm = parseFloat(e.demurage) || 0;
        const rowTot = fr + lb + rc + dc + dm;
        return {
          freight: acc.freight + fr,
          labour: acc.labour + lb,
          receiptCh: acc.receiptCh + rc,
          dCom: acc.dCom + dc,
          demurage: acc.demurage + dm,
          total: acc.total + rowTot
        };
      },
      { freight: 0, labour: 0, receiptCh: 0, dCom: 0, demurage: 0, total: 0 }
    );

    if (dsRegister) {
      dsRegister.entries = entries;
      dsRegister.totals = totals;
      await dsRegister.save();
    } else {
      const allDs = await DSRegister.find();
      let maxPage = 0;
      for (const r of allDs) {
        const pNum = parseInt(r.pageNo, 10);
        if (!isNaN(pNum) && pNum > maxPage) maxPage = pNum;
      }
      const newPageNo = String(maxPage + 1);

      await DSRegister.create({
        pageNo: newPageNo,
        dateSearch: dateStr,
        entries,
        totals
      });
    }
  } catch (error) {
    console.error("Error in syncDeliveryStatementForDate:", error);
  }
};

// @desc    Create new cash memo
// @route   POST /api/cash-memo
// @access  Private
exports.createCashMemo = async (req, res) => {
  try {
    const dup = await findMemoByGrNo(req.body.grNo);
    if (dup) {
      return sendResponse(res, 400, false, `Cash memo already exists for this G.R. No (D.R. No ${dup.drNo || '—'}). No new cash memo can be created for the same G.R. No.`);
    }

    const memo = await CashMemo.create({
      ...req.body,
      date: req.body.date ? new Date(req.body.date) : Date.now(),
      updatedAt: Date.now()
    });

    // Sync delivery statement
    const dateStr = getLocalDateString(memo.date);
    await syncDeliveryStatementForDate(dateStr);

    // If grNo is provided, mark the matching entry as Complete
    if (req.body.grNo) {
      const grNo = req.body.grNo.trim();
      const registers = await EntryRegister.find({ 'entries.grNo': grNo });
      for (const reg of registers) {
        let modified = false;
        for (const entry of reg.entries) {
          if (entry.grNo === grNo && entry.deliveryStatus !== 'Complete') {
            entry.deliveryStatus = 'Complete';
            modified = true;
          }
        }
        if (modified) await reg.save();
      }
    }

    return sendResponse(res, 201, true, 'Cash memo created successfully', memo);
  } catch (error) {
    return sendResponse(res, 400, false, error.message);
  }
};

// @desc    Get all cash memos
// @route   GET /api/cash-memo
// @access  Private
exports.getCashMemos = async (req, res) => {
  try {
    const memos = await CashMemo.find().sort({ createdAt: -1 }).lean();
    return sendResponse(res, 200, true, 'Cash memos fetched successfully', memos);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

exports.getNextDrNo = async (req, res) => {
  try {
    // Keep max-number semantics while doing the scan and numeric conversion in
    // MongoDB instead of transferring every memo document to the API process.
    const [result] = await CashMemo.aggregate([
      {
        $project: {
          numericDrNo: {
            $convert: {
              input: {
                $reduce: {
                  input: { $regexFindAll: { input: { $ifNull: ['$drNo', ''] }, regex: '[0-9]+' } },
                  initialValue: '',
                  in: { $concat: ['$$value', '$$this.match'] }
                }
              },
              to: 'int',
              onError: 0,
              onNull: 0
            }
          }
        }
      },
      { $group: { _id: null, maxNum: { $max: '$numericDrNo' } } }
    ]);
    const maxNum = result?.maxNum || 0;
    return sendResponse(res, 200, true, 'Next D.R. number fetched', {
      nextDrNo: `DR-${String(maxNum + 1).padStart(3, '0')}`
    });
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

// @desc    Get single cash memo
// @route   GET /api/cash-memo/:id
// @access  Private
exports.getCashMemoById = async (req, res) => {
  try {
    const memo = await CashMemo.findById(req.params.id);
    if (!memo) return sendResponse(res, 404, false, 'Cash memo not found');
    return sendResponse(res, 200, true, 'Cash memo fetched', memo);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

// @desc    Update cash memo
// @route   PUT /api/cash-memo/:id
// @access  Private
exports.updateCashMemo = async (req, res) => {
  try {
    const oldMemo = await CashMemo.findById(req.params.id);
    if (!oldMemo) return sendResponse(res, 404, false, 'Cash memo not found');

    const newGrNo = String(req.body.grNo || '').trim();
    const oldGrNo = String(oldMemo.grNo || '').trim();
    if (newGrNo && newGrNo.toUpperCase() !== oldGrNo.toUpperCase()) {
      const dup = await findMemoByGrNo(newGrNo, req.params.id);
      if (dup) {
        return sendResponse(res, 400, false, `Cash memo already exists for this G.R. No (D.R. No ${dup.drNo || '—'}).`);
      }
    }

    const memo = await CashMemo.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    // Sync old and new dates
    const oldDateStr = getLocalDateString(oldMemo.date);
    const newDateStr = getLocalDateString(memo.date);
    
    await syncDeliveryStatementForDate(oldDateStr);
    if (oldDateStr !== newDateStr) {
      await syncDeliveryStatementForDate(newDateStr);
    }

    return sendResponse(res, 200, true, 'Cash memo updated successfully', memo);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

// @desc    Get cash memo by GR No.
// @route   GET /api/cash-memo/grno/:grNo
// @access  Private
exports.getCashMemoByGrNo = async (req, res) => {
  try {
    const memo = await CashMemo.findOne({ grNo: req.params.grNo }).sort({ createdAt: -1 });
    if (!memo) return sendResponse(res, 404, false, 'Cash memo not found for this GR No.');
    return sendResponse(res, 200, true, 'Cash memo fetched', memo);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

// @desc    Get cash memo by DR No.
// @route   GET /api/cash-memo/drno/:drNo
// @access  Private
exports.getCashMemoByDrNo = async (req, res) => {
  try {
    const memo = await CashMemo.findOne({ drNo: req.params.drNo }).sort({ createdAt: -1 });
    if (!memo) return sendResponse(res, 404, false, 'Cash memo not found for this DR No.');
    return sendResponse(res, 200, true, 'Cash memo fetched', memo);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

// @desc    Delete cash memo
// @route   DELETE /api/cash-memo/:id
// @access  Private
exports.deleteCashMemo = async (req, res) => {
  try {
    const memo = await CashMemo.findById(req.params.id);
    if (!memo) return sendResponse(res, 404, false, 'Cash memo not found');

    const dateStr = getLocalDateString(memo.date);
    await CashMemo.findByIdAndDelete(req.params.id);

    // Sync after delete
    await syncDeliveryStatementForDate(dateStr);

    return sendResponse(res, 200, true, 'Cash memo deleted successfully', null);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};
