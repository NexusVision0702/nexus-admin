import { NextResponse } from 'next/server';
import { docClient, USERS_TABLE } from '@/lib/dynamodb';
import { DeleteCommand } from '@aws-sdk/lib-dynamodb';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'メールアドレスが指定されていません。' }, { status: 400 });
    }

    // DynamoDB (NexusVisionUsers) からデータを削除
    const deleteCommand = new DeleteCommand({
      TableName: USERS_TABLE,
      Key: { email: email },
    });

    await docClient.send(deleteCommand);

    return NextResponse.json({ success: true, message: 'ユーザーを削除しました。' });
  } catch (error: any) {
    console.error('ユーザー削除エラー:', error);
    return NextResponse.json({ error: 'ユーザーの削除に失敗しました: ' + (error.message || '') }, { status: 500 });
  }
}