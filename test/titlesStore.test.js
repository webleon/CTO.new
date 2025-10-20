const fs = require('fs');
const path = require('path');
const { TitlesStore } = require('../src/titlesStore');

function makeTempPath(name) {
  const dir = path.join(__dirname, 'tmp', name);
  const file = path.join(dir, 'titles.json');
  return { dir, file };
}

describe('TitlesStore', () => {
  beforeAll(async () => {
    // Ensure base tmp dir exists
    await fs.promises.mkdir(path.join(__dirname, 'tmp'), { recursive: true });
  });

  afterEach(async () => {
    // Cleanup tmp directory between tests to avoid cross-test contamination
    const tmpBase = path.join(__dirname, 'tmp');
    const entries = await fs.promises.readdir(tmpBase);
    for (const e of entries) {
      const full = path.join(tmpBase, e);
      await fs.promises.rm(full, { recursive: true, force: true });
    }
  });

  test('loads empty map and bootstraps directory', async () => {
    const { file, dir } = makeTempPath('case1');
    const store = new TitlesStore(file);
    await store.ready();
    expect(fs.existsSync(dir)).toBe(true);
    expect(store.getAllOverrides()).toEqual({});
    expect(store.getSnapshotVersion()).toBe(0);
  });

  test('set and persist override, then reload', async () => {
    const { file } = makeTempPath('case2');
    const store1 = new TitlesStore(file);
    await store1.ready();
    await store1.setOverride(123, 'My Title');
    expect(store1.getOverride(123)).toBe('My Title');
    expect(store1.getSnapshotVersion()).toBe(1);
    // Ensure it persisted to disk
    const raw = await fs.promises.readFile(file, 'utf8');
    const parsed = JSON.parse(raw);
    expect(parsed['123']).toBe('My Title');

    const store2 = new TitlesStore(file);
    await store2.ready();
    expect(store2.getOverride(123)).toBe('My Title');
    expect(store2.getAllOverrides()).toEqual({ '123': 'My Title' });
  });

  test('clear override removes entry and persists', async () => {
    const { file } = makeTempPath('case3');
    const store = new TitlesStore(file);
    await store.ready();
    await store.setOverride(1, 'T1');
    await store.setOverride(2, 'T2');
    expect(store.getSnapshotVersion()).toBe(2);
    await store.clearOverride(1);
    expect(store.getOverride(1)).toBeUndefined();
    expect(store.getOverride(2)).toBe('T2');
    expect(store.getSnapshotVersion()).toBe(3);
    const parsed = JSON.parse(await fs.promises.readFile(file, 'utf8'));
    expect(parsed['1']).toBeUndefined();
    expect(parsed['2']).toBe('T2');
  });

  test('atomic write uses same directory and rename()', async () => {
    const { file } = makeTempPath('case4');
    const store = new TitlesStore(file);
    await store.ready();
    const spyRename = jest.spyOn(fs.promises, 'rename');
    await store.setOverride(7, 'Atomic');
    expect(spyRename).toHaveBeenCalled();
    const lastCall = spyRename.mock.calls[spyRename.mock.calls.length - 1];
    const [tmpPath, finalPath] = lastCall;
    expect(path.dirname(tmpPath)).toBe(path.dirname(finalPath));
    expect(finalPath).toBe(file);
    spyRename.mockRestore();
  });
});
