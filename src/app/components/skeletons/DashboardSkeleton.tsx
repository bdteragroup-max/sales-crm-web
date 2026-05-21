import { CardSkeleton } from './CardSkeleton'

export function DashboardSkeleton() { 
  return ( 
    <div className="p-4 md:p-6 space-y-6"> 
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => ( 
          <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" /> 
        ))} 
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-96 bg-gray-100 rounded-3xl animate-pulse" />
        <div className="h-96 bg-gray-100 rounded-3xl animate-pulse" />
      </div>
    </div> 
  )
}
