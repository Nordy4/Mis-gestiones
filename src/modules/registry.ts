import type { ModuleDefinition } from '@/core/types';
import { gymModule } from './gym';
import { deudasModule } from './deudas';

/**
 * Registro central de módulos. El orden del array es el orden de las tarjetas
 * en la pantalla de inicio.
 *
 * Para añadir un módulo: crea src/modules/<id>/index.ts exportando un
 * ModuleDefinition y añádelo aquí. Ver CLAUDE.md → "Cómo añadir un módulo".
 */
export const modules: ModuleDefinition[] = [gymModule, deudasModule];
