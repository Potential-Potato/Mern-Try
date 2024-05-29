const router = require('express').Router();
const User = require('../models/user');
const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');

const mongodUrl = process.env.MongodURL;

const performCrudOperation = async (operationType, collectionName, document) => {
  const localClient = new MongoClient(mongodUrl);
  await localClient.connect();
  const localDb = localClient.db('try');
  const offlineCollection = localDb.collection('offline_operations');

  await offlineCollection.insertOne({ operationType, collectionName, document });
};

// Display all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find({});
    res.status(200).json(users);
  } catch (error) {
    console.log(error);
  }
});

// Register user
router.post('/register', async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.json({ error: "Email or Name should not be empty." });
    }

    const user = new User({ name, email });

    if (global.isOnline && mongoose.connection.readyState === 1) { // Connected
      await user.save();
    } else { // Disconnected
      await performCrudOperation('insert', 'users', user);
    }

    console.log(user);
    return res.status(200).json(user);
  } catch (error) {
    console.log(error);
  }
});

module.exports = router;
