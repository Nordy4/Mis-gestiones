import { DEFAULT_REPS, DEFAULT_SETS, type ExerciseInput } from './types';

const ex = (name: string, initialWeight: number | null = null): ExerciseInput => ({
  name,
  sectionId: null,
  targetSets: DEFAULT_SETS,
  targetReps: DEFAULT_REPS,
  initialWeight,
  initialPartnerWeight: null,
});

/** Rutinas iniciales. Solo se cargan la primera vez que se abre la app. */
export const seedRoutines: { name: string; exercises: ExerciseInput[] }[] = [
  {
    name: 'Brazos',
    exercises: [
      ex('Press banca', 50),
      ex('Curl bíceps en polea', 50),
      ex('Extensión de tríceps'),
      ex('Curl francés'),
      ex('Elevaciones de hombro'),
    ],
  },
  {
    name: 'Piernas',
    exercises: [ex('Curl de piernas sentado', 65), ex('Peso muerto rumano', 40)],
  },
  {
    name: 'Pecho & Espalda',
    exercises: [ex('Press banca inclinado', 45), ex('Jalón', 47), ex('Abdominales')],
  },
];
