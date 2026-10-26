import { NextResponse } from 'next/server';
import { docClient, USERS_TABLE } from '@/lib/dynamodb';
import { ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

// ユーザー一覧の取得 (GET)
export async function GET() {
  try {
    const command = new ScanCommand({
      TableName: USERS_TABLE,
    });

    const response = await docClient.send(command);
    const users = response.Items || [];

    // 作成日時順（createdAt）でソート（新しい順）
    users.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    console.error('ユーザー取得エラー:', error);
    return NextResponse.json({ error: 'ユーザーの取得に失敗しました。' }, { status: 500 });
  }
}

// ユーザーの削除 (DELETE)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email'); // DynamoDBのプライマリキーがemailの場合

    if (!email) {
      return NextResponse.json({ error: 'メールアドレス（ID）が指定されていません。' }, { status: 400 });
    }

    const command = new DeleteCommand({
      TableName: USERS_TABLE,
      Key: { email: email },
    });

    await docClient.send(command);

    return NextResponse.json({ success: true, message: 'ユーザーを削除しました。' });
  } catch (error: any) {
    console.error('ユーザー削除エラー:', error);
    return NextResponse.json({ error: '削除に失敗しました。' }, { status: 500 });
  }
}