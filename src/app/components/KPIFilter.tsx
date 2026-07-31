'use client';
import { useRouter, useSearchParams } from 'next/navigation';

export default function KPIFilter({ departments, branches }: { departments: string[], branches: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentDept = searchParams.get('department') || '';
  const currentBranch = searchParams.get('branch') || '';

  const onChangeDept = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (val) params.set('department', val);
    else params.delete('department');
    router.push(`?${params.toString()}`);
  };

  const onChangeBranch = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (val) params.set('branch', val);
    else params.delete('branch');
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">แผนก (Department):</label>
        <select 
          value={currentDept} 
          onChange={onChangeDept}
          className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">ทุกแผนก</option>
          {departments.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">สาขา (Branch):</label>
        <select 
          value={currentBranch} 
          onChange={onChangeBranch}
          className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">ทุกสาขา</option>
          {branches.map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
