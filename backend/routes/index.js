const router = require('express').Router();
const User = require('../models/user');
const OfflineOperation = require('../models/offlineOperation');
const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');

const mongodUrl = process.env.MongodURL;

const performCrudOperation = async (operationType, collectionName, document) => {
  const localClient = new MongoClient(mongodUrl);
  await localClient.connect();
  const localDb = localClient.db('try');
  const offlineCollection = localDb.collection('offline_operations');

  const timestamp = new Date();
  const operationDocument = {
    operationType,
    collectionName,
    document,
    timestamp,
    synced: false
  };

  await offlineCollection.insertOne(operationDocument);
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

    const user = new User({ name, email, timestamp: new Date() });

    if (global.isOnline && mongoose.connection.readyState === 1) { // Connected
      await user.save();
    } else { // Disconnected
      await performCrudOperation('insert', 'users', user);
    }

    console.log(user);
    return res.status(200).json(user);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
