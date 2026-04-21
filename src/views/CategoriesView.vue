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
        <!-- 大类循环 -->
        <div v-for="parent in categoryStore.parentCategories" :key="parent.id" class="parent-group">
          <!-- 大类行 -->
          <div class="category-item category-item--parent" @click="startEdit(parent)">
            <div class="item-info">
              <button @click.stop="toggleExpand(parent.id)" class="btn-icon btn-expand">
                <span class="expand-arrow" :class="{ 'is-expanded': isExpanded(parent.id) }">▶</span>
              </button>
              <span class="color-indicator" :style="{ background: parent.color }"></span>
              <span class="item-name">{{ parent.name }}</span>
              <span v-if="durationMap[parent.id]" class="time-badge">
                {{ formatDuration(durationMap[parent.id]) }}
              </span>
            </div>
            <div class="item-actions">
              <button @click.stop="startAddChild(parent)" class="btn-icon btn-icon--add" title="添加小类">＋</button>
              <button @click.stop="confirmDelete(parent)" class="btn-icon" title="删除分类">✕</button>
            </div>
          </div>

          <!-- 小类列表 -->
          <div v-show="isExpanded(parent.id)" class="children-list">
            <div v-for="child in categoryStore.getChildren(parent.id)" :key="child.id"
                class="category-item category-item--child" @click="startEdit(child)">
              <div class="item-info">
                <span class="child-indent"></span>
                <span class="color-indicator" :style="{ background: child.color }"></span>
                <span class="item-name">{{ child.name }}</span>
                <span v-if="durationMap[child.id]" class="time-badge">
                  {{ formatDuration(durationMap[child.id]) }}
                </span>
              </div>
              <button @click.stop="confirmDelete(child)" class="btn-icon" title="删除">✕</button>
            </div>
          </div>
        </div>
      </div>

       <div class="add-card" ref="formRef">
        <h3 class="card-title">{{ isEditing ? '编辑分类' : (newCat.parentId ? '新增小类' : '新增大类') }}</h3>
        <div class="form-group">
          <input v-model="newCat.name" :placeholder="newCat.parentId ? '输入小类名称...' : '输入大类名称...'" class="input-minimal" />
          
          <!-- 所属大类选择（新增时才显示，编辑时不允许改层级） -->
          <div v-if="!isEditing" class="picker-row">
            <span class="label">所属大类</span>
            <select v-model="newCat.parentId" class="select-minimal">
              <option :value="null">无（作为大类）</option>
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
             {{ isEditing ? '保存修改' : '确认添加' }}            </button>
           <button v-if="isEditing" @click="cancelEdit" class="btn btn--outline">取消</button>
         </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useCategoryStore } from '@/stores/categoryStore'
import { getTotalDurationByCategory } from '@/db'
import { formatDuration } from '@/utils/dateHelpers'

const categoryStore = useCategoryStore()
const durationMap = ref({}) // { [categoryId]: seconds }

onMounted(async () => {
  // 1. 先拿到后端原始数据
  const rawData = await getTotalDurationByCategory()
  
  // 2. 把小类的时长归并到父类显示
  for (const cat of categoryStore.categories) {
    if (cat.parentId !== null) {
      rawData[cat.parentId] = 
        (rawData[cat.parentId] || 0) + (rawData[cat.id] || 0)
    }
  }

  // 3. 最后一次性赋值给响应式变量，触发视图更新
  durationMap.value = rawData
})

const isEditing = ref(false)
const editingId = ref(null)
const formRef = ref(null)

// 1. 数据结构中移除 icon
const newCat = ref({
  name: '',
  color: '#3B82F6',
  parentId: null
})
// === 新增：控制展开/折叠的状态 ===
const expandedIds = ref([]) // 存储当前展开的大类 ID

function toggleExpand(id) {
  const index = expandedIds.value.indexOf(id)
  if (index > -1) {
    // 如果已经展开，则移除 ID（折叠）
    expandedIds.value.splice(index, 1)
  } else {
    // 否则加入 ID（展开）
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
// 2. 增加删除确认功能
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

/* 代替图标的颜色指示器 */
.color-indicator { 
  width: 4px; height: 18px; border-radius: 2px;
}

.item-name { font-weight: 700; font-size: 15px; color: var(--color-fg); }

.btn-icon { 
  color: var(--color-fg-muted); background: none; border: none; 
  padding: 8px; cursor: pointer; font-size: 16px; transition: color 0.2s;
}
.btn-icon:hover { color: #ef4444; }

.add-card { 
  background: var(--color-bg); padding: 24px; 
  border: 1px solid var(--color-border); border-radius: var(--radius-md); 
}
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

.color-dot { 
  appearance: none;
  -webkit-appearance: none;
  width: 36px; 
  height: 36px; 
  border: none; 
  background: none; 
  cursor: pointer; 
  padding: 0; 
}
/* 清除浏览器默认的内部 padding，防止形状被挤压成椭圆 */
.color-dot::-webkit-color-swatch-wrapper { 
  padding: 0; 
}
/* 改为圆角矩形，与系统整体的 var(--radius-md) 保持协调 */
.color-dot::-webkit-color-swatch { 
  border: 2px solid var(--color-border); 
  border-radius: var(--radius-md); 
}
.color-dot::-moz-color-swatch { 
  border: 2px solid var(--color-border); 
  border-radius: var(--radius-md); 
}

.btn { width: 100%; height: 52px; border-radius: var(--radius-md); border: none; font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
.btn--primary { background: var(--color-primary); color: var(--color-bg); }
.btn--outline { background: transparent; color: var(--color-fg); border: 1.5px solid var(--color-border); margin-top: 8px; }
.btn--primary:active { transform: scale(0.97); }
.button-group { display: flex; flex-direction: column; }

.parent-group { margin-bottom: 8px; }

.category-item--parent {
  background: var(--color-bg);
  border-left: 3px solid var(--color-primary);
}

.category-item--child {
  background: var(--color-muted);
  margin-left: 16px;
  border-left: 3px solid var(--color-border);
}

.children-list { display: flex; flex-direction: column; gap: 6px; margin-top: 6px; }

.child-indent { width: 8px; flex-shrink: 0; }

.item-actions { display: flex; align-items: center; gap: 4px; }

.btn-icon--add {
  color: var(--color-primary);
  font-size: 18px;
}

.select-minimal {
  background: var(--color-muted);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 6px 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-fg);
  cursor: pointer;
}

/* --- 新增：展开/折叠箭头样式 --- */
.btn-expand {
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.expand-arrow {
  display: inline-block;
  font-size: 11px;
  color: var(--color-fg-muted);
  transition: transform 0.2s ease; /* 旋转动画效果 */
}

/* 展开状态下箭头向下转 90 度 */
.expand-arrow.is-expanded {
  transform: rotate(90deg);
}

/* 新增：时长标签样式 */
.time-badge {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-fg-muted);
  background: var(--color-muted);
  padding: 2px 8px;
  border-radius: 12px;
  margin-left: 8px;
  /* 使用等宽数字防止时长变化时文字抖动 */
  font-feature-settings: "tnum";
  opacity: 0.8;
}

/* 如果是在小类中，字体可以再稍微小一点以示区分 */
.category-item--child .time-badge {
  font-size: 10px;
  opacity: 0.6;
}
</style>