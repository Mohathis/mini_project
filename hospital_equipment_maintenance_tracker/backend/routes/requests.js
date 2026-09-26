import express from 'express';
import MaintenanceRequest from '../models/MaintenanceRequest.js';
import Equipment from '../models/Equipment.js';
import ServiceHistory from '../models/ServiceHistory.js';

const router = express.Router();

// Helper: resolve equipmentId string → populate equipment details into a request list
async function populateEquipment(requestList) {
  const allEquipment = await Equipment.find({});
  return requestList.map(req => {
    const reqObj = req.toObject ? req.toObject() : JSON.parse(JSON.stringify(req));
    const eq = allEquipment.find(e => e.equipmentId === reqObj.equipmentId || e._id === reqObj.equipmentId);
    const eqObj = eq ? (eq.toObject ? eq.toObject() : JSON.parse(JSON.stringify(eq))) : null;
    return { ...reqObj, equipmentId: eqObj ? { ...eqObj } : reqObj.equipmentId };
  });
}

// GET /api/requests — all requests, sorted newest first, equipment populated
router.get('/', async (req, res) => {
  try {
    let list = await MaintenanceRequest.find({});
    list = list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    list = await populateEquipment(list);
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving maintenance requests', error: error.message });
  }
});

// POST /api/requests — submit a new complaint
router.post('/', async (req, res) => {
  try {
    const { equipmentId, issueDescription, priority, reportedBy, department } = req.body;

    if (!equipmentId) {
      return res.status(400).json({ message: 'Equipment ID is required' });
    }

    // Safely find equipment instance without throwing CastError on custom equipmentId strings
    let eqInstance = await Equipment.findOne({
      $or: [{ equipmentId: equipmentId }, { equipment_id: equipmentId }]
    }).catch(() => null);

    if (!eqInstance) {
      eqInstance = await Equipment.findById(equipmentId).catch(() => null);
    }

    if (!eqInstance) {
      return res.status(404).json({ message: `Equipment not found with ID "${equipmentId}"` });
    }

    const resolvedEqId = eqInstance.equipmentId || eqInstance.equipment_id || String(eqInstance._id);

    // Duplicate complaint check
    const isPM = issueDescription && (issueDescription.includes('Preventive Maintenance') || issueDescription.includes('scheduled PM'));
    const allRequests = await MaintenanceRequest.find({});
    const activeRequests = allRequests.filter(
      r => (r.equipmentId === resolvedEqId || r.equipmentId === String(eqInstance._id) || r.equipmentId === eqInstance.equipmentId || r.equipmentId === eqInstance.equipment_id) &&
           ['Pending', 'Assigned', 'In Progress'].includes(r.status)
    );

    if (activeRequests.length > 0 && !isPM) {
      const existing = activeRequests[0];
      return res.status(400).json({
        message: 'Duplicate request detected.',
        isDuplicate: true,
        activeRequest: {
          requestId: existing.requestId,
          status: existing.status,
          reportedBy: existing.reportedBy,
          createdAt: existing.createdAt
        }
      });
    }

    // Auto-generate Request ID
    const totalCount = await MaintenanceRequest.countDocuments({});
    const requestId = `MR-${2000 + totalCount + 1}`;

    const newRequest = await MaintenanceRequest.create({
      requestId,
      equipmentId: resolvedEqId,
      issueDescription: (issueDescription || '').trim(),
      priority: priority || 'Medium',
      reportedBy: (reportedBy || 'Staff').trim(),
      department: department || eqInstance.department || 'General',
      status: 'Pending'
    });

    // Update equipment status using the instance
    if (priority === 'Emergency' || priority === 'High') {
      eqInstance.status = 'Broken';
    } else {
      eqInstance.status = 'Under Maintenance';
    }
    await eqInstance.save();

    res.status(201).json(newRequest);
  } catch (error) {
    res.status(400).json({ message: 'Error creating maintenance request', error: error.message });
  }
});

// PUT /api/requests/:id — update a request (assign, progress, cancel, complete)
router.put('/:id', async (req, res) => {
  try {
    // findById returns instance with save() method
    const request = await MaintenanceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Maintenance request not found' });

    const {
      status, assignedTechnician, assignDate, targetCompletionDate, managerNotes,
      actionTaken, partsReplaced, cost, downtimeHours, repairDate
    } = req.body;

    if (repairDate) {
      const todayStr = new Date().toISOString().substring(0, 10);
      const repairDateStr = new Date(repairDate).toISOString().substring(0, 10);
      if (repairDateStr > todayStr) {
        return res.status(400).json({ message: 'Repair date cannot be in the future. Please select today or a previous date.' });
      }
    }

    const previousStatus = request.status;
    const eqId = request.equipmentId;

    if (status) request.status = status;
    if (assignedTechnician !== undefined) request.assignedTechnician = assignedTechnician;
    if (assignDate !== undefined) {
      if (assignDate) {
        const todayStr = new Date().toISOString().substring(0, 10);
        const assignStr = new Date(assignDate).toISOString().substring(0, 10);
        if (assignStr < todayStr) {
          return res.status(400).json({ message: 'Assign date cannot be in the past' });
        }
      }
      request.assignDate = assignDate;
    }
    if (targetCompletionDate !== undefined) request.targetCompletionDate = targetCompletionDate;
    if (managerNotes !== undefined) request.managerNotes = managerNotes;

    // Auto-promote to Assigned when technician is first set on a Pending ticket
    if (assignedTechnician && previousStatus === 'Pending' && (!status || status === 'Pending')) {
      request.status = 'Assigned';
    }

    await request.save();

    // On Completion: restore equipment status + create service history log
    if (status === 'Completed' && previousStatus !== 'Completed') {
      const eqInstance = await Equipment.findOne({ equipmentId: eqId }) || await Equipment.findById(eqId);
      if (eqInstance) {
        eqInstance.status = 'Operational';
        const desc = (request.issueDescription || '').toLowerCase();
        if (desc.includes('preventive maintenance') || desc.includes('scheduled pm')) {
          const nextDate = new Date();
          if (eqInstance.pmFrequency === 'Monthly') nextDate.setMonth(nextDate.getMonth() + 1);
          else if (eqInstance.pmFrequency === 'Quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
          else if (eqInstance.pmFrequency === 'Semi-Annually') nextDate.setMonth(nextDate.getMonth() + 6);
          else nextDate.setFullYear(nextDate.getFullYear() + 1);
          eqInstance.nextPreventiveMaintenance = nextDate.toISOString();
        }
        await eqInstance.save();
      }

      await ServiceHistory.create({
        equipmentId: eqId,
        requestId: request.requestId,
        department: request.department || (eqInstance ? eqInstance.department : ''),
        actionTaken: actionTaken || 'Repair and diagnostic check completed.',
        partsReplaced: partsReplaced || 'None',
        cost: Number(cost) || 0,
        downtimeHours: Number(downtimeHours) || 0,
        completedAt: repairDate ? new Date(repairDate).toISOString() : new Date().toISOString(),
        completedBy: request.assignedTechnician || assignedTechnician || 'Technician',
        reportedBy: request.reportedBy || '',
        status: status || 'Completed'
      });

      // Remove complaint completely from complaints collection once completed
      await MaintenanceRequest.findByIdAndDelete(request._id);
    }

    // On Cancellation: restore equipment status if no other active tickets
    if (status === 'Cancelled' && previousStatus !== 'Cancelled') {
      const eqInstance = await Equipment.findOne({ equipmentId: eqId }) || await Equipment.findById(eqId);
      if (eqInstance) {
        const allRequests = await MaintenanceRequest.find({});
        const stillActive = allRequests.filter(
          r => r.equipmentId === eqId &&
               ['Pending', 'Assigned', 'In Progress'].includes(r.status) &&
               r._id !== request._id
        );
        if (stillActive.length === 0) {
          eqInstance.status = 'Operational';
          await eqInstance.save();
        }
      }
    }

    res.json(request);
  } catch (error) {
    res.status(400).json({ message: 'Error updating maintenance request', error: error.message });
  }
});

// GET /api/requests/history/all — full service history log
router.get('/history/all', async (req, res) => {
  try {
    let history = await ServiceHistory.find({});
    history = history.sort((a, b) => {
      const timeA = Math.max(new Date(a.completedAt || 0).getTime(), new Date(a.createdAt || 0).getTime(), new Date(a.updatedAt || 0).getTime());
      const timeB = Math.max(new Date(b.completedAt || 0).getTime(), new Date(b.createdAt || 0).getTime(), new Date(b.updatedAt || 0).getTime());
      return timeB - timeA;
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving service history', error: error.message });
  }
});

export default router;
