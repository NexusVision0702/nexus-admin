"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email"); // emailパラメータを受け取るように修正

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const processVerification = async () => {
      if (!email) {
        setStatus("error");
        setErrorMessage("メールアドレスが指定されていません。");
        return;
      }

      try {
        // バックエンドの認証API（またはDynamoDB連携用API）を呼び出す
        // ※ここでは例として専用のAPIエンドポイント /api/verify を叩く設計にします
        const res = await fetch(`/api/verify?email=${encodeURIComponent(email)}`, {
          method: "POST",
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "認証に失敗しました。");
        }

        setStatus("success");
        setTimeout(() => {
          router.push("/?verified=true");
        }, 2000);

      } catch (err: any) {
        console.error("認証処理エラー:", err);
        setStatus("error");
        setErrorMessage(err.message || "本登録の処理中にエラーが発生しました。");
      }
    };

    processVerification();
  }, [email, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center bg-white py-10 px-6 shadow sm:rounded-lg">
        {status === "loading" && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">認証処理中...</h2>
            <p className="text-sm text-gray-600">アカウントの本登録を進めています。しばらくお待ちください。</p>
          </div>
        )}
        {status === "success" && (
          <div>
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl font-bold mb-4">
              ✓
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">登録が完了しました</h2>
            <p className="text-sm text-gray-600">メールアドレスの認証と本登録が完了しました。まもなく画面が切り替わります。</p>
          </div>
        )}
        {status === "error" && (
          <div>
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-3xl font-bold mb-4">
              ✕
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">認証エラー</h2>
            <p className="text-sm text-red-600">{errorMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="text-center py-12">読み込み中...</div>}>
      <VerifyContent />
    </Suspense>
  );
}