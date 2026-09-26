import { Schema, model } from '../database/db.js';

const userSchema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  initials: { type: String, required: true },
  role: { type: String, required: true, enum: ['Manager', 'Admin', 'Technician', 'Staff'] },
  department: { type: String }, // for Staff
  specialty: { type: String },  // for Technicians
  phone: { type: String, default: '' },
  joinDate: { type: Date, default: Date.now },
  status: { type: String, default: 'On Shift' },
  isDeleted: { type: Boolean, default: false },
  endDate: { type: Date }
}, {
  timestamps: true
});

export default model('User', userSchema);
