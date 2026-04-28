<template>
  <div class="categories-view">
    <header class="page-header">
      <div class="header-content">
        <p class="eyebrow">任务管理</p>
        <h1 class="display-title">分类</h1>
      </div>
    </header>

    <div class="content-body">
      <div class="category-list">
        <div v-for="parent in categoryStore.parentCategories" :key="parent.id" class="parent-group">
          <div class="category-item category-item--parent">
            <div class="item-info" @click="startEdit(parent)">
              <button @click.stop="toggleExpand(parent.id)" class="btn-icon btn-expand">
                <ChevronRight class="expand-arrow" :class="{ 'is-expanded': isExpanded(parent.id) }" :size="16" :stroke-width="2" />
              </button>

              <span class="color-indicator" :style="{ background: parent.color }"></span>
              <div class="item-text">
              <span class="item-name">{{ parent.name }}</span>
              
              <span v-if="durationMap[parent.id] !== undefined" class="time-sub">
                {{ formatDuration(durationMap[parent.id]) }}
              </span>
            </div>
            </div>
            
            <div class="item-actions">
              <button @click.stop="startAddChild(parent)" class="btn-icon btn-icon--add" title="添加小类">
                <Plus :size="18" :stroke-width="2" />
              </button>
              <button @click.stop="confirmArchive(parent)" class="btn-icon btn-icon--archive" title="归档分类">
                <Archive :size="18" :stroke-width="2" />
              </button>
              <button @click.stop="confirmDelete(parent)" class="btn-icon" title="删除分类">
                <Trash2 :size="18" :stroke-width="2" />
              </button>
            </div>
          </div>

          <div v-if="isExpanded(parent.id)" class="children-list">
            <div v-for="child in (categoryStore.childrenMap?.[parent.id] || [])" :key="child.id" class="category-item category-item--child">
              <div class="item-info" @click="startEdit(child)">
                <span class="child-indent"></span>
                <span class="color-indicator" :style="{ background: child.color }"></span>
                <span class="item-name">{{ child.name }}</span>
                <span v-if="durationMap[child.id] !== undefined" class="time-badge">
                  {{ formatDuration(durationMap[child.id]) }}
                </span>
              </div>

              <button @click.stop="confirmDelete(child)" class="btn-icon" title="删除">
                <Trash2 :size="18" :stroke-width="2" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="add-card" ref="formRef">
        <h3 class="card-title">
          {{ isEditing ? '编辑分类' : (newCat.parentId ? '新增小类' : '新增大类') }}
        </h3>

        <div class="form-group">
          <input v-model="newCat.name" :placeholder="newCat.parentId ? '输入小类名称...' : '输入大类名称...'" class="input-minimal" />

          <div v-if="!isEditing" class="picker-row">
            <span class="label">所属大类</span>
            <select v-model="newCat.parentId" class="select-minimal">
              <option :value="undefined">无（作为大类）</option>
              <option v-for="p in categoryStore.parentCategories" :key="p.id" :value="p.id">
                {{ p.name }}
              </option>
            </select>
          </div>

          <div class="picker-row">
            <span class="label">选择主题色</span>
            <input v-model="newCat.color" type="color" class="color-dot" />
          </div>

          <div class="button-group">
            <button @click="handleSave" class="btn btn--primary">
              {{ isEditing ? '保存修改' : '确认添加' }}
            </button>
            <button v-if="isEditing" @click="cancelEdit" class="btn btn--outline">
              取消
            </button>
          </div>
        </div>
      </div>

      <div class="archive-section">
        <button class="archive-toggle" @click="showArchived = !showArchived">
          <span>已归档分类（{{ archivedList.length }}）</span>
          <ChevronRight class="expand-arrow" :class="{ 'is-expanded': showArchived }" :size="16" :stroke-width="2" />
        </button>

        <div v-if="showArchived" class="archived-list">
          <p v-if="archivedList.length === 0" class="empty-hint">暂无归档分类</p>
          <div v-for="cat in archivedList" :key="cat.id" class="category-item category-item--archived">
            <div class="item-info">
              <span class="color-indicator" :style="{ background: cat.color }"></span>
              <span class="item-name">{{ cat.name }}</span>
              <span class="parent-hint" v-if="cat.parentId">
                {{ categoryStore.findById(cat.parentId)?.name }}
              </span>
            </div>

            <div class="item-actions">
              <button @click="categoryStore.unarchive(cat.id)" class="btn-icon btn-icon--restore" title="恢复分类">
                <RotateCcw :size="18" :stroke-width="2" />
              </button>
              <button @click="confirmDelete(cat)" class="btn-icon" title="永久删除">
                <Trash2 :size="18" :stroke-width="2" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useCategoryStore } from '@/stores/categoryStore'
import { getTotalDurationByCategory } from '@/db'
import { formatDuration } from '@/utils/dateHelpers'
import { ChevronRight, Plus, Archive, Trash2, RotateCcw } from 'lucide-vue-next'

const categoryStore = useCategoryStore()
const durationMap = ref({}) 
const showArchived = ref(false) 
const archivedList = computed(() => categoryStore.allCategories.filter(c => c.archived))

onMounted(async () => {
  await categoryStore.loadCategories()
  const rawData = await getTotalDurationByCategory()
  
  for (const cat of categoryStore.categories) {
    if (cat.parentId !== null) {
      rawData[cat.parentId] = (rawData[cat.parentId] || 0) + (rawData[cat.id] || 0)
    }
  }
  durationMap.value = rawData
})

const isEditing = ref(false)
const editingId = ref(null)
const formRef = ref(null)

const newCat = ref({
  name: '',
  color: '#3B82F6',
  parentId: null
})

const expandedIds = ref([])

function toggleExpand(id) {
  const index = expandedIds.value.indexOf(id)
  if (index > -1) {
    expandedIds.value.splice(index, 1)
  } else {
    expandedIds.value.push(id)
  }
}

function isExpanded(id) {
  return expandedIds.value.includes(id)
}

function startEdit(cat) {
  isEditing.value = true
  editingId.value = cat.id
  newCat.value = { name: cat.name, color: cat.color }
  formRef.value?.scrollIntoView({ behavior: 'smooth' })
}

function startAddChild(parent) {
  if (!isExpanded(parent.id)) {
    expandedIds.value.push(parent.id)
  }
  isEditing.value = false
  editingId.value = null
  newCat.value = { name: '', color: parent.color, parentId: parent.id }
  formRef.value?.scrollIntoView({ behavior: 'smooth' })
}

function cancelEdit() {
  isEditing.value = false
  editingId.value = null
  newCat.value = { name: '', color: '#3B82F6', parentId: null }
}

async function confirmArchive(cat) {
  const confirmed = window.confirm(
    `📦 确定要归档“${cat.name}”吗？\n\n归档后的分类将移动到页面底部的“已归档分类”列表中。`
  )
  if (confirmed) {
    await categoryStore.archive(cat.id)
  }
}

async function confirmDelete(cat) {
  const confirmed = window.confirm(
    `🚨 确定要删除“${cat.name}”吗？\n\n删除分类会同时抹除该分类下的所有计时记录，此操作不可逆！`
  )
  if (confirmed) {
    await categoryStore.remove(cat.id)
  }
}

async function handleSave() {
  if (!newCat.value.name.trim()) return
  
  if (isEditing.value) {
    await categoryStore.update(editingId.value, { ...newCat.value })
  } else {
    await categoryStore.add({ ...newCat.value })
  }
  cancelEdit()
}
</script>

<style scoped>
.categories-view { min-height: 100vh; background: var(--color-muted); }
.page-header { padding: 32px 20px 20px; background: var(--color-bg); border-bottom: 1px solid var(--color-border); }
.content-body { padding: 20px; display: flex; flex-direction: column; gap: 20px; }

.category-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; background: var(--color-bg);
  border: 1px solid var(--color-border); border-radius: var(--radius-md);
  margin-bottom: 12px;
  cursor: pointer;
}

.item-info { display: flex; align-items: center; gap: 16px; }
.color-indicator { width: 4px; height: 18px; border-radius: 2px; }
.item-name { font-weight: 700; font-size: 15px; color: var(--color-fg); }

/* 图标按钮居中修正 */
.btn-icon { 
  color: var(--color-fg-muted); 
  background: none; 
  border: none; 
  padding: 8px; 
  cursor: pointer; 
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}
.btn-icon:hover { color: #ef4444; }

.add-card { background: var(--color-bg); padding: 24px; border: 1px solid var(--color-border); border-radius: var(--radius-md); }
.card-title { font-size: 12px; font-weight: 700; color: var(--color-fg-muted); margin-bottom: 16px; text-transform: uppercase; }

.input-minimal {
  width: 100%; padding: 14px; background: var(--color-muted);
  border: 1.5px solid transparent; border-radius: 8px;
  font-size: 14px; color: var(--color-fg); margin-bottom: 16px;
  transition: all 0.2s;
}
.input-minimal:focus { border-color: var(--color-primary); background: var(--color-bg); }

.picker-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
.picker-row .label { font-size: 13px; font-weight: 600; color: var(--color-fg-muted); }

.color-dot { appearance: none; -webkit-appearance: none; width: 36px; height: 36px; border: none; background: none; cursor: pointer; padding: 0; }
.color-dot::-webkit-color-swatch-wrapper { padding: 0; }
.color-dot::-webkit-color-swatch { border: 2px solid var(--color-border); border-radius: var(--radius-md); }
.color-dot::-moz-color-swatch { border: 2px solid var(--color-border); border-radius: var(--radius-md); }

.btn { width: 100%; height: 52px; border-radius: var(--radius-md); border: none; font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
.btn--primary { background: var(--color-primary); color: var(--color-bg); }
.btn--outline { background: transparent; color: var(--color-fg); border: 1.5px solid var(--color-border); margin-top: 8px; }
.btn--primary:active { transform: scale(0.97); }
.button-group { display: flex; flex-direction: column; }

.parent-group { margin-bottom: 8px; }
.category-item--parent { background: var(--color-bg); border-left: 3px solid var(--color-primary); }
.category-item--child { background: var(--color-muted); margin-left: 16px; border-left: 3px solid var(--color-border); }
.children-list { display: flex; flex-direction: column; gap: 6px; margin-top: 6px; }
.child-indent { width: 8px; flex-shrink: 0; }
.item-actions { display: flex; align-items: center; gap: 4px; }

.btn-icon--add { color: var(--color-primary); font-size: 18px; }

.select-minimal { background: var(--color-muted); border: 1.5px solid var(--color-border); border-radius: var(--radius-md); padding: 6px 10px; font-size: 13px; font-weight: 600; color: var(--color-fg); cursor: pointer; }

.btn-expand { padding: 4px; display: flex; align-items: center; justify-content: center; }
.expand-arrow { color: var(--color-fg-muted); transition: transform 0.2s ease; }
.expand-arrow.is-expanded { transform: rotate(90deg); }

.time-badge { font-size: 11px; font-weight: 700; color: var(--color-fg-muted); background: var(--color-muted); padding: 2px 8px; border-radius: 12px; margin-left: 8px; font-feature-settings: "tnum"; opacity: 0.8; }
.category-item--child .time-badge { font-size: 10px; opacity: 0.6; }
.item-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* 时长变成小字副标题，不再是 badge 胶囊形状 */
.time-sub {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-fg-muted);
  font-feature-settings: "tnum"; /* 等宽数字，对齐更好看 */
}

.archive-toggle { width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 13px; font-weight: 700; color: var(--color-fg-muted); cursor: pointer; }
.archive-section { margin-top: 8px; }
.archived-list { margin-top: 8px; display: flex; flex-direction: column; gap: 8px; }
.category-item--archived { opacity: 0.6; background: var(--color-muted); border-style: dashed; }
.parent-hint { font-size: 11px; color: var(--color-fg-muted); background: var(--color-muted); padding: 2px 6px; border-radius: 4px; }

.btn-icon--restore { color: var(--color-accent); }
.btn-icon--restore:hover { color: var(--color-accent); opacity: 0.7; }
.btn-icon--archive:hover { color: #f59e0b; }
</style>