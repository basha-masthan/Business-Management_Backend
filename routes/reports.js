const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Business = require('../models/Business');
const Investment = require('../models/Investment');
const Income = require('../models/Income');
const Expenditure = require('../models/Expenditure');
const Salary = require('../models/Salary');
const Employee = require('../models/Employee');
const Payment = require('../models/Payment');

const router = express.Router();

// Helper function to get business ID from user
const getBusinessId = async (userId) => {
  const business = await Business.findOne({ owner: userId });
  return business ? business._id : null;
};

// Summary report endpoint
router.get('/summary/:businessId', auth, async (req, res) => {
  try {
    const { businessId } = req.params;
    const { period, startDate, endDate } = req.query;
    console.log('Summary request for businessId:', businessId, 'user:', req.user, 'period:', period);

    // Verify business ownership
    const business = await Business.findOne({ _id: businessId, owner: req.user });
    if (!business) {
      console.log('Business not found or access denied for businessId:', businessId);
      return res.status(404).json({ message: 'Business not found or access denied' });
    }

    // Build date filter
    let dateFilter = {};
    if (period && period !== 'all') {
      const now = new Date();
      if (period === 'today') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        dateFilter = { date: { $gte: startOfDay, $lt: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000) } };
      } else if (period === 'week') {
        const startOfWeek = new Date(now.getTime() - now.getDay() * 24 * 60 * 60 * 1000);
        startOfWeek.setHours(0, 0, 0, 0);
        dateFilter = { date: { $gte: startOfWeek } };
      } else if (period === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = { date: { $gte: startOfMonth } };
      } else if (period === 'year') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        dateFilter = { date: { $gte: startOfYear } };
      }
    } else if (startDate && endDate) {
      dateFilter = {
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    // Get total investments
    const totalInvestments = await Investment.aggregate([
      { $match: { business: new mongoose.Types.ObjectId(businessId), ...dateFilter } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    console.log('Total investments result:', totalInvestments);

    // Get total incomes
    const totalIncomes = await Income.aggregate([
      { $match: { business: new mongoose.Types.ObjectId(businessId), ...dateFilter } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    console.log('Total incomes result:', totalIncomes);

    // Get total payments (amountPaid from payments)
    const totalPayments = await Payment.aggregate([
      { $match: { business: new mongoose.Types.ObjectId(businessId), ...dateFilter } },
      { $group: { _id: null, total: { $sum: '$amountPaid' } } }
    ]);
    console.log('Total payments result:', totalPayments);

    // Get total expenditures
    const totalExpenditures = await Expenditure.aggregate([
      { $match: { business: new mongoose.Types.ObjectId(businessId), ...dateFilter } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    console.log('Total expenditures result:', totalExpenditures);

    // Get total salaries (sum of totalPaid for paid salaries)
    const totalSalaries = await Salary.aggregate([
      {
        $lookup: {
          from: 'employees',
          localField: 'employee',
          foreignField: '_id',
          as: 'employeeData'
        }
      },
      { $unwind: '$employeeData' },
      { $match: { 'employeeData.business': new mongoose.Types.ObjectId(businessId), status: 'paid' } },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalPaid' }
        }
      }
    ]);

    const investments = totalInvestments[0]?.total || 0;
    const incomes = (totalIncomes[0]?.total || 0) + (totalPayments[0]?.total || 0);
    const expenditures = totalExpenditures[0]?.total || 0;
    const salaries = totalSalaries[0]?.total || 0;

    const totalExpenses = expenditures + salaries;
    const profitLoss = incomes - totalExpenses;
    const netWorth = investments + profitLoss;

    const payments = totalPayments[0]?.total || 0;

    console.log('Final calculations:', {
      investments,
      incomes,
      expenditures,
      salaries,
      payments,
      totalExpenses,
      profitLoss,
      netWorth
    });

    res.json({
      totalInvestments: investments,
      totalIncomes: incomes,
      totalExpenses,
      totalExpenditures: expenditures,
      totalSalaries: salaries,
      totalPayments: payments,
      profitLoss,
      netWorth
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Monthly Report Endpoint
router.get('/monthly/:year/:month', auth, async (req, res) => {
  try {
    const { year, month } = req.params;
    const businessId = await getBusinessId(req.user);

    if (!businessId) {
      return res.status(404).json({ message: 'Business not found' });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // Aggregate investments
    const investments = await Investment.aggregate([
      { $match: { business: businessId, date: { $gte: startDate, $lt: endDate } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Aggregate incomes
    const incomes = await Income.aggregate([
      { $match: { business: businessId, date: { $gte: startDate, $lt: endDate } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Aggregate expenditures
    const expenditures = await Expenditure.aggregate([
      { $match: { business: businessId, date: { $gte: startDate, $lt: endDate } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Aggregate salaries (paid salaries for the month)
    const salaries = await Salary.aggregate([
      {
        $lookup: {
          from: 'employees',
          localField: 'employee',
          foreignField: '_id',
          as: 'employeeData'
        }
      },
      { $unwind: '$employeeData' },
      {
        $match: {
          'employeeData.business': businessId,
          month: parseInt(month),
          year: parseInt(year),
          status: 'paid'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalPaid' }
        }
      }
    ]);

    const totalInvestments = investments[0]?.total || 0;
    const totalIncomes = incomes[0]?.total || 0;
    const totalExpenditures = expenditures[0]?.total || 0;
    const totalSalaries = salaries[0]?.total || 0;

    const totalExpenses = totalExpenditures + totalSalaries;
    const profitLoss = totalIncomes - totalExpenses;

    res.json({
      year: parseInt(year),
      month: parseInt(month),
      totalInvestments,
      totalIncomes,
      totalExpenses,
      totalExpenditures,
      totalSalaries,
      profitLoss
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Yearly Report Endpoint
router.get('/yearly/:year', auth, async (req, res) => {
  try {
    const { year } = req.params;
    const businessId = await getBusinessId(req.user);

    if (!businessId) {
      return res.status(404).json({ message: 'Business not found' });
    }

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(parseInt(year) + 1, 0, 1);

    // Aggregate investments
    const investments = await Investment.aggregate([
      { $match: { business: businessId, date: { $gte: startDate, $lt: endDate } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Aggregate incomes
    const incomes = await Income.aggregate([
      { $match: { business: businessId, date: { $gte: startDate, $lt: endDate } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Aggregate expenditures
    const expenditures = await Expenditure.aggregate([
      { $match: { business: businessId, date: { $gte: startDate, $lt: endDate } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Aggregate salaries (paid salaries for the year)
    const salaries = await Salary.aggregate([
      {
        $lookup: {
          from: 'employees',
          localField: 'employee',
          foreignField: '_id',
          as: 'employeeData'
        }
      },
      { $unwind: '$employeeData' },
      { $match: { 'employeeData.business': businessId, year: parseInt(year), status: 'paid' } },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalPaid' }
        }
      }
    ]);

    const totalInvestments = investments[0]?.total || 0;
    const totalIncomes = incomes[0]?.total || 0;
    const totalExpenditures = expenditures[0]?.total || 0;
    const totalSalaries = salaries[0]?.total || 0;

    const totalExpenses = totalExpenditures + totalSalaries;
    const profitLoss = totalIncomes - totalExpenses;

    res.json({
      year: parseInt(year),
      totalInvestments,
      totalIncomes,
      totalExpenses,
      totalExpenditures,
      totalSalaries,
      profitLoss
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Graph Data for Monthly Trends
router.get('/graph/monthly/:year', auth, async (req, res) => {
  try {
    const { year } = req.params;
    const businessId = await getBusinessId(req.user);

    if (!businessId) {
      return res.status(404).json({ message: 'Business not found' });
    }

    const monthlyData = [];

    for (let month = 1; month <= 12; month++) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);

      const [incomes, expenditures, salaries] = await Promise.all([
        Income.aggregate([
          { $match: { business: businessId, date: { $gte: startDate, $lt: endDate } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Expenditure.aggregate([
          { $match: { business: businessId, date: { $gte: startDate, $lt: endDate } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Salary.aggregate([
          {
            $lookup: {
              from: 'employees',
              localField: 'employee',
              foreignField: '_id',
              as: 'employeeData'
            }
          },
          { $unwind: '$employeeData' },
          { $match: { 'employeeData.business': new mongoose.Types.ObjectId(businessId), month, year: parseInt(year), status: 'paid' } },
          {
            $group: {
              _id: null,
              total: { $sum: '$totalPaid' }
            }
          }
        ])
      ]);

      const income = incomes[0]?.total || 0;
      const expense = (expenditures[0]?.total || 0) + (salaries[0]?.total || 0);
      const profitLoss = income - expense;

      monthlyData.push({
        month,
        income,
        expense,
        profitLoss
      });
    }

    res.json({
      year: parseInt(year),
      data: monthlyData
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Graph Data for Yearly Trends (last 5 years)
router.get('/graph/yearly', auth, async (req, res) => {
  try {
    const businessId = await getBusinessId(req.user);

    if (!businessId) {
      return res.status(404).json({ message: 'Business not found' });
    }

    const currentYear = new Date().getFullYear();
    const yearlyData = [];

    for (let year = currentYear - 4; year <= currentYear; year++) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year + 1, 0, 1);

      const [incomes, expenditures, salaries] = await Promise.all([
        Income.aggregate([
          { $match: { business: businessId, date: { $gte: startDate, $lt: endDate } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Expenditure.aggregate([
          { $match: { business: businessId, date: { $gte: startDate, $lt: endDate } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Salary.aggregate([
          {
            $lookup: {
              from: 'employees',
              localField: 'employee',
              foreignField: '_id',
              as: 'employeeData'
            }
          },
          { $unwind: '$employeeData' },
          { $match: { 'employeeData.business': new mongoose.Types.ObjectId(businessId), year, status: 'paid' } },
          {
            $group: {
              _id: null,
              total: { $sum: '$totalPaid' }
            }
          }
        ])
      ]);

      const income = incomes[0]?.total || 0;
      const expense = (expenditures[0]?.total || 0) + (salaries[0]?.total || 0);
      const profitLoss = income - expense;

      yearlyData.push({
        year,
        income,
        expense,
        profitLoss
      });
    }

    res.json({
      data: yearlyData
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;