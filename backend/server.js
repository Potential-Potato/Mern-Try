require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');

const indexRoute = require('./routes/index');
const startChangeStream = require('./helper/CS-config');
const syncOfflineOperations = require('./helper/sync-offline');
const checkNetworkStatus = require('./helper/network-status');

const app = express();

global.isOnline = false;

mongoose.connect(process.env.AtlasURL)
  .then(async () => {
    console.log('Connected to Atlas');
    global.isOnline = true;
    startChangeStream();
    await syncOfflineOperations(); // Sync offline operations when server starts
  })
  .catch((error) => {
    console.error('Error connecting to Atlas:', error);
    global.isOnline = false;
  });

app.use(express.json());
app.use('/', indexRoute);

// Check network status periodically
checkNetworkStatus();

app.listen(3000, () => {
  console.log('Listening on port 3000');
});
