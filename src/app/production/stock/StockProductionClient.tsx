"use client";

import React, { useState } from 'react';
import { updateOrderStatus, startProductionWorkflow } from '@/app/actions/orders';
import StockOrderModal from './StockOrderModal';
import ProductionStartModal from '@/app/orders/ProductionStartModal';
import { Package, Boxes, Clock, ShieldCheck, CheckCircle2, Plus, Search, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface StockProductionClientProps {
  initialOrders: any[];
  technicians: { id: string, fullName: string }[];
}

export default function StockProductionClient({ initialOrders, technicians }: StockProductionClientProps) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [productionModalOrder, setProductionModalOrder] = useState<any>(null);

  // Drag state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOrders = orders.filter(o => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    const name = o.stockItems?.productName?.toLowerCase() || '';
    const code = o.stockItems?.productCode?.toLowerCase() || '';
    const orderNo = o.orderNumber?.toLowerCase() || '';
    return name.includes(search) || code.includes(search) || orderNo.includes(search);
  });

  const COLUMNS = [
    { id: 'รอยืนยัน', label: 'รอเริ่มผลิต', accent: '#f59e0b', icon: Clock },
    { id: 'กำลังผลิต', label: 'กำลังผลิต', accent: '#3b82f6', icon: Package },
    { id: 'ตรวจสอบคุณภาพ', label: 'QC', accent: '#8b5cf6', icon: ShieldCheck },
    { id: 'เสร็จสิ้น', label: 'เสร็จสิ้น', accent: '#10b981', icon: CheckCircle2 }
  ];

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedOverColumn !== status) {
      setDraggedOverColumn(status);
    }
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    setDraggedOverColumn(null);
    if (!draggingId) return;

    const order = orders.find(o => o.id === draggingId);
    if (!order || order.status === newStatus) return;

    // Special logic for moving to "กำลังผลิต" to assign technicians
    if (newStatus === 'กำลังผลิต' && order.status === 'รอยืนยัน') {
      setProductionModalOrder(order);
      setDraggingId(null);
      return;
    }

    // Optimistic update
    setOrders(orders.map(o => o.id === draggingId ? { ...o, status: newStatus } : o));

    try {
      const res = await updateOrderStatus(draggingId, newStatus);
      if (!res.success) {
        alert(res.error);
        setOrders(orders); // revert
      } else {
        router.refresh();
      }
    } catch (error: any) {
      alert(error.message);
      setOrders(orders); // revert
    }
    setDraggingId(null);
  };

  const handleProductionStart = async (data: { materialReady: boolean, estimatedDays: number, prNote?: string, assignedTechnicianIds?: string[], cabinetCount?: number, technicianWorkload?: { technicianId: string, count: number }[], productionStaffCount?: number, contractorCount?: number, assignments?: { userId?: string, contractorName?: string, workerType: string }[] }) => {
    if (!productionModalOrder) return;
    const orderId = productionModalOrder.id;
    setProductionModalOrder(null);

    const previousOrders = [...orders];

    // Optimistic Update
    setOrders(orders.map((o: any) =>
      o.id === orderId ? { ...o, status: 'กำลังผลิต', ...data } : o
    ));

    try {
      const res = await startProductionWorkflow(orderId, data);
      if (!res.success) {
        alert(res.error);
        setOrders(previousOrders); // Rollback
      } else {
        setOrders(orders.map((o: any) =>
          o.id === orderId ? res.data : o
        ));
      }
    } catch (err) {
      console.error(err);
      alert("Failed to move order");
      setOrders(previousOrders); // Rollback
    }
  };

  const handleModalSuccess = (orderData: any, isDelete?: boolean) => {
    if (isDelete) {
      setOrders(orders.filter(o => o.id !== orderData.id));
    } else {
      const exists = orders.find(o => o.id === orderData.id);
      if (exists) {
        setOrders(orders.map(o => o.id === orderData.id ? orderData : o));
      } else {
        setOrders([orderData, ...orders]);
      }
    }
    setIsModalOpen(false);
    setSelectedOrder(null);
    router.refresh();
  };

  const handleCreate = () => {
    setSelectedOrder(null);
    setIsModalOpen(true);
  };

  const handleCardClick = (order: any) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-4 md:space-y-6 flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Boxes className="text-[#ff2301]" size={28} />
            ผลิตเพื่อสต็อก (Produce-to-Stock)
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            จัดการและติดตามงานผลิตที่ไม่ได้อ้างอิงใบเสนอราคา (เพื่อสต็อก)
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="bg-[#ff2301] hover:bg-red-600 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus size={18} /> สร้างรายการผลิต
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="ค้นหาชื่อสินค้า, รหัส หรือหมายเลขงาน..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] transition-colors shadow-sm"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-x-auto pb-4">
        <div className="flex gap-4 h-[calc(100vh-230px)] min-w-max">
          {COLUMNS.map(col => {
            const columnOrders = filteredOrders.filter(o => o.status === col.id);
            const isOver = draggedOverColumn === col.id;

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`w-[320px] flex flex-col rounded-2xl transition-colors duration-200 ${isOver ? 'bg-gray-100' : 'bg-white shadow-sm border border-gray-100'}`}
              >
                {/* Column Header */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between" style={{ borderBottomColor: `${col.accent}20` }}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: col.accent }}>
                      <col.icon size={16} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-gray-900">{col.label}</h3>
                      <p className="text-[10px] text-gray-500 font-medium">{columnOrders.length} รายการ</p>
                    </div>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {columnOrders.map(order => (
                    <div
                      key={order.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, order.id)}
                      onClick={() => handleCardClick(order)}
                      className={`bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-pointer active:cursor-grabbing hover:shadow-md transition-all ${draggingId === order.id ? 'opacity-50 scale-95' : 'hover:-translate-y-0.5'}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-black tracking-wider uppercase text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {order.orderNumber}
                        </span>
                        {order.targetDeliveryDate && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${new Date(order.targetDeliveryDate) < new Date() && order.status !== 'เสร็จสิ้น' ? 'bg-red-100 text-red-700' : 'bg-gray-50 text-gray-600'}`}>
                            {new Date(order.targetDeliveryDate).toLocaleDateString('th-TH')}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-gray-900 text-sm mb-1 leading-snug">
                        {order.stockItems?.productName || 'ไม่มีชื่อสินค้า'}
                      </h4>
                      <p className="text-xs text-gray-500 mb-3">
                        {order.stockItems?.productCode && `รหัส: ${order.stockItems.productCode}`}
                      </p>
                      
                      {order.status === 'กำลังผลิต' && order.assignedTechnicians && order.assignedTechnicians.length > 0 && (
                        <div className="mb-3 p-2 bg-blue-50/50 rounded-lg border border-blue-100/50 space-y-1.5">
                          <p className="text-[10px] font-bold text-blue-800 flex items-center gap-1 mb-1">
                            <Users size={12} />
                            ทีมช่างประกอบ ({order.assignedTechnicians.length})
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {order.assignedTechnicians.map((tech: any) => (
                              <div key={tech.id} className="text-[10px] bg-white border border-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium shadow-sm flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                {tech.fullName.split(' ')[0]}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-600">จำนวน:</span>
                        <span className="text-sm font-black text-[#ff2301] bg-red-50 px-2 py-0.5 rounded-lg">
                          {order.stockItems?.quantity || 1} ชุด
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {columnOrders.length === 0 && (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center text-gray-400 p-4 border-2 border-dashed border-gray-100 rounded-xl w-full">
                        <p className="text-xs font-bold">ลากงานมาวางที่นี่</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isModalOpen && (
        <StockOrderModal 
          order={selectedOrder}
          onClose={() => { setIsModalOpen(false); setSelectedOrder(null); }} 
          onSuccess={handleModalSuccess}
        />
      )}

      {productionModalOrder && (
        <ProductionStartModal
          order={productionModalOrder}
          technicians={technicians}
          onClose={() => setProductionModalOrder(null)}
          onSubmit={handleProductionStart}
        />
      )}
    </div>
  );
}
