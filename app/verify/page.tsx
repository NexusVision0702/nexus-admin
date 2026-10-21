"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const uid = searchParams.get("uid");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const processVerification = async () => {
      if (!uid) {
        setStatus("error");
        setErrorMessage("ユーザーIDが指定されていません。");
        return;
      }

      try {
        // 1. 一時データ (tempUsers) を取得
        const tempRef = doc(db, "tempUsers", uid);
        const tempSnap = await getDoc(tempRef);

        if (!tempSnap.exists()) {
          setStatus("error");
          setErrorMessage("無効な認証リンクであるか、すでに有効期限が切れています。");
          return;
        }

        const userData = tempSnap.data();
        const { email, password, name, lastName, firstName, lastNameKana, firstNameKana, furigana, birthdate, phone, address, emp_id } = userData;

        // 2. Firebase Auth に本番ユーザーを作成 (クライアント側SDKを使用)
        let targetUid = uid;
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          targetUid = userCredential.user.uid;
        } catch (authErr: any) {
          // すでにアカウントが存在する場合などはそのまま進める
          console.warn("Auth作成スキップまたは既存:", authErr);
        }

        // 3. 正式なコレクションに保存 (admins または users)
        if (emp_id) {
          await setDoc(doc(db, "admins", targetUid), {
            uid: targetUid,
            emp_id: emp_id || "",
            email: email,
            name: name || "",
            createdAt: serverTimestamp(),
          });
        } else {
          await setDoc(doc(db, "users", targetUid), {
            uid: targetUid,
            lastName: lastName || "",
            firstName: firstName || "",
            name: name || "",
            lastNameKana: lastNameKana || "",
            firstNameKana: firstNameKana || "",
            furigana: furigana || "",
            birthdate: birthdate || "",
            phone: phone || "",
            email: email,
            password: password || "", // ← パスワードを確実に保存
            address: address || "",
            emailVerified: true,
            createdAt: serverTimestamp(),
          });
        }

        // 4. 一時データを削除
        await deleteDoc(tempRef);

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
  }, [uid, router]);

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