'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Megaphone,
  User,
  Building2,
  MapPin,
  Phone,
  FileText,
  Store,
  Coins,
  Package,
  Headphones,
  MoreHorizontal,
  Calendar,
  UploadCloud,
  File,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronRight,
  ClipboardList,
  Truck,
  Search,
  Plus,
  RefreshCw,
  Clock,
  MessageSquare
} from 'lucide-react';
import Swal from 'sweetalert2';
import { createClient } from '@/utils/supabase/client';
import {
  REQUEST_TYPES,
  REQUEST_STATUSES,
  RequestTypeCode,
  RequestStatusCode,
  FILE_TYPES_OPTIONS,
  IN_STORE_MATERIAL_OPTIONS,
  PR_CHANNEL_OPTIONS,
  EXPENSE_CATEGORY_OPTIONS,
  EQUIPMENT_ITEMS_OPTIONS,
  USAGE_LOCATIONS
} from '@/constants/marketingRequests';
import { THAI_PROVINCES } from '@/constants/provinces';
import { createMarketingRequest, getMarketingRequests } from '@/app/actions/marketingRequests';

interface Props {
  currentUser: {
    id: string;
    fullName: string;
    phoneNumber: string;
    department: string;
    branch: string;
    role?: string;
  };
  branches: { id: string; name: string }[];
  departments: string[];
  initialRequests?: any[];
  initialCounts?: Record<string, number>;
  initialTab?: 'form' | 'status';
  isMarketingOrAdmin?: boolean;
}

export default function MarketingRequestFormClient({
  currentUser,
  branches,
  departments,
  initialRequests = [],
  initialCounts = {},
  initialTab = 'form',
  isMarketingOrAdmin = false
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // View switch: 'form' vs 'status'
  const [activeView, setActiveView] = useState<'form' | 'status'>(initialTab);
  const [myRequestsList, setMyRequestsList] = useState<any[]>(initialRequests);
  const [statusSearchQuery, setStatusSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);

  const handleRefreshMyRequests = async () => {
    setIsRefreshingStatus(true);
    try {
      const res = await getMarketingRequests({ tab: 'my' });
      if (res.success && res.data) {
        setMyRequestsList(res.data);
      }
    } catch (err) {
      console.warn('Failed to refresh my requests:', err);
    } finally {
      setIsRefreshingStatus(false);
    }
  };

  // Section 1: Requester Info
  const [requesterName, setRequesterName] = useState(currentUser.fullName || '');
  const [requesterDepartment, setRequesterDepartment] = useState(currentUser.department || 'ฝ่ายขาย');
  const [customDepartment, setCustomDepartment] = useState('');
  const [requesterBranch, setRequesterBranch] = useState(currentUser.branch || (branches[0]?.name || 'สำนักงานใหญ่'));
  const [requesterPhone, setRequesterPhone] = useState(currentUser.phoneNumber || '');

  // Section 2: Request Type
  const [requestType, setRequestType] = useState<RequestTypeCode>('FILES_MEDIA');

  // Section 3: General Info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requiredDate, setRequiredDate] = useState('');
  const [usageLocationType, setUsageLocationType] = useState<string>('REQUESTER_BRANCH');
  const [otherBranch, setOtherBranch] = useState(branches[1]?.name || branches[0]?.name || '');
  const [eventProvince, setEventProvince] = useState(THAI_PROVINCES[0]);
  const [eventName, setEventName] = useState('');
  const [locationDetails, setLocationDetails] = useState('');

  // Section 4: Type-Specific States
  // Type 1: Files
  const [selectedFileTypes, setSelectedFileTypes] = useState<string[]>(['Catalogue']);
  const [fileProductModel, setFileProductModel] = useState('');
  const [fileAdditionalDetails, setFileAdditionalDetails] = useState('');

  // Type 2: In-Store Media
  const [inStoreMaterial, setInStoreMaterial] = useState<string>('Poster');
  const [inStoreSize, setInStoreSize] = useState('');
  const [inStoreQuantity, setInStoreQuantity] = useState<number>(1);
  const [inStoreDetails, setInStoreDetails] = useState('');
  const [inStoreDeliveryRequired, setInStoreDeliveryRequired] = useState<'DELIVERY' | 'SELF_PICKUP' | 'NONE'>('DELIVERY');

  // Type 3: PR Media
  const [prChannels, setPrChannels] = useState<string[]>(['Facebook']);
  const [prSubject, setPrSubject] = useState('');
  const [prStartDate, setPrStartDate] = useState('');
  const [prEndDate, setPrEndDate] = useState('');

  // Type 4: Budget
  const [budgetEventName, setBudgetEventName] = useState('');
  const [budgetStartDate, setBudgetStartDate] = useState('');
  const [budgetEndDate, setBudgetEndDate] = useState('');
  const [budgetProvince, setBudgetProvince] = useState(THAI_PROVINCES[0]);
  const [budgetVenue, setBudgetVenue] = useState('');
  const [budgetAmount, setBudgetAmount] = useState<string>('');
  const [budgetExpenseCategories, setBudgetExpenseCategories] = useState<string[]>([]);
  const [budgetDetails, setBudgetDetails] = useState('');
  const [budgetStaffCount, setBudgetStaffCount] = useState<string>('');

  // Type 5: Equipment
  const [selectedEquipment, setSelectedEquipment] = useState<Record<string, number>>({});
  const [equipDateRequired, setEquipDateRequired] = useState('');
  const [equipDateOfUse, setEquipDateOfUse] = useState('');
  const [equipDateReturn, setEquipDateReturn] = useState('');
  const [equipDeliveryMethod, setEquipDeliveryMethod] = useState<'SHIP_BRANCH' | 'SHIP_EVENT' | 'SELF_PICKUP'>('SHIP_BRANCH');

  // Type 6: Assistance
  const [assistanceNeeded, setAssistanceNeeded] = useState('');
  const [assistanceDate, setAssistanceDate] = useState('');
  const [assistanceLocation, setAssistanceLocation] = useState('');

  // Type 7: Other
  const [otherSpecify, setOtherSpecify] = useState('');
  const [otherDetails, setOtherDetails] = useState('');

  // Shipping Section States
  const [shippingMethod, setShippingMethod] = useState<'DELIVERY' | 'SELF_PICKUP'>('DELIVERY');
  const [recipientName, setRecipientName] = useState(currentUser.fullName || '');
  const [recipientPhone, setRecipientPhone] = useState(currentUser.phoneNumber || '');
  const [recipientCompanyBranch, setRecipientCompanyBranch] = useState(requesterBranch);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryProvince, setDeliveryProvince] = useState(THAI_PROVINCES[0]);
  const [deliveryPostalCode, setDeliveryPostalCode] = useState('');
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState('');
  const [shippingRemarks, setShippingRemarks] = useState('');

  // Section 5: Attachments
  interface UploadedFileItem {
    id: string;
    file: File;
    name: string;
    size: number;
    url?: string;
    progress: number;
    isUploading: boolean;
    error?: string;
  }
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine if Shipping Section should be visible
  const isShippingNeeded =
    (requestType === 'IN_STORE_MEDIA' && inStoreDeliveryRequired === 'DELIVERY') ||
    (requestType === 'EQUIPMENT' && (equipDeliveryMethod === 'SHIP_BRANCH' || equipDeliveryMethod === 'SHIP_EVENT'));

  // Toggle checkbox helper
  const toggleArrayItem = (list: string[], item: string, setter: (val: string[]) => void) => {
    if (list.includes(item)) {
      setter(list.filter(i => i !== item));
    } else {
      setter([...list, item]);
    }
  };

  // Toggle equipment item helper
  const toggleEquipmentItem = (item: string) => {
    setSelectedEquipment(prev => {
      const next = { ...prev };
      if (next[item]) {
        delete next[item];
      } else {
        next[item] = 1;
      }
      return next;
    });
  };

  const updateEquipmentQuantity = (item: string, qty: number) => {
    setSelectedEquipment(prev => ({
      ...prev,
      [item]: Math.max(1, qty)
    }));
  };

  // Handle File Selection & Direct Upload to Supabase Storage
  const handleFilesChosen = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip'];
    const maxSizeBytes = 50 * 1024 * 1024; // 50MB

    const newItems: UploadedFileItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext = f.name.split('.').pop()?.toLowerCase() || '';

      if (!allowedExtensions.includes(ext)) {
        Swal.fire({
          icon: 'warning',
          title: 'ชนิดไฟล์ไม่ถูกต้อง',
          text: `ไฟล์ ${f.name} ไม่รองรับ กรุณาอัปโหลดเฉพาะไฟล์ JPG, PNG, PDF, DOC, XLS, PPT, ZIP`
        });
        continue;
      }

      if (f.size > maxSizeBytes) {
        Swal.fire({
          icon: 'warning',
          title: 'ขนาดไฟล์เกินกำหนด',
          text: `ไฟล์ ${f.name} มีขนาดเกิน 50 MB`
        });
        continue;
      }

      newItems.push({
        id: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
        file: f,
        name: f.name,
        size: f.size,
        progress: 0,
        isUploading: true
      });
    }

    setUploadedFiles(prev => [...prev, ...newItems]);

    // Upload to Supabase
    for (const item of newItems) {
      try {
        const fileExt = item.name.split('.').pop() || 'bin';
        const storagePath = `requests/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from('marketing_assets')
          .upload(storagePath, item.file, {
            upsert: false
          });

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('marketing_assets')
          .getPublicUrl(storagePath);

        setUploadedFiles(prev =>
          prev.map(f => (f.id === item.id ? { ...f, url: urlData.publicUrl, isUploading: false, progress: 100 } : f))
        );
      } catch (err: any) {
        console.error('File upload error:', err);
        setUploadedFiles(prev =>
          prev.map(f => (f.id === item.id ? { ...f, isUploading: false, error: 'อัปโหลดล้มเหลว' } : f))
        );
      }
    }
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validate Base Fields
    if (!requesterName.trim()) {
      Swal.fire({ icon: 'error', title: 'กรุณากรอกข้อมูล', text: 'กรุณาระบุชื่อ-นามสกุล' });
      return;
    }
    const finalDepartment = requesterDepartment === 'อื่นๆ (ระบุเอง)' ? customDepartment.trim() : requesterDepartment;
    if (!finalDepartment) {
      Swal.fire({ icon: 'error', title: 'กรุณากรอกข้อมูล', text: 'กรุณาระบุฝ่าย / แผนก' });
      return;
    }
    if (!requesterBranch) {
      Swal.fire({ icon: 'error', title: 'กรุณากรอกข้อมูล', text: 'กรุณาระบุสาขาที่สังกัด' });
      return;
    }
    if (!requesterPhone.trim()) {
      Swal.fire({ icon: 'error', title: 'กรุณากรอกข้อมูล', text: 'กรุณาระบุเบอร์โทรติดต่อ' });
      return;
    }
    if (!title.trim()) {
      Swal.fire({ icon: 'error', title: 'กรุณากรอกข้อมูล', text: 'กรุณาระบุชื่องาน / เรื่อง' });
      return;
    }
    if (!description.trim()) {
      Swal.fire({ icon: 'error', title: 'กรุณากรอกข้อมูล', text: 'กรุณาระบุรายละเอียดที่ต้องการ' });
      return;
    }
    if (!requiredDate) {
      Swal.fire({ icon: 'error', title: 'กรุณากรอกข้อมูล', text: 'กรุณาระบุวันที่ต้องการนำไปใช้งานจริง' });
      return;
    }

    // 2. Validate Type-Specific
    let typeDetails: any = {};

    if (requestType === 'FILES_MEDIA') {
      if (selectedFileTypes.length === 0) {
        Swal.fire({ icon: 'error', title: 'กรุณากรอกข้อมูล', text: 'กรุณาเลือกประเภทไฟล์ที่ต้องการอย่างน้อย 1 รายการ' });
        return;
      }
      typeDetails = {
        fileTypes: selectedFileTypes,
        productModel: fileProductModel.trim(),
        additionalDetails: fileAdditionalDetails.trim()
      };
    } else if (requestType === 'IN_STORE_MEDIA') {
      if (!inStoreMaterial) {
        Swal.fire({ icon: 'error', title: 'กรุณากรอกข้อมูล', text: 'กรุณาระบุประเภทสื่อหน้าร้าน' });
        return;
      }
      if (!inStoreQuantity || inStoreQuantity < 1) {
        Swal.fire({ icon: 'error', title: 'กรุณากรอกข้อมูล', text: 'กรุณาระบุจำนวนชิ้นที่ถูกต้อง' });
        return;
      }
      typeDetails = {
        materialType: inStoreMaterial,
        size: inStoreSize.trim(),
        quantity: inStoreQuantity,
        details: inStoreDetails.trim(),
        deliveryRequired: inStoreDeliveryRequired
      };
    } else if (requestType === 'PR_MEDIA') {
      if (prChannels.length === 0) {
        Swal.fire({ icon: 'error', title: 'กรุณากรอกข้อมูล', text: 'กรุณาเลือกช่องทางประชาสัมพันธ์อย่างน้อย 1 ช่องทาง' });
        return;
      }
      if (!prSubject.trim()) {
        Swal.fire({ icon: 'error', title: 'กรุณากรอกข้อมูล', text: 'กรุณาระบุหัวข้อ / แคมเปญโปรโมชั่น' });
        return;
      }
      typeDetails = {
        channels: prChannels,
        subject: prSubject.trim(),
        startDate: prStartDate || null,
        endDate: prEndDate || null
      };
    } else if (requestType === 'BUDGET') {
      if (!budgetEventName.trim()) {
        Swal.fire({ icon: 'error', title: 'กรุณากรอกข้อมูล', text: 'กรุณาระบุชื่องาน / อีเวนต์' });
        return;
      }
      if (!budgetStartDate) {
        Swal.fire({ icon: 'error', title: 'กรุณากรอกข้อมูล', text: 'กรุณาระบุวันที่เริ่มจัดงาน' });
        return;
      }
      if (!budgetAmount || parseFloat(budgetAmount) <= 0) {
        Swal.fire({ icon: 'error', title: 'กรุณากรอกข้อมูล', text: 'กรุณาระบุจำนวนงบประมาณที่ขอ' });
        return;
      }
      if (!budgetDetails.trim()) {
        Swal.fire({ icon: 'error', title: 'กรุณากรอกข้อมูล', text: 'กรุณาระบุรายละเอียดการใช้งบประมาณ' });
        return;
      }
      typeDetails = {
        eventName: budgetEventName.trim(),
        startDate: budgetStartDate,
        endDate: budgetEndDate || budgetStartDate,
        province: budgetProvince,
        venue: budgetVenue.trim(),
        requestedBudget: parseFloat(budgetAmount),
        expenseCategories: budgetExpenseCategories,
        budgetDetails: budgetDetails.trim(),
        participantCount: budgetStaffCount ? parseInt(budgetStaffCount, 10) : null
      };
    } else if (requestType === 'EQUIPMENT') {
      const items = Object.entries(selectedEquipment).map(([name, qty]) => ({ name, quantity: qty }));
      if (items.length === 0) {
        Swal.fire({ icon: 'error', title: 'กรุณากรอกข้อมูล', text: 'กรุณาเลือกอุปกรณ์ที่ต้องการยืมอย่างน้อย 1 รายการ' });
        return;
      }
      if (!equipDateRequired) {
        Swal.fire({ icon: 'error', title: 'กรุณากรอกข้อมูล', text: 'กรุณาระบุวันที่ต้องการรับอุปกรณ์' });
        return;
      }
      if (!equipDateOfUse) {
        Swal.fire({ icon: 'error', title: 'กรุณากรอกข้อมูล', text: 'กรุณาระบุวันที่นำไปใช้งาน' });
        return;
      }
      if (!equipDateReturn) {
        Swal.fire({ icon: 'error', title: 'กรุณากรอกข้อมูล', text: 'กรุณาระบุวันที่คาดว่าจะส่งคืน' });
        return;
      }
      typeDetails = {
        items,
        dateRequired: equipDateRequired,
        dateOfUse: equipDateOfUse,
        expectedReturnDate: equipDateReturn,
        deliveryMethod: equipDeliveryMethod
      };
    } else if (requestType === 'ASSISTANCE') {
      if (!assistanceNeeded.trim()) {
        Swal.fire({ icon: 'error', title: 'กรุณากรอกข้อมูล', text: 'กรุณาระบุความช่วยเหลือที่ต้องการจากฝ่ายการตลาด' });
        return;
      }
      if (!assistanceDate) {
        Swal.fire({ icon: 'error', title: 'กรุณากรอกข้อมูล', text: 'กรุณาระบุวันที่ต้องการความช่วยเหลือ' });
        return;
      }
      typeDetails = {
        assistanceNeeded: assistanceNeeded.trim(),
        dateNeeded: assistanceDate,
        location: assistanceLocation.trim()
      };
    } else if (requestType === 'OTHER') {
      if (!otherSpecify.trim()) {
        Swal.fire({ icon: 'error', title: 'กรุณากรอกข้อมูล', text: 'กรุณาระบุประเภทคำขอ' });
        return;
      }
      if (!otherDetails.trim()) {
        Swal.fire({ icon: 'error', title: 'กรุณากรอกข้อมูล', text: 'กรุณาระบุรายละเอียด' });
        return;
      }
      typeDetails = {
        customType: otherSpecify.trim(),
        details: otherDetails.trim()
      };
    }

    // 3. Shipping Validation
    if (isShippingNeeded && shippingMethod === 'DELIVERY') {
      if (!recipientName.trim()) {
        Swal.fire({ icon: 'error', title: 'กรุณากรอกข้อมูลการจัดส่ง', text: 'กรุณาระบุชื่อผู้รับสินค้า' });
        return;
      }
      if (!recipientPhone.trim()) {
        Swal.fire({ icon: 'error', title: 'กรุณากรอกข้อมูลการจัดส่ง', text: 'กรุณาระบุเบอร์โทรศัพท์ผู้รับ' });
        return;
      }
      if (!deliveryAddress.trim()) {
        Swal.fire({ icon: 'error', title: 'กรุณากรอกข้อมูลการจัดส่ง', text: 'กรุณาระบุที่อยู่จัดส่ง' });
        return;
      }
      if (!deliveryPostalCode.trim()) {
        Swal.fire({ icon: 'error', title: 'กรุณากรอกข้อมูลการจัดส่ง', text: 'กรุณาระบุรหัสไปรษณีย์' });
        return;
      }
      if (!requestedDeliveryDate) {
        Swal.fire({ icon: 'error', title: 'กรุณากรอกข้อมูลการจัดส่ง', text: 'กรุณาระบุวันที่ต้องการให้จัดส่งถึง' });
        return;
      }

      // Logical date comparison
      const shipDate = new Date(requestedDeliveryDate);
      const useDate = new Date(requiredDate);
      if (shipDate > useDate) {
        Swal.fire({
          icon: 'warning',
          title: 'วันที่จัดส่งไม่สอดคล้อง',
          text: 'วันที่ต้องการให้จัดส่งถึง ต้องไม่เกินวันที่ต้องการนำไปใช้งานจริง'
        });
        return;
      }
    }

    // Check if any file is still uploading
    if (uploadedFiles.some(f => f.isUploading)) {
      Swal.fire({
        icon: 'info',
        title: 'กำลังอัปโหลดไฟล์',
        text: 'กรุณารอให้อัปโหลดไฟล์แนบให้เสร็จสมบูรณ์ก่อนกดยืนยัน'
      });
      return;
    }

    // Prepare attachments
    const validAttachments = uploadedFiles
      .filter(f => f.url)
      .map(f => ({
        fileName: f.name,
        fileUrl: f.url!,
        fileSize: f.size
      }));

    setIsSubmitting(true);

    try {
      const res = await createMarketingRequest({
        requesterName: requesterName.trim(),
        requesterDepartment: finalDepartment,
        requesterBranch,
        requesterPhone: requesterPhone.trim(),
        requestType,
        title: title.trim(),
        description: description.trim(),
        requiredDate,
        usageLocationType,
        usageBranch: usageLocationType === 'OTHER_BRANCH' ? otherBranch : usageLocationType === 'REQUESTER_BRANCH' ? requesterBranch : 'สำนักงานใหญ่',
        usageProvince: usageLocationType === 'EXTERNAL' ? eventProvince : undefined,
        usageLocationName: usageLocationType === 'EXTERNAL' ? eventName.trim() : undefined,
        usageLocationDetails: usageLocationType === 'EXTERNAL' ? locationDetails.trim() : undefined,
        typeDetails,
        shippingMethod: isShippingNeeded ? shippingMethod : 'NONE',
        recipientName: isShippingNeeded && shippingMethod === 'DELIVERY' ? recipientName.trim() : undefined,
        recipientPhone: isShippingNeeded && shippingMethod === 'DELIVERY' ? recipientPhone.trim() : undefined,
        recipientCompanyBranch: isShippingNeeded && shippingMethod === 'DELIVERY' ? recipientCompanyBranch.trim() : undefined,
        deliveryAddress: isShippingNeeded && shippingMethod === 'DELIVERY' ? deliveryAddress.trim() : undefined,
        deliveryProvince: isShippingNeeded && shippingMethod === 'DELIVERY' ? deliveryProvince : undefined,
        deliveryPostalCode: isShippingNeeded && shippingMethod === 'DELIVERY' ? deliveryPostalCode.trim() : undefined,
        requestedDeliveryDate: isShippingNeeded && shippingMethod === 'DELIVERY' ? requestedDeliveryDate : undefined,
        shippingRemarks: isShippingNeeded ? shippingRemarks.trim() : undefined,
        attachments: validAttachments
      });

      if (!res.success) {
        throw new Error(res.error || 'ไม่สามารถส่งคำขอได้');
      }

      await Swal.fire({
        icon: 'success',
        title: 'ส่งคำขอเรียบร้อยแล้ว',
        html: `
          <div class="text-center">
            <p class="text-sm text-gray-600 mb-2">ระบบได้สร้างคำขอของคุณแล้ว</p>
            <p class="text-xl font-bold text-red-600 bg-red-50 py-2 rounded-lg border border-red-200">${res.requestNo}</p>
            <p class="text-xs text-gray-500 mt-3">ระบบได้ส่ง Task ไปยัง Marketing Board (Backlog) และแจ้งเตือนฝ่ายการตลาดผ่าน Tera Bot เรียบร้อยแล้ว</p>
          </div>
        `,
        confirmButtonColor: '#dc2626',
        confirmButtonText: 'ดูสถานะคำขอที่ส่งแล้ว'
      });

      try {
        const refreshRes = await getMarketingRequests({ tab: 'my' });
        if (refreshRes.success && refreshRes.data) {
          setMyRequestsList(refreshRes.data);
        }
      } catch (e) {
        // Fallback
      }

      setActiveView('status');
      setTitle('');
      setDescription('');
      setUploadedFiles([]);
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: err.message || 'ไม่สามารถส่งคำขอได้'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered requests for Status view
  const totalCount = myRequestsList.length;
  const pendingCount = myRequestsList.filter(r => r.status === 'BACKLOG' || r.status === 'TO_DO').length;
  const inProgressCount = myRequestsList.filter(r => ['IN_PROGRESS', 'WAITING', 'REVIEW'].includes(r.status)).length;
  const doneCount = myRequestsList.filter(r => r.status === 'DONE').length;

  const filteredRequests = myRequestsList.filter(r => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (typeFilter !== 'ALL' && r.requestType !== typeFilter) return false;
    if (statusSearchQuery.trim()) {
      const q = statusSearchQuery.toLowerCase().trim();
      const matchNo = r.requestNo?.toLowerCase().includes(q);
      const matchTitle = r.title?.toLowerCase().includes(q);
      const matchDesc = r.description?.toLowerCase().includes(q);
      const matchBranch = r.requesterBranch?.toLowerCase().includes(q);
      const matchDept = r.requesterDepartment?.toLowerCase().includes(q);
      if (!matchNo && !matchTitle && !matchDesc && !matchBranch && !matchDept) return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100 mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-red-500/20 shrink-0">
            <Megaphone size={28} className="transform -rotate-12" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              คำขอฝ่ายการตลาด (Marketing Requests)
            </h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">
              {activeView === 'form'
                ? 'ส่งคำของาน สื่อประชาสัมพันธ์ และงบประมาณไปยังฝ่ายการตลาด'
                : 'ติดตามความคืบหน้าและสถานะคำขอที่คุณส่งไปยังฝ่ายการตลาด'}
            </p>
          </div>
        </div>

        {/* View Switcher Tabs & External Board Link */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex p-1.5 rounded-2xl bg-gray-100 border border-gray-200/80">
            <button
              type="button"
              onClick={() => setActiveView('form')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeView === 'form'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <Plus size={16} />
              <span>สร้างคำขอใหม่</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('status')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeView === 'status'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <ClipboardList size={16} />
              <span>สถานะคำขอที่ส่งแล้ว</span>
              {myRequestsList.length > 0 && (
                <span
                  className={`ml-0.5 px-2 py-0.5 rounded-full text-[11px] font-black ${activeView === 'status' ? 'bg-white text-red-600' : 'bg-gray-200 text-gray-700'
                    }`}
                >
                  {myRequestsList.length}
                </span>
              )}
            </button>
          </div>

          {isMarketingOrAdmin && (
            <Link
              href="/marketing/requests"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all font-medium text-xs sm:text-sm shadow-sm"
            >
              <span>กระดานการตลาด (Marketing Board)</span>
              <ChevronRight size={16} className="text-gray-400" />
            </Link>
          )}
        </div>
      </div>

      {activeView === 'status' ? (
        /* ─── STATUS VIEW: สถานะคำขอที่ส่งแล้ว ─── */
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: All */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                  คำขอทั้งหมด
                </span>
                <span className="text-2xl sm:text-3xl font-black text-gray-900">{totalCount}</span>
                <span className="text-xs text-gray-500 block mt-1">รายการที่คุณส่งแล้ว</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-600 flex items-center justify-center font-bold shrink-0">
                <FileText size={24} />
              </div>
            </div>

            {/* Card 2: Backlog & To Do */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                  รอดำเนินการ
                </span>
                <span className="text-2xl sm:text-3xl font-black text-gray-800">{pendingCount}</span>
                <span className="text-xs text-gray-500 block mt-1">Backlog / รอเริ่มงาน</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-600 flex items-center justify-center font-bold shrink-0">
                <Clock size={24} />
              </div>
            </div>

            {/* Card 3: In Progress / Review */}
            <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm flex items-center justify-between bg-red-50/20">
              <div>
                <span className="text-xs font-semibold text-red-600 uppercase tracking-wider block mb-1">
                  กำลังดำเนินการ
                </span>
                <span className="text-2xl sm:text-3xl font-black text-red-600">{inProgressCount}</span>
                <span className="text-xs text-red-500/80 block mt-1">กำลังทำ / รอตรวจสอบ</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center font-bold shrink-0">
                <Loader2 size={24} className="animate-spin" />
              </div>
            </div>

            {/* Card 4: Done */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                  เสร็จสิ้นแล้ว
                </span>
                <span className="text-2xl sm:text-3xl font-black text-gray-900">{doneCount}</span>
                <span className="text-xs text-gray-500 block mt-1">ส่งมอบงานเรียบร้อย</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gray-900 text-white flex items-center justify-center font-bold shrink-0">
                <CheckCircle2 size={24} />
              </div>
            </div>
          </div>

          {/* Filter & Search Toolbar */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={statusSearchQuery}
                  onChange={e => setStatusSearchQuery(e.target.value)}
                  placeholder="ค้นหาด้วยเลขคำขอ, ชื่องาน, สาขา..."
                  className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all"
                />
                {statusSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setStatusSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Status Filter Dropdown */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-white text-gray-700 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
              >
                <option value="ALL">สถานะทั้งหมด</option>
                <option value="BACKLOG">รอดำเนินการ (Backlog)</option>
                <option value="TO_DO">รับเรื่องแล้ว (To Do)</option>
                <option value="IN_PROGRESS">กำลังดำเนินการ (In Progress)</option>
                <option value="WAITING">รอข้อมูลเพิ่มเติม (Waiting)</option>
                <option value="REVIEW">รอตรวจสอบ (Review)</option>
                <option value="DONE">เสร็จสิ้น (Done)</option>
                <option value="CANCELLED">ยกเลิก (Cancelled)</option>
              </select>

              {/* Type Filter Dropdown */}
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-white text-gray-700 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
              >
                <option value="ALL">ประเภทคำขอทั้งหมด</option>
                {Object.values(REQUEST_TYPES).map(t => (
                  <option key={t.code} value={t.code}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 justify-end">
              <button
                type="button"
                onClick={handleRefreshMyRequests}
                disabled={isRefreshingStatus}
                title="รีเฟรชรายการ"
                className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-all flex items-center gap-1 text-sm font-medium disabled:opacity-50"
              >
                <RefreshCw size={16} className={isRefreshingStatus ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">รีเฟรช</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView('form')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-md shadow-red-500/20 transition-all"
              >
                <Plus size={16} />
                <span>สร้างคำขอใหม่</span>
              </button>
            </div>
          </div>

          {/* List of Submitted Requests */}
          {filteredRequests.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                <ClipboardList size={32} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {myRequestsList.length === 0
                    ? 'คุณยังไม่มีประวัติการส่งคำขอฝ่ายการตลาด'
                    : 'ไม่พบรายการคำขอที่ตรงกับเงื่อนไขการค้นหา'}
                </h3>
                <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                  {myRequestsList.length === 0
                    ? 'เมื่อคุณส่งคำขอขอไฟล์ สื่อหน้าร้าน สื่อประชาสัมพันธ์ หรืองบประมาณ รายการคำขอและสถานะความคืบหน้าจะแสดงที่นี่'
                    : 'ลองปรับเปลี่ยนคำค้นหาหรือตัวกรองสถานะใหม่อีกครั้ง'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStatusSearchQuery('');
                  setStatusFilter('ALL');
                  setTypeFilter('ALL');
                  setActiveView('form');
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-md shadow-red-500/20 transition-all"
              >
                <Plus size={16} />
                <span>{myRequestsList.length === 0 ? 'สร้างคำขอแรกของคุณ' : 'สร้างคำขอใหม่'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map(req => {
                const typeCfg = REQUEST_TYPES[req.requestType as RequestTypeCode] || {
                  title: req.requestType,
                  shortTitle: req.requestType,
                  iconName: 'FileText'
                };
                const statusCfg = REQUEST_STATUSES[req.status as RequestStatusCode] || {
                  label: req.status,
                  badgeBg: 'bg-gray-100',
                  badgeText: 'text-gray-700',
                  borderColor: 'border-gray-200'
                };

                const formattedCreated = new Date(req.createdAt).toLocaleDateString('th-TH', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                });

                const formattedRequired = new Date(req.requiredDate).toLocaleDateString('th-TH', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                });

                return (
                  <div
                    key={req.id}
                    className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all space-y-4"
                  >
                    {/* Top Meta Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-gray-100">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg font-black text-xs bg-red-50 text-red-700 border border-red-200">
                          {req.requestNo}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg font-semibold text-xs bg-gray-100 text-gray-700 border border-gray-200">
                          {typeCfg.title}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full font-bold text-xs border ${statusCfg.badgeBg} ${statusCfg.badgeText} ${statusCfg.borderColor}`}
                        >
                          {statusCfg.label}
                        </span>
                        {req.priority && req.priority !== 'NORMAL' && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            {req.priority === 'URGENT' ? 'ด่วน' : 'ด่วนที่สุด'}
                          </span>
                        )}
                      </div>

                      <span className="text-xs text-gray-400">
                        ยื่นคำขอเมื่อ: {formattedCreated}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="space-y-1.5">
                      <Link
                        href={`/marketing/requests/${req.requestNo}`}
                        className="text-base sm:text-lg font-bold text-gray-900 hover:text-red-600 transition-colors inline-block"
                      >
                        {req.title}
                      </Link>
                      <p className="text-xs sm:text-sm text-gray-500 line-clamp-2 leading-relaxed">
                        {req.description}
                      </p>
                    </div>

                    {/* Bottom Info & Action */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-gray-500">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <span className="flex items-center gap-1.5 font-medium text-gray-700">
                          <Calendar size={14} className="text-red-500" />
                          <span>ใช้งาน: {formattedRequired}</span>
                        </span>

                        <span className="flex items-center gap-1.5">
                          <MapPin size={14} className="text-gray-400" />
                          <span>{req.requesterBranch || 'สำนักงานใหญ่'}</span>
                        </span>

                        <span className="flex items-center gap-1.5">
                          <User size={14} className="text-gray-400" />
                          <span>
                            {req.assignedTo?.fullName
                              ? `ผู้รับผิดชอบ: ${req.assignedTo.fullName}`
                              : 'รอฝ่ายการตลาดรับเรื่อง'}
                          </span>
                        </span>

                        {req._count?.attachments > 0 && (
                          <span className="flex items-center gap-1 text-gray-500 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-200">
                            <File size={12} />
                            <span>{req._count.attachments} ไฟล์</span>
                          </span>
                        )}

                        {req._count?.comments > 0 && (
                          <span className="flex items-center gap-1 text-gray-500 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-200">
                            <MessageSquare size={12} />
                            <span>{req._count.comments} ความคิดเห็น</span>
                          </span>
                        )}
                      </div>

                      <Link
                        href={`/marketing/requests/${req.requestNo}`}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs transition-all shrink-0 self-end sm:self-auto border border-red-100"
                      >
                        <span>ดูรายละเอียด / พูดคุย</span>
                        <ChevronRight size={14} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ─── FORM VIEW: แบบฟอร์มส่งคำขอ ─── */
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Form Fields (8 Cols) */}
          <div className="lg:col-span-8 space-y-8">
            {/* Section 1: ข้อมูลผู้ขอ */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6">
                <span className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold text-sm">
                  1
                </span>
                <span>ข้อมูลผู้ขอ</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* ชื่อ-นามสกุล */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <User size={14} className="text-red-500" />
                    <span>ชื่อ-นามสกุล <span className="text-red-500">*</span></span>
                  </label>
                  <input
                    type="text"
                    required
                    value={requesterName}
                    onChange={e => setRequesterName(e.target.value)}
                    placeholder="เช่น สมชาย ใจดี"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none text-sm transition-all"
                  />
                </div>

                {/* ฝ่าย / แผนก */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Building2 size={14} className="text-red-500" />
                    <span>ฝ่าย / แผนก <span className="text-red-500">*</span></span>
                  </label>
                  <select
                    value={requesterDepartment}
                    onChange={e => setRequesterDepartment(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none text-sm bg-white transition-all"
                  >
                    {departments.map((dept, idx) => (
                      <option key={idx} value={dept}>
                        {dept}
                      </option>
                    ))}
                    <option value="อื่นๆ (ระบุเอง)">อื่นๆ (ระบุเอง)</option>
                  </select>

                  {requesterDepartment === 'อื่นๆ (ระบุเอง)' && (
                    <input
                      type="text"
                      required
                      placeholder="ระบุชื่อฝ่าย/แผนก"
                      value={customDepartment}
                      onChange={e => setCustomDepartment(e.target.value)}
                      className="w-full mt-2 px-4 py-2 rounded-xl border border-gray-200 text-sm focus:border-red-500 outline-none"
                    />
                  )}
                </div>

                {/* สาขาที่สังกัด */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <MapPin size={14} className="text-red-500" />
                    <span>สาขาที่สังกัด <span className="text-red-500">*</span></span>
                  </label>
                  <select
                    value={requesterBranch}
                    onChange={e => {
                      setRequesterBranch(e.target.value);
                      setRecipientCompanyBranch(e.target.value);
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none text-sm bg-white transition-all"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* เบอร์โทรติดต่อ */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Phone size={14} className="text-red-500" />
                    <span>เบอร์โทรติดต่อ <span className="text-red-500">*</span></span>
                  </label>
                  <input
                    type="text"
                    required
                    value={requesterPhone}
                    onChange={e => {
                      setRequesterPhone(e.target.value);
                      setRecipientPhone(e.target.value);
                    }}
                    placeholder="เช่น 081-234-5678"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none text-sm transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: ประเภทคำขอ */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                <span className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold text-sm">
                  2
                </span>
                <span>ประเภทคำขอ <span className="text-red-500">*</span></span>
              </h2>
              <p className="text-xs text-gray-500 mb-6">
                เลือกประเภทงานที่ต้องการให้ฝ่ายการตลาดดำเนินการ แบบฟอร์มจะปรับเปลี่ยนตามประเภทที่ท่านเลือก
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-2.5">
                {(Object.keys(REQUEST_TYPES) as RequestTypeCode[]).map(key => {
                  const item = REQUEST_TYPES[key];
                  const isSelected = requestType === key;

                  const renderIcon = () => {
                    switch (item.iconName) {
                      case 'FileText': return <FileText size={22} />;
                      case 'Store': return <Store size={22} />;
                      case 'Megaphone': return <Megaphone size={22} />;
                      case 'Coins': return <Coins size={22} />;
                      case 'Package': return <Package size={22} />;
                      case 'Headphones': return <Headphones size={22} />;
                      default: return <MoreHorizontal size={22} />;
                    }
                  };

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setRequestType(key)}
                      title={item.title}
                      className={`flex flex-col items-center justify-between text-center px-1.5 py-3 rounded-2xl border transition-all duration-200 relative group min-h-[114px] ${isSelected
                        ? 'border-2 border-red-600 bg-red-50/60 text-red-700 shadow-sm shadow-red-500/10'
                        : 'border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50/50'
                        }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center mb-1.5 transition-colors shrink-0 ${isSelected ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                          }`}
                      >
                        {renderIcon()}
                      </div>
                      <div className="w-full flex flex-col items-center justify-center flex-1 px-0.5">
                        <span className="text-[11px] sm:text-xs font-bold leading-tight text-center text-gray-900">
                          {item.line1}
                        </span>
                        {item.line2 ? (
                          <span className="text-[10px] sm:text-[10.5px] font-bold leading-tight text-center text-gray-800 mt-0.5">
                            {item.line2}
                          </span>
                        ) : (
                          <span className="text-[10px] invisible leading-tight select-none mt-0.5">&nbsp;</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* กล่องอธิบายประเภทคำขอที่เลือก (Selected Type Info Banner) */}
              <div className="mt-4 p-4 rounded-xl bg-red-50/70 border border-red-200 flex items-start gap-3.5 transition-all animate-in fade-in">
                <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  {(() => {
                    switch (REQUEST_TYPES[requestType].iconName) {
                      case 'FileText': return <FileText size={20} />;
                      case 'Store': return <Store size={20} />;
                      case 'Megaphone': return <Megaphone size={20} />;
                      case 'Coins': return <Coins size={20} />;
                      case 'Package': return <Package size={20} />;
                      case 'Headphones': return <Headphones size={20} />;
                      default: return <MoreHorizontal size={20} />;
                    }
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-red-600 uppercase tracking-wider">
                      ประเภทที่เลือก:
                    </span>
                    <span className="text-sm sm:text-base font-extrabold text-gray-900">
                      {REQUEST_TYPES[requestType].title}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    <span className="font-semibold text-gray-700">ตัวอย่างงานที่ครอบคลุม: </span>
                    {REQUEST_TYPES[requestType].subtitle}
                  </p>
                </div>
              </div>
            </div>

            {/* Section 3: รายละเอียดคำขอ */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold text-sm">
                  3
                </span>
                <span>รายละเอียดคำขอ</span>
              </h2>

              {/* ชื่องาน / เรื่อง */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  ชื่องาน / เรื่อง <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="เช่น ขอไฟล์แคตตาล็อกสินค้า รุ่นใหม่ หรือ ขอโรลอัพงานเปิดตัวสาขา"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none text-sm transition-all"
                />
              </div>

              {/* รายละเอียดที่ต้องการ */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  รายละเอียดที่ต้องการ <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="อธิบายรายละเอียด สิ่งที่ต้องการให้การตลาดจัดทำให้ชัดเจน..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none text-sm transition-all resize-y"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                {/* วันที่ต้องการนำไปใช้งานจริง */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Calendar size={14} className="text-red-500" />
                    <span>วันที่ต้องการนำไปใช้งานจริง <span className="text-red-500">*</span></span>
                  </label>
                  <input
                    type="date"
                    required
                    value={requiredDate}
                    onChange={e => setRequiredDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none text-sm bg-white transition-all"
                  />
                </div>

                {/* นำไปใช้งานที่ */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <MapPin size={14} className="text-red-500" />
                    <span>นำไปใช้งานที่ <span className="text-red-500">*</span></span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {USAGE_LOCATIONS.map(loc => (
                      <label
                        key={loc.id}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-medium transition-all ${usageLocationType === loc.id
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                      >
                        <input
                          type="radio"
                          name="usageLocationType"
                          value={loc.id}
                          checked={usageLocationType === loc.id}
                          onChange={() => setUsageLocationType(loc.id)}
                          className="text-red-600 focus:ring-red-500"
                        />
                        <span>{loc.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Conditional Location Details */}
              {usageLocationType === 'OTHER_BRANCH' && (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80 space-y-4 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        สาขาปลายทาง <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={otherBranch}
                        onChange={e => setOtherBranch(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
                      >
                        {branches.map(b => (
                          <option key={b.id} value={b.name}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        จังหวัด (อัตโนมัติ)
                      </label>
                      <input
                        type="text"
                        disabled
                        value={otherBranch}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-gray-100 text-gray-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {usageLocationType === 'EXTERNAL' && (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80 space-y-4 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        จังหวัด <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={eventProvince}
                        onChange={e => setEventProvince(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
                      >
                        {THAI_PROVINCES.map(p => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        ชื่องาน / สถานที่จัดงาน <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="เช่น ไบเทค บางนา ฮอลล์ 101"
                        value={eventName}
                        onChange={e => setEventName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      รายละเอียดสถานที่เพิ่มเติม
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น โซนบูธ B12 หรือรายละเอียดจุดสังเกต"
                      value={locationDetails}
                      onChange={e => setLocationDetails(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Section 4: ข้อมูลเฉพาะประเภทคำขอ (Conditional Forms) */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold text-sm">
                    4
                  </span>
                  <span>ข้อมูลเฉพาะประเภทคำขอ:</span>
                  <span className="text-red-600 font-extrabold">
                    {REQUEST_TYPES[requestType].title}
                  </span>
                </h2>
              </div>

              {/* Type 1: ขอไฟล์ / สื่อการตลาด */}
              {requestType === 'FILES_MEDIA' && (
                <div className="space-y-6 animate-in fade-in">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2.5">
                      ต้องการไฟล์ประเภทใด <span className="text-red-500">* (เลือกได้หลายข้อ)</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {FILE_TYPES_OPTIONS.map(fileType => (
                        <label
                          key={fileType}
                          className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm font-medium cursor-pointer transition-all ${selectedFileTypes.includes(fileType)
                            ? 'border-red-500 bg-red-50/80 text-red-800 shadow-sm'
                            : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedFileTypes.includes(fileType)}
                            onChange={() => toggleArrayItem(selectedFileTypes, fileType, setSelectedFileTypes)}
                            className="rounded border-gray-300 text-red-600 focus:ring-red-500 w-4 h-4"
                          />
                          <span>{fileType}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                        สินค้า / รุ่น
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น ปั๊มน้ำบาดาล รุ่น Solar Pump 300W"
                        value={fileProductModel}
                        onChange={e => setFileProductModel(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                        รายละเอียดเพิ่มเติม
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น ขอทั้งเวอร์ชันภาษาไทยและภาษาอังกฤษ"
                        value={fileAdditionalDetails}
                        onChange={e => setFileAdditionalDetails(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Type 2: ขอจัดทำ สื่อหน้าร้าน */}
              {requestType === 'IN_STORE_MEDIA' && (
                <div className="space-y-6 animate-in fade-in">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2.5">
                      ประเภทสื่อหน้าร้าน <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {IN_STORE_MATERIAL_OPTIONS.map(mat => (
                        <label
                          key={mat}
                          className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm font-medium cursor-pointer transition-all ${inStoreMaterial === mat
                            ? 'border-red-500 bg-red-50/80 text-red-800 shadow-sm'
                            : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                          <input
                            type="radio"
                            name="inStoreMaterial"
                            value={mat}
                            checked={inStoreMaterial === mat}
                            onChange={() => setInStoreMaterial(mat)}
                            className="text-red-600 focus:ring-red-500"
                          />
                          <span>{mat}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                        ขนาดที่ต้องการ
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น 80 × 200 cm หรือ กว้าง 1m ยาว 2m"
                        value={inStoreSize}
                        onChange={e => setInStoreSize(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                        จำนวนที่ต้องการ <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={inStoreQuantity}
                        onChange={e => setInStoreQuantity(parseInt(e.target.value, 10) || 1)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                      ข้อความหรือรายละเอียดที่ต้องการสื่อสาร
                    </label>
                    <textarea
                      rows={2}
                      placeholder="ข้อความโปรโมชั่น รูปภาพสินค้าที่ต้องการเน้น หรือข้อความบนป้าย..."
                      value={inStoreDetails}
                      onChange={e => setInStoreDetails(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-500 outline-none resize-y"
                    />
                  </div>

                  {/* การจัดส่ง */}
                  <div className="pt-2 border-t border-gray-100">
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Truck size={14} className="text-red-500" />
                      <span>ต้องการให้จัดส่งหรือไม่? <span className="text-red-500">*</span></span>
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'DELIVERY', label: 'จัดส่งพัสดุ / ขนส่ง' },
                        { id: 'SELF_PICKUP', label: 'รับสินค้าด้วยตนเอง' },
                        { id: 'NONE', label: 'ไม่ต้องจัดส่ง' }
                      ].map(opt => (
                        <label
                          key={opt.id}
                          className={`flex items-center justify-center p-3 rounded-xl border cursor-pointer text-xs font-medium transition-all text-center ${inStoreDeliveryRequired === opt.id
                            ? 'border-red-500 bg-red-50 text-red-700 font-bold'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                          <input
                            type="radio"
                            name="inStoreDeliveryRequired"
                            value={opt.id}
                            checked={inStoreDeliveryRequired === opt.id}
                            onChange={() => setInStoreDeliveryRequired(opt.id as any)}
                            className="sr-only"
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Type 3: ขอจัดทำ สื่อประชาสัมพันธ์ */}
              {requestType === 'PR_MEDIA' && (
                <div className="space-y-6 animate-in fade-in">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2.5">
                      ช่องทางที่ต้องการเผยแพร่ <span className="text-red-500">* (เลือกได้หลายข้อ)</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {PR_CHANNEL_OPTIONS.map(ch => (
                        <label
                          key={ch}
                          className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${prChannels.includes(ch)
                            ? 'border-red-500 bg-red-50/80 text-red-800 shadow-sm'
                            : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                          <input
                            type="checkbox"
                            checked={prChannels.includes(ch)}
                            onChange={() => toggleArrayItem(prChannels, ch, setPrChannels)}
                            className="rounded border-gray-300 text-red-600 focus:ring-red-500 w-4 h-4"
                          />
                          <span>{ch}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                      หัวข้อ / แคมเปญโปรโมชั่นที่ต้องการโปรโมท <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="ระบุจุดขาย โปรโมชั่นลดราคา ของแถม ระยะเวลา หรือเงื่อนไขของโปรโมชั่น..."
                      value={prSubject}
                      onChange={e => setPrSubject(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-500 outline-none resize-y"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                        วันที่เริ่มโปรโมท
                      </label>
                      <input
                        type="date"
                        value={prStartDate}
                        onChange={e => setPrStartDate(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-500 outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                        วันที่สิ้นสุดโปรโมท
                      </label>
                      <input
                        type="date"
                        value={prEndDate}
                        onChange={e => setPrEndDate(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-500 outline-none bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Type 4: ของบประมาณ ออกบูธ / จัดกิจกรรม */}
              {requestType === 'BUDGET' && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                        ชื่องาน / อีเวนต์ <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="เช่น งานเกษตรแฟร์ ขอนแก่น 2026"
                        value={budgetEventName}
                        onChange={e => setBudgetEventName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                        สถานที่จัดงาน (Venue)
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น ศูนย์ประชุมนานาชาติฯ ขอนแก่น"
                        value={budgetVenue}
                        onChange={e => setBudgetVenue(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                        วันที่เริ่มจัดงาน <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={budgetStartDate}
                        onChange={e => setBudgetStartDate(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-500 outline-none bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                        วันที่สิ้นสุดจัดงาน
                      </label>
                      <input
                        type="date"
                        value={budgetEndDate}
                        onChange={e => setBudgetEndDate(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-500 outline-none bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                        จังหวัด
                      </label>
                      <select
                        value={budgetProvince}
                        onChange={e => setBudgetProvince(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-500 outline-none bg-white"
                      >
                        {THAI_PROVINCES.map(p => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                        จำนวนงบประมาณที่ขอ (บาท) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          required
                          min={1}
                          placeholder="0.00"
                          value={budgetAmount}
                          onChange={e => setBudgetAmount(e.target.value)}
                          className="w-full pl-4 pr-12 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-500 outline-none font-bold text-red-700"
                        />
                        <span className="absolute right-4 top-2.5 text-xs text-gray-400 font-medium">บาท</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                        จำนวนพนักงานที่เข้าร่วมงาน (คน)
                      </label>
                      <input
                        type="number"
                        min={1}
                        placeholder="เช่น 3"
                        value={budgetStaffCount}
                        onChange={e => setBudgetStaffCount(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2.5">
                      หมวดหมู่ค่าใช้จ่าย
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {EXPENSE_CATEGORY_OPTIONS.map(cat => (
                        <label
                          key={cat}
                          className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${budgetExpenseCategories.includes(cat)
                            ? 'border-red-500 bg-red-50/80 text-red-800 shadow-sm'
                            : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                          <input
                            type="checkbox"
                            checked={budgetExpenseCategories.includes(cat)}
                            onChange={() => toggleArrayItem(budgetExpenseCategories, cat, setBudgetExpenseCategories)}
                            className="rounded border-gray-300 text-red-600 focus:ring-red-500 w-4 h-4"
                          />
                          <span className="truncate">{cat}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                      รายละเอียดงบประมาณ <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="แจกแจงรายการค่าใช้จ่าย เช่น ค่าเช่าบูธ 15,000 บาท, ค่าเดินทาง 3,000 บาท..."
                      value={budgetDetails}
                      onChange={e => setBudgetDetails(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-500 outline-none resize-y"
                    />
                  </div>
                </div>
              )}

              {/* Type 5: ขอยืมอุปกรณ์ ออกบูธ */}
              {requestType === 'EQUIPMENT' && (
                <div className="space-y-6 animate-in fade-in">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2.5">
                      อุปกรณ์ที่ต้องการยืม <span className="text-red-500">* (ติ๊กเลือกและระบุจำนวน)</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                      {EQUIPMENT_ITEMS_OPTIONS.map(item => {
                        const isChecked = selectedEquipment[item] !== undefined;
                        const qty = selectedEquipment[item] || 1;

                        return (
                          <div
                            key={item}
                            className={`flex items-center justify-between p-3 rounded-xl border text-sm transition-all ${isChecked
                              ? 'border-red-500 bg-red-50/70 text-red-900 shadow-sm'
                              : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                              }`}
                          >
                            <label className="flex items-center gap-2.5 cursor-pointer flex-1 select-none">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleEquipmentItem(item)}
                                className="rounded border-gray-300 text-red-600 focus:ring-red-500 w-4 h-4"
                              />
                              <span className="font-medium text-xs sm:text-sm">{item}</span>
                            </label>

                            {isChecked && (
                              <div className="flex items-center gap-1.5 ml-2 shrink-0">
                                <span className="text-[11px] text-gray-500 font-medium">จำนวน:</span>
                                <input
                                  type="number"
                                  min={1}
                                  value={qty}
                                  onChange={e => updateEquipmentQuantity(item, parseInt(e.target.value, 10) || 1)}
                                  className="w-14 px-2 py-1 rounded-lg border border-red-300 bg-white text-xs font-bold text-center text-red-700 outline-none"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                        วันที่ต้องการอุปกรณ์ <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={equipDateRequired}
                        onChange={e => setEquipDateRequired(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-500 outline-none bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                        วันที่นำไปใช้งาน <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={equipDateOfUse}
                        onChange={e => setEquipDateOfUse(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-500 outline-none bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                        วันที่ส่งคืน <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={equipDateReturn}
                        onChange={e => setEquipDateReturn(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-500 outline-none bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Truck size={14} className="text-red-500" />
                      <span>วิธีรับ / จัดส่งอุปกรณ์ <span className="text-red-500">*</span></span>
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'SHIP_BRANCH', label: 'จัดส่งไปยังสาขา' },
                        { id: 'SHIP_EVENT', label: 'จัดส่งตรงไปยังสถานที่จัดงาน' },
                        { id: 'SELF_PICKUP', label: 'รับอุปกรณ์ด้วยตนเอง' }
                      ].map(opt => (
                        <label
                          key={opt.id}
                          className={`flex items-center justify-center p-3 rounded-xl border cursor-pointer text-xs font-medium transition-all text-center ${equipDeliveryMethod === opt.id
                            ? 'border-red-500 bg-red-50 text-red-700 font-bold'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                          <input
                            type="radio"
                            name="equipDeliveryMethod"
                            value={opt.id}
                            checked={equipDeliveryMethod === opt.id}
                            onChange={() => setEquipDeliveryMethod(opt.id as any)}
                            className="sr-only"
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Type 6: ขอความช่วยเหลือ จากฝ่ายการตลาด */}
              {requestType === 'ASSISTANCE' && (
                <div className="space-y-6 animate-in fade-in">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                      ความช่วยเหลือที่ต้องการจากฝ่ายการตลาด <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder="อธิบายลักษณะงานที่ต้องการให้ทีมการตลาดเข้าร่วมช่วยเหลือหรือให้คำแนะนำ..."
                      value={assistanceNeeded}
                      onChange={e => setAssistanceNeeded(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-500 outline-none resize-y"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                        วันที่ต้องการความช่วยเหลือ <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={assistanceDate}
                        onChange={e => setAssistanceDate(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-500 outline-none bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                        สถานที่นัดหมาย / ปฏิบัติงาน
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น สำนักงานใหญ่ หรือ ประชุมออนไลน์ผ่าน Google Meet"
                        value={assistanceLocation}
                        onChange={e => setAssistanceLocation(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Type 7: อื่น ๆ */}
              {requestType === 'OTHER' && (
                <div className="space-y-6 animate-in fade-in">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                      ระบุประเภทคำขอ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น ขอจัดทำของที่ระลึกลูกค้า VIP หรือของขวัญปีใหม่"
                      value={otherSpecify}
                      onChange={e => setOtherSpecify(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                      รายละเอียด <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder="ระบุข้อมูลที่จำเป็นสำหรับการดำเนินการ..."
                      value={otherDetails}
                      onChange={e => setOtherDetails(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-500 outline-none resize-y"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Conditional Section: ข้อมูลการจัดส่ง (Shipping Section) */}
            {isShippingNeeded && (
              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-red-200/80 space-y-6 animate-in fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold text-sm">
                      <Truck size={16} />
                    </span>
                    <span>ข้อมูลการจัดส่ง (Shipping Information)</span>
                  </h2>
                  <span className="text-xs text-red-600 bg-red-50 px-2.5 py-1 rounded-full font-semibold">
                    เฉพาะงานที่ต้องจัดส่งพัสดุ
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                      ชื่อผู้รับสินค้า <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={recipientName}
                      onChange={e => setRecipientName(e.target.value)}
                      placeholder="ชื่อ-นามสกุล ผู้รับพัสดุ"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                      เบอร์โทรศัพท์ผู้รับ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={recipientPhone}
                      onChange={e => setRecipientPhone(e.target.value)}
                      placeholder="เช่น 081-234-5678"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                      บริษัท / สาขาปลายทาง <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={recipientCompanyBranch}
                      onChange={e => setRecipientCompanyBranch(e.target.value)}
                      placeholder="เช่น สาขาเชียงใหม่ หรือ บริษัท เทรา กรุ๊ป"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                      วันที่ต้องการให้จัดส่งถึง <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={requestedDeliveryDate}
                      onChange={e => setRequestedDeliveryDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-500 outline-none bg-white"
                    />
                    <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} />
                      <span>ต้องไม่เกินวันที่ต้องการนำไปใช้งานจริง</span>
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                    ที่อยู่จัดส่งโดยละเอียด <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={deliveryAddress}
                    onChange={e => setDeliveryAddress(e.target.value)}
                    placeholder="เลขที่ อาคาร ถนน ตำบล/แขวง อำเภอ/เขต..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-500 outline-none resize-y"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                      จังหวัด <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={deliveryProvince}
                      onChange={e => setDeliveryProvince(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-500 outline-none bg-white"
                    >
                      {THAI_PROVINCES.map(p => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                      รหัสไปรษณีย์ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={5}
                      value={deliveryPostalCode}
                      onChange={e => setDeliveryPostalCode(e.target.value)}
                      placeholder="เช่น 10250"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                    หมายเหตุการจัดส่ง
                  </label>
                  <input
                    type="text"
                    value={shippingRemarks}
                    onChange={e => setShippingRemarks(e.target.value)}
                    placeholder="เช่น ฝาก รปภ. หรือ โทรแจ้งก่อนส่ง 1 ชั่วโมง"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-500 outline-none"
                  />
                </div>
              </div>
            )}

            {/* Section 5: ไฟล์แนบ (ถ้ามี) */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold text-sm">
                  5
                </span>
                <span>ไฟล์แนบ (ถ้ามี)</span>
              </h2>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={e => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleFilesChosen(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 hover:border-red-400 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-gray-50/50 hover:bg-red-50/20 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
                  className="hidden"
                  onChange={e => handleFilesChosen(e.target.files)}
                />

                <div className="w-14 h-14 mx-auto rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <UploadCloud size={28} />
                </div>
                <p className="text-sm font-semibold text-gray-800">
                  ลากไฟล์มาวางที่นี่ หรือ <span className="text-red-600 hover:underline">คลิกเพื่อเลือกไฟล์</span>
                </p>
                <p className="text-xs text-gray-500 mt-1.5">
                  รองรับไฟล์ JPG, PNG, PDF, DOC, DOCX, XLS, XLSX, PPT, ZIP ขนาดไฟล์ไม่เกิน 50 MB ต่อไฟล์
                </p>
              </div>

              {/* Uploaded Files Chips */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2 pt-2">
                  {uploadedFiles.map(fileItem => (
                    <div
                      key={fileItem.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-all text-xs"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center shrink-0 font-bold uppercase text-[10px]">
                          {fileItem.name.split('.').pop() || 'FILE'}
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-semibold text-gray-800 truncate">{fileItem.name}</p>
                          <p className="text-[11px] text-gray-400">
                            {(fileItem.size / (1024 * 1024)).toFixed(1)} MB
                            {fileItem.isUploading && <span className="text-red-500 ml-2">กำลังอัปโหลด...</span>}
                            {fileItem.error && <span className="text-red-500 ml-2">{fileItem.error}</span>}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {fileItem.isUploading ? (
                          <Loader2 size={16} className="animate-spin text-red-600" />
                        ) : (
                          <button
                            type="button"
                            onClick={() => removeFile(fileItem.id)}
                            className="w-7 h-7 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form Bottom Actions */}
            <div className="flex items-center justify-end gap-4 pt-2">
              <button
                type="button"
                onClick={() => setActiveView('status')}
                className="px-6 py-3 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 text-sm font-semibold transition-all shadow-sm"
              >
                ยกเลิก
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm shadow-md shadow-red-500/25 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>กำลังส่งคำขอ...</span>
                  </>
                ) : (
                  <span>ส่งคำขอ (Submit)</span>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Helper Sidebar (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* ขั้นตอนการส่งคำขอ */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
                <span>ขั้นตอนการส่งคำขอ</span>
              </h3>

              <div className="space-y-4">
                {[
                  { step: 1, title: 'กรอกข้อมูลในแบบฟอร์ม' },
                  { step: 2, title: 'ตรวจสอบข้อมูลและกดส่ง' },
                  { step: 3, title: 'คำขอของคุณจะถูกสร้างในระบบ และลงกระดานการตลาด (Backlog)' },
                  { step: 4, title: 'ฝ่ายการตลาดจะได้รับการแจ้งเตือนทาง Tera Bot และเริ่มดำเนินการ' },
                  { step: 5, title: 'คุณสามารถติดตามสถานะได้จากแถบ "สถานะคำขอที่ส่งแล้ว"' }
                ].map(item => (
                  <div key={item.step} className="flex items-start gap-3 text-xs leading-relaxed">
                    <div className="w-6 h-6 rounded-full bg-red-600 text-white font-bold flex items-center justify-center shrink-0 text-xs shadow-sm">
                      {item.step}
                    </div>
                    <p className="text-gray-600 pt-0.5">{item.title}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
