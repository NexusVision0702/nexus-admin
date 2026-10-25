import { NextResponse } from 'next/server';
import { docClient, TEMP_USERS_TABLE, USERS_TABLE } from '@/lib/dynamodb';
import { QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { sendRegistrationEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name, furigana, birthdate, phone, address } = body;

    if (!email || !password || !name || !phone) {
      return NextResponse.json({ error: '必須項目が不足しています。' }, { status: 400 });
    }

    // 重複チェック: 本登録テーブル (NexusVisionUsers) ですでに email または phone が使われていないか確認
    const emailCheck = await docClient.send(new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email },
    }));

    if (emailCheck.Items && emailCheck.Items.length > 0) {
      return NextResponse.json({ error: 'このメールアドレスはすでに登録されています。' }, { status: 400 });
    }

    const phoneCheck = await docClient.send(new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: 'phone-index',
      KeyConditionExpression: 'phone = :phone',
      ExpressionAttributeValues: { ':phone': phone },
    }));

    if (phoneCheck.Items && phoneCheck.Items.length > 0) {
      return NextResponse.json({ error: 'この電話番号はすでに登録されています。' }, { status: 400 });
    }

    // 有効期限（15分後：秒単位）
    const expiresAt = Math.floor(Date.now() / 1000) + 15 * 60;

    // 一時データテーブル (NexusTempUsers) に保存
    const putCommand = new PutCommand({
      TableName: TEMP_USERS_TABLE,
      Item: {
        email: email,
        expiresAt: expiresAt,
        userData: {
          password,
          name,
          furigana,
          birthdate,
          phone,
          address,
        },
      },
    });

    await docClient.send(putCommand);

    // 認証リンクの生成
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://account.nexus-vision.net';
    const verificationUrl = `${baseUrl}/api/verify?email=${encodeURIComponent(email)}`;

    // 確認メールの送信
    await sendRegistrationEmail(email, name, verificationUrl);

    return NextResponse.json({ success: true, message: '確認メールを送信しました。' });

  } catch (error: any) {
    console.error('確認メール送信エラー:', error);
    return NextResponse.json({ error: '確認メールの送信に失敗しました: ' + (error.message || '') }, { status: 500 });
  }
}