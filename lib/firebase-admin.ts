import { initializeApp, getApps, getApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// 実行時に安全にAppを取得・初期化する関数
function getAdminApp() {
  if (!getApps().length) {
    return initializeApp({
      projectId: "nexus-admin-fc9ff",
    });
  }
  return getApp();
}

// 関数経由で取得することで、ファイル読み込み時のクラッシュを完全に防ぐ
export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

// 従来のインポート（adminAuth, adminDb）を使っている他のファイルがエラーにならないよう、
// 実行時に動的に評価されるProxy（またはGetter）オブジェクトとして定義する
export const adminAuth = {
  get createUser() {
    return getAdminAuth().createUser.bind(getAdminAuth());
  },
  get verifyIdToken() {
    return getAdminAuth().verifyIdToken.bind(getAdminAuth());
  }
} as any;

export const adminDb = {
  collection(path: string) {
    return getAdminDb().collection(path);
  }
} as any;