import express from 'express';
import Complaint from '../models/Complaint.js';

const router = express.Router();

// GET all complaints
router.get('/', async (req, res) => {
  try {
    const complaints = await Complaint.find({});
    res.json(complaints);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new complaint
router.post('/', async (req, res) => {
  try {
    const complaint = new Complaint(req.body);
    await complaint.save();
    res.status(201).json(complaint);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
