const fs = require('fs/promises');
const path = require('path');

class FileStore {
  constructor(filename, defaults = {}) {
    this.filePath = path.join(__dirname, '../../data', filename);
    this.defaults = defaults;
    this.data = null;
  }

  async load() {
    try {
      const content = await fs.readFile(this.filePath, 'utf8');
      this.data = JSON.parse(content);
    } catch (err) {
      if (err.code === 'ENOENT') {
        this.data = JSON.parse(JSON.stringify(this.defaults));
        await this.save();
      } else {
        throw err;
      }
    }
    return this.data;
  }

  async save() {
    if (!this.data) {
      this.data = JSON.parse(JSON.stringify(this.defaults));
    }
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
  }

  async getData() {
    if (!this.data) {
      await this.load();
    }
    return this.data;
  }

  async update(mutator) {
    const data = await this.getData();
    const updated = await mutator(data);
    if (updated !== undefined) {
      this.data = updated;
    }
    await this.save();
    return this.data;
  }
}

module.exports = FileStore;
