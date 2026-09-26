import express from 'express';
import Report from '../models/Report.js';

const router = express.Router();

// GET all reports
router.get('/', async (req, res) => {
  try {
    const reports = await Report.find({});
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new report
router.post('/', async (req, res) => {
  try {
    const report = new Report(req.body);
    await report.save();
    res.status(201).json(report);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
