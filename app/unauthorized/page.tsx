export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center">
        <h1 className="text-3xl font-bold mb-4">
          Unauthorized
        </h1>

        <p className="text-zinc-400">
          You do not have access to this system.
        </p>
      </div>
    </main>
  );
}