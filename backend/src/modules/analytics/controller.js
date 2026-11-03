const Shipment = require('../shipments/model');
const Vehicle = require('../vehicles/model');
const Client = require('../clients/model');
const User = require('../auth/model');
const Inventory = require('../inventory/model');
const Expense = require('../expenses/model');
const sendResponse = require('../../utils/response');

let dashboardOverviewCache = null;
let dashboardOverviewCachedAt = 0;
const DASHBOARD_OVERVIEW_CACHE_MS = 60000;

exports.getDashboardStats = async (req, res) => {
  try {
    // Correct status values matching the Shipment model enum
    const [shipmentStatsRows, vehicleStatsRows, totalClients, totalDrivers, inventoryStatusBreakdown, recentShipments] = await Promise.all([
      Shipment.aggregate([{
        $group: {
          _id: null,
          totalShipments: { $sum: 1 },
          activeTrips: { $sum: { $cond: [{ $eq: ['$status', 'In Transit'] }, 1, 0] } },
          deliveredShipments: { $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0] } },
          cancelledShipments: { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] } },
          bookedShipments: { $sum: { $cond: [{ $eq: ['$status', 'Booked'] }, 1, 0] } },
          totalRevenue: { $sum: { $ifNull: ['$totalPayable', 0] } },
        }
      }]),
      Vehicle.aggregate([{
        $group: {
          _id: null,
          totalVehicles: { $sum: 1 },
          availableVehicles: { $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] } },
          onTripVehicles: { $sum: { $cond: [{ $eq: ['$status', 'on-trip'] }, 1, 0] } },
        }
      }]),
      Client.countDocuments(),
      User.countDocuments({ role: 'driver' }),
      Inventory.aggregate([
        { $group: { _id: '$incomingStatus', count: { $sum: 1 } } }
      ]),
      Shipment.find().sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    const shipmentStats = shipmentStatsRows[0] || {};
    const vehicleStats = vehicleStatsRows[0] || {};
    const totalInventory = inventoryStatusBreakdown.reduce((sum, status) => sum + status.count, 0);

    return sendResponse(res, 200, true, 'Dashboard stats fetched successfully', {
      totalShipments: shipmentStats.totalShipments || 0,
      activeTrips: shipmentStats.activeTrips || 0,
      deliveredShipments: shipmentStats.deliveredShipments || 0,
      cancelledShipments: shipmentStats.cancelledShipments || 0,
      bookedShipments: shipmentStats.bookedShipments || 0,
      totalVehicles: vehicleStats.totalVehicles || 0,
      availableVehicles: vehicleStats.availableVehicles || 0,
      onTripVehicles: vehicleStats.onTripVehicles || 0,
      totalClients,
      totalDrivers,
      totalInventory,
      totalRevenue: shipmentStats.totalRevenue || 0,
      recentShipments,
      inventoryStatusBreakdown
    });
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

exports.getDashboardOverview = async (req, res) => {
  try {
    if (dashboardOverviewCache && Date.now() - dashboardOverviewCachedAt < DASHBOARD_OVERVIEW_CACHE_MS) {
      return sendResponse(res, 200, true, 'Dashboard overview fetched successfully', dashboardOverviewCache);
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [shipmentRows, vehicleRows, totalClients, totalDrivers, inventoryRows, recentShipments] = await Promise.all([
      Shipment.aggregate([
        { $project: { _id: 0, createdAt: 1, status: 1, totalPayable: 1, toBranch: 1 } },
        { $facet: {
          summary: [{
            $group: {
              _id: null,
              totalShipments: { $sum: 1 },
              activeTrips: { $sum: { $cond: [{ $eq: ['$status', 'In Transit'] }, 1, 0] } },
              deliveredShipments: { $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0] } },
              cancelledShipments: { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] } },
              bookedShipments: { $sum: { $cond: [{ $eq: ['$status', 'Booked'] }, 1, 0] } },
              totalRevenue: { $sum: { $ifNull: ['$totalPayable', 0] } }
            }
          }],
          weekly: [
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            { $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              shipments: { $sum: 1 }, revenue: { $sum: '$totalPayable' }
            } },
            { $sort: { _id: 1 } }
          ],
          monthly: [
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            { $group: {
              _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
              revenue: { $sum: '$totalPayable' }, count: { $sum: 1 }
            } },
            { $sort: { _id: 1 } }
          ],
          topRoutes: [
            { $group: { _id: '$toBranch', count: { $sum: 1 } } },
            { $sort: { count: -1 } }, { $limit: 5 }
          ],
          statusBreakdown: [{ $group: { _id: '$status', count: { $sum: 1 } } }]
        } }
      ]),
      Vehicle.aggregate([{
        $group: {
          _id: null,
          totalVehicles: { $sum: 1 },
          availableVehicles: { $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] } },
          onTripVehicles: { $sum: { $cond: [{ $eq: ['$status', 'on-trip'] }, 1, 0] } }
        }
      }]),
      Client.countDocuments(),
      User.countDocuments({ role: 'driver' }),
      Inventory.aggregate([
        { $project: { _id: 0, createdAt: 1, incomingStatus: 1 } },
        { $facet: {
          statuses: [{ $group: { _id: '$incomingStatus', count: { $sum: 1 } } }],
          weekly: [
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
          ]
        } }
      ]),
      Shipment.find()
        .select('_id consignmentNumber status consignor.name consignee.name totalPayable')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
    ]);

    const shipment = shipmentRows[0] || {};
    const shipmentStats = shipment.summary?.[0] || {};
    const vehicleStats = vehicleRows[0] || {};
    const inventory = inventoryRows[0] || {};
    const inventoryStatusBreakdown = inventory.statuses || [];
    const weeklyShipments = shipment.weekly || [];
    const monthlyRevenue = shipment.monthly || [];
    const weeklyInventory = inventory.weekly || [];
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const weeklyData = [];
    const weeklyInventoryData = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      const date = day.toISOString().split('T')[0];
      const shipmentDay = weeklyShipments.find(row => row._id === date);
      const inventoryDay = weeklyInventory.find(row => row._id === date);
      weeklyData.push({
        name: dayLabels[day.getDay()], date,
        shipments: shipmentDay?.shipments || 0,
        revenue: shipmentDay?.revenue || 0
      });
      weeklyInventoryData.push({ name: dayLabels[day.getDay()], date, count: inventoryDay?.count || 0 });
    }

    const totalInventory = inventoryStatusBreakdown.reduce((sum, row) => sum + row.count, 0);
    const stats = {
      totalShipments: shipmentStats.totalShipments || 0,
      activeTrips: shipmentStats.activeTrips || 0,
      deliveredShipments: shipmentStats.deliveredShipments || 0,
      cancelledShipments: shipmentStats.cancelledShipments || 0,
      bookedShipments: shipmentStats.bookedShipments || 0,
      totalVehicles: vehicleStats.totalVehicles || 0,
      availableVehicles: vehicleStats.availableVehicles || 0,
      onTripVehicles: vehicleStats.onTripVehicles || 0,
      totalClients,
      totalDrivers,
      totalInventory,
      totalRevenue: shipmentStats.totalRevenue || 0,
      recentShipments,
      inventoryStatusBreakdown
    };
    const detailed = {
      weeklyData,
      monthlyData: monthlyRevenue.map(row => ({
        name: monthNames[parseInt(row._id.split('-')[1], 10) - 1],
        revenue: row.revenue,
        shipments: row.count
      })),
      topRoutes: shipment.topRoutes || [],
      statusBreakdown: shipment.statusBreakdown || [],
      weeklyInventoryData
    };

    dashboardOverviewCache = { stats, detailed };
    dashboardOverviewCachedAt = Date.now();
    return sendResponse(res, 200, true, 'Dashboard overview fetched successfully', dashboardOverviewCache);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

exports.getDetailedAnalytics = async (req, res) => {
  try {
    // Last 7 days shipment trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const weeklyShipmentsPipeline = [
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          shipments: { $sum: 1 },
          revenue: { $sum: '$totalPayable' }
        }
      },
      { $sort: { _id: 1 } }
    ];

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Monthly revenue (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyRevenuePipeline = [
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          revenue: { $sum: '$totalPayable' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ];

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    // Top destination branches
    const topRoutesPipeline = [
      { $group: { _id: '$toBranch', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ];

    // Status breakdown
    const statusBreakdownPipeline = [
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ];

    // Weekly inventory inflow (last 7 days)
    const weeklyInventoryPipeline = [
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ];

    const [shipmentAnalyticsRows, weeklyInventoryInflow] = await Promise.all([
      Shipment.aggregate([{
        $facet: {
          weeklyShipments: weeklyShipmentsPipeline,
          monthlyRevenue: monthlyRevenuePipeline,
          topRoutes: topRoutesPipeline,
          statusBreakdown: statusBreakdownPipeline
        }
      }]),
      Inventory.aggregate(weeklyInventoryPipeline),
    ]);

    const shipmentAnalytics = shipmentAnalyticsRows[0] || {};
    const weeklyShipments = shipmentAnalytics.weeklyShipments || [];
    const monthlyRevenue = shipmentAnalytics.monthlyRevenue || [];
    const topRoutes = shipmentAnalytics.topRoutes || [];
    const statusBreakdown = shipmentAnalytics.statusBreakdown || [];

    // Fill in missing days after the independent aggregates complete.
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const found = weeklyShipments.find(w => w._id === dateStr);
      days.push({
        name: dayLabels[d.getDay()],
        date: dateStr,
        shipments: found ? found.shipments : 0,
        revenue: found ? found.revenue : 0
      });
    }

    const monthlyData = monthlyRevenue.map(m => ({
      name: monthNames[parseInt(m._id.split('-')[1]) - 1],
      revenue: m.revenue,
      shipments: m.count
    }));

    const weeklyInvData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const found = weeklyInventoryInflow.find(w => w._id === dateStr);
      weeklyInvData.push({
        name: dayLabels[d.getDay()],
        date: dateStr,
        count: found ? found.count : 0
      });
    }

    return sendResponse(res, 200, true, 'Detailed analytics fetched successfully', {
      weeklyData: days,
      monthlyData,
      topRoutes,
      statusBreakdown,
      weeklyInventoryData: weeklyInvData
    });
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

exports.getAnalysis = async (req, res) => {
  try {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const [shipmentRows, expenseRows, recentShipments] = await Promise.all([
      Shipment.aggregate([{
        $facet: {
          totals: [{
            $group: {
              _id: null,
              totalRevenue: { $sum: '$totalPayable' },
              activeShipments: { $sum: { $cond: [{ $eq: ['$status', 'In Transit'] }, 1, 0] } }
            }
          }],
          monthlyRevenue: [
            { $match: { createdAt: { $gte: twelveMonthsAgo } } },
            { $group: {
              _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
              revenue: { $sum: '$totalPayable' }, count: { $sum: 1 }
            } },
            { $sort: { _id: 1 } }
          ],
          topRoutes: [
            { $group: { _id: '$toBranch', count: { $sum: 1 }, revenue: { $sum: '$totalPayable' } } },
            { $sort: { count: -1 } }, { $limit: 7 }
          ],
          topClients: [
            { $group: { _id: '$consignor.name', revenue: { $sum: '$totalPayable' }, shipments: { $sum: 1 } } },
            { $sort: { revenue: -1 } }, { $limit: 7 }
          ]
        }
      }]),
      Expense.aggregate([{
        $facet: {
          totals: [{ $group: { _id: null, total: { $sum: '$amount' } } }],
          monthly: [
            { $match: { date: { $gte: twelveMonthsAgo } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date' } }, total: { $sum: '$amount' } } },
            { $sort: { _id: 1 } }
          ]
        }
      }]),
      Shipment.find().sort({ createdAt: -1 }).limit(10).lean()
    ]);

    const shipmentAnalytics = shipmentRows[0] || {};
    const expenseAnalytics = expenseRows[0] || {};
    const totals = shipmentAnalytics.totals?.[0] || {};
    const totalRevenue = totals.totalRevenue || 0;
    const activeShipments = totals.activeShipments || 0;
    const totalExpenses = expenseAnalytics.totals?.[0]?.total || 0;
    const monthlyRevenueRaw = shipmentAnalytics.monthlyRevenue || [];
    const monthlyExpensesRaw = expenseAnalytics.monthly || [];
    const topRoutes = shipmentAnalytics.topRoutes || [];
    const topClientsRaw = shipmentAnalytics.topClients || [];
    const netProfit = totalRevenue - totalExpenses;

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const revenueExpenseData = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const rev = monthlyRevenueRaw.find(m => m._id === key);
      const exp = monthlyExpensesRaw.find(m => m._id === key);
      revenueExpenseData.push({
        name: monthNames[d.getMonth()],
        revenue: rev ? rev.revenue : 0,
        expenses: exp ? exp.total : 0
      });
    }

    return sendResponse(res, 200, true, 'Analysis fetched successfully', {
      kpi: {
        totalRevenue,
        totalExpenses,
        netProfit,
        activeShipments
      },
      revenueExpenseData,
      topRoutes: topRoutes.map(r => ({ name: r._id || 'Unknown', count: r.count, revenue: r.revenue })),
      topClients: topClientsRaw.map(c => ({ name: c._id || 'Unknown', revenue: c.revenue, shipments: c.shipments })),
      recentShipments
    });
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};
