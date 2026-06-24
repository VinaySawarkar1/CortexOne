// Storage Configuration
export const config = {
  // Storage backend: dynamodb > mongodb > json
  USE_DYNAMODB: process.env.USE_DYNAMODB === 'true',
  USE_MONGODB: process.env.USE_DYNAMODB === 'true' ? false : (process.env.USE_MONGODB === 'true' || true),

  // MongoDB connection settings
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://vinay:<db_password>@cluster0.5hfxub2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
  MONGODB_PASSWORD: process.env.MONGODB_PASSWORD || 'FBKAbt5g5DhxFK3',
  DB_NAME: 'business_ai',

  // AWS DynamoDB settings
  AWS_REGION: process.env.AWS_REGION || 'eu-north-1',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  DYNAMO_TABLE_PREFIX: 'reckonix_', // prefix to avoid touching other tables

  // Server settings
  PORT: process.env.PORT || 10000,
  HOST: process.env.HOST || '0.0.0.0',

  // Session settings
  SESSION_SECRET: process.env.SESSION_SECRET || 'business-ai-app-secret',
};

// Instructions for MongoDB setup:
// 1. Replace 'your_actual_password_here' with your actual MongoDB password
// 2. Set USE_MONGODB=true to enable MongoDB storage
// 3. Set USE_MONGODB=false to use JSON file storage (default)
