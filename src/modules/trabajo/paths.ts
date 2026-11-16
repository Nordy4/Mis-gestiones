/** Rutas absolutas del módulo Trabajo. */
export const trabajoPaths = {
  home: '/trabajo',
  /** Calendario; con `day` (YYYY-MM-DD) abre ese mes con el día seleccionado. */
  calendar: (day?: string) => (day ? `/trabajo/calendario?dia=${day}` : '/trabajo/calendario'),
};
