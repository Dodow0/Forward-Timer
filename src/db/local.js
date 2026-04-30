import Dexie from 'dexie'
import { markUnsynced } from '@/sync/syncState'

export const db = new Dexie('PomodoroApp')

db.version(1).stores({
  categories: '++id, parentId, archived, created_at',
  records:    '++id, categoryId, date, startTime',
})

;['categories', 'records'].forEach((tableName) => {
  const table = db.table(tableName)

  table.hook('creating', () => {
    markUnsynced()
  })

  table.hook('updating', () => {
    markUnsynced()
  })

  table.hook('deleting', () => {
    markUnsynced()
  })
})
