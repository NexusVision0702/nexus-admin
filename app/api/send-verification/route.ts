import { NextResponse } from 'next/server';
import { sendRegistrationEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const { email, verificationUrl, name } = await request.json();

    if (!email || !verificationUrl) {
      return NextResponse.json({ error: '必須パラメータが不足しています。' }, { status: 400 });
    }

    await sendRegistrationEmail(email, name || 'お客様', verificationUrl);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('メール送信エラー:', error);
    return NextResponse.json({ error: 'メールの送信に失敗しました: ' + (error.message || '') }, { status: 500 });
  }
}