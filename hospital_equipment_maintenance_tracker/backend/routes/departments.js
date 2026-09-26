import express from 'express';
import Department from '../models/Department.js';
import Equipment from '../models/Equipment.js';
import User from '../models/User.js';
import { validatePassword } from './users.js';

const router = express.Router();

// GET /api/departments
router.get('/', async (req, res) => {
  try {
    const showDeleted = req.query.showDeleted === 'true';
    const query = showDeleted ? { isDeleted: true } : { isDeleted: { $ne: true } };

    let departments = await Department.find(query);
    if (showDeleted) {
      departments = departments.sort((a, b) => new Date(b.deletedAt || b.updatedAt || 0) - new Date(a.deletedAt || a.updatedAt || 0));
    } else {
      departments = departments.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
    
    const equipment = await Equipment.find({});
    const users = await User.find({ role: 'Staff' });
    
    // Calculate equipment count and link login credentials for each department
    const result = departments.map(dept => {
      const name = dept.department_name || dept.name || '';
      const nameStr = (name || '').toLowerCase();
      const count = equipment.filter(eq => (eq.department || '').toLowerCase() === nameStr).length;
      const deptUser = users.find(u => u.department && (u.department || '').toLowerCase() === nameStr);
      return {
        _id: dept._id,
        department_name: name,
        name: name,
        dept_code: dept.dept_code || dept.code || '',
        code: dept.dept_code || dept.code || '',
        dept_head: dept.dept_head || dept.lead || '',
        lead: dept.dept_head || dept.lead || '',
        total_equipment: dept.total_equipment !== undefined ? dept.total_equipment : count,
        activeEqupements: dept.total_equipment !== undefined ? dept.total_equipment : count,
        createdAt: dept.createdAt,
        updatedAt: dept.updatedAt,
        deletedAt: dept.deletedAt,
        deletionReason: dept.deletionReason || '',
        isDeleted: dept.isDeleted || false,
        equipmentCount: count,
        username: deptUser ? deptUser.username : 'N/A',
        password: deptUser ? deptUser.password : 'N/A'
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving departments', error: error.message });
  }
});

export function validateDeptCode(code) {
  if (!code || typeof code !== 'string') {
    return 'Department code is required.';
  }
  const trimmed = code.trim();
  if (trimmed.length < 2) {
    return 'Department code must be at least 2 characters long.';
  }
  if (trimmed.length > 10) {
    return 'Department code cannot exceed 10 characters.';
  }
  if (!/^[A-Za-z0-9-_]+$/.test(trimmed)) {
    return 'Department code can only contain letters, numbers, and hyphens.';
  }
  return null;
}

// POST /api/departments
router.post('/', async (req, res) => {
  try {
    const { name, code, lead, activeEqupements } = req.body;
    if (!name || !code || !lead) {
      return res.status(400).json({ message: 'All fields (name, code, lead) are required' });
    }

    const trimmedName = name.trim();
    const codeError = validateDeptCode(code);
    if (codeError) {
      return res.status(400).json({ message: codeError });
    }
    const cleanCode = code.trim().toUpperCase();

    const allDepts = await Department.find({ isDeleted: { $ne: true } });

    // Check duplicate department code
    const existingByCode = allDepts.find(
      d => (d.code || d.dept_code) && (d.code || d.dept_code).trim().toUpperCase() === cleanCode
    );
    if (existingByCode) {
      return res.status(400).json({ 
        message: `Department code "${cleanCode}" is already in use by "${existingByCode.name || existingByCode.department_name}". Each department must have a unique code.` 
      });
    }

    // Check duplicate department name
    const existingByName = allDepts.find(
      d => (d.name || d.department_name) && (d.name || d.department_name).trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (existingByName) {
      return res.status(400).json({ 
        message: `Department name "${trimmedName}" already exists. Each department must have a unique name.` 
      });
    }

    const numEquip = Number(activeEqupements) || 0;
    const newDept = await Department.create({ 
      name: trimmedName, 
      department_name: trimmedName,
      code: cleanCode, 
      dept_code: cleanCode,
      lead: lead.trim(), 
      dept_head: lead.trim(),
      activeEqupements: numEquip,
      total_equipment: numEquip
    });
    res.status(201).json(newDept);
  } catch (error) {
    res.status(400).json({ message: 'Error creating department', error: error.message });
  }
});

// PUT /api/departments/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, code, lead, activeEqupements, username, password } = req.body;

    if (password && password !== 'N/A') {
      const valErr = validatePassword(password);
      if (valErr) {
        return res.status(400).json({ message: valErr });
      }
    }

    const dept = await Department.findById(req.params.id);
    if (!dept) {
      return res.status(404).json({ message: 'Department not found' });
    }

    const allDepts = await Department.find({ isDeleted: { $ne: true } });
    const currentDeptIdStr = (dept._id || req.params.id).toString();

    let cleanCode = undefined;
    if (code) {
      const codeError = validateDeptCode(code);
      if (codeError) {
        return res.status(400).json({ message: codeError });
      }
      cleanCode = code.trim().toUpperCase();

      const existingByCode = allDepts.find(
        d => (d._id || '').toString() !== currentDeptIdStr &&
             (d.code || d.dept_code) && (d.code || d.dept_code).trim().toUpperCase() === cleanCode
      );
      if (existingByCode) {
        return res.status(400).json({ 
          message: `Department code "${cleanCode}" is already in use by "${existingByCode.name || existingByCode.department_name}". Each department must have a unique code.` 
        });
      }
    }

    let trimmedName = undefined;
    if (name) {
      trimmedName = name.trim();
      const existingByName = allDepts.find(
        d => (d._id || '').toString() !== currentDeptIdStr &&
             (d.name || d.department_name) && (d.name || d.department_name).trim().toLowerCase() === trimmedName.toLowerCase()
      );
      if (existingByName) {
        return res.status(400).json({ 
          message: `Department name "${trimmedName}" already exists. Each department must have a unique name.` 
        });
      }
    }

    const oldName = dept.name || dept.department_name;

    if (trimmedName) {
      dept.name = trimmedName;
      dept.department_name = trimmedName;
    }
    if (cleanCode) {
      dept.code = cleanCode;
      dept.dept_code = cleanCode;
    }
    if (lead) {
      dept.lead = lead;
      dept.dept_head = lead;
    }
    if (activeEqupements !== undefined) {
      dept.activeEqupements = Number(activeEqupements) || 0;
      dept.total_equipment = Number(activeEqupements) || 0;
    }

    await dept.save();

    // Also update the User account associated with this department!
    const deptUser = await User.findOne({ 
      role: 'Staff', 
      department: { $regex: new RegExp("^" + oldName + "$", "i") } 
    });

    if (deptUser) {
      if (username && username !== 'N/A') deptUser.username = username;
      if (password && password !== 'N/A') deptUser.password = password;
      if (name) {
        deptUser.department = name;
        deptUser.name = `${name} Account`;
      }
      await deptUser.save();
    } else if (username && username !== 'N/A' && password && password !== 'N/A') {
      const targetName = name || oldName;
      const computedInitials = targetName.split(' ').map(n => n[0]).join('').toUpperCase();
      await User.create({
        username,
        password,
        name: `${targetName} Account`,
        initials: computedInitials,
        role: 'Staff',
        department: targetName,
        status: 'On Shift'
      });
    }

    res.json(dept);
  } catch (error) {
    res.status(400).json({ message: 'Error updating department', error: error.message });
  }
});

// DELETE /api/departments/:id - Soft delete with reason
router.delete('/:id', async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) {
      return res.status(404).json({ message: 'Department not found' });
    }
    const reason = (req.body && req.body.reason) || req.query.reason || 'No reason provided';
    dept.isDeleted = true;
    dept.deletedAt = new Date();
    dept.deletionReason = reason;
    await dept.save();

    // Soft delete associated Staff account so login is disabled
    const deptUser = await User.findOne({ 
      role: 'Staff', 
      department: { $regex: new RegExp("^" + dept.name + "$", "i") } 
    });
    if (deptUser) {
      deptUser.isDeleted = true;
      deptUser.endDate = new Date();
      await deptUser.save();
    }

    res.json({ message: 'Department deleted successfully', department: dept });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting department', error: error.message });
  }
});

// PUT /api/departments/:id/restore - Restore previously deleted department
router.put('/:id/restore', async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Check if an active department is already using this department's code or name
    const activeDepts = await Department.find({ isDeleted: { $ne: true } });
    const currentDeptIdStr = (dept._id || req.params.id).toString();

    const codeConflict = activeDepts.find(
      d => (d._id || '').toString() !== currentDeptIdStr &&
           d.code && dept.code &&
           d.code.trim().toUpperCase() === dept.code.trim().toUpperCase()
    );
    if (codeConflict) {
      return res.status(400).json({ 
        message: `Cannot restore: department code "${dept.code}" is currently in use by active department "${codeConflict.name}". Please modify the code first.` 
      });
    }

    const nameConflict = activeDepts.find(
      d => (d._id || '').toString() !== currentDeptIdStr &&
           d.name && dept.name &&
           d.name.trim().toLowerCase() === dept.name.trim().toLowerCase()
    );
    if (nameConflict) {
      return res.status(400).json({ 
        message: `Cannot restore: department name "${dept.name}" is already in use by active department "${nameConflict.name}".` 
      });
    }

    dept.isDeleted = false;
    dept.deletedAt = null;
    dept.deletionReason = '';
    await dept.save();

    // Reactivate associated Staff account
    const deptUser = await User.findOne({ 
      role: 'Staff', 
      department: { $regex: new RegExp("^" + dept.name + "$", "i") } 
    });
    if (deptUser) {
      deptUser.isDeleted = false;
      deptUser.endDate = null;
      await deptUser.save();
    }

    res.json({ message: 'Department restored successfully', department: dept });
  } catch (error) {
    res.status(500).json({ message: 'Error restoring department', error: error.message });
  }
});

export default router;
