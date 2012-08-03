var Stream = require('stream'),
    M3U = require('./m3u'),
    PlaylistItem = require('./m3u/PlaylistItem'),
    StreamItem = require('./m3u/StreamItem'),
    IframeStreamItem = require('./m3u/IframeStreamItem')
    MediaItem = require('./m3u/MediaItem');

var intValues    = ['EXT-X-TARGETDURATION', 'EXT-X-VERSION', 'EXT-X-MEDIA-SEQUENCE'];
var stringValues = ['EXT-X-PLAYLIST-TYPE'];

var keyMap = {
  'EXT-X-TARGETDURATION' : 'targetDuration',
  'EXT-X-VERSION'        : 'version',
  'EXT-X-MEDIA-SEQUENCE' : 'mediaSequence',
  'EXT-X-PLAYLIST-TYPE'  : 'playlistType'
};

// used for splitting strings by commas not within double quotes
var NON_QUOTED_COMMA = /,(?=(?:[^"]|"[^"]*")*$)/;

var m3uParser = module.exports = function m3uParser() {
  Stream.apply(this);
  this.writable = true;
  this.readable = true;

  this.bufferedLine = null;
  this.lines = [];
  this.m3u = new M3U;
};

m3uParser.prototype = Object.create(
  Stream.prototype,
  { constructor: { value: m3uParser } }
);

m3uParser.createStream = function() {
  return new m3uParser;
};

m3uParser.prototype.write = function(data) {
  this.emit('data', data);
  this.parse(data.toString());
  return true;
};

m3uParser.prototype.end = function() {
  this.parse(this.bufferedLine);
  console.log(this.m3u.items);
};

m3uParser.prototype.parse = function parse(data) {
  var lines = data.split('\n');
  lines[0] = (this.bufferedLine || '') + lines[0];
  this.bufferedLine = lines.pop();

  this.lines = this.lines.concat(lines.map(function(line) {
    return line.trim();
  }));

  while (this.lines.length) {
    var line = this.lines.shift();
    this.emit('line', line);
    if (['', '#EXT-X-ENDLIST'].indexOf(line) > -1) return true;
    if (line.indexOf('#') == 0) {
      this.parseLine(line);
    } else {
      if (this.currentItem.attributes.uri != undefined) {
        this.addItem(new PlaylistItem);
      }
      this.currentItem.uri(line);
      this.emit('item', this.currentItem);
    }
  }
};

m3uParser.prototype.parseLine = function parseLine(line) {
  var parts   = line.slice(1).split(':');
  var command = parts[0];
  var data    = parts[1];
  if (typeof this[command] == 'function') {
    this[command](data, command);
  }
};

m3uParser.prototype.addItem = function addItem(item) {
  this.m3u.items[item.constructor.name].push(item);
  this.currentItem = item;
  return item;
};

m3uParser.prototype['EXTINF'] = function parseInf(data) {
  this.addItem(new PlaylistItem);

  data = data.split(',');
  this.currentItem.duration(data[0]);
  this.currentItem.title(data[1]);
};

m3uParser.prototype['EXT-X-STREAM-INF'] = function parseStreamInf(data) {
  this.addItem(new StreamItem);

  data = data.split(NON_QUOTED_COMMA);
  var self = this;
  data.forEach(function(attribute) {
    var keyValue = attribute.split('=');
    if (typeof self.currentItem[keyValue[0]] == 'function') {
      self.currentItem[keyValue[0]](keyValue[1]);
    }
  });
};

m3uParser.prototype['EXT-X-I-FRAMES-ONLY'] = function iframesOnly() {
  this.m3u.iframesOnly = true;
};

m3uParser.prototype['EXT-X-I-FRAME-STREAM-INF'] = function parseIFrameStreamInf(data) {
  this.addItem(new IframeStreamItem);

  data = data.split(NON_QUOTED_COMMA);
  var self = this;
  data.forEach(function(keyValue) {
    keyValue = keyValue.split('=');
    if (typeof self.currentItem[keyValue[0]] == 'function') {
      self.currentItem[keyValue[0]](keyValue[1]);
    }
  });
};

m3uParser.prototype['EXT-X-MEDIA'] = function parseMedia(data) {
  this.addItem(new MediaItem);

  data = data.split(NON_QUOTED_COMMA);
  var self = this;
  data.forEach(function(keyValue) {
    keyValue = keyValue.split('=');
    if (typeof self.currentItem[keyValue[0]] == 'function') {
      self.currentItem[keyValue[0]](keyValue[1]);
    }
  });
};

m3uParser.prototype['EXT-X-BYTERANGE'] = function parseByteRange(data) {
  data = data.split('@');
  this.currentItem.byteLength(data[0]);
  this.currentItem.byteOffset(data[1]);
};

intValues.forEach(function(value) {
  m3uParser.prototype[value] = function parseIntValue(data, key) {
     this.m3u[keyMap[value]] = parseInt(data, 10);
  };
});

stringValues.forEach(function(value) {
  m3uParser.prototype[value] = function parseStringValue(data) {
    this.m3u[keyMap[value]] = data;
  };
});

var test = m3uParser.createStream();

var fs = require('fs');
//var file = fs.createReadStream('/Users/bog/Work/TED/iOS/Streaming/subtitles/public/ab/hls_600k_video.m3u8');
var file = fs.createReadStream('/Users/bog/Downloads/hls-lang.m3u8');

file.pipe(test);