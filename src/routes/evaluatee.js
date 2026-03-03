const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticate, authorize } = require('../middleware/auth');

const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Invalid file type'), false);
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

router.use(authenticate, authorize(['EVALUATEE']));

router.get('/evaluations', async (req, res) => {
    try {
        const assignments = await prisma.assignment.findMany({
            where: { evaluateeId: req.user.id },
            include: {
                evaluator: { select: { name: true } },
                results: true,
                evaluation: { include: { topics: { include: { indicators: { include: { evidence: { where: { evaluateeId: req.user.id } } } } } } } }
            }
        });

        const payload = assignments.map(a => ({
            ...a.evaluation,
            assignmentId: a.id,
            evaluatorName: a.evaluator.name,
            results: a.results
        }));

        res.json(payload);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.post('/evaluations/:evaluationId/evidence', upload.single('file'), async (req, res) => {
    try {
        const { indicatorId } = req.body;
        const evaluateeId = req.user.id;

        if (!req.file) return res.status(400).json({ message: 'File is required' });

        const evidence = await prisma.evidence.upsert({
            where: { indicatorId_evaluateeId: { indicatorId: parseInt(indicatorId), evaluateeId } },
            update: { filePath: req.file.path, mimeType: req.file.mimetype, sizeBytes: req.file.size },
            create: { indicatorId: parseInt(indicatorId), evaluateeId, filePath: req.file.path, mimeType: req.file.mimetype, sizeBytes: req.file.size }
        });

        res.json(evidence);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
