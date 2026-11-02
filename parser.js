var util = require('util'),
    Writable = require('stream').Writable,
    StringDecoder = require('string_decoder').StringDecoder,
    M3U = require('./m3u'),
    PlaylistItem = require('./m3u/PlaylistItem'),
    StreamItem = require('./m3u/StreamItem'),
    IframeStreamItem = require('./m3u/IframeStreamItem'),
    MediaItem = require('./m3u/MediaItem');

// used for splitting strings by commas not within double quotes
var NON_QUOTED_COMMA = /,(?=(?:[^"]|"[^"]*")*$)/;

var m3uParser = module.exports = function m3uParser() {
  Writable.call(this, { decodeStrings: false });

  this.decoder = new StringDecoder('utf8');
  this.buffer = '';
  this.linesRead = 0;
  this.m3u = new M3U;
};

util.inherits(m3uParser, Writable);

m3uParser.M3U = M3U;

m3uParser.createStream = function() {
  return new m3uParser;
};

m3uParser.prototype._write = function _write(chunk, encoding, callback) {
  this.buffer += typeof chunk == 'string' ? chunk : this.decoder.write(chunk);
  var lines = this.buffer.split('\n');
  this.buffer = lines.pop();
  lines.forEach(this.parse, this);
  callback();
};

m3uParser.prototype._final = function _final(callback) {
  var rest = this.buffer + this.decoder.end();
  this.buffer = '';
  if (rest) {
    this.parse(rest);
  }
  this.emit('m3u', this.m3u);
  callback();
};

m3uParser.prototype.parse = function parse(line) {
  line = line.trim();
  if (this.linesRead == 0) {
    if (line != '#EXTM3U') {
      return this.emit('error', new Error(
        'Non-valid M3U file. First line: ' + line
      ));
    }
    this.linesRead++;
    return true;
  }
  switch(['#EXT-X-ENDLIST', ''].indexOf(line)) {
    case 0:
      this.m3u.set('playlistType', 'VOD');
    case 1:
      return true;
  }
  if (line.indexOf('#') == 0) {
    this.parseLine(line);
  } else {
    if (this.currentItem.attributes.uri != undefined) {
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
  if (this.playlistDiscontinuity) {
    item.set('discontinuity', true);
    this.playlistDiscontinuity = false;
  }
  if (this.programDateTime) {
    item.set('date', this.programDateTime);
    this.programDateTime = null;
  }
  if (this.map) {
    item.set('map', this.map.uri);
    item.set('mapByteRange', this.map.byteRange);
  }
  return item;
};

m3uParser.prototype['EXTINF'] = function parseInf(data) {
  this.addPlaylistItem();

  data = data.split(',');
  this.currentItem.set('duration', parseFloat(data[0]));
  this.currentItem.set('title', data[1]);
};

m3uParser.prototype['EXT-X-DISCONTINUITY'] = function parseDiscontinuity() {
  this.playlistDiscontinuity = true;
};

m3uParser.prototype['EXT-X-PROGRAM-DATE-TIME'] = function parseProgramDateTime(data) {
  this.programDateTime = data;
};

m3uParser.prototype['EXT-X-MAP'] = function parseMap(data) {
  var attributes = {};
  this.parseAttributes(data).forEach(function(attribute) {
    attributes[attribute.key.toUpperCase()] = unquote(attribute.value);
  });
  if (attributes.URI === undefined) {
    return;
  }
  this.map = {
    uri       : attributes.URI,
    byteRange : attributes.BYTERANGE || null
  };
};

m3uParser.prototype['EXT-X-BYTERANGE'] = function parseByteRange(data) {
  this.currentItem.set('byteRange', data);
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

function unquote(value) {
  if (typeof value == 'string' && /^".*"$/.test(value)) {
    return value.slice(1, -1);
  }
  return value;
}
