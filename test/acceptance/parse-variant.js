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
describe('parsing variant m3u8 with current attributes', function() {
  it('should not log unknown-key warnings for standard attributes', function(done) {
    var parser = require('../../parser').createStream();
    var errors = [];
    var consoleError = console.error;
    console.error = function() { errors.push(arguments); };
    parser.on('m3u', function(m3u) {
      console.error = consoleError;
      errors.length.should.eql(0);
      m3u.items.StreamItem[0].get('video-range').should.eql('PQ');
      m3u.toString().should.containEql('SUPPLEMENTAL-CODECS="dvh1.08.07/db4h"');
      done();
    });
    parser.end([
      '#EXTM3U',
      '#EXT-X-STREAM-INF:BANDWIDTH=1,SCORE=1.5,VIDEO-RANGE=PQ,HDCP-LEVEL=TYPE-0,' +
        'SUPPLEMENTAL-CODECS="dvh1.08.07/db4h",STABLE-VARIANT-ID="v1",PATHWAY-ID="a",ALLOWED-CPC="x"',
      'v1.m3u8',
      '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="a",NAME="en",ASSOC-LANGUAGE="en",CHARACTERISTICS="public.accessibility.describes-video",STABLE-RENDITION-ID="r1"',
      '#EXT-X-MEDIA:TYPE=CLOSED-CAPTIONS,GROUP-ID="cc",NAME="cc",INSTREAM-ID="CC1"',
      ''
    ].join('\n'));
  });
});
