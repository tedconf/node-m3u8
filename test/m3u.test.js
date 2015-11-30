var fs     = require('fs'),
    M3U    = require('../m3u'),
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

  describe('#removePlaylistItem', function() {
    it('should remove a PlaylistItem at a specifed index', function() {
      var m3u = getM3u();

      m3u.addPlaylistItem({});
      m3u.removePlaylistItem(0);
      m3u.items.PlaylistItem.length.should.eql(0);
    });
  });

  describe('#removePlaylistItemOutOfRange', function() {
    it('should thow an error when trying to remove a playlist item out of range', function() {
      var m3u = getM3u();

      m3u.addPlaylistItem({});
      m3u.addPlaylistItem({});

      m3u.removePlaylistItem.bind(m3u, 3).should.throw(RangeError);
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

  describe('#domainDurations', function() {
    it('should total durations of every PlaylistItem respecting discontinuity domains', function() {
      var m3u = getM3u();

      m3u.addPlaylistItem({ duration: 10 });
      m3u.addPlaylistItem({ duration: 4.5 });
      m3u.addPlaylistItem({ duration: 45 });
      m3u.items.PlaylistItem[2].set('discontinuity', true);
      m3u.addPlaylistItem({ duration: 45 });
      m3u.addPlaylistItem({ duration: 30 });
      m3u.items.PlaylistItem[4].set('discontinuity', true);
      m3u.addPlaylistItem({ duration: 26 });
      m3u.domainDurations().should.eql([14.5, 90, 56]);
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

    it('should use the largest targetDuration', function() {
      var m3u1 = getM3u();
      m3u1.set('targetDuration', 10);
      m3u1.addPlaylistItem({});

      var m3u2 = getM3u();
      m3u2.set('targetDuration', 11);
      m3u2.addPlaylistItem({});
      m3u1.merge(m3u2);
      m3u1.get('targetDuration').should.eql(11);
    });
  });

  describe('#serialize', function(done) {
    it('should return an object containing items and properties', function(done) {
      getVariantM3U(function(error, m3u) {
        var data = m3u.serialize();
        data.properties.should.eql(m3u.properties);
        data.items.IframeStreamItem.length.should.eql(m3u.items.IframeStreamItem.length);
        data.items.MediaItem.length.should.eql(m3u.items.MediaItem.length);
        data.items.PlaylistItem.length.should.eql(m3u.items.PlaylistItem.length);
        data.items.StreamItem.length.should.eql(m3u.items.StreamItem.length);
        data.items.MediaItem[0].should.eql(m3u.items.MediaItem[0].serialize());

        done();
      });
    });
  });

  describe('unserialize', function() {
    it('should return an M3U object with items and properties', function() {
      var item = new M3U.PlaylistItem({ key: 'uri', value: '/path' });
      var data = {
        properties: {
          targetDuration: 10
        },
        items: {
          PlaylistItem: [ item.serialize() ]
        }
      };
      var m3u = M3U.unserialize(data);
      m3u.properties.should.eql(data.properties);
      item.should.eql(m3u.items.PlaylistItem[0]);
    });
  });

  describe('writeVOD', function() {
    it('should return a string ending with #EXT-X-ENDLIST', function() {
      var m3u1 = getM3u();
      m3u1.set('playlistType', 'VOD');
      m3u1.addPlaylistItem({ duration: 1 });

      var output = m3u1.toString();
      var endStr = '#EXT-X-ENDLIST\n';
      output.indexOf(endStr).should.eql(output.length - endStr.length);
    });
  });

  describe('writeLive', function() {
    it('should return a string not ending with #EXT-X-ENDLIST', function() {
      var m3u1 = getM3u();
      m3u1.addPlaylistItem({});

      var output = m3u1.toString();
      output.indexOf('#EXT-X-ENDLIST\n').should.eql(-1);
    });
  });
});

function getM3u() {
  var m3u = M3U.create();

  return m3u;
}

function getVariantM3U(callback) {
  var parser      = require('../parser').createStream();
  var variantFile = fs.createReadStream(
    __dirname + '/fixtures/variant.m3u8'
  );
  variantFile.pipe(parser);
  parser.on('m3u', function(m3u) {
    callback(null, m3u);
  });
}
