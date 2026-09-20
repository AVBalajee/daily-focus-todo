import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'

type Priority = 'High' | 'Medium' | 'Low'
type Category = 'Work' | 'Learning' | 'Health' | 'Personal'
type Repeat = 'Daily' | 'Weekdays' | 'Weekly' | 'Monthly' | 'Custom'

type Task = {
  id: string
  title: string
  date: string
  completed: boolean
  priority: Priority
  category: Category
  minutes: number
  createdAt: number
  recurringId?: string
}

type RecurringTask = {
  id: string
  title: string
  repeat: Repeat
  days: number[]
  startDate: string
  endDate?: string
  active: boolean
  priority: Priority
  category: Category
  minutes: number
  createdAt: number
}

const TASKS_KEY = 'daily-focus-v2'
const RECURRING_KEY = 'daily-focus-recurring-v1'
const categories: Category[] = ['Work', 'Learning', 'Health', 'Personal']
const priorities: Priority[] = ['High', 'Medium', 'Low']
const priorityOrder: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 }

const pad = (n: number) => String(n).padStart(2, '0')
const toDateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const fromDateKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const todayKey = () => toDateKey(new Date())
const addDays = (d: Date, n: number) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

const starterTasks = (): Task[] => {
  const today = todayKey()
  return [
    { id: uid(), title: 'Plan the day and choose top 3 priorities', date: today, completed: false, priority: 'High', category: 'Personal', minutes: 10, createdAt: Date.now() },
    { id: uid(), title: 'Complete one focused learning session', date: today, completed: false, priority: 'High', category: 'Learning', minutes: 60, createdAt: Date.now() },
    { id: uid(), title: 'Move for at least 30 minutes', date: today, completed: false, priority: 'Medium', category: 'Health', minutes: 30, createdAt: Date.now() },
  ]
}

const iconPaths: Record<string, React.ReactNode> = {
  plus: <><path d="M12 5v14"/><path d="M5 12h14"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  calendar: <><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M16 2v4M8 2v4M3 9h18"/></>,
  chart: <><path d="M4 19V5M4 19h17"/><path d="m7 15 4-4 3 2 5-6"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  left: <path d="m15 18-6-6 6-6"/>,
  right: <path d="m9 18 6-6-6-6"/>,
  trash: <><path d="M4 7h16M10 11v6M14 11v6"/><path d="m9 7 .8-2h4.4l.8 2M6 7l1 14h10l1-14"/></>,
  edit: <><path d="m4 20 4.2-.9L19 8.3a2 2 0 0 0-2.8-2.8L5.4 16.3z"/><path d="m14.5 6.5 3 3"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
  fire: <path d="M12 22c4 0 7-2.9 7-7 0-3.2-1.8-5.4-4.6-7.8.2 2.2-.5 3.5-1.8 4.2.1-3.8-1.6-6.9-5-9.4.3 4.2-3.6 6.3-3.6 11.1C4 18.8 7.5 22 12 22Z"/>,
  close: <><path d="m6 6 12 12M18 6 6 18"/></>,
  repeat: <><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
}

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{iconPaths[name]}</svg>
}

function formatLongDate(key: string) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(fromDateKey(key))
}
function formatMonth(d: Date) {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(d)
}
function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}

function matchesRecurring(r: RecurringTask, date: Date) {
  const key = toDateKey(date)
  if (!r.active || key < r.startDate || (r.endDate && key > r.endDate)) return false
  const day = date.getDay()
  if (r.repeat === 'Daily') return true
  if (r.repeat === 'Weekdays') return day >= 1 && day <= 5
  if (r.repeat === 'Weekly' || r.repeat === 'Custom') return r.days.includes(day)
  if (r.repeat === 'Monthly') return date.getDate() === fromDateKey(r.startDate).getDate()
  return false
}

function App() {
  const [tasks, setTasks] = useState<Task[]>(() => read(TASKS_KEY, starterTasks()))
  const [recurring, setRecurring] = useState<RecurringTask[]>(() => read(RECURRING_KEY, []))
  const [selectedDate, setSelectedDate] = useState(todayKey())
  const [calendarMonth, setCalendarMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [filter, setFilter] = useState<'All' | Priority>('All')
  const [categoryFilter, setCategoryFilter] = useState<'All' | Category>('All')
  const [query, setQuery] = useState('')
  const [showStats, setShowStats] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showRecurringModal, setShowRecurringModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editingRecurring, setEditingRecurring] = useState<RecurringTask | null>(null)

  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Priority>('Medium')
  const [category, setCategory] = useState<Category>('Work')
  const [minutes, setMinutes] = useState(30)

  const [repeat, setRepeat] = useState<Repeat>('Daily')
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0])
  const [startDate, setStartDate] = useState(todayKey())
  const [endDate, setEndDate] = useState('')

  useEffect(() => { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)) }, [tasks])
  useEffect(() => { localStorage.setItem(RECURRING_KEY, JSON.stringify(recurring)) }, [recurring])

  // Materialize recurring tasks for the current calendar window and today.
  useEffect(() => {
    const dates = Array.from({ length: 62 }, (_, i) => toDateKey(addDays(new Date(), i - 30)))
    const existing = new Set(tasks.map(t => `${t.recurringId}|${t.date}`))
    const additions: Task[] = []
    for (const r of recurring) {
      for (const key of dates) {
        const date = fromDateKey(key)
        if (matchesRecurring(r, date) && !existing.has(`${r.id}|${key}`)) {
          additions.push({
            id: uid(), recurringId: r.id, title: r.title, date: key, completed: false,
            priority: r.priority, category: r.category, minutes: r.minutes, createdAt: Date.now(),
          })
          existing.add(`${r.id}|${key}`)
        }
      }
    }
    if (additions.length) setTasks(prev => [...prev, ...additions])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recurring])

  const dayTasks = tasks.filter(t => t.date === selectedDate)
  const visibleTasks = dayTasks
    .filter(t => filter === 'All' || t.priority === filter)
    .filter(t => categoryFilter === 'All' || t.category === categoryFilter)
    .filter(t => t.title.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => Number(a.completed) - Number(b.completed) || priorityOrder[a.priority] - priorityOrder[b.priority] || a.createdAt - b.createdAt)

  const completed = dayTasks.filter(t => t.completed).length
  const progress = dayTasks.length ? Math.round(completed / dayTasks.length * 100) : 0
  const focusMinutes = dayTasks.reduce((s, t) => s + t.minutes, 0)
  const doneMinutes = dayTasks.filter(t => t.completed).reduce((s, t) => s + t.minutes, 0)

  const streak = useMemo(() => {
    let n = 0
    let cursor = fromDateKey(todayKey())
    while (true) {
      const list = tasks.filter(t => t.date === toDateKey(cursor))
      if (!list.length || !list.every(t => t.completed)) break
      n++; cursor = addDays(cursor, -1)
    }
    return n
  }, [tasks])

  const activity = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(fromDateKey(todayKey()), i - 6)
    const key = toDateKey(date)
    const list = tasks.filter(t => t.date === key)
    return { date, key, total: list.length, done: list.filter(t => t.completed).length }
  })

  const calendarDays = useMemo(() => {
    const first = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1)
    const start = new Date(first); start.setDate(1 - first.getDay())
    return Array.from({ length: 42 }, (_, i) => addDays(start, i))
  }, [calendarMonth])

  function completionFor(key: string) {
    const list = tasks.filter(t => t.date === key)
    return list.length ? Math.round(list.filter(t => t.completed).length / list.length * 100) : 0
  }

  function openTask(task?: Task) {
    setEditingTask(task || null)
    setTitle(task?.title || '')
    setPriority(task?.priority || 'Medium')
    setCategory(task?.category || 'Work')
    setMinutes(task?.minutes || 30)
    setShowTaskModal(true)
  }

  function saveTask(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    if (editingTask) {
      setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, title: title.trim(), priority, category, minutes } : t))
    } else {
      setTasks(prev => [...prev, { id: uid(), title: title.trim(), date: selectedDate, completed: false, priority, category, minutes, createdAt: Date.now() }])
    }
    setShowTaskModal(false)
  }

  function openRecurring(r?: RecurringTask) {
    setEditingRecurring(r || null)
    setTitle(r?.title || '')
    setPriority(r?.priority || 'Medium')
    setCategory(r?.category || 'Work')
    setMinutes(r?.minutes || 30)
    setRepeat(r?.repeat || 'Daily')
    setDays(r?.days || [1,2,3,4,5,6,0])
    setStartDate(r?.startDate || todayKey())
    setEndDate(r?.endDate || '')
    setShowRecurringModal(true)
  }

  function saveRecurring(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const data = {
      title: title.trim(), repeat, days: repeat === 'Daily' ? [1,2,3,4,5,6,0] : days,
      startDate, endDate: endDate || undefined, priority, category, minutes,
    }
    if (editingRecurring) setRecurring(prev => prev.map(r => r.id === editingRecurring.id ? { ...r, ...data } : r))
    else setRecurring(prev => [...prev, { id: uid(), ...data, active: true, createdAt: Date.now() }])
    setShowRecurringModal(false)
  }

  function toggleRecurring(id: string) {
    setRecurring(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r))
  }

  function deleteRecurring(id: string) {
    setRecurring(prev => prev.filter(r => r.id !== id))
    setTasks(prev => prev.filter(t => t.recurringId !== id))
  }

  function toggleDay(day: number) {
    setDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  }

  const repeatLabel = (r: RecurringTask) => {
    if (r.repeat === 'Daily') return 'Every day'
    if (r.repeat === 'Weekdays') return 'Every weekday'
    if (r.repeat === 'Monthly') return `Monthly · day ${fromDateKey(r.startDate).getDate()}`
    const names = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    return r.repeat === 'Weekly' ? `Weekly · ${r.days.map(d => names[d]).join(' · ')}` : r.days.map(d => names[d]).join(' · ')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark"><Icon name="check" size={16}/></div><span>Daily Focus</span></div>
        <div className="top-actions">
          <button className="icon-button" onClick={() => setShowStats(v => !v)} aria-label="Stats"><Icon name="chart"/></button>
          <button className="secondary-button recurring-top" onClick={() => openRecurring()}><Icon name="repeat" size={16}/> Recurring</button>
          <button className="primary-button" onClick={() => openTask()}><Icon name="plus" size={17}/> Add task</button>
        </div>
      </header>

      <main className="layout">
        <section className="main-column">
          <div className="hero-row">
            <div><div className="eyebrow"><Icon name="sun" size={14}/> TODAY</div><h1>{selectedDate === todayKey() ? 'Make today count.' : formatLongDate(selectedDate)}</h1><p>{formatLongDate(selectedDate)} · {dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}</p></div>
            <div className="progress-wrap"><div className="progress-ring" style={{ '--progress': `${progress * 3.6}deg` } as React.CSSProperties}><div><strong>{progress}%</strong><span>done</span></div></div></div>
          </div>

          {showStats && <div className="stats-panel">
            <div><span>Completed</span><strong>{completed}/{dayTasks.length}</strong></div>
            <div><span>Focus time</span><strong>{doneMinutes}/{focusMinutes}m</strong></div>
            <div><span>Streak</span><strong>{streak}d <Icon name="fire" size={15}/></strong></div>
            <div><span>Recurring</span><strong>{recurring.filter(r => r.active).length} active</strong></div>
          </div>}

          <div className="quick-add">
            <Icon name="plus" size={18}/><input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && title.trim()) openTask() }} placeholder="What needs to get done?"/><button onClick={() => openTask()} disabled={!title.trim()}>Add</button>
          </div>

          <div className="toolbar">
            <div className="filters"><button className={filter === 'All' ? 'filter active' : 'filter'} onClick={() => setFilter('All')}>All</button>{priorities.map(p => <button key={p} className={filter === p ? `filter active ${p.toLowerCase()}` : `filter ${p.toLowerCase()}`} onClick={() => setFilter(p)}>{p}</button>)}</div>
            <div className="search-box"><Icon name="search" size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search"/></div>
          </div>

          <div className="task-list">
            {visibleTasks.length === 0 ? <div className="empty"><div className="empty-icon"><Icon name="check" size={24}/></div><h3>Nothing here yet</h3><p>Add a task or schedule a recurring one.</p><button className="secondary-button" onClick={() => openTask()}>Add your first task</button></div> :
              visibleTasks.map(task => <article className={`task-card ${task.completed ? 'completed' : ''}`} key={task.id}>
                <button className={`check-box ${task.completed ? 'checked' : ''}`} onClick={() => setTasks(prev => prev.map(t => t.id === task.id ? {...t, completed: !t.completed} : t))}>{task.completed && <Icon name="check" size={15}/>}</button>
                <div className="task-content"><div className="task-title">{task.title}</div><div className="task-meta"><span className={`priority-dot ${task.priority.toLowerCase()}`}>{task.priority}</span><span>{task.category}</span><span><Icon name="clock" size={13}/> {task.minutes} min</span>{task.recurringId && <span className="repeat-badge"><Icon name="repeat" size={12}/> recurring</span>}</div></div>
                <div className="task-actions"><button onClick={() => openTask(task)}><Icon name="edit" size={16}/></button><button onClick={() => setTasks(prev => prev.filter(t => t.id !== task.id))}><Icon name="trash" size={16}/></button></div>
              </article>)}
          </div>

          <div className="recurring-section">
            <div className="section-heading"><div><h2>Recurring routines</h2><p>Tasks that automatically appear on their scheduled days.</p></div><button className="small-add" onClick={() => openRecurring()}><Icon name="plus" size={14}/> Schedule</button></div>
            <div className="routine-list">
              {recurring.length === 0 ? <div className="routine-empty">No recurring tasks yet. Schedule the routines you never want to forget.</div> :
                recurring.map(r => <div className={`routine-card ${!r.active ? 'inactive' : ''}`} key={r.id}>
                  <div className="routine-icon"><Icon name="repeat" size={16}/></div>
                  <div className="routine-content"><strong>{r.title}</strong><span>{repeatLabel(r)} · {r.minutes} min · {r.category}</span></div>
                  <button className={`toggle ${r.active ? 'on' : ''}`} onClick={() => toggleRecurring(r.id)} aria-label="Toggle recurring task"><i/></button>
                  <div className="routine-actions"><button onClick={() => openRecurring(r)}><Icon name="edit" size={15}/></button><button onClick={() => deleteRecurring(r.id)}><Icon name="trash" size={15}/></button></div>
                </div>)}
            </div>
          </div>

          <div className="activity-section">
            <div className="section-heading"><div><h2>Weekly rhythm</h2><p>Small wins, repeated.</p></div><span>{streak ? `${streak} day streak` : 'Start your streak today'}</span></div>
            <div className="activity-grid">{activity.map(day => { const pct = day.total ? day.done/day.total : 0; return <button key={day.key} className={`activity-day ${day.key === todayKey() ? 'today' : ''}`} onClick={() => setSelectedDate(day.key)}><span>{new Intl.DateTimeFormat('en-US',{weekday:'short'}).format(day.date)}</span><div className="activity-bar"><i style={{height:`${Math.max(8,pct*100)}%`}}/></div><strong>{day.done}/{day.total}</strong></button> })}</div>
          </div>
        </section>

        <aside className="sidebar">
          <div className="calendar-card">
            <div className="calendar-header"><div><h2>{formatMonth(calendarMonth)}</h2><p>Plan the next move.</p></div><div className="calendar-nav"><button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()-1,1))}><Icon name="left" size={16}/></button><button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,1))}><Icon name="right" size={16}/></button></div></div>
            <div className="weekdays">{['S','M','T','W','T','F','S'].map((x,i)=><span key={i}>{x}</span>)}</div>
            <div className="calendar-grid">{calendarDays.map(day => { const key=toDateKey(day); const pct=completionFor(key); return <button key={key} className={`calendar-day ${day.getMonth()!==calendarMonth.getMonth()?'muted':''} ${key===selectedDate?'selected':''} ${key===todayKey()?'today':''}`} onClick={()=>setSelectedDate(key)}><span>{day.getDate()}</span>{pct>0&&<i style={{width:`${pct}%`}}/>}</button> })}</div>
            <button className="today-button" onClick={()=>{setSelectedDate(todayKey());setCalendarMonth(new Date(new Date().getFullYear(),new Date().getMonth(),1))}}>Jump to today</button>
          </div>

          <div className="focus-card"><div className="focus-icon"><Icon name="fire" size={18}/></div><div><span>Current streak</span><strong>{streak} {streak===1?'day':'days'}</strong></div><div className="focus-line"><i style={{width:`${Math.min(100,streak*20)}%`}}/></div><p>{streak?'Keep the chain alive.':'Finish all tasks today to start.'}</p></div>

          <div className="category-card"><div className="section-heading"><div><h2>Categories</h2><p>Focus by area.</p></div></div><div className="category-list">{categories.map(c=>{const count=tasks.filter(t=>t.date===selectedDate&&t.category===c).length;return <button key={c} className={categoryFilter===c?'category active':'category'} onClick={()=>setCategoryFilter(categoryFilter===c?'All':c)}><span className={`cat-mark ${c.toLowerCase()}`}/>{c}<em>{count}</em></button>})}</div></div>
        </aside>
      </main>

      {showTaskModal && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowTaskModal(false)}}><form className="modal" onSubmit={saveTask}><div className="modal-head"><div><span className="eyebrow">TASK</span><h2>{editingTask?'Edit task':'Add a task'}</h2></div><button type="button" className="icon-button" onClick={()=>setShowTaskModal(false)}><Icon name="close"/></button></div><label>Task name<input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Solve 3 DSA problems"/></label><div className="form-grid"><label>Priority<select value={priority} onChange={e=>setPriority(e.target.value as Priority)}>{priorities.map(p=><option key={p}>{p}</option>)}</select></label><label>Category<select value={category} onChange={e=>setCategory(e.target.value as Category)}>{categories.map(c=><option key={c}>{c}</option>)}</select></label></div><label>Estimated minutes<input type="number" min="5" step="5" value={minutes} onChange={e=>setMinutes(Math.max(5,Number(e.target.value)||5))}/></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setShowTaskModal(false)}>Cancel</button><button className="primary-button">{editingTask?'Save changes':'Create task'}</button></div></form></div>}

      {showRecurringModal && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowRecurringModal(false)}}><form className="modal recurring-modal" onSubmit={saveRecurring}><div className="modal-head"><div><span className="eyebrow"><Icon name="repeat" size={13}/> RECURRING</span><h2>{editingRecurring?'Edit routine':'Schedule a routine'}</h2></div><button type="button" className="icon-button" onClick={()=>setShowRecurringModal(false)}><Icon name="close"/></button></div>
        <label>Task name<input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. DSA Practice"/></label>
        <label>Repeats<select value={repeat} onChange={e=>setRepeat(e.target.value as Repeat)}><option>Daily</option><option>Weekdays</option><option>Weekly</option><option>Monthly</option><option>Custom</option></select></label>
        {(repeat==='Weekly'||repeat==='Custom') && <div className="days-picker"><span>Days</span><div>{['S','M','T','W','T','F','S'].map((d,i)=><button type="button" key={i} className={days.includes(i)?'day-pill active':'day-pill'} onClick={()=>toggleDay(i)}>{d}</button>)}</div></div>}
        <div className="form-grid"><label>Starts<input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}/></label><label>Ends <span className="optional">(optional)</span><input type="date" min={startDate} value={endDate} onChange={e=>setEndDate(e.target.value)}/></label></div>
        <div className="form-grid"><label>Priority<select value={priority} onChange={e=>setPriority(e.target.value as Priority)}>{priorities.map(p=><option key={p}>{p}</option>)}</select></label><label>Category<select value={category} onChange={e=>setCategory(e.target.value as Category)}>{categories.map(c=><option key={c}>{c}</option>)}</select></label></div>
        <label>Estimated minutes<input type="number" min="5" step="5" value={minutes} onChange={e=>setMinutes(Math.max(5,Number(e.target.value)||5))}/></label>
        <div className="schedule-preview"><Icon name="repeat" size={15}/><span>{repeat==='Daily'?'This task will appear every day.':repeat==='Weekdays'?'This task will appear Monday to Friday.':repeat==='Monthly'?`This task will appear on day ${fromDateKey(startDate).getDate()} each month.`:`This task will appear on the selected days.`}</span></div>
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setShowRecurringModal(false)}>Cancel</button><button className="primary-button">{editingRecurring?'Save routine':'Schedule routine'}</button></div>
      </form></div>}
    </div>
  )
}

export default App
