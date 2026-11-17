import { db } from '@/core/db/db';
import { newId, nowIso } from '@/core/lib/ids';
import { safeHttpUrl } from '@/core/lib/links';
import type { ComprasRepository } from './repository';
import type { Product, ProductInput } from './types';

const products = () => db.table<Product, string>('compras_products');

/** Valida antes de guardar: solo enlaces http(s) y textos con longitud razonable. */
function clean(input: ProductInput): ProductInput {
  const url = safeHttpUrl(input.url);
  if (!url) throw new Error('El enlace debe empezar por http:// o https://');
  return {
    url,
    title: input.title.trim().slice(0, 200),
    imageUrl: safeHttpUrl(input.imageUrl),
    site: input.site.trim().slice(0, 100),
  };
}

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
