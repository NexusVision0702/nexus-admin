import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ uid?: string }>;
}) {
  const params = await searchParams;
  const uid = params.uid;

  if (!uid) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center bg-white py-10 px-6 shadow sm:rounded-lg">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">認証エラー</h2>
          <p className="text-sm text-red-600">ユーザーIDが指定されていません。</p>
        </div>
      </div>
    );
  }

  try {
    const adminDb = getAdminDb();
    const adminAuth = getAdminAuth();

    // 1. 一時データ (tempUsers) からデータを取得
    const tempUserRef = adminDb.collection('tempUsers').doc(uid);
    const tempUserDoc = await tempUserRef.get();

    if (!tempUserDoc.exists) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md text-center bg-white py-10 px-6 shadow sm:rounded-lg">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">認証エラー</h2>
            <p className="text-sm text-red-600">無効な認証リンクであるか、すでに有効期限が切れています。</p>
          </div>
        </div>
      );
    }

    const userData = tempUserDoc.data();
    if (!userData) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md text-center bg-white py-10 px-6 shadow sm:rounded-lg">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">認証エラー</h2>
            <p className="text-sm text-red-600">ユーザーデータが見つかりません。</p>
          </div>
        </div>
      );
    }

    const { email, password, name, furigana, birthdate, phone, address } = userData;

    // 2. Firebase Auth に本番ユーザーを作成
    let userRecord;
    try {
      userRecord = await adminAuth.createUser({
        email: email,
        password: password,
        displayName: name || '',
      });
    } catch (authError: any) {
      console.error('Auth作成エラー:', authError);
    }

    const targetUid = userRecord ? userRecord.uid : uid;

    // 3. 登録データを `users` コレクションに正式保存（パスワード含む）
    await adminDb.collection('users').doc(targetUid).set({
      uid: targetUid,
      name: name || '',
      furigana: furigana || '',
      birthdate: birthdate || '',
      phone: phone || '',
      address: address || '',
      email: email,
      password: password || '', // ← パスワードを正しく保存
      status: 'pending', // 審査待ちステータス
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 4. 一時データ (tempUsers) を削除
    await tempUserRef.delete();
    // 5. 成功画面を表示
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center bg-white py-10 px-6 shadow sm:rounded-lg">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl font-bold mb-4">
            ✓
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">登録が完了しました</h2>
          <p className="text-sm text-gray-600">メールアドレスの認証と本登録が完了しました。マイページまたは管理画面からログインしてください。</p>
        </div>
      </div>
    );

  } catch (error: any) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center bg-white py-10 px-6 shadow sm:rounded-lg">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">認証エラー</h2>
          <p className="text-sm text-red-600">本登録の処理中にエラーが発生しました: {error.message || String(error)}</p>
        </div>
      </div>
    );
  }
}