// helper/CS-config.js
const { MongoClient, ObjectId } = require('mongodb');
const { atlasUrl, mongodUrl } = require('../config');

const startChangeStream = async () => {
  try {
    const client = new MongoClient(atlasUrl);
    await client.connect();
    const db = client.db('test');

    const localClient = new MongoClient(mongodUrl);
    await localClient.connect();
    const localDb = localClient.db('try');

    console.log('Watching for changes on all collections in the database');

    const changeStream = db.watch();

    changeStream.on('change', async (change) => {
      try {
        console.log('Change detected:', change);

        const collectionName = change.ns.coll;
        const localCollection = localDb.collection(collectionName);

        switch (change.operationType) {
          case 'insert':
            await localCollection.updateOne(
              { _id: new ObjectId(change.fullDocument._id) },
              { $set: { ...change.fullDocument, timestamp: new Date() } },
              { upsert: true }
            );
            console.log(`Document inserted/updated locally in ${collectionName}`);
            break;
          case 'update':
            const updatedFields = { ...change.updateDescription.updatedFields, timestamp: new Date() };
            await localCollection.updateOne(
              { _id: new ObjectId(change.documentKey._id) },
              { $set: updatedFields }
            );
            console.log(`Document updated locally in ${collectionName}`);
            break;
          case 'replace':
            await localCollection.replaceOne(
              { _id: new ObjectId(change.documentKey._id) },
              { ...change.fullDocument, timestamp: new Date() }
            );
            console.log(`Document replaced locally in ${collectionName}`);
            break;
          case 'delete':
            await localCollection.deleteOne({ _id: new ObjectId(change.documentKey._id) });
            console.log(`Document deleted locally in ${collectionName}`);
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
