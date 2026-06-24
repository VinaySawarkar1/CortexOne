import { DynamoDBClient, ListTablesCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import "dotenv/config";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-north-1" });
const doc = DynamoDBDocumentClient.from(client);

const { TableNames } = await client.send(new ListTablesCommand({}));
console.log("All DynamoDB tables:", TableNames);

// Check any users table
for (const t of (TableNames || [])) {
  if (t.toLowerCase().includes("user")) {
    const { Items } = await doc.send({ ...new ScanCommand({ TableName: t }), });
    console.log(`\nTable ${t} has ${Items?.length} items`);
    if (Items?.length) console.log("Sample:", JSON.stringify(Items[0]).substring(0, 300));
  }
}
