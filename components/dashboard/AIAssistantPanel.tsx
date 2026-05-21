export default function AIAssistantPanel() {
  return (
    <aside className="w-[360px] border-l border-zinc-800 bg-zinc-950 flex flex-col">
      <div className="p-5 border-b border-zinc-800">
        <h2 className="text-white font-semibold text-lg">
          AI Operations Assistant
        </h2>

        <p className="text-zinc-500 text-sm mt-1">
          Modify operational workflows and actions
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <p className="text-sm text-zinc-300">
            Suggested operational commands:
          </p>

          <div className="mt-4 space-y-2">
            {[
              "Change delivery to 22 May",
              "Mark as partial delivery",
              "Hold invoice until MRN arrives",
              "Escalate issue to urgent",
              "Generate revised customer reply",
            ].map((item) => (
              <button
                key={item}
                className="w-full text-left px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-400 hover:text-white hover:border-zinc-700 transition"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-5 border-t border-zinc-800">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3">
          <textarea
            placeholder="Ask AI to modify operations..."
            className="w-full h-28 resize-none bg-transparent outline-none text-sm text-white placeholder:text-zinc-500"
          />

          <div className="flex justify-end mt-3">
            <button className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-medium transition">
              Execute Proposal
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}