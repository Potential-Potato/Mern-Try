// server.js
require('dotenv').config();
const express = require('express');

const indexRoute = require('./routes/index');
const { initializeDatabaseConnection, switchToAtlas, switchToLocal } = require('./helper/db-manager');
const checkNetworkStatus = require('./helper/network-status');

const app = express();

const startServer = async () => {
  await initializeDatabaseConnection();

  app.use(express.json());
  app.use('/', indexRoute);

  // Check network status periodically
  checkNetworkStatus();

  app.listen(3000, () => {
    console.log('Listening on port 3000');
  });
};

startServer();
