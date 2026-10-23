import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// どちらの環境変数名（MY_AWS_ / 標準のAWS_）でも確実に読み込む
const accessKeyId = process.env.MY_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.MY_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || "";
const region = process.env.MY_AWS_REGION || process.env.AWS_REGION || "ap-northeast-1";

// デバッグ用ログ（Amplifyのリアルタイムログで確認できます）
console.log("=== AWS CONFIG CHECK ===");
console.log("Region:", region);
console.log("AccessKey exists:", !!accessKeyId, "Length:", accessKeyId.length);
console.log("SecretKey exists:", !!secretAccessKey, "Length:", secretAccessKey.length);
console.log("========================");

const client = new DynamoDBClient({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export const docClient = DynamoDBDocumentClient.from(client);
export const TEMP_USERS_TABLE = "NexusTempUsers";