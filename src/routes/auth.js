const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, departmentId } = req.body;
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { name, email, passwordHash, role, departmentId: departmentId ? parseInt(departmentId) : null }
        });
        res.status(201).json({ message: 'User registered', userId: user.id });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

const { authenticate } = require('../middleware/auth');
router.get('/me', authenticate, (req, res) => {
    res.json(req.user);
});

module.exports = router;
