import express from 'express';
import Equipment from '../models/Equipment.js';
import MaintenanceRequest from '../models/MaintenanceRequest.js';
import ServiceHistory from '../models/ServiceHistory.js';
import Maintenance from '../models/Maintenance.js';

const router = express.Router();

// Helper to normalize equipment documents for API responses
function formatEquipmentDoc(doc) {
  if (!doc) return doc;
  const item = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  const eqId = item.equipmentId || item.equipment_id || '';
  const eqName = item.name || item.equipment_name || '';
  return {
    ...item,
    equipmentId: eqId,
    equipment_id: eqId,
    name: eqName,
    equipment_name: eqName
  };
}

// Get all equipment
router.get('/', async (req, res) => {
  try {
    const list = await Equipment.find({});
    const allRequests = await MaintenanceRequest.find({});
    let modified = false;

    for (const eq of list) {
      const eqId = eq.equipmentId || eq.equipment_id;
      const activeReqs = allRequests.filter(
        r => (r.equipmentId === eqId || r.equipmentId === eq._id || r.equipmentId === eq.equipment_id) &&
             ['Pending', 'Assigned', 'In Progress'].includes(r.status)
      );

      if (activeReqs.length > 0) {
        const hasSevere = activeReqs.some(r => r.priority === 'Emergency' || r.priority === 'High');
        const targetStatus = hasSevere ? 'Broken' : 'Under Maintenance';
        if (eq.status !== targetStatus) {
          await Equipment.findByIdAndUpdate(eq._id || eqId, { status: targetStatus });
          modified = true;
        }
      }
    }

    const finalList = modified ? await Equipment.find({}) : list;
    res.json(finalList.map(formatEquipmentDoc));
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving equipment', error: error.message });
  }
});

// Get single equipment
router.get('/:id', async (req, res) => {
  try {
    const item = await Equipment.findById(req.params.id) || await Equipment.findOne({ $or: [{ equipmentId: req.params.id }, { equipment_id: req.params.id }] });
    if (!item) return res.status(404).json({ message: 'Equipment not found' });

    const eqId = item.equipmentId || item.equipment_id;
    const allRequests = await MaintenanceRequest.find({});
    const activeReqs = allRequests.filter(
      r => (r.equipmentId === eqId || r.equipmentId === item._id || r.equipmentId === item.equipment_id) &&
           ['Pending', 'Assigned', 'In Progress'].includes(r.status)
    );

    if (activeReqs.length > 0) {
      const hasSevere = activeReqs.some(r => r.priority === 'Emergency' || r.priority === 'High');
      const targetStatus = hasSevere ? 'Broken' : 'Under Maintenance';
      if (item.status !== targetStatus) {
        await Equipment.findByIdAndUpdate(item._id || eqId, { status: targetStatus });
      }
    }

    // Re-fetch to get updated status
    const updatedItem = await Equipment.findById(item._id);
    res.json(formatEquipmentDoc(updatedItem || item));
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving equipment details', error: error.message });
  }
});

// Create new equipment
router.post('/', async (req, res) => {
  try {
    const data = { ...req.body };
    const targetEqId = data.equipmentId || data.equipment_id;
    
    // Auto-generate equipment ID if not provided
    if (!targetEqId) {
      const list = await Equipment.find({});
      let maxNum = 0;
      let prefix = 'EQ-';
      let padLen = 4;

      list.forEach(eq => {
        const id = String(eq.equipmentId || eq.equipment_id || '').trim();
        const match = id.match(/^(.*?)(0*(\d+))$/);
        if (match) {
          const currentPrefix = match[1];
          const fullNumStr = match[2];
          const num = parseInt(match[3], 10);
          if (num > maxNum) {
            maxNum = num;
            prefix = currentPrefix;
            padLen = fullNumStr.length;
          }
        }
      });

      const nextNum = maxNum + 1;
      const nextNumStr = String(nextNum).padStart(padLen, '0');
      data.equipmentId = `${prefix}${nextNumStr}`;
      data.equipment_id = data.equipmentId;
    } else {
      data.equipmentId = targetEqId;
      data.equipment_id = targetEqId;
      const existing = await Equipment.findOne({ $or: [{ equipmentId: targetEqId }, { equipment_id: targetEqId }] });
      if (existing) {
        return res.status(400).json({ message: `Equipment with ID ${targetEqId} already exists` });
      }
    }

    const targetName = data.name || data.equipment_name || '';
    data.name = targetName;
    data.equipment_name = targetName;

    // Set next PM date based on installation date and frequency if not set
    if (!data.nextPreventiveMaintenance) {
      const start = data.installationDate ? new Date(data.installationDate) : new Date();
      const nextDate = new Date(start);
      if (data.pmFrequency === 'Monthly') nextDate.setMonth(nextDate.getMonth() + 1);
      else if (data.pmFrequency === 'Quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
      else if (data.pmFrequency === 'Semi-Annually') nextDate.setMonth(nextDate.getMonth() + 6);
      else nextDate.setFullYear(nextDate.getFullYear() + 1);
      
      data.nextPreventiveMaintenance = nextDate.toISOString();
    }

    // Default warranty expiration if not explicitly provided
    if (!data.warrantyExpiration) {
      const start = data.installationDate ? new Date(data.installationDate) : new Date();
      const wDate = new Date(start);
      wDate.setFullYear(wDate.getFullYear() + 1);
      data.warrantyExpiration = wDate.toISOString();
    }

    const newEquipment = await Equipment.create(data);
    res.status(201).json(formatEquipmentDoc(newEquipment));
  } catch (error) {
    res.status(400).json({ message: 'Error registering equipment', error: error.message });
  }
});

// Update equipment
router.put('/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    const targetEqId = data.equipmentId || data.equipment_id;
    if (targetEqId) {
      data.equipmentId = targetEqId;
      data.equipment_id = targetEqId;
      const existing = await Equipment.findOne({ $or: [{ equipmentId: targetEqId }, { equipment_id: targetEqId }] });
      if (existing && existing._id.toString() !== req.params.id) {
        return res.status(400).json({ message: `Equipment with ID ${targetEqId} already exists` });
      }
    }
    const targetName = data.name || data.equipment_name;
    if (targetName) {
      data.name = targetName;
      data.equipment_name = targetName;
    }

    const updated = await Equipment.findByIdAndUpdate(
      req.params.id,
      { $set: data },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Equipment not found' });
    res.json(formatEquipmentDoc(updated));
  } catch (error) {
    res.status(400).json({ message: 'Error updating equipment', error: error.message });
  }
});

// Manually trigger PM schedule update
router.post('/:id/pm', async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) return res.status(404).json({ message: 'Equipment not found' });

    // Calculate next PM date
    const nextDate = new Date();
    if (equipment.pmFrequency === 'Monthly') nextDate.setMonth(nextDate.getMonth() + 1);
    else if (equipment.pmFrequency === 'Quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
    else if (equipment.pmFrequency === 'Semi-Annually') nextDate.setMonth(nextDate.getMonth() + 6);
    else nextDate.setFullYear(nextDate.getFullYear() + 1);

    equipment.nextPreventiveMaintenance = nextDate;
    await equipment.save();

    res.json({ message: 'Preventive maintenance schedule updated', nextPreventiveMaintenance: nextDate });
  } catch (error) {
    res.status(500).json({ message: 'Error scheduling PM', error: error.message });
  }
});

// Delete equipment
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Equipment.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Equipment not found' });
    res.json({ message: 'Equipment deleted successfully', equipment: deleted });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting equipment', error: error.message });
  }
});

// GET /api/equipment/:id/history - Get maintenance history for specific equipment
router.get('/:id/history', async (req, res) => {
  try {
    const paramId = req.params.id;
    let equipment = await Equipment.findById(paramId).catch(() => null);
    if (!equipment) {
      equipment = await Equipment.findOne({ $or: [{ equipmentId: paramId }, { equipment_id: paramId }] });
    }
    if (!equipment) return res.status(404).json({ message: 'Equipment not found' });

    const resolvedId = equipment.equipmentId || equipment.equipment_id;
    const history = await ServiceHistory.find({});
    const filtered = history
      .filter(h => h.equipmentId === resolvedId || h.equipmentId === equipment._id || h.equipmentId === equipment.equipment_id)
      .sort((a, b) => {
        const timeA = Math.max(new Date(a.completedAt || 0).getTime(), new Date(a.createdAt || 0).getTime(), new Date(a.updatedAt || 0).getTime());
        const timeB = Math.max(new Date(b.completedAt || 0).getTime(), new Date(b.createdAt || 0).getTime(), new Date(b.updatedAt || 0).getTime());
        return timeB - timeA;
      });

    res.json({ equipment, history: filtered });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving equipment maintenance history', error: error.message });
  }
});

// POST /api/equipment/:id/maintenance - Record a maintenance event directly on equipment
router.post('/:id/maintenance', async (req, res) => {
  try {
    const paramId = req.params.id;
    let equipment = null;

    if (paramId && paramId !== 'undefined' && paramId !== 'null') {
      equipment = await Equipment.findById(paramId).catch(() => null);
      if (!equipment) {
        equipment = await Equipment.findOne({ $or: [{ equipmentId: paramId }, { equipment_id: paramId }] }).catch(() => null);
      }
    }

    if (!equipment && (req.body.equipmentId || req.body.equipment_id)) {
      const bodyEqId = req.body.equipmentId || req.body.equipment_id;
      equipment = await Equipment.findById(bodyEqId).catch(() => null);
      if (!equipment) {
        equipment = await Equipment.findOne({ $or: [{ equipmentId: bodyEqId }, { equipment_id: bodyEqId }] }).catch(() => null);
      }
    }

    if (!equipment) return res.status(404).json({ message: `Equipment not found with ID "${paramId}"` });

    const {
      serviceType,
      actionTaken,
      partsReplaced,
      cost,
      downtimeHours,
      completedBy,
      notes,
      updatePmSchedule = true,
      customNextPmDate,
      completedAt
    } = req.body;

    if (!actionTaken || typeof actionTaken !== 'string' || !actionTaken.trim()) {
      return res.status(400).json({ message: 'Action taken / maintenance description is required' });
    }

    let validCompletedAt = new Date();
    if (completedAt) {
      const parsed = new Date(completedAt);
      if (!isNaN(parsed.getTime())) {
        validCompletedAt = parsed;
      }
    }

    // Update PM schedule if requested
    if (updatePmSchedule) {
      if (customNextPmDate) {
        const customDate = new Date(customNextPmDate);
        if (!isNaN(customDate.getTime())) {
          equipment.nextPreventiveMaintenance = customDate.toISOString();
        }
      } else {
        const nextDate = new Date();
        if (equipment.pmFrequency === 'Monthly') nextDate.setMonth(nextDate.getMonth() + 1);
        else if (equipment.pmFrequency === 'Quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
        else if (equipment.pmFrequency === 'Semi-Annually') nextDate.setMonth(nextDate.getMonth() + 6);
        else nextDate.setFullYear(nextDate.getFullYear() + 1);
        equipment.nextPreventiveMaintenance = nextDate.toISOString();
      }
    }

    if (equipment.status === 'Under Maintenance' || equipment.status === 'Broken') {
      equipment.status = 'Operational';
    }

    await equipment.save();

    const resolvedEqId = equipment.equipmentId || equipment.equipment_id || equipment._id;

    // Create service history record
    const historyRecord = await ServiceHistory.create({
      equipmentId: resolvedEqId,
      requestId: '', // Direct equipment maintenance (not a complaint)
      serviceType: serviceType || 'Preventive Maintenance',
      actionTaken: actionTaken.trim(),
      partsReplaced: partsReplaced || 'None',
      cost: Number(cost) || 0,
      downtimeHours: Number(downtimeHours) || 0,
      completedAt: validCompletedAt.toISOString(),
      completedBy: completedBy || 'Technician',
      department: equipment.department,
      status: 'Completed',
      notes: notes || ''
    });

    // Also sync record to Maintenance model
    try {
      await Maintenance.create({
        technician_id: completedBy || 'Technician',
        equipment_id: resolvedEqId,
        equipmentId: resolvedEqId,
        maintenance_id: `MAIN-${Date.now()}`,
        schedule_date: validCompletedAt,
        cost: Number(cost) || 0,
        maintenance_status: 'Completed',
        remarks: actionTaken.trim()
      });
    } catch (mErr) {
      console.warn('Sync to Maintenance:', mErr.message);
    }

    res.status(201).json({
      message: 'Equipment maintenance recorded successfully',
      serviceHistory: historyRecord,
      equipment
    });
  } catch (error) {
    res.status(500).json({ message: 'Error recording equipment maintenance', error: error.message });
  }
});

export default router;
