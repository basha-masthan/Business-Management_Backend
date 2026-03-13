const mongoose = require('mongoose');

const expenditureSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  amount: { type: Number, required: true },
  description: String,
  date: { type: Date, required: true },
  category: { type: String, enum: ['utilities', 'rent', 'supplies', 'marketing', 'other'], required: true },
  paymentMethod: { type: String, enum: ['cash', 'bank', 'online'], required: true },
  vendor: {
    name: String,
    contact: String
  },
  receipt: {
    fileUrl: String,
    uploadedAt: Date
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Expenditure', expenditureSchema);