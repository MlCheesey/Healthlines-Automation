"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function login() {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      alert("Invalid login");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6">HealthLines AI Login</h1>

        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          className="w-full mb-3 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2"
        />

        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
          className="w-full mb-5 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2"
        />

        <button
          onClick={login}
          className="w-full bg-blue-600 hover:bg-blue-500 rounded-lg py-2"
        >
          Login
        </button>
      </div>
    </main>
  );
}