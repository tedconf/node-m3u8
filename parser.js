var util = require('util'),
    Writable = require('stream').Writable,
    StringDecoder = require('string_decoder').StringDecoder,
    M3U = require('./m3u'),
    PlaylistItem = require('./m3u/PlaylistItem'),
    StreamItem = require('./m3u/StreamItem'),
    IframeStreamItem = require('./m3u/IframeStreamItem'),
    MediaItem = require('./m3u/MediaItem'),
    AttributeList = require('./m3u/AttributeList');

// used for splitting strings by commas not within double quotes
var NON_QUOTED_COMMA = /,(?=(?:[^"]|"[^"]*")*$)/;

var m3uParser = module.exports = function m3uParser() {
  Writable.call(this);

  this.decoder = new StringDecoder('utf8');
  this.buffer = '';
  this.linesRead = 0;
  this.pending = {};
  this.m3u = new M3U;
};

util.inherits(m3uParser, Writable);

m3uParser.M3U = M3U;

m3uParser.createStream = function() {
  return new m3uParser;
};

m3uParser.prototype._write = function _write(chunk, encoding, callback) {
  this.buffer += this.decoder.write(chunk);
  var lines = this.buffer.split('\n');
  this.buffer = lines.pop();
  try {
    lines.forEach(this.parse, this);
  } catch (error) {
    return callback(error);
  }
  callback();
};

m3uParser.prototype._final = function _final(callback) {
  var rest = this.buffer + this.decoder.end();
  this.buffer = '';
  try {
    if (rest) {
      this.parse(rest);
    }
  } catch (error) {
    return callback(error);
  }
  if (this.linesRead == 0) {
    return callback(new Error('Non-valid M3U file. First line: '));
  }
  this.emit('m3u', this.m3u);
  this.emit('end');
  callback();
};

m3uParser.prototype.parse = function parse(line) {
  line = line.trim();
  if (this.linesRead == 0) {
    if (line != '#EXTM3U') {
      throw new Error('Non-valid M3U file. First line: ' + line);
    }
    this.linesRead++;
    return true;
  }
  switch(['#EXT-X-ENDLIST', ''].indexOf(line)) {
    case 0:
      this.m3u.set('endlist', true);
      if (this.m3u.get('playlistType') == null) {
        this.m3u.set('playlistType', 'VOD');
      }
    case 1:
      return true;
  }
  if (line.indexOf('#') == 0) {
    this.parseLine(line);
  } else {
    if (this.currentItem.get('uri') != null) {
      this.addPlaylistItem();
    }
    this.currentItem.set('uri', line);
    this.emit('item', this.currentItem);
  }
  this.linesRead++;
};

m3uParser.prototype.parseLine = function parseLine(line) {
  var parts = line.slice(1).split(/:(.*)/);
  var tag   = parts[0];
  var data  = parts[1];
  if (/^EXT/.test(tag) && typeof this[tag] == 'function') {
    this[tag](data, tag);
  } else {
    this.m3u.set(tag, data === undefined ? null : data);
  }
};

m3uParser.prototype.addItem = function addItem(item) {
  this.m3u.addItem(item);
  this.currentItem = item;
  return item;
};

m3uParser.prototype.addPlaylistItem = function addPlaylistItem() {
  var item = this.addItem(new PlaylistItem);
  var pending = this.pending;
  this.pending = {};
  Object.keys(pending).forEach(function(key) {
    item.set(key, pending[key]);
  });
  if (this.map) {
    item.set('map', this.map.uri);
    item.set('mapByteRange', this.map.byteRange);
    item.set('mapKeys', this.map.keys);
  }
  if (this.keys) {
    item.set('keys', this.keys);
  }
  return item;
};

m3uParser.prototype.setSegmentProperty = function setSegmentProperty(key, value) {
  var item = this.pendingPlaylistItem();
  if (item) {
    item.set(key, value);
  } else {
    this.pending[key] = value;
  }
};

m3uParser.prototype.pendingPlaylistItem = function pendingPlaylistItem() {
  var item = this.currentItem;
  if (item instanceof PlaylistItem && item.get('uri') == null) {
    return item;
  }
};

m3uParser.prototype['EXTINF'] = function parseInf(data) {
  var duration = parseFloat(data);
  if (!isFinite(duration)) {
    throw new Error('EXTINF without a valid duration: ' + data);
  }
  this.addPlaylistItem();

  data = data.split(/,(.*)/);
  this.currentItem.set('duration', duration);
  this.currentItem.set('title', data[1]);
};

m3uParser.prototype['EXT-X-DISCONTINUITY'] = function parseDiscontinuity() {
  this.setSegmentProperty('discontinuity', true);
};

m3uParser.prototype['EXT-X-PROGRAM-DATE-TIME'] = function parseProgramDateTime(data) {
  this.setSegmentProperty('date', data);
};

m3uParser.prototype['EXT-X-BYTERANGE'] = function parseByteRange(data) {
  this.setSegmentProperty('byteRange', data);
};

m3uParser.prototype['EXT-X-MAP'] = function parseMap(data) {
  var attributes = new AttributeList(this.parseAttributes(data));
  if (attributes.get('uri') == null) {
    return;
  }
  this.map = {
    uri       : attributes.get('uri'),
    byteRange : attributes.get('byterange') || null,
    keys      : this.keys ? this.keys.slice() : []
  };
  var item = this.pendingPlaylistItem();
  if (item) {
    item.set('map', this.map.uri);
    item.set('mapByteRange', this.map.byteRange);
    item.set('mapKeys', this.map.keys);
  }
};

m3uParser.prototype['EXT-X-KEY'] = function parseKey(data) {
  var attributes = new AttributeList(this.parseAttributes(data));
  var format = attributes.get('keyformat') || 'identity';
  this.keys = attributes.get('method') === 'NONE' ? [] : (this.keys || []).filter(function(key) {
    var existing = new AttributeList(this.parseAttributes(key));
    return (existing.get('keyformat') || 'identity') !== format;
  }, this);
  if (attributes.get('method') !== 'NONE') this.keys.push(data);
  var item = this.pendingPlaylistItem();
  if (item) {
    item.set('keys', this.keys);
  }
};

m3uParser.prototype['EXT-X-STREAM-INF'] = function(data) {
  this.addItem(new StreamItem(this.parseAttributes(data)));
};

m3uParser.prototype['EXT-X-I-FRAME-STREAM-INF'] = function(data) {
  this.addItem(new IframeStreamItem(this.parseAttributes(data)));
  this.emit('item', this.currentItem);
};

m3uParser.prototype['EXT-X-MEDIA'] = function(data) {
  this.addItem(new MediaItem(this.parseAttributes(data)));
  this.emit('item', this.currentItem);
};

m3uParser.prototype.parseAttributes = function parseAttributes(data) {
  if (typeof data != 'string') {
    return [];
  }
  data = data.split(NON_QUOTED_COMMA);
  return data.map(function(attribute) {
    var keyValue = attribute.split(/=(.+)/).map(function(str) {
      return str.trim();
    });
    return {
      key   : keyValue[0],
      value : keyValue[1]
    };
  });
};
