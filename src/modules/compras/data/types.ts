/** Un producto guardado para más adelante. */
export interface Product {
  id: string;
  url: string;
  /** Nombre del producto (lo rellena la vista previa o lo escribes tú). */
  title: string;
  /** Foto del producto (URL de la tienda), si se pudo leer. */
  imageUrl: string | null;
  /** Tienda: "zara.com", "Amazon.es"… */
  site: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  url: string;
  title: string;
  imageUrl: string | null;
  site: string;
}

export interface ComprasExport {
  products: Product[];
}
