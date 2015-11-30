var M3U = module.exports = function M3U() {
  this.items = {
    PlaylistItem: [],
    StreamItem: [],
    IframeStreamItem: [],
    MediaItem: []
  };
  this.properties = {};
};

M3U.PlaylistItem     = require('./m3u/PlaylistItem');
M3U.MediaItem        = require('./m3u/MediaItem');
M3U.StreamItem       = require('./m3u/StreamItem');
M3U.IframeStreamItem = require('./m3u/IframeStreamItem');

var Item = require('./m3u/Item');

M3U.create = function createM3U() {
  return new M3U;
};

M3U.prototype.get = function getProperty(key) {
  return this.properties[key];
};

M3U.prototype.set = function setProperty(key, value) {
  var tagKey = propertyMap.findByTag(key);
  if (tagKey) key = tagKey.key;
  this.properties[key] = coerce[dataTypes[key] || 'unknown'](value);

  return this;
};

M3U.prototype.addItem = function addItem(item) {
  this.items[item.constructor.name].push(item);

  return this;
};

M3U.prototype.addPlaylistItem = function addPlaylistItem(data) {
  this.items.PlaylistItem.push(M3U.PlaylistItem.create(data));
};

M3U.prototype.removePlaylistItem = function removePlaylistItem(index) {
  if (index < this.items.PlaylistItem.length && index >= 0){
    this.items.PlaylistItem.splice(index, 1);
  } else {
    throw new RangeError('M3U PlaylistItem out of range');
  }
};

M3U.prototype.addMediaItem = function addMediaItem(data) {
  this.items.MediaItem.push(M3U.MediaItem.create(data));
};

M3U.prototype.addStreamItem = function addStreamItem(data) {
  this.items.StreamItem.push(M3U.StreamItem.create(data));
};

M3U.prototype.addIframeStreamItem = function addIframeStreamItem(data) {
  this.items.IframeStreamItem.push(M3U.IframeStreamItem.create(data));
};

M3U.prototype.domainDurations = function domainDurations() {
  var index = 0;
  return this.items.PlaylistItem.reduce(function(duration, item) {
    if (item.get('discontinuity')) {
      index = duration.push(0) - 1;
    }

    duration[index] += item.get('duration');
    return duration;
  }, [0]);
};

M3U.prototype.totalDuration = function totalDuration() {
  return this.items.PlaylistItem.reduce(function(duration, item) {
    return duration + item.get('duration');
  }, 0);
};

M3U.prototype.merge = function merge(m3u) {
  if (m3u.get('targetDuration') > this.get('targetDuration')) {
    this.set('targetDuration', m3u.get('targetDuration'));
  }
  m3u.items.PlaylistItem[0].set('discontinuity', true);
  this.items.PlaylistItem = this.items.PlaylistItem.concat(m3u.items.PlaylistItem);

  return this;
};

M3U.prototype.toString = function toString() {
  var self   = this;
  var output = ['#EXTM3U'];
  Object.keys(this.properties).forEach(function(key) {
    var tagKey = propertyMap.findByKey(key);
    var tag = tagKey ? tagKey.tag : key;

    if (dataTypes[key] == 'boolean') {
      output.push('#' + tag);
    } else {
      output.push('#' + tag + ':' + self.get(key));
    }
  });

  if (this.items.PlaylistItem.length) {
    output.push(this.items.PlaylistItem.map(itemToString).join('\n'));

    if (this.get('playlistType') === 'VOD') {
      output.push('#EXT-X-ENDLIST');
    }
  } else {
    if (this.items.StreamItem.length) {
      output.push(this.items.StreamItem.map(itemToString).join('\n') + '\n');
    }
    if (this.items.IframeStreamItem.length) {
      output.push(this.items.IframeStreamItem.map(itemToString).join('\n') + '\n');
    }
    if (this.items.MediaItem.length) {
      output.push(this.items.MediaItem.map(itemToString).join('\n') + '\n');
    }
  }

  return output.join('\n') + '\n';
};

M3U.prototype.serialize = function serialize() {
  var object = { properties: this.properties, items: {} };
  var self   = this;
  Object.keys(this.items).forEach(function(constructor) {
    object.items[constructor] = self.items[constructor].map(serializeItem);
  });
  return object;
};

M3U.unserialize = function unserialize(object) {
  var m3u = new M3U;
  m3u.properties = object.properties;
  Object.keys(object.items).forEach(function(constructor) {
    m3u.items[constructor] = object.items[constructor].map(
      Item.unserialize.bind(null, M3U[constructor])
    );
  });
  return m3u;
};

function itemToString(item) {
  return item.toString();
}

function serializeItem(item) {
  return item.serialize();
}

var coerce = {
  boolean: function coerceBoolean(value) {
    return true;
  },
  integer: function coerceInteger(value) {
    return parseInt(value, 10);
  },
  unknown: function coerceUnknown(value) {
    return value;
  }
};

var dataTypes = {
  iframesOnly    : 'boolean',
  targetDuration : 'integer',
  mediaSequence  : 'integer',
  version        : 'integer'
};

var propertyMap = [
  { tag: 'EXT-X-ALLOW-CACHE',    key: 'allowCache' },
  { tag: 'EXT-X-I-FRAMES-ONLY',  key: 'iframesOnly' },
  { tag: 'EXT-X-MEDIA-SEQUENCE', key: 'mediaSequence' },
  { tag: 'EXT-X-PLAYLIST-TYPE',  key: 'playlistType' },
  { tag: 'EXT-X-TARGETDURATION', key: 'targetDuration' },
  { tag: 'EXT-X-VERSION',        key: 'version' }
];

propertyMap.findByTag = function findByTag(tag) {
  return propertyMap[propertyMap.map(function(tagKey) {
    return tagKey.tag;
  }).indexOf(tag)];
};

propertyMap.findByKey = function findByKey(key) {
  return propertyMap[propertyMap.map(function(tagKey) {
    return tagKey.key;
  }).indexOf(key)];
};
