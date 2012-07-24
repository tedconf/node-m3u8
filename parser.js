var Stream = require('stream');

var intValues    = ['EXT-X-TARGETDURATION', 'EXT-X-VERSION', 'EXT-X-MEDIA-SEQUENCE'];
var stringValues = ['EXT-X-PLAYLIST-TYPE'];

var keyMap = {
  'EXT-X-TARGETDURATION' : 'targetDuration',
  'EXT-X-VERSION'        : 'version',
  'EXT-X-MEDIA-SEQUENCE' : 'mediaSequence',
  'EXT-X-PLAYLIST-TYPE'  : 'playlistType'
};

var m3uParser = module.exports = function m3uParser() {
  Stream.apply(this);
  this.writable = true;
  this.readable = true;

  this.bufferedLine = null;
  this.lines = [];
  this.m3u = {
    items: []
  };
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
  console.log(this.m3u);
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
    if (line == '#EXT-X-ENDLIST') return true;
    if (line.indexOf('#') == 0) {
      this.parseLine(line);
    } else {
      if (this.currentItem.file != undefined) {
        this.m3u.items.push({});
        this.currentItem = this.m3u.items[this.m3u.items.length - 1];
      }
      this.currentItem.file = line;
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

m3uParser.prototype['EXTINF'] = function parseInf(data) {
  this.m3u.items.push({});
  this.currentItem = this.m3u.items[this.m3u.items.length - 1];

  data = data.split(',');
  this.currentItem.duration = parseFloat(data[0]);
  this.currentItem.title    = data[1];
};

m3uParser.prototype['EXT-X-BYTERANGE'] = function parseByteRange(data) {
  data = data.split('@');
  this.currentItem.byteLength = parseInt(data[0], 10);
  this.currentItem.byteOffset = parseInt(data[1], 10);
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