import React, { useState, useRef } from 'react';
import { X, Calendar, AlignLeft, CheckSquare, MessageSquare, Paperclip, Send, Loader2, AlertCircle, Plus, Trash2 } from 'lucide-react';
import type { TKanbanCard, TKanbanList } from './KanbanBoardClient';
import { createClient } from '@/utils/supabase/client';

type Props = {
  card: TKanbanCard;
  users: any[];
  lists: TKanbanList[];
  currentUser: any;
  onClose: () => void;
  onUpdate: (card: TKanbanCard) => void;
  onDeleteCard?: (cardId: string) => void;
};

export default function CardModal({ card, users, lists, currentUser, onClose, onUpdate, onDeleteCard }: Props) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [assignedToId, setAssignedToId] = useState(card.assignedToId || '');
  const [startDate, setStartDate] = useState(card.startDate ? new Date(card.startDate).toISOString().split('T')[0] : '');
  const [dueDate, setDueDate] = useState(card.dueDate ? new Date(card.dueDate).toISOString().split('T')[0] : '');
  const [cardColor, setCardColor] = useState(card.color || '');
  const [engineeringReviewers, setEngineeringReviewers] = useState<string[]>(card.engineeringReviewers || []);

  const [checklist, setChecklist] = useState<any[]>(card.checklist || []);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  const [comments, setComments] = useState<any[]>(card.comments || []);
  const [newComment, setNewComment] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [attachments, setAttachments] = useState<any[]>(card.attachments || []);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingCard, setIsDeletingCard] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async (updates: Partial<TKanbanCard>) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/marketing/kanban/cards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: card.id, ...updates })
      });
      const updated = await res.json();
      onUpdate(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevisionRequest = async () => {
    setErrorMsg(null);
    if (!newComment && comments.length === 0) {
      setErrorMsg("กรุณาระบุเหตุผลการขอแก้ไขในกล่องความคิดเห็นก่อน");
      return;
    }

    if (newComment) {
      // Add comment first
      await handleAddComment();
    }

    // Find the "To Revise" list
    const reviseList = lists.find(l => l.name.toLowerCase().includes('revise'));
    if (!reviseList) {
      setErrorMsg("ไม่พบรายการ 'To Revise' บนกระดาน");
      return;
    }

    handleSave({
      revisionStatus: 'needs_revision',
      listId: reviseList.id
    });

    onClose();
  };

  const handleResubmit = async () => {
    setErrorMsg(null);
    // Find the "Review" list
    const reviewList = lists.find(l => l.name.toLowerCase().includes('review'));
    if (!reviewList) {
      setErrorMsg("ไม่พบรายการ 'Review' บนกระดาน");
      return;
    }

    handleSave({
      revisionStatus: 'pending_review',
      listId: reviewList.id
    });

    onClose();
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      const res = await fetch('/api/marketing/kanban/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id, message: newComment.trim() })
      });
      const comment = await res.json();
      const newComments = [comment, ...comments];
      setComments(newComments);
      setNewComment('');
      onUpdate({ ...card, comments: newComments });
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    if (isVideo && file.size > MAX_VIDEO_SIZE) {
      setErrorMsg(`วิดีโอมีขนาดใหญ่เกินไป (สูงสุด 100MB)`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    } else if (!isVideo && file.size > MAX_FILE_SIZE) {
      setErrorMsg(`ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB)`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);

    try {
      const supabase = createClient();
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `kanban/${card.id}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('marketing_assets')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) throw new Error(uploadError.message);

      const { data: urlData } = supabase.storage
        .from('marketing_assets')
        .getPublicUrl(filePath);

      const res = await fetch('/api/marketing/kanban/attachments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: card.id,
          fileName: file.name,
          fileUrl: urlData.publicUrl,
          fileType: file.type,
          fileSize: file.size,
          attachmentType: 'general'
        })
      });
      const attachment = await res.json();
      if (!res.ok) throw new Error(attachment.error);

      setAttachments([...attachments, attachment]);
    } catch (e: any) {
      setErrorMsg("อัปโหลดล้มเหลว: " + e.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = (e: React.MouseEvent, attachment: any) => {
    e.preventDefault();
    e.stopPropagation();
    setAttachmentToDelete(attachment);
  };

  const confirmDeleteAttachment = async () => {
    if (!attachmentToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/marketing/kanban/attachments/${attachmentToDelete.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      setAttachments(attachments.filter(att => att.id !== attachmentToDelete.id));
      setAttachmentToDelete(null);
    } catch (e: any) {
      setErrorMsg("ลบไฟล์ล้มเหลว: " + e.message);
      setAttachmentToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDeleteCard = async () => {
    setIsDeletingCard(true);
    try {
      const res = await fetch(`/api/marketing/kanban/cards/${card.id}`, { method: 'DELETE' });
      if (res.ok) {
        if (onDeleteCard) onDeleteCard(card.id);
        onClose();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete card');
      }
    } catch (e: any) {
      setErrorMsg("ลบการ์ดล้มเหลว: " + e.message);
      setIsDeletingCard(false);
    }
  };

  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    const newList = [...checklist, { id: Date.now().toString(), title: newChecklistItem.trim(), completed: false }];
    setChecklist(newList);
    setNewChecklistItem('');
    handleSave({ checklist: newList });
  };

  const toggleChecklist = (id: string) => {
    const newList = checklist.map(item => item.id === id ? { ...item, completed: !item.completed } : item);
    setChecklist(newList);
    handleSave({ checklist: newList });
  };

  const deleteChecklistItem = (id: string) => {
    const newList = checklist.filter(item => item.id !== id);
    setChecklist(newList);
    handleSave({ checklist: newList });
  };

  const listName = lists.find(l => l.id === card.listId)?.name || 'รายการที่ไม่รู้จัก';

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="px-4 md:px-6 py-4 border-b border-gray-100 flex items-start justify-between bg-gray-50/50">
          <div className="flex-1 mr-2 md:mr-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => title !== card.title && handleSave({ title })}
              className="font-bold text-2xl text-gray-900 w-full bg-transparent border-none outline-none focus:ring-2 focus:ring-red-100 rounded-lg px-2 py-1 -ml-2"
            />
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
              ในรายการ <span className="font-semibold text-gray-700 underline underline-offset-2">{listName}</span>
              {card.revisionStatus === 'needs_revision' && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-black rounded-full uppercase tracking-wider">ต้องแก้ไข</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <button
              onClick={() => {
                handleSave({ title, description, assignedToId, engineeringReviewers, startDate, dueDate, color: cardColor });
                onClose();
              }}
              className="flex items-center gap-2 bg-[#ff2301] hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all"
            >
              <CheckSquare size={16} />
              บันทึก (Save)
            </button>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 flex flex-col md:flex-row gap-6 md:gap-8">

          {/* Main Column */}
          <div className="flex-1 flex flex-col gap-6 md:gap-8 pb-12 order-2 md:order-1">

            {/* Description */}
            <section>
              <div className="flex items-center gap-3 mb-3">
                <AlignLeft size={20} className="text-gray-400" />
                <h3 className="text-lg font-bold text-gray-800">รายละเอียด (Description)</h3>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => description !== card.description && handleSave({ description })}
                placeholder="เพิ่มรายละเอียด..."
                className="w-full bg-gray-50 hover:bg-gray-100 focus:bg-white border-2 border-transparent focus:border-red-200 outline-none rounded-xl p-4 text-sm text-gray-700 min-h-[120px] transition-colors resize-y"
              />
            </section>

            {/* Checklist */}
            <section>
              <div className="flex items-center gap-3 mb-3">
                <CheckSquare size={20} className="text-gray-400" />
                <h3 className="text-lg font-bold text-gray-800">รายการตรวจสอบ (Checklist)</h3>
              </div>

              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-4">
                <div
                  className="bg-green-500 h-full transition-all duration-300"
                  style={{ width: `${checklist.length ? (checklist.filter(i => i.completed).length / checklist.length) * 100 : 0}%` }}
                />
              </div>

              <div className="flex flex-col gap-2 mb-4">
                {checklist.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-3 group">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => toggleChecklist(item.id)}
                      className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                    />
                    <span className={`text-sm flex-1 ${item.completed ? 'line-through text-gray-400' : 'text-gray-700 font-medium'}`}>
                      {item.title}
                    </span>
                    <button
                      onClick={() => deleteChecklistItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 p-1"
                      title="ลบรายการ"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()}
                  placeholder="เพิ่มรายการ..."
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-100"
                />
                <button
                  onClick={addChecklistItem}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-4 rounded-lg text-sm transition-colors"
                >
                  เพิ่ม
                </button>
              </div>
            </section>

            {/* Attachments */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Paperclip size={20} className="text-gray-400" />
                  <h3 className="text-lg font-bold text-gray-800">ไฟล์แนบ (Attachments)</h3>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                >
                  {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  แนบไฟล์
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                  onChange={handleFileUpload}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {attachments.map(att => {
                  const isVideo = att.fileType?.startsWith('video/');

                  return (
                    <div key={att.id} className={`relative group ${isVideo ? 'col-span-1 sm:col-span-2' : ''}`}>
                      {isVideo ? (
                        <div className="flex flex-col gap-2 p-3 border border-gray-200 rounded-xl bg-gray-50 relative">
                          <video controls className="w-full rounded-lg max-h-64 bg-black" src={att.fileUrl}>
                            <track kind="captions" />
                          </video>
                          <div className="flex justify-between items-center px-1">
                            <span className="text-sm font-bold text-gray-800 truncate">{att.fileName}</span>
                            <span className="text-xs text-gray-500">{(att.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                          </div>
                        </div>
                      ) : (
                        <a href={att.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:border-red-300 hover:bg-red-50 transition-colors h-full">
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 overflow-hidden shrink-0">
                            {att.fileType?.includes('image') ? (
                              <img src={att.fileUrl} alt={att.fileName} className="w-full h-full object-cover" />
                            ) : (
                              <Paperclip size={20} />
                            )}
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-bold text-gray-800 truncate">{att.fileName}</span>
                            <span className="text-xs text-gray-500">{(att.fileSize / 1024).toFixed(1)} KB</span>
                          </div>
                        </a>
                      )}
                      <button
                        onClick={(e) => handleDeleteAttachment(e, att)}
                        className="absolute -top-2 -right-2 bg-white border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 p-1.5 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10"
                        title="ลบไฟล์แนบ"
                      >
                        <X size={14} strokeWidth={3} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Activity & Comments */}
            <section>
              <div className="flex items-center gap-3 mb-5">
                <MessageSquare size={20} className="text-gray-400" />
                <h3 className="text-lg font-bold text-gray-800">กิจกรรม (Activity)</h3>
              </div>

              <div className="flex flex-col gap-5 mb-8">
                {comments.map(comment => {
                  const author = users.find(u => u.id === comment.userId);
                  return (
                    <div key={comment.id} className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 text-gray-600 font-bold flex items-center justify-center flex-shrink-0 uppercase text-xs">
                        {author?.fullName?.[0] || 'U'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2 mb-1.5">
                          <span className="font-bold text-gray-800 text-sm">{author?.fullName || 'ผู้ใช้ที่ไม่รู้จัก'}</span>
                          <span className="text-xs text-gray-400">{new Date(comment.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="bg-gray-50 border border-gray-100 shadow-sm px-4 py-3 rounded-tr-2xl rounded-b-2xl text-sm text-gray-700 inline-block min-w-[200px]">
                          {comment.message}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Comment Input Box */}
              <div className="flex gap-4 mt-8 pt-6 border-t border-gray-100">
                <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold flex items-center justify-center flex-shrink-0 uppercase">
                  {currentUser?.fullName?.[0] || 'U'}
                </div>
                <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden focus-within:border-red-300 focus-within:ring-2 focus-within:ring-red-100 transition-all shadow-sm">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="เขียนความคิดเห็นใหม่ที่นี่..."
                    className="w-full p-4 text-sm outline-none resize-none min-h-[100px]"
                  />
                  <div className="bg-gray-50 px-4 py-3 flex justify-end border-t border-gray-100">
                    <button
                      onClick={handleAddComment}
                      className="bg-[#ff2301] hover:bg-red-600 text-white font-bold px-5 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 shadow-sm"
                    >
                      <Send size={14} /> บันทึกความคิดเห็น
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <div className="h-8"></div>
          </div>

          {/* Sidebar Column */}
          <div className="w-full md:w-48 flex-shrink-0 flex flex-col gap-4 md:gap-6 order-1 md:order-2 bg-gray-50 md:bg-transparent p-4 md:p-0 rounded-xl md:rounded-none border border-gray-100 md:border-none">

            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">ผู้รับผิดชอบ</span>
              <select
                value={assignedToId}
                onChange={(e) => {
                  setAssignedToId(e.target.value);
                  handleSave({ assignedToId: e.target.value });
                }}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-100"
              >
                <option value="">ไม่ได้มอบหมาย</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.fullName}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Service Reviewers (วิศวกรบริการ)</span>
              <select
                value={engineeringReviewers[0] || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  const newReviewers = val ? [val] : [];
                  setEngineeringReviewers(newReviewers);
                  handleSave({ engineeringReviewers: newReviewers });
                }}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-100"
              >
                <option value="">ไม่ได้มอบหมาย</option>
                {users.filter(u => ['SERVICE', 'SERVICE_ENGINEER', 'SERVICE_MGR', 'บริการ'].some(r => (u.role || '').toUpperCase().includes(r))).map(u => (
                  <option key={u.id} value={u.id}>{u.fullName}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">วันเริ่มงาน (Start Date)</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  handleSave({ startDate: e.target.value });
                }}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-100"
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">วันครบกำหนด (End Date)</span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  handleSave({ dueDate: e.target.value });
                }}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-100"
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">สีของการ์ด</span>
              <div className="flex flex-wrap gap-2 mt-1">
                <button
                  onClick={() => {
                    setCardColor('');
                    handleSave({ color: null });
                  }}
                  className={`w-6 h-6 rounded-full border-2 ${!cardColor ? 'border-gray-900 bg-gray-100' : 'border-gray-200 bg-gray-50 hover:bg-gray-200'} transition-all flex items-center justify-center`}
                  title="ไม่มีสี (None)"
                >
                  {!cardColor && <span className="w-1.5 h-1.5 rounded-full bg-gray-900" />}
                </button>
                {[
                  { name: 'red', bg: 'bg-red-500', hover: 'hover:bg-red-600' },
                  { name: 'orange', bg: 'bg-orange-500', hover: 'hover:bg-orange-600' },
                  { name: 'yellow', bg: 'bg-yellow-500', hover: 'hover:bg-yellow-600' },
                  { name: 'green', bg: 'bg-green-500', hover: 'hover:bg-green-600' },
                  { name: 'blue', bg: 'bg-blue-500', hover: 'hover:bg-blue-600' },
                  { name: 'purple', bg: 'bg-purple-500', hover: 'hover:bg-purple-600' },
                  { name: 'gray', bg: 'bg-gray-500', hover: 'hover:bg-gray-600' },
                ].map(colorObj => (
                  <button
                    key={colorObj.name}
                    onClick={() => {
                      setCardColor(colorObj.bg);
                      handleSave({ color: colorObj.bg });
                    }}
                    className={`w-6 h-6 rounded-full ${colorObj.bg} ${colorObj.hover} transition-all border-2 ${cardColor === colorObj.bg ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                    title={colorObj.name}
                  />
                ))}
              </div>
            </div>

            <div className="h-px bg-gray-200 w-full my-2" />

            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">การกระทำ</span>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-bold mb-1 flex items-start gap-2 shadow-sm animate-in fade-in zoom-in-95">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span className="leading-tight">{errorMsg}</span>
                </div>
              )}

              <button
                onClick={handleRevisionRequest}
                className="w-full flex items-center justify-start gap-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                <AlertCircle size={16} />
                ขอให้แก้ไข (Request Revision)
              </button>

              <button
                onClick={handleResubmit}
                className="w-full flex items-center justify-start gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                <CheckSquare size={16} />
                ส่งงานอีกครั้ง (Resubmit)
              </button>
            </div>

            <div className="h-px bg-gray-200 w-full my-4" />

            <button
              onClick={() => setIsDeletingCard(true)}
              className="w-full flex items-center justify-start gap-2 bg-gray-50 hover:bg-red-50 text-gray-700 hover:text-red-700 border border-gray-200 hover:border-red-200 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              <Trash2 size={16} className="text-red-500" />
              ลบการ์ด (Delete Card)
            </button>

          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {attachmentToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm" onPointerDown={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">ลบไฟล์แนบ (Delete Attachment)</h3>
            <p className="text-sm text-gray-600 mb-6">
              คุณแน่ใจหรือไม่ว่าต้องการลบไฟล์ <span className="font-semibold text-gray-900">"{attachmentToDelete.fileName}"</span>?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setAttachmentToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                ยกเลิก (Cancel)
              </button>
              <button
                onClick={confirmDeleteAttachment}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} ลบไฟล์
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Card Confirmation Modal */}
      {isDeletingCard && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm" onPointerDown={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">ลบการ์ด (Delete Card)</h3>
            <p className="text-sm text-gray-600 mb-6">
              คุณแน่ใจหรือไม่ว่าต้องการลบการ์ดนี้? การกระทำนี้ไม่สามารถกู้คืนได้
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setIsDeletingCard(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                ยกเลิก (Cancel)
              </button>
              <button
                onClick={confirmDeleteCard}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Trash2 size={16} /> ลบการ์ด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
