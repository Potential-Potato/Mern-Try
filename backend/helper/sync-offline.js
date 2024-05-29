const { MongoClient } = require('mongodb');

const atlasUrl = process.env.AtlasURL;
const mongodUrl = process.env.MongodURL;

const syncOfflineOperations = async () => {
  try {
    const localClient = new MongoClient(mongodUrl);
    await localClient.connect();
    console.log('Connected to local MongoDB for syncing');

    const localDb = localClient.db('try');
    const offlineCollection = localDb.collection('offline_operations');

    const client = new MongoClient(atlasUrl);
    await client.connect();
    console.log('Connected to Atlas for syncing');

    const db = client.db('test');

    const operations = await offlineCollection.find({}).toArray();

    for (const operation of operations) {
      const { operationType, collectionName, document } = operation;
      const collection = db.collection(collectionName);

      switch (operationType) {
        case 'insert':
          await collection.insertOne(document);
          break;
        case 'update':
          await collection.updateOne(
            { _id: document._id },
            { $set: document }
          );
          break;
        case 'delete':
          await collection.deleteOne({ _id: document._id });
          break;
      }

      // Remove synced operation from local collection
      await offlineCollection.deleteOne({ _id: operation._id });
    }

    console.log('Offline operations synced successfully');
  } catch (error) {
    console.error('Error syncing offline operations:', error);
  }
};

module.exports = syncOfflineOperations;
