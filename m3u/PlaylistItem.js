var util = require('util'),
    Item = require('./Item');

var PlaylistItem = module.exports = function PlaylistItem() {
  Item.call(this);
  this.attributes = {
    duration : null,
    title    : null,
    uri      : null
  };
};

util.inherits(PlaylistItem, Item);

PlaylistItem.prototype.byteLength = function byteLength(value) {
  this.attributes.byteLength = parseInt(value, 10);
};

PlaylistItem.prototype.byteOffset = function byteOffset(value) {
  this.attributes.byteOffset = parseInt(value, 10);
};

PlaylistItem.prototype.duration = function duration(duration) {
  this.attributes.duration = parseFloat(duration);
};

PlaylistItem.prototype.title = function title(title) {
  this.attributes.title = title || '';
};

PlaylistItem.prototype.toString = function toString() {
  var output = [];
  if (this.attributes.duration != null || this.attributes.title != null) {
    output.push('#EXTINF:' + [this.attributes.duration, this.attributes.title].join(','));
  }
  if (this.attributes.byteLength != null) {
    output.push('#EXT-X-BYTERANGE:' + [this.attributes.byteLength, this.attributes.byteOffset].join('@'));
  }
  output.push(this.attributes.uri);

  return output.join('\n');
};