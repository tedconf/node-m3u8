var util = require('util');

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
  if (index < this.items.PlaylistItem.length && index >= 0) {
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

M3U.prototype.slice = function slice(start, end) {
  var m3u = this.clone();

  if (start == null && end == null) {
    return m3u;
  }

  var len = m3u.items.PlaylistItem.length;

  start = !start || start < 0 ? 0 : start;
  if (end == null || end > len) {
    end = len;
  }

  // everytime you slice, the assumption here is to make the outputed playlist look like a VOD
  m3u.set('foundEndlist', true);

  m3u.items.PlaylistItem = m3u.items.PlaylistItem.slice(start, end);

  return m3u;
};

M3U.prototype.sliceSeconds = function slice(from, to) {
  var start = null;
  var end = null;

  var total = 0;

  if (util.isNumber(from) && util.isNumber(to) && from > to) {
    throw 'target `to` value, if truthy, must be greater than the `from` value';
  }

  this.items.PlaylistItem.some(function(item, i) {
    total += item.properties.duration;

    if (total >= from && start == null) {
      start = i;
      if (to == null) {
        return true;
      }
    }

    if (total >= to && end == null) {
      end = i + 1;
      return true;
    }
  });

  return this.slice(start, end);
};

M3U.prototype.sliceDates = function slice(from, to) {
  var start = null;
  var end = null;

  if (!util.isDate(from) && !util.isDate(to)) {
    throw 'sliceDates requires that at least 1 of the arguments to be a Date object';
  }

  if (util.isNumber(from)) {
    from = new Date(to.getTime() - from * 1000);
  } else if (util.isNumber(to)) {
    to = new Date(from.getTime() + to * 1000);
  }

  if (!from) {
    from = new Date(0);
  }

  if (!to) {
    to = new Date();
  }

  if (util.isDate(from) && util.isDate(to) && from > to) {
    throw 'target `to` date value, if available, must be greater than the `from` date value';
  }

  var current;

  this.items.PlaylistItem.some(function(item, i) {
    current = item.properties.date;

    if (!current) {
      throw 'Playlist segment does not have a date field, you must specify EXT-X-PROGRAM-DATE-TIME for each segment in order to sliceDate()';
    }

    if (current >= from && start == null) {
      start = i;
      if (to == null) {
        return true;
      }
    }

    if (current >= to && end == null) {
      end = i;
      return true;
    }
  });

  return this.slice(start, end);
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

    if ((this.get('foundEndlist') && this.get('playlistType') == null) || this.get('playlistType') === 'VOD') {
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

M3U.prototype.clone = function clone() {
  return M3U.unserialize(this.serialize());
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
