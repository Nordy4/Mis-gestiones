import type { RouteObject } from 'react-router';
import { ProductsScreen } from './screens/ProductsScreen';

/** Rutas relativas a /compras. */
export const comprasRoutes: RouteObject[] = [{ index: true, element: <ProductsScreen /> }];
