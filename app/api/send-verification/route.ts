import { NextResponse } from 'next/server';
import { docClient, TEMP_USERS_TABLE, USERS_TABLE } from '@/lib/dynamodb';
import { QueryCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { sendRegistrationEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 受信したデータをサーバーのログに出力
    console.log('【受信したリクエストボディ全データ】:', JSON.stringify(body, null, 2));

    // フロントエンド側でどのようなキー名で送られてきても絶対に値を取り逃がさないようにする
    const email = body.email || body.mail || body.userEmail || body.userData?.email;
    const password = body.password || body.pass || body.pwd || body.userPassword || body.userData?.password;
    
    const name = body.name || body.userName || body.fullName || body.userData?.name ||
      (body.lastName && body.firstName ? `${body.lastName} ${body.firstName}` : '') ||
      (body.sei && body.mei ? `${body.sei} ${body.mei}` : '') ||
      (body.kanjiLastName && body.kanjiFirstName ? `${body.kanjiLastName} ${body.kanjiFirstName}` : '');

    const phone = body.phone || body.tel || body.phoneNumber || body.mobile || body.userData?.phone;

    // 必須項目のチェック
    if (!email) {
      return NextResponse.json({ error: 'メールアドレスが不足しています。' }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: 'パスワードが不足しています。' }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: 'お名前が不足しています。' }, { status: 400 });
    }
    if (!phone) {
      return NextResponse.json({ error: '電話番号が不足しています。' }, { status: 400 });
    }

    // 重複チェック: 本登録テーブル (NexusVisionUsers) ですでに email または phone が使われていないか確認
    const emailCheck = await docClient.send(new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email },
    }));

    if (emailCheck.Items && emailCheck.Items.length > 0) {
      return NextResponse.json({ error: 'このメールアドレスはすでに本登録されています。' }, { status: 400 });
    }

    const phoneCheck = await docClient.send(new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: 'phone-index',
      KeyConditionExpression: 'phone = :phone',
      ExpressionAttributeValues: { ':phone': phone },
    }));

    if (phoneCheck.Items && phoneCheck.Items.length > 0) {
      return NextResponse.json({ error: 'この電話番号はすでに本登録されています。' }, { status: 400 });
    }

    // テスト時に仮登録データが残っていて進めなくならないよう、既存の仮登録データは自動でクリアして上書き許可する
    await docClient.send(new DeleteCommand({
      TableName: TEMP_USERS_TABLE,
      Key: { email: email },
    })).catch(() => {});

    // 有効期限（15分後：秒単位）
    const expiresAt = Math.floor(Date.now() / 1000) + 15 * 60;

    // 一時データテーブル (NexusTempUsers) に保存
    const putCommand = new PutCommand({
      TableName: TEMP_USERS_TABLE,
      Item: {
        email: email,
        expiresAt: expiresAt,
        userData: {
          ...body,
          email,
          password,
          name,
          phone,
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