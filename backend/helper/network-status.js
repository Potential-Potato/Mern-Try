// helper/network-status.js
const dns = require('dns');
const { switchToAtlas, switchToLocal, isConnectedToAtlas } = require('./db-manager');

const checkNetworkStatus = async () => {
  dns.lookup('google.com', async (err) => {
    if (err && err.code === "ENOTFOUND") {
      console.log('Network is offline, attempting to connect to local MongoDB...');
      if (await switchToLocal()) {
        console.log('Connected to local MongoDB');
      } else {
        console.log('Failed to connect to local MongoDB');
      }
    } else {
      if (!isConnectedToAtlas()) { // Only switch if currently offline
        console.log('Network is online, attempting to connect to Atlas...');
        if (await switchToAtlas()) {
          console.log('Connected to Atlas');
        } else {
          console.log('Failed to connect to Atlas, staying with local MongoDB');
          await switchToLocal(); // Ensure local connection
        }
      } else {
        console.log('Network is online, already connected to Atlas');
      }
    }
  });
};

// Check network status every 10 seconds
setInterval(checkNetworkStatus, 10000);

module.exports = checkNetworkStatus;
