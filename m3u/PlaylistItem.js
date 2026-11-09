var util = require('util'),
    Item = require('./Item'),
    AttributeList = require('./AttributeList');

var PlaylistItem = module.exports = function PlaylistItem() {
  Item.call(this);
  this.properties.map = null;
  this.properties.mapKeys = null;
  this.properties.mapByteRange = null;
  this.properties.keys = null;
};

util.inherits(PlaylistItem, Item);

PlaylistItem.create = function createPlaylistItem(data) {
  var item = new PlaylistItem();
  item.setData(data);
  return item;
};

PlaylistItem.prototype.toString = function toString(includeMap, includeKeys, previousKeys) {
  var output = [];
  if (this.get('discontinuity')) {
    output.push('#EXT-X-DISCONTINUITY');
  }
  if (includeMap !== false && this.get('map') != null) {
    var mapKeys = this.get('mapKeys');
    if (mapKeys == null) mapKeys = this.get('keys');
    if ((mapKeys && mapKeys.length) || (previousKeys && previousKeys.length)) {
      output.push.apply(output, formatKeys(mapKeys, true, previousKeys));
    }
    previousKeys = mapKeys;
    output.push(this.mapTag());
    includeKeys = JSON.stringify(mapKeys || []) !== JSON.stringify(this.get('keys') || []);
  }
  if (includeKeys !== false) {
    output.push.apply(output, this.keyTags(includeKeys === true, previousKeys));
  }
  if (this.get('date')) {
    var date = this.get('date');
    if (date.getMonth) {
      date = date.toISOString();
    }
    output.push('#EXT-X-PROGRAM-DATE-TIME:' + date);
  }
  if (this.get('daiPlacementOpportunity')) {
    output.push('#EXT-X-PLACEMENT-OPPORTUNITY');
  }
  if (this.get('duration') != null || this.get('title') != null) {
    output.push(
      '#EXTINF:' + [this.get('duration').toFixed(4), this.get('title')].join(',')
    );
  }
  if (this.get('byteRange') != null) {
    output.push('#EXT-X-BYTERANGE:' + this.get('byteRange'));
  }
  output.push(this.get('uri'));

  return output.join('\n');
};

PlaylistItem.prototype.keyTags = function keyTags(clearIfNone, previousKeys) {
  var keys = this.get('keys');
  return formatKeys(keys, clearIfNone, previousKeys);
};

function formatKeys(keys, clearIfNone, previousKeys) {
  if (keys == null || keys.length === 0) {
    return clearIfNone ? ['#EXT-X-KEY:METHOD=NONE'] : [];
  }
  var formats = keys.map(keyFormat);
  var removedFormat = (previousKeys || []).some(function(key) {
    return formats.indexOf(keyFormat(key)) === -1;
  });
  var tags = keys.map(function(key) {
    return '#EXT-X-KEY:' + key;
  });
  return removedFormat ? ['#EXT-X-KEY:METHOD=NONE'].concat(tags) : tags;
}

function keyFormat(key) {
  return new AttributeList(AttributeList.parse(key)).get('keyformat') || 'identity';
}

PlaylistItem.prototype.mapTag = function mapTag() {
  var tag = '#EXT-X-MAP:URI="' + this.get('map') + '"';
  if (this.get('mapByteRange') != null) {
    tag += ',BYTERANGE="' + this.get('mapByteRange') + '"';
  }
  return tag;
};
