import { Schema, model } from '../database/db.js';

const reportSchema = new Schema({
  report_type: { type: String, required: true },
  generated_date: { type: Date, default: Date.now },
  generated_by: { type: String, required: true }
}, {
  timestamps: true
});

export default model('Report', reportSchema);
