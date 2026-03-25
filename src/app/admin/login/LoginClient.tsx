"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function LoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      toast.error("로그인 실패");
      setLoading(false);
      return;
    }

    toast.success("로그인 성공");
    router.push("/admin/projects");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-[360px]">
        <h1 className="text-xl font-bold text-[#2f2f2f] text-center mb-8">
          관리자 로그인
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label
              htmlFor="email"
              className="text-[12px] tracking-[0.1em] text-[#999] uppercase"
            >
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 rounded-none border-[#d0d0d0] focus:border-[#2f2f2f]"
            />
          </div>

          <div>
            <Label
              htmlFor="password"
              className="text-[12px] tracking-[0.1em] text-[#999] uppercase"
            >
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 rounded-none border-[#d0d0d0] focus:border-[#2f2f2f]"
            />
          </div>

          {error && (
            <p className="text-[12px] text-red-500">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-none bg-[#2f2f2f] hover:bg-black text-[12px] tracking-[0.15em] h-[44px]"
          >
            {loading ? "로그인 중..." : "로그인"}
          </Button>
        </form>
      </div>
    </div>
  );
}
