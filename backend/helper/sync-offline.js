const { MongoClient } = require('mongodb');

const atlasUrl = process.env.AtlasURL;
const mongodUrl = process.env.MongodURL;

const syncOfflineOperations = async () => {
  try {
    console.log('Starting sync of offline operations...');

    const localClient = new MongoClient(mongodUrl);
    await localClient.connect();
    console.log('Connected to local MongoDB for syncing');

    const localDb = localClient.db('try');
    const offlineCollection = localDb.collection('offline_operations');
    const usersCollection = localDb.collection('users');

    const offlineOperations = await offlineCollection.find({ synced: false }).sort({ timestamp: 1 }).toArray();
    console.log('Offline operations to sync:', offlineOperations);

    if (offlineOperations.length === 0) {
      console.log('No offline operations to sync');
      return;
    }

    const atlasClient = new MongoClient(atlasUrl);
    await atlasClient.connect();
    console.log('Connected to Atlas for syncing');

    const atlasDb = atlasClient.db('test');
    const atlasUsersCollection = atlasDb.collection('users');

    for (const operation of offlineOperations) {
      const { operationType, document } = operation;
      console.log('Processing operation:', operation);

      try {
        // Fetch the existing document from Atlas
        const existingDocument = await atlasUsersCollection.findOne({
          $or: [
            { _id: document._id },
            { email: document.email }
          ]
        });
        console.log('Existing document in Atlas:', existingDocument);

        // Check if the document is newer based on the timestamp
        if (!existingDocument || new Date(document.timestamp) > new Date(existingDocument.timestamp)) {
          console.log('Document is newer or does not exist in Atlas');
          switch (operationType) {
            case 'insert':
            case 'replace':
              // Use upsert: true to insert or update the document without modifying _id
              await atlasUsersCollection.updateOne(
                { email: document.email },
                { $set: { ...document, _id: existingDocument ? existingDocument._id : document._id } },
                { upsert: true }
              );
              console.log('Document inserted/replaced in Atlas');
              break;
            case 'update':
              await atlasUsersCollection.updateOne(
                { _id: document._id },
                { $set: document }
              );
              console.log('Document updated in Atlas');
              break;
            case 'delete':
              await atlasUsersCollection.deleteOne({ _id: document._id });
              console.log('Document deleted from Atlas');
              break;
            default:
              console.log('Unknown operation type:', operationType);
          }

          // Apply changes to local users collection if Atlas update was successful
          switch (operationType) {
            case 'insert':
            case 'replace':
              await usersCollection.updateOne(
                { _id: document._id },
                { $set: document },
                { upsert: true }
              );
              console.log('Document inserted/replaced in local MongoDB');
              break;
            case 'update':
              await usersCollection.updateOne(
                { _id: document._id },
                { $set: document }
              );
              console.log('Document updated in local MongoDB');
              break;
            case 'delete':
              await usersCollection.deleteOne({ _id: document._id });
              console.log('Document deleted from local MongoDB');
              break;
            default:
              console.log('Unknown operation type:', operationType);
          }

          // Mark the operation as synced and delete it
          await offlineCollection.updateOne(
            { _id: operation._id },
            { $set: { synced: true } }
          );
          await offlineCollection.deleteOne({ _id: operation._id });
          console.log('Offline operation processed and removed:', operation._id);
        } else {
          console.log('Document in Atlas is newer or has equal timestamp');
          // The existing document in Atlas is newer or equal, so just delete the offline operation
          await offlineCollection.updateOne(
            { _id: operation._id },
            { $set: { synced: true } }
          );
          await offlineCollection.deleteOne({ _id: operation._id });
          console.log('Offline operation removed without update due to older timestamp:', operation._id);
        }
      } catch (err) {
        if (err.code === 11000) { // Duplicate key error
          try {
            // Handle duplicate key error by updating the document if necessary
            const conflictingDocument = await atlasUsersCollection.findOne({ email: document.email });
            if (conflictingDocument && new Date(document.timestamp) > new Date(conflictingDocument.timestamp)) {
              await atlasUsersCollection.updateOne(
                { email: document.email },
                { $set: document }
              );
              console.log('Conflicting document updated in Atlas');

              // Update local users collection as well
              await usersCollection.updateOne(
                { email: document.email },
                { $set: document }
              );
              console.log('Conflicting document updated in local MongoDB');
            }

            // Mark the operation as synced and delete it
            await offlineCollection.updateOne(
              { _id: operation._id },
              { $set: { synced: true } }
            );
            await offlineCollection.deleteOne({ _id: operation._id });
            console.log('Offline operation processed and removed after resolving conflict:', operation._id);
          } catch (innerErr) {
            console.error('Error resolving duplicate key conflict:', innerErr);
          }
        } else {
          console.error('Error syncing operation:', err);
        }
      }
    }

    console.log('Offline operations synced successfully');
  } catch (error) {
    console.error('Error syncing offline operations:', error);
  }
};

module.exports = syncOfflineOperations;
