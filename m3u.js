var util = {};
util.isNumber = function (n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
};
util.isDate = function (d) {
  return d instanceof Date && !isNaN(d.valueOf());
};

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
  var newItem = M3U.PlaylistItem.create(data);
  this.maybeSetTargetDuration(newItem.get('duration'));
  this.items.PlaylistItem.push(newItem);
};

M3U.prototype.insertPlaylistItemsAfter = function insertPlaylistItemsAfter (newItems, afterItem) {
  var index = this.items.PlaylistItem.length;
  var self = this;

  if (!(afterItem instanceof M3U.PlaylistItem)) {
    afterItem = M3U.PlaylistItem.create(afterItem);
  }

  newItems = [].concat(newItems).map(function(newItem) {
    if (!(newItem instanceof M3U.PlaylistItem)) {
      newItem = M3U.PlaylistItem.create(newItem);
    }
    self.maybeSetTargetDuration(newItem.get('duration'));
    return newItem;
  });

  this.items.PlaylistItem.some(function(item, i) {
    if (item.properties.uri == afterItem.properties.uri) {
      index = i;
      return true;
    }
  });

  this.items.PlaylistItem = this.items.PlaylistItem.slice(0, index + 1).concat(newItems).concat(this.items.PlaylistItem.slice(index + 1));
  this.resetTargetDuration(true);
  return this;
};

M3U.prototype.removePlaylistItem = function removePlaylistItem(index) {
  if (index < this.items.PlaylistItem.length && index >= 0) {
    this.items.PlaylistItem.splice(index, 1);
  } else {
    throw new RangeError('M3U PlaylistItem out of range');
  }
  this.resetTargetDuration(true);
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

// if one is passed in, try it, if none is passed, iterate and find it.
M3U.prototype.resetTargetDuration = function resetTargetDuration (newTargetDuration) {
  var self = this;

  // if you just want to set it to a number, don't use this function, nor maybeSetTargetDuration, just use this.set('targetDuration', Math.round(newTargetDuration))

  if (util.isNumber(newTargetDuration)) {
    this.maybeSetTargetDuration(newTargetDuration);
  } else {
    // force reset, so we set it to 0, this way, the 1st item will set it.
    if (newTargetDuration === true) {
      this.set('targetDuration', 0);
    }
    this.items.PlaylistItem.forEach(function(item) {
      self.maybeSetTargetDuration(item.get('duration'));
    });
  }
  return this.get('targetDuration');
};

M3U.prototype.maybeSetTargetDuration  = function maybeSetTargetDuration (newTargetDuration) {
  // round to nearest integer https://tools.ietf.org/html/draft-pantos-http-live-streaming-19#section-4.3.3.1
  newTargetDuration = Math.round(newTargetDuration);

  if (newTargetDuration > this.get('targetDuration')) {
    this.set('targetDuration', newTargetDuration);
  }
};

M3U.prototype.concat = function concat (m3u) {
  var clone = this.clone();

  if (m3u.items.PlaylistItem[0]) {
    m3u.items.PlaylistItem[0].set('discontinuity', true);
  }

  clone.items.PlaylistItem = clone.items.PlaylistItem.concat(m3u.items.PlaylistItem);

  if (m3u.isVOD()) {
    clone.set('playlistType', 'VOD');
  } else {
    delete clone.properties['playlistType'];
    clone.set('foundEndlist', false);
  }

  clone.resetTargetDuration(m3u.get('targetDuration'));

  return clone;
};

// backward-compatible merge function, that just concats and mutates self
// todo: remove this, since it's really not a merge, it's just a concat()
M3U.prototype.merge = function merge (m3u) {
  var clone = this.concat(m3u);
  this.items.PlaylistItem = clone.items.PlaylistItem;
  this.resetTargetDuration(clone.get('targetDuration'));
  return this;
};

// todo: too O(n^2) too slow - maybe use a hash of URIs
M3U.prototype.mergeByUri = function mergeByUri (m3u) {
  var clone = this.concat(m3u);

  // todo: also, i don't think this is correct
  if (m3u.get('mediaSequence') < clone.get('mediaSequence')) {
    clone.set('mediaSequence', m3u.get('mediaSequence'));
  }
  var uri0 = ((m3u.items.PlaylistItem[0] || {}).properties || {}).uri;

  var segments = clone.items.PlaylistItem;

  for(var i = 0; i < segments.length; ++i) {
    for(var j= i + 1; j < segments.length; ++j) {
      if(segments[i].properties.uri == segments[j].properties.uri) {
        if (uri0 == segments[j].properties.uri) {
          segments[i].set('discontinuity', true);
        }
        segments.splice(j--, 1);
      } else {
        clone.maybeSetTargetDuration(segments[i].get('duration'));
      }
    }
  }

  if (m3u.isVOD()) {
    clone.set('playlistType', 'VOD');
  } else {
    delete clone.properties['playlistType'];
    clone.set('foundEndlist', false);
  }

  return clone;
};

M3U.prototype.mergeByDate = function mergeByDate (m3u, options) {

  var clone = this.clone(m3u);

  options = options || {};

  var len = clone.items.PlaylistItem.length;
  var item0, itemN, dateA0, dateAN, m3uPre, m3uPost;

  if (len) {
    item0 = clone.items.PlaylistItem[0];
    dateA0 = item0.get('date');
    itemN = clone.items.PlaylistItem[clone.items.PlaylistItem.length - 1];
    dateAN = itemN.get('date');
  }

  m3uPre = dateA0 ? m3u.sliceByDate(null, new Date((+new Date(dateA0)))) : M3U.create();
  m3uPost = dateAN ? m3u.sliceByDate(new Date((+new Date(dateAN)) + itemN.get('duration') * 1000)) : M3U.create();

  var gaps = clone.findDateGaps(options);
  gaps.forEach(function(gap) {
    var m3uGap = m3u.sliceByDate(new Date(gap.starts), new Date(gap.ends));

    if (m3uGap.items.PlaylistItem.length) {
      m3uGap.items.PlaylistItem[0] && m3uGap.items.PlaylistItem[0].set('discontinuity', true);
      gap.beforeItem.set('discontinuity', true);
      clone.insertPlaylistItemsAfter(m3uGap.items.PlaylistItem, gap.afterItem);
    }
  });

  if (m3uPre.items.PlaylistItem.length) {
    clone.items.PlaylistItem[0] && clone.items.PlaylistItem[0].set('discontinuity', true);
  }

  if (m3uPost.items.PlaylistItem.length) {
    m3uPost.items.PlaylistItem[0].set('discontinuity', true);
  }

  var result = m3uPre.concat(clone).concat(m3uPost);

  var m3uTail = m3uPost.items.PlaylistItem.length ? m3uPost : clone.items.PlaylistItem.length ? clone : m3uPre;
  if (m3uTail.isVOD()) {
    result.set('playlistType', 'VOD');
  } else {
    delete result.properties['playlistType'];
    result.set('foundEndlist', false);
  }

  return result;
};

M3U.prototype.sortByDate = function sortByDate () {
  if (! this.isDateSupported()) {
    return this;
  }

  this.items.PlaylistItem.sort(function(playlistItem1, playlistItem2) {
    var d1 = playlistItem1.properties.date;
    var d2 = playlistItem2.properties.date;

    return d1 < d2 ? -1 : d1 > d2 ? 1 : 0;
  });

  return this;
};

M3U.prototype.sortByUri = function sortByUri (options) {
  options = options || {};

  this.items.PlaylistItem.sort(function(playlistItem1, playlistItem2) {
    var u1 = playlistItem1.properties.uri;
    var u2 = playlistItem2.properties.uri;

    if (!options.useFullPath) {
      u1 = u1.split('/').pop();
      u2 = u2.split('/').pop();
    }

    return u1 < u2 ? -1 : u1 > u2 ? 1 : 0;
  });
  return this;
};

M3U.prototype.findDateGaps = function findDateGaps (options) {
  options = options || {};
  options.msMargin = options.msMargin == null ? 1500 : options.msMargin;

  var gaps = [];
  var segments = this.items.PlaylistItem;
  var that = this;

  segments.forEach(function(item, i) {
    var itemNext = segments[i + 1];

    var se = itemStartsEnds(item);
    var seNext = itemStartsEnds(itemNext);

    if (seNext && (seNext.starts - se.ends > options.msMargin)) {
      var duration = (seNext.starts - se.ends) / 1000;
      gaps.push({
        index: i + 1,
        starts: se.ends,
        ends: seNext.starts,
        duration: duration,
        approximateMissingItems: duration / that.get('targetDuration'),
        beforeItem: itemNext,
        afterItem: item
      });
    }
  });

  return gaps;
};

M3U.prototype.sliceByIndex = M3U.prototype.slice = function sliceByIndex (start, end) {
  var m3u = this.clone();

  if (start == null && end == null) {
    return m3u;
  }

  var len = m3u.items.PlaylistItem.length;

  start = !start || start < 0 ? 0 : start;
  if (end == null || end > len) {
    end = len;
  }

  if (m3u.isLive()) {
    if (start < len && end < len) {
      // if live and both start & end were within the length of the stream, make it look like a VOD
      m3u.set('playlistType', 'VOD');

    } else if (start > 0 && end == len) {
      /*
          One thing I noticed recently is that if we are implementing a LIVE sliding window, we can't have a `playlistType`, (otherwise Safari refuses to play more than 1 segment)

          https://tools.ietf.org/html/draft-pantos-http-live-streaming-07#page-19
          > the Playlist file MAY contain an EXT-X-PLAYLIST-TYPE tag
          > with a value of either EVENT or VOD.  If the tag is present and has a
          > value of EVENT, the server MUST NOT change or delete any part of the
          > Playlist file (although it MAY append lines to it)

          So, If we slice an m3u and `isLive()` is true, and the `start` value of slicing is greater than 0, then we need to remove the playlistType
       */
      delete m3u.properties['playlistType'];
    }
  }

  var mediaSequence = m3u.get('mediaSequence');
  // assume 1 if it doesn't exists https://tools.ietf.org/html/draft-pantos-http-live-streaming-01#section-3.1.2
  if (!mediaSequence || mediaSequence < 0) {
    mediaSequence = 1;
  }
  m3u.set('mediaSequence', mediaSequence + start);

  m3u.items.PlaylistItem = m3u.items.PlaylistItem.slice(start, end);
  m3u.resetTargetDuration(true);

  return m3u;
};

M3U.prototype.sliceBySeconds = function sliceBySeconds (from, to) {
  var start = null;
  var end = null;

  var total = 0;

  if (util.isNumber(from) && util.isNumber(to) && from > to) {
    throw 'target `to` value, if truthy, must be greater than the `from` value';
  }

  if (!this.items.PlaylistItem.length) {
    return this.sliceByIndex();
  }

  var duration = this.totalDuration();
  if (util.isNumber(from) && from > duration) {
    start = this.items.PlaylistItem.length;
  }

  if (util.isNumber(to) && to <= 0) {
    end = 0;
  }

  var currentIndex = 0;

  this.items.PlaylistItem.some(function(item, i) {
    total += item.properties.duration;
    currentIndex = i;

    if (from != null && total >= from && start == null) { // left-side-inclusive
      start = i;
      if (to == null) {
        return true;
      }
    }

    if (to != null && total >= to && end == null) {
      // we're adding the +1 here to include the current segment,
      // it is still considered exclusive, since the current value here is the total duration, so the end of each segment
      end = i + 1;
      return true;
    }
  });

  return this.sliceByIndex(start, end);
};

M3U.prototype.sliceByDate = function sliceByDate (from, to) {
  var start = null;
  var end = null;

  if (!util.isDate(from) && !util.isDate(to)) {
    throw new Error('at least 1 of the arguments needs to be a Date object');
  }

  if (!this.items.PlaylistItem.length) {
    return this.sliceByIndex();
  }

  if (util.isNumber(from)) {
    from = new Date(to.getTime() - from * 1000);
  } else if (util.isNumber(to)) {
    to = new Date(from.getTime() + to * 1000);
  }

  var firstDate = ((this.items.PlaylistItem[0] || {}).properties || {}).date;
  var lastDate = ((this.items.PlaylistItem[this.items.PlaylistItem.length - 1] || {}).properties || {}).date;

  if (!firstDate || !lastDate) {
    throw new Error('Playlist segments do not look like that they have a valid date fields, you must specify EXT-X-PROGRAM-DATE-TIME for each segment in order to sliceDate(), or set the date on your own using the beforeItemEmit hook when you setup the parser.');
  }

  if (util.isDate(from) && util.isDate(to) && from > to) {
    throw new Error('target `to` date value, if available, must be greater than the `from` date value');
  }

  if (!from) {
    from = new Date(firstDate.getTime() - 1);
  }

  if (!to) {
    to = new Date(lastDate.getTime() + 1);
  }

  if (from > lastDate) {
    start = this.items.PlaylistItem.length;
  }

  if (to <= firstDate) {
    end = 0;
  }

  from = from && from.valueOf ? from.valueOf() : from;
  to = to && to.valueOf ? to.valueOf(): to;

  var currentStart;
  var currentEnd;

  this.items.PlaylistItem.some(function(item, i) {
    currentStart = new Date(item.properties.date);
    currentEnd = new Date(item.properties.date);
    currentEnd.setSeconds(currentStart.getSeconds() + item.properties.duration);

    currentStart = currentEnd.valueOf();
    currentEnd = currentEnd.valueOf();

    if (from != null && currentEnd >= from && start == null) { // right-side-inclusive
      start = currentEnd == from ? i + 1 : i; // still exclude directly behind segment
      if (to == null) {
        return true;
      }
    }

    if (to != null && currentEnd >= to && end == null) {
      // we're adding the +1 here to include the current segment,
      // it is still considered exclusive, since the current = date + duration, so the end of each segment
      end = currentStart >= to ? i + 1 : i;
      return true;
    }
  });

  return this.sliceByIndex(start, end);
};

M3U.prototype.isRangeWithinBounds = function isRangeWithinBounds (unit, from, to) {
  switch (unit) {
    case 'date':
      return this.isRangeWithinDateBounds(from, to);
    case 'seconds':
      return this.isRangeWithinSecondsBounds(from, to);
    case 'index':
      return this.isRangeWithinIndexBounds(from, to);
  }
};

M3U.prototype.isRangeWithinIndexBounds = function isRangeWithinIndexBounds (from, to) {

  var len = this.items.PlaylistItem.length;

  if (!len) {
    return false;
  }

  var left = true;
  var right = true;

  if (from != null) {
    left = !!this.items.PlaylistItem[from];
  }

  if (to != null) {
    right = !!this.items.PlaylistItem[to];
  }

  return left && right;
};

M3U.prototype.isRangeWithinSecondsBounds = function isRangeWithinSecondsBounds (from, to) {

  var len = this.items.PlaylistItem.length;

  if (!len) {
    return false;
  }

  var left = true;
  var right = true;

  if (from != null) {
    left = 0 <= from;
  }

  if (to != null) {
    right = to <= this.totalDuration();
  }

  return left && right;
};

M3U.prototype.isRangeWithinDateBounds = function isRangeWithinDateBounds (from, to) {

  if (!util.isDate(from) && !util.isDate(to)) {
    throw new Error('at least 1 of the arguments needs to be a Date object');
  }

  if (util.isNumber(from)) {
    from = new Date(to.getTime() - from * 1000);
  } else if (util.isNumber(to)) {
    to = new Date(from.getTime() + to * 1000);
  }

  var len = this.items.PlaylistItem.length;

  if (!len) {
    return false;
  }

  var left = true;
  var right = true;

  if (from != null) {
    left = this.items.PlaylistItem[0].properties.date <= from;
  }

  if (to != null) {
    right = this.items.PlaylistItem[len - 1].properties.date <= to;
  }

  return left && right;
};

M3U.prototype.toString = function toString () {
  var self   = this;
  var output = ['#EXTM3U'];

  Object.keys(this.properties).forEach(function(key) {
    var tagKey = propertyMap.findByKey(key);
    var tag = tagKey ? tagKey.tag : key;

    if (toStringIgnoredProperties[key]) {
      return;
    }

    if (dataTypes[key] == 'boolean') {
      output.push('#' + tag);
    } else {
      output.push('#' + tag + ':' + self.get(key));
    }
  });

  if (this.items.PlaylistItem.length) {
    output.push(this.items.PlaylistItem.map(itemToString).join('\n'));

    if (this.isVOD()) {
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


M3U.prototype.isDateSupported = function isDateSupported () {
  var date = ((this.items.PlaylistItem[0] || {}).properties || {}).date;
  return date ? util.isDate(date) : undefined;
};

M3U.prototype.isVOD = function isVOD () {
  return this.get('foundEndlist') || this.get('playlistType') === 'VOD';
};

M3U.prototype.isLive = function isLive () {
  return !this.isVOD();
};

M3U.prototype.isMaster = function isMaster () {
  return !! (this.items.StreamItem.length || this.items.MediaItem.length || this.items.IframeStreamItem.length);
};

M3U.prototype.clone = function clone () {
  return M3U.unserialize(this.serialize());
};

M3U.prototype.toJSON = function toJSON () {
  var object = this.serialize();
  object.properties.totalDuration = this.totalDuration();
  return object;
};

M3U.prototype.serialize = function serialize () {
  var object = { properties: JSON.parse(JSON.stringify(this.properties)), items: {} };

  var self = this;
  Object.keys(this.items).forEach(function(constructor) {
    object.items[constructor] = self.items[constructor].map(serializeItem);
  });
  return object;
};

M3U.unserialize = function unserialize (object) {
  var m3u = new M3U;
  m3u.properties = object.properties;
  delete m3u.properties.totalDuration;

  Object.keys(object.items).forEach(function(constructor) {
    m3u.items[constructor] = object.items[constructor].map(
      Item.unserialize.bind(null, M3U[constructor])
    );
  });
  return m3u;
};

function itemStartsEnds (item) {
  if (!item) {
    return;
  }

  var date = item.get('date');
  if (!util.isDate(date) || !date) {
    throw new Error('Playlist segments do not look like that they have a valid date fields, you must specify EXT-X-PROGRAM-DATE-TIME for each segment in order to sliceDate(), or set the date on your own using the beforeItemEmit hook when you setup the parser.');
  }

  var starts = date.getTime();
  return {
    starts: starts,
    ends: starts + (item.get('duration') * 1000)
  }
}

function itemToString (item) {
  return item.toString();
}

function serializeItem (item) {
  return item.serialize();
}

var coerce = {
  boolean: function coerceBoolean (value) {
    return true;
  },
  integer: function coerceInteger (value) {
    return parseInt(value, 10);
  },
  unknown: function coerceUnknown (value) {
    return value;
  }
};

var toStringIgnoredProperties = {
  foundEndlist    : true
};

var dataTypes = {
  iframesOnly            : 'boolean',
  targetDuration         : 'integer',
  mediaSequence          : 'integer',
  discontinuitySequence  : 'integer',
  version                : 'integer'
};

var propertyMap = [
  { tag: 'EXT-X-ALLOW-CACHE',            key: 'allowCache' },
  { tag: 'EXT-X-I-FRAMES-ONLY',          key: 'iframesOnly' },
  { tag: 'EXT-X-MEDIA-SEQUENCE',         key: 'mediaSequence' },
  { tag: 'EXT-X-DISCONTINUITY-SEQUENCE', key: 'discontinuitySequence' },
  { tag: 'EXT-X-PLAYLIST-TYPE',          key: 'playlistType' },
  { tag: 'EXT-X-TARGETDURATION',         key: 'targetDuration' },
  { tag: 'EXT-X-VERSION',                key: 'version' }
];

propertyMap.findByTag = function findByTag (tag) {
  return propertyMap[propertyMap.map(function(tagKey) {
    return tagKey.tag;
  }).indexOf(tag)];
};

propertyMap.findByKey = function findByKey (key) {
  return propertyMap[propertyMap.map(function(tagKey) {
    return tagKey.key;
  }).indexOf(key)];
};
