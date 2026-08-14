import { fireEvent, render, screen } from '@testing-library/react-native';

import { type Exercise } from '@/stores/routines-store';

import { SubstitutionPicker } from './substitution-picker';

function makeExercise(id: string, name: string, equipment: Exercise['equipment']): Exercise {
  return { id, name, equipment, muscleGroup: 'chest', defaultVideoUrl: null, alternativeIds: '[]' };
}

const alternatives = [
  makeExercise('dumbbell-bench-press', 'Dumbbell Bench Press', 'dumbbell'),
  makeExercise('machine-chest-press', 'Machine Chest Press', 'machine'),
  makeExercise('pushup', 'Push-Up', 'bodyweight'),
];

describe('SubstitutionPicker', () => {
  it('lists every alternative by default', async () => {
    await render(<SubstitutionPicker alternatives={alternatives} onSelect={jest.fn()} onCancel={jest.fn()} />);

    expect(screen.getByText('Dumbbell Bench Press')).toBeTruthy();
    expect(screen.getByText('Machine Chest Press')).toBeTruthy();
    expect(screen.getByText('Push-Up')).toBeTruthy();
  });

  it('filters the list down to the selected equipment', async () => {
    await render(<SubstitutionPicker alternatives={alternatives} onSelect={jest.fn()} onCancel={jest.fn()} />);

    await fireEvent.press(screen.getByText('Bodyweight'));

    expect(screen.getByText('Push-Up')).toBeTruthy();
    expect(screen.queryByText('Dumbbell Bench Press')).toBeNull();
    expect(screen.queryByText('Machine Chest Press')).toBeNull();
  });

  it('shows a message when no alternatives match the filter', async () => {
    await render(<SubstitutionPicker alternatives={alternatives} onSelect={jest.fn()} onCancel={jest.fn()} />);

    await fireEvent.press(screen.getByText('Cable'));

    expect(screen.getByText(/No alternatives with that equipment/)).toBeTruthy();
  });

  it('calls onSelect with the tapped exercise', async () => {
    const onSelect = jest.fn();
    await render(<SubstitutionPicker alternatives={alternatives} onSelect={onSelect} onCancel={jest.fn()} />);

    await fireEvent.press(screen.getByText('Push-Up'));

    expect(onSelect).toHaveBeenCalledWith(alternatives[2]);
  });

  it('calls onCancel when Cancel is pressed', async () => {
    const onCancel = jest.fn();
    await render(<SubstitutionPicker alternatives={alternatives} onSelect={jest.fn()} onCancel={onCancel} />);

    await fireEvent.press(screen.getByText('Cancel'));

    expect(onCancel).toHaveBeenCalled();
  });
});
