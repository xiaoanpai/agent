import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

type Filter = 'all' | 'active' | 'completed';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  exiting?: boolean;
}

const STORAGE_KEY = 'react-todo-app:todos';

function loadTodos(): Todo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function App() {
  const [todos, setTodos] = useState<Todo[]>(loadTodos);
  const [input, setInput] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  // localStorage 持久化
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus();
      editRef.current.setSelectionRange(editText.length, editText.length);
    }
  }, [editingId, editText]);

  const addTodo = () => {
    const text = input.trim();
    if (!text) return;
    const todo: Todo = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      text,
      completed: false,
      createdAt: Date.now(),
    };
    setTodos((prev) => [todo, ...prev]);
    setInput('');
    inputRef.current?.focus();
  };

  const removeTodo = (id: string) => {
    // 先标记退出，等动画结束后真正移除
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    setTimeout(() => {
      setTodos((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  };

  const toggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const startEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditText(todo.text);
  };

  const saveEdit = () => {
    const text = editText.trim();
    if (editingId && text) {
      setTodos((prev) =>
        prev.map((t) => (t.id === editingId ? { ...t, text } : t))
      );
    }
    setEditingId(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const clearCompleted = () => {
    setTodos((prev) => prev.filter((t) => !t.completed));
  };

  const filtered = useMemo(() => {
    switch (filter) {
      case 'active':
        return todos.filter((t) => !t.completed);
      case 'completed':
        return todos.filter((t) => t.completed);
      default:
        return todos;
    }
  }, [todos, filter]);

  const stats = useMemo(() => {
    const total = todos.length;
    const completed = todos.filter((t) => t.completed).length;
    const active = total - completed;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, active, percent };
  }, [todos]);

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'active', label: '进行中' },
    { key: 'completed', label: '已完成' },
  ];

  return (
    <div className="app">
      <div className="card">
        <header className="header">
          <h1 className="title">📝 TodoList</h1>
          <p className="subtitle">
            共 {stats.total} 项 · 进行中 {stats.active} · 已完成 {stats.completed}
          </p>
          {stats.total > 0 && (
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${stats.percent}%` }}
              />
              <span className="progress-text">{stats.percent}%</span>
            </div>
          )}
        </header>

        <div className="input-row">
          <input
            ref={inputRef}
            className="todo-input"
            type="text"
            placeholder="输入待办事项，回车添加..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTodo()}
          />
          <button className="add-btn" onClick={addTodo}>
            添加
          </button>
        </div>

        <div className="filter-row">
          <div className="filters">
            {filters.map((f) => (
              <button
                key={f.key}
                className={`filter-btn ${filter === f.key ? 'active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
          {stats.completed > 0 && (
            <button className="clear-btn" onClick={clearCompleted}>
              清除已完成
            </button>
          )}
        </div>

        <ul className="todo-list">
          {filtered.length === 0 && (
            <li className="empty">
              {todos.length === 0 ? '暂无待办，添加一个吧 ✨' : '该分类下没有待办'}
            </li>
          )}
          {filtered.map((todo) => (
            <li
              key={todo.id}
              className={`todo-item ${todo.completed ? 'completed' : ''} ${
                todo.exiting ? 'exiting' : ''
              }`}
            >
              <input
                type="checkbox"
                className="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo.id)}
              />
              {editingId === todo.id ? (
                <input
                  ref={editRef}
                  className="edit-input"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={saveEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit();
                    if (e.key === 'Escape') cancelEdit();
                  }}
                />
              ) : (
                <span
                  className="todo-text"
                  onDoubleClick={() => startEdit(todo)}
                >
                  {todo.text}
                </span>
              )}
              <div className="actions">
                {editingId !== todo.id && (
                  <button
                    className="icon-btn edit"
                    title="编辑"
                    onClick={() => startEdit(todo)}
                  >
                    ✏️
                  </button>
                )}
                <button
                  className="icon-btn delete"
                  title="删除"
                  onClick={() => removeTodo(todo.id)}
                >
                  🗑️
                </button>
              </div>
            </li>
          ))}
        </ul>

        <footer className="footer">
          <span>双击文字可编辑 · 数据保存在本地</span>
        </footer>
      </div>
    </div>
  );
}

export default App;
