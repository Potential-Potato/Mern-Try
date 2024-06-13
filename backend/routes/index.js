// routes/index.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/user');
const OfflineOperation = require('../models/offlineOperation');

const performCrudOperation = async (operationType, collectionName, document) => {
  try {
    const offlineOperation = new OfflineOperation({
      operationType,
      collectionName,
      document
    });

    await offlineOperation.save();

    if (operationType === 'insert') {
      const LocalModel = mongoose.model(collectionName, new mongoose.Schema({}, { strict: false }));
      const localDocument = new LocalModel(document);
      await localDocument.save();
    }
  } catch (error) {
    console.error('Error performing CRUD operation locally:', error);
  }
};

// Display all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find({});
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Register user
router.post('/register', async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Email or Name should not be empty.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists.' });
    }

    const user = new User({ name, email, timestamp: new Date() });

    if (global.isOnline && mongoose.connection.readyState === 1) { // Connected
      await user.save();
      return res.status(200).json(user);
    } else { // Disconnected
      console.log('Storing operation locally as offline operation.');
      await performCrudOperation('insert', 'users', user.toObject());
      return res.status(200).json(user);
    }

  } catch (error) {
    console.error(error);
    if (error.name === 'MongoNetworkError' || error.name === 'MongoServerSelectionError' || error.code === 'ECONNRESET') {
      console.log('Network is offline, operations will be stored locally.');
      res.status(500).json({ error: 'Network Error. Operation stored locally.' });
    } else {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});

module.exports = router;
