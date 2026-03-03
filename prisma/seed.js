const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    const passwordHash = await bcrypt.hash('123456', 10);

    const itDept = await prisma.department.upsert({
        where: { name: 'IT' },
        update: {},
        create: { name: 'IT' }
    });

    const admin = await prisma.user.upsert({
        where: { email: 'admin@test.com' },
        update: {},
        create: { name: 'Admin User', email: 'admin@test.com', passwordHash, role: 'ADMIN', departmentId: itDept.id }
    });

    const evaluator = await prisma.user.upsert({
        where: { email: 'evaluator@test.com' },
        update: {},
        create: { name: 'Evaluator User', email: 'evaluator@test.com', passwordHash, role: 'EVALUATOR', departmentId: itDept.id }
    });

    const evaluatee = await prisma.user.upsert({
        where: { email: 'evaluatee@test.com' },
        update: {},
        create: { name: 'Evaluatee User', email: 'evaluatee@test.com', passwordHash, role: 'EVALUATEE', departmentId: itDept.id }
    });

    console.log('Seeded Users: admin, evaluator, evaluatee (all password: password123)');

    const evaluation = await prisma.evaluation.create({
        data: {
            name: 'Yearly Evaluation 2025',
            startAt: new Date(),
            endAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            status: 'OPEN',
            topics: {
                create: [
                    {
                        name: 'Technical Skills',
                        indicators: {
                            create: [
                                { name: 'NodeJS Proficiency', type: 'SCALE_1_4', weight: 30, requireEvidence: true },
                                { name: 'Database Design', type: 'SCALE_1_4', weight: 20, requireEvidence: false }
                            ]
                        }
                    },
                    {
                        name: 'Soft Skills',
                        indicators: {
                            create: [
                                { name: 'Communication', type: 'SCALE_1_4', weight: 25, requireEvidence: false },
                                { name: 'Teamwork', type: 'YES_NO', weight: 25, requireEvidence: false }
                            ]
                        }
                    }
                ]
            }
        }
    });

    console.log('Seeded Evaluation with Topics and Indicators');

    await prisma.assignment.create({
        data: {
            evaluationId: evaluation.id,
            evaluatorId: evaluator.id,
            evaluateeId: evaluatee.id
        }
    });

    console.log('Seeded Assignment');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
