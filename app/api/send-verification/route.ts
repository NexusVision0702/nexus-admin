import { NextResponse } from 'next/server';
import { sendRegistrationEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    
    if (!body) {
      return NextResponse.json(
        { error: 'リクエストのデータ形式が不正です。' },
        { status: 400 }
      );
    }

    const { email, verificationUrl, name } = body;

    if (!email || !verificationUrl) {
      return NextResponse.json(
        { error: '必須パラメータ（emailまたはverificationUrl）が不足しています。' },
        { status: 400 }
      );
    }

    // メール送信関数の実行
    await sendRegistrationEmail(email, name || 'お客様', verificationUrl);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('メール送信APIエラー詳細:', error);
    
    // エラーメッセージを確実にJSONとして返す
    const errorMessage = error?.message || '不明なサーバーエラーが発生しました。';
    return NextResponse.json(
      { error: 'メールの送信に失敗しました: ' + errorMessage },
      { status: 500 }
    );
  }
}