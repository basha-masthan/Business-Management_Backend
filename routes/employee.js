const express = require('express');
const Employee = require('../models/Employee');
const Business = require('../models/Business');
const auth = require('../middleware/auth');

const router = express.Router();

// Create employee
router.post('/', auth, async (req, res) => {
  try {
    const { businessId, name, position, department, email, phone, hireDate, salary } = req.body;

    // Verify business ownership
    const business = await Business.findOne({ _id: businessId, owner: req.user });
    if (!business) {
      return res.status(404).json({ message: 'Business not found or not owned by user' });
    }

    const employee = new Employee({
      business: businessId,
      name,
      position,
      department,
      email,
      phone,
      salary,
      joinDate: new Date(hireDate)
    });

    await employee.save();
    await employee.populate('business');
    res.status(201).json(employee);
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Employee with this data already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all employees for a business
router.get('/business/:businessId', auth, async (req, res) => {
  try {
    const { businessId } = req.params;

    // Verify business ownership
    const business = await Business.findOne({ _id: businessId, owner: req.user });
    if (!business) {
      return res.status(404).json({ message: 'Business not found or not owned by user' });
    }

    const employees = await Employee.find({ business: businessId }).populate('business');
    res.json(employees);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all employees for current user's businesses
router.get('/business', auth, async (req, res) => {
  try {
    const employees = await Employee.find({ business: { $in: await Business.find({ owner: req.user }).distinct('_id') } }).populate('business');
    res.json(employees);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single employee
router.get('/:id', auth, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).populate('business');
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Verify business ownership
    const business = await Business.findOne({ _id: employee.business._id, owner: req.user });
    if (!business) {
      return res.status(404).json({ message: 'Business not found or not owned by user' });
    }

    res.json(employee);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update employee
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, role, salaryAmount, joinDate } = req.body;

    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Verify business ownership
    const business = await Business.findOne({ _id: employee.business, owner: req.user });
    if (!business) {
      return res.status(404).json({ message: 'Business not found or not owned by user' });
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.params.id,
      { name, role, salaryAmount, joinDate: joinDate ? new Date(joinDate) : employee.joinDate },
      { new: true, runValidators: true }
    ).populate('business');

    res.json(updatedEmployee);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete employee
router.delete('/:id', auth, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Verify business ownership
    const business = await Business.findOne({ _id: employee.business, owner: req.user });
    if (!business) {
      return res.status(404).json({ message: 'Business not found or not owned by user' });
    }

    await Employee.findByIdAndDelete(req.params.id);
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;