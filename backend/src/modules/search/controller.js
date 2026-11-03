const Shipment = require('../shipments/model');
const Invoice = require('../invoices/model');
const Vehicle = require('../vehicles/model');
const Client = require('../clients/model');
const Inventory = require('../inventory/model');
const Tracking = require('../tracking/model');
const EntryRegister = require('../entry/model');
const Challan = require('../challan/model');
const CashMemo = require('../cash-memo/model');
const SummaryRegister = require('../summary/model');
const DeliveryStatement = require('../delivery-statement/model');
const sendResponse = require('../../utils/response');

exports.globalSearch = async (req, res) => {
  try {
    const query = req.query.q;
    if (!query || query.trim() === '') {
      return sendResponse(res, 200, true, 'Empty query', {
        shipments: [],
        inventory: [],
        challans: [],
        cashMemos: [],
        summaries: [],
        deliveryStatements: [],
        invoices: [],
        vehicles: [],
        clients: [],
        tracking: []
      });
    }

    const regex = new RegExp(query, 'i');

    const [
      shipments,
      invoices,
      vehicles,
      clients,
      inventory,
      tracking,
      entryRegisters,
      challans,
      cashMemos,
      summaries,
      deliveryStatements
    ] = await Promise.all([
      // 1. Shipments: consignmentNumber, vehicleNumber, consignor.name, consignee.name
      Shipment.find({
        $or: [
          { consignmentNumber: regex },
          { vehicleNumber: regex },
          { 'consignor.name': regex },
          { 'consignee.name': regex }
        ]
      }).limit(10).lean(),

      // Other entities (keep for completeness)
      Invoice.find({
        $or: [
          { invoiceNo: regex },
          { 'client.name': regex }
        ]
      }).limit(5).select('invoiceNo client amount status createdAt').lean(),

      Vehicle.find({
        $or: [
          { vehicleNo: regex },
          { model: regex }
        ]
      }).limit(5).select('vehicleNo type status model capacity').lean(),

      Client.find({
        $or: [
          { name: regex },
          { gstin: regex },
          { phone: regex }
        ]
      }).limit(5).select('name gstin phone email status').lean(),

      // Regular Inventory
      Inventory.find({
        $or: [
          { inventoryId: regex },
          { lrNo: regex },
          { cargoName: regex },
          { senderName: regex },
          { receiverName: regex }
        ]
      }).limit(10).select('inventoryId lrNo cargoName senderName receiverName paymentMode').lean(),

      Tracking.find({
        'currentLocation.address': regex
      }).limit(5).populate('vehicle', 'vehicleNo').select('currentLocation vehicle lastUpdate').lean(),

      // Entry Registers (Delivery Register / Inventory in frontend)
      // Search by entries.sno, entries.grNo, entries.deliveryReceiptNo
      EntryRegister.find({
        $or: [
          { 'entries.sno': regex },
          { 'entries.grNo': regex },
          { 'entries.deliveryReceiptNo': regex }
        ]
      }).limit(20).lean(),

      // Challan Records: challanNo, entries.grNo, driverName
      Challan.find({
        $or: [
          { challanNo: regex },
          { 'entries.grNo': regex },
          { driverName: regex }
        ]
      }).limit(10).lean(),

      // Cash Memo Records: drNo, grNo
      CashMemo.find({
        $or: [
          { drNo: regex },
          { grNo: regex }
        ]
      }).limit(10).lean(),

      // Summary Records: entries.sno, entries.challanNo, entries.driverName
      SummaryRegister.find({
        $or: [
          { 'entries.sno': regex },
          { 'entries.challanNo': regex },
          { 'entries.driverName': regex }
        ]
      }).limit(10).lean(),

      // Delivery Statement Records: pageNo, entries.sno, entries.drNo
      DeliveryStatement.find({
        $or: [
          { pageNo: regex },
          { 'entries.sno': regex },
          { 'entries.drNo': regex }
        ]
      }).limit(10).lean()
    ]);

    // Map Inventory (EntryRegister) matches
    const entryInventoryResults = [];
    for (const reg of entryRegisters) {
      if (entryInventoryResults.length >= 10) break;
      for (const entry of (reg.entries || [])) {
        if (entryInventoryResults.length >= 10) break;

        const matchesSno = regex.test(entry.sno);
        const matchesGrNo = regex.test(entry.grNo);
        const matchesDrNo = regex.test(entry.deliveryReceiptNo);

        if (matchesSno || matchesGrNo || matchesDrNo) {
          let title = "";
          let searchVal = "";
          if (matchesGrNo) {
            title = `G.R. No. ${entry.grNo}`;
            searchVal = entry.grNo;
          } else if (matchesDrNo) {
            title = `Delivery Receipt No. ${entry.deliveryReceiptNo}`;
            searchVal = entry.deliveryReceiptNo;
          } else {
            title = `S.No. ${entry.sno}`;
            searchVal = entry.sno;
          }

          entryInventoryResults.push({
            _id: entry._id || Math.random().toString(),
            title: title,
            searchVal: searchVal,
            subtitle: `From: ${entry.from || '—'} · To: ${entry.to || '—'}`
          });
        }
      }
    }

    // Map regular inventory to the same title/subtitle format
    const mappedRegularInventory = inventory.map(i => ({
      _id: i._id,
      title: i.lrNo ? `G.R. No. ${i.lrNo}` : `Inventory ID ${i.inventoryId}`,
      searchVal: i.lrNo || i.inventoryId,
      subtitle: `${i.senderName || '—'} → ${i.receiverName || '—'}`
    }));

    // Merge and limit to 10
    const mergedInventory = [...mappedRegularInventory, ...entryInventoryResults].slice(0, 10);

    // Map Shipments
    const mappedShipments = shipments.map(s => {
      let subtitle = `Vehicle: ${s.vehicleNumber || '—'}`;
      if (s.consignor?.name && s.consignee?.name) {
        subtitle += ` · ${s.consignor.name} → ${s.consignee.name}`;
      }
      return {
        _id: s._id,
        title: `Consignment ${s.consignmentNumber}`,
        subtitle: subtitle,
        searchVal: s.consignmentNumber
      };
    });

    // Map Challans
    const challansResults = [];
    for (const c of challans) {
      challansResults.push({
        _id: c._id,
        title: `Challan No. ${c.challanNo}`,
        subtitle: `Driver: ${c.driverName || '—'} · Date: ${c.date || '—'}`,
        searchVal: c.challanNo
      });
    }

    // Map Cash Memos
    const cashMemoResults = [];
    for (const cm of cashMemos) {
      cashMemoResults.push({
        _id: cm._id,
        title: `D.R. No. ${cm.drNo}`,
        subtitle: `G.R. No: ${cm.grNo || '—'} · Date: ${cm.date ? new Date(cm.date).toLocaleDateString() : '—'}`,
        searchVal: cm.drNo
      });
    }

    // Map Summaries
    const summaryResults = [];
    for (const s of summaries) {
      if (summaryResults.length >= 10) break;
      const match = s.entries.find(e => regex.test(e.sno) || regex.test(e.challanNo) || regex.test(e.driverName));
      const sno = match ? match.sno : (s.entries[0]?.sno || '—');
      const driver = match ? match.driverName : (s.entries[0]?.driverName || '—');
      summaryResults.push({
        _id: s._id,
        title: `No. ${sno}`,
        subtitle: `Driver: ${driver} · Date: ${s.date || '—'}`,
        searchVal: sno
      });
    }

    // Map Delivery Statements
    const deliveryStatementResults = [];
    for (const ds of deliveryStatements) {
      if (deliveryStatementResults.length >= 10) break;
      const match = ds.entries.find(e => regex.test(e.sno) || regex.test(e.drNo));
      const drNo = match ? match.drNo : (ds.entries[0]?.drNo || '—');
      deliveryStatementResults.push({
        _id: ds._id,
        title: `Page No. ${ds.pageNo}`,
        subtitle: `D.R. No. ${drNo} · Date: ${ds.dateSearch || '—'}`,
        searchVal: ds.pageNo
      });
    }

    return sendResponse(res, 200, true, 'Search results fetched', {
      shipments: mappedShipments,
      inventory: mergedInventory,
      challans: challansResults,
      cashMemos: cashMemoResults,
      summaries: summaryResults,
      deliveryStatements: deliveryStatementResults,
      invoices,
      vehicles,
      clients,
      tracking
    });
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};
