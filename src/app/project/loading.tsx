export default function ProjectLoading() {
  return (
    <div className="min-h-screen bg-white pt-[100px]">
      <section className="py-24 px-6">
        <div className="max-w-[1280px] mx-auto">
          <div className="mb-16">
            <div className="h-3 w-16 bg-[#eee] rounded mb-3" />
            <div className="h-8 w-32 bg-[#eee] rounded" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[4/3] bg-[#eee] rounded" />
                <div className="mt-4 space-y-2">
                  <div className="h-4 w-3/4 bg-[#eee] rounded" />
                  <div className="h-3 w-1/2 bg-[#eee] rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
