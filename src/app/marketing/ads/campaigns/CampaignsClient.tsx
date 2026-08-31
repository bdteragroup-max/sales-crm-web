'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, ChevronDown } from 'lucide-react'
import { createCampaign, updateCampaign, deleteCampaign } from '@/app/actions/ads-campaigns'


import { PRODUCT_CATEGORIES } from '../constants'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PerformanceClient from '../performance/PerformanceClient'

export default function CampaignsClient({ initialCampaigns, channels, objectives, products, branches, accounts, resultTypes, initialPerformances, userRole }: any) {
  const router = useRouter()
  const isViewer = ['Viewer/Management'].includes(userRole)

  const [campaigns, setCampaigns] = useState(initialCampaigns)
  const [error, setError] = useState('')
  const [isDirty, setIsDirty] = useState(false)

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: () => { } })
  const [activeTab, setActiveTab] = useState('setup')

  // Form State
  const initialFormState = {
    id: '',
    channelId: '',
    objectiveId: '',
    accountId: '',
    name: '',
    branchId: '',
    campaignId: '', // Platform ID
    productCategory: '',
    internalCode: '',
    budget: '',
    startDate: '',
    endDate: '',
    status: 'ACTIVE',
    targetAudience: '',
    artworkUrl: '',
    notes: ''
  }

  const [formData, setFormData] = useState(initialFormState)

  // Filters
  const [search, setSearch] = useState('')
  const [filterChannel, setFilterChannel] = useState('')
  const [filterProduct, setFilterProduct] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setIsDirty(true)
  }

  const handleClear = () => {
    const clearAction = () => {
      setFormData(initialFormState)
      setIsDirty(false)
      setError('')
    }
    if (isDirty) {
      setConfirmModal({
        isOpen: true,
        message: 'คุณมีข้อมูลที่ยังไม่ได้บันทึก คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูลฟอร์ม?',
        onConfirm: () => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }))
          clearAction()
        }
      })
      return
    }
    clearAction()
  }

  const handleSafeNavigation = (url: string) => {
    if (isDirty) {
      setConfirmModal({
        isOpen: true,
        message: 'คุณมีข้อมูลที่ยังไม่ได้บันทึก คุณแน่ใจหรือไม่ว่าต้องการออกจากหน้านี้?',
        onConfirm: () => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }))
          router.push(url)
        }
      })
      return
    }
    router.push(url)
  }

  const handleTabChange = (tab: string) => {
    if (tab === activeTab) return
    if (isDirty && activeTab === 'setup') {
      setConfirmModal({
        isOpen: true,
        message: 'คุณมีข้อมูลที่ยังไม่ได้บันทึก คุณแน่ใจหรือไม่ว่าต้องการเปลี่ยนหน้า?',
        onConfirm: () => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }))
          setIsDirty(false)
          setActiveTab(tab)
        }
      })
      return
    }
    setActiveTab(tab)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    if (isViewer) return

    const data = {
      campaignId: formData.campaignId,
      name: formData.name,
      channelId: formData.channelId,
      productCategory: formData.productCategory || undefined,
      branchId: formData.branchId || undefined,
      objectiveId: formData.objectiveId || undefined,
      accountId: formData.accountId || undefined,
      internalCode: formData.internalCode || undefined,
      budget: parseFloat(formData.budget),
      startDate: new Date(formData.startDate),
      endDate: new Date(formData.endDate),
      status: formData.status,
      targetAudience: formData.targetAudience || undefined,
      artworkUrl: formData.artworkUrl || undefined,
      notes: formData.notes || undefined
    }

    try {
      if (formData.id) {
        const res = await updateCampaign(formData.id, data)
        setCampaigns(campaigns.map((c: any) => c.id === formData.id ? res.data : c))
      } else {
        const res = await createCampaign(data as any)
        setCampaigns([res.data, ...campaigns])
      }
      setFormData(initialFormState)
      setIsDirty(false)
    } catch (err: any) {
      setError(err.message || 'Failed to save campaign')
    }
  }

  const handleEdit = (campaign: any) => {
    const editAction = () => {
      setFormData({
        id: campaign.id,
        channelId: campaign.channelId || '',
        objectiveId: campaign.objectiveId || '',
        accountId: campaign.accountId || '',
        name: campaign.name || '',
        branchId: campaign.branchId || '',
        campaignId: campaign.campaignId || '',
        productCategory: campaign.productCategory || '',
        internalCode: campaign.internalCode || '',
        budget: campaign.budget?.toString() || '',
        startDate: campaign.startDate ? new Date(campaign.startDate).toISOString().split('T')[0] : '',
        endDate: campaign.endDate ? new Date(campaign.endDate).toISOString().split('T')[0] : '',
        status: campaign.status || 'ACTIVE',
        targetAudience: campaign.targetAudience || '',
        artworkUrl: campaign.artworkUrl || '',
        notes: campaign.notes || ''
      })
      setIsDirty(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    if (isDirty) {
      setConfirmModal({
        isOpen: true,
        message: 'คุณมีข้อมูลที่ยังไม่ได้บันทึก คุณต้องการละทิ้งข้อมูลและแก้ไขแคมเปญใหม่หรือไม่?',
        onConfirm: () => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }))
          editAction()
        }
      })
      return
    }
    editAction()
  }

  const handleDelete = (id: string) => {
    if (isViewer) return
    setConfirmModal({
      isOpen: true,
      message: 'คุณแน่ใจหรือไม่ว่าต้องการลบแคมเปญนี้?',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
        try {
          await deleteCampaign(id)
          setCampaigns(campaigns.filter((c: any) => c.id !== id))
        } catch (err: any) {
          alert(err.message || 'Failed to delete')
        }
      }
    })
  }

  const filteredCampaigns = campaigns.filter((c: any) => {
    const matchesSearch = c.name?.toLowerCase().includes(search.toLowerCase()) || c.internalCode?.toLowerCase().includes(search.toLowerCase())
    const matchesChannel = filterChannel ? c.channelId === filterChannel : true
    const matchesProduct = filterProduct ? c.productCategory === filterProduct : true
    const matchesStatus = filterStatus ? c.status === filterStatus : true
    return matchesSearch && matchesChannel && matchesProduct && matchesStatus
  })

  // Required fields check for UI validation indicator
  const requiredComplete = formData.channelId && formData.accountId && formData.productCategory && formData.objectiveId && formData.name && formData.campaignId && formData.budget && formData.startDate && formData.endDate && formData.status;

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 uppercase">ระบบจัดการข้อมูลโฆษณา TERA</h1>
        <p className="text-gray-500 text-sm">ตั้งค่าแคมเปญโฆษณา (Campaign Master Setup)</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 space-x-8">
        <div onClick={() => handleTabChange('setup')} className={`pb-4 border-b-2 flex items-center cursor-pointer font-bold ${activeTab === 'setup' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2 ${activeTab === 'setup' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
          ตั้งค่าแคมเปญ
        </div>
        <div onClick={() => handleTabChange('performance')} className={`pb-4 border-b-2 flex items-center cursor-pointer font-bold ${activeTab === 'performance' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2 ${activeTab === 'performance' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
          ผลการโฆษณา
        </div>
        <div onClick={() => handleSafeNavigation('/marketing/ads/crm')} className="pb-4 border-b-2 flex items-center cursor-pointer font-bold border-transparent text-gray-400 hover:text-gray-600">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2 bg-gray-200 text-gray-500">3</div>
          ผลลัพธ์ CRM
        </div>
      </div>

      {activeTab === 'setup' && (
        <>
          {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-200">{error}</div>}

          <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 mb-8 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-6 uppercase">ข้อมูลแคมเปญ (CAMPAIGN INFORMATION)</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Column A */}
              <div>
                <h3 className="text-md font-semibold text-gray-700 mb-4">A. รายละเอียดแคมเปญ</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="mb-4">
                    <label className="block text-xs font-semibold mb-1 text-gray-600">ช่องทาง (Channel) <span className="text-red-500">*</span></label>
                    <select name="channelId" value={formData.channelId} onChange={handleInputChange} required disabled={isViewer} className="w-full bg-yellow-50 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500">
                      <option value="">เลือก...</option>
                      {channels.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-xs font-semibold mb-1 text-gray-600">วัตถุประสงค์ (Objective) <span className="text-red-500">*</span></label>
                    <select name="objectiveId" value={formData.objectiveId} onChange={handleInputChange} required disabled={isViewer} className="w-full bg-yellow-50 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500">
                      <option value="">เลือก...</option>
                      {objectives.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-xs font-semibold mb-1 text-gray-600">บัญชี / เพจ / โครงการ <span className="text-red-500">*</span></label>
                    <select name="accountId" value={formData.accountId} onChange={handleInputChange} required disabled={isViewer} className="w-full bg-yellow-50 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500">
                      <option value="">เลือก...</option>
                      {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-xs font-semibold mb-1 text-gray-600">ชื่อแคมเปญ (Campaign Name) <span className="text-red-500">*</span></label>
                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} required disabled={isViewer} className="w-full bg-yellow-50 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500" />
                  </div>
                  <div className="mb-4">
                    <label className="block text-xs font-semibold mb-1 text-gray-600">สาขา (Branch)</label>
                    <select name="branchId" value={formData.branchId} onChange={handleInputChange} disabled={isViewer} className="w-full bg-yellow-50 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500">
                      <option value="">เลือก...</option>
                      {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-xs font-semibold mb-1 text-gray-600">รหัสแคมเปญในแพลตฟอร์ม <span className="text-red-500">*</span></label>
                    <input type="text" name="campaignId" value={formData.campaignId} onChange={handleInputChange} required disabled={isViewer} className="w-full bg-yellow-50 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-semibold mb-1 text-gray-600">กลุ่มสินค้า (Product Category) <span className="text-red-500">*</span></label>
                    <SearchableSelect
                      options={PRODUCT_CATEGORIES.map(c => ({ value: c, label: c }))}
                      value={formData.productCategory}
                      onChange={handleInputChange}
                      name="productCategory"
                      placeholder="เลือก..."
                      disabled={isViewer}
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-xs font-semibold mb-1 text-gray-600">รหัสแคมเปญภายใน (Internal Code)</label>
                    <input type="text" name="internalCode" value={formData.internalCode} onChange={handleInputChange} disabled={isViewer} className="w-full bg-gray-100 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400" placeholder="CMP-YYYYMM-XX-001" />
                  </div>
                </div>
              </div>

              {/* Column B */}
              <div>
                <h3 className="text-md font-semibold text-gray-700 mb-4">B. งบประมาณและระยะเวลา</h3>
                <div className="mb-4">
                  <label className="block text-xs font-semibold mb-1 text-gray-600">งบประมาณที่วางแผนไว้ <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500 text-sm">฿</span>
                    <input type="number" step="0.01" name="budget" value={formData.budget} onChange={handleInputChange} required disabled={isViewer} className="w-full bg-yellow-50 border border-gray-300 rounded px-3 py-2 pl-7 text-sm focus:outline-none focus:ring-1 focus:ring-red-500" />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-semibold mb-1 text-gray-600">วันที่เริ่มต้น <span className="text-red-500">*</span></label>
                  <input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} required disabled={isViewer} className="w-full bg-yellow-50 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500" />
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-semibold mb-1 text-gray-600">วันที่สิ้นสุด <span className="text-red-500">*</span></label>
                  <input type="date" name="endDate" value={formData.endDate} onChange={handleInputChange} required disabled={isViewer} className="w-full bg-yellow-50 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500" />
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-semibold mb-1 text-gray-600">สถานะ <span className="text-red-500">*</span></label>
                  <select name="status" value={formData.status} onChange={handleInputChange} required disabled={isViewer} className="w-full bg-green-50 border border-green-200 text-green-800 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500">
                    <option value="ACTIVE">กำลังใช้งาน (Active)</option>
                    <option value="PAUSED">หยุดชั่วคราว (Paused)</option>
                    <option value="COMPLETED">เสร็จสิ้น (Completed)</option>
                  </select>
                </div>
                <div className="mt-6 flex items-start space-x-2 text-xs text-blue-600">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                  <span>งบประมาณจะถูกกรอกเพียงครั้งเดียวและนำไปใช้ในผลการโฆษณา</span>
                </div>
              </div>

              {/* Column C */}
              <div>
                <h3 className="text-md font-semibold text-gray-700 mb-4">C. กลุ่มเป้าหมายและสื่อโฆษณา</h3>
                <div className="mb-4">
                  <label className="block text-xs font-semibold mb-1 text-gray-600">กลุ่มเป้าหมาย (Target Audience)</label>
                  <textarea name="targetAudience" value={formData.targetAudience} onChange={handleInputChange} disabled={isViewer} rows={2} className="w-full bg-yellow-50 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"></textarea>
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-semibold mb-1 text-gray-600">ลิงก์สื่อโฆษณา / อ้างอิง (Artwork / Reference)</label>
                  <input type="text" name="artworkUrl" value={formData.artworkUrl} onChange={handleInputChange} disabled={isViewer} className="w-full bg-yellow-50 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500" placeholder="https://" />
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-semibold mb-1 text-gray-600">หมายเหตุ (Campaign Notes)</label>
                  <textarea name="notes" value={formData.notes} onChange={handleInputChange} disabled={isViewer} rows={2} className="w-full bg-yellow-50 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"></textarea>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 mt-6 pt-6 flex justify-between items-center">
              <div className="flex items-center text-sm font-medium">
                {requiredComplete ? (
                  <div className="flex items-center text-green-600">
                    <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    กรอกข้อมูลที่จำเป็นครบถ้วนแล้ว
                  </div>
                ) : (
                  <div className="flex items-center text-gray-400">
                    <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                    กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน
                  </div>
                )}
              </div>
              <div className="flex space-x-3">
                <button type="button" onClick={handleClear} disabled={isViewer} className="px-6 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 font-medium rounded text-sm disabled:opacity-50">ล้างข้อมูล</button>
                <button type="submit" disabled={isViewer} className="px-6 py-2 bg-red-700 hover:bg-red-800 text-white font-medium rounded text-sm disabled:opacity-50 shadow-sm">{formData.id ? 'อัปเดตแคมเปญ' : 'บันทึกแคมเปญ'}</button>
              </div>
            </div>
          </form>

          {/* MASTER LIST */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="p-4 border-b border-gray-200 flex flex-wrap gap-4 items-center uppercase font-bold text-gray-800">
              <h2>รายการแคมเปญทั้งหมด (CAMPAIGN MASTER LIST)</h2>
            </div>
            <div className="p-4 border-b border-gray-200 flex flex-wrap gap-4">
              <div className="relative">
                <svg className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                <input type="text" placeholder="ค้นหาแคมเปญ..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 pr-3 py-2 border border-gray-300 rounded text-sm w-64 focus:outline-none focus:ring-1 focus:ring-gray-400" />
              </div>
              <select value={filterChannel} onChange={e => setFilterChannel(e.target.value)} className="border border-gray-300 rounded px-3 py-2 text-sm min-w-[150px] focus:outline-none">
                <option value="">ทุกช่องทาง (All Channels)</option>
                {channels.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)} className="border border-gray-300 rounded px-3 py-2 text-sm min-w-[150px] focus:outline-none">
                <option value="">ทุกกลุ่มสินค้า (All Categories)</option>
                {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-300 rounded px-3 py-2 text-sm min-w-[150px] focus:outline-none">
                <option value="">ทุกสถานะ (All Status)</option>
                <option value="ACTIVE">กำลังใช้งาน (Active)</option>
                <option value="PAUSED">หยุดชั่วคราว (Paused)</option>
                <option value="COMPLETED">เสร็จสิ้น (Completed)</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-gray-600">รหัสแคมเปญ</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">ชื่อแคมเปญ</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">ช่องทาง</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">สินค้า</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">วัตถุประสงค์</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">งบประมาณ</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">วันที่เริ่มต้น</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">วันที่สิ้นสุด</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 text-center">สถานะ</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCampaigns.map((c: any) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700">{c.internalCode || '-'}</td>
                      <td className="px-4 py-3 text-gray-900 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-gray-600">{c.channel?.name}</td>
                      <td className="px-4 py-3 text-gray-600">{c.productCategory || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{c.objective?.name || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">฿{Number(c.budget).toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-600">{new Date(c.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td className="px-4 py-3 text-gray-600">{new Date(c.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${c.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : c.status === 'PAUSED' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center space-x-2">
                          <button onClick={() => handleEdit(c)} disabled={isViewer} className="text-gray-400 hover:text-gray-600 disabled:opacity-50">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                          </button>
                          <button onClick={() => handleDelete(c.id)} disabled={isViewer} className="text-gray-400 hover:text-red-600 disabled:opacity-50">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredCampaigns.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-gray-500">ไม่พบแคมเปญ (No campaigns found)</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'performance' && (
        <PerformanceClient
          campaigns={campaigns}
          resultTypes={resultTypes}
          initialPerformances={initialPerformances}
          userRole={userRole}
        />
      )}

      {/* Confirm Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 text-center">
            <h3 className="text-lg font-bold text-gray-900 mb-2">ยืนยันการดำเนินการ</h3>
            <p className="text-sm text-gray-600 mb-6">{confirmModal.message}</p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-50 text-sm font-medium"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
              >
                ตกลง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SearchableSelect({ options, value, onChange, placeholder, disabled, name }: any) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: any) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selectedOption = options.find((o: any) => o.value === value)
  const filteredOptions = options.filter((o: any) => o.label.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div
        className={`w-full bg-yellow-50 border ${isOpen ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'} rounded px-3 py-2 text-sm flex items-center justify-between cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-500 whitespace-nowrap overflow-hidden text-ellipsis'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} className="text-gray-500 shrink-0 ml-2" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100 flex items-center gap-2">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input
              type="text"
              autoFocus
              className="w-full text-sm outline-none bg-transparent"
              placeholder="ค้นหาสินค้า..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-sm text-center text-gray-500">ไม่พบข้อมูล</div>
            ) : (
              filteredOptions.map((o: any) => (
                <div
                  key={o.value}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-red-50 ${o.value === value ? 'bg-red-50 text-red-600 font-medium' : 'text-gray-700'}`}
                  onClick={() => {
                    onChange({ target: { name, value: o.value } })
                    setIsOpen(false)
                    setSearch('')
                  }}
                >
                  {o.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
