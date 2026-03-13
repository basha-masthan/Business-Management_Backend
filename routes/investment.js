const express = require('express');
const Investment = require('../models/Investment');
const Business = require('../models/Business');
const auth = require('../middleware/auth');

const router = express.Router();

// Get investment types for dropdown
router.get('/types', (req, res) => {
  const types = ['one-time', 'monthly', 'quarterly', 'yearly'];
  res.json({ types });
});

// Create investment
router.post('/', auth, async (req, res) => {
  try {
    const { business, type, amount, description, date, category } = req.body;

    // Verify business ownership
    const businessDoc = await Business.findOne({ _id: business, owner: req.user });
    if (!businessDoc) {
      return res.status(404).json({ message: 'Business not found or not owned by user' });
    }

    const investment = new Investment({
      business,
      type,
      amount,
      description,
      date,
      category
    });

    await investment.save();
    await investment.populate('business');
    res.status(201).json(investment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all investments for a business
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

    const investments = await Investment.find(query).sort({ date: -1 });
    res.json(investments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single investment
router.get('/:id', auth, async (req, res) => {
  try {
    const investment = await Investment.findById(req.params.id).populate('business');
    if (!investment) {
      return res.status(404).json({ message: 'Investment not found' });
    }

    // Verify business ownership
    const business = await Business.findOne({ _id: investment.business._id, owner: req.user });
    if (!business) {
      return res.status(404).json({ message: 'Investment not found or not owned by user' });
    }

    res.json(investment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update investment
router.put('/:id', auth, async (req, res) => {
  try {
    const { type, amount, description, date, category } = req.body;

    const investment = await Investment.findById(req.params.id);
    if (!investment) {
      return res.status(404).json({ message: 'Investment not found' });
    }

    // Verify business ownership
    const business = await Business.findOne({ _id: investment.business, owner: req.user });
    if (!business) {
      return res.status(404).json({ message: 'Investment not found or not owned by user' });
    }

    const updatedInvestment = await Investment.findByIdAndUpdate(
      req.params.id,
      { type, amount, description, date, category },
      { new: true, runValidators: true }
    );

    res.json(updatedInvestment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete investment
router.delete('/:id', auth, async (req, res) => {
  try {
    const investment = await Investment.findById(req.params.id);
    if (!investment) {
      return res.status(404).json({ message: 'Investment not found' });
    }

    // Verify business ownership
    const business = await Business.findOne({ _id: investment.business, owner: req.user });
    if (!business) {
      return res.status(404).json({ message: 'Investment not found or not owned by user' });
    }

    await Investment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Investment deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;