var util = require('util'),
    Item = require('./Item');

var PlaylistItem = module.exports = function PlaylistItem() {
  Item.call(this);
};

util.inherits(PlaylistItem, Item);

PlaylistItem.create = function createPlaylistItem(data) {
  var item = new PlaylistItem();
  item.setData(data);
  return item;
};

PlaylistItem.prototype.toString = function toString() {
  var output = [];
  if (this.get('discontinuity')) {
    output.push('#EXT-X-DISCONTINUITY');
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
