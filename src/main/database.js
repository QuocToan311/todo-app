const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://toan:toandz@cluster0.2iv1cdk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

let client;
let db;
let usersCollection;
let tasksCollection;

async function connectMongo() {
  if (!MONGODB_URI) {
    throw new Error('MongoDB URI is not defined');
  }
  client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db('todo_app');
  usersCollection = db.collection('users');
  tasksCollection = db.collection('tasks');
  await usersCollection.createIndex({ email: 1 }, { unique: true });
  await tasksCollection.createIndex({ userId: 1 });
  return { client, db, usersCollection, tasksCollection };
}

function getCollections() {
  if (!usersCollection || !tasksCollection) {
    throw new Error('Database not initialized');
  }
  return { usersCollection, tasksCollection };
}

async function closeMongo() {
  if (client) {
    await client.close();
  }
}

module.exports = { connectMongo, getCollections, closeMongo };