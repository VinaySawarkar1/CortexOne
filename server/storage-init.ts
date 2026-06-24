import { JSONFileStorage, IStorage } from './storage';
import { MongoDBStorage } from './mongodb-storage';
import { DynamoDBStorage } from './dynamodb-storage';
import { config } from './config';

let storage: IStorage;

export async function initializeStorage(): Promise<IStorage> {
  if (config.USE_DYNAMODB) {
    console.log('🔗 Initializing DynamoDB storage (eu-north-1)...');
    const db = new DynamoDBStorage();
    await db.initialize();
    storage = db;
    console.log('✅ DynamoDB storage initialized');
  } else if (config.USE_MONGODB) {
    console.log('🔗 Initializing MongoDB storage...');
    const mongoStorage = new MongoDBStorage();
    await mongoStorage.initialize();
    storage = mongoStorage;
    console.log('✅ MongoDB storage initialized');
  } else {
    console.log('📁 Initializing JSON file storage...');
    storage = new JSONFileStorage();
    console.log('✅ JSON file storage initialized');
  }

  return storage;
}

export function getStorage(): IStorage {
  if (!storage) {
    throw new Error('Storage not initialized. Call initializeStorage() first.');
  }
  return storage;
}
