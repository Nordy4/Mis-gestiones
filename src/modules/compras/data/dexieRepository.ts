import { db } from '@/core/db/db';
import { newId, nowIso } from '@/core/lib/ids';
import type { ComprasRepository } from './repository';
import type { Product, ProductInput } from './types';

const products = () => db.table<Product, string>('compras_products');

const clean = (input: ProductInput): ProductInput => ({
  url: input.url.trim(),
  title: input.title.trim(),
  imageUrl: input.imageUrl || null,
  site: input.site.trim(),
});

export const dexieComprasRepository: ComprasRepository = {
  async listProducts() {
    return (await products().orderBy('createdAt').toArray()).reverse();
  },

  async addProduct(input) {
    const now = nowIso();
    const product: Product = { id: newId(), ...clean(input), createdAt: now, updatedAt: now };
    await products().add(product);
    return product;
  },

  async updateProduct(id, input) {
    await products().update(id, { ...clean(input), updatedAt: nowIso() });
  },

  async deleteProduct(id) {
    await products().delete(id);
  },

  async exportAll() {
    return { products: await products().toArray() };
  },

  async importAll(data) {
    await db.transaction('rw', products(), async () => {
      await products().clear();
      await products().bulkAdd(data.products);
    });
  },
};
