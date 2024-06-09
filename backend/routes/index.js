const router = require('express').Router();
const User = require('../models/user');
const OfflineOperation = require('../models/offlineOperation');
const mongoose = require('mongoose');
const { MongoClient, ObjectId } = require('mongodb');

const mongodUrl = process.env.MongodURL;

const performCrudOperation = async (operationType, collectionName, document) => {
  const localClient = new MongoClient(mongodUrl);
  await localClient.connect();
  const localDb = localClient.db('try');
  const offlineCollection = localDb.collection('offline_operations');

  // Save the operation in the offline_operations collection
  await offlineCollection.insertOne({ operationType, collectionName, document });

  // Save the document in the local collection (for 'insert' operation only)
  if (operationType === 'insert') {
    const localCollection = localDb.collection(collectionName);
    await localCollection.insertOne(document);
  }
};

// Display all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find({});
    res.status(200).json(users);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Register user
router.post('/register', async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: "Email or Name should not be empty." });
    }

    const user = new User({ name, email, timestamp: new Date(), _id: new ObjectId() });

    if (global.isOnline && mongoose.connection.readyState === 1) { // Connected
      await user.save();
      return res.status(200).json(user);
    } else { // Disconnected
      console.log('Storing operation locally as offline operation.');
      await performCrudOperation('insert', 'users', user.toObject());
      return res.status(200).json(user);
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
