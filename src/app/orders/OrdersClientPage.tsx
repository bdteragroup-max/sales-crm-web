'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateOrderStatus } from '@/app/actions/orders'
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  User2,
} from 'lucide-react'

interface OrdersClientPageProps {
  initialOrders: any[]
  teamMembers: any[]
  userRole?: string
  currentUserId?: string
}

export default function OrdersClientPage({
  initialOrders,
  teamMembers,
  userRole,
  currentUserId
}: OrdersClientPageProps) {
  const router = useRouter()
  const [orders, setOrders] = useState(initialOrders)
  
  // Drag state
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [memberFilter, setMemberFilter] = useState('')
  
  const isManager = userRole === 'ผู้จัดการ'

  const COLUMNS = [
    { id: 'รอยืนยัน', label: 'รอการยืนยัน', subLabel: 'Pending', accent: '#f59e0b', icon: Clock },
    { id: 'กำลังผลิต', label: 'กำลังผลิต', subLabel: 'In Production', accent: '#3b82f6', icon: Package },
    { id: 'กำลังจัดส่ง', label: 'กำลังจัดส่ง', subLabel: 'Shipping', accent: '#8b5cf6', icon: Truck },
    { id: 'เสร็จสิ้น', label: 'เสร็จสิ้น', subLabel: 'Completed', accent: '#10b981', icon: CheckCircle2 }
  ]

  // Filter orders
  const filteredOrders = orders.filter((o: any) => {
    const matchesSearch = 
      o.company?.companyName?.toLowerCase().includes(search.toLowerCase()) ||
      o.orderNumber?.toLowerCase().includes(search.toLowerCase())
    
    const matchesMember = memberFilter ? o.salespersonId === memberFilter : true

    return matchesSearch && matchesMember
  })

  const getColumnData = (status: string) => {
    const list = filteredOrders.filter((o: any) => o.status === status)
    const totalValue = list.reduce((sum: number, o: any) => sum + (Number(o.value) || 0), 0)
    return { list, totalValue }
  }

  // Formatting helpers
  const fmtMoney = (val: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(val)
  const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').substring(0, 2) : '—'

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id)
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
    
    // Create a drag image
    const element = e.currentTarget as HTMLElement
    const dragImage = element.cloneNode(true) as HTMLElement
    dragImage.style.position = 'absolute'
    dragImage.style.top = '-1000px'
    dragImage.style.opacity = '1'
    document.body.appendChild(dragImage)
    e.dataTransfer.setDragImage(dragImage, 20, 20)
    setTimeout(() => document.body.removeChild(dragImage), 0)
  }

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedOverColumn !== status) {
      setDraggedOverColumn(status)
    }
  }

  const handleDragLeave = () => {
    setDraggedOverColumn(null)
  }

  const handleDragEnd = () => {
    setDraggingId(null)
    setDraggedOverColumn(null)
  }

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault()
    setDraggedOverColumn(null)
    const orderId = e.dataTransfer.getData('text/plain')
    if (!orderId) return

    const order = orders.find((o: any) => o.id === orderId)
    if (!order || order.status === newStatus) return

    // Optmistic Update
    const previousOrders = [...orders]
    setOrders(orders.map((o: any) => 
      o.id === orderId ? { ...o, status: newStatus } : o
    ))

    try {
      const res = await updateOrderStatus(orderId, newStatus)
      if (!res.success) {
        alert(res.error)
        setOrders(previousOrders) // Rollback
      }
    } catch (err) {
      console.error(err)
      alert("Failed to move order")
      setOrders(previousOrders) // Rollback
    }
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Package className="text-blue-600" size={24} />
            กระดานติดตามออเดอร์
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Post-Sales Order Management</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="ค้นหาชื่อบริษัท หรือเลขออเดอร์..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 w-full sm:w-64 bg-gray-50 border-none rounded-xl text-sm font-black focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            />
          </div>

          {/* Member filter (managers only) */}
          {isManager && (
            <div className="relative">
              <User2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <select
                value={memberFilter}
                onChange={(e) => setMemberFilter(e.target.value)}
                className="pl-9 pr-8 py-2 bg-gray-50 border-none rounded-xl text-sm font-black text-gray-700 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="">ทีมเซลส์ทั้งหมด</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id}>{member.fullName}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-5 custom-scrollbar bg-gray-50/30">
        <div className="h-full flex gap-4 min-w-[1100px]">
          {COLUMNS.map(col => {
            const { list, totalValue } = getColumnData(col.id)
            const isHovered = draggedOverColumn === col.id
            const Icon = col.icon

            return (
              <div
                key={col.id}
                className={`flex-1 flex flex-col rounded-2xl overflow-hidden transition-all duration-200 bg-white ${
                  isHovered ? 'ring-2 shadow-xl scale-[1.02]' : 'shadow-sm border border-gray-100'
                }`}
                style={isHovered ? { '--tw-ring-color': col.accent, boxShadow: `0 0 0 2px ${col.accent}40, 0 10px 30px -10px ${col.accent}30` } as any : {}}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                {/* Column Header */}
                <div 
                  className="shrink-0 px-4 py-3 flex items-center justify-between border-b"
                  style={{ backgroundColor: col.accent + '15', borderColor: col.accent + '30' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: col.accent }}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <h3 className="text-[13px] font-black tracking-tight" style={{ color: col.accent }}>{col.label}</h3>
                      <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest" style={{ color: col.accent }}>{col.subLabel}</p>
                    </div>
                  </div>
                  <span className="bg-white text-[11px] font-black px-2.5 py-1 rounded-full shadow-sm" style={{ color: col.accent }}>
                    {list.length}
                  </span>
                </div>

                {/* Column Value Footer */}
                <div className="shrink-0 px-4 py-2 flex items-center justify-between border-b border-gray-50 bg-gray-50/50">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">มูลค่ารวม</span>
                  <span className="text-sm font-black font-mono text-gray-700">{fmtMoney(totalValue)}</span>
                </div>

                {/* Cards List */}
                <div className="flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 270px)' }}>
                  {list.map((order: any) => {
                    const isDragging = draggingId === order.id
                    const salespersonName = order.salesperson?.fullName || ''
                    const initials = getInitials(salespersonName)

                    return (
                      <div
                        key={order.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, order.id)}
                        onDragEnd={handleDragEnd}
                        className={`bg-white rounded-xl border border-gray-200 shadow-sm cursor-grab active:cursor-grabbing transition-all p-3.5 relative group ${
                          isDragging ? 'opacity-40 scale-95 border-dashed shadow-none' : 'hover:shadow-md hover:border-gray-300 hover:-translate-y-0.5'
                        }`}
                      >
                        {/* Accent Bar */}
                        <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-md" style={{ backgroundColor: col.accent }} />

                        <div className="pl-2">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="text-sm font-black text-gray-900 leading-tight">
                              {order.company?.companyName || 'ไม่ระบุชื่อบริษัท'}
                            </h4>
                          </div>

                          <div className="flex flex-wrap gap-2 mb-3">
                            <span className="text-[10px] font-mono font-black px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                              {order.orderNumber}
                            </span>
                            {order.priority && (
                              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase ${
                                order.priority === 'Urgent' ? 'bg-red-100 text-red-700' :
                                order.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {order.priority}
                              </span>
                            )}
                          </div>

                          {order.targetDeliveryDate && (
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 mb-3 bg-gray-50 w-fit px-2 py-1 rounded-lg">
                              <Truck size={12} className="text-gray-400" />
                              จัดส่ง: {new Date(order.targetDeliveryDate).toLocaleDateString('th-TH')}
                            </div>
                          )}

                          <div className="border-t border-gray-100 my-2" />

                          <div className="flex items-center justify-between">
                            <p className="text-sm font-black font-mono text-gray-900">
                              {fmtMoney(order.value)}
                            </p>
                            
                            <div className="flex items-center gap-1.5 notranslate" translate="no">
                              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[9px] font-black">
                                {initials.toUpperCase()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {list.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50 py-10">
                      <Icon size={32} className="mb-2" />
                      <p className="text-xs font-bold uppercase tracking-widest">ลากมาวางที่นี่</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
