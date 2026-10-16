/**
 * Equipment Inventory Service
 * Provides verified campus equipment inventory records when available.
 * If inventory is unknown for a room/asset, it explicitly indicates that limitation
 * to prevent assuming single devices in shared spaces.
 */

// Normalizes room string for inventory lookup
const normalizeRoomKey = (location) => {
  if (!location) return '';
  return location
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\b(number|no)\b/g, '')
    .replace(/\brm\b/g, 'room')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ');
};

// Verified campus inventory registry
const VERIFIED_INVENTORY = {
  // Room 5: Confirmed single ceiling fan
  [normalizeRoomKey('Room 5')]: {
    room: 'Room 5',
    assets: [
      {
        type: 'Fan',
        subtype: 'Ceiling Fan',
        count: 1,
        identifiers: ['1'],
        notes: 'Room 5 is a small consultation room with exactly one ceiling fan.'
      }
    ]
  },
  // Room 105: Lab with multiple numbered monitors
  [normalizeRoomKey('Room 105')]: {
    room: 'Room 105',
    assets: [
      {
        type: 'Monitor',
        count: 30,
        identifiers: Array.from({ length: 30 }, (_, i) => String(i + 1)),
        notes: 'Computer Lab 105 has 30 individually numbered monitors (Monitor 1 to 30).'
      }
    ]
  },
  // Room 106: Lab with numbered monitors
  [normalizeRoomKey('Room 106')]: {
    room: 'Room 106',
    assets: [
      {
        type: 'Monitor',
        count: 30,
        identifiers: Array.from({ length: 30 }, (_, i) => String(i + 1)),
        notes: 'Computer Lab 106 has 30 individually numbered monitors (Monitor 1 to 30).'
      }
    ]
  }
};

/**
 * Look up verified equipment inventory for a given location and optional asset type.
 * @param {string} location - Room or location string
 * @param {string} [assetType] - Optional asset type to query
 * @returns {Object} Inventory verification result
 */
const getVerifiedInventory = (location, assetType = null) => {
  const roomKey = normalizeRoomKey(location);
  const roomInventory = VERIFIED_INVENTORY[roomKey];

  if (!roomInventory) {
    return {
      hasVerifiedInventory: false,
      certainty: 'UNKNOWN_INVENTORY',
      knownAssets: [],
      notes: 'No verified equipment registry for this room. Do not assume single-device counts.'
    };
  }

  if (assetType) {
    const matching = roomInventory.assets.filter(
      (a) => a.type.toLowerCase() === assetType.toLowerCase() ||
             (a.subtype && a.subtype.toLowerCase() === assetType.toLowerCase())
    );

    if (matching.length === 0) {
      return {
        hasVerifiedInventory: true,
        certainty: 'NO_MATCHING_VERIFIED_ASSET',
        room: roomInventory.room,
        knownAssets: [],
        notes: `Inventory for ${roomInventory.room} exists, but does not list ${assetType}.`
      };
    }

    const singleDevice = matching.length === 1 && matching[0].count === 1;

    return {
      hasVerifiedInventory: true,
      certainty: singleDevice ? 'INFERRED_FROM_VERIFIED_INVENTORY' : 'VERIFIED_MULTI_DEVICE',
      room: roomInventory.room,
      isSingleDevice: singleDevice,
      knownAssets: matching,
      notes: matching[0].notes || roomInventory.notes
    };
  }

  return {
    hasVerifiedInventory: true,
    certainty: 'VERIFIED_ROOM_INVENTORY',
    room: roomInventory.room,
    knownAssets: roomInventory.assets,
    notes: roomInventory.notes
  };
};

module.exports = {
  getVerifiedInventory,
  normalizeRoomKey,
  VERIFIED_INVENTORY
};
