import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const { uid } = await request.json();

    if (!uid) {
      return NextResponse.json({ error: 'UIDが指定されていません。' }, { status: 400 });
    }

    // 1. Firebase Authentication からアカウントを削除
    try {
      await adminAuth.deleteUser(uid);
    } catch (authError: any) {
      console.warn('Firebase Authでの削除スキップまたはエラー:', authError.message);
    }

    // 2. Firestore などのデータベース側からデータを削除（必要に応じてコレクション名を調整）
    await adminDb.collection('users').doc(uid).delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('ユーザー削除エラー:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}