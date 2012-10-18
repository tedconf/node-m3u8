var M3U = module.exports = function M3U() {
  this.items = {
    PlaylistItem: [],
    StreamItem: [],
    IframeStreamItem: [],
    MediaItem: []
  };
  this.properties = {};
};

var dataTypes = {
  iframesOnly    : 'truthy',
  targetDuration : 'integer',
  mediaSequence  : 'integer',
  version        : 'integer'
};

var keyMap = {
  'EXT-X-I-FRAMES-ONLY'  : 'iframesOnly',
  'EXT-X-MEDIA-SEQUENCE' : 'mediaSequence',
  'EXT-X-PLAYLIST-TYPE'  : 'playlistType',
  'EXT-X-TARGETDURATION' : 'targetDuration',
  'EXT-X-VERSION'        : 'version'
};

M3U.prototype.get = function getProperty(key) {
  return this.properties[key];
};

M3U.prototype.set = function setProperty(key, value) {
  if (keyMap[key]) key = keyMap[key];

  this.properties[key] = coerce[dataTypes[key] || 'unknown'](value);

  return this;
};

M3U.prototype.addItem = function addItem(item) {
  this.items[item.constructor.name].push(item);

  return this;
};

M3U.prototype.toString = function toString() {
  var output = [];
  if (this.items.PlaylistItem.length) {
    output.push(this.items.PlaylistItem.map(itemToString).join('\n') + '\n');
  }
  if (this.items.StreamItem.length) {
    output.push(this.items.StreamItem.map(itemToString).join('\n') + '\n');
  }
  if (this.items.IframeStreamItem.length) {
    output.push(this.items.IframeStreamItem.map(itemToString).join('\n') + '\n');
  }
  if (this.items.MediaItem.length) {
    output.push(this.items.MediaItem.map(itemToString).join('\n') + '\n');
  }

  return output.join('\n');
};

function itemToString(item) {
  return item.toString();
};

var coerce = {
  boolean: function coerceBoolean(value) {console.log(value);
    return value ? true : false;
  },
  integer: function coerceInteger(value) {
    return parseInt(value, 10);
  },
  truthy: function coerceTruthy(value) {
    return true;
  },
  unknown: function coerceUnknown(value) {
    return value;
  }
};