const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Income = require('../models/Income');
const Business = require('../models/Business');
const auth = require('../middleware/auth');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed!'));
    }
  }
});

// Middleware to check business ownership
const checkBusinessOwnership = async (req, res, next) => {
  try {
    const business = await Business.findOne({ _id: req.body.business || req.params.businessId, owner: req.user });
    if (!business) {
      return res.status(403).json({ message: 'Access denied: Business not found or not owned by user' });
    }
    req.business = business;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create income
router.post('/', auth, upload.single('billReceipt'), async (req, res) => {
  try {
    const { business, amount, description, date, customer } = req.body;

    // Verify business ownership
    const businessDoc = await Business.findOne({ _id: business, owner: req.user });
    if (!businessDoc) {
      return res.status(404).json({ message: 'Business not found or not owned by user' });
    }

    const incomeData = {
      business,
      amount: parseFloat(amount),
      description,
      date: date ? new Date(date) : new Date(),
      customer
    };

    if (req.file) {
      incomeData.billReceipt = req.file.path;
    }

    const income = new Income(incomeData);
    await income.save();

    await income.populate('business');
    res.status(201).json(income);
  } catch (error) {
    console.error(error);
    if (req.file) {
      fs.unlinkSync(req.file.path); // Delete uploaded file on error
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all incomes for user's businesses
router.get('/', auth, async (req, res) => {
  try {
    const businesses = await Business.find({ owner: req.user }).select('_id');
    const businessIds = businesses.map(b => b._id);

    const incomes = await Income.find({ business: { $in: businessIds } })
      .populate('business')
      .sort({ date: -1 });

    res.json(incomes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get incomes for a specific business
router.get('/business/:businessId', auth, async (req, res) => {
  try {
    const business = await Business.findOne({ _id: req.params.businessId, owner: req.user });
    if (!business) {
      return res.status(403).json({ message: 'Access denied: Business not found or not owned by user' });
    }

    let query = { business: req.params.businessId };
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

    const incomes = await Income.find(query)
      .populate('business')
      .sort({ date: -1 });

    res.json(incomes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single income
router.get('/:id', auth, async (req, res) => {
  try {
    const income = await Income.findById(req.params.id).populate('business');
    if (!income) {
      return res.status(404).json({ message: 'Income not found' });
    }

    // Check if user owns the business associated with this income
    const business = await Business.findOne({ _id: income.business._id, owner: req.user });
    if (!business) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(income);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update income
router.put('/:id', auth, upload.single('billReceipt'), async (req, res) => {
  try {
    const income = await Income.findById(req.params.id).populate('business');
    if (!income) {
      return res.status(404).json({ message: 'Income not found' });
    }

    // Check if user owns the business
    const business = await Business.findOne({ _id: income.business._id, owner: req.user });
    if (!business) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { amount, description, date, customer } = req.body;

    const updateData = {
      amount: parseFloat(amount),
      description,
      date: date ? new Date(date) : income.date,
      customer
    };

    if (req.file) {
      // Delete old file if exists
      if (income.billReceipt && fs.existsSync(income.billReceipt)) {
        fs.unlinkSync(income.billReceipt);
      }
      updateData.billReceipt = req.file.path;
    }

    const updatedIncome = await Income.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('business');

    res.json(updatedIncome);
  } catch (error) {
    console.error(error);
    if (req.file) {
      fs.unlinkSync(req.file.path); // Delete uploaded file on error
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete income
router.delete('/:id', auth, async (req, res) => {
  try {
    const income = await Income.findById(req.params.id).populate('business');
    if (!income) {
      return res.status(404).json({ message: 'Income not found' });
    }

    // Check if user owns the business
    const business = await Business.findOne({ _id: income.business._id, owner: req.user });
    if (!business) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Delete associated file if exists
    if (income.billReceipt && fs.existsSync(income.billReceipt)) {
      fs.unlinkSync(income.billReceipt);
    }

    await Income.findByIdAndDelete(req.params.id);
    res.json({ message: 'Income deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Serve uploaded files
router.get('/receipt/:filename', auth, (req, res) => {
  const filePath = path.join(uploadsDir, req.params.filename);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ message: 'File not found' });
  }
});

module.exports = router;