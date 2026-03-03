const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize(['ADMIN']));

// Evaluation CRUD
router.post('/evaluations', async (req, res) => {
    try {
        const { name, startAt, endAt } = req.body;
        const evaluation = await prisma.evaluation.create({
            data: { name, startAt: new Date(startAt), endAt: new Date(endAt) }
        });
        res.status(201).json(evaluation);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.put('/evaluations/:id', async (req, res) => {
    try {
        const { name, startAt, endAt } = req.body;
        const evaluation = await prisma.evaluation.update({
            where: { id: parseInt(req.params.id) },
            data: { name, startAt: new Date(startAt), endAt: new Date(endAt) }
        });
        res.json(evaluation);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.put('/evaluations/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        if (!['OPEN', 'CLOSED', 'DRAFT'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const evaluation = await prisma.evaluation.update({
            where: { id: parseInt(req.params.id) },
            data: { status }
        });
        res.json(evaluation);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/evaluations/:id', async (req, res) => {
    try {
        const evaluationId = parseInt(req.params.id);

        // Manual cascade delete
        const topics = await prisma.topic.findMany({ where: { evaluationId }, select: { id: true } });
        const topicIds = topics.map(t => t.id);

        if (topicIds.length > 0) {
            const indicators = await prisma.indicator.findMany({ where: { topicId: { in: topicIds } }, select: { id: true } });
            const indicatorIds = indicators.map(i => i.id);

            if (indicatorIds.length > 0) {
                await prisma.evidence.deleteMany({ where: { indicatorId: { in: indicatorIds } } });
                await prisma.evaluationResult.deleteMany({ where: { indicatorId: { in: indicatorIds } } });
                await prisma.indicator.deleteMany({ where: { topicId: { in: topicIds } } });
            }
            await prisma.topic.deleteMany({ where: { evaluationId } });
        }

        const assignments = await prisma.assignment.findMany({ where: { evaluationId }, select: { id: true } });
        const assignmentIds = assignments.map(a => a.id);

        if (assignmentIds.length > 0) {
            await prisma.evaluationResult.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
            await prisma.assignment.deleteMany({ where: { evaluationId } });
        }

        await prisma.evaluation.delete({ where: { id: evaluationId } });
        res.status(204).end();
    } catch (err) {
        console.error(err);
        res.status(400).json({ message: err.message });
    }
});

router.get('/evaluations', async (req, res) => {
    const evaluations = await prisma.evaluation.findMany({
        include: {
            topics: { include: { indicators: true } },
            assignments: { include: { evaluator: { select: { name: true, role: true } }, evaluatee: { select: { name: true, role: true } } } }
        }
    });
    res.json(evaluations);
});

router.get('/users', async (req, res) => {
    const users = await prisma.user.findMany({
        where: { role: { in: ['EVALUATOR', 'EVALUATEE'] } },
        select: { id: true, name: true, role: true, department: true }
    });
    res.json(users);
});

// Topics & Indicators
router.post('/evaluations/:id/topics', async (req, res) => {
    try {
        const topic = await prisma.topic.create({
            data: { name: req.body.name, evaluationId: parseInt(req.params.id) }
        });
        res.status(201).json(topic);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/topics/:id', async (req, res) => {
    try {
        const topicId = parseInt(req.params.id);

        const indicators = await prisma.indicator.findMany({ where: { topicId }, select: { id: true } });
        const indicatorIds = indicators.map(i => i.id);

        if (indicatorIds.length > 0) {
            await prisma.evidence.deleteMany({ where: { indicatorId: { in: indicatorIds } } });
            await prisma.evaluationResult.deleteMany({ where: { indicatorId: { in: indicatorIds } } });
            await prisma.indicator.deleteMany({ where: { topicId } });
        }

        await prisma.topic.delete({ where: { id: topicId } });
        res.status(204).end();
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.post('/topics/:id/indicators', async (req, res) => {
    try {
        const { name, type, weight, requireEvidence } = req.body;
        const topicId = parseInt(req.params.id);

        // Check total weight logic
        const topic = await prisma.topic.findUnique({ where: { id: topicId }, include: { evaluation: { include: { topics: { include: { indicators: true } } } } } });
        const currentWeight = topic.evaluation.topics.reduce((acc, t) => acc + t.indicators.reduce((a, i) => a + i.weight, 0), 0);

        if (currentWeight + parseFloat(weight) > 100) {
            return res.status(400).json({ message: 'น้ำหนักรวมทั้งหมดในแบบประเมินต้องไม่เกิน 100%' });
        }

        const indicator = await prisma.indicator.create({
            data: { name, type, weight: parseFloat(weight), requireEvidence: !!requireEvidence, topicId }
        });
        res.status(201).json(indicator);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.put('/indicators/:id', async (req, res) => {
    try {
        const { name, type, weight, requireEvidence } = req.body;
        const indicatorId = parseInt(req.params.id);

        const currentInd = await prisma.indicator.findUnique({ where: { id: indicatorId }, include: { topic: { include: { evaluation: { include: { topics: { include: { indicators: true } } } } } } } });
        if (!currentInd) return res.status(404).json({ message: 'Indicator not found' });

        const currentWeight = currentInd.topic.evaluation.topics.reduce((acc, t) => acc + t.indicators.reduce((a, i) => a + i.weight, 0), 0);

        if ((currentWeight - currentInd.weight) + parseFloat(weight) > 100) {
            return res.status(400).json({ message: 'น้ำหนักรวมทั้งหมดในแบบประเมินต้องไม่เกิน 100%' });
        }

        const indicator = await prisma.indicator.update({
            where: { id: indicatorId },
            data: { name, type, weight: parseFloat(weight), requireEvidence: !!requireEvidence }
        });
        res.json(indicator);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/indicators/:id', async (req, res) => {
    try {
        await prisma.indicator.delete({ where: { id: parseInt(req.params.id) } });
        res.status(204).end();
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Assignments
router.post('/assignments', async (req, res) => {
    try {
        const { evaluationId, evaluatorId, evaluateeId } = req.body;
        if (evaluatorId === evaluateeId) {
            return res.status(400).json({ message: 'Evaluator and Evaluatee must be different' });
        }
        const assignment = await prisma.assignment.create({
            data: { evaluationId: parseInt(evaluationId), evaluatorId: parseInt(evaluatorId), evaluateeId: parseInt(evaluateeId) }
        });
        res.status(201).json(assignment);
    } catch (err) {
        if (err.code === 'P2002') return res.status(409).json({ message: 'DUPLICATE_ASSIGNMENT' });
        res.status(400).json({ message: err.message });
    }
});

router.delete('/assignments/:id', async (req, res) => {
    try {
        await prisma.assignment.delete({ where: { id: parseInt(req.params.id) } });
        res.status(204).end();
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
