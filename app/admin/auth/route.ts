import { NextResponse } from 'next/server';
import { docClient, USERS_TABLE } from '@/lib/dynamodb';
import { QueryCommand, UpdateCommand, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { sendRegistrationEmail } from '@/lib/email';

// 1. ログイン試行（社員番号チェック ＆ MFAコード生成・メール送信）
export async function POST(request: Request) {
  try {
    const { empId, password, step, email: verifyEmail, code: inputCode } = await request.json();

    // --- ステップ2: MFAコードの検証処理 ---
    if (step === 'verify') {
      const getCmd = new GetCommand({
        TableName: USERS_TABLE,
        Key: { email: verifyEmail },
      });
      const result = await docClient.send(getCmd);
      const user = result.Item;

      if (!user || user.mfaCode !== inputCode) {
        return NextResponse.json({ error: '認証コードが間違っています。' }, { status: 400 });
      }

      if (user.mfaExpiresAt && Date.now() > user.mfaExpiresAt) {
        return NextResponse.json({ error: '認証コードの有効期限が切れています。' }, { status: 400 });
      }

      // コード確認成功：使用済みコードをクリア
      const updateCmd = new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { email: verifyEmail },
        UpdateExpression: 'SET mfaCode = :nullCode, mfaExpiresAt = :nullExp',
        ExpressionAttributeValues: {
          ':nullCode': null,
          ':nullExp': null,
        },
      });
      await docClient.send(updateCmd);

      return NextResponse.json({ success: true, message: '認証成功しました。' });
    }

    // --- ステップ1: 初回ログイン（社員番号＆パスワード検証） ---
    if (!empId || !password) {
      return NextResponse.json({ error: '社員番号とパスワードを入力してください。' }, { status: 400 });
    }

    // DynamoDBからemp_idでユーザーを検索
    const queryCmd = new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: 'emp_id-index', // ※もしインデックスがない場合はScanにするかインデックスを作成してください
      KeyConditionExpression: 'emp_id = :empId',
      ExpressionAttributeValues: { ':empId': empId.trim() },
    });

    let adminUser: any = null;
    try {
      const queryRes = await docClient.send(queryCmd);
      if (queryRes.Items && queryRes.Items.length > 0) {
        adminUser = queryRes.Items[0];
      }
    } catch (e) {
      // インデックスが無い環境向けに全件スキャンでフォールバック
      const scanRes = await docClient.send(new ScanCommand({ TableName: USERS_TABLE }));
      adminUser = scanRes.Items?.find((item: any) => item.emp_id === empId.trim());
    }

    if (!adminUser) {
      return NextResponse.json({ error: '社員番号が見つかりません。' }, { status: 400 });
    }

    // パスワードの確認
    if (adminUser.password !== password) {
      return NextResponse.json({ error: 'パスワードが正しくありません。' }, { status: 400 });
    }

    const email = adminUser.email;
    if (!email) {
      return NextResponse.json({ error: 'この社員番号にメールアドレスが紐付いていません。' }, { status: 400 });
    }

    // 6桁の認証コード生成（有効期限5分）
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000;

    // DynamoDBにMFAコードを一時保存
    const updateCmd = new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { email: email },
      UpdateExpression: 'SET mfaCode = :code, mfaExpiresAt = :expiresAt',
      ExpressionAttributeValues: {
        ':code': code,
        ':expiresAt': expiresAt,
      },
    });
    await docClient.send(updateCmd);

    // ResendでMFAコードメールを送信
    await sendRegistrationEmail(
      email,
      adminUser.name || '管理者',
      `認証コード: ${code} (有効期限: 5分)`
    );

    return NextResponse.json({
      success: true,
      email,
      message: '認証コードを送信しました。',
    });

  } catch (error: any) {
    console.error('管理者認証APIエラー:', error);
    return NextResponse.json({ error: '認証処理中にエラーが発生しました: ' + (error.message || '') }, { status: 500 });
  }
}