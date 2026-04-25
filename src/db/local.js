import Dexie from 'dexie'

export const db = new Dexie('PomodoroApp')

db.version(1).stores({
  categories: '++id, parentId, archived, created_at',
  records:    '++id, categoryId, date, startTime',
})