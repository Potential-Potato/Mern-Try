const { MongoClient, ObjectId } = require('mongodb');

const atlasUrl = process.env.AtlasURL;
const mongodUrl = process.env.MongodURL;

const startChangeStream = async () => {
  try {
    const client = new MongoClient(atlasUrl);
    await client.connect();
    console.log('Connected to Atlas for Change Stream');

    const db = client.db('test');
    const collection = db.collection('users');

    const localClient = new MongoClient(mongodUrl);
    await localClient.connect();
    console.log('Connected to local MongoDB');

    const localDb = localClient.db('try');
    const localCollection = localDb.collection('users');

    console.log('Watching for changes...');

    const changeStream = collection.watch();

    changeStream.on('change', async (change) => {
      try {
        console.log('Change detected:', change);
        switch (change.operationType) {
          case 'insert':
            await localCollection.updateOne(
              { _id: new ObjectId(change.fullDocument._id) },
              { $set: { ...change.fullDocument, timestamp: new Date() } },
              { upsert: true }
            );
            console.log('Document inserted/updated locally');
            break;
          case 'update':
            const updatedFields = { ...change.updateDescription.updatedFields };
            if (!updatedFields.timestamp) {
              updatedFields.timestamp = new Date();
            }
            await localCollection.updateOne(
              { _id: new ObjectId(change.documentKey._id) },
              { $set: updatedFields }
            );
            console.log('Document updated locally');
            break;
          case 'replace':
            await localCollection.replaceOne(
              { _id: new ObjectId(change.documentKey._id) },
              { ...change.fullDocument, timestamp: new Date() }
            );
            console.log('Document replaced locally');
            break;
          case 'delete':
            await localCollection.deleteOne({ _id: new ObjectId(change.documentKey._id) });
            console.log('Document deleted locally');
            break;
          default:
            console.log('Unhandled change operation:', change.operationType);
        }
      } catch (localError) {
        console.error('Error processing change locally:', localError);
      }
    });

  } catch (error) {
    console.error('Error setting up change stream:', error);
  }
};

module.exports = startChangeStream;
