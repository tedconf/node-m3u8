var util = require('util'),
    Item = require('./Item');

var MediaItem = module.exports = function MediaItem() {
  Item.call(this);
  this.attributes = {
    groupId    : null,
    name       : null,
    autoselect : false,
    default    : false,
    forced     : false,
    type       : null
  };
};

util.inherits(MediaItem, Item);

MediaItem.prototype['GROUP-ID'] = function(value) {
  this.attributes.groupId = value;
};

MediaItem.prototype.NAME = function(value) {
  this.attributes.name = value;
};

MediaItem.prototype.TYPE = function(value) {
  this.attributes.type = value;
};

MediaItem.prototype.LANGUAGE = function(value) {
  this.attributes.language = value;
};

MediaItem.prototype.AUTOSELECT = function(value) {
  this.attributes.autoselect = value == 'YES' ? true : false;
};

MediaItem.prototype.DEFAULT = function(value) {
  this.attributes.default = value == 'YES' ? true : false;
};

MediaItem.prototype.FORCED = function(value) {
  this.attributes.forced = value == 'YES' ? true : false;
};