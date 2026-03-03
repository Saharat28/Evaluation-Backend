const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

// --- 1. เพิ่ม Import สำหรับ Swagger ---
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// --- 2. ตั้งค่า Swagger Options ---
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Personnel Evaluation API',
            version: '1.0.0',
            description: 'API Documentation สำหรับระบบประเมินผลบุคลากร',
        },
        servers: [
            {
                url: `http://localhost:${PORT}`,
                description: 'Local Development Server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                }
            }
        },
        // บังคับให้แสดงรูปแม่กุญแจ (Lock icon) เพื่อให้ใส่ Token ในการเทส
        security: [{ bearerAuth: [] }],
    },
    // ชี้ไปที่โฟลเดอร์ routes เพื่อให้ Swagger ไปอ่านคอมเมนต์
    apis: ['./src/routes/*.js', './routes/*.js'], 
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

// --- 3. สร้าง Endpoint สำหรับหน้า UI ของ Swagger ---
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

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
    console.log(`📄 Swagger UI is available at http://localhost:${PORT}/api-docs`); // แจ้ง URL ให้กดง่ายๆ
});

module.exports = app;
module.exports.prisma = prisma;