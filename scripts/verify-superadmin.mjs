import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import "dotenv/config";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-north-1" });
const doc = DynamoDBDocumentClient.from(client);

const scan = await doc.send(new ScanCommand({ TableName: "reckonix_users" }));
const users = scan.Items || [];
console.log("Users in DynamoDB:", users.map(u => ({
  id: u.id, username: u.username, name: u.name, role: u.role, isActive: u.isActive, email: u.email
})));
