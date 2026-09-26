import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './database/db.js';
import { seedDatabase } from './database/seed.js';

// Import Routes
import equipmentRouter from './routes/equipment.js';
import requestsRouter from './routes/requests.js';
import analyticsRouter from './routes/analytics.js';
import departmentsRouter from './routes/departments.js';
import usersRouter from './routes/users.js';
import complaintsRouter from './routes/complaints.js';
import maintenanceRouter from './routes/maintenance.js';
import reportsRouter from './routes/reports.js';
import techniciansRouter from './routes/technicians.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/equipment', equipmentRouter);
app.use('/api/requests', requestsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/departments', departmentsRouter);
app.use('/api/users', usersRouter);
app.use('/api/complaints', complaintsRouter);
app.use('/api/maintenance', maintenanceRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/technicians', techniciansRouter);

app.get('/', (req, res) => {
  res.json({ message: 'Hospital Equipment Maintenance Tracker API is running' });
});

// Start Server
app.listen(PORT, async () => {
  await connectDB();
  await seedDatabase();
  console.log(`Server running on port ${PORT}`);
});
