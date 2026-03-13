const mongoose = require('mongoose');

const salarySchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  month: { type: Number, required: true }, // 1-12
  year: { type: Number, required: true },
  baseSalary: { type: Number, required: true },
  bonus: { type: Number, default: 0 },
  deductions: {
    leaves: { type: Number, default: 0 }, // number of leave days
    other: { type: Number, default: 0 }
  },
  totalPaid: { type: Number, required: true },
  status: { type: String, enum: ['paid', 'hold', 'pending'], required: true },
  paymentDate: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Salary', salarySchema);