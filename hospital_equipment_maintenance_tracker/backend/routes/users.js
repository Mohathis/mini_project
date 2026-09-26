import express from 'express';
import User from '../models/User.js';
import Technician from '../models/Technician.js';

const router = express.Router();

export function validatePassword(password) {
  if (!password) {
    return "Password is required.";
  }
  if (password.length < 6) {
    return "Password must be at least 6 characters long.";
  }
  if (!/[a-zA-Z]/.test(password)) {
    return "Password must include at least one letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must include at least one number.";
  }
  if (!/[02468]/.test(password)) {
    return "Password must include at least one even number (0, 2, 4, 6, or 8).";
  }
  return null;
}

// GET /api/users - retrieve all users or by role
router.get('/', async (req, res) => {
  try {
    const query = {};
    if (req.query.role) query.role = req.query.role;
    if (req.query.showDeleted === 'true') {
      query.isDeleted = true;
    } else {
      query.isDeleted = { $ne: true };
    }
    let users = await User.find(query);
    users = users.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving users', error: err.message });
  }
});

// POST /api/users/login - authenticate user
router.post('/login', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const roleQuery = (role === 'Admin' || role === 'Manager')
      ? { $in: ['Admin', 'Manager'] }
      : role;
    const user = await User.findOne({ username, role: roleQuery });
    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Error logging in', error: err.message });
  }
});

// POST /api/users - register a user
router.post('/', async (req, res) => {
  try {
    const { username, password, name, initials, role, department, specialty, phone, joinDate } = req.body;
    if (!username || !password || !name || !role) {
      return res.status(400).json({ message: 'Required fields (username, password, name, role) are missing' });
    }

    const valErr = validatePassword(password);
    if (valErr) {
      return res.status(400).json({ message: valErr });
    }

    const allUsers = await User.find({ isDeleted: { $ne: true } });
    const isDuplicate = allUsers.some(
      u => u.username.toLowerCase() === username.toLowerCase()
    );
    if (isDuplicate) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    const computedInitials = initials || name.split(' ').map(n => n[0]).join('').toUpperCase();

    const newUser = await User.create({
      username,
      password,
      name,
      initials: computedInitials,
      role,
      department,
      specialty,
      phone: phone || '',
      joinDate: joinDate || new Date(),
      status: 'On Shift'
    });

    if (role === 'Technician') {
      try {
        await Technician.create({
          technician_name: name,
          specialization: specialty || 'General',
          phone: phone || 'N/A',
          status: 'Active'
        });
      } catch (tErr) {
        console.warn('Sync to Technician collection:', tErr.message);
      }
    }

    res.status(201).json(newUser);
  } catch (err) {
    res.status(400).json({ message: 'Error creating user', error: err.message });
  }
});

// PUT /api/users/:id - update user details (including username, password, name, specialty)
router.put('/:id', async (req, res) => {
  try {
    const { username, password, name, specialty, phone, initials, joinDate } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const oldName = user.name;

    if (username) {
      const duplicate = await User.findOne({ 
        username: { $regex: new RegExp("^" + username + "$", "i") },
        _id: { $ne: req.params.id }
      });
      if (duplicate) {
        return res.status(400).json({ message: 'Username is already taken' });
      }
      user.username = username;
    }

    if (password) {
      const valErr = validatePassword(password);
      if (valErr) {
        return res.status(400).json({ message: valErr });
      }
      user.password = password;
    }
    if (name) {
      user.name = name;
      user.initials = initials || name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    if (specialty !== undefined) user.specialty = specialty;
    if (phone !== undefined) user.phone = phone;
    if (joinDate !== undefined) user.joinDate = joinDate;

    await user.save();

    if (user.role === 'Technician') {
      try {
        await Technician.findOneAndUpdate(
          { technician_name: oldName },
          {
            technician_name: user.name,
            specialization: user.specialty || 'General',
            phone: user.phone || 'N/A'
          },
          { upsert: true }
        );
      } catch (tErr) {
        console.warn('Sync update to Technician collection:', tErr.message);
      }
    }

    res.json(user);
  } catch (err) {
    res.status(400).json({ message: 'Error updating user', error: err.message });
  }
});

// DELETE /api/users/:id - soft delete user
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.isDeleted = true;
    user.endDate = new Date();
    await user.save();

    if (user.role === 'Technician') {
      try {
        await Technician.findOneAndUpdate(
          { technician_name: user.name },
          { status: 'Inactive' }
        );
      } catch (tErr) {
        console.warn('Sync delete to Technician collection:', tErr.message);
      }
    }

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting user', error: err.message });
  }
});

export default router;
