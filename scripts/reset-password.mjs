import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import "dotenv/config";

const scryptAsync = promisify(scrypt);

async function hashPwd(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-north-1" });
const doc = DynamoDBDocumentClient.from(client);
const TABLE = "reckonix_users";

const scan = await doc.send(new ScanCommand({ TableName: TABLE }));
const users = scan.Items || [];
console.log("Users found:", users.map(u => ({ id: u.id, username: u.username, role: u.role, isActive: u.isActive })));

const newPassword = "superadmin@123";
const targets = ["admin", "vinay", "superadmin"];

for (const user of users) {
  if (targets.includes(user.username)) {
    const hashed = await hashPwd(newPassword);
    const updated = { ...user, password: hashed };
    await doc.send(new PutCommand({ TableName: TABLE, Item: updated }));
    console.log(`Password reset for user: ${user.username} (id: ${user.id})`);
  }
}

if (users.length === 0) {
  console.log("Table is empty - users may be in a different region or the app uses JSON fallback.");
  console.log("AWS_REGION:", process.env.AWS_REGION);
}

console.log("Done.");
