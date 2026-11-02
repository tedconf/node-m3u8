var m3u8   = require('../parser'),
    sinon  = require('sinon'),
    should = require('should');

describe('parser', function() {
  it('should error if not valid M3U first line', function(done) {
    var parser = getParser();

    parser.on('error', function(error) {
      error.message.should.containEql('Non-valid M3U file. First line: ');
      done();
    });
    parser.write('NOT VALID\n');
  });

  it('should error once and not emit m3u for an invalid first line', function(done) {
    var parser = getParser();
    var errors = 0;

    parser.on('error', function() { errors++; });
    parser.on('m3u', function() { done(new Error('m3u emitted')); });
    parser.on('close', function() {
      errors.should.eql(1);
      done();
    });
    parser.write('NOT VALID\nstill not\nnope\n');
    parser.end();
  });

  it('should error on empty input', function(done) {
    var parser = getParser();

    parser.on('error', function(error) {
      error.message.should.containEql('Non-valid M3U file');
      done();
    });
    parser.on('m3u', function() { done(new Error('m3u emitted')); });
    parser.end('');
  });

  it('should error on an infinite EXTINF duration', function(done) {
    var parser = getParser();

    parser.on('error', function(error) {
      error.message.should.eql('EXTINF without a valid duration: Infinity,');
      done();
    });
    parser.end('#EXTM3U\n#EXTINF:Infinity,\nseg.ts\n');
  });

  it('should accept a negative EXTINF duration', function(done) {
    var parser = getParser();

    parser.on('m3u', function(m3u) {
      m3u.items.PlaylistItem[0].get('duration').should.eql(-0.04167);
      done();
    });
    parser.end('#EXTM3U\n#EXTINF:-0.04167,\nseg.ts\n');
  });

  it('should not crash on Object.prototype names as tags or attributes', function(done) {
    var parser = getParser();
    var consoleError = console.error;
    console.error = function() {};

    parser.on('m3u', function(m3u) {
      console.error = consoleError;
      m3u.get('toString').should.eql('x');
      m3u.items.StreamItem[0].get('constructor').should.eql('1');
      done();
    });
    parser.end('#EXTM3U\n#toString:x\n#EXT-X-STREAM-INF:BANDWIDTH=1,CONSTRUCTOR=1\nv.m3u8\n');
  });

  it('should destroy the source when used with pipeline', function(done) {
    var stream = require('stream');
    var source = stream.Readable.from(['NOT VALID\n', 'more\n', 'lines\n']);

    stream.pipeline(source, getParser(), function(error) {
      error.message.should.containEql('Non-valid M3U file');
      source.destroyed.should.be.true();
      done();
    });
  });

  it('should emit end after m3u', function(done) {
    var parser = getParser();
    var events = [];

    parser.on('m3u', function() { events.push('m3u'); });
    parser.on('end', function() {
      events.push('end');
      events.should.eql(['m3u', 'end']);
      done();
    });
    parser.end('#EXTM3U\n');
  });

  it('should error instead of throwing on a bare EXTINF', function(done) {
    var parser = getParser();

    parser.on('error', function(error) {
      error.message.should.containEql('EXTINF');
      done();
    });
    (function() {
      parser.end('#EXTM3U\n#EXTINF\nseg.ts\n');
    }).should.not.throw();
  });

  it('should error on an EXTINF with empty data', function(done) {
    var parser = getParser();

    parser.on('error', function(error) {
      error.message.should.containEql('EXTINF');
      done();
    });
    parser.on('m3u', function() { done(new Error('m3u emitted')); });
    parser.end('#EXTM3U\n#EXTINF:\nseg.ts\n');
  });

  it('should error instead of throwing on a URI before any tag', function(done) {
    var parser = getParser();

    parser.on('error', function() { done(); });
    (function() {
      parser.end('#EXTM3U\nseg.ts\n');
    }).should.not.throw();
  });

  describe('#parseLine', function() {
    it('should call known tags', function() {
      var parser = getParser();
      var mock   = sinon.mock(parser);
      mock.expects('EXT-X-MEDIA').once().returns(45);

      parser.parseLine('#EXT-X-MEDIA:GROUP-ID="600k", LANGUAGE="eng"');
      mock.verify();
    });

    it('should set data on m3u on unknown tags', function() {
      var parser = getParser();

      parser.parseLine('#THIS-IS-A-TAG:some value');
      parser.m3u.get('THIS-IS-A-TAG').should.eql('some value');
    });

    it('should write unknown tags without a value as bare tags', function() {
      var parser = getParser();

      parser.parseLine('#EXT-X-PLACEMENT-OPPORTUNITY');
      parser.m3u.toString().should.eql('#EXTM3U\n#EXT-X-PLACEMENT-OPPORTUNITY\n');
    });

    it('should keep unknown tags without a value through serialize/unserialize', function() {
      var parser = getParser();

      parser.parseLine('#EXT-X-PLACEMENT-OPPORTUNITY');
      var data = JSON.parse(JSON.stringify(parser.m3u.serialize()));
      m3u8.M3U.unserialize(data).toString().should.eql('#EXTM3U\n#EXT-X-PLACEMENT-OPPORTUNITY\n');
    });

    it('should split on first colon only', function() {
      var parser = getParser();

      parser.parseLine('#THIS-IS-A-TAG:http://www.ted.com');
      parser.m3u.get('THIS-IS-A-TAG').should.eql('http://www.ted.com');
    });
  });

  describe('#addItem', function() {
    it('should make currentItem the added item', function() {
      var parser = getParser();

      var item = new m3u8.M3U.PlaylistItem;
      parser.addItem(item);
      parser.currentItem.should.eql(item);
    });
  });

  describe('#EXTINF', function() {
    it('should create a new Playlist item', function() {
      var parser = getParser();

      parser.EXTINF('4.5,some title');
      parser.currentItem.constructor.name.should.eql('PlaylistItem');
      parser.currentItem.get('duration').should.eql(4.5);
      parser.currentItem.get('title').should.eql('some title');
    });
  });

  describe('#EXT-X-BYTERANGE', function() {
    it('should set byteRange on currentItem', function() {
      var parser = getParser();

      parser.EXTINF('4.5,');
      parser['EXT-X-BYTERANGE']('45@90');
      parser.currentItem.get('byteRange').should.eql('45@90');
    });
  });

  describe('#EXT-X-DISCONTINUITY', function() {
    it('should indicate discontinuation on subsequent playlist item', function() {
      var parser = getParser();

      parser['EXT-X-DISCONTINUITY']();
      parser.EXTINF('4.5,some title');
      parser.currentItem.constructor.name.should.eql('PlaylistItem');
      parser.currentItem.get('duration').should.eql(4.5);
      parser.currentItem.get('title').should.eql('some title');
      parser.currentItem.get('discontinuity').should.eql(true);
    });
  });

  describe('#EXT-X-MAP', function() {
    it('should set map on following playlist items', function() {
      var parser = getParser();

      parser['EXT-X-MAP']('URI="init.mp4",BYTERANGE="720@0"');
      parser.EXTINF('4.5,');
      parser.currentItem.get('map').should.eql('init.mp4');
      parser.currentItem.get('mapByteRange').should.eql('720@0');
      parser.EXTINF('4.5,');
      parser.currentItem.get('map').should.eql('init.mp4');
      should.not.exist(parser.m3u.get('EXT-X-MAP'));
    });
  });

  describe('#EXT-X-PROGRAM-DATE-TIME', function() {
    it('should set date on the following playlist item only', function() {
      var parser = getParser();
      var programDateTime = '2017-03-23T19:26:41.000+0000';

      parser['EXT-X-PROGRAM-DATE-TIME'](programDateTime);
      parser.EXTINF('4.5,');
      parser.currentItem.get('date').should.eql(programDateTime);
      parser.EXTINF('4.5,');
      should.not.exist(parser.currentItem.get('date'));
      should.not.exist(parser.m3u.get('EXT-X-PROGRAM-DATE-TIME'));
    });
  });

  describe('#EXT-X-DISCONTINUITY-SEQUENCE', function() {
    it('should set discontinuitySequence as an integer', function() {
      var parser = getParser();

      parser.parseLine('#EXT-X-DISCONTINUITY-SEQUENCE:3');
      parser.m3u.get('discontinuitySequence').should.eql(3);
      parser.m3u.toString().should.containEql('#EXT-X-DISCONTINUITY-SEQUENCE:3\n');
    });
  });

  describe('streaming', function() {
    it('should handle lines and multi-byte characters split across chunks', function(done) {
      var parser = getParser();
      var body = Buffer.from('#EXTM3U\n#EXTINF:10,caf\u00e9 \u20ac5\nseg.ts');

      parser.on('m3u', function(m3u) {
        m3u.items.PlaylistItem[0].get('title').should.eql('caf\u00e9 \u20ac5');
        m3u.items.PlaylistItem[0].get('uri').should.eql('seg.ts');
        done();
      });
      for (var i = 0; i < body.length; i += 1) {
        parser.write(body.subarray(i, i + 1));
      }
      parser.end();
    });

    it('should ignore an EXT-X-MAP without a URI', function(done) {
      var parser = getParser();

      parser.on('m3u', function(m3u) {
        (m3u.items.PlaylistItem[0].get('map') === null).should.be.true();
        m3u.items.PlaylistItem[0].get('uri').should.eql('seg.ts');
        done();
      });
      parser.end('#EXTM3U\n#EXT-X-MAP\n#EXTINF:10,\nseg.ts\n');
    });

    it('should not throw on attribute tags without a value', function(done) {
      var parser = getParser();

      parser.on('m3u', function(m3u) {
        m3u.items.StreamItem.length.should.eql(1);
        m3u.items.MediaItem.length.should.eql(1);
        m3u.items.IframeStreamItem.length.should.eql(1);
        done();
      });
      parser.end('#EXTM3U\n#EXT-X-MEDIA\n#EXT-X-I-FRAME-STREAM-INF\n#EXT-X-STREAM-INF\nv.m3u8\n');
    });

    it('should not dispatch tags to stream methods', function(done) {
      var parser = getParser();

      parser.on('m3u', function(m3u) {
        m3u.get('end').should.eql('foo');
        m3u.get('write').should.eql('bar');
        done();
      });
      parser.end('#EXTM3U\n#end:foo\n#write:bar\n');
    });

    it('should apply tags between EXTINF and the URI to that segment', function(done) {
      var parser = getParser();

      parser.on('m3u', function(m3u) {
        var items = m3u.items.PlaylistItem;
        items[0].get('date').should.eql('2026-01-01T00:00:00Z');
        items[0].get('map').should.eql('a.mp4');
        items[0].get('discontinuity').should.be.true();
        (items[1].get('date') === null).should.be.true();
        (items[1].get('discontinuity') === null).should.be.true();
        items[1].get('map').should.eql('a.mp4');
        done();
      });
      parser.end(
        '#EXTM3U\n#EXTINF:4,\n#EXT-X-DISCONTINUITY\n' +
        '#EXT-X-PROGRAM-DATE-TIME:2026-01-01T00:00:00Z\n#EXT-X-MAP:URI="a.mp4"\n' +
        'a.m4s\n#EXTINF:4,\nb.m4s\n'
      );
    });

    it('should start a new segment for a URI line without EXTINF', function(done) {
      var parser = getParser();

      parser.on('m3u', function(m3u) {
        m3u.items.PlaylistItem.map(function(item) {
          return item.get('uri');
        }).should.eql(['a.ts', 'b.ts']);
        done();
      });
      parser.end('#EXTM3U\n#EXTINF:4,\na.ts\nb.ts\n');
    });

    it('should apply EXT-X-BYTERANGE before or after EXTINF to its segment', function(done) {
      var parser = getParser();

      parser.on('m3u', function(m3u) {
        m3u.items.PlaylistItem.map(function(item) {
          return item.get('byteRange');
        }).should.eql(['100@0', '100@100', '100@200']);
        done();
      });
      parser.end(
        '#EXTM3U\n#EXT-X-BYTERANGE:100@0\n#EXTINF:4,\nmain.ts\n' +
        '#EXTINF:4,\n#EXT-X-BYTERANGE:100@100\nmain.ts\n' +
        '#EXT-X-BYTERANGE:100@200\n#EXTINF:4,\nmain.ts\n'
      );
    });

    it('should keep EXT-X-KEY on the segments it applies to', function(done) {
      var parser = getParser();

      parser.on('m3u', function(m3u) {
        m3u.items.PlaylistItem.map(function(item) {
          return item.get('keys');
        }).should.eql([
          ['METHOD=AES-128,URI="k1"'],
          ['METHOD=AES-128,URI="k1"'],
          ['METHOD=AES-128,URI="k2"', 'METHOD=SAMPLE-AES,URI="k3",KEYFORMAT="x"']
        ]);
        m3u.toString().split('\n').filter(function(line) {
          return line.indexOf('#EXT-X-KEY') == 0 || /\.ts$/.test(line);
        }).should.eql([
          '#EXT-X-KEY:METHOD=AES-128,URI="k1"', 'a.ts', 'b.ts',
          '#EXT-X-KEY:METHOD=AES-128,URI="k2"',
          '#EXT-X-KEY:METHOD=SAMPLE-AES,URI="k3",KEYFORMAT="x"', 'c.ts'
        ]);
        should.not.exist(m3u.get('EXT-X-KEY'));
        done();
      });
      parser.end(
        '#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="k1"\n#EXTINF:4,\na.ts\n#EXTINF:4,\nb.ts\n' +
        '#EXT-X-KEY:METHOD=AES-128,URI="k2"\n' +
        '#EXT-X-KEY:METHOD=SAMPLE-AES,URI="k3",KEYFORMAT="x"\n#EXTINF:4,\nc.ts\n'
      );
    });

    it('should keep commas in EXTINF titles', function(done) {
      var parser = getParser();

      parser.on('m3u', function(m3u) {
        m3u.items.PlaylistItem[0].get('title').should.eql('Hello, World');
        m3u.toString().should.containEql('#EXTINF:4.0000,Hello, World\n');
        done();
      });
      parser.end('#EXTM3U\n#EXTINF:4,Hello, World\na.ts\n');
    });

    it('should accept CRLF line endings', function(done) {
      var parser = getParser();

      parser.on('m3u', function(m3u) {
        m3u.items.PlaylistItem[0].get('uri').should.eql('seg.ts');
        done();
      });
      parser.end('#EXTM3U\r\n#EXTINF:10,\r\nseg.ts\r\n');
    });
  });

  describe('#EXT-X-STREAM-INF', function() {
    it('should create a new Stream item', function() {
      var parser = getParser();

      parser['EXT-X-STREAM-INF']('NAME="I am a stream!"');
      parser.currentItem.constructor.name.should.eql('StreamItem');
      parser.currentItem.get('name').should.eql('I am a stream!');
    });
  });

  describe('#EXT-X-I-FRAME-STREAM-INF', function() {
    it('should create a new Iframe Stream item', function() {
      var parser = getParser();

      parser['EXT-X-I-FRAME-STREAM-INF']('NAME="I am an iframe stream!"');
      parser.currentItem.constructor.name.should.eql('IframeStreamItem');
      parser.currentItem.get('name').should.eql('I am an iframe stream!');
    });
  });

  describe('#EXT-X-MEDIA-INF', function() {
    it('should create a new Media item', function() {
      var parser = getParser();

      parser['EXT-X-MEDIA']('NAME="I am a media item!"');
      parser.currentItem.constructor.name.should.eql('MediaItem');
      parser.currentItem.get('name').should.eql('I am a media item!');
    });
  });

  describe('attribute types', function() {
    it('should parse SCORE as a decimal and PATHWAY-ID as a quoted string', function() {
      var parser = getParser();

      parser['EXT-X-STREAM-INF']('BANDWIDTH=1,SCORE=1.5,PATHWAY-ID="cdn-a"');
      parser.currentItem.get('score').should.eql(1.5);
      parser.currentItem.get('pathway-id').should.eql('cdn-a');
      parser.currentItem.toString().split('\n')[0].should.eql(
        '#EXT-X-STREAM-INF:BANDWIDTH=1,SCORE=1.5,PATHWAY-ID="cdn-a"'
      );
    });
  });

  describe('#parseAttributes', function() {
    it('should return an array of key-values', function() {
      var parser = getParser();

      var keyValues = parser.parseAttributes(
        'KEY="I, am a value",RESOLUTION=640x360,FORCED=NO'
      );
      keyValues[0].key.should.eql('KEY');
      keyValues[0].value.should.eql('"I, am a value"');
      keyValues[2].value.should.eql('NO');
    });
  });
});

function getParser() {
  var parser = m3u8.createStream();

  return parser;
}
