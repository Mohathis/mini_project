import { Schema, model } from '../database/db.js';

const technicianSchema = new Schema({
  technician_name: { type: String, required: true },
  specialization: { type: String, default: 'General' },
  phone: { type: String, default: '' },
  created_at: { type: Date, default: Date.now },
  status: { type: String, enum: ['Active', 'On Shift', 'Off Duty', 'Inactive'], default: 'Active' }
}, {
  timestamps: true
});

export default model('Technician', technicianSchema);
