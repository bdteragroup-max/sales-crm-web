export function CardSkeleton() { 
  return ( 
    <div className="bg-white rounded-2xl p-4 space-y-3 animate-pulse border border-gray-100 shadow-sm"> 
      <div className="h-4 bg-gray-100 rounded w-3/4" /> 
      <div className="h-3 bg-gray-100 rounded w-1/2" /> 
      <div className="h-3 bg-gray-100 rounded w-2/3" /> 
      <div className="h-8 bg-gray-100 rounded-lg w-1/3 mt-2" /> 
    </div> 
  )
}
