import { NextResponse } from 'next/server';
import { docClient, TEMP_USERS_TABLE, USERS_TABLE } from '@/lib/dynamodb';
import { GetCommand, DeleteCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'メールアドレスが指定されていません。' }, { status: 400 });
    }

    // 1. 一時保存テーブルからデータを取得
    const getCommand = new GetCommand({
      TableName: TEMP_USERS_TABLE,
      Key: { email: email },
    });

    const { Item: tempUser } = await docClient.send(getCommand);

    if (!tempUser) {
      return NextResponse.json({ error: '無効な認証リンクであるか、すでに有効期限が切れています。' }, { status: 400 });
    }

    // 有効期限チェック
    const nowSec = Math.floor(Date.now() / 1000);
    if (tempUser.expiresAt && nowSec > tempUser.expiresAt) {
      await docClient.send(new DeleteCommand({
        TableName: TEMP_USERS_TABLE,
        Key: { email: email },
      }));
      return NextResponse.json({ error: '認証の有効期限が切れています。' }, { status: 400 });
    }

    const userData = tempUser.userData || {};
    const { password, name, furigana, birthdate, phone, address } = userData;

    // 2. 本登録テーブルへ保存（statusを 'active' にしてログイン可能にする）
    const putCommand = new PutCommand({
      TableName: USERS_TABLE,
      Item: {
        email: email,
        name: name || '',
        furigana: furigana || '',
        birthdate: birthdate || '',
        phone: phone || '',
        address: address || '',
        password: password || '',
        status: 'active', // ← これでログインできるようになります！
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    await docClient.send(putCommand);

    // 3. 一時データを削除
    await docClient.send(new DeleteCommand({
      TableName: TEMP_USERS_TABLE,
      Key: { email: email },
    }));

    return NextResponse.json({ success: true, message: '本登録が完了しました。' });

  } catch (error: any) {
    console.error('本登録エラー:', error);
    return NextResponse.json({ error: '本登録の処理中にエラーが発生しました。' }, { status: 500 });
  }
}