"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import TermsModal from "@/components/TermsModal";

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

  const [agreedTerms, setAgreedTerms] = useState(false);
  const [notMinor, setNotMinor] = useState(false);
  const [notAntiSocial, setNotAntiSocial] = useState(false);
  const [hasOpenedTerms, setHasOpenedTerms] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<"form" | "confirm" | "sent">("form");

  const birthdateDisplay = birthYear && birthMonth && birthDay ? `${birthYear}年${birthMonth}月${birthDay}日` : "";

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

  const handleExecuteSignup = async () => {
    setError("");
    setIsSubmitting(true);

    try {
      const fullName = `${lastName.trim()} ${firstName.trim()}`;
      const fullNameKana = `${lastNameKana.trim()} ${firstNameKana.trim()}`;
      const fullAddress = `〒${postalCode} ${prefecture}${city}${street} ${building}`.trim();

      const response = await fetch("/api/send-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password,
          name: fullName,
          lastName: lastName.trim(),
          firstName: firstName.trim(),
          lastNameKana: lastNameKana.trim(),
          firstNameKana: firstNameKana.trim(),
          furigana: fullNameKana,
          birthdate: birthdateDisplay,
          gender: gender,
          phone: phone.trim(),
          postalCode: postalCode,
          prefecture: prefecture,
          city: city,
          street: street,
          building: building,
          address: fullAddress,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "登録処理に失敗しました。");
      }

      setStep("sent");
    } catch (err: any) {
      console.error("登録エラー:", err);
      setError(err.message || "入力内容をご確認ください。");
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">生年月日</label>
              <div className="grid grid-cols-3 gap-2">
                <select value={birthYear} onChange={(e) => setBirthYear(e.target.value)} required className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-white">
                  <option value="">年を選択</option>
                  {years.map((y) => (<option key={y} value={y}>{y}年</option>))}
                </select>
                <select value={birthMonth} onChange={(e) => setBirthMonth(e.target.value)} required className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-white">
                  <option value="">月を選択</option>
                  {months.map((m) => (<option key={m} value={m}>{m}月</option>))}
                </select>
                <select value={birthDay} onChange={(e) => setBirthDay(e.target.value)} required className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-white">
                  <option value="">日を選択</option>
                  {days.map((d) => (<option key={d} value={d}>{d}日</option>))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">性別</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)} required className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-white">
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

            <div className="pt-2 space-y-3">
              <label className={`flex items-start space-x-3 ${!hasOpenedTerms ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}>
                <input type="checkbox" checked={agreedTerms} onChange={(e) => setAgreedTerms(e.target.checked)} disabled={!hasOpenedTerms} className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed flex-shrink-0" required />
                <span className="text-sm text-gray-700 leading-relaxed">
                  <button type="button" onClick={handleOpenTermsModal} className="text-emerald-600 underline hover:text-emerald-800 font-medium focus:outline-none cursor-pointer">
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

              <label className="flex items-start space-x-3 cursor-pointer">
                <input type="checkbox" checked={notMinor} onChange={(e) => setNotMinor(e.target.checked)} className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer flex-shrink-0" required />
                <span className="text-sm text-gray-700 leading-relaxed">
                  わたしは未成年者ではありません
                  <span className="block text-xs text-gray-500 mt-0.5">(未成年の場合：法定代理人の許可が取れています)</span>
                </span>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer">
                <input type="checkbox" checked={notAntiSocial} onChange={(e) => setNotAntiSocial(e.target.checked)} className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer flex-shrink-0" required />
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

      <TermsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
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