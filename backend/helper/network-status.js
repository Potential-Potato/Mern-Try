// helper/network-status.js
const dns = require('dns');
const syncOfflineOperations = require('./sync-offline');

const checkNetworkStatus = async () => {
  try {
    dns.lookup('google.com', async (err) => {
      if (err && err.code === "ENOTFOUND") {
        console.log('Network is offline, operations will be stored locally.');
        global.isOnline = false;
      } else {
        if (!global.isOnline) { // Only sync if previously offline
          console.log('Network is online, syncing offline operations...');
          global.isOnline = true;
          await syncOfflineOperations();
        } else {
          console.log('Network is online, already synced.');
          return;
        }
      }
    });
  } catch (error) {
    console.error('Error checking network status:', error);
  }
};

// Check network status every 10 seconds
setInterval(checkNetworkStatus, 10000);

module.exports = checkNetworkStatus;
