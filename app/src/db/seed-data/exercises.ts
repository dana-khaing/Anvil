export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight';

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core';

export type SeedExercise = {
  id: string;
  name: string;
  equipment: Equipment;
  muscleGroup: MuscleGroup;
  /** ids of exercises that hit roughly the same movement/muscle with different equipment. */
  alternativeIds: string[];
};

export const SEED_EXERCISES: SeedExercise[] = [
  // Chest
  {
    id: 'barbell-bench-press',
    name: 'Barbell Bench Press',
    equipment: 'barbell',
    muscleGroup: 'chest',
    alternativeIds: ['dumbbell-bench-press', 'machine-chest-press', 'pushup'],
  },
  {
    id: 'dumbbell-bench-press',
    name: 'Dumbbell Bench Press',
    equipment: 'dumbbell',
    muscleGroup: 'chest',
    alternativeIds: ['barbell-bench-press', 'machine-chest-press', 'pushup'],
  },
  {
    id: 'machine-chest-press',
    name: 'Machine Chest Press',
    equipment: 'machine',
    muscleGroup: 'chest',
    alternativeIds: ['barbell-bench-press', 'dumbbell-bench-press', 'pushup'],
  },
  {
    id: 'pushup',
    name: 'Push-Up',
    equipment: 'bodyweight',
    muscleGroup: 'chest',
    alternativeIds: ['dumbbell-bench-press', 'machine-chest-press'],
  },
  {
    id: 'incline-barbell-bench-press',
    name: 'Incline Barbell Bench Press',
    equipment: 'barbell',
    muscleGroup: 'chest',
    alternativeIds: ['incline-dumbbell-press', 'incline-machine-chest-press'],
  },
  {
    id: 'incline-dumbbell-press',
    name: 'Incline Dumbbell Press',
    equipment: 'dumbbell',
    muscleGroup: 'chest',
    alternativeIds: ['incline-barbell-bench-press', 'incline-machine-chest-press'],
  },
  {
    id: 'incline-machine-chest-press',
    name: 'Incline Machine Chest Press',
    equipment: 'machine',
    muscleGroup: 'chest',
    alternativeIds: ['incline-barbell-bench-press', 'incline-dumbbell-press'],
  },
  {
    id: 'dumbbell-chest-fly',
    name: 'Dumbbell Chest Fly',
    equipment: 'dumbbell',
    muscleGroup: 'chest',
    alternativeIds: ['cable-chest-fly', 'machine-pec-deck'],
  },
  {
    id: 'cable-chest-fly',
    name: 'Cable Chest Fly',
    equipment: 'cable',
    muscleGroup: 'chest',
    alternativeIds: ['dumbbell-chest-fly', 'machine-pec-deck'],
  },
  {
    id: 'machine-pec-deck',
    name: 'Machine Pec Deck',
    equipment: 'machine',
    muscleGroup: 'chest',
    alternativeIds: ['dumbbell-chest-fly', 'cable-chest-fly'],
  },

  // Triceps
  {
    id: 'tricep-rope-pushdown',
    name: 'Tricep Rope Push Down',
    equipment: 'cable',
    muscleGroup: 'triceps',
    alternativeIds: ['bench-dip', 'overhead-tricep-extension-dumbbell'],
  },
  {
    id: 'overhead-tricep-extension-dumbbell',
    name: 'Dumbbell Overhead Tricep Extension',
    equipment: 'dumbbell',
    muscleGroup: 'triceps',
    alternativeIds: ['overhead-tricep-extension-cable', 'tricep-rope-pushdown'],
  },
  {
    id: 'overhead-tricep-extension-cable',
    name: 'Cable Overhead Tricep Extension',
    equipment: 'cable',
    muscleGroup: 'triceps',
    alternativeIds: ['overhead-tricep-extension-dumbbell', 'tricep-rope-pushdown'],
  },
  {
    id: 'bench-dip',
    name: 'Bench Dip',
    equipment: 'bodyweight',
    muscleGroup: 'triceps',
    alternativeIds: ['tricep-rope-pushdown', 'overhead-tricep-extension-dumbbell'],
  },
  {
    id: 'close-grip-bench-press',
    name: 'Close-Grip Bench Press',
    equipment: 'barbell',
    muscleGroup: 'triceps',
    alternativeIds: ['tricep-rope-pushdown', 'bench-dip'],
  },

  // Back
  {
    id: 'deadlift-barbell',
    name: 'Barbell Deadlift',
    equipment: 'barbell',
    muscleGroup: 'back',
    alternativeIds: ['deadlift-dumbbell'],
  },
  {
    id: 'deadlift-dumbbell',
    name: 'Dumbbell Deadlift',
    equipment: 'dumbbell',
    muscleGroup: 'back',
    alternativeIds: ['deadlift-barbell'],
  },
  {
    id: 'barbell-row',
    name: 'Barbell Row',
    equipment: 'barbell',
    muscleGroup: 'back',
    alternativeIds: ['dumbbell-row', 'seated-cable-row', 'machine-row'],
  },
  {
    id: 'dumbbell-row',
    name: 'Dumbbell Row',
    equipment: 'dumbbell',
    muscleGroup: 'back',
    alternativeIds: ['barbell-row', 'seated-cable-row', 'machine-row'],
  },
  {
    id: 'seated-cable-row',
    name: 'Seated Cable Row',
    equipment: 'cable',
    muscleGroup: 'back',
    alternativeIds: ['barbell-row', 'dumbbell-row', 'machine-row'],
  },
  {
    id: 'machine-row',
    name: 'Machine Row',
    equipment: 'machine',
    muscleGroup: 'back',
    alternativeIds: ['barbell-row', 'dumbbell-row', 'seated-cable-row'],
  },
  {
    id: 'lat-pulldown',
    name: 'Lat Pulldown',
    equipment: 'cable',
    muscleGroup: 'back',
    alternativeIds: ['pullup'],
  },
  {
    id: 'pullup',
    name: 'Pull-Up',
    equipment: 'bodyweight',
    muscleGroup: 'back',
    alternativeIds: ['lat-pulldown'],
  },
  {
    id: 'face-pull',
    name: 'Cable Face Pull',
    equipment: 'cable',
    muscleGroup: 'back',
    alternativeIds: ['machine-reverse-fly'],
  },
  {
    id: 'machine-reverse-fly',
    name: 'Machine Reverse Fly',
    equipment: 'machine',
    muscleGroup: 'back',
    alternativeIds: ['face-pull'],
  },

  // Shoulders
  {
    id: 'overhead-press-barbell',
    name: 'Barbell Overhead Press',
    equipment: 'barbell',
    muscleGroup: 'shoulders',
    alternativeIds: ['overhead-press-dumbbell', 'machine-shoulder-press'],
  },
  {
    id: 'overhead-press-dumbbell',
    name: 'Dumbbell Overhead Press',
    equipment: 'dumbbell',
    muscleGroup: 'shoulders',
    alternativeIds: ['overhead-press-barbell', 'machine-shoulder-press'],
  },
  {
    id: 'machine-shoulder-press',
    name: 'Machine Shoulder Press',
    equipment: 'machine',
    muscleGroup: 'shoulders',
    alternativeIds: ['overhead-press-barbell', 'overhead-press-dumbbell'],
  },
  {
    id: 'lateral-raise-dumbbell',
    name: 'Dumbbell Lateral Raise',
    equipment: 'dumbbell',
    muscleGroup: 'shoulders',
    alternativeIds: ['lateral-raise-cable', 'machine-lateral-raise'],
  },
  {
    id: 'lateral-raise-cable',
    name: 'Cable Lateral Raise',
    equipment: 'cable',
    muscleGroup: 'shoulders',
    alternativeIds: ['lateral-raise-dumbbell', 'machine-lateral-raise'],
  },
  {
    id: 'machine-lateral-raise',
    name: 'Machine Lateral Raise',
    equipment: 'machine',
    muscleGroup: 'shoulders',
    alternativeIds: ['lateral-raise-dumbbell', 'lateral-raise-cable'],
  },

  // Biceps
  {
    id: 'barbell-curl',
    name: 'Barbell Curl',
    equipment: 'barbell',
    muscleGroup: 'biceps',
    alternativeIds: ['dumbbell-curl', 'cable-curl'],
  },
  {
    id: 'dumbbell-curl',
    name: 'Dumbbell Curl',
    equipment: 'dumbbell',
    muscleGroup: 'biceps',
    alternativeIds: ['barbell-curl', 'cable-curl'],
  },
  {
    id: 'cable-curl',
    name: 'Cable Curl',
    equipment: 'cable',
    muscleGroup: 'biceps',
    alternativeIds: ['barbell-curl', 'dumbbell-curl'],
  },
  {
    id: 'hammer-curl',
    name: 'Dumbbell Hammer Curl',
    equipment: 'dumbbell',
    muscleGroup: 'biceps',
    alternativeIds: ['cable-hammer-curl'],
  },
  {
    id: 'cable-hammer-curl',
    name: 'Cable Rope Hammer Curl',
    equipment: 'cable',
    muscleGroup: 'biceps',
    alternativeIds: ['hammer-curl'],
  },

  // Quads / glutes / hamstrings / calves
  {
    id: 'back-squat',
    name: 'Barbell Back Squat',
    equipment: 'barbell',
    muscleGroup: 'quads',
    alternativeIds: ['leg-press', 'goblet-squat', 'bodyweight-squat'],
  },
  {
    id: 'leg-press',
    name: 'Leg Press',
    equipment: 'machine',
    muscleGroup: 'quads',
    alternativeIds: ['back-squat', 'goblet-squat', 'bodyweight-squat'],
  },
  {
    id: 'goblet-squat',
    name: 'Goblet Squat',
    equipment: 'dumbbell',
    muscleGroup: 'quads',
    alternativeIds: ['back-squat', 'leg-press', 'bodyweight-squat'],
  },
  {
    id: 'bodyweight-squat',
    name: 'Bodyweight Squat',
    equipment: 'bodyweight',
    muscleGroup: 'quads',
    alternativeIds: ['back-squat', 'leg-press', 'goblet-squat'],
  },
  {
    id: 'leg-extension',
    name: 'Leg Extension',
    equipment: 'machine',
    muscleGroup: 'quads',
    alternativeIds: [],
  },
  {
    id: 'romanian-deadlift-barbell',
    name: 'Barbell Romanian Deadlift',
    equipment: 'barbell',
    muscleGroup: 'hamstrings',
    alternativeIds: ['romanian-deadlift-dumbbell'],
  },
  {
    id: 'romanian-deadlift-dumbbell',
    name: 'Dumbbell Romanian Deadlift',
    equipment: 'dumbbell',
    muscleGroup: 'hamstrings',
    alternativeIds: ['romanian-deadlift-barbell'],
  },
  {
    id: 'leg-curl',
    name: 'Machine Leg Curl',
    equipment: 'machine',
    muscleGroup: 'hamstrings',
    alternativeIds: [],
  },
  {
    id: 'walking-lunge-dumbbell',
    name: 'Dumbbell Walking Lunge',
    equipment: 'dumbbell',
    muscleGroup: 'glutes',
    alternativeIds: ['walking-lunge-barbell', 'bodyweight-lunge'],
  },
  {
    id: 'walking-lunge-barbell',
    name: 'Barbell Walking Lunge',
    equipment: 'barbell',
    muscleGroup: 'glutes',
    alternativeIds: ['walking-lunge-dumbbell', 'bodyweight-lunge'],
  },
  {
    id: 'bodyweight-lunge',
    name: 'Bodyweight Lunge',
    equipment: 'bodyweight',
    muscleGroup: 'glutes',
    alternativeIds: ['walking-lunge-dumbbell', 'walking-lunge-barbell'],
  },
  {
    id: 'hip-thrust-barbell',
    name: 'Barbell Hip Thrust',
    equipment: 'barbell',
    muscleGroup: 'glutes',
    alternativeIds: ['hip-thrust-machine', 'hip-thrust-bodyweight'],
  },
  {
    id: 'hip-thrust-machine',
    name: 'Machine Hip Thrust',
    equipment: 'machine',
    muscleGroup: 'glutes',
    alternativeIds: ['hip-thrust-barbell', 'hip-thrust-bodyweight'],
  },
  {
    id: 'hip-thrust-bodyweight',
    name: 'Bodyweight Glute Bridge',
    equipment: 'bodyweight',
    muscleGroup: 'glutes',
    alternativeIds: ['hip-thrust-barbell', 'hip-thrust-machine'],
  },
  {
    id: 'calf-raise-machine',
    name: 'Machine Calf Raise',
    equipment: 'machine',
    muscleGroup: 'calves',
    alternativeIds: ['calf-raise-dumbbell', 'bodyweight-calf-raise'],
  },
  {
    id: 'calf-raise-dumbbell',
    name: 'Dumbbell Calf Raise',
    equipment: 'dumbbell',
    muscleGroup: 'calves',
    alternativeIds: ['calf-raise-machine', 'bodyweight-calf-raise'],
  },
  {
    id: 'bodyweight-calf-raise',
    name: 'Bodyweight Calf Raise',
    equipment: 'bodyweight',
    muscleGroup: 'calves',
    alternativeIds: ['calf-raise-machine', 'calf-raise-dumbbell'],
  },

  // Core
  {
    id: 'plank',
    name: 'Plank',
    equipment: 'bodyweight',
    muscleGroup: 'core',
    alternativeIds: [],
  },
  {
    id: 'hanging-leg-raise',
    name: 'Hanging Leg Raise',
    equipment: 'bodyweight',
    muscleGroup: 'core',
    alternativeIds: ['cable-crunch'],
  },
  {
    id: 'cable-crunch',
    name: 'Cable Crunch',
    equipment: 'cable',
    muscleGroup: 'core',
    alternativeIds: ['hanging-leg-raise', 'machine-ab-crunch'],
  },
  {
    id: 'machine-ab-crunch',
    name: 'Machine Ab Crunch',
    equipment: 'machine',
    muscleGroup: 'core',
    alternativeIds: ['cable-crunch'],
  },
];
