'use client';
import React, { useState, useMemo } from 'react';

export default function PRListClient({ initialPrs }: { initialPrs: any[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [poFilter, setPoFilter] = useState('all'); // all, with-po, without-po

  // Extract unique projects for the dropdown
  const uniqueProjects = useMemo(() => {
    const projects = new Set<string>();
    initialPrs.forEach(pr => {
      if (pr.projectName) projects.add(pr.projectName);
    });
    return Array.from(projects).sort();
  }, [initialPrs]);

  const filteredPrs = initialPrs.filter(pr => {
    const matchesSearch = 
      pr.prNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pr.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pr.requestedBy?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pr.itemList?.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesProject = projectFilter ? pr.projectName === projectFilter : true;
    
    let matchesPo = true;
    if (poFilter === 'with-po') {
      matchesPo = pr.purchaseOrders && pr.purchaseOrders.length > 0;
    } else if (poFilter === 'without-po') {
      matchesPo = !pr.purchaseOrders || pr.purchaseOrders.length === 0;
    }

    return matchesSearch && matchesProject && matchesPo;
  });

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden p-6">
      <div className="mb-4 flex flex-col md:flex-row gap-4">
        <input 
          type="text" 
          placeholder="ค้นหาด้วยเลขที่ PR, โครงการ, สินค้า, หรือผู้ขอซื้อ..." 
          className="w-full md:w-1/2 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        
        <select
          className="w-full md:w-1/4 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
        >
          <option value="">ทุกโครงการ</option>
          {uniqueProjects.map(proj => (
            <option key={proj} value={proj}>{proj}</option>
          ))}
        </select>

        <select
          className="w-full md:w-1/4 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          value={poFilter}
          onChange={(e) => setPoFilter(e.target.value)}
        >
          <option value="all">สถานะ PO ทั้งหมด</option>
          <option value="with-po">มี PO แล้ว</option>
          <option value="without-po">ยังไม่มี PO</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">เลขที่ PR</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันที่</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">โครงการ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">รายการสินค้า</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ผู้ขอซื้อ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO ที่เกี่ยวข้อง</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 text-sm">
            {filteredPrs.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-4 text-gray-500">ไม่พบข้อมูล</td></tr>
            ) : (
              filteredPrs.map(pr => (
                <tr key={pr.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{pr.prNumber}</td>
                  <td className="px-6 py-4 text-gray-600">{pr.recordedAt ? new Date(pr.recordedAt).toLocaleDateString('th-TH') : '-'}</td>
                  <td className="px-6 py-4 text-gray-600">{pr.projectName || '-'}</td>
                  <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{pr.itemList || '-'}</td>
                  <td className="px-6 py-4 text-gray-600">{pr.requestedBy || '-'}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {pr.purchaseOrders?.length > 0 ? pr.purchaseOrders.map((po: any) => (
                      <span key={po.poNumber} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-1">
                        {po.poNumber} ({po.receiveStatus === 'PENDING' || po.receiveStatus === 'Pending' ? 'รอรับสินค้า' : po.receiveStatus || 'รอรับสินค้า'})
                      </span>
                    )) : '-'}
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
