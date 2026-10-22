"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { docClient, TEMP_USERS_TABLE } from "@/lib/dynamodb";
import { QueryCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

function SignupFormContent() {
  const searchParams = useSearchParams();
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (searchParams.get("verified") === "true") {
      setIsVerified(true);
    }
  }, [searchParams]);

  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastNameKana, setLastNameKana] = useState("");
  const [firstNameKana, setFirstNameKana] = useState("");

  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [gender, setGender] = useState("");
  
  const [phone, setPhone] = useState("");
  
  const [postalCode, setPostalCode] = useState("");
  const [prefecture, setPrefecture] = useState("");
  const [city, setCity] = useState("");
  const [street, setStreet] = useState("");
  const [building, setBuilding] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // 各種同意・確認チェックボックス用のステート
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [notMinor, setNotMinor] = useState(false);
  const [notAntiSocial, setNotAntiSocial] = useState(false);

  // 規約を開いたかどうかを判定するステート
  const [hasOpenedTerms, setHasOpenedTerms] = useState(false);

  // モーダル用ステート
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<"form" | "confirm" | "sent">("form");

  const birthdateDisplay = birthYear && birthMonth && birthDay ? `${birthYear}年${birthMonth}月${birthDay}日` : "";

  // フォーム全体のバリデーション（3つのチェックボックスすべて ＋ 規約を開いていることが必須）
  const isFormValid = 
    lastName.trim() !== "" &&
    firstName.trim() !== "" &&
    lastNameKana.trim() !== "" &&
    firstNameKana.trim() !== "" &&
    birthYear !== "" &&
    birthMonth !== "" &&
    birthDay !== "" &&
    gender !== "" &&
    phone.trim() !== "" &&
    postalCode.trim() !== "" &&
    prefecture.trim() !== "" &&
    city.trim() !== "" &&
    street.trim() !== "" &&
    email.trim() !== "" &&
    password.length >= 6 &&
    agreedTerms &&
    notMinor &&
    notAntiSocial &&
    hasOpenedTerms;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9]/g, "");
    if (value.length > 3 && value.length <= 7) {
      value = value.slice(0, 3) + "-" + value.slice(3);
    } else if (value.length > 7) {
      value = value.slice(0, 3) + "-" + value.slice(3, 7) + "-" + value.slice(7, 11);
    }
    setPhone(value);
  };

  const handlePostalCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9]/g, "");
    if (value.length > 7) value = value.slice(0, 7);
    
    let formattedPostal = value;
    if (value.length > 3) {
      formattedPostal = value.slice(0, 3) + "-" + value.slice(3);
    }
    setPostalCode(formattedPostal);

    if (value.length === 7) {
      try {
        const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${value}`);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const result = data.results[0];
          setPrefecture(result.address1);
          setCity(result.address2 + result.address3);
        }
      } catch (err) {
        console.error("住所自動取得エラー:", err);
      }
    }
  };

  // 規約リンクがクリックされたときの処理
  const handleOpenTermsModal = () => {
    setHasOpenedTerms(true);
    setIsModalOpen(true);
  };

  const handleGoToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setError("");
    setStep("confirm");
  };

  // ==========================================================
  // AWS DynamoDB を用いた登録処理（重複チェック ＋ データ保存）
  // ==========================================================
  const handleExecuteSignup = async () => {
    setError("");
    setIsSubmitting(true);

    try {
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedPhone = phone.trim();

      // 1. メールアドレスの重複チェック（インデックス利用・カウント取得でコスト最小化）
      const emailQuery = new QueryCommand({
        TableName: TEMP_USERS_TABLE,
        IndexName: "email-index",
        KeyConditionExpression: "email = :email",
        ExpressionAttributeValues: {
          ":email": trimmedEmail,
        },
        Select: "COUNT",
      });
      const emailResult = await docClient.send(emailQuery);
      if (emailResult.Count && emailResult.Count > 0) {
        throw new Error("このメールアドレスはすでに登録（または仮登録）されています。");
      }

      // 2. 電話番号の重複チェック（インデックス利用・カウント取得でコスト最小化）
      const phoneQuery = new QueryCommand({
        TableName: TEMP_USERS_TABLE,
        IndexName: "phone-index",
        KeyConditionExpression: "phone = :phone",
        ExpressionAttributeValues: {
          ":phone": trimmedPhone,
        },
        Select: "COUNT",
      });
      const phoneResult = await docClient.send(phoneQuery);
      if (phoneResult.Count && phoneResult.Count > 0) {
        throw new Error("この電話番号はすでに登録（または仮登録）されています。");
      }

      // 3. データ整形と保存用UIDの生成
      const fullName = `${lastName.trim()} ${firstName.trim()}`;
      const fullNameKana = `${lastNameKana.trim()} ${firstNameKana.trim()}`;
      const fullAddress = `〒${postalCode} ${prefecture}${city}${street} ${building}`.trim();
      const tempUid = "user_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

      // 4. DynamoDB へのデータ保存 (PutCommand)
      const putCommand = new PutCommand({
        TableName: TEMP_USERS_TABLE,
        Item: {
          uid: tempUid,
          lastName: lastName.trim(),
          firstName: firstName.trim(),
          name: fullName,
          lastNameKana: lastNameKana.trim(),
          firstNameKana: firstNameKana.trim(),
          furigana: fullNameKana,
          birthdate: birthdateDisplay,
          gender: gender,
          phone: trimmedPhone,
          email: trimmedEmail,
          password: password,
          postalCode: postalCode,
          prefecture: prefecture,
          city: city,
          street: street,
          building: building,
          address: fullAddress,
          createdAt: new Date().toISOString(),
        },
      });

      await docClient.send(putCommand);

      // 5. 認証メール送信APIの呼び出し
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
      const verificationUrl = `${baseUrl}/verify?uid=${tempUid}`;

      const response = await fetch("/api/send-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: trimmedEmail,
          verificationUrl: verificationUrl,
          name: fullName,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "認証メールの送信に失敗しました。");
      }

      setStep("sent");
    } catch (err: any) {
      console.error("AWS登録エラー:", err);
      setError("登録処理に失敗しました: " + (err.message || "入力内容をご確認ください。"));
      setStep("form");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fullAddressDisplay = `〒${postalCode} ${prefecture}${city}${street} ${building}`.trim();

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  if (isVerified) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8" translate="no">
        <div className="max-w-2xl w-full space-y-8 text-center">
          <div className="flex justify-center mb-6">
            <img src="/logo.png" alt="NexusVision株式会社" className="h-28 w-auto object-contain" />
          </div>
          
          <div className="bg-emerald-600 text-white p-10 rounded-2xl shadow-2xl flex flex-col items-center space-y-4 border border-emerald-500">
            <div className="space-y-3 text-center">
              <h2 className="text-3xl font-extrabold tracking-wide">登録が完了しました！</h2>
              <p className="text-emerald-100 text-base leading-relaxed">
                メールアドレスの認証と本登録が正常に完了しました。<br />
                ご利用のサービスに戻りログインしてください。
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "sent") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8" translate="no">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="flex justify-center mb-6">
            <img src="/logo.png" alt="NexusVision株式会社" className="h-28 w-auto object-contain" />
          </div>
          <div className="bg-white py-10 px-6 shadow sm:rounded-lg sm:px-10 border-t-4 border-emerald-600 text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl font-bold">
              ✉️
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900">
              認証メールを送信しました
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              ご入力いただいたメールアドレス（<span className="font-bold text-gray-800">{email}</span>）宛に確認メールを送信しました。<br /><br />
              メール内に記載されている認証URLをクリックしていただくと、本登録が完了します。
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8" translate="no">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="flex justify-center mb-6">
            <img src="/logo.png" alt="NexusVision株式会社" className="h-28 w-auto object-contain" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">
            ご入力内容の確認
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            以下の内容に誤りがないかご確認ください。
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
          <div className="bg-white py-8 px-6 shadow sm:rounded-lg sm:px-10 border-t-4 border-emerald-600 space-y-4">
            {error && <div className="mb-4 bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>}

            <div className="border-b pb-3">
              <span className="block text-xs font-medium text-gray-400">お名前 (漢字)</span>
              <span className="text-sm font-bold text-gray-800">{lastName} {firstName}</span>
            </div>

            <div className="border-b pb-3">
              <span className="block text-xs font-medium text-gray-400">フリガナ</span>
              <span className="text-sm font-bold text-gray-800">{lastNameKana} {firstNameKana}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 border-b pb-3">
              <div>
                <span className="block text-xs font-medium text-gray-400">生年月日</span>
                <span className="text-sm font-bold text-gray-800">{birthdateDisplay}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-gray-400">性別</span>
                <span className="text-sm font-bold text-gray-800">
                  {gender === "male" ? "男性" : gender === "female" ? "女性" : "回答不可"}
                </span>
              </div>
              <div>
                <span className="block text-xs font-medium text-gray-400">電話番号</span>
                <span className="text-sm font-bold text-gray-800">{phone}</span>
              </div>
            </div>

            <div className="border-b pb-3">
              <span className="block text-xs font-medium text-gray-400">ご住所</span>
              <span className="text-sm font-bold text-gray-800">{fullAddressDisplay}</span>
            </div>

            <div className="border-b pb-3">
              <span className="block text-xs font-medium text-gray-400">メールアドレス (ログインID)</span>
              <span className="text-sm font-bold text-gray-800">{email}</span>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => setStep("form")}
                className="w-1/2 py-2.5 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer"
              >
                修正する
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleExecuteSignup}
                className="w-1/2 py-2.5 px-4 border border-transparent rounded-md shadow-md text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? "送信中..." : "登録して認証メール送信"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8" translate="no">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-4">
          <img src="/logo.png" alt="NexusVision株式会社" className="h-28 w-auto object-contain" />
        </div>

        <h2 className="text-3xl font-extrabold text-gray-900">
          新規アカウント登録
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          NexusVision株式会社の<br />
          全サービスをご利用いただくための会員登録です。
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border-t-4 border-emerald-600">
          {error && <div className="mb-4 bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>}

          <form className="space-y-6" onSubmit={handleGoToConfirm}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">お名前 (漢字)</label>
              <div className="grid grid-cols-2 gap-4">
                <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="姓 (例: 山田)" className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm" />
                <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="名 (例: 太郎)" className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">フリガナ</label>
              <div className="grid grid-cols-2 gap-4">
                <input type="text" required value={lastNameKana} onChange={(e) => setLastNameKana(e.target.value)} placeholder="セイ (例: ヤマダ)" className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm" />
                <input type="text" required value={firstNameKana} onChange={(e) => setFirstNameKana(e.target.value)} placeholder="メイ (例: タロウ)" className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm" />
              </div>
            </div>

            {/* 生年月日 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">生年月日</label>
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-white"
                >
                  <option value="">年を選択</option>
                  {years.map((y) => (
                    <option key={y} value={y}>{y}年</option>
                  ))}
                </select>
                <select
                  value={birthMonth}
                  onChange={(e) => setBirthMonth(e.target.value)}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-white"
                >
                  <option value="">月を選択</option>
                  {months.map((m) => (
                    <option key={m} value={m}>{m}月</option>
                  ))}
                </select>
                <select
                  value={birthDay}
                  onChange={(e) => setBirthDay(e.target.value)}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-white"
                >
                  <option value="">日を選択</option>
                  {days.map((d) => (
                    <option key={d} value={d}>{d}日</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 性別 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">性別</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-white"
              >
                <option value="">選択してください</option>
                <option value="male">男性</option>
                <option value="female">女性</option>
                <option value="prefer_not_to_say">回答不可</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">電話番号 (自動ハイフン)</label>
              <div className="mt-1">
                <input type="tel" required value={phone} onChange={handlePhoneChange} placeholder="例: 090-1234-5678" maxLength={13} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm" />
              </div>
            </div>

            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <label className="block text-sm font-bold text-gray-800">ご住所</label>
              
              <div>
                <label className="block text-xs font-medium text-gray-600">郵便番号 (7桁入力で自動反映)</label>
                <div className="mt-1">
                  <input type="text" required value={postalCode} onChange={handlePostalCodeChange} placeholder="例: 9800021" maxLength={8} className="appearance-none block w-full sm:w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600">都道府県</label>
                  <input type="text" required value={prefecture} onChange={(e) => setPrefecture(e.target.value)} placeholder="自動入力" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">市区町村・町域</label>
                  <input type="text" required value={city} onChange={(e) => setCity(e.target.value)} placeholder="自動入力" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600">それ以降の住所 (番地など)</label>
                <input type="text" required value={street} onChange={(e) => setStreet(e.target.value)} placeholder="例: 中央1-1-1" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600">建物名・部屋番号 (任意)</label>
                <input type="text" value={building} onChange={(e) => setBuilding(e.target.value)} placeholder="例: 〇〇ビル 302号室" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス (ログインID)</label>
              <div className="mt-1">
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="例: sample@example.com" className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">パスワード (6文字以上)</label>
              <div className="mt-1">
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm" />
              </div>
            </div>

            {/* 各種同意・確認チェックボックス */}
            <div className="pt-2 space-y-3">
              {/* 1. 利用規約・プライバシーポリシー */}
              <label className={`flex items-start space-x-3 ${!hasOpenedTerms ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}>
                <input
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  disabled={!hasOpenedTerms}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                  required
                />
                <span className="text-sm text-gray-700 leading-relaxed">
                  <button
                    type="button"
                    onClick={handleOpenTermsModal}
                    className="text-emerald-600 underline hover:text-emerald-800 font-medium focus:outline-none cursor-pointer"
                  >
                    利用規約・プライバシーポリシー
                  </button>
                  に同意します
                  {!hasOpenedTerms && (
                    <span className="block text-xs text-amber-600 mt-0.5 font-bold">
                      ※先に上のリンクをクリックして規約内容をご確認ください
                    </span>
                  )}
                </span>
              </label>

              {/* 2. 未成年ではありません */}
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notMinor}
                  onChange={(e) => setNotMinor(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  required
                />
                <span className="text-sm text-gray-700 leading-relaxed">
                  わたしは未成年者ではありません
                  <span className="block text-xs text-gray-500 mt-0.5">
                    (未成年の場合：法定代理人の許可が取れています)
                  </span>
                </span>
              </label>

              {/* 3. 反社会的勢力ではないこと */}
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notAntiSocial}
                  onChange={(e) => setNotAntiSocial(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  required
                />
                <span className="text-sm text-gray-700 leading-relaxed">
                  暴力団等の反社会的勢力に該当せず、また将来にわたっても該当しないことを表明し、保証します
                </span>
              </label>
            </div>

            <div>
              <button
                type="submit"
                disabled={!isFormValid}
                className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-md text-sm font-bold text-white transition ${
                  isFormValid
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 cursor-pointer"
                    : "bg-gray-300 cursor-not-allowed opacity-70"
                }`}
              >
                入力内容を確認する
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 利用規約・プライバシーポリシー モーダルウィンドウ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">
                利用規約・プライバシーポリシー
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-4 overflow-y-auto text-sm text-gray-700 space-y-4 leading-relaxed whitespace-pre-line">
              {`◆利用規約◆
はじめに
１、NexusVision株式会社（以下「当社」といいます）は、当社が提供するアプリケーションおよび各種連携サービス（以下「本サービス」といいます）の利用条件について、以下のとおり利用規約（以下「本規約」といいます）を定めます。本サービスの利用を希望する者（以下「ユーザー」といいます）は、本規約に同意のうえご利用ください。
２、本規約の内容は、本サービスを利用するユーザーへの事前通知なしに必要に応じて変更することがありますので、本サービスをご利用の際には本サービス上に掲載されている最新の本規約をご確認ください。
３、当社が前項に基づき本規約の内容変更を行った後、ユーザーが本サービスを利用した場合は、本規約の内容変更を承諾したものとみなすものとします。

第1条（アカウント登録および共通利用）
ユーザーは本サービスの利用に先立って、本規約およびプライバシーポリシー（個人情報保護方針）に同意し、かつ必要事項を登録の上、会員登録（以下「アカウント登録」といいます）を行うものとします。
ユーザーは本規約を遵守することに同意し、本人確認のために当社の定める一定の情報を当社に提供することにより、本サービスのアカウント登録を行うものとします。ユーザーはアカウント登録にあたり、正確かつ最新の情報を当社に提供しなければなりません。アカウント登録後、ユーザー情報が正確かつ最新の情報でなかったことにより、ユーザー側が損害を被った場合でも、当社は責任を負いません。
登録されたアカウントは、当社が提供するサービスのほか、当社が指定する各種連携サービス（求人、飲食店、旅行先の検索・予約サービス等を含みますが、これらに限らず）を利用する際において共通のアカウントとして利用できるものとします。
登録情報に変更が生じた場合、ユーザーは当社の指定する方法（Webサイトまたはアプリ内の専用画面等）により、速やかに情報を更新しなければなりません。ユーザーが登録情報の変更を行わなかったことにより生じた損害やトラブルについて責任を負わないものとします。
未成年者がアカウント登録を行う場合は、必ず親権者等の法定代理人の同意を得た上で行うものとします。なお、未成年者が登録を完了した場合、法定代理人の同意を得ているものとみなします。
当社は、当社の基準に従い第１条の第１項に基づきユーザーのアカウント登録可否を判断し、当社が登録を認める場合にはユーザーへ通知を行い、アカウント登録を完了したものとします。ただし、ユーザーが以下のいずれかの事由に該当する場合は、登録および再登録を拒否することがあり、またその理由について一切開示義務を負いません。また、当社は、アカウント登録を拒否した場合でも、ユーザーに対して一切責任を負いません。
当社に登録したユーザー情報の内容に虚偽、または誤記、記入漏れ等があった場合
未成年者、成年後被後見人、被保佐人または被補助人のいずれかに該当し、法定代理人、後見人、保佐人または補助人の同意等を得ていなかった場合
反社会的勢力等（暴力団、または暴力団員など反社会勢力に準ずる者）であり、資金提供等を通じて反社会勢力等の運営に関与や協力、何かしらの交流を行っていると当社が判断した場合
ユーザーが過去に当社との契約で違反があった場合
その他、当社が登録を適当でないと判断した場合

第２条（アカウント情報および管理責任）
ユーザーは、自己の責任においてアカウントのログインIDおよびパスワードを管理するものとします。これを第三者に利用させ、譲渡、貸与、売買、共有等をすることはできません。
ユーザーのアカウントを利用して行われた一切の行為（管理不十分による紛失、使用上の過誤、第三者の使用等）は、当社に故意または重過失がない限り、当該アカウントを所有するユーザー本人の行為とみなします。これにより生じた損害に関する責任はユーザーが負うものとし、当社は責任を負いません。

第３条（位置情報サービスの利用）
当社が提供する各種連携サービス（求人、飲食店、旅行先の検索・予約サービス等を含む場合がありますが、これらに限らず）は、端末の位置情報等を利用して情報提供する機能を含みます。ユーザーが当該機能を利用する場合、端末の位置情報送信を許可するものとします。
位置情報の精度は、通信環境や端末の性能に依存するため、当社は取得された位置情報の完全性、正確性、即時性を保証するものではありません。
ユーザーは、端末の設定等により位置情報の送信をいつでも拒否または停止することができます。位置情報の取得を拒否した場合、または通信環境により位置情報が取得できない場合、本サービスの一部機能（現在地周辺の求人・店舗の表示等）が制限されることがあります。
当社による位置情報の取得、利用目的および取扱いに関する詳細は、当社が別途定める「プライバシーポリシー」に従うものとします。

第４条（禁止事項）
ユーザーは、当社のアカウント登録および本サービスの利用にあたり、以下の各号のいずれかに該当する行為、またはそのおそれがある行為を行ってはならないものとする。
（１）法令、公序良俗、または当社が定める各種規約・ガイドライン等に違反する行為
（２）虚偽、不確実または不適切な情報を登録、応募、予約、投稿等する行為
（３）他人になりすましてアカウントを登録、利用する行為
（４）１人のユーザーが複数アカウントを保有する行為または１つのアカウントを複数人で共同利用する行為
（５）利用・来店・就労等の意思がないにもかかわらず、本サービスへ応募、予約、問い合わせ等を行う行為
（６）店舗、施設、求人企業等の予約・応募等を正当な理由なく無断でキャンセルする行為
（７）本サービスを通じて得たポイント、クーポン、特典等を不正に取得、利用、または第三者に譲渡・転売する行為
（８）同業者による競合調査目的、スカウト目的、その他本サービスが本来意図する利用目的とは異なる目的で登録・利用する行為
（９）当社、他のユーザー、求人企業、加盟店その他第三者の知的財産権、プライバシー、名誉、信用その他の権利または利益を侵害する行為
（１０）当社、他のユーザー、求人企業、加盟店その他第三者に対する迷惑行為、不当な要求行為、詐欺行為、脅迫行為、または差別的・不快な言動を行う行為
（１１）本サービスのネットワーク、システム、データ等に不正アクセスする行為、またはBot・自動化ツール等を用いて不正に操作・データ収集（スクレイピング等）を行う行為
（１２）本サービスの運営、当社の事業活動、または他のユーザーによる利用を妨害する行為
（１３）反社会的勢力等への利益供与行為、またはこれらと関連する行為
（１４）その他、当社が不適切と判断する行為

第５条（アカウントの利用停止・削除）
１．当社は、ユーザーが以下の各号のいずれかに該当すると判断した場合、事前の通知または催告を要することなく、アカウントの利用停止、機能の制限、またはアカウントの削除（登録抹消）を行うことができるものとします。 
（１）本規約および当社が定める各種規約・ガイドラインのいずれかに違反した場合 
（２）第４条（禁止事項）に掲げる行為を行った場合、またはそのおそれがあると当社が判断した場合 
（３）登録情報、応募情報、予約情報等に虚偽、誤記または不正確な内容が含まれていることが判明した場合 
（４）第１条第６項各号の登録拒否事由のいずれかに該当することが判明した場合 
（５）店舗、施設、求人企業等の予約・応募後において、無断キャンセル、無断欠勤、直前の過度なキャンセル等を繰り返し行った場合 
（６）当社、他のユーザー、求人企業、加盟店等からの連絡に対して、相当期間応答がない場合 
（７）支払債務（キャンセル料、利用料金等）の履行遅延または不履行があった場合 
（８）アカウントが、最後のアカウント利用から３年以上使用されていない場合
（９）過去に当社が提供するサービスにおいて、利用停止やアカウント削除等の措置を受けたことがある者であることが判明した場合
（１0）その他、当社がアカウントの継続利用を不適当と判断した場合
２．当社は、本条に基づき当社が行った措置によりユーザーに生じた損害や不利益について、当社に故意または重過失がない限り、一切の責任を負わないものとします。

第６条（知的財産権および権利帰属）
１．本サービス、当社ウェブサイトおよび当社アプリケーションに含まれるすべてのコンテンツ（文章、画像、動画、音声、ロゴ、キャラクター、アイコン、デザイン、プログラム、商標、標章等を含みますが、これらに限られません）に関する著作権、商標権その他の知的財産権は、当社または当社に利用を許諾している権利者に帰属します。
２．ユーザーは、当社または権利者の事前許諾を得た場合、および法令により許容されている場合を除き、本サービスのコンテンツおよびソフトウェアの内容を複製、転載、改変、公衆送信、配布、販売、再利用等をしてはならないものとします。
３．ユーザーが前項に違反してコンテンツ等を無断利用したことにより、ユーザー自身または第三者に損害が生じた場合であっても、当社は一切の責任を負わないものとします。
４．ユーザーが第２項に違反する行為によって利益を得た場合、当社はその利益相当額の支払いを請求できる権利を有するものとします。

第７条（免責事項）
１．当社は、本サービスの内容、品質、機能について、ユーザーの特定の目的に適合すること、正確性、有用性、最新性、完全性を有すること、および不具合や障害が生じないことについて、明示または黙示を問わず何ら保証するものではありません。 
２．当社は、本サービスの利用、変更、中断、遅延、停止、または終了等によりユーザーが被った損害（以下「ユーザー損害」といいます）について、当社に故意または重大な過失がない限り、一切の賠償責任を負わないものとします。本サービスに発生した不具合・エラー・通信障害等により利用できなかったことによる損害、並びに第三者による不正アクセス、ハッキング、犯罪行為等により生じた損害についても同様とします。 
３．何らかの法的理由により当社が損害賠償責任を負う場合であっても、当社の賠償責任は、ユーザーに直接かつ現実に発生した通常の損害に限定されるものとし、その賠償額は一回の事由につき5,000円を上限とします。ただし、当該損害が当社の故意または重大な過失に起因する場合は、本項の限定は適用されないものとします。
４．ユーザーが使用する端末機器、OS、ブラウザ等の環境や、端末の紛失、盗難、不正利用等により引き起こされた損害について、当社は一切の責任を負いません。端末およびアカウント情報の管理責任はユーザー自身が負うものとします。

第８条（準拠法および管轄裁判所） 
１．本規約および本サービス利用に関する準拠法は日本法とし、本規約に関する紛争については当社の本社所在地を管轄する裁判所を専属的合意管轄裁判所とします。

◆プライバシーポリシー◆
NexusVision株式会社（以下「当社」といいます。）は、当社が提供する各種サービスにおけるユーザーの個人情報等の取扱いについて、以下のとおりプライバシーポリシーを定め適切な保護に努めます。

１．取得するアカウント情報等 
当社は、共通アカウントの提供および関連サービスの運用のために、以下の情報を取得します。
（１）アカウント共通情報：氏名、住所、生年月日、性別、電話番号、メールアドレス、パスワード等
（２）サービス利用情報：住所、希望勤務地、職務経歴、保有資格、最寄り駅、お好み条件等の応募・検索・予約等に関する情報
（３）位置情報：端末のGPS機能等により取得される位置情報（ユーザーが送信を許可した場合のみ）
（４）検索・応募・予約・お気に入り登録等の利用履歴情報

２．アカウント情報等の利用目的
取得した情報は、以下の目的で利用します。
（１）共通アカウントの維持・管理、ログイン時の本人確認および認証のため
（２）当社が提供する各種サービス間でのアカウント連携およびスムーズなサービス提供のため
（３）ユーザーの現在地、指定エリア、閲覧・利用履歴等に応じたコンテンツ（求人、店舗、施設等）の最適化表示（おすすめ表示）および各種通知（プッシュ通知、メールマガジン等）のため
（４）お問い合わせ対応、アフターサービス、および重要なお知らせの送信のため
（５）サービスの機能改善、新サービスの開発、統計データの作成、および不正利用（規約違反行為等）の防止・対応のため

３．第三者（提供事業者等）への提供
（１）応募・予約時における提供：ユーザーが求人への応募、または飲食店・旅行等の予約手続きを行った場合、当該手続きの完了およびサービス提供に必要な範囲で、対象の事業者（求人掲載企業、飲食店、宿泊施設等）へアカウント情報（氏名、住所、連絡先、応募・予約条件等）が開示・提供されます。
（２）前号の場合および法令に基づき開示が求められた場合等、正当な理由がある場合を除き、当社はユーザーの同意を得ることなく第三者へ個人情報を提供することはありません。

４．安全管理措置
当社は、個人情報の漏洩、滅失または毀損の防止その他の安全管理のため、アクセス制限の実施、外部からの不正アクセスシステムの導入、および役員・従業員に対する適切な監督・教育等、必要かつ適切な措置を講じます。

５．アカウント削除（退会）とデータの保管
(1)ユーザーは、本サービス内の設定画面よりいつでも共通アカウントの削除（退会）手続きを行うことができます。アカウントを削除した場合、連携する各種サービスもご利用いただけなくなります。
(2)アカウント削除後、当社は法令に基づく保管義務期間、並びに不正利用の防止および紛争対応等に必要な合理的期間が経過した後、安全な方法で登録データを消去または匿名化処理を行います。

６．保有個人データの開示・訂正・利用停止等の請求
JSONフォーマット等に関するお問い合わせも含め、当社に対して、当社の保有する自己の個人データの開示、訂正、追加、削除、利用停止、または消去を請求することができます。ご希望の場合は、下記お問い合わせ窓口までご連絡ください。ご本人確認を行った上で、法令に従い速やかに対応いたします。

７．本ポリシーの変更
当社は、法令の改正や事業内容の変更等に応じて、本ポリシーを予告なく変更することがあります。変更後のプライバシーポリシーは、本サービス上に掲載した時点から効力を生じるものとします。

８．事業者情報／お問い合わせ窓口
当社へのご質問、ご相談等は下記窓口または、ホームページをご確認のうえご連絡ください。 
問い合わせ先メールアドレス：info@nexus-vision.net （受付時間：平日 10:00〜17:00）`}
            </div>

            <div className="px-6 py-3 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="bg-emerald-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-emerald-700 transition cursor-pointer"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="text-center py-12">読み込み中...</div>}>
      <SignupFormContent />
    </Suspense>
  );
}