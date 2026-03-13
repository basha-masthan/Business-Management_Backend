const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  type: { type: String, enum: ['one-time', 'monthly', 'quarterly', 'yearly'], required: true },
  amount: { type: Number, required: true },
  description: String,
  date: { type: Date, required: true },
  category: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Investment', investmentSchema);