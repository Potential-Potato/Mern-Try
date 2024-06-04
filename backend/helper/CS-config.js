const { MongoClient } = require('mongodb');

const atlasUrl = process.env.AtlasURL;
const mongodUrl = process.env.MongodURL;

const startChangeStreams = async () => {
  try {
    const localClient = new MongoClient(mongodUrl);
    await localClient.connect();
    console.log('Connected to local MongoDB for Change Stream');

    const atlasClient = new MongoClient(atlasUrl);
    await atlasClient.connect();
    console.log('Connected to Atlas');

    const localDb = localClient.db('try');
    const localUsersCollection = localDb.collection('users');

    const atlasDb = atlasClient.db('test');
    const atlasUsersCollection = atlasDb.collection('users');

    // Monitor changes in local MongoDB
    const localChangeStream = localUsersCollection.watch();
    localChangeStream.on('change', async (change) => {
      try {
        console.log('Change detected in local MongoDB:', change);

        // Ignore changes caused by the sync process
        if (change.updateDescription && change.updateDescription.updatedFields && change.updateDescription.updatedFields._sync) {
          console.log('Ignoring change to prevent loop');
          return;
        }

        const document = { ...change.fullDocument, timestamp: new Date() }; // Add timestamp for consistency

        switch (change.operationType) {
          case 'insert':
          case 'replace':
            await atlasUsersCollection.updateOne(
              { _id: change.documentKey._id },
              { $set: { ...document, _sync: true } },
              { upsert: true }
            );
            console.log('Document inserted/updated in Atlas');
            break;
          case 'update':
            await atlasUsersCollection.updateOne(
              { _id: change.documentKey._id },
              { $set: { ...change.updateDescription.updatedFields, timestamp: new Date(), _sync: true } }
            );
            console.log('Document updated in Atlas');
            break;
          case 'delete':
            await atlasUsersCollection.deleteOne({ _id: change.documentKey._id });
            console.log('Document deleted from Atlas');
            break;
          default:
            console.log('Unhandled change operation:', change.operationType);
        }
      } catch (atlasError) {
        console.error('Error processing change in Atlas:', atlasError);
      }
    });

    // Monitor changes in MongoDB Atlas
    const atlasChangeStream = atlasUsersCollection.watch();
    atlasChangeStream.on('change', async (change) => {
      try {
        console.log('Change detected in Atlas:', change);

        // Ignore changes caused by the sync process
        if (change.updateDescription && change.updateDescription.updatedFields && change.updateDescription.updatedFields._sync) {
          console.log('Ignoring change to prevent loop');
          return;
        }

        const document = { ...change.fullDocument, timestamp: new Date() }; // Add timestamp for consistency

        switch (change.operationType) {
          case 'insert':
          case 'replace':
            await localUsersCollection.updateOne(
              { _id: change.documentKey._id },
              { $set: { ...document, _sync: true } },
              { upsert: true }
            );
            console.log('Document inserted/updated in local MongoDB');
            break;
          case 'update':
            await localUsersCollection.updateOne(
              { _id: change.documentKey._id },
              { $set: { ...change.updateDescription.updatedFields, timestamp: new Date(), _sync: true } }
            );
            console.log('Document updated in local MongoDB');
            break;
          case 'delete':
            await localUsersCollection.deleteOne({ _id: change.documentKey._id });
            console.log('Document deleted from local MongoDB');
            break;
          default:
            console.log('Unhandled change operation:', change.operationType);
        }
      } catch (localError) {
        console.error('Error processing change in local MongoDB:', localError);
      }
    });

  } catch (error) {
    console.error('Error setting up change streams:', error);
  }
};

module.exports = startChangeStreams;
