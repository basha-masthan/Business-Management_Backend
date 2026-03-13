const express = require('express');
const Business = require('../models/Business');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Create business
router.post('/', auth, async (req, res) => {
  try {
    const { name, employeeCount, location, product, email, contactNumber } = req.body;

    const business = new Business({
      name,
      employeeCount,
      location,
      product,
      email,
      contactNumber,
      owner: req.user
    });

    await business.save();
    res.status(201).json(business);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all businesses for authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const businesses = await Business.find({ owner: req.user });
    res.json(businesses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single business
router.get('/:id', auth, async (req, res) => {
  try {
    const business = await Business.findOne({ _id: req.params.id, owner: req.user });
    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }
    res.json(business);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update business
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, employeeCount, location, product, email, contactNumber } = req.body;

    const business = await Business.findOneAndUpdate(
      { _id: req.params.id, owner: req.user },
      { name, employeeCount, location, product, email, contactNumber },
      { new: true, runValidators: true }
    );

    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    res.json(business);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete business
router.delete('/:id', auth, async (req, res) => {
  try {
    const business = await Business.findOneAndDelete({ _id: req.params.id, owner: req.user });
    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    res.json({ message: 'Business deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;