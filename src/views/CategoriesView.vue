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
        <div v-for="cat in categoryStore.categories" :key="cat.id" class="category-item" @click="startEdit(cat)">
          <div class="item-info">
            <span class="color-indicator" :style="{ background: cat.color }"></span>
            <span class="item-name">{{ cat.name }}</span>
          </div>
          <button @click.stop="confirmDelete(cat)" class="btn-icon" title="删除分类">✕</button>
        </div>
      </div>

       <div class="add-card" ref="formRef">
        <h3 class="card-title">{{ isEditing ? '编辑分类' : '新增分类' }}</h3>
        <div class="form-group">
         <input v-model="newCat.name" :placeholder="isEditing ? '修改名称...' : '输入分类名称...'" class="input-minimal" />
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
import { ref } from 'vue'
import { useCategoryStore } from '@/stores/categoryStore'

const categoryStore = useCategoryStore()
const isEditing = ref(false)
const editingId = ref(null)
const formRef = ref(null)

// 1. 数据结构中移除 icon
const newCat = ref({
  name: '',
  color: '#3B82F6'
})
function startEdit(cat) {
  isEditing.value = true
  editingId.value = cat.id
  newCat.value = { name: cat.name, color: cat.color }
  formRef.value?.scrollIntoView({ behavior: 'smooth' })
}

function cancelEdit() {
  isEditing.value = false
  editingId.value = null
  newCat.value = { name: '', color: '#3B82F6' }
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
</style>