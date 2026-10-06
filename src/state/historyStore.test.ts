import { historyStore } from './historyStore';

describe('historyStore', () => {
  beforeEach(() => {
    localStorage.clear();
    historyStore._reset();
  });

  it('menambah, mengubah, menghapus, dan mengembalikan entri', () => {
    const a = historyStore.add({ fileName: 'a.jpg', thumbnail: '', text: 'satu' });
    const b = historyStore.add({ fileName: 'b.jpg', thumbnail: '', text: 'dua' });
    expect(historyStore.list().map((e) => e.id)).toEqual([b.id, a.id]);

    const receipt = { title: 'Toko', date: 0, items: [] };
    historyStore.update(a.id, { receipt });
    expect(historyStore.get(a.id)?.receipt).toEqual(receipt);

    const removed = historyStore.get(a.id)!;
    historyStore.remove(a.id);
    expect(historyStore.list()).toHaveLength(1);
    historyStore.restore(removed);
    expect(historyStore.list().map((e) => e.id)).toEqual([b.id, a.id]);

    historyStore.clear();
    expect(historyStore.list()).toEqual([]);
  });

  it('tersimpan di localStorage dan tahan data rusak', () => {
    historyStore.add({ fileName: 'a.jpg', thumbnail: '', text: 'x' });
    historyStore._reset();
    expect(historyStore.list()).toHaveLength(1);

    localStorage.setItem('nyalin:history:v1', '{bukan json');
    historyStore._reset();
    expect(historyStore.list()).toEqual([]);
  });
});
