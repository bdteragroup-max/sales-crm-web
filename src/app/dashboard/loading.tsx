import { DashboardSkeleton } from '@/app/components/skeletons/DashboardSkeleton'

export default function Loading() {
  return (
    <div className="flex-1 bg-gray-50/50 min-h-screen overflow-y-auto pb-24 md:pb-6">
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="h-8 bg-gray-100 rounded w-1/4 animate-pulse" />
      </header>
      <DashboardSkeleton />
    </div>
  )
}
