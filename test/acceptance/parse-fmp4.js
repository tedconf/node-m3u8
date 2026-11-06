var fs     = require('fs'),
    M3U    = require('../../m3u'),
    should = require('should');

describe('parsing fMP4 playlist m3u8', function() {
  [1, 7, 64].forEach(function(chunkSize) {
    it('should preserve map transitions across ' + chunkSize + '-byte stream chunks and an unterminated final line', function(done) {
      var parser = require('../../parser').createStream();
      var input = fs.readFileSync(__dirname + '/../fixtures/fmp4.m3u8', 'utf8')
        .trimEnd().replace('init-f2-v1.mp4', '初始化.mp4?token=a%2Fb');
      var bytes = Buffer.from(input);
      parser.on('error', done);
      parser.on('m3u', function(m3u) {
        try {
          m3u.items.PlaylistItem.map(function(item) {
            return [item.get('map'), item.get('mapByteRange'), item.get('uri')];
          }).should.eql([
            ['init-f1-v1.mp4', null, 'segment-1-f1-v1.m4s'],
            ['init-f1-v1.mp4', null, 'segment-2-f1-v1.m4s'],
            ['初始化.mp4?token=a%2Fb', '720@0', 'segment-3-f2-v1.m4s']
          ]);
          m3u.items.PlaylistItem[2].get('discontinuity').should.be.true();
          m3u.get('endlist').should.be.true();
          var copy = M3U.unserialize(JSON.parse(JSON.stringify(m3u.serialize())));
          copy.toString().should.eql(m3u.toString());
          done();
        } catch (error) { done(error); }
      });
      for (var offset = 0; offset < bytes.length; offset += chunkSize) {
        parser.write(bytes.subarray(offset, offset + chunkSize));
      }
      parser.end();
    });
  });

  it('should not keep EXT-X-MAP as a playlist property', function(done) {
    parse('fmp4.m3u8', function(m3u) {
      should.not.exist(m3u.get('EXT-X-MAP'));
      done();
    });
  });

  it('should apply each EXT-X-MAP to the segments that follow it', function(done) {
    parse('fmp4.m3u8', function(m3u) {
      m3u.items.PlaylistItem.map(function(item) {
        return [item.get('map'), item.get('mapByteRange')];
      }).should.eql([
        ['init-f1-v1.mp4', null],
        ['init-f1-v1.mp4', null],
        ['init-f2-v1.mp4', '720@0']
      ]);
      done();
    });
  });

  it('should write EXT-X-MAP only where it changes, after EXT-X-DISCONTINUITY', function(done) {
    parse('fmp4.m3u8', function(m3u) {
      m3u.toString().should.eql([
        '#EXTM3U',
        '#EXT-X-TARGETDURATION:6',
        '#EXT-X-VERSION:6',
        '#EXT-X-MEDIA-SEQUENCE:1',
        '#EXT-X-PLAYLIST-TYPE:VOD',
        '#EXT-X-MAP:URI="init-f1-v1.mp4"',
        '#EXTINF:6.0060,',
        'segment-1-f1-v1.m4s',
        '#EXTINF:6.0060,',
        'segment-2-f1-v1.m4s',
        '#EXT-X-DISCONTINUITY',
        '#EXT-X-MAP:URI="init-f2-v1.mp4",BYTERANGE="720@0"',
        '#EXTINF:4.0040,',
        'segment-3-f2-v1.m4s',
        '#EXT-X-ENDLIST',
        ''
      ].join('\n'));
      done();
    });
  });

  it('should let item listeners rewrite the map uri', function(done) {
    var parser = getParser('fmp4.m3u8');
    parser.on('item', function(item) {
      item.set('map', 'https://cdn.example/' + item.get('map'));
    });
    parser.on('m3u', function(m3u) {
      m3u.items.PlaylistItem[1].get('map').should.eql('https://cdn.example/init-f1-v1.mp4');
      m3u.toString().should.containEql('#EXT-X-MAP:URI="https://cdn.example/init-f1-v1.mp4"');
      done();
    });
  });

  it('should keep both init segments when merging intro and talk playlists', function(done) {
    parse('fmp4.m3u8', function(intro) {
      parse('fmp4.m3u8', function(talk) {
        intro.merge(talk);
        var lines = intro.toString().split('\n');
        lines.filter(function(line) {
          return line.indexOf('#EXT-X-MAP:') == 0;
        }).should.eql([
          '#EXT-X-MAP:URI="init-f1-v1.mp4"',
          '#EXT-X-MAP:URI="init-f2-v1.mp4",BYTERANGE="720@0"',
          '#EXT-X-MAP:URI="init-f1-v1.mp4"',
          '#EXT-X-MAP:URI="init-f2-v1.mp4",BYTERANGE="720@0"'
        ]);
        var talkStart = lines.indexOf('segment-3-f2-v1.m4s') + 1;
        lines.slice(talkStart, talkStart + 3).should.eql([
          '#EXT-X-DISCONTINUITY',
          '#EXT-X-MAP:URI="init-f1-v1.mp4"',
          '#EXTINF:6.0060,'
        ]);
        done();
      });
    });
  });

  it('should round-trip maps through serialize/unserialize', function(done) {
    parse('fmp4.m3u8', function(m3u) {
      var copy = M3U.unserialize(JSON.parse(JSON.stringify(m3u.serialize())));
      copy.toString().should.eql(m3u.toString());
      done();
    });
  });
});

function getParser(fixture) {
  var parser = require('../../parser').createStream();
  fs.createReadStream(__dirname + '/../fixtures/' + fixture).pipe(parser);
  return parser;
}

function parse(fixture, callback) {
  getParser(fixture).on('m3u', callback);
}
