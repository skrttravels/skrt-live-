const Expense = require('./model');
const sendResponse = require('../../utils/response');

exports.getExpenses = async (req, res) => {
  try {
    const { category, vehicle, status, startDate, endDate, search } = req.query;
    const filter = {};

    if (category) {
      const cats = category.split(',');
      if (cats.length === 1) filter.category = category;
      else filter.category = { $in: cats };
    }
    if (vehicle) filter.vehicle = vehicle;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { description: regex },
        { category: regex }
      ];
    }

    const expenses = await Expense.find(filter)
      .populate('vehicle', 'vehicleNo')
      .sort({ date: -1 })
      .lean();

    return sendResponse(res, 200, true, 'Expenses fetched successfully', expenses);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

exports.getExpenseStats = async (req, res) => {
  try {
    const { startDate, endDate, vehicle } = req.query;
    const filter = {};
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }
    if (vehicle) filter.vehicle = vehicle;

    const stats = await Expense.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    const allCategories = ['Fuel', 'Maintenance', 'Toll', 'Driver Payment', 'Other'];
    const categoryMap = {};
    stats.forEach(s => { categoryMap[s._id] = { total: s.total, count: s.count }; });

    const result = allCategories.map(cat => ({
      category: cat,
      total: categoryMap[cat]?.total || 0,
      count: categoryMap[cat]?.count || 0
    }));

    const grandTotal = result.reduce((sum, r) => sum + r.total, 0);

    return sendResponse(res, 200, true, 'Expense stats fetched', { categories: result, grandTotal });
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

exports.createExpense = async (req, res) => {
  try {
    const expense = await Expense.create({
      ...req.body,
      createdBy: req.user._id
    });
    return sendResponse(res, 201, true, 'Expense created successfully', expense);
  } catch (error) {
    return sendResponse(res, 400, false, error.message);
  }
};
