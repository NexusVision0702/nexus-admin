'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    lastNameKana: '',
    firstNameKana: '',
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    gender: '', // 性別を追加
    phone: '',
    postalCode: '',
    prefecture: '',
    city: '',
    addressLine: '',
    building: '',
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 郵便番号から住所を自動入力する関数（サンプル・既存仕様維持）
  const handlePostalCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value.replace(/[^0-9]/g, '');
    setFormData({ ...formData, postalCode: code });

    if (code.length === 7) {
      try {
        const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${code}`);
        const data = await res.json();
        if (data.results && data.results[0]) {
          const result = data.results[0];
          setFormData((prev) => ({
            ...prev,
            postalCode: code,
            prefecture: result.address1,
            city: result.address2 + result.address3,
          }));
        }
      } catch (err) {
        console.error('住所自動取得エラー', err);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 年・月・日の選択肢生成用
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        {/* 会社ロゴ */}
        <div className="flex flex-col items-center justify-center mb-6">
          <svg className="w-10 h-10 text-amber-500 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span className="text-sm font-bold text-gray-800 tracking-wider">NexusVision株式会社</span>
        </div>

        <h2 className="text-center text-3xl font-extrabold text-gray-900 mb-2">
          新規アカウント登録
        </h2>
        <p className="text-center text-sm text-gray-600 mb-8">
          NexusVision株式会社の全サービスをご利用いただくための会員登録です。
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            
            {/* お名前 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">お名前 (漢字)</label>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  name="lastName"
                  placeholder="姓 (例: 山田)"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                />
                <input
                  type="text"
                  name="firstName"
                  placeholder="名前 (例: 太郎)"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                />
              </div>
            </div>

            {/* フリガナ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">フリガナ</label>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  name="lastNameKana"
                  placeholder="セイ (例: ヤマダ)"
                  value={formData.lastNameKana}
                  onChange={handleChange}
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                />
                <input
                  type="text"
                  name="firstNameKana"
                  placeholder="メイ (例: タロウ)"
                  value={formData.firstNameKana}
                  onChange={handleChange}
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                />
              </div>
            </div>

            {/* 生年月日（選択式に変更） */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">生年月日</label>
              <div className="grid grid-cols-3 gap-2">
                <select
                  name="birthYear"
                  value={formData.birthYear}
                  onChange={handleChange}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm bg-white"
                >
                  <option value="">年を選択</option>
                  {years.map((y) => (
                    <option key={y} value={y}>{y}年</option>
                  ))}
                </select>
                <select
                  name="birthMonth"
                  value={formData.birthMonth}
                  onChange={handleChange}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm bg-white"
                >
                  <option value="">月を選択</option>
                  {months.map((m) => (
                    <option key={m} value={m}>{m}月</option>
                  ))}
                </select>
                <select
                  name="birthDay"
                  value={formData.birthDay}
                  onChange={handleChange}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm bg-white"
                >
                  <option value="">日を選択</option>
                  {days.map((d) => (
                    <option key={d} value={d}>{d}日</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 性別（追加項目） */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">性別</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm bg-white"
              >
                <option value="">選択してください</option>
                <option value="male">男性</option>
                <option value="female">女性</option>
                <option value="prefer_not_to_say">回答不可</option>
              </select>
            </div>

            {/* 電話番号 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">電話番号 (自動ハイフン)</label>
              <input
                type="tel"
                name="phone"
                placeholder="例: 090-1234-5678"
                value={formData.phone}
                onChange={handleChange}
                required
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
              />
            </div>

            {/* ご住所セクション */}
            <div className="border border-gray-200 rounded-lg p-4 space-y-4 bg-gray-50/50">
              <span className="block text-sm font-bold text-gray-800">ご住所</span>
              
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">郵便番号 (7桁入力で自動反映)</label>
                <input
                  type="text"
                  name="postalCode"
                  placeholder="例: 9800021"
                  maxLength={7}
                  value={formData.postalCode}
                  onChange={handlePostalCodeChange}
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">都道府県</label>
                  <input
                    type="text"
                    name="prefecture"
                    placeholder="自動入力"
                    value={formData.prefecture}
                    onChange={handleChange}
                    required
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">市区町村・区域</label>
                  <input
                    type="text"
                    name="city"
                    placeholder="自動入力"
                    value={formData.city}
                    onChange={handleChange}
                    required
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">それ以降の住所 (番地など)</label>
                <input
                  type="text"
                  name="addressLine"
                  placeholder="例: 中央1-1-1"
                  value={formData.addressLine}
                  onChange={handleChange}
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">建物名・部屋番号 (任意)</label>
                <input
                  type="text"
                  name="building"
                  placeholder="例: 〇〇ビル302号室"
                  value={formData.building}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm bg-white"
                />
              </div>
            </div>

            {/* メールアドレス */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス (ログインID)</label>
              <input
                type="email"
                name="email"
                placeholder="例: sample@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
              />
            </div>

            {/* パスワード */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">パスワード (6文字以上)</label>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
              />
            </div>

            {/* 送信ボタン */}
            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-300 hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
              >
                内容入力を確認する
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}