import { Schema, model } from '../database/db.js';

const complaintSchema = new Schema({
  equipment_id: { type: String, required: true },
  department_id: { type: String },
  technician_id: { type: String, default: '' },
  staff_name: { type: String, required: true },
  description: { type: String, required: true },
  priority: { type: String, required: true, enum: ['Low', 'Medium', 'High', 'Emergency'], default: 'Medium' },
  status: { type: String, required: true, enum: ['Pending', 'Assigned', 'In Progress', 'Completed', 'Cancelled'], default: 'Pending' },
  complaint_date: { type: Date, default: Date.now }
}, {
  timestamps: true
});

export default model('Complaint', complaintSchema);
