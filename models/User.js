const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  name: { type: String, required: true },
  password: { type: String, required: true }, // hashed
  otp: { type: String }, // temporary
  otpExpiry: { type: Date },
  isVerified: { type: Boolean, default: true },
  businesses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Business' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);