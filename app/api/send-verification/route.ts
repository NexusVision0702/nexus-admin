import { NextResponse } from 'next/server';
import { docClient, TEMP_USERS_TABLE } from '@/lib/dynamodb';
import { GetCommand, DeleteCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

// 本登録用のテーブル名（NexusVisionUsers）
const USERS_TABLE = "NexusVisionUsers";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    // メールリンクから渡される email を取得
    const email = url.searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'メールアドレスが指定されていません。' }, { status: 400 });
    }

    // 1. NexusTempUsers から email をキーにして一時データを取得
    const getCommand = new GetCommand({
      TableName: TEMP_USERS_TABLE,
      Key: { email: email },
    });

    const { Item: tempUser } = await docClient.send(getCommand);

    if (!tempUser) {
      return NextResponse.json({ error: '無効な認証リンクであるか、すでに有効期限が切れています。' }, { status: 400 });
    }

    // 有効期限のチェック（10分超過など）
    if (tempUser.expiresAt && Date.now() > tempUser.expiresAt) {
      await docClient.send(new DeleteCommand({
        TableName: TEMP_USERS_TABLE,
        Key: { email: email },
      }));
      return NextResponse.json({ error: '認証の有効期限が切れています。' }, { status: 400 });
    }

    const userData = tempUser.userData || {};
    const { password, name, furigana, birthdate, phone, address } = userData;

    // 2. 本登録テーブル (NexusVisionUsers) へデータを保存
    const putCommand = new PutCommand({
      TableName: USERS_TABLE,
      Item: {
        email: email, // パーティションキー
        name: name || '',
        furigana: furigana || '',
        birthdate: birthdate || '',
        phone: phone || '',
        address: address || '',
        password: password || '',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    await docClient.send(putCommand);

    // 3. 一時データ (NexusTempUsers) を削除
    await docClient.send(new DeleteCommand({
      TableName: TEMP_USERS_TABLE,
      Key: { email: email },
    }));

    // 4. 登録完了画面（/?verified=true）へリダイレクト
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || url.origin;
    return NextResponse.redirect(`${baseUrl}/?verified=true`);

  } catch (error: any) {
    console.error('本登録エラー:', error);
    return NextResponse.json({ error: '本登録の処理中にエラーが発生しました。' }, { status: 500 });
  }
}