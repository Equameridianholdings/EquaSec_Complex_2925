import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

const mongoServer = await MongoMemoryServer.create();

export const connect = async () => {
  const URI = mongoServer.getUri();
  await mongoose.connect(URI);
  console.log("Test MongoDB connected");
};

export const disconnet = async () => {
  try {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
    console.log('Test MongoDB connection closed');
  } catch (error) {
    throw new Error(error as string);
  }
};

export const clear = async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
    }
};
