import { Schema, model } from '../database/db.js';

const departmentSchema = new Schema({
  name: { type: String },
  department_name: { type: String },
  code: { type: String },
  dept_code: { type: String },
  lead: { type: String },
  dept_head: { type: String },
  activeEqupements: { type: Number, default: 0 },
  total_equipment: { type: Number, default: 0 },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  deletionReason: { type: String, default: '' }
}, {
  timestamps: true
});

export default model('Department', departmentSchema);

