'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StoreReceiveClient({ initialPos, userName }: { initialPos: any[], userName: string }) {
  const [pos, setPos] = useState(initialPos);
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const router = useRouter();

  const handleReceive = async (poNumber: string) => {
    setLoadingMap(prev => ({ ...prev, [poNumber]: true }));
    try {
      const res = await fetch(`/api/store/receive/${encodeURIComponent(poNumber)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receivedBy: userName })
      });
      if (res.ok) {
        setPos(prev => prev.filter(po => po.poNumber !== poNumber));
        router.refresh();
      } else {
        alert('Failed to update PO');
      }
    } catch (e) {
      console.error(e);
      alert('Error updating PO');
    }
    setLoadingMap(prev => ({ ...prev, [poNumber]: false }));
  };

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery Date</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pos.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No pending Purchase Orders to receive.
                </td>
              </tr>
            ) : (
              pos.map((po) => (
                <tr key={po.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{po.poNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{po.vendorName || '-'}</td>
                  <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{po.itemList || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString('th-TH') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleReceive(po.poNumber)}
                      disabled={loadingMap[po.poNumber]}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium shadow transition-colors disabled:opacity-50"
                    >
                      {loadingMap[po.poNumber] ? 'Processing...' : 'Confirm Receipt'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
