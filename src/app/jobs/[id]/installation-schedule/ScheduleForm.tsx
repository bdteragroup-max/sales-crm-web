"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { updateInstallationPlan } from "@/app/actions/installationOrders"
import { ArrowLeft, Save, MapPin, Calendar, ClipboardList, Plus, X, Wrench } from "lucide-react"

export default function ScheduleForm({ order, currentUser }: { order: any, currentUser: any }) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const initStart = order.plannedStartDate ? new Date(order.plannedStartDate) : null
  const initEnd = order.plannedEndDate ? new Date(order.plannedEndDate) : null

  const [formData, setFormData] = useState({
    startDate: initStart ? initStart.toISOString().slice(0, 10) : "",
    startHour: initStart ? String(initStart.getHours()).padStart(2, '0') : "09",
    startMinute: initStart ? String(initStart.getMinutes()).padStart(2, '0') : "00",
    
    endDate: initEnd ? initEnd.toISOString().slice(0, 10) : "",
    endHour: initEnd ? String(initEnd.getHours()).padStart(2, '0') : "17",
    endMinute: initEnd ? String(initEnd.getMinutes()).padStart(2, '0') : "00",

    workLocation: order.workLocation || order.siteAddress || order.address || ""
  })

  const [tasks, setTasks] = useState<string[]>(() => {
    if (!order.workPlan) return [""]
    const parsed = order.workPlan.split('\n').filter((t: string) => t.trim() !== "")
    return parsed.length ? parsed : [""]
  })

  const handleTaskChange = (index: number, value: string) => {
    const newTasks = [...tasks]
    newTasks[index] = value
    setTasks(newTasks)
  }

  const addTask = () => setTasks([...tasks, ""])
  
  const removeTask = (index: number) => {
    const newTasks = tasks.filter((_, i) => i !== index)
    if (newTasks.length === 0) newTasks.push("")
    setTasks(newTasks)
  }

  const [equipments, setEquipments] = useState<string[]>(() => {
    if (!order.technicianNote) return [""]
    const parsed = order.technicianNote.split('\n').filter((t: string) => t.trim() !== "")
    return parsed.length ? parsed : [""]
  })

  const handleEquipmentChange = (index: number, value: string) => {
    const newEquipments = [...equipments]
    newEquipments[index] = value
    setEquipments(newEquipments)
  }

  const addEquipment = () => setEquipments([...equipments, ""])
  
  const removeEquipment = (index: number) => {
    const newEquipments = equipments.filter((_, i) => i !== index)
    if (newEquipments.length === 0) newEquipments.push("")
    setEquipments(newEquipments)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    try {
      const startDateTime = `${formData.startDate}T${formData.startHour}:${formData.startMinute}:00`
      const endDateTime = `${formData.endDate}T${formData.endHour}:${formData.endMinute}:00`

      const payload = {
        plannedStartDate: startDateTime,
        plannedEndDate: endDateTime,
        workLocation: formData.workLocation,
        workPlan: tasks.filter(t => t.trim() !== "").join('\n'),
        technicianNote: equipments.filter(e => e.trim() !== "").join('\n')
      }

      const res = await updateInstallationPlan(order.id, payload)
      if (!res.success) {
        throw new Error(res.error || "Failed to save plan")
      }
      router.push("/service/installation")
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push("/service/installation")}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">วางแผนงานติดตั้ง (Work Schedule)</h1>
            <p className="text-sm text-gray-500">ใบงาน: {order.installationNo} • ลูกค้า: {order.company}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm flex items-center gap-2">
            <span className="font-bold">Error:</span> {error}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Calendar className="w-4 h-4 text-blue-500" />
              เวลาเริ่มงาน (Planned Start)
            </label>
            <div className="flex gap-2">
              <input 
                type="date" 
                name="startDate"
                required
                value={formData.startDate}
                onChange={handleChange}
                className="w-[55%] p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
              />
              <div className="flex w-[45%] items-center gap-1 border border-gray-300 rounded-lg px-2 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
                <select name="startHour" value={formData.startHour} onChange={handleChange} className="w-full bg-transparent outline-none p-1 text-center appearance-none cursor-pointer">
                  {Array.from({length: 24}).map((_, i) => <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}</option>)}
                </select>
                <span className="font-bold text-gray-400">:</span>
                <select name="startMinute" value={formData.startMinute} onChange={handleChange} className="w-full bg-transparent outline-none p-1 text-center appearance-none cursor-pointer">
                  {Array.from({length: 60}).map((_, i) => <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}</option>)}
                </select>
                <span className="text-xs text-gray-400 font-medium pl-1">น.</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Calendar className="w-4 h-4 text-blue-500" />
              เวลาเสร็จสิ้น (Planned End)
            </label>
            <div className="flex gap-2">
              <input 
                type="date" 
                name="endDate"
                required
                value={formData.endDate}
                onChange={handleChange}
                className="w-[55%] p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
              />
              <div className="flex w-[45%] items-center gap-1 border border-gray-300 rounded-lg px-2 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
                <select name="endHour" value={formData.endHour} onChange={handleChange} className="w-full bg-transparent outline-none p-1 text-center appearance-none cursor-pointer">
                  {Array.from({length: 24}).map((_, i) => <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}</option>)}
                </select>
                <span className="font-bold text-gray-400">:</span>
                <select name="endMinute" value={formData.endMinute} onChange={handleChange} className="w-full bg-transparent outline-none p-1 text-center appearance-none cursor-pointer">
                  {Array.from({length: 60}).map((_, i) => <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}</option>)}
                </select>
                <span className="text-xs text-gray-400 font-medium pl-1">น.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <MapPin className="w-4 h-4 text-red-500" />
            สถานที่ปฏิบัติงาน (Work Location)
          </label>
          <input 
            type="text" 
            name="workLocation"
            required
            value={formData.workLocation}
            onChange={handleChange}
            placeholder="ระบุสถานที่ปฏิบัติงาน"
            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
          />
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <ClipboardList className="w-4 h-4 text-emerald-500" />
            รายละเอียดแผนงาน (Work Plan / Steps)
          </label>
          <div className="space-y-2">
            {tasks.map((task, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-gray-400 text-sm font-medium w-5 text-right">{index + 1}.</span>
                <input 
                  type="text"
                  value={task}
                  onChange={(e) => handleTaskChange(index, e.target.value)}
                  placeholder="ระบุขั้นตอนการทำงาน..."
                  className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeTask(index)}
                  className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addTask}
              className="flex items-center gap-2 text-sm text-blue-600 font-medium px-2 py-2 hover:bg-blue-50 rounded-lg transition-colors ml-7"
            >
              <Plus className="w-4 h-4" />
              เพิ่มขั้นตอน (Add Step)
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Wrench className="w-4 h-4 text-orange-500" />
            หมายเหตุ / อุปกรณ์ที่ต้องเตรียม (Notes / Required Equipment)
          </label>
          <div className="space-y-2">
            {equipments.map((equipment, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-gray-400 text-sm font-medium w-5 text-right">•</span>
                <input 
                  type="text"
                  value={equipment}
                  onChange={(e) => handleEquipmentChange(index, e.target.value)}
                  placeholder="เช่น ต้องใช้บันไดสูง, เตรียมสายไฟเพิ่ม..."
                  className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none bg-gray-50"
                />
                <button
                  type="button"
                  onClick={() => removeEquipment(index)}
                  className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addEquipment}
              className="flex items-center gap-2 text-sm text-blue-600 font-medium px-2 py-2 hover:bg-blue-50 rounded-lg transition-colors ml-7"
            >
              <Plus className="w-4 h-4" />
              เพิ่มอุปกรณ์/หมายเหตุ (Add Item)
            </button>
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
          <button
            type="button"
            onClick={() => router.push("/service/installation")}
            className="px-5 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            disabled={isSubmitting}
          >
            ยกเลิก (Cancel)
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? "กำลังบันทึก..." : "บันทึกแผนงาน (Save Plan)"}
          </button>
        </div>
      </form>
    </div>
  )
}
