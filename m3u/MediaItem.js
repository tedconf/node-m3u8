var util = require('util'),
    Item = require('./Item');

var MediaItem = module.exports = function MediaItem(attributes) {
  Item.apply(this, arguments);

  delete this.properties['uri'];
};

util.inherits(MediaItem, Item);

MediaItem.create = function createMediaItem(data) {
  var item = new MediaItem();
  item.setData(data);
  return item;
};

MediaItem.prototype.toString = function toString() {
  return '#EXT-X-MEDIA:' + this.attributes.toString();
};