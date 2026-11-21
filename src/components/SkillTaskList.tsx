import { useState } from 'react';
import type { FormEvent } from 'react';

interface SkillTask {
  id: number;
  text: string;
  completed: boolean;
}

function readTasks(storageKey: string): SkillTask[] {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    if (!Array.isArray(saved)) return [];

    return saved.filter((task): task is SkillTask =>
      typeof task?.id === 'number' &&
      typeof task.text === 'string' &&
      typeof task.completed === 'boolean'
    );
  } catch {
    return [];
  }
}

export default function SkillTaskList({ storageKey }: { storageKey: string }) {
  const [tasks, setTasks] = useState(() => readTasks(storageKey));
  const [draft, setDraft] = useState('');
  const [saveFailed, setSaveFailed] = useState(false);

  const updateTasks = (nextTasks: SkillTask[]) => {
    setTasks(nextTasks);
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextTasks));
      setSaveFailed(false);
    } catch {
      setSaveFailed(true);
    }
  };

  const addTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;

    const id = (tasks.at(-1)?.id ?? 0) + 1;
    updateTasks([...tasks, { id, text, completed: false }]);
    setDraft('');
  };

  return (
    <section className="skill-task-list" aria-label="To-do list">
      <h2>To-do list</h2>
      {tasks.length > 0 && (
        <ul className="skill-task-items">
          {tasks.map(task => (
            <li key={task.id}>
              <label className="skill-task-label">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={event => {
                    const completed = event.target.checked;
                    updateTasks(tasks.map(item => item.id === task.id ? { ...item, completed } : item));
                  }}
                />
                <span className="skill-task-box" aria-hidden="true" />
                <span className="skill-task-text">{task.text}</span>
              </label>
              <button
                type="button"
                className="skill-task-remove"
                aria-label={`Remove ${task.text}`}
                onClick={() => updateTasks(tasks.filter(item => item.id !== task.id))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <form className="skill-task-form" onSubmit={addTask}>
        <input
          type="text"
          aria-label="New task"
          placeholder="Breakdown Your Task"
          enterKeyHint="enter"
          value={draft}
          onChange={event => setDraft(event.target.value)}
        />
      </form>
      {saveFailed && <p role="status">Changes couldn’t be saved on this device.</p>}
    </section>
  );
}
