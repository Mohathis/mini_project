import { Schema, model } from '../database/db.js';

const maintenanceSchema = new Schema({
  technician_id: { type: String, default: 'Technician' },
  equipment_id: { type: String },
  equipmentId: { type: String },
  maintenance_id: { type: String },
  schedule_date: { type: Date },
  issue_date: { type: Date, default: Date.now },
  cost: { type: Number, default: 0 },
  maintenance_status: { type: String, enum: ['Scheduled', 'In Progress', 'Completed', 'Cancelled'], default: 'Completed' },
  remarks: { type: String, default: '' }
}, {
  timestamps: true
});

export default model('Maintenance', maintenanceSchema);

