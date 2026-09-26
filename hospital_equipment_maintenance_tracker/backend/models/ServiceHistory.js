import { Schema, model } from '../database/db.js';

const serviceHistorySchema = new Schema({
  equipmentId: { type: String, required: true }, // reference equipmentId or _id
  requestId: { type: String, default: '' }, // optional reference requestId for breakdown complaints
  serviceType: { type: String, default: 'Preventive Maintenance' }, // 'Preventive Maintenance', 'Calibration', 'Safety Inspection', 'Routine Service', 'Repair', 'Overhaul'
  actionTaken: { type: String, required: true },
  partsReplaced: { type: String, default: '' },
  cost: { type: Number, required: true, default: 0 },
  downtimeHours: { type: Number, required: true, default: 0 },
  completedAt: { type: Date, required: true, default: Date.now },
  completedBy: { type: String, required: true },
  reportedBy: { type: String, default: '' },
  department: { type: String, default: '' },
  status: { type: String, default: 'Completed' },
  notes: { type: String, default: '' }
}, {
  timestamps: true
});

export default model('ServiceHistory', serviceHistorySchema);
