import { NextResponse, NextRequest } from 'next/server';
import { sendMfaEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json({ error: 'メールアドレスとコードは必須です。' }, { status: 400 });
    }

    await sendMfaEmail(email, code);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('MFA API エラー:', err);
    return NextResponse.json({ error: err.message || '内部サーバーエラーが発生しました。' }, { status: 500 });
  }
}