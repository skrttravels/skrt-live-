const Shipment = require('../shipments/model');
const Driver = require('../drivers/driverModel');
const Vehicle = require('../vehicles/model');
const sendResponse = require('../../utils/response');

const statusSteps = [
  { id: 'pending', title: 'Pending', location: 'Warehouse' },
  { id: 'loaded', title: 'Loaded', location: 'Loading Bay' },
  { id: 'dispatched', title: 'Dispatched', location: 'Dispatch Terminal' },
  { id: 'in-transit', title: 'In Transit', location: 'Highway' },
  { id: 'arrived', title: 'Arrived at Branch', location: 'Branch Office' },
  { id: 'out-for-delivery', title: 'Out for Delivery', location: 'Branch Office' },
  { id: 'delivered', title: 'Delivered', location: 'Delivery Address' }
];

const generateTimeline = (currentStatus, statusHistory = []) => {
  const historyMap = {};
  for (const entry of statusHistory) {
    historyMap[entry.status] = new Date(entry.timestamp);
  }

  const currentIndex = statusSteps.findIndex(s => s.title === currentStatus);

  return statusSteps
    .map((step, index) => {
      const recordedTime = historyMap[step.title];

      if (index < currentIndex && recordedTime) {
        return { ...step, status: 'completed', time: recordedTime.toISOString() };
      } else if (index === currentIndex) {
        return { ...step, status: 'active', time: (recordedTime || new Date()).toISOString() };
      }

      return null;
    })
    .filter(Boolean);
};

const buildLiveTrackingData = async () => {
  const shipments = await Shipment.find({
    vehicleNumber: { $exists: true, $ne: '' },
    outgoingStatus: { $ne: 'Delivered' }
  }).sort({ updatedAt: -1 });

  const vehicleNumbers = [...new Set(shipments.map(s => s.vehicleNumber).filter(Boolean))];

  const [drivers, vehicles] = await Promise.all([
    Driver.find({ vehicleNumber: { $in: vehicleNumbers } }).lean(),
    Vehicle.find({ vehicleNo: { $in: vehicleNumbers } }).select('vehicleNo owner').lean()
  ]);

  const driverMap = {};
  for (const d of drivers) {
    driverMap[d.vehicleNumber] = { name: d.name, phone: d.phone };
  }

  const vehicleOwnerMap = {};
  for (const v of vehicles) {
    vehicleOwnerMap[v.vehicleNo] = v.owner || {};
  }

  return shipments.map(shipment => {
    const status = shipment.outgoingStatus || 'Pending';
    const vNo = shipment.vehicleNumber;

    let trackingStatus = 'idle';
    if (['Pending', 'Loaded'].includes(status)) trackingStatus = 'idle';
    else if (['Delivered', 'Cancelled'].includes(status)) trackingStatus = 'offline';
    else trackingStatus = 'active';

    const driverInfo = driverMap[vNo];
    const ownerInfo = vehicleOwnerMap[vNo];

    const driverName = driverInfo?.name || ownerInfo?.name || "Not Assigned";
    const driverPhone = driverInfo?.phone || ownerInfo?.phone || "-";

    return {
      _id: shipment._id,
      consignmentNumber: shipment.consignmentNumber,
      vehicleNumber: vNo,
      driverName,
      driverPhone,
      type: "Transport Vehicle",
      status: trackingStatus,
      statusLabel: status,
      currentLocation: {
        lat: 25.3500,
        lng: 74.6330,
        address: status === 'Pending' ? (shipment.toBranch || "Warehouse") : "In Transit"
      },
      lastUpdate: shipment.updatedAt || shipment.createdAt,
      distance: status === 'Delivered' ? '0 km' : 'Calculating...',
      shipment: {
        lrNo: shipment.consignmentNumber,
        origin: "Main Warehouse",
        destination: shipment.toBranch || "Destination",
        sender: shipment.consignor?.name || "-",
        receiver: shipment.consignee?.name || "-",
        cargoType: shipment.packageType || "Goods",
        packages: shipment.quantity || 0,
        weight: `${shipment.chargedWeight || 0} kg`,
        value: `₹${(shipment.totalFreight || 0).toLocaleString()}`,
        challanNo: `CHL-${shipment.consignmentNumber.slice(-6)}`
      },
      trackingHistory: generateTimeline(status, shipment.statusHistory || [])
    };
  });
};

exports.getAllLocations = async (req, res) => {
  try {
    const data = await buildLiveTrackingData();
    return sendResponse(res, 200, true, 'Tracking data fetched successfully', data);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

exports.getVehicleLocation = async (req, res) => {
  try {
    const data = await buildLiveTrackingData();
    const vehicle = data.find(v => v._id.toString() === req.params.vehicleId || v.vehicleNumber === req.params.vehicleId);
    if (!vehicle) {
      return sendResponse(res, 404, false, 'No tracking data found');
    }
    return sendResponse(res, 200, true, 'Vehicle tracking fetched successfully', vehicle);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

// Unauthenticated lookup for the public landing page. Matches on vehicle or
// consignment number, ignoring separators ("MH03EW2342" ⇔ "MH-03-EW-2342").
exports.getPublicTracking = async (req, res) => {
  try {
    const normalize = value => String(value || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
    const query = normalize(req.params.vehicleNumber);
    if (!query) {
      return sendResponse(res, 400, false, 'Enter a vehicle number to track.');
    }

    const data = await buildLiveTrackingData();
    const vehicle = data.find(v =>
      normalize(v.vehicleNumber) === query || normalize(v.consignmentNumber) === query
    );
    if (!vehicle) {
      return sendResponse(res, 404, false, 'No tracking data found for that number.');
    }

    return sendResponse(res, 200, true, 'Vehicle tracking fetched successfully', {
      ...vehicle,
      currentStatus: vehicle.statusLabel,
      route: {
        origin: vehicle.shipment.origin,
        destination: vehicle.shipment.destination
      }
    });
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

exports.updateLocation = async (req, res) => {
  return sendResponse(res, 200, true, 'Location updates are currently driven by shipment status updates.');
};
