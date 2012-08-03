var util = require('util'),
    Item = require('./Item');

var StreamItem = module.exports = function StreamItem() {
  Item.call(this);
  this.mergeAttributes({
    bandwidth : null,
    programId : null
  });
};

util.inherits(StreamItem, Item);

StreamItem.prototype['PROGRAM-ID'] = function(value) {
  this.attributes.programId = parseInt(value, 10);
};

StreamItem.prototype.BANDWIDTH = function(value) {
  this.attributes.bandwidth = parseInt(value, 10);
};

StreamItem.prototype.RESOLUTION = function(value) {
  var dimensions = value.split('x');
  this.attributes.resolution = [parseInt(dimensions[0], 10), parseInt(dimensions[1], 10)];
};

StreamItem.prototype.CODECS = function(value) {
  this.attributes.codecs = value.split(',');
};

StreamItem.prototype.AUDIO = function(value) {
  this.attributes.audio = value;
};

StreamItem.prototype.SUBTITLES = function(value) {
  this.attributes.subtitles = value;
};

StreamItem.prototype.toString = function toString() {
  var output = [];
  output.push('#EXT-X-STREAM-INF:' + this.attributesToString());
  output.push(this.attributes.uri);

  return output.join('\n');
};