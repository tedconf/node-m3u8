var fs     = require('fs'),
    should = require('should');

describe('parsing playlist m3u8', function() {
  it('should emit 17 items', function(done) {
    var parser = getParser();

    var items = 0;
    parser.on('item', function() {
      items++;
    });
    parser.on('m3u', function() {
      items.should.equal(17);
      done();
    });
  });

  it('should have proper headers', function(done) {
    var parser = getParser();
    parser.on('m3u', function(m3u) {
      m3u.get('version').should.equal(4);
      m3u.get('targetDuration').should.equal(10);
      m3u.get('playlistType').should.equal('VOD');
      m3u.get('mediaSequence').should.equal(0);
      m3u.get('discontinuitySequence').should.equal(3);
      should.not.exist(m3u.get('iframesOnly'));
      done();
    });
  });

  describe('first PlaylistItem', function() {
    it('should match first item in fixture', function(done) {
      var parser = getParser();

      parser.on('m3u', function(m3u) {
        var item = m3u.items.PlaylistItem[0];
        item.get('title').should.equal('');
        item.get('duration').should.equal(10);
        item.get('byteRange').should.equal('522828@0');
        item.get('uri').should.equal('hls_450k_video.ts');

        done();
      });
    });
  });

  describe('11th PlaylistItem', function() {
    it('has a cue out', function(done) {
      var parser = getParser();

      parser.on('m3u', function(m3u) {
        var item = m3u.items.PlaylistItem[10];
        item.get('cueout').should.equal(30);
        item = m3u.items.PlaylistItem[11];
        should.not.exist(item.get('cueout'));
        done();
      });
    });
  });

  describe('12th PlaylistItem', function() {
    it('has a cue out cont', function(done) {
      var parser = getParser();

      parser.on('m3u', function(m3u) {
        var item = m3u.items.PlaylistItem[11];
        item.get('cont-dur').should.equal(30);
        item.get('cont-offset').should.equal(10);
        done();
      });
    });
  });

  describe('13th PlaylistItem', function() {
    it('has a cue in', function(done) {
      var parser = getParser();

      parser.on('m3u', function(m3u) {
        var item = m3u.items.PlaylistItem[12];
        item.get('cuein').should.equal(true);
        done();
      });
    });
  });

  describe('14th PlaylistItem', function() {
    it('has not a cue in', function(done) {
      var parser = getParser();

      parser.on('m3u', function(m3u) {
        var item = m3u.items.PlaylistItem[13];
        should.not.exist(item.get('cuein'));
        done();
      });
    });
  });

  describe('Playlist', function() {
    it('has cue in in the end', function(done) {
      var parser = getParser();

      parser.on('m3u', function(m3u) {
        var item = m3u.items.PlaylistItem[16];
        item.get('cuein').should.equal(true);
        done();
      });
    });
  });
});

function getParser() {
  var parser      = require('../../parser').createStream();
  var variantFile = fs.createReadStream(
    __dirname + '/../fixtures/playlist.m3u8'
  );
  variantFile.pipe(parser);
  return parser;
}
