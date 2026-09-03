/** Light placeholder cards shown until stored data has been loaded. */
export function DashboardSkeleton() {
  const card = 'bg-white dark:bg-gray-900 rounded-2xl p-4 mb-3 border border-gray-100 dark:border-gray-800';
  const line = 'bg-gray-100 dark:bg-gray-800 rounded';
  return (
    <div aria-busy="true" aria-label="Loading your data" className="animate-pulse md:grid md:grid-cols-2 md:gap-4">
      <div className={card}>
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800" />
          <div className="flex-1 space-y-2">
            <div className={`${line} h-3 w-2/3`} />
            <div className={`${line} h-1.5 w-full`} />
            <div className={`${line} h-3 w-1/2`} />
          </div>
        </div>
        <div className={`${line} h-10 w-full mt-3 rounded-xl`} />
      </div>
      <div className={card}>
        <div className={`${line} h-3 w-24 mb-3`} />
        <div className={`${line} h-8 w-32 mb-3`} />
        <div className={`${line} h-2 w-full`} />
      </div>
      <div className={card}>
        <div className={`${line} h-3 w-20 mb-3`} />
        <div className={`${line} h-20 w-full`} />
      </div>
      <div className={card}>
        <div className={`${line} h-3 w-16 mb-3`} />
        <div className={`${line} h-8 w-24`} />
      </div>
    </div>
  );
}
