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
  if (this.get('cueout')) {
    var duration = this.get('cueout');
    output.push('#EXT-X-CUE-OUT:DURATION=' + duration);
  }
  if (this.get('cueoutcont')) {
    var cueOutCont = this.get('cueoutcont');
    output.push('#EXT-X-CUE-OUT-CONT:' + cueOutCont.offset + "/" + cueOutCont.duration);
  }
  if (this.get('cuein')) {
    output.push('#EXT-X-CUE-IN');
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
  if (this.get('daterange') != null) {
    var attr = this.get('daterange');
    var s = Object.keys(attr).map(function(key) {
      if (attr['CLASS'] === "com.apple.hls.interstitial" && (key === 'X-RESUME-OFFSET' || key === 'X-PLAYOUT-LIMIT')) {
        // The CLASS=com.apple.hls.interstitial has some daterange attributes
        // that are not quoted strings
        return key + "=" + `${attr[key]}`;
      } else {
        return key + "=" + `"${attr[key]}"`;
      }
    }).join(',');
    output.push('#EXT-X-DATERANGE:' + s);
  }
  if (this.get('duration') != null || this.get('title') != null) {
    output.push(
      '#EXTINF:' + [this.get('duration').toFixed(4), this.get('title')].join(',')
    );
  }
  if (this.get('byteRange') != null) {
    output.push('#EXT-X-BYTERANGE:' + this.get('byteRange'));
  }
  if(this.get('uri')) {
    output.push(this.get('uri'));
  }

  return output.join('\n');
};
