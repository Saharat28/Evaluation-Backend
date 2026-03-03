const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticate, authorize } = require('../middleware/auth');

router.get('/evaluation/:evaluationId/result', authenticate, async (req, res) => {
    try {
        const evaluationId = parseInt(req.params.evaluationId);
        const userId = req.user.id;
        const role = req.user.role;

        let assignments = await prisma.assignment.findMany({
            where: { evaluationId },
            include: {
                evaluatee: true,
                evaluator: true,
                results: { include: { indicator: true } }
            }
        });

        // RBAC
        if (role === 'EVALUATEE') {
            assignments = assignments.filter(a => a.evaluateeId === userId);
        } else if (role === 'EVALUATOR') {
            assignments = assignments.filter(a => a.evaluatorId === userId);
        }

        const report = assignments.map(a => {
            let totalScore = 0;
            const details = a.results.map(r => {
                let adjusted = 0;
                if (r.indicator.type === 'SCALE_1_4') {
                    adjusted = (r.score / 4) * r.indicator.weight;
                } else if (r.indicator.type === 'YES_NO') {
                    adjusted = (r.score === 1 ? 1 : 0) * r.indicator.weight;
                }
                totalScore += adjusted;
                return { indicator: r.indicator.name, score: r.score, weight: r.indicator.weight, adjusted };
            });

            return {
                assignmentId: a.id,
                evaluatee: a.evaluatee.name,
                evaluator: a.evaluator.name,
                totalScore: totalScore.toFixed(2),
                details
            };
        });

        res.json(report);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
