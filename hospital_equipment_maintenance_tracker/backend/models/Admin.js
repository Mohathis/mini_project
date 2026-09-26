import { Schema, model } from '../database/db.js';

const adminSchema = new Schema({
  admin_name: { type: String, required: true },
  password: { type: String, required: true }
}, {
  timestamps: true
});

export default model('Admin', adminSchema);
