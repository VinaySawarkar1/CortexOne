import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand, UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
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

// Check existing users
const scan = await doc.send(new ScanCommand({ TableName: "reckonix_users" }));
const users = scan.Items || [];
console.log("Existing users:", users.map(u => ({ id: u.id, username: u.username, role: u.role })));

// Remove any existing superadmin
const existing = users.find(u => u.username === "superadmin");
if (existing) {
  console.log("Superadmin already exists, updating password...");
  const hashed = await hashPwd("Admin@123");
  await doc.send(new PutCommand({
    TableName: "reckonix_users",
    Item: { ...existing, password: hashed }
  }));
  console.log("✅ Superadmin password updated to: Admin@123");
} else {
  // Get next ID using the same UPDATE ADD pattern the app uses
  const counterResult = await doc.send(new UpdateCommand({
    TableName: "reckonix_counters",
    Key: { entity: "users" },
    UpdateExpression: "ADD #seq :inc",
    ExpressionAttributeNames: { "#seq": "seq" },
    ExpressionAttributeValues: { ":inc": 1 },
    ReturnValues: "UPDATED_NEW",
  }));
  const nextId = counterResult.Attributes.seq;

  const hashed = await hashPwd("Admin@123");
  await doc.send(new PutCommand({
    TableName: "reckonix_users",
    Item: {
      id: nextId,
      username: "superadmin",
      password: hashed,
      name: "Super Admin",
      email: "superadmin@reckonix.com",
      role: "superuser",
      isActive: true,
      companyId: 0,
      permissions: [],
      createdAt: new Date().toISOString()
    }
  }));
  console.log(`✅ Superadmin created with id: ${nextId}`);
  console.log("   Username: superadmin");
  console.log("   Password: Admin@123");
}
