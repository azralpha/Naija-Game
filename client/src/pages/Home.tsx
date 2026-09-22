export default function Home() {
  return (
    <main className="min-h-screen bg-[#0b0c0e] px-8 py-16 text-[#f7f1e6]">
      <p className="font-mono text-sm text-[#72c67f]">NNL // HYBRID BUILD</p>
      <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-tight">Naija Normal Level</h1>
      <p className="mt-5 max-w-2xl text-lg text-[#a5aaa1]">
        Offline Classic Struggle and Online Arena are hosted by the full-screen GameCanvas route. This page remains as a modular fallback shell for future route-based multiplayer menus.
      </p>
      <div className="mt-10 grid max-w-3xl gap-4 md:grid-cols-2">
        <section className="border border-[#72c67f] bg-[#111418] p-5">
          <h2 className="text-xl">Offline Mode</h2>
          <p className="mt-2 text-sm text-[#a5aaa1]">Local Gbese, Japa Keys, hazards, and instant respawns.</p>
        </section>
        <section className="border border-[#e65c4b] bg-[#111418] p-5">
          <h2 className="text-xl">Online Arena</h2>
          <p className="mt-2 text-sm text-[#a5aaa1]">50-player rooms, remote players, sabotage traps, live ranking, and streamer wahala.</p>
        </section>
      </div>
    </main>
  );
}
