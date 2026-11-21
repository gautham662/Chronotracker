// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import SkillTaskList from './SkillTaskList';

const guitarKey = 'chronoskill:test:guitar';
const codingKey = 'chronoskill:test:coding';

afterEach(() => {
  cleanup();
  localStorage.removeItem(guitarKey);
  localStorage.removeItem(codingKey);
});

it('saves task completion for the current skill and keeps other lists separate', () => {
  const { rerender } = render(<SkillTaskList key={guitarKey} storageKey={guitarKey} />);
  const taskName = 'Practice chord changes';

  const entry = screen.getByRole<HTMLInputElement>('textbox', { name: 'New task' });
  entry.focus();
  fireEvent.change(entry, { target: { value: taskName } });
  fireEvent.submit(entry.form!);

  const checkbox = screen.getByRole('checkbox', { name: taskName });
  expect(checkbox.compareDocumentPosition(entry)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  expect(document.activeElement).toBe(entry);
  expect(entry.value).toBe('');
  fireEvent.click(checkbox);

  rerender(<SkillTaskList key={codingKey} storageKey={codingKey} />);
  expect(screen.queryByRole('checkbox', { name: taskName })).toBeNull();

  rerender(<SkillTaskList key={guitarKey} storageKey={guitarKey} />);
  expect(screen.getByRole<HTMLInputElement>('checkbox', { name: taskName }).checked).toBe(true);

  fireEvent.click(screen.getByRole('button', { name: `Remove ${taskName}` }));
  rerender(<SkillTaskList key={codingKey} storageKey={codingKey} />);
  rerender(<SkillTaskList key={guitarKey} storageKey={guitarKey} />);
  expect(screen.queryByRole('checkbox', { name: taskName })).toBeNull();
});
