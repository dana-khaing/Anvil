import { SEED_EXERCISES } from './exercises';

describe('SEED_EXERCISES', () => {
  const idSet = new Set(SEED_EXERCISES.map((exercise) => exercise.id));

  it('has unique ids', () => {
    expect(idSet.size).toBe(SEED_EXERCISES.length);
  });

  it('only references alternatives that exist in the catalog', () => {
    const badReferences = SEED_EXERCISES.flatMap((exercise) =>
      exercise.alternativeIds
        .filter((id) => !idSet.has(id))
        .map((id) => `${exercise.id} -> ${id}`)
    );

    expect(badReferences).toEqual([]);
  });

  it('never lists an exercise as its own alternative', () => {
    const selfReferences = SEED_EXERCISES.filter((exercise) =>
      exercise.alternativeIds.includes(exercise.id)
    );

    expect(selfReferences).toEqual([]);
  });
});
