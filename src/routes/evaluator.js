const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize(['EVALUATOR', 'ADMIN']));

router.get('/evaluations', async (req, res) => {
    try {
        const assignments = await prisma.assignment.findMany({
            where: { evaluatorId: req.user.id },
            include: { evaluation: true }
        });

        const evaluationsMap = new Map();
        assignments.forEach(a => {
            if (!evaluationsMap.has(a.evaluationId)) {
                evaluationsMap.set(a.evaluationId, a.evaluation);
            }
        });

        res.json(Array.from(evaluationsMap.values()));
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.get('/evaluations/:evaluationId', async (req, res) => {
    try {
        const evaluationId = parseInt(req.params.evaluationId);
        const assignments = await prisma.assignment.findMany({
            where: { evaluationId, evaluatorId: req.user.id },
            include: { evaluatee: true, results: true, evaluation: { include: { topics: { include: { indicators: true } } } } }
        });
        res.json(assignments);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.get('/assignments/:id', async (req, res) => {
    try {
        const assignmentId = parseInt(req.params.id);
        const assignmentBase = await prisma.assignment.findUnique({ where: { id: assignmentId } });

        if (!assignmentBase || assignmentBase.evaluatorId !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const assignment = await prisma.assignment.findUnique({
            where: { id: assignmentId },
            include: {
                evaluatee: true,
                evaluation: {
                    include: {
                        topics: {
                            include: {
                                indicators: {
                                    include: {
                                        evidence: {
                                            where: { evaluateeId: assignmentBase.evaluateeId }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });



        const results = await prisma.evaluationResult.findMany({
            where: { assignmentId }
        });

        res.json({ assignment, results });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.post('/assignments/:id/score', async (req, res) => {
    try {
        const assignmentId = parseInt(req.params.id);
        const { indicatorId, score } = req.body;

        const assignment = await prisma.assignment.findUnique({
            where: { id: assignmentId },
            include: { evaluatee: true }
        });

        if (assignment.evaluatorId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Not authorized for this assignment' });
        }

        const indicator = await prisma.indicator.findUnique({ where: { id: parseInt(indicatorId) } });
        if (indicator.requireEvidence) {
            const evidence = await prisma.evidence.findUnique({
                where: { indicatorId_evaluateeId: { indicatorId: indicator.id, evaluateeId: assignment.evaluateeId } }
            });
            if (!evidence) {
                return res.status(400).json({ message: 'จำเป็นต้องให้ผู้รับการประเมินแนบไฟล์หลักฐานในข้อนี้ก่อน' });
            }
        }

        const result = await prisma.evaluationResult.upsert({
            where: { assignmentId_indicatorId: { assignmentId, indicatorId: parseInt(indicatorId) } },
            update: { score: parseInt(score) },
            create: { assignmentId, indicatorId: parseInt(indicatorId), score: parseInt(score) }
        });

        res.json(result);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
