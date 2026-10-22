import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8" translate="no">
      <div className="max-w-md w-full space-y-8 text-center bg-white p-8 rounded-xl shadow-md border border-emerald-500/30">
        
        {/* 会社ロゴ */}
        <div className="flex justify-center mb-2">
          <img src="/logo.png" alt="NexusVision株式会社" className="h-28 w-auto object-contain" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-gray-900">
            NexusVision ポータル
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            各種サービスをご利用いただくための共通アカウントの登録・管理を行います。
          </p>
        </div>

        <div className="pt-4 space-y-4">
          <Link
            href="/register"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-md text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 transition cursor-pointer"
          >
            新規会員登録へ進む
          </Link>
        </div>

      </div>
    </div>
  );
}