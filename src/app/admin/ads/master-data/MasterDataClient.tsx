'use client'

import { useState } from 'react'
import { addMasterData, updateMasterData, deleteMasterData } from '@/app/actions/ads-master-data'
import { Edit2, Trash2, Check, X, Plus, AlertCircle } from 'lucide-react'

type Item = { id: string; name: string; isActive: boolean }

type Props = {
  accounts: Item[]
  channels: Item[]
  objectives: Item[]
  resultTypes: Item[]
}

export default function MasterDataClient({ accounts, channels, objectives, resultTypes }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-4 gap-6">
      <Section title="บัญชีโฆษณา (Ad Accounts)" type="Account" items={accounts} />
      <Section title="ช่องทาง (Ad Channels)" type="Channel" items={channels} />
      <Section title="วัตถุประสงค์ (Ad Objectives)" type="Objective" items={objectives} />
      <Section title="ประเภทผลลัพธ์ (Ad Result Types)" type="ResultType" items={resultTypes} />
    </div>
  )
}

function Section({ title, type, items }: { title: string, type: 'Account' | 'Channel' | 'Objective' | 'ResultType', items: Item[] }) {
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setLoading(true)
    setError('')
    const res = await addMasterData(type, newName)
    if (!res.success) setError(res.error || 'Failed to add')
    else setNewName('')
    setLoading(false)
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
      <h2 className="text-lg font-semibold mb-4 text-gray-800">{title}</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2 border border-red-100">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input 
          type="text" 
          value={newName} 
          onChange={(e) => setNewName(e.target.value)}
          placeholder="เพิ่มใหม่ (Add new)..." 
          className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-red-500" 
        />
        <button 
          type="submit" 
          disabled={loading || !newName.trim()}
          className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
        >
          <Plus size={18} />
        </button>
      </form>

      <ul className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
        {items.map(item => (
          <ListItem key={item.id} item={item} type={type} setError={setError} />
        ))}
        {items.length === 0 && (
          <li className="text-gray-400 text-sm text-center py-4 italic">ไม่มีข้อมูล (No data)</li>
        )}
      </ul>
    </div>
  )
}

function ListItem({ item, type, setError }: { item: Item, type: 'Account' | 'Channel' | 'Objective' | 'ResultType', setError: (msg: string) => void }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(item.name)
  const [editActive, setEditActive] = useState(item.isActive)
  const [loading, setLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleSave = async () => {
    if (!editName.trim()) return
    setLoading(true)
    setError('')
    const res = await updateMasterData(type, item.id, editName, editActive)
    if (!res.success) {
      setError(res.error || 'Failed to update')
    } else {
      setIsEditing(false)
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    setLoading(true)
    setError('')
    const res = await deleteMasterData(type, item.id)
    if (!res.success) {
      setError(res.error || 'Failed to delete')
      setConfirmDelete(false)
    }
    setLoading(false)
  }

  if (isEditing) {
    return (
      <li className="p-3 bg-yellow-50 rounded-lg border border-yellow-100 space-y-3">
        <input 
          type="text" 
          value={editName} 
          onChange={(e) => setEditName(e.target.value)}
          className="w-full px-3 py-1.5 border border-yellow-200 rounded bg-white text-sm focus:outline-none" 
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input 
              type="checkbox" 
              checked={editActive} 
              onChange={(e) => setEditActive(e.target.checked)}
              className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
            />
            เปิดใช้งาน (Active)
          </label>
          <div className="flex gap-2">
            <button 
              onClick={() => { setIsEditing(false); setEditName(item.name); setEditActive(item.isActive); setConfirmDelete(false); }}
              disabled={loading}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
            >
              <X size={16} />
            </button>
            <button 
              onClick={handleSave}
              disabled={loading || !editName.trim()}
              className="p-1.5 text-white bg-green-500 hover:bg-green-600 rounded transition-colors disabled:opacity-50"
            >
              <Check size={16} />
            </button>
          </div>
        </div>
      </li>
    )
  }

  return (
    <li className={`p-3 rounded-lg border flex items-center justify-between group transition-colors ${item.isActive ? 'bg-white border-gray-100 hover:border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60 hover:opacity-100'}`}>
      <div className="flex flex-col">
        <span className={`text-sm font-medium ${item.isActive ? 'text-gray-800' : 'text-gray-500 line-through decoration-gray-300'}`}>
          {item.name}
        </span>
        {!item.isActive && <span className="text-[10px] text-red-500 font-semibold uppercase tracking-wider">Inactive</span>}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-600 font-bold mr-1">แน่ใจ?</span>
            <button 
              onClick={() => setConfirmDelete(false)}
              disabled={loading}
              className="p-1.5 text-gray-400 hover:bg-gray-200 rounded transition-colors"
            >
              <X size={14} />
            </button>
            <button 
              onClick={handleDelete}
              disabled={loading}
              className="p-1.5 text-white bg-red-600 hover:bg-red-700 rounded transition-colors disabled:opacity-50"
            >
              <Check size={14} />
            </button>
          </div>
        ) : (
          <>
            <button 
              onClick={() => setIsEditing(true)}
              disabled={loading}
              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors"
              title="แก้ไข (Edit)"
            >
              <Edit2 size={16} />
            </button>
            <button 
              onClick={() => setConfirmDelete(true)}
              disabled={loading}
              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="ลบ (Delete)"
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>
    </li>
  )
}
