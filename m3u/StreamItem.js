var StreamItem = module.exports = function StreamItem() {
  this.attributes = {
    uri       : null,
    bandwidth : null
  };
};

StreamItem.prototype.uri = StreamItem.prototype.URI = function setUri(uri) {
  this.attributes.uri = uri;
};

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