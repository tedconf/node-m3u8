var M3U = module.exports = function M3U() {
  this.items = {
    PlaylistItem: [],
    StreamItem: [],
    IframeStreamItem: [],
    MediaItem: []
  };
};

M3U.prototype.uri = function setUri(uri) {
  this.attributes.uri = uri;
};

M3U.prototype.byteLength = function byteLength(value) {
  this.attributes.byteLength = parseInt(value, 10);
};

M3U.prototype.byteOffset = function byteOffset(value) {
  this.attributes.byteOffset = parseInt(value, 10);
};

M3U.prototype.duration = function duration(duration) {
  this.attributes.duration = parseFloat(duration);
};

M3U.prototype.title = function title(title) {
  this.attributes.title = title || '';
};

M3U.prototype.toString = function toString() {
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