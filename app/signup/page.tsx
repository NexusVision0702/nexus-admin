"use client";

import { useState } from "react";
import Link from "next/link";
import TermsModal from "@/components/TermsModal"; // ← 共通部品をインポート

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: "",
    furigana: "",
    birthdate: "",
    phone: "",
    email: "",
    password: "",
    address: "",
  });

  // 同意チェックボックス用の状態
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedAdult, setAgreedAdult] = useState(false);
  const [agreedAntiSocial, setAgreedAntiSocial] = useState(false);

  // 規約モーダルの表示・非表示の状態
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    // すべてのチェックが入っているか確認
    if (!agreedTerms || !agreedAdult || !agreedAntiSocial) {
      setError("すべての項目に同意・確認の上、チェックを入れてください。");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "登録処理に失敗しました。");
      }

      setMessage("確認メールを送信しました。メール内のリンクをクリックして本登録を完了させてください。");
    } catch (err: any) {
      setError(err.message || "エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
          新規会員登録
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          {message ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-5 rounded text-center space-y-4">
              <p className="font-bold">{message}</p>
              <Link
                href="/"
                className="inline-block bg-emerald-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-emerald-700 transition"
              >
                トップページへ戻る
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">お名前</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">フリガナ</label>
                <input
                  type="text"
                  name="furigana"
                  value={formData.furigana}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">生年月日</label>
                <input
                  type="date"
                  name="birthdate"
                  value={formData.birthdate}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">電話番号</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">メールアドレス</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">パスワード</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">住所</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                />
              </div>

              {/* --- チェックボックスエリア（大きさを完全に統一） --- */}
              <div className="space-y-4 pt-2 border-t border-gray-200">
                {/* 1. 利用規約 */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-green-600 border-gray-300 rounded focus:ring-green-500 flex-shrink-0"
                    required
                  />
                  <label htmlFor="terms" className="text-xs sm:text-sm text-gray-700">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="text-green-600 underline font-medium hover:text-green-800"
                    >
                      利用規約・プライバシーポリシー
                    </button>{" "}
                    に同意します
                    <span className="block text-amber-600 text-xs mt-0.5">
                      ※先に上のリンクをクリックして規約内容をご確認ください
                    </span>
                  </label>
                </div>

                {/* 2. 未成年者 */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="adult"
                    checked={agreedAdult}
                    onChange={(e) => setAgreedAdult(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-green-600 border-gray-300 rounded focus:ring-green-500 flex-shrink-0"
                    required
                  />
                  <label htmlFor="adult" className="text-xs sm:text-sm text-gray-700 cursor-pointer">
                    わたしは未成年者ではありません
                    <span className="block text-gray-500 text-xs mt-0.5">
                      (未成年の場合：法定代理人の許可が取れています)
                    </span>
                  </label>
                </div>

                {/* 3. 反社会的勢力 */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="antisocial"
                    checked={agreedAntiSocial}
                    onChange={(e) => setAgreedAntiSocial(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-green-600 border-gray-300 rounded focus:ring-green-500 flex-shrink-0"
                    required
                  />
                  <label htmlFor="antisocial" className="text-xs sm:text-sm text-gray-700 cursor-pointer">
                    暴力団等の反社会的勢力に該当せず、また将来にわたっても該当しないことを表明し、保証します
                  </label>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {loading ? "送信中..." : "入力内容を確認する"}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-green-600 hover:underline">
              トップページに戻る
            </Link>
          </div>
        </div>
      </div>

      {/* --- 利用規約・プライバシーポリシーモーダル（部品化してスッキリ） --- */}
      <TermsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}