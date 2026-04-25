import { getCategories, getAllCategories, getAllRecords, addCategory, addRecord } from '@/db'

// ─── JSON 导出 ───────────────────────────────────────────────
export async function exportAsJSON() {
  const [categories, records] = await Promise.all([
    getCategories(),
    getAllRecords()
  ])

  const payload = {
    meta: {
      exportedAt: new Date().toISOString(),
      appVersion: '1.0',
      categoryCount: categories.length,
      recordCount: records.length
    },
    categories,
    records: records.map(r => ({
      id:         r.id,
      categoryId: r.category_id,
      date:       r.date,
      startTime:  r.start_time,
      duration:   r.duration
    }))
  }

  // 把 JS 对象序列化成格式化的 JSON 字符串，第三个参数 2 是缩进空格数
  // 格式化输出让文件对人类也可读，而不是压缩成一行
  const json = JSON.stringify(payload, null, 2)
  downloadFile(json, `timelog-backup-${today()}.json`, 'application/json')
}

// ─── CSV 导出 ────────────────────────────────────────────────
export async function exportAsCSV(categoryStore) {
  const records = await getAllRecords()

  // 第一行是表头
  const rows = ['日期,开始时间,时长(分钟),大类,小类']

  for (const r of records) {
    // 通过 categoryStore 查找该条记录对应的分类信息
    const cat = categoryStore.findById(r.category_id)
    
    // 判断是大类还是小类
    // 如果 parentId 为 null，说明是大类，小类列留空
    // 如果 parentId 不为 null，则找到父类名称
    const isChild   = cat?.parentId !== null
    const childName  = isChild ? cat?.name ?? '' : ''
    const parentName = isChild
      ? (categoryStore.findById(cat.parentId)?.name ?? '')
      : (cat?.name ?? '')

    // 把 startTime（毫秒时间戳）格式化成 HH:MM 字符串
    const startStr = new Date(r.start_time)
      .toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

    // Math.round 避免浮点数导致出现 59.9999 这种情况
    const minutes = Math.round(r.duration / 60)

    rows.push(`${r.date},${startStr},${minutes},${parentName},${childName}`)
  }

  downloadFile(rows.join('\n'), `timelog-${today()}.csv`, 'text/csv;charset=utf-8')
}

// ─── JSON 导入 ────────────────────────────────────────────────
export async function importFromJSON(file) {
  const text = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = e => resolve(e.target.result)
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file)
  })

  let backup
  try {
    backup = JSON.parse(text)
  } catch {
    throw new Error('文件格式错误，请选择有效的 JSON 备份文件')
  }

  if (!backup.categories || !backup.records) {
    throw new Error('备份文件结构不完整，缺少 categories 或 records 字段')
  }

  // 智能合并核心 1：获取当前数据库里已有的所有数据
  const existingCategories = await getAllCategories() 
  const existingRecords = await getAllRecords()

  const idMap = {} // { oldId: newId }
  let importedCategoryCount = 0
  let importedRecordCount = 0

  const parents  = backup.categories.filter(c => c.parentId === null)
  const children = backup.categories.filter(c => c.parentId !== null)

  // --- 1. 智能合并：大类 ---
  for (const cat of parents) {
    // 寻找是否已有同名大类
    const match = existingCategories.find(c => c.name === cat.name && c.parentId === null)
    if (match) {
      idMap[cat.id] = match.id // 存在，直接沿用现有的 ID
    } else {
      const newId = await addCategory({ name: cat.name, color: cat.color, parentId: null })
      idMap[cat.id] = newId    // 不存在，创建新的并映射
      importedCategoryCount++
    }
  }

  // --- 2. 智能合并：小类 ---
  for (const cat of children) {
    const newParentId = idMap[cat.parentId]
    // 寻找是否已有同名且归属同一个大类的小类
    const match = existingCategories.find(c => c.name === cat.name && c.parentId === newParentId)
    
    if (match) {
      idMap[cat.id] = match.id
    } else {
      const newId = await addCategory({ name: cat.name, color: cat.color, parentId: newParentId })
      idMap[cat.id] = newId
      importedCategoryCount++
    }
  }

  // --- 3. 智能合并：计时记录 ---
  for (const record of backup.records) {
    const newCategoryId = idMap[record.categoryId]
    if (!newCategoryId) continue 

    // 检查是否已经存在完全相同的记录（防重复导入）
    const isDuplicate = existingRecords.some(r => 
      r.categoryId === newCategoryId &&
      r.date === record.date &&
      r.startTime === record.startTime &&
      r.duration === record.duration
    )

    if (!isDuplicate) {
      await addRecord({
        categoryId: newCategoryId,
        date:       record.date,
        startTime:  record.startTime,
        duration:   record.duration
      })
      importedRecordCount++
    }
  }

  // 返回实际新增的数量，而不是备份文件里的总数
  return { 
    categoryCount: importedCategoryCount, 
    recordCount: importedRecordCount 
  }
}

// ─── 工具函数 ─────────────────────────────────────────────────

// 触发浏览器下载，不需要服务器参与
// 原理是动态创建一个 <a> 标签，把数据编码成 Blob URL，模拟点击
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  // 释放内存，避免 URL 对象泄漏
  URL.revokeObjectURL(url)
}

function today() {
  return new Date().toISOString().slice(0, 10)
}