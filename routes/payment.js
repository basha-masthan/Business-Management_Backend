const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const auth = require('../middleware/auth');
const Business = require('../models/Business');
const mongoose = require('mongoose');

// Create payment
router.post('/', auth, async (req, res) => {
  try {
    const { business, customerName, customerEmail, customerPhone, totalAmount, amountPaid, description } = req.body;

    // Verify business ownership
    const businessDoc = await Business.findOne({ _id: business, user: req.user.id });
    if (!businessDoc) {
      return res.status(403).json({ message: 'Business not found or access denied' });
    }

    const payment = new Payment({
      business,
      customerName,
      customerEmail,
      customerPhone,
      totalAmount,
      amountPaid,
      description
    });

    await payment.save();

    // If there's a balance due, we might want to track it separately
    // For now, just save the payment

    res.status(201).json(payment);
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all payments for a business
router.get('/:businessId', auth, async (req, res) => {
  try {
    const { businessId } = req.params;

    // Verify business ownership
    const business = await Business.findOne({ _id: businessId, user: req.user.id });
    if (!business) {
      return res.status(403).json({ message: 'Business not found or access denied' });
    }

    const payments = await Payment.find({ business: businessId }).sort({ date: -1 });
    res.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get payment by ID
router.get('/single/:id', auth, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate('business');
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Verify business ownership
    if (payment.business.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(payment);
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update payment
router.put('/:id', auth, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate('business');
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Verify business ownership
    if (payment.business.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { customerName, customerEmail, customerPhone, totalAmount, amountPaid, description } = req.body;

    payment.customerName = customerName || payment.customerName;
    payment.customerEmail = customerEmail || payment.customerEmail;
    payment.customerPhone = customerPhone || payment.customerPhone;
    payment.totalAmount = totalAmount || payment.totalAmount;
    payment.amountPaid = amountPaid || payment.amountPaid;
    payment.description = description || payment.description;

    await payment.save();
    res.json(payment);
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete payment
router.delete('/:id', auth, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate('business');
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Verify business ownership
    if (payment.business.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Payment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Payment deleted' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get total balance due for a business
router.get('/balance-due/:businessId', auth, async (req, res) => {
  try {
    const { businessId } = req.params;

    // Verify business ownership
    const business = await Business.findOne({ _id: businessId, user: req.user.id });
    if (!business) {
      return res.status(403).json({ message: 'Business not found or access denied' });
    }

    const result = await Payment.aggregate([
      { $match: { business: new mongoose.Types.ObjectId(businessId), balanceDue: { $gt: 0 } } },
      { $group: { _id: null, totalBalanceDue: { $sum: '$balanceDue' } } }
    ]);

    const totalBalanceDue = result.length > 0 ? result[0].totalBalanceDue : 0;
    res.json({ totalBalanceDue });
  } catch (error) {
    console.error('Error calculating balance due:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;