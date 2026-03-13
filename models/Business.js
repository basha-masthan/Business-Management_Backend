const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema({
  name: { type: String, required: true },
  employeeCount: { type: Number, required: true, min: 0 },
  location: { type: String, required: true },
  product: { type: String, required: true },
  email: { type: String, required: true },
  contactNumber: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Business', businessSchema);