import express from 'express';
import Technician from '../models/Technician.js';
import User from '../models/User.js';

const router = express.Router();

// GET /api/technicians — list all technicians from MongoDB
router.get('/', async (req, res) => {
  try {
    const list = await Technician.find({});
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving technicians', error: err.message });
  }
});

// POST /api/technicians — register new technician directly into MongoDB
router.post('/', async (req, res) => {
  try {
    const { name, technician_name, specialty, specialization, phone, status, username, password } = req.body;
    const techName = name || technician_name;
    if (!techName) {
      return res.status(400).json({ message: 'Technician name is required' });
    }

    const techSpec = specialty || specialization || 'General';
    const techPhone = phone || 'N/A';

    // 1. Create in Technician collection
    const newTech = await Technician.create({
      technician_name: techName,
      specialization: techSpec,
      phone: techPhone,
      status: status || 'Active'
    });

    // 2. Sync to User collection so technician can log in
    if (username && password) {
      try {
        const initials = techName.split(' ').map(n => n[0]).join('').toUpperCase();
        await User.create({
          username,
          password,
          name: techName,
          initials,
          role: 'Technician',
          specialty: techSpec,
          phone: techPhone,
          status: 'On Shift'
        });
      } catch (uErr) {
        console.warn('Sync User login account:', uErr.message);
      }
    }

    res.status(201).json(newTech);
  } catch (err) {
    res.status(400).json({ message: 'Error registering technician', error: err.message });
  }
});

// PUT /api/technicians/:id — update technician in MongoDB
router.put('/:id', async (req, res) => {
  try {
    const { name, technician_name, specialty, specialization, phone, status } = req.body;
    const tech = await Technician.findById(req.params.id);
    if (!tech) {
      return res.status(404).json({ message: 'Technician not found' });
    }

    const oldName = tech.technician_name;
    if (name || technician_name) tech.technician_name = name || technician_name;
    if (specialty || specialization) tech.specialization = specialty || specialization;
    if (phone !== undefined) tech.phone = phone;
    if (status) tech.status = status;

    await tech.save();

    // Sync to User collection
    try {
      await User.findOneAndUpdate(
        { name: oldName, role: 'Technician' },
        {
          name: tech.technician_name,
          specialty: tech.specialization,
          phone: tech.phone
        }
      );
    } catch (uErr) {
      console.warn('Sync update user:', uErr.message);
    }

    res.json(tech);
  } catch (err) {
    res.status(400).json({ message: 'Error updating technician', error: err.message });
  }
});

// DELETE /api/technicians/:id — delete technician from MongoDB
router.delete('/:id', async (req, res) => {
  try {
    const tech = await Technician.findByIdAndDelete(req.params.id);
    if (!tech) {
      return res.status(404).json({ message: 'Technician not found' });
    }

    try {
      await User.findOneAndUpdate(
        { name: tech.technician_name, role: 'Technician' },
        { isDeleted: true, endDate: new Date() }
      );
    } catch (uErr) {
      console.warn('Sync delete user:', uErr.message);
    }

    res.json({ message: 'Technician deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting technician', error: err.message });
  }
});

export default router;
