import { Resend } from 'resend';

export async function sendMfaEmail(toEmail: string, code: string) {
  const resend = new Resend(process.env.RESEND_API_KEY as string);
  
  try {
    const { error } = await resend.emails.send({
      from: 'NexusVision <support@Nexus-vision.net>',
      to: [toEmail],
      subject: '【NexusVision】管理者ログイン 認証コード',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #16a34a;">NexusVision 管理ダッシュボード</h2>
          <p>管理者ログインの二段階認証コードが発行されました。</p>
          <p>以下の6桁のコードをログイン画面に入力してください。</p>
          <div style="background: #f3f4f6; padding: 15px; font-size: 24px; font-weight: bold; letter-spacing: 5px; text-align: center; margin: 20px 0; border-radius: 8px;">
            ${code}
          </div>
          <p style="font-size: 12px; color: #666;">※このコードの有効期限は15分です。心当たりがない場合は、このメールを無視してください。</p>
        </div>
      `,
    });

    if (error) {
      console.error('Resendメール送信エラー:', error);
      throw new Error(error.message);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Resendメール送信例外:', err);
    throw new Error('メールの送信に失敗しました: ' + (err.message || ''));
  }
}

export async function sendRegistrationEmail(toEmail: string, name: string, verificationUrl: string) {
  const resend = new Resend(process.env.RESEND_API_KEY as string);

  try {
    const { error } = await resend.emails.send({
      from: 'NexusVision株式会社 <support@Nexus-vision.net>',
      to: [toEmail],
      subject: '【NexusVision】会員登録の確認（メールアドレス認証）',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #2563eb;">NexusVision株式会社 新規会員登録</h2>
          <p>${name} 様</p>
          <p>ご登録ありがとうございます。以下のボタンをクリックして、メールアドレスの認証と本登録を完了させてください。</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">メールアドレスを認証して本登録を完了する</a>
          </div>
          <p style="font-size: 14px; color: #555;">ボタンがクリックできない場合は、以下のURLをブラウザに貼り付けてください。</p>
          <p style="font-size: 12px; color: #666; word-break: break-all;">${verificationUrl}</p>
          <p style="margin-top: 30px; font-size: 12px; color: #666;">※心当たりがない場合は、このメールを破棄してください。</p>
        </div>
      `,
    });

    if (error) {
      console.error('Resendメール送信エラー:', error);
      throw new Error(error.message);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Resendメール送信例外:', err);
    throw new Error('確認メールの送信に失敗しました: ' + (err.message || ''));
  }
}