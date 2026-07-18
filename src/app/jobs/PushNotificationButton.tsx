"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";

const base64ToUint8Array = (base64: string) => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(b64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export default function PushNotificationButton() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      checkSubscription();
    } else {
      setIsLoading(false);
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error("Error checking push subscription:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeButtonOnClick = async () => {
    if (isSubscribed) return; // We don't unsubscribe per user's request
    
    setIsLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert("คุณปฏิเสธการเข้าถึงการแจ้งเตือน โปรดเปิดสิทธิ์ในตั้งค่าเบราว์เซอร์");
        setIsLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      
      const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicVapidKey) {
        throw new Error('VAPID public key is not set.');
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToUint8Array(publicVapidKey),
      });

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription,
          userAgent: navigator.userAgent
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription to server');
      }

      setIsSubscribed(true);
    } catch (error) {
      console.error("Failed to subscribe the user: ", error);
      alert("ไม่สามารถเปิดใช้งานการแจ้งเตือนได้");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) return null;

  return (
    <button
      onClick={subscribeButtonOnClick}
      disabled={isLoading || isSubscribed}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        isSubscribed
          ? "bg-green-50 text-green-700 border border-green-200 cursor-default"
          : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 shadow-sm"
      }`}
    >
      {isLoading ? (
        <Loader2 size={16} className="animate-spin text-gray-400" />
      ) : isSubscribed ? (
        <Bell size={16} />
      ) : (
        <BellOff size={16} />
      )}
      {isLoading ? "กำลังตรวจสอบ..." : isSubscribed ? "เปิดแจ้งเตือนแล้ว" : "รับการแจ้งเตือน"}
    </button>
  );
}
