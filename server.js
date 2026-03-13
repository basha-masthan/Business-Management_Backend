const express = require('express');
const cors = require('cors');
const connectDB = require('./db');

require('dotenv').config();

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the API' });
});

// Auth routes
app.use('/api/auth', require('./routes/auth'));

// Business routes
app.use('/api/businesses', require('./routes/business'));

// Investment routes
app.use('/api/investments', require('./routes/investment'));

// Income routes
app.use('/api/incomes', require('./routes/income'));

// Expenditure routes
app.use('/api/expenditures', require('./routes/expenditure'));

// Employee routes
app.use('/api/employees', require('./routes/employee'));

// Salary routes
app.use('/api/salary', require('./routes/salary'));

// Reports routes
app.use('/api/reports', require('./routes/reports'));

// Payment routes
app.use('/api/payments', require('./routes/payment'));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});