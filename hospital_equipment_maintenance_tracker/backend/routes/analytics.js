import express from 'express';
import Equipment from '../models/Equipment.js';
import MaintenanceRequest from '../models/MaintenanceRequest.js';
import ServiceHistory from '../models/ServiceHistory.js';

const router = express.Router();

// Get general dashboard summaries
router.get('/summary', async (req, res) => {
  try {
    const totalAssets = await Equipment.countDocuments({});
    const operationalAssets = await Equipment.countDocuments({ status: 'Operational' });
    const underMaintenance = await Equipment.countDocuments({ status: 'Under Maintenance' });
    const brokenAssets = await Equipment.countDocuments({ status: 'Broken' });
    const retiredAssets = await Equipment.countDocuments({ status: 'Retired' });

    const totalRequests = await MaintenanceRequest.countDocuments({});
    const activeRequests = await MaintenanceRequest.countDocuments({ status: { $in: ['Pending', 'Assigned', 'In Progress'] } });
    const pendingRequests = await MaintenanceRequest.countDocuments({ status: 'Pending' });
    const completedRequests = await MaintenanceRequest.countDocuments({ status: 'Completed' });

    // Calculate upcoming/overdue PM schedules
    const now = new Date();
    const next7Days = new Date();
    next7Days.setDate(now.getDate() + 7);

    const equipments = await Equipment.find({});
    let overduePM = 0;
    let dueSoonPM = 0;

    equipments.forEach(eq => {
      if (eq.status !== 'Retired' && eq.nextPreventiveMaintenance) {
        const pmDate = new Date(eq.nextPreventiveMaintenance);
        if (pmDate < now) {
          overduePM++;
        } else if (pmDate <= next7Days) {
          dueSoonPM++;
        }
      }
    });

    res.json({
      assets: {
        total: totalAssets,
        operational: operationalAssets,
        underMaintenance,
        broken: brokenAssets,
        retired: retiredAssets
      },
      requests: {
        total: totalRequests,
        active: activeRequests,
        pending: pendingRequests,
        completed: completedRequests
      },
      pm: {
        overdue: overduePM,
        dueSoon: dueSoonPM
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error compiling summary statistics', error: error.message });
  }
});

// Get detailed chart analytics
router.get('/charts', async (req, res) => {
  try {
    const equipments = await Equipment.find({});
    const requests = await MaintenanceRequest.find({});
    const history = await ServiceHistory.find({});

    // 1. Equipment Category distribution
    const categoryCount = { Medical: 0, Electronic: 0, IT: 0, Future: 0 };
    // 2. Departmental equipment distribution
    const departmentCount = {
      Emergency: 0,
      OPD: 0,
      Laboratory: 0,
      Pharmacy: 0,
      Radiology: 0,
      Administration: 0
    };

    equipments.forEach(eq => {
      if (categoryCount[eq.category] !== undefined) {
        categoryCount[eq.category]++;
      }
      if (departmentCount[eq.department] !== undefined) {
        departmentCount[eq.department]++;
      }
    });

    const categoryData = Object.keys(categoryCount).map(name => ({
      name,
      value: categoryCount[name]
    }));

    const departmentData = Object.keys(departmentCount).map(name => ({
      name,
      value: departmentCount[name]
    }));

    // 3. Request Status and Priority breakdown
    const priorityCount = { Low: 0, Medium: 0, High: 0, Emergency: 0 };
    requests.forEach(r => {
      if (r.status !== 'Completed' && r.status !== 'Cancelled') {
        if (priorityCount[r.priority] !== undefined) {
          priorityCount[r.priority]++;
        }
      }
    });

    const priorityData = Object.keys(priorityCount).map(name => ({
      name,
      value: priorityCount[name]
    }));

    // 4. Financial & Downtime history aggregates (by Category)
    const costByCategory = { Medical: 0, Electronic: 0, IT: 0, Future: 0 };
    const downtimeByCategory = { Medical: 0, Electronic: 0, IT: 0, Future: 0 };

    history.forEach(hist => {
      // Find the equipment's category
      const eq = equipments.find(e => e.equipmentId === hist.equipmentId || e._id === hist.equipmentId);
      if (eq && costByCategory[eq.category] !== undefined) {
        costByCategory[eq.category] += hist.cost || 0;
        downtimeByCategory[eq.category] += hist.downtimeHours || 0;
      }
    });

    const performanceData = Object.keys(costByCategory).map(name => ({
      name,
      cost: costByCategory[name],
      downtime: downtimeByCategory[name]
    }));

    // 5. Technician workloads (number of currently active tasks)
    const techWorkload = {};
    requests.forEach(r => {
      if (['Assigned', 'In Progress'].includes(r.status) && r.assignedTechnician) {
        techWorkload[r.assignedTechnician] = (techWorkload[r.assignedTechnician] || 0) + 1;
      }
    });

    const technicianData = Object.keys(techWorkload).map(name => ({
      name,
      tasks: techWorkload[name]
    }));

    res.json({
      categoryData,
      departmentData,
      priorityData,
      performanceData,
      technicianData
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving analytics chart data', error: error.message });
  }
});

export default router;
