var M3U    = require('../m3u'),
    sinon  = require('sinon'),
    should = require('should');

describe('m3u', function() {
  describe('#set', function() {
    it('should set property on m3u', function() {
      var m3u = getM3u();

      m3u.set('EXT-X-I-FRAMES-ONLY', true);
      m3u.properties.iframesOnly.should.be.true;
    });
  });
  describe('#get', function() {
    it('should get property from m3u', function() {
      var m3u = getM3u();

      m3u.properties.version = 4;
      m3u.get('version').should.eql(4);
    });
  });
  describe('#addItem', function() {
    it('should add item to typed array', function() {
      var m3u = getM3u();

      m3u.items.PlaylistItem.length.should.eql(0);
      m3u.addItem(new M3U.PlaylistItem);
      m3u.items.PlaylistItem.length.should.eql(1);
    });
  });
  describe('#addPlaylistItem', function() {
    it('should create and add a PlaylistItem', function() {
      var m3u = getM3u();

      m3u.addPlaylistItem({});
      m3u.items.PlaylistItem.length.should.eql(1);
    });
  });
  describe('#addMediaItem', function() {
    it('should create and add a MediaItem', function() {
      var m3u = getM3u();

      m3u.addMediaItem({});
      m3u.items.MediaItem.length.should.eql(1);
    });
  });
  describe('#addStreamItem', function() {
    it('should create and add a StreamItem', function() {
      var m3u = getM3u();

      m3u.addStreamItem({});
      m3u.items.StreamItem.length.should.eql(1);
    });
  });
  describe('#addIframeStreamItem', function() {
    it('should create and add a IframeStreamItem', function() {
      var m3u = getM3u();

      m3u.addIframeStreamItem({});
      m3u.items.IframeStreamItem.length.should.eql(1);
    });
  });
  describe('#totalDuration', function() {
    it('should total duration of every PlaylistItem', function() {
      var m3u = getM3u();

      m3u.addPlaylistItem({ duration: 10 });
      m3u.addPlaylistItem({ duration: 4.5 });
      m3u.addPlaylistItem({ duration: 45 });
      m3u.totalDuration().should.eql(59.5);
    });
  });
  describe('#merge', function() {
    it('should merge PlaylistItems from two m3us, creating a discontinuity', function() {
      var m3u1 = getM3u();

      m3u1.addPlaylistItem({});
      m3u1.addPlaylistItem({});
      m3u1.addPlaylistItem({});

      var m3u2 = getM3u();
      m3u2.addPlaylistItem({});
      m3u2.addPlaylistItem({});

      var itemWithDiscontinuity = m3u2.items.PlaylistItem[0];
      m3u1.merge(m3u2);
      itemWithDiscontinuity.get('discontinuity').should.be.true;
      m3u1.items.PlaylistItem.filter(function(item) {
        return item.get('discontinuity');
      }).length.should.eql(1);
    });
  });
});

function getM3u() {
  var m3u = M3U.create();

  return m3u;
}
