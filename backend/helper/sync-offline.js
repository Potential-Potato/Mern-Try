// helper/sync-offline.js
const mongoose = require('mongoose');
const OfflineOperation = require('../models/offlineOperation');
const { atlasUrl, mongodUrl } = require('../config');

const syncOfflineOperations = async () => {
  let localConnection;
  let atlasConnection;

  try {
    // Connect to local MongoDB
    localConnection = mongoose.createConnection(mongodUrl);
    await localConnection.asPromise();
    console.log('Connected to local MongoDB for syncing');

    const OfflineOperationModel = localConnection.model('OfflineOperation', OfflineOperation.schema);
    const offlineOperations = await OfflineOperationModel.find({}); // Fetch all offline operations

    if (offlineOperations.length === 0) {
      console.log('No offline operations to sync.');
      return;
    }

    console.log(`Found ${offlineOperations.length} offline operations to sync.`);

    // Connect to Atlas MongoDB
    atlasConnection = mongoose.createConnection(atlasUrl);
    await atlasConnection.asPromise();
    console.log('Connected to Atlas for syncing');

    const atlasDb = atlasConnection.useDb('test');

    for (const operation of offlineOperations) {
      const { operationType, collectionName, document } = operation;
      const collection = atlasDb.collection(collectionName);

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
        await OfflineOperationModel.deleteOne({ _id: operation._id });
        console.log(`Operation ${operationType} for document ${document._id} synced and removed from offline collection.`);
      } catch (syncError) {
        console.error('Error syncing operation:', syncError);
      }
    }

    console.log('Offline operations synced successfully');
  } catch (error) {
    console.error('Error syncing offline operations:', error);
  } finally {
    if (localConnection) {
      await localConnection.close();
    }
    if (atlasConnection) {
      await atlasConnection.close();
    }
  }
};

module.exports = syncOfflineOperations;
