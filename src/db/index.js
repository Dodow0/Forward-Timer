/**
 * db/index.js — 数据库层（Supabase 云端版）
 * 对外接口与原 Dexie 版本保持一致，其他文件无需改动
 */

import { supabase } from '@/lib/supabase'

// 固定的设备标识，只有你自己用不需要区分用户
const MY_USER_ID = 'my-device'
// ─────────────────────────────────────────
// 分类相关操作
// ─────────────────────────────────────────

export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('created_at')
  if (error) throw error
  return data.map(r => ({
    id:        r.id,
    name:      r.name,
    color:     r.color,
    parentId:  r.parent_id ?? null,
    createdAt: r.created_at
  }))
}

export async function addCategory({ name, color, parentId = null }) {
  const { data, error } = await supabase
    .from('categories')
    .insert({ user_id: MY_USER_ID, name, color, parent_id: parentId, created_at: Date.now() })
    .select()
    .single()
  if (error) throw error
  return data.id
}

export async function updateCategory(id, changes) {
  const { error } = await supabase
    .from('categories')
    .update({
      ...(changes.name  && { name:  changes.name }),
      ...(changes.color && { color: changes.color }),
      ...(changes.parentId !== undefined && { parent_id: changes.parentId }),
    })
    .eq('id', id)
  if (error) throw error
}

export async function deleteCategory(id) {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ─────────────────────────────────────────
// 计时记录相关操作
// ─────────────────────────────────────────

export async function addRecord({ categoryId, date, startTime, duration }) {
  const { error } = await supabase
    .from('records')
    .insert({
      user_id:     MY_USER_ID,
      category_id: categoryId,
      date,
      start_time:  startTime,
      duration
    })
  if (error) throw error
}

export async function getRecordsByRange(startDate, endDate) {
  const { data, error } = await supabase
    .from('records')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
  if (error) throw error
  return data.map(r => ({
    id:         r.id,
    categoryId: r.category_id,
    date:       r.date,
    startTime:  r.start_time,
    duration:   r.duration
  }))
}

export async function getRecordsByDate(date) {
  const { data, error } = await supabase
    .from('records')
    .select('*')
    .eq('date', date)
  if (error) throw error
  return data.map(r => ({
    id:         r.id,
    categoryId: r.category_id,
    date:       r.date,
    startTime:  r.start_time,
    duration:   r.duration
  }))
}
// 删除单条计时记录
export async function deleteRecord(id) {
  const { error } = await supabase
    .from('records')
    .delete()
    .eq('id', id)
  if (error) throw error
}