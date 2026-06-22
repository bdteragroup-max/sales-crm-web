"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle, Clock } from 'lucide-react';
import { getUnreadNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/app/actions/notifications';
import { useRouter } from 'next/navigation';

export default function NotificationBell({ userId }: { userId?: string }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      const res = await getUnreadNotifications(userId);
      if (res.success && res.data) {
        setNotifications(res.data);
      }
    };

    fetchNotifications();
    
    // Poll every minute
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [userId]);

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif: any) => {
    // Mark as read
    await markNotificationAsRead(notif.id);
    setNotifications(prev => prev.filter(n => n.id !== notif.id));
    setIsOpen(false);

    if (notif.linkUrl) {
      router.push(notif.linkUrl);
    }
  };

  const handleMarkAllRead = async () => {
    if (!userId) return;
    await markAllNotificationsAsRead(userId);
    setNotifications([]);
  };

  const timeAgo = (dateStr: string) => {
    const diff = new Date().getTime() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-2xl flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all duration-200 relative group"
      >
        <Bell size={20} strokeWidth={2} className="transition-transform duration-200 group-hover:scale-105" />
        {notifications.length > 0 && (
          <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-red-500 border border-white animate-pulse" />
        )}
      </button>

      {isOpen && (
        <div className="fixed left-[84px] bottom-6 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden transform origin-bottom-left transition-all">
          <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Bell size={16} className="text-brand-red" />
              การแจ้งเตือน
            </h3>
            {notifications.length > 0 && (
              <button 
                onClick={handleMarkAllRead}
                className="text-[10px] font-bold text-gray-500 hover:text-brand-red uppercase tracking-wider transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>
          
          <div className="max-h-[350px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400 flex flex-col items-center gap-2">
                <CheckCircle size={32} strokeWidth={1.5} className="text-gray-200" />
                <p className="text-sm font-medium">ไม่มีการแจ้งเตือนใหม่</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className="w-full p-4 text-left hover:bg-red-50/30 transition-colors group relative"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-red rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    <p className="text-sm font-bold text-gray-900 mb-1">{n.title}</p>
                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{n.message}</p>
                    <p className="text-[10px] font-bold text-gray-400 mt-2 flex items-center gap-1">
                      <Clock size={10} />
                      {timeAgo(n.createdAt)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
