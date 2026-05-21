import { KanbanSkeleton } from '@/app/components/skeletons/KanbanSkeleton'

export default function Loading() {
  return (
    <main className="flex-1 md:overflow-hidden overflow-y-auto bg-white flex flex-col h-screen">
      <header className="shrink-0 bg-white border-b border-gray-100 px-6 py-4 flex flex-col gap-3">
        <div className="h-8 bg-gray-100 rounded w-1/4 animate-pulse" />
        <div className="h-8 bg-gray-100 rounded w-full animate-pulse" />
      </header>
      <div className="flex-1 overflow-hidden">
        <KanbanSkeleton />
      </div>
    </main>
  )
}
