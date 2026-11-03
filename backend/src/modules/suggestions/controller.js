const Shipment = require('../shipments/model');
const Inventory = require('../inventory/model');
const Vehicle = require('../vehicles/model');
const Contact = require('../contacts/model');
const Client = require('../clients/model');
const Expense = require('../expenses/model');
const EntryRegister = require('../entry/model');
const Driver = require('../drivers/driverModel');
const sendResponse = require('../../utils/response');

const LIMIT = 8;

const distinctSuggestions = async (queries, q) => {
  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const values = new Set();

  for (const { model, field, filter } of queries) {
    const match = { [field]: regex };
    if (filter) Object.assign(match, filter);
    const docs = await model.distinct(field, match);
    for (const v of docs) {
      if (v && typeof v === 'string' && v.trim() && regex.test(v.trim())) {
        values.add(v.trim());
      }
      if (values.size >= LIMIT) break;
    }
    if (values.size >= LIMIT) break;
  }

  return Array.from(values).slice(0, LIMIT);
};

exports.getSuggestions = async (req, res) => {
  try {
    const { type } = req.params;
    const q = (req.query.q || '').trim();
    if (q.length < 1) return sendResponse(res, 200, true, 'Empty query', []);

    let results = [];

    switch (type) {
      case 'parties': {
        const entryPartyResults = await distinctSuggestions([
          { model: EntryRegister, field: 'entries.consignor' },
          { model: EntryRegister, field: 'entries.consignee' },
        ], q);

        if (entryPartyResults.length >= LIMIT) {
          results = entryPartyResults.slice(0, LIMIT);
          return sendResponse(res, 200, true, 'Suggestions fetched', results);
        }

        const otherPartyResults = await distinctSuggestions([
          { model: Shipment, field: 'consignor.name' },
          { model: Shipment, field: 'consignee.name' },
          { model: Contact, field: 'name' },
          { model: Client, field: 'name' },
          { model: Inventory, field: 'senderName' },
          { model: Inventory, field: 'receiverName' },
        ], q);

        results = [
          ...entryPartyResults,
          ...otherPartyResults.slice(0, LIMIT - entryPartyResults.length)
        ];
        return sendResponse(res, 200, true, 'Suggestions fetched', results);
      }

      case 'cargo': {
        const entryCargoResults = await distinctSuggestions([
          { model: EntryRegister, field: 'entries.contents' },
        ], q);

        if (entryCargoResults.length >= LIMIT) {
          results = entryCargoResults.slice(0, LIMIT);
          return sendResponse(res, 200, true, 'Suggestions fetched', results);
        }

        const otherCargoResults = await distinctSuggestions([
          { model: Inventory, field: 'cargoName' },
          { model: Shipment, field: 'description' },
        ], q);

        results = [
          ...entryCargoResults,
          ...otherCargoResults.slice(0, LIMIT - entryCargoResults.length)
        ];
        return sendResponse(res, 200, true, 'Suggestions fetched', results);
      }

      case 'branches': {
        const entryBranchResults = await distinctSuggestions([
          { model: EntryRegister, field: 'fromData' },
          { model: EntryRegister, field: 'toData' },
          { model: EntryRegister, field: 'entries.from' },
          { model: EntryRegister, field: 'entries.to' },
        ], q);

        if (entryBranchResults.length >= LIMIT) {
          results = entryBranchResults.slice(0, LIMIT);
          return sendResponse(res, 200, true, 'Suggestions fetched', results);
        }

        const otherBranchResults = await distinctSuggestions([
          { model: Shipment, field: 'toBranch' },
          { model: Inventory, field: 'origin' },
          { model: Inventory, field: 'destination' },
        ], q);

        results = [
          ...entryBranchResults,
          ...otherBranchResults.slice(0, LIMIT - entryBranchResults.length)
        ];
        return sendResponse(res, 200, true, 'Suggestions fetched', results);
      }

      case 'descriptions':
        results = await distinctSuggestions([
          { model: Shipment, field: 'description' },
          { model: Expense, field: 'description' },
        ], q);
        break;

      case 'vehicle-nos': {
        const entryVehicleResults = await distinctSuggestions([
          { model: EntryRegister, field: 'vehicleNo' },
        ], q);

        if (entryVehicleResults.length >= LIMIT) {
          results = entryVehicleResults.slice(0, LIMIT);
          return sendResponse(res, 200, true, 'Suggestions fetched', results);
        }

        const otherVehicleResults = await distinctSuggestions([
          { model: Vehicle, field: 'vehicleNo' },
        ], q);

        results = [
          ...entryVehicleResults,
          ...otherVehicleResults.slice(0, LIMIT - entryVehicleResults.length)
        ];
        return sendResponse(res, 200, true, 'Suggestions fetched', results);
      }

      case 'vehicle-models':
        results = await distinctSuggestions([
          { model: Vehicle, field: 'model' },
        ], q);
        break;

      case 'vehicle-owners':
        results = await distinctSuggestions([
          { model: Vehicle, field: 'owner.name' },
        ], q);
        break;

      case 'expense-categories':
        results = await distinctSuggestions([
          { model: Expense, field: 'description', filter: { category: 'Other' } },
        ], q);
        break;

      case 'client-names':
        results = await distinctSuggestions([
          { model: Client, field: 'name' },
        ], q);
        break;

      case 'gstins':
        results = await distinctSuggestions([
          { model: Contact, field: 'gst' },
          { model: Client, field: 'gstin' },
          { model: Shipment, field: 'consignor.gst' },
          { model: Shipment, field: 'consignee.gst' },
        ], q);
        break;

      case 'drivers': {
        const entryDriverResults = await distinctSuggestions([
          { model: EntryRegister, field: 'driverName' },
        ], q);

        if (entryDriverResults.length >= LIMIT) {
          results = entryDriverResults.slice(0, LIMIT);
          return sendResponse(res, 200, true, 'Suggestions fetched', results);
        }

        const otherDriverResults = await distinctSuggestions([
          { model: Driver, field: 'name' },
        ], q);

        results = [
          ...entryDriverResults,
          ...otherDriverResults.slice(0, LIMIT - entryDriverResults.length)
        ];
        return sendResponse(res, 200, true, 'Suggestions fetched', results);
      }

      default:
        return sendResponse(res, 400, false, `Unknown suggestion type: ${type}`);
    }

    return sendResponse(res, 200, true, 'Suggestions fetched', results);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};
