const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const evaluateeRoutes = require('./routes/evaluatee');
const evaluatorRoutes = require('./routes/evaluator');
const reportRoutes = require('./routes/report');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/me', evaluateeRoutes);
app.use('/api/evaluator', evaluatorRoutes);
app.use('/api/reports', reportRoutes);

app.get('/', (req, res) => {
    res.send('Personnel Evaluation System API is running');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = { prisma };
