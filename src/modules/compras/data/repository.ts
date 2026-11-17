import type { ComprasExport, Product, ProductInput } from './types';

/**
 * Contrato de acceso a datos del módulo Compras.
 * Las pantallas no lo usan directamente: pasan por `hooks.ts`.
 */
export interface ComprasRepository {
  /** Todos los productos, los más recientes primero. */
  listProducts(): Promise<Product[]>;
  addProduct(input: ProductInput): Promise<Product>;
  updateProduct(id: string, input: ProductInput): Promise<void>;
  deleteProduct(id: string): Promise<void>;

  exportAll(): Promise<ComprasExport>;
  importAll(data: ComprasExport): Promise<void>;
}
