import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'database', 'local_db.json');

export function initMockDb() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({}, null, 2));
    console.log('Local JSON database file initialized.');
  }
}

export class MockSchema {
  constructor(definition, options) {
    this.definition = definition;
    this.options = options;
  }
}

export class MockModel {
  constructor(name, schema) {
    this.name = name;
    this.schema = schema;
  }

  static readDb() {
    try {
      initMockDb();
      const content = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(content || '{}');
    } catch (e) {
      console.error('Error reading mock database:', e);
      return {};
    }
  }

  static writeDb(data) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('Error writing to mock database:', e);
    }
  }

  getEntries() {
    const data = MockModel.readDb();
    return data[this.name] || [];
  }

  saveEntries(entries) {
    const data = MockModel.readDb();
    data[this.name] = entries;
    MockModel.writeDb(data);
  }

  static matchesQuery(item, query) {
    if (!query || Object.keys(query).length === 0) return true;
    for (const key in query) {
      const matchVal = query[key];
      if (matchVal === undefined) continue;

      if (key === '$or') {
        // Handle $or operator: item must match at least one sub-condition
        const matched = matchVal.some(subQuery => MockModel.matchesQuery(item, subQuery));
        if (!matched) return false;
        continue;
      }

      if (key === '$ne') continue; // skip $ne checks at top level (handled in sub-objects)

      if (matchVal && typeof matchVal === 'object' && !Array.isArray(matchVal)) {
        if (matchVal.$in !== undefined) {
          if (!Array.isArray(matchVal.$in) || !matchVal.$in.includes(item[key])) return false;
        } else if (matchVal.$nin !== undefined) {
          if (Array.isArray(matchVal.$nin) && matchVal.$nin.includes(item[key])) return false;
        } else if (matchVal.$regex !== undefined) {
          let regex;
          if (matchVal.$regex instanceof RegExp) {
            regex = matchVal.$regex;
          } else {
            const opts = matchVal.$options || '';
            regex = new RegExp(matchVal.$regex, opts);
          }
          const targetStr = item[key] || '';
          if (!regex.test(targetStr)) return false;
        } else if (matchVal.$ne !== undefined) {
          if (item[key] === matchVal.$ne) return false;
        } else if (matchVal.$gte !== undefined) {
          const itemVal = item[key] ? new Date(item[key]).getTime() : 0;
          const queryVal = new Date(matchVal.$gte).getTime();
          if (itemVal < queryVal) return false;
        } else if (matchVal.$lte !== undefined) {
          const itemVal = item[key] ? new Date(item[key]).getTime() : 0;
          const queryVal = new Date(matchVal.$lte).getTime();
          if (itemVal > queryVal) return false;
        }
      } else {
        if (item[key] !== matchVal) return false;
      }
    }
    return true;
  }

  createInstance(data) {
    const modelContext = this;
    const instance = {
      ...data,
      _id: data._id || 'mock_' + Math.random().toString(36).substr(2, 9),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
      save: async function () {
        const entries = modelContext.getEntries();
        const idx = entries.findIndex(e => e._id === this._id);
        this.updatedAt = new Date().toISOString();
        const plainDoc = { ...this };
        delete plainDoc.save;
        if (idx !== -1) {
          entries[idx] = plainDoc;
        } else {
          entries.push(plainDoc);
        }
        modelContext.saveEntries(entries);
        return this;
      }
    };
    return instance;
  }

  // ---- CORE QUERY METHODS — all return plain arrays or objects ----

  async find(query = {}) {
    const entries = this.getEntries();
    const filtered = entries.filter(item => MockModel.matchesQuery(item, query));
    return filtered.map(item => JSON.parse(JSON.stringify(item)));
  }

  async findOne(query = {}) {
    const entries = this.getEntries();
    const match = entries.find(item => MockModel.matchesQuery(item, query));
    if (!match) return null;
    return this.createInstance(JSON.parse(JSON.stringify(match)));
  }

  async findById(id) {
    const entries = this.getEntries();
    const match = entries.find(
      item => item._id === id || item.equipmentId === id || item.requestId === id
    );
    if (!match) return null;
    return this.createInstance(JSON.parse(JSON.stringify(match)));
  }

  async create(data) {
    const entries = this.getEntries();
    const docs = Array.isArray(data) ? data : [data];
    const createdDocs = [];

    for (const doc of docs) {
      const inst = this.createInstance(doc);
      const plainDoc = { ...inst };
      delete plainDoc.save;
      entries.push(plainDoc);
      createdDocs.push(inst);
    }

    this.saveEntries(entries);
    return Array.isArray(data) ? createdDocs : createdDocs[0];
  }

  async findByIdAndUpdate(id, update, options = {}) {
    const entries = this.getEntries();
    const idx = entries.findIndex(
      item => item._id === id || item.equipmentId === id || item.requestId === id
    );
    if (idx === -1) return null;

    const currentDoc = entries[idx];
    const updatePayload = update.$set ? update.$set : update;
    const updatedDoc = { ...currentDoc, ...updatePayload, updatedAt: new Date().toISOString() };

    entries[idx] = updatedDoc;
    this.saveEntries(entries);

    const returnVal = options.new ? updatedDoc : currentDoc;
    return this.createInstance(JSON.parse(JSON.stringify(returnVal)));
  }

  async countDocuments(query = {}) {
    const entries = this.getEntries();
    return entries.filter(item => MockModel.matchesQuery(item, query)).length;
  }

  async deleteMany(query = {}) {
    const entries = this.getEntries();
    const remaining = entries.filter(item => !MockModel.matchesQuery(item, query));
    const deletedCount = entries.length - remaining.length;
    this.saveEntries(remaining);
    return { deletedCount };
  }

  async deleteOne(query = {}) {
    const entries = this.getEntries();
    const idx = entries.findIndex(item => MockModel.matchesQuery(item, query));
    if (idx === -1) return { deletedCount: 0 };
    entries.splice(idx, 1);
    this.saveEntries(entries);
    return { deletedCount: 1 };
  }

  async findByIdAndDelete(id) {
    const entries = this.getEntries();
    const idx = entries.findIndex(
      item => item._id === id || item.equipmentId === id || item.requestId === id
    );
    if (idx === -1) return null;
    const deleted = entries.splice(idx, 1)[0];
    this.saveEntries(entries);
    return this.createInstance(JSON.parse(JSON.stringify(deleted)));
  }
}
