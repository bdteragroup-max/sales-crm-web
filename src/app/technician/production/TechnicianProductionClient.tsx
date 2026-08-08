"use client";

import React, { useState } from 'react';
import { Package, Clock, CheckCircle2, AlertTriangle, Truck, PlayCircle, PauseCircle, CheckSquare, PlusCircle, Square, CheckSquare as CheckSquareIcon, ListTodo } from 'lucide-react';
import { updateOrderStatus } from '@/app/actions/orders';
import { createCabinetAssemblyJobs, logAssemblyAction, submitCabinetQC } from '@/app/actions/assembly';
import { logProductionTime, toggleProductionStep } from '@/app/actions/production';
import PauseJobModal from './PauseJobModal';
import CabinetQCModal from './CabinetQCModal';

function JobTimer({ timeLogs, status }: { timeLogs: any[], status: string }) {
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    const calculateElapsed = () => {
      if (!timeLogs || timeLogs.length === 0) return 0;

      let totalMs = 0;
      let startTime = 0;

      const sorted = [...timeLogs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      for (const log of sorted) {
        if (log.action === 'START') {
          startTime = new Date(log.timestamp).getTime();
        } else if (log.action === 'PAUSE' || log.action === 'END') {
          if (startTime > 0) {
            totalMs += (new Date(log.timestamp).getTime() - startTime);
            startTime = 0;
          }
        }
      }

      if (status === 'IN_PROGRESS' && startTime > 0) {
        totalMs += (Date.now() - startTime);
      }

      return totalMs;
    };

    setElapsed(calculateElapsed());

    if (status === 'IN_PROGRESS') {
      const interval = setInterval(() => {
        setElapsed(calculateElapsed());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timeLogs, status]);

  if (elapsed === 0 && status === 'PENDING') return null;

  const hours = Math.floor(elapsed / 3600000);
  const mins = Math.floor((elapsed % 3600000) / 60000);
  const secs = Math.floor((elapsed % 60000) / 1000);

  return (
    <div className="flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">
      <Clock size={10} />
      {hours > 0 ? `${hours}h ` : ''}{mins}m {secs}s
    </div>
  );
}

function OrderTimer({ timeLogs, orderId, onToggle, loading }: { timeLogs: any[], orderId: string, onToggle: () => void, loading: boolean }) {
  const [elapsed, setElapsed] = React.useState(0);
  const activeLog = timeLogs.find(l => !l.endTime);
  const isRunning = !!activeLog;

  React.useEffect(() => {
    const calculateElapsed = () => {
      let totalMs = 0;
      for (const log of timeLogs) {
        if (log.endTime) {
          totalMs += new Date(log.endTime).getTime() - new Date(log.startTime).getTime();
        }
      }
      if (activeLog) {
        totalMs += Date.now() - new Date(activeLog.startTime).getTime();
      }
      return totalMs;
    };

    setElapsed(calculateElapsed());

    if (isRunning) {
      const interval = setInterval(() => {
        setElapsed(calculateElapsed());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timeLogs, isRunning, activeLog]);

  const hours = Math.floor(elapsed / 3600000);
  const mins = Math.floor((elapsed % 3600000) / 60000);
  const secs = Math.floor((elapsed % 60000) / 1000);

  return (
    <div className="flex items-center justify-between bg-blue-50 border border-blue-100 p-3 rounded-lg mb-4">
      <div className="flex items-center gap-2">
        <Clock className="text-blue-600" size={18} />
        <span className="text-sm font-bold text-blue-800">เวลาทำงานรวม:</span>
        <span className="text-sm font-black text-blue-900 font-mono">
          {hours > 0 ? `${hours}h ` : ''}{mins}m {secs}s
        </span>
      </div>
      <button
        onClick={onToggle}
        disabled={loading}
        className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${isRunning
          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
          : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
      >
        {isRunning ? <><PauseCircle size={14} /> พัก/หยุดเวลา</> : <><PlayCircle size={14} /> เริ่มจับเวลา</>}
      </button>
    </div>
  );
}

export default function TechnicianProductionClient({ orders, currentUser }: { orders: any[], currentUser: any }) {
  const [localOrders, setLocalOrders] = useState(orders);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  React.useEffect(() => {
    setLocalOrders(orders);
  }, [orders]);

  // Modals state
  const [pauseModal, setPauseModal] = useState<{ isOpen: boolean, jobId: string, jobNumber: string } | null>(null);
  const [qcModal, setQcModal] = useState<{ isOpen: boolean, jobId: string, jobNumber: string, projectName: string, technicianName: string } | null>(null);

  const handleSendToQC = async (orderId: string) => {
    if (!confirm('ยืนยันส่งงานนี้ไปตรวจสอบคุณภาพ (QC)?')) return;
    setLoadingId(orderId);
    try {
      const res = await updateOrderStatus(orderId, 'ตรวจสอบคุณภาพ');
      if (res.success) {
        setLocalOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'ตรวจสอบคุณภาพ' } : o));
      } else {
        alert(res.error || 'Failed to update status');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating status');
    } finally {
      setLoadingId(null);
    }
  };

  const handleGenerateJobs = async (orderId: string, count: number) => {
    setLoadingId(`gen-${orderId}`);
    try {
      const res = await createCabinetAssemblyJobs(orderId, currentUser.id, count);
      if (res.success) {
        setLocalOrders(prev => prev.map(o => {
          if (o.id === orderId) {
            return { ...o, cabinetAssemblyJobs: (res.jobs || []).map((j: any) => ({ ...j, timeLogs: [] })) };
          }
          return o;
        }));
      } else {
        alert(res.error || 'Failed to generate jobs');
      }
    } catch (err) {
      console.error(err);
      alert('Error generating jobs');
    } finally {
      setLoadingId(null);
    }
  };

  const handleAction = async (jobId: string, action: 'START' | 'PAUSE' | 'END', reason?: string) => {
    setLoadingId(`act-${jobId}`);
    try {
      const res = await logAssemblyAction(jobId, action, reason);
      if (res.success) {
        // Update local state to reflect new status
        setLocalOrders(prev => prev.map(o => {
          if (!o.cabinetAssemblyJobs) return o;
          return {
            ...o,
            cabinetAssemblyJobs: o.cabinetAssemblyJobs.map((j: any) => {
              if (j.id === jobId) {
                let newStatus = 'IN_PROGRESS';
                if (action === 'PAUSE') newStatus = 'PAUSED';
                if (action === 'END') newStatus = 'COMPLETED';
                return { ...j, status: newStatus };
              }
              return j;
            })
          };
        }));
      } else {
        alert(res.error || 'Failed to log action');
      }
    } catch (err) {
      console.error(err);
      alert('Error logging action');
    } finally {
      setLoadingId(null);
    }
  };

  const handleQCSubmit = async (qcData: any) => {
    if (!qcModal) return;
    const jobId = qcModal.jobId;
    setLoadingId(`qc-${jobId}`);
    try {
      const res = await submitCabinetQC(jobId, qcData);
      if (res.success) {
        setLocalOrders(prev => prev.map(o => {
          if (!o.cabinetAssemblyJobs) return o;
          return {
            ...o,
            cabinetAssemblyJobs: o.cabinetAssemblyJobs.map((j: any) => {
              if (j.id === jobId) {
                return { ...j, status: 'COMPLETED' };
              }
              return j;
            })
          };
        }));
        setQcModal(null);
      } else {
        alert(res.error || 'Failed to submit QC');
      }
    } catch (err) {
      console.error(err);
      alert('Error submitting QC');
    } finally {
      setLoadingId(null);
    }
  };

  const getMyCabinetCount = (order: any) => {
    if (order.technicianWorkload && Array.isArray(order.technicianWorkload)) {
      const work = order.technicianWorkload.find((w: any) => w.technicianId === currentUser.id);
      if (work) return work.count;
    }
    return order.cabinetCount || 1;
  };

  const handleToggleStep = async (stepId: string, currentVal: boolean) => {
    setLoadingId(`step-${stepId}`);
    try {
      const res = await toggleProductionStep(stepId, !currentVal);
      if (res.success) {
        setLocalOrders(prev => prev.map(o => {
          const hasStep = o.productionSteps?.some((s: any) => s.id === stepId);
          if (hasStep) {
            return {
              ...o,
              progressPct: res.progressPct,
              productionSteps: o.productionSteps.map((s: any) => 
                s.id === stepId ? { ...s, isCompleted: !currentVal } : s
              )
            };
          }
          return o;
        }));
      } else {
        alert(res.error || 'Failed to update step');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating step');
    } finally {
      setLoadingId(null);
    }
  };

  const handleToggleTimer = async (orderId: string, isRunning: boolean) => {
    setLoadingId(`timer-${orderId}`);
    try {
      const res = await logProductionTime(orderId, isRunning ? 'STOP' : 'START');
      if (res.success && res.data) {
        setLocalOrders(prev => prev.map(o => {
          if (o.id === orderId) {
            const newLogs = isRunning 
              ? o.timeLogs.map((l: any) => l.id === res.data!.id ? res.data : l)
              : [res.data, ...(o.timeLogs || [])];
            return { ...o, timeLogs: newLogs };
          }
          return o;
        }));
      } else {
        alert(res.error || 'Failed to update timer');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating timer');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-50 flex shrink-0 items-center justify-center text-[#ff2301] border border-red-100">
          <Package className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">งานผลิตของฉัน (My Production Tasks)</h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">คำสั่งผลิตที่คุณรับผิดชอบ</p>
        </div>
      </div>

      {localOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <CheckCircle2 size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-gray-900">ไม่มีงานที่กำลังผลิต</h3>
          <p className="text-gray-500">เยี่ยมมาก! คุณไม่มีงานที่ค้างอยู่</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {localOrders.map(order => {
            const myCount = getMyCabinetCount(order);
            const isQC = order.status === 'ตรวจสอบคุณภาพ';
            const jobs = order.cabinetAssemblyJobs || [];

            // Determine if we can send to QC (all jobs completed)
            const allJobsCompleted = jobs.length > 0 && jobs.every((j: any) => j.status === 'COMPLETED');

            return (
              <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all flex flex-col h-full">
                <div className="flex justify-between items-start gap-2 mb-3">
                  <div className="min-w-0">
                    <h3 className="font-black text-gray-900 text-lg truncate">{order.orderNumber}</h3>
                    <p className="text-sm font-bold text-gray-500 truncate">{order.company?.companyName || 'ไม่ระบุลูกค้า'}</p>
                  </div>
                  <div className={`shrink-0 px-2 py-1 rounded text-[10px] font-black uppercase ${isQC ? 'bg-purple-100 text-purple-700' : 'bg-red-50 text-[#ff2301] border border-red-100'}`}>
                    {order.status}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-gray-500">ความคืบหน้า (Progress)</span>
                    <span className="text-xs font-black text-brand-red">{Math.round(order.progressPct || 0)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-brand-red h-2 rounded-full transition-all duration-500" style={{ width: `${order.progressPct || 0}%` }} />
                  </div>
                </div>

                <div className="space-y-2 flex-1 mt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm font-bold text-gray-700 bg-gray-50 px-3 py-3 sm:py-2 rounded-lg border border-gray-200 mb-4">
                    <div className="flex items-center gap-2">
                      <Package size={16} className="text-gray-500" />
                      <span>ยอดที่รับผิดชอบ: {myCount} ตู้</span>
                    </div>
                    {jobs.length === 0 && !isQC && (
                      <button
                        onClick={() => handleGenerateJobs(order.id, myCount)}
                        disabled={loadingId === `gen-${order.id}`}
                        className="w-full sm:w-auto text-sm sm:text-xs bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 sm:px-3 sm:py-1.5 rounded-lg flex justify-center items-center gap-1.5 transition-colors"
                      >
                        {loadingId === `gen-${order.id}` ? 'กำลังสร้าง...' : <><PlusCircle size={16} className="sm:w-3.5 sm:h-3.5" /> สร้าง Job</>}
                      </button>
                    )}
                  </div>

                  {jobs.length > 0 && (
                    <div className="space-y-3 mb-4">
                      {jobs.map((job: any) => (
                        <div key={job.id} className="border border-gray-200 rounded-xl p-3 bg-white">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3 sm:mb-2">
                            <div className="flex items-center flex-wrap gap-2">
                              <h4 className="text-xs font-black text-gray-800">{job.jobNumber}</h4>
                              <JobTimer timeLogs={job.timeLogs} status={job.status} />
                            </div>
                            <span className={`w-fit text-[9px] px-2 py-0.5 rounded-full font-bold ${job.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                              job.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                job.status === 'PAUSED' ? 'bg-amber-100 text-amber-700' :
                                  'bg-gray-100 text-gray-600'
                              }`}>
                              {job.status === 'COMPLETED' ? 'เสร็จสิ้น' :
                                job.status === 'IN_PROGRESS' ? 'กำลังดำเนินการ' :
                                  job.status === 'PAUSED' ? 'พักงาน' : 'รอดำเนินการ'}
                            </span>
                          </div>

                          {job.qcReport?.qcStatus === 'Needs Correction' && job.status !== 'COMPLETED' && (
                            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                              <strong className="block mb-1 text-red-800">ไม่ผ่าน QC (ต้องแก้ไข):</strong>
                              {job.qcReport.qcCorrections}
                            </div>
                          )}

                          {job.status !== 'COMPLETED' && !isQC && (
                            <div className="flex gap-2">
                              {(job.status === 'PENDING' || job.status === 'PAUSED') && (
                                <button
                                  onClick={() => handleAction(job.id, 'START')}
                                  disabled={loadingId === `act-${job.id}`}
                                  className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-bold py-3 sm:py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                                >
                                  <PlayCircle size={18} /> {job.status === 'PAUSED' ? 'ทำต่อ' : 'เริ่มประกอบ'}
                                </button>
                              )}
                              {job.status === 'IN_PROGRESS' && (
                                <>
                                  <button
                                    onClick={() => setPauseModal({ isOpen: true, jobId: job.id, jobNumber: job.jobNumber })}
                                    disabled={loadingId === `act-${job.id}`}
                                    className="flex-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-sm font-bold py-3 sm:py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                                  >
                                    <PauseCircle size={18} /> พักงาน
                                  </button>
                                  <button
                                    onClick={() => setQcModal({
                                      isOpen: true,
                                      jobId: job.id,
                                      jobNumber: job.jobNumber,
                                      projectName: order.company?.companyName || 'ไม่ระบุลูกค้า',
                                      technicianName: currentUser.fullName
                                    })}
                                    disabled={loadingId === `act-${job.id}`}
                                    className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-bold py-3 sm:py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                                  >
                                    <CheckSquare size={18} /> จบงาน (QC)
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {order.prNote && (
                    <div className="mt-3 sm:mt-2 p-3 bg-red-50 rounded-lg border border-red-100">
                      <div className="flex items-center gap-1.5 text-red-700 font-bold text-xs mb-1">
                        <AlertTriangle size={14} /> Note จัดซื้อ
                      </div>
                      <p className="text-xs font-semibold text-red-600 break-words">{order.prNote}</p>
                    </div>
                  )}

                  {!isQC && order.productionSteps && order.productionSteps.length > 0 && (
                    <div className="mt-6 border-t border-gray-100 pt-4">
                      <h4 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
                        <ListTodo size={16} className="text-gray-500" /> ขั้นตอนการผลิต (Production Steps)
                      </h4>

                      <OrderTimer
                        timeLogs={order.timeLogs || []}
                        orderId={order.id}
                        onToggle={() => {
                          const activeLog = order.timeLogs?.find((l: any) => !l.endTime);
                          handleToggleTimer(order.id, !!activeLog);
                        }}
                        loading={loadingId === `timer-${order.id}`}
                      />

                      <div className="space-y-2">
                        {order.productionSteps.map((step: any) => (
                          <div key={step.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <button
                              onClick={() => handleToggleStep(step.id, step.isCompleted)}
                              disabled={loadingId === `step-${step.id}`}
                              className={`shrink-0 ${step.isCompleted ? 'text-emerald-500' : 'text-gray-300 hover:text-gray-400'}`}
                            >
                              {step.isCompleted ? <CheckSquareIcon size={20} /> : <Square size={20} />}
                            </button>
                            <span className={`text-sm font-bold ${step.isCompleted ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                              {step.stepName}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {!isQC && allJobsCompleted && (
                  <button
                    onClick={() => handleSendToQC(order.id)}
                    disabled={loadingId === order.id}
                    className="mt-4 w-full py-4 sm:py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold text-base sm:text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loadingId === order.id ? (
                      <span className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full" />
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        ส่งงานไปตรวจสอบขั้นสุดท้าย (QC)
                      </>
                    )}
                  </button>
                )}
                {isQC && (
                  <div className="mt-4 w-full py-2.5 bg-gray-50 border border-gray-100 text-gray-500 rounded-xl font-bold text-sm text-center">
                    อยู่ระหว่างการตรวจสอบ (QC)
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {pauseModal?.isOpen && (
        <PauseJobModal
          jobId={pauseModal.jobId}
          jobNumber={pauseModal.jobNumber}
          onClose={() => setPauseModal(null)}
          onSubmit={(reason) => {
            handleAction(pauseModal.jobId, 'PAUSE', reason);
            setPauseModal(null);
          }}
        />
      )}

      {qcModal?.isOpen && (
        <CabinetQCModal
          jobId={qcModal.jobId}
          jobNumber={qcModal.jobNumber}
          projectName={qcModal.projectName}
          technicianName={qcModal.technicianName}
          onClose={() => setQcModal(null)}
          onSubmit={handleQCSubmit}
        />
      )}
    </div>
  );
}
