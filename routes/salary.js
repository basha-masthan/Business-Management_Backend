const express = require('express');
const Salary = require('../models/Salary');
const Employee = require('../models/Employee');
const Business = require('../models/Business');
const auth = require('../middleware/auth');

const router = express.Router();

// Create salary record
router.post('/', auth, async (req, res) => {
  try {
    const { employeeId, month, year, baseSalary, bonus, deductions, totalPaid, status } = req.body;

    // Verify employee exists and business ownership
    const employee = await Employee.findById(employeeId).populate('business');
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const business = await Business.findOne({ _id: employee.business._id, owner: req.user });
    if (!business) {
      return res.status(404).json({ message: 'Business not found or not owned by user' });
    }

    const salary = new Salary({
      employee: employeeId,
      business: employee.business._id,
      month,
      year,
      baseSalary,
      bonus: bonus || 0,
      deductions: deductions || { leaves: 0, other: 0 },
      totalPaid,
      status: status || 'pending'
    });

    await salary.save();
    await salary.populate('employee');
    res.status(201).json(salary);
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Salary record already exists for this employee in the specified month/year' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all salaries for an employee
router.get('/employee/:employeeId', auth, async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Verify employee exists and business ownership
    const employee = await Employee.findById(employeeId).populate('business');
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const business = await Business.findOne({ _id: employee.business._id, owner: req.user });
    if (!business) {
      return res.status(404).json({ message: 'Business not found or not owned by user' });
    }

    const salaries = await Salary.find({ employee: employeeId }).populate('employee');
    res.json(salaries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get salaries for a business (all employees)
router.get('/business/:businessId', auth, async (req, res) => {
  try {
    const { businessId } = req.params;

    // Verify business ownership
    const business = await Business.findOne({ _id: businessId, owner: req.user });
    if (!business) {
      return res.status(404).json({ message: 'Business not found or not owned by user' });
    }

    const salaries = await Salary.find()
      .populate({
        path: 'employee',
        match: { business: businessId }
      })
      .then(salaries => salaries.filter(salary => salary.employee));

    res.json(salaries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all salaries for current user's businesses
router.get('/business', auth, async (req, res) => {
  try {
    const salaries = await Salary.find({
      business: { $in: await Business.find({ owner: req.user }).distinct('_id') }
    }).populate('employee');
    res.json(salaries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single salary record
router.get('/:id', auth, async (req, res) => {
  try {
    const salary = await Salary.findById(req.params.id).populate('employee');
    if (!salary) {
      return res.status(404).json({ message: 'Salary record not found' });
    }

    // Verify business ownership through employee
    const employee = await Employee.findById(salary.employee._id).populate('business');
    const business = await Business.findOne({ _id: employee.business._id, owner: req.user });
    if (!business) {
      return res.status(404).json({ message: 'Business not found or not owned by user' });
    }

    res.json(salary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update salary record
router.put('/:id', auth, async (req, res) => {
  try {
    const { baseSalary, bonus, deductions, totalPaid, status } = req.body;

    const salary = await Salary.findById(req.params.id).populate('employee');
    if (!salary) {
      return res.status(404).json({ message: 'Salary record not found' });
    }

    // Verify business ownership through employee
    const employee = await Employee.findById(salary.employee._id).populate('business');
    const business = await Business.findOne({ _id: employee.business._id, owner: req.user });
    if (!business) {
      return res.status(404).json({ message: 'Business not found or not owned by user' });
    }

    const updatedSalary = await Salary.findByIdAndUpdate(
      req.params.id,
      {
        baseSalary,
        bonus,
        deductions,
        totalPaid,
        status
      },
      { new: true, runValidators: true }
    ).populate('employee');

    res.json(updatedSalary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete salary record
router.delete('/:id', auth, async (req, res) => {
  try {
    const salary = await Salary.findById(req.params.id).populate('employee');
    if (!salary) {
      return res.status(404).json({ message: 'Salary record not found' });
    }

    // Verify business ownership through employee
    const employee = await Employee.findById(salary.employee._id).populate('business');
    const business = await Business.findOne({ _id: employee.business._id, owner: req.user });
    if (!business) {
      return res.status(404).json({ message: 'Business not found or not owned by user' });
    }

    await Salary.findByIdAndDelete(req.params.id);
    res.json({ message: 'Salary record deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;