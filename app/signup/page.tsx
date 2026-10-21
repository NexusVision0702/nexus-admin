"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, deleteDoc, doc, query, orderBy, where } from "firebase/firestore";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from "firebase/auth";
import Link from "next/link";

interface UserData {
  id: string;
  name?: string;
  furigana?: string;
  birthdate?: string;
  phone?: string;
  email?: string;
  address?: string;
  user_code?: string;
  createdAt?: any;
}

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ログインフォーム用
  const [empId, setEmpId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // 2段階認証（MFA）用の状態
  const [step, setStep] = useState<"login" | "mfa">("login");
  const [generatedCode, setGeneratedCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [tempAuthData, setTempAuthData] = useState<{ email: string; pass: string } | null>(null);

  // 検索・並び替え用の状態
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // 自動ログアウト（15分 = 900,000ミリ秒）
  const handleLogout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setStep("login");
    setTempAuthData(null);
    setInputCode("");
  }, []);

  useEffect(() => {
    if (!user) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        alert("一定時間操作がなかったため、セキュリティ保護のため自動ログアウトしました。");
        handleLogout();
      }, 15 * 60 * 1000);
    };

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [user, handleLogout]);

  // 認証状態の監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // ユーザー一覧の取得
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, "users"), orderBy("createdAt", sortOrder));
      const snapshot = await getDocs(q);
      const userList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as UserData[];
      setUsers(userList);
    } catch (err) {
      console.error("ユーザー取得エラー:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [sortOrder, user]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const search = searchTerm.toLowerCase();
      return (
        (u.name && u.name.toLowerCase().includes(search)) ||
        (u.furigana && u.furigana.toLowerCase().includes(search)) ||
        (u.email && u.email.toLowerCase().includes(search)) ||
        (u.phone && u.phone.toLowerCase().includes(search)) ||
        (u.user_code && u.user_code.toLowerCase().includes(search))
      );
    });
  }, [users, searchTerm]);

  // ステップ1: 社員番号とパスワードの検証 ＆ サーバー経由でのメールコード送信
  const handleInitialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoggingIn(true);

    try {
      const adminsRef = collection(db, "admins");
      const q = query(adminsRef, where("emp_id", "==", empId.trim()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        throw new Error("社員番号が見つかりません。");
      }

      const adminData = snapshot.docs[0].data();
      const email = adminData.email;

      if (!email) {
        throw new Error("この社員番号にメールアドレスが紐付いていません。");
      }

      // 6桁のランダムな認証コードを生成
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // サーバーサイドAPIを呼び出して support@nexus-vision.net からメールを送信
      const response = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "認証メールの送信に失敗しました。");
      }

      setGeneratedCode(code);
      setTempAuthData({ email, pass: password });
      setStep("mfa");
    } catch (err: any) {
      setError("ログイン失敗: " + (err.message || "認証エラーが発生しました"));
    } finally {
      setIsLoggingIn(false);
    }
  };

  // ステップ2: 2段階認証コードの厳密な確認 ＆ Firebaseログイン実行
  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (inputCode.trim() !== generatedCode) {
      setError("認証コードが一致しません。正しい6桁のコードを入力してください。");
      return;
    }

    if (!tempAuthData) return;

    setIsLoggingIn(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, tempAuthData.email, tempAuthData.pass);
      setUser(userCredential.user);
      fetchUsers();
    } catch (err: any) {
      setError("認証に失敗しました: " + err.message);
      setStep("login");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDeleteUser = async (id: string, name?: string) => {
    if (!confirm(`【確認】\n${name || "このユーザー"}のデータを削除してもよろしいですか？\n\n※削除したデータは元に戻すことができません。`)) return;
    
    try {
      await deleteDoc(doc(db, "users", id));
      setUsers(users.filter((u) => u.id !== id));
      alert("ユーザーデータを削除しました。");
    } catch (err) {
      console.error("削除エラー:", err);
      alert("削除に失敗しました。権限がありません。");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-md">
          <h1 className="text-xl font-bold text-gray-800 mb-6 text-center">
            {step === "login" ? "NexusVision 管理者ログイン" : "二段階認証 (MFA)"}
          </h1>
          
          {error && <p className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded">{error}</p>}

          {step === "login" ? (
            <form onSubmit={handleInitialLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">社員番号</label>
                <input
                  type="text"
                  value={empId}
                  onChange={(e) => setEmpId(e.target.value)}
                  placeholder="例: NV00001"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700 transition disabled:opacity-50"
              >
                {isLoggingIn ? "送信中..." : "次へ (認証コード送信)"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyMfa} className="space-y-4">
              <p className="text-xs text-gray-600 mb-2">
                <span className="font-bold text-slate-800">support@nexus-vision.net</span> から送信された6桁の認証コードを入力してください。
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">6桁の認証コード</label>
                <input
                  type="text"
                  maxLength={6}
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  placeholder="例: 123456"
                  className="w-full px-3 py-2 border rounded-lg text-center tracking-widest text-lg font-bold focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700 transition disabled:opacity-50"
              >
                {isLoggingIn ? "認証中..." : "ログインを完了する"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("login");
                  setInputCode("");
                }}
                className="w-full text-gray-500 text-xs text-center mt-2 hover:underline"
              >
                ← ログイン画面に戻る
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-slate-800 text-white px-8 py-4 flex justify-between items-center shadow">
        <h1 className="font-bold text-lg">NexusVision株式会社 ユーザー管理ダッシュボード</h1>
        <div className="flex items-center space-x-4">
          <Link
            href="/register"
            className="text-sm bg-green-600 px-4 py-2 rounded hover:bg-green-500 transition font-medium"
          >
            社員登録・管理へ
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm bg-slate-700 px-4 py-2 rounded hover:bg-slate-600 transition"
          >
            ログアウト
          </button>
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="bg-white p-4 rounded-lg shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="w-full md:w-1/3">
            <input
              type="text"
              placeholder="名前、フリガナ、メール、電話番号で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-end">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span>並び替え:</span>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "desc" | "asc")}
                className="border px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="desc">登録が新しい順</option>
                <option value="asc">登録が古い順</option>
              </select>
            </div>

            <button
              type="button"
              onClick={fetchUsers}
              className="bg-white border px-4 py-1.5 rounded-lg shadow-sm text-sm font-medium hover:bg-gray-50"
            >
              更新
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">登録ユーザー一覧 ({filteredUsers.length}名)</h2>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">読み込み中...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">該当するユーザーがいません</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50 border-b text-gray-600 text-sm">
                  <th className="p-4">名前 / フリガナ</th>
                  <th className="p-4">生年月日</th>
                  <th className="p-4">電話番号</th>
                  <th className="p-4">メールアドレス</th>
                  <th className="p-4">住所</th>
                  <th className="p-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-bold text-gray-800">{u.name || "未設定"}</div>
                      <div className="text-xs text-gray-500">{u.furigana || ""}</div>
                    </td>
                    <td className="p-4 text-gray-600">{u.birthdate || "未登録"}</td>
                    <td className="p-4 text-gray-600">{u.phone || "未登録"}</td>
                    <td className="p-4 text-gray-600">{u.email || "未登録"}</td>
                    <td className="p-4 text-gray-600 max-w-xs truncate" title={u.address}>
                      {u.address || "未登録"}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u.id, u.name)}
                        className="text-red-500 hover:text-red-700 text-xs font-bold border border-red-200 px-3 py-1 rounded transition hover:bg-red-50"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}