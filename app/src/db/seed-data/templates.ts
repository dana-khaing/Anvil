export type SplitType = 'push_pull_legs' | 'upper_lower' | 'bro_split';

export type TemplateExercise = {
  exerciseId: string;
  repsMin: number;
  repsMax: number;
  sets: number;
};

export type TemplateDay = {
  label: string;
  exercises: TemplateExercise[];
};

export type SplitTemplate = {
  splitType: SplitType;
  name: string;
  days: TemplateDay[];
};

const standard = (exerciseId: string, sets = 3): TemplateExercise => ({
  exerciseId,
  repsMin: 8,
  repsMax: 12,
  sets,
});

export const SPLIT_TEMPLATES: SplitTemplate[] = [
  {
    splitType: 'push_pull_legs',
    name: 'Push / Pull / Legs',
    days: [
      {
        label: 'D1 - Push',
        exercises: [
          standard('barbell-bench-press', 4),
          standard('incline-dumbbell-press'),
          standard('overhead-press-dumbbell'),
          standard('lateral-raise-dumbbell'),
          standard('tricep-rope-pushdown'),
        ],
      },
      {
        label: 'D2 - Pull',
        exercises: [
          standard('deadlift-barbell', 4),
          standard('barbell-row'),
          standard('lat-pulldown'),
          standard('face-pull'),
          standard('barbell-curl'),
        ],
      },
      {
        label: 'D3 - Legs',
        exercises: [
          standard('back-squat', 4),
          standard('romanian-deadlift-barbell'),
          standard('leg-press'),
          standard('leg-curl'),
          standard('calf-raise-machine'),
        ],
      },
    ],
  },
  {
    splitType: 'upper_lower',
    name: 'Upper / Lower',
    days: [
      {
        label: 'D1 - Upper',
        exercises: [
          standard('barbell-bench-press', 4),
          standard('barbell-row'),
          standard('overhead-press-dumbbell'),
          standard('lat-pulldown'),
          standard('barbell-curl'),
          standard('tricep-rope-pushdown'),
        ],
      },
      {
        label: 'D2 - Lower',
        exercises: [
          standard('back-squat', 4),
          standard('romanian-deadlift-barbell'),
          standard('leg-press'),
          standard('leg-curl'),
          standard('calf-raise-machine'),
        ],
      },
      {
        label: 'D3 - Upper',
        exercises: [
          standard('incline-dumbbell-press', 4),
          standard('seated-cable-row'),
          standard('machine-shoulder-press'),
          standard('pullup'),
          standard('hammer-curl'),
          standard('overhead-tricep-extension-dumbbell'),
        ],
      },
      {
        label: 'D4 - Lower',
        exercises: [
          standard('leg-press', 4),
          standard('hip-thrust-barbell'),
          standard('leg-extension'),
          standard('walking-lunge-dumbbell'),
          standard('calf-raise-dumbbell'),
        ],
      },
    ],
  },
  {
    splitType: 'bro_split',
    name: 'Bro Split',
    days: [
      {
        label: 'D1 - Chest and Tricep',
        exercises: [
          standard('barbell-bench-press', 3),
          standard('incline-dumbbell-press', 3),
          standard('dumbbell-chest-fly', 3),
          standard('tricep-rope-pushdown', 3),
          standard('overhead-tricep-extension-dumbbell', 3),
        ],
      },
      {
        label: 'D2 - Back and Bicep',
        exercises: [
          standard('deadlift-barbell', 3),
          standard('barbell-row', 3),
          standard('lat-pulldown', 3),
          standard('barbell-curl', 3),
          standard('hammer-curl', 3),
        ],
      },
      {
        label: 'D3 - Legs',
        exercises: [
          standard('back-squat', 4),
          standard('leg-press', 3),
          standard('leg-extension', 3),
          standard('leg-curl', 3),
          standard('calf-raise-machine', 3),
        ],
      },
      {
        label: 'D4 - Shoulders and Abs',
        exercises: [
          standard('overhead-press-barbell', 4),
          standard('lateral-raise-dumbbell', 3),
          standard('machine-reverse-fly', 3),
          standard('cable-crunch', 3),
          standard('plank', 3),
        ],
      },
      {
        label: 'D5 - Arms',
        exercises: [
          standard('close-grip-bench-press', 3),
          standard('cable-curl', 3),
          standard('bench-dip', 3),
          standard('cable-hammer-curl', 3),
        ],
      },
      {
        label: 'D6 - Glutes and Hamstrings',
        exercises: [
          standard('romanian-deadlift-barbell', 4),
          standard('hip-thrust-barbell', 3),
          standard('walking-lunge-dumbbell', 3),
          standard('hanging-leg-raise', 3),
        ],
      },
    ],
  },
];
