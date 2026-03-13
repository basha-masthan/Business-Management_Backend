const express = require('express');
const Expenditure = require('../models/Expenditure');
const Business = require('../models/Business');
const auth = require('../middleware/auth');

const router = express.Router();

// Get expenditure types for dropdown
router.get('/types', (req, res) => {
  const types = ['current', 'emi', 'buying machinery', 'goods'];
  res.json({ types });
});

// Create expenditure
router.post('/', auth, async (req, res) => {
  try {
    const { business, category, vendor, amount, date, description, paymentMethod } = req.body;

    // Verify business ownership
    const businessDoc = await Business.findOne({ _id: business, owner: req.user });
    if (!businessDoc) {
      return res.status(404).json({ message: 'Business not found or not owned by user' });
    }

    const expenditure = new Expenditure({
      business,
      category,
      vendor,
      amount,
      date,
      description,
      paymentMethod
    });

    await expenditure.save();
    await expenditure.populate('business');
    res.status(201).json(expenditure);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all expenditures for a business
router.get('/business/:businessId', auth, async (req, res) => {
  try {
    const { businessId } = req.params;

    // Verify business ownership
    const business = await Business.findOne({ _id: businessId, owner: req.user });
    if (!business) {
      return res.status(404).json({ message: 'Business not found or not owned by user' });
    }

    let query = { business: businessId };
    const { startDate, endDate, period } = req.query;

    // Handle date filtering
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (period) {
      const now = new Date();
      let start;

      switch (period) {
        case 'today':
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          start = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          break;
      }

      if (start) {
        query.date = { $gte: start };
      }
    }

    const expenditures = await Expenditure.find(query).populate('business');
    res.json(expenditures);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single expenditure
router.get('/:id', auth, async (req, res) => {
  try {
    const expenditure = await Expenditure.findById(req.params.id).populate('business');
    if (!expenditure) {
      return res.status(404).json({ message: 'Expenditure not found' });
    }

    // Verify business ownership
    const business = await Business.findOne({ _id: expenditure.business._id, owner: req.user });
    if (!business) {
      return res.status(404).json({ message: 'Expenditure not found or not owned by user' });
    }

    res.json(expenditure);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update expenditure
router.put('/:id', auth, async (req, res) => {
  try {
    const { category, vendor, amount, date, description, paymentMethod } = req.body;

    const expenditure = await Expenditure.findById(req.params.id);
    if (!expenditure) {
      return res.status(404).json({ message: 'Expenditure not found' });
    }

    // Verify business ownership
    const business = await Business.findOne({ _id: expenditure.business, owner: req.user });
    if (!business) {
      return res.status(404).json({ message: 'Expenditure not found or not owned by user' });
    }

    const updatedExpenditure = await Expenditure.findByIdAndUpdate(
      req.params.id,
      {
        category,
        vendor,
        amount,
        date,
        description,
        paymentMethod
      },
      { new: true, runValidators: true }
    ).populate('business');

    res.json(updatedExpenditure);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete expenditure
router.delete('/:id', auth, async (req, res) => {
  try {
    const expenditure = await Expenditure.findById(req.params.id);
    if (!expenditure) {
      return res.status(404).json({ message: 'Expenditure not found' });
    }

    // Verify business ownership
    const business = await Business.findOne({ _id: expenditure.business, owner: req.user });
    if (!business) {
      return res.status(404).json({ message: 'Expenditure not found or not owned by user' });
    }

    await Expenditure.findByIdAndDelete(req.params.id);
    res.json({ message: 'Expenditure deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;