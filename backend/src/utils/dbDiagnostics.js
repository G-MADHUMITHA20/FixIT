/**
 * Safe database diagnostics utility
 * Categorizes MongoDB Atlas connection errors and sanitizes error output
 */

/**
 * Strips user and password from a MongoDB connection string
 */
function sanitizeMongoUri(uri) {
  if (!uri || typeof uri !== 'string') return '';
  return uri.replace(/mongodb(\+srv)?:\/\/[^@]+@/i, 'mongodb$1://***:***@');
}

/**
 * Analyzes and categorizes a MongoDB / Mongoose connection error
 * @param {Error} error
 * @returns {Object} categorized diagnostic object
 */
function diagnoseMongoError(error) {
  if (!error) {
    return {
      category: 'NONE',
      type: 'No error',
      message: 'Connection is healthy',
      actionableGuidance: '',
    };
  }

  const msg = error.message || '';
  const str = error.toString();
  const causeStr = error.cause ? error.cause.toString() : '';
  const fullText = `${msg} ${str} ${causeStr}`;

  // 1. Missing MONGO_URI
  if (!process.env.MONGO_URI) {
    return {
      category: 'MISSING_CONFIGURATION',
      type: 'Missing Environment Variable',
      message: 'MONGO_URI is not defined in backend/.env',
      actionableGuidance: 'Ensure backend/.env exists and defines MONGO_URI=mongodb+srv://...',
    };
  }

  // 2. Authentication Failure
  if (
    error.code === 8000 ||
    error.codeName === 'AtlasError' ||
    fullText.includes('Authentication failed') ||
    fullText.includes('bad auth') ||
    fullText.includes('auth error')
  ) {
    return {
      category: 'AUTHENTICATION_FAILURE',
      type: 'Authentication Failed',
      message: 'The MongoDB database username or password in MONGO_URI was rejected by Atlas.',
      actionableGuidance:
        'Verify your database username and password in MongoDB Atlas (Database Access). If your password contains special characters (e.g. @, #, $, %, /), they must be URL-encoded (e.g. @ -> %40).',
    };
  }

  // Inspect cause / reason servers map for underlying TCP socket errors
  let hasTimeout = fullText.includes('ETIMEDOUT');
  let hasRefused = fullText.includes('ECONNREFUSED');
  let allServersUnknown = false;

  const serverDescriptions = error.cause?.servers || error.reason?.servers;
  if (serverDescriptions && typeof serverDescriptions.values === 'function') {
    const serversList = Array.from(serverDescriptions.values());
    if (serversList.length > 0 && serversList.every((s) => s.type === 'Unknown')) {
      allServersUnknown = true;
    }
    for (const serverDesc of serversList) {
      const serverErrMsg = serverDesc?.error?.message || '';
      const serverErrCode = serverDesc?.error?.code || '';
      if (serverErrMsg.includes('ETIMEDOUT') || serverErrCode === 'ETIMEDOUT') {
        hasTimeout = true;
      }
      if (serverErrMsg.includes('ECONNREFUSED') || serverErrCode === 'ECONNREFUSED') {
        hasRefused = true;
      }
    }
  }

  // 3. DNS or SRV Resolution Failure
  if (
    fullText.includes('querySrv ENOTFOUND') ||
    fullText.includes('querySrv ESERVFAIL') ||
    fullText.includes('querySrv ETIMEOUT') ||
    fullText.includes('ENOTFOUND')
  ) {
    return {
      category: 'DNS_RESOLUTION_FAILURE',
      type: 'DNS / SRV Resolution Failure',
      message: 'Unable to resolve the MongoDB Atlas cluster hostname via DNS.',
      actionableGuidance:
        'Check your internet connection and verify that the cluster hostname in MONGO_URI is spelled correctly. Some DNS servers cannot resolve DNS SRV records; try setting DNS to 8.8.8.8 or 1.1.1.1.',
    };
  }

  // 4. Outbound TCP Port 27017 Timeout / Network Firewall Block
  if (hasTimeout || allServersUnknown) {
    return {
      category: 'NETWORK_TIMEOUT_PORT_27017',
      type: 'Network Access / Outbound Port 27017 Blocked',
      message:
        'TCP handshake to MongoDB Atlas replica set on port 27017 timed out. DNS resolution succeeded, but outgoing TCP packets on port 27017 were not answered.',
      actionableGuidance:
        'Root Cause: Outbound port 27017 is blocked at your local Wi-Fi router, campus network gateway, or ISP firewall (only ports 80/443 are allowed on many campus networks).\n' +
        'Actionable Solutions:\n' +
        '  1. Switch to Mobile Hotspot: Disconnect from the campus/filtered Wi-Fi and connect to your phone\'s 4G/5G mobile hotspot. Mobile carrier networks do not block port 27017.\n' +
        '  2. Use a VPN: A VPN tunnels all traffic through port 443/UDP, bypassing the local router\'s port 27017 block.\n' +
        '  3. Confirm Atlas Network Access: Ensure your public IP (or 0.0.0.0/0 for testing) is active in Atlas Network Access tab.\n' +
        '  4. Confirm Cluster Status: Verify the cluster is in "Active" state and not paused in the Atlas web console.',
    };
  }

  // 5. Connection Refused
  if (hasRefused) {
    return {
      category: 'CONNECTION_REFUSED',
      type: 'Connection Refused',
      message: 'The target host actively refused the connection on the requested port.',
      actionableGuidance:
        'Ensure the target database is running and actively listening for connections on the designated port.',
    };
  }

  // 6. Generic Server Selection Error
  return {
    category: 'SERVER_SELECTION_ERROR',
    type: 'Cluster Server Selection Error',
    message: msg.slice(0, 200),
    actionableGuidance:
      'Mongoose was unable to select an active replica set primary. Verify cluster state in MongoDB Atlas.',
  };
}

module.exports = {
  sanitizeMongoUri,
  diagnoseMongoError,
};
