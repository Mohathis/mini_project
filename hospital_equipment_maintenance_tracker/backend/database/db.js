import mongoose from 'mongoose';
import { MockSchema, MockModel, initMockDb } from './mockDb.js';

let useMock = false;
const mockModelInstances = {};

export async function connectDB() {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/equipment_maintenance';
  try {
    console.log(`Attempting to connect to MongoDB: ${mongoURI}...`);
    await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 2000 });
    console.log('MongoDB connected successfully.');
    useMock = false;
  } catch (error) {
    console.warn('\n=============================================================');
    console.warn('WARNING: Failed to connect to MongoDB server.');
    console.warn('Reason:', error.message);
    console.warn('Falling back to local JSON file database (backend/database/local_db.json).');
    console.warn('=============================================================\n');
    useMock = true;
    initMockDb();
  }
}

export class Schema {
  constructor(definition, options) {
    if (!useMock) {
      this.realSchema = new mongoose.Schema(definition, options);
    }
    this.mockSchema = new MockSchema(definition, options);
    this.definition = definition;
    this.options = options;
  }
}

/**
 * Returns a model wrapper. In mock mode, returns the MockModel instance directly.
 * In real mode, returns a real Mongoose Model.
 */
export function model(name, schema) {
  // We need to decide at call time — but useMock may not be set yet at import time.
  // Use a lazy wrapper function approach.
  function getModel() {
    if (useMock) {
      if (!mockModelInstances[name]) {
        mockModelInstances[name] = new MockModel(name, schema.mockSchema);
      }
      return mockModelInstances[name];
    } else {
      try {
        return mongoose.models[name] || mongoose.model(name, schema.realSchema);
      } catch (e) {
        return mongoose.model(name, schema.realSchema);
      }
    }
  }

  // Return a Proxy that lazily delegates every property access to the correct model
  return new Proxy(
    function (...args) {
      // Allow use as constructor: new Equipment({...})
      const m = getModel();
      if (useMock) {
        return m.createInstance(args[0] || {});
      } else {
        return new m(...args);
      }
    },
    {
      get(target, prop) {
        const m = getModel();
        const val = m[prop];
        if (typeof val === 'function') {
          return val.bind(m);
        }
        return val;
      },
      construct(target, args) {
        const m = getModel();
        if (useMock) {
          return m.createInstance(args[0] || {});
        }
        return new m(...args);
      }
    }
  );
}
