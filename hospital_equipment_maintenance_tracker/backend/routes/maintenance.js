import express from 'express';
import Maintenance from '../models/Maintenance.js';
import ServiceHistory from '../models/ServiceHistory.js';
import Equipment from '../models/Equipment.js';

const router = express.Router();

// GET all maintenance records
router.get('/', async (req, res) => {
  try {
    const records = await Maintenance.find({});
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new maintenance record
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    const targetEqId = data.equipmentId || data.equipment_id || '';
    const techName = data.completedBy || data.technician_id || 'Technician';
    const action = data.actionTaken || data.remarks || 'Routine Maintenance';

    const record = await Maintenance.create({
      technician_id: techName,
      equipment_id: targetEqId || 'EQ-1001',
      equipmentId: targetEqId || 'EQ-1001',
      maintenance_id: data.maintenance_id || `MAIN-${Date.now()}`,
      schedule_date: data.schedule_date ? new Date(data.schedule_date) : new Date(),
      cost: Number(data.cost) || 0,
      maintenance_status: data.maintenance_status || 'Completed',
      remarks: action
    });

    if (targetEqId) {
      const eq = await Equipment.findOne({ $or: [{ equipmentId: targetEqId }, { equipment_id: targetEqId }] }).catch(() => null);
      await ServiceHistory.create({
        equipmentId: targetEqId,
        serviceType: data.serviceType || 'Preventive Maintenance',
        actionTaken: action,
        partsReplaced: data.partsReplaced || 'None',
        cost: Number(data.cost) || 0,
        downtimeHours: Number(data.downtimeHours) || 0,
        completedAt: data.completedAt ? new Date(data.completedAt) : new Date(),
        completedBy: techName,
        department: data.department || (eq ? eq.department : ''),
        status: 'Completed',
        notes: data.notes || ''
      }).catch(() => null);

      if (eq && (eq.status === 'Under Maintenance' || eq.status === 'Broken')) {
        eq.status = 'Operational';
        await eq.save().catch(() => null);
      }
    }

    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ message: 'Error saving maintenance record', error: err.message });
  }
});

export default router;

