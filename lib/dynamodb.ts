import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env.MY_AWS_REGION || "ap-northeast-1",
  credentials: {
    accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY || "",
  },
});

export const docClient = DynamoDBDocumentClient.from(client);
export const TEMP_USERS_TABLE = "NexusTempUsers";