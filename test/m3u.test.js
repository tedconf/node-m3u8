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

    it('should use the largest version', function() {
      var m3u1 = getM3u();
      m3u1.set('version', 6);
      m3u1.addPlaylistItem({ duration: 1, uri: 'a.m4s', map: 'a.mp4' });

      var m3u2 = getM3u();
      m3u2.set('version', 7);
      m3u2.addPlaylistItem({ duration: 1, uri: 'b.m4s', map: 'b.mp4' });
      m3u1.merge(m3u2);
      m3u1.get('version').should.eql(7);
    });

    it('should ignore a merged playlist with an invalid version', function() {
      var m3u1 = getM3u();
      m3u1.set('version', 3);
      m3u1.addPlaylistItem({});

      var m3u2 = getM3u();
      m3u2.set('EXT-X-VERSION', null);
      m3u2.addPlaylistItem({});
      m3u1.merge(m3u2);
      m3u1.get('version').should.eql(3);
    });

    it('should keep a higher version than the merged playlist', function() {
      var m3u1 = getM3u();
      m3u1.set('version', 7);
      m3u1.addPlaylistItem({});

      var m3u2 = getM3u();
      m3u2.set('version', 3);
      m3u2.addPlaylistItem({});
      m3u1.merge(m3u2);
      m3u1.get('version').should.eql(7);
    });
  });

  describe('EXT-X-ENDLIST', function() {
    it('should write ENDLIST when endlist is set without a playlist type', function() {
      var m3u = getM3u();
      m3u.set('endlist', true);
      m3u.addPlaylistItem({ duration: 1, uri: 'a.ts' });
      m3u.toString().should.eql('#EXTM3U\n#EXTINF:1.0000,\na.ts\n#EXT-X-ENDLIST\n');
    });

    it('should take endlist from the merged playlist', function() {
      var ended = getM3u();
      ended.set('endlist', true);
      ended.addPlaylistItem({ duration: 1, uri: 'b.ts' });
      var live = getM3u();
      live.addPlaylistItem({ duration: 1, uri: 'c.ts' });

      var m3u1 = getM3u();
      m3u1.addPlaylistItem({ duration: 1, uri: 'a.ts' });
      m3u1.merge(ended);
      m3u1.get('endlist').should.be.true();
      m3u1.merge(live);
      should.not.exist(m3u1.get('endlist'));
      m3u1.toString().should.not.containEql('#EXT-X-ENDLIST');
    });

    it('should survive a serialize round trip', function() {
      var m3u = getM3u();
      m3u.set('endlist', true);
      m3u.addPlaylistItem({ duration: 1, uri: 'a.ts' });
      var copy = M3U.unserialize(JSON.parse(JSON.stringify(m3u.serialize())));
      copy.toString().should.containEql('#EXT-X-ENDLIST');
    });
  });

  describe('EXT-X-KEY', function() {
    it('should clear the key when a merged playlist is unencrypted', function() {
      var m3u1 = getM3u();
      m3u1.addPlaylistItem({ duration: 1, uri: 'a.ts', keys: ['METHOD=AES-128,URI="k"'] });
      var m3u2 = getM3u();
      m3u2.addPlaylistItem({ duration: 1, uri: 'b.ts' });
      m3u1.merge(m3u2);
      m3u1.toString().split('\n').filter(function(line) {
        return line.indexOf('#EXT-X-KEY') == 0 || /\.ts$/.test(line);
      }).should.eql([
        '#EXT-X-KEY:METHOD=AES-128,URI="k"', 'a.ts', '#EXT-X-KEY:METHOD=NONE', 'b.ts'
      ]);
    });
  });

  describe('EXT-X-VERSION with a null value', function() {
    it('should write the version once', function() {
      var m3u = getM3u();
      m3u.properties.version = null;
      m3u.addPlaylistItem({ duration: 1, uri: 'a.m4s', map: 'init.mp4' });
      m3u.toString().split('\n').filter(function(line) {
        return line.indexOf('#EXT-X-VERSION') == 0;
      }).should.eql(['#EXT-X-VERSION:6']);
    });
  });

  describe('EXT-X-MAP', function() {
    function mapLines(m3u) {
      return m3u.toString().split('\n').filter(function(line) {
        return line.indexOf('#EXT-X-MAP') == 0 || line.indexOf('seg') == 0;
      });
    }

    it('should write a map once for consecutive items that share it', function() {
      var m3u = getM3u();
      m3u.addPlaylistItem({ duration: 1, uri: 'seg1.m4s', map: 'init.mp4' });
      m3u.addPlaylistItem({ duration: 1, uri: 'seg2.m4s', map: 'init.mp4' });
      mapLines(m3u).should.eql(['#EXT-X-MAP:URI="init.mp4"', 'seg1.m4s', 'seg2.m4s']);
    });

    it('should write a map when the URI changes without a discontinuity', function() {
      var m3u = getM3u();
      m3u.addPlaylistItem({ duration: 1, uri: 'seg1.m4s', map: 'a.mp4' });
      m3u.addPlaylistItem({ duration: 1, uri: 'seg2.m4s', map: 'b.mp4' });
      mapLines(m3u).should.eql([
        '#EXT-X-MAP:URI="a.mp4"', 'seg1.m4s', '#EXT-X-MAP:URI="b.mp4"', 'seg2.m4s'
      ]);
    });

    it('should write a map when only the byte range changes', function() {
      var m3u = getM3u();
      m3u.addPlaylistItem({ duration: 1, uri: 'seg1.m4s', map: 'init.mp4', mapByteRange: '720@0' });
      m3u.addPlaylistItem({ duration: 1, uri: 'seg2.m4s', map: 'init.mp4', mapByteRange: '720@720' });
      mapLines(m3u).should.eql([
        '#EXT-X-MAP:URI="init.mp4",BYTERANGE="720@0"', 'seg1.m4s',
        '#EXT-X-MAP:URI="init.mp4",BYTERANGE="720@720"', 'seg2.m4s'
      ]);
    });

    it('should write a map first seen on a later item', function() {
      var m3u = getM3u();
      m3u.addPlaylistItem({ duration: 1, uri: 'seg1.m4s' });
      m3u.addPlaylistItem({ duration: 1, uri: 'seg2.m4s', map: 'init.mp4' });
      mapLines(m3u).should.eql(['seg1.m4s', '#EXT-X-MAP:URI="init.mp4"', 'seg2.m4s']);
    });

    it('should bump version to 6 when merging in segments with a map', function() {
      var m3u1 = getM3u();
      m3u1.set('version', 3);
      m3u1.addPlaylistItem({ duration: 1, uri: 'a.ts' });

      var m3u2 = getM3u();
      m3u2.addPlaylistItem({ duration: 1, uri: 'b.m4s', map: 'init.mp4' });
      m3u1.merge(m3u2);
      m3u1.get('version').should.eql(6);
    });

    it('should not lower a version above 6 when merging', function() {
      var m3u1 = getM3u();
      m3u1.set('version', 7);
      m3u1.addPlaylistItem({ duration: 1, uri: 'a.m4s', map: 'init.mp4' });

      var m3u2 = getM3u();
      m3u2.addPlaylistItem({ duration: 1, uri: 'b.m4s', map: 'init.mp4' });
      m3u1.merge(m3u2);
      m3u1.get('version').should.eql(7);
    });

    it('should write at least version 6 when items have a map', function() {
      var m3u = getM3u();
      m3u.set('version', 4);
      m3u.addPlaylistItem({ duration: 1, uri: 'a.m4s', map: 'init.mp4' });
      m3u.toString().should.containEql('#EXT-X-VERSION:6\n');
    });

    it('should add version 6 when no version is set and items have a map', function() {
      var m3u = getM3u();
      m3u.addPlaylistItem({ duration: 1, uri: 'a.m4s', map: 'init.mp4' });
      m3u.toString().split('\n').slice(0, 3).should.eql([
        '#EXTM3U',
        '#EXT-X-VERSION:6',
        '#EXT-X-MAP:URI="init.mp4"'
      ]);
    });

    it('should not write a version for playlists without a map', function() {
      var m3u = getM3u();
      m3u.addPlaylistItem({ duration: 1, uri: 'a.ts' });
      m3u.toString().should.not.containEql('#EXT-X-VERSION');
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
