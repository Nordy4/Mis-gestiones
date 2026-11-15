import type { Exercise, Section } from '../data/types';

export interface ExerciseGroup {
  /** null = ejercicios sin sección (van primero). */
  section: Section | null;
  exercises: Exercise[];
}

/**
 * Agrupa los ejercicios por sección en orden de pantalla:
 * primero los sin sección, luego cada sección por su orden (aunque esté vacía).
 * Un ejercicio cuya sección ya no existe se trata como sin sección.
 */
export function groupBySection(exercises: Exercise[], sections: Section[]): ExerciseGroup[] {
  const known = new Set(sections.map((s) => s.id));
  const loose = exercises.filter((e) => !e.sectionId || !known.has(e.sectionId));
  const groups: ExerciseGroup[] = [];
  if (loose.length || sections.length === 0) groups.push({ section: null, exercises: loose });
  for (const section of sections) {
    groups.push({ section, exercises: exercises.filter((e) => e.sectionId === section.id) });
  }
  return groups;
}

/** Ejercicios en el mismo orden en que se muestran agrupados. */
export function displayOrder(exercises: Exercise[], sections: Section[]): Exercise[] {
  return groupBySection(exercises, sections).flatMap((g) => g.exercises);
}
