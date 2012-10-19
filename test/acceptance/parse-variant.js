var fs = require('fs');

describe('parsing variant m3u8', function() {
  it('should emit 16 items', function(done) {
    var parser = getParser();

    var items = 0;
    parser.on('item', function() {
      items++;
    });
    parser.on('m3u', function() {
      items.should.equal(16);
      done();
    });
  });

  it('should have version 4', function(done) {
    var parser = getParser();
    parser.on('m3u', function(m3u) {
      m3u.get('version').should.equal(4);
      done();
    });
  });

  describe('first StreamItem', function() {
    it('should match first stream item in fixture', function(done) {
      var parser = getParser();

      parser.on('m3u', function(m3u) {
        var item = m3u.items.StreamItem[0];
        item.get('bandwidth').should.equal(69334);
        item.get('program-id').should.equal(1);
        item.get('codecs').should.equal('avc1.42c00c');
        item.get('resolution')[0].should.equal(320);
        item.get('resolution')[1].should.equal(180);
        item.get('audio').should.equal('600k');

        done();
      });
    });
  });

  describe('first IframeStreamItem', function() {
    it('should match first iframe stream item in fixture', function(done) {
      var parser = getParser();

      parser.on('m3u', function(m3u) {
        var item = m3u.items.IframeStreamItem[0];
        item.get('bandwidth').should.equal(28361);
        item.get('uri').should.equal('hls_64k_iframe.m3u8');

        done();
      });
    });
  });

  describe('first MediaItem', function() {
    it('should match first media item in fixture', function(done) {
      var parser = getParser();

      parser.on('m3u', function(m3u) {
        var item = m3u.items.MediaItem[0];
        item.get('group-id').should.equal('600k');
        item.get('language').should.equal('eng');
        item.get('name').should.equal('Audio');
        item.get('autoselect').should.be.true;
        item.get('default').should.be.true;
        item.get('uri').should.equal('hls_600k_audio.m3u8');
        item.get('type').should.equal('AUDIO');

        done();
      });
    });
  });
});

function getParser() {
  var parser      = require('../../parser').createStream();
  var variantFile = fs.createReadStream(
    __dirname + '/../fixtures/variant.m3u8'
  );
  variantFile.pipe(parser);
  return parser;
}