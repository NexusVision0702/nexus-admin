import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const uid = url.searchParams.get('uid');

    if (!uid) {
      return NextResponse.json({ error: 'ユーザーIDが指定されていません。' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const adminAuth = getAdminAuth();

    // 1. 一時データ (tempUsers) からデータを取得
    const tempUserRef = adminDb.collection('tempUsers').doc(uid);
    const tempUserDoc = await tempUserRef.get();

    if (!tempUserDoc.exists) {
      return NextResponse.json({ error: '無効な認証リンクであるか、すでに有効期限が切れています。' }, { status: 400 });
    }

    const userData = tempUserDoc.data();
    if (!userData) {
      return NextResponse.json({ error: 'ユーザーデータが見つかりません。' }, { status: 400 });
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
      password: password || '', // ← ここでパスワードを確実に保存
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    // 4. 一時データ (tempUsers) を削除
    await tempUserRef.delete();

    // 5. 登録完了画面（/?verified=true）へリダイレクト
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || url.origin;
    return NextResponse.redirect(`${baseUrl}/?verified=true`);

  } catch (error: any) {
    console.error('本登録エラー:', error);
    return NextResponse.json({ error: '本登録の処理中にエラーが発生しました。' }, { status: 500 });
  }
}