/**
 * stores/categoryStore.js — 分类管理全局状态
 *
 * 分类数据需要在"计时页"和"统计页"都能访问，
 * 所以放在 Store 里而不是某个组件的本地状态里。
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getCategories, addCategory, updateCategory, deleteCategory } from '@/db'
import { supabase } from '@/lib/supabase'  

export const useCategoryStore = defineStore('category', () => {
  const categories = ref([])  // 分类列表，初始为空

  // 预置的默认分类，供初次使用的用户直接选择
  const DEFAULT_CATEGORIES = [
    { name: '工作',   color: '#e05c4b'},
    { name: '学习',   color: '#4b8fe0'},
    { name: '运动',   color: '#4be075'},
    { name: '娱乐',   color: '#e0c44b'},
    { name: '阅读',   color: '#b44be0'},
  ]

  // 从数据库加载分类，应用启动时调用一次
  async function loadCategories() {
    const stored = await getCategories()

    // 如果是第一次使用，自动写入默认分类
    if (stored.length === 0) {
      for (const cat of DEFAULT_CATEGORIES) {
        await addCategory(cat)
      }
      categories.value = await getCategories()
    } else {
      categories.value = stored
    }
        // 新增：实时监听 categories 表变化，任何端增删改都自动同步
    supabase
      .channel('categories-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        // 有任何变化时重新拉取最新数据
        getCategories().then(data => { categories.value = data })
      })
      .subscribe()
  }

  async function add(data) {
    await addCategory(data)
    await loadCategories()  // 重新加载以获取数据库自动生成的 id
  }

  async function update(id, changes) {
    await updateCategory(id, changes)
    await loadCategories()
  }

  async function remove(id) {
    await deleteCategory(id)
    await loadCategories()
  }

  // 只取大类（parentId 为 null）
const parentCategories = computed(() =>
  categories.value.filter(c => c.parentId === null)
)

// 取某个大类下的小类
function getChildren(parentId) {
  return categories.value.filter(c => c.parentId === parentId)
}

  // 根据 id 快速查找分类对象（图表渲染时用）
  function findById(id) {
    return categories.value.find(c => c.id === id)
  }

  return { categories, parentCategories, loadCategories, add, update, remove, findById, getChildren }
})
