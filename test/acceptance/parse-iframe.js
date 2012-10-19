var fs     = require('fs');

describe('parsing iframe m3u8', function() {
  it('should emit 36 items', function(done) {
    var parser = getParser();

    var items = 0;
    parser.on('item', function() {
      items++;
    });
    parser.on('m3u', function() {
      items.should.equal(36);
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
      m3u.get('iframesOnly').should.be.true;
      done();
    });
  });

  describe('first IframeStreamItem', function() {
    it('should match first item in fixture', function(done) {
      var parser = getParser();

      parser.on('m3u', function(m3u) {
        var item = m3u.items.PlaylistItem[0];
        item.get('title').should.equal('');
        item.get('duration').should.equal(5);
        item.get('byteRange').should.equal('376@940');
        item.get('uri').should.equal('hls_1500k_video.ts');

        done();
      });
    });
  });
});

function getParser() {
  var parser      = require('../../parser').createStream();
  var variantFile = fs.createReadStream(
    __dirname + '/../fixtures/iframe.m3u8'
  );
  variantFile.pipe(parser);
  return parser;
}
