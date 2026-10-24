import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: "ap-northeast-1",
  credentials: {
    accessKeyId: "PLACEHOLDER_ACCESS_KEY",
    secretAccessKey: "PLACEHOLDER_SECRET_KEY",
  },
});

export const docClient = DynamoDBDocumentClient.from(client);
export const TEMP_USERS_TABLE = "NexusTempUsers";