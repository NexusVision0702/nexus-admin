import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// サーバー側で環境変数が本当に読み込まれているかチェックするログ
console.log("=== NEXUS-ADMIN DYNAMODB DEBUG ===");
console.log("REGION:", process.env.MY_AWS_REGION || process.env.AWS_REGION || "ap-northeast-1");
console.log("ACCESS_KEY_ID exists:", !!(process.env.MY_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID));
console.log("ACCESS_KEY_ID length:", (process.env.MY_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || "").length);
console.log("SECRET_KEY exists:", !!(process.env.MY_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY));
console.log("==================================");

const accessKeyId = process.env.MY_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.MY_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || "";
const region = process.env.MY_AWS_REGION || process.env.AWS_REGION || "ap-northeast-1";

const client = new DynamoDBClient({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export const docClient = DynamoDBDocumentClient.from(client);
export const TEMP_USERS_TABLE = "NexusTempUsers";