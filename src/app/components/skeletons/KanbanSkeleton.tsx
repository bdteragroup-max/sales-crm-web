import { CardSkeleton } from './CardSkeleton'

export function KanbanSkeleton() { 
  return ( 
    <div className="flex gap-4 p-4 md:p-6 overflow-hidden h-full"> 
      {Array.from({ length: 5 }).map((_, i) => ( 
        <div key={i} className="w-72 shrink-0 space-y-3"> 
          <div className="h-12 bg-gray-100 rounded-xl animate-pulse" /> 
          {Array.from({ length: 3 }).map((_, j) => ( 
            <CardSkeleton key={j} /> 
          ))} 
        </div> 
      ))} 
    </div> 
  )
}
