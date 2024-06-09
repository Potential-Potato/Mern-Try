const { MongoClient } = require('mongodb');

const atlasUrl = process.env.AtlasURL;
const mongodUrl = process.env.MongodURL;

const syncOfflineOperations = async () => {
  try {
    const localClient = new MongoClient(mongodUrl);
    await localClient.connect();
    console.log('Connected to local MongoDB for syncing');

    const localDb = localClient.db('try');
    const offlineCollection = localDb.collection('offline_operations'); // Use native MongoDB driver
    const offlineOperations = await offlineCollection.find({}).toArray(); // Fetch all offline operations

    if (offlineOperations.length === 0) {
      console.log('No offline operations to sync.');
      return;
    }

    console.log(`Found ${offlineOperations.length} offline operations to sync.`);

    const client = new MongoClient(atlasUrl);
    await client.connect();
    console.log('Connected to Atlas for syncing');

    const db = client.db('test');

    for (const operation of offlineOperations) {
      const { operationType, collectionName, document } = operation;
      const collection = db.collection(collectionName);

      try {
        console.log(`Syncing operation: ${operationType} for document: ${document._id}`);
        switch (operationType) {
          case 'insert':
          case 'update':
            const existingDoc = await collection.findOne({ email: document.email });
            if (!existingDoc) {
              await collection.updateOne(
                { _id: document._id },
                { $set: document },
                { upsert: true }
              );
            } else if (existingDoc && existingDoc.timestamp < document.timestamp) {
              const { _id, ...updateFields } = document;  // Exclude _id field from the update
              await collection.updateOne(
                { _id: existingDoc._id },
                { $set: updateFields }
              );
            }
            break;
          case 'delete':
            await collection.deleteOne({ _id: document._id });
            break;
        }
        // Remove synced operation from local collection
        await offlineCollection.deleteOne({ _id: operation._id });
        console.log(`Operation ${operationType} for document ${document._id} synced and removed from offline collection.`);
      } catch (syncError) {
        console.error('Error syncing operation:', syncError);
      }
    }

    console.log('Offline operations synced successfully');
  } catch (error) {
    console.error('Error syncing offline operations:', error);
  }
};

module.exports = syncOfflineOperations;
