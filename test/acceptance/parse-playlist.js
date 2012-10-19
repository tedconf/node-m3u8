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
});

function getParser() {
  var parser      = require('../../parser').createStream();
  var variantFile = fs.createReadStream(
    __dirname + '/../fixtures/playlist.m3u8'
  );
  variantFile.pipe(parser);
  return parser;
}
