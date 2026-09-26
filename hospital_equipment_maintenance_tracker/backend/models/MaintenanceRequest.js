import { Schema, model } from '../database/db.js';

const maintenanceRequestSchema = new Schema({
  requestId: { type: String, required: true, unique: true },
  equipmentId: { type: String, required: true }, // reference equipmentId or _id
  issueDescription: { type: String, required: true },
  priority: { type: String, required: true, enum: ['Low', 'Medium', 'High', 'Emergency'], default: 'Medium' },
  reportedBy: { type: String, required: true },
  department: { type: String, required: true },
  status: { type: String, required: true, enum: ['Pending', 'Assigned', 'In Progress', 'Completed', 'Cancelled'], default: 'Pending' },
  assignedTechnician: { type: String, default: '' },
  assignDate: { type: Date },
  targetCompletionDate: { type: Date },
  managerNotes: { type: String, default: '' }
}, {
  timestamps: true
});

export default model('MaintenanceRequest', maintenanceRequestSchema);
