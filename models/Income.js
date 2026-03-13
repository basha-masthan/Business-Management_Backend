const mongoose = require('mongoose');

const incomeSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  date: { type: Date, required: true },
  customer: {
    name: { type: String, required: true },
    contact: String,
    address: String
  },
  billReceipt: String, // file path for uploaded receipt
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Income', incomeSchema);