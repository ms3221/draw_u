export default function ProjectDetailLoading() {
  return (
    <div className="min-h-screen bg-white pt-[100px]">
      <section className="py-16 px-6">
        <div className="max-w-[1280px] mx-auto">
          <div className="h-4 w-20 bg-[#eee] rounded mb-10" />
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-12 animate-pulse">
            <div className="aspect-[4/3] bg-[#eee] rounded" />
            <div className="space-y-4">
              <div className="h-3 w-16 bg-[#eee] rounded" />
              <div className="h-7 w-48 bg-[#eee] rounded" />
              <div className="h-4 w-32 bg-[#eee] rounded" />
              <div className="h-px bg-[#eee] my-6" />
              <div className="space-y-3">
                <div className="h-3 w-full bg-[#eee] rounded" />
                <div className="h-3 w-3/4 bg-[#eee] rounded" />
                <div className="h-3 w-1/2 bg-[#eee] rounded" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
