import { NextResponse } from "next/server";
import { docClient, TEMP_USERS_TABLE } from "@/lib/dynamodb";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { sendMfaEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "メールアドレスが指定されていません。" }, { status: 400 });
    }

    // 6桁のランダムな認証コードを生成
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 有効期限を15分（900秒後）に設定（秒単位）
    const expiresAt = Math.floor(Date.now() / 1000) + 900;

    // NexusTempUsers テーブルにコードと有効期限を保存
    await docClient.send(
      new PutCommand({
        TableName: TEMP_USERS_TABLE,
        Item: {
          email: email, // パーティションキー
          code: code,
          expiresAt: expiresAt,
        },
      })
    );

    // Resend を使って実際にメールを送信
    await sendMfaEmail(email, code);

    return NextResponse.json({ success: true, message: "認証コードを送信しました。" });
  } catch (err: any) {
    console.error("MFA送信エラー:", err);
    return NextResponse.json({ error: err.message || "内部サーバーエラー" }, { status: 500 });
  }
}