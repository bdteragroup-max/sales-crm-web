import { TableSkeleton } from '@/app/components/skeletons/TableSkeleton'

export default function Loading() {
  return (
    <main className="flex-1 p-4 md:p-10 bg-gray-50 h-screen overflow-hidden">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 h-full flex flex-col overflow-hidden p-6">
        <div className="h-8 bg-gray-100 rounded w-1/4 mb-6 animate-pulse" />
        <TableSkeleton rows={10} />
      </div>
    </main>
  )
}
