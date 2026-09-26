import { connectDB } from './db.js';
import Equipment from '../models/Equipment.js';
import User from '../models/User.js';
import Department from '../models/Department.js';

async function run() {
  await connectDB();
  const eqCount = await Equipment.countDocuments({});
  const uCount = await User.countDocuments({});
  const deptCount = await Department.countDocuments({});
  console.log('--- DATABASE COUNT ---');
  console.log('Equipment count:', eqCount);
  console.log('User count:', uCount);
  console.log('Department count:', deptCount);
  process.exit(0);
}

run();
