import { Schema, model } from '../database/db.js';

const equipmentSchema = new Schema({
  equipmentId: { type: String },
  name: { type: String },
  equipment_id: { type: String },
  equipment_name: { type: String },
  category: { type: String, required: true },
  location: { type: String, required: true },
  status: { type: String, required: true, enum: ['Operational', 'Under Maintenance', 'Broken', 'Retired'], default: 'Operational' },
  
  // Extended fields for rich details
  model: { type: String, default: '' },
  serialNumber: { type: String, default: '' },
  manufacturer: { type: String, default: '' },
  department: { type: String, default: '' },
  installationDate: { type: Date },
  warrantyExpiration: { type: Date },
  nextPreventiveMaintenance: { type: Date },
  pmFrequency: { type: String, default: 'Quarterly' }
}, {
  timestamps: true
});

export default model('Equipment', equipmentSchema);

