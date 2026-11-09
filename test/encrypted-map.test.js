var assert = require('assert');
var Parser = require('../parser');

function parse(text) {
  return new Promise(function(resolve, reject) {
    var parser = Parser.createStream();
    parser.on('m3u', resolve).on('error', reject).end(text);
  });
}

var keyA = 'METHOD=AES-128,URI="a.key",IV=0x00000000000000000000000000000001';
var keyB = 'METHOD=AES-128,URI="b.key",IV=0x00000000000000000000000000000002';

describe('encrypted initialization sections', function() {
  [
    ['encrypted map and rotated media', ['#EXT-X-KEY:' + keyA, '#EXT-X-MAP:URI="init.mp4"', '#EXT-X-KEY:' + keyB]],
    ['clear map and encrypted media', ['#EXT-X-MAP:URI="init.mp4"', '#EXT-X-KEY:' + keyB]],
    ['encrypted map and clear media', ['#EXT-X-KEY:' + keyA, '#EXT-X-MAP:URI="init.mp4"', '#EXT-X-KEY:METHOD=NONE']]
  ].forEach(function(test) {
    it('round trips ' + test[0] + ' across a discontinuity', async function() {
      var source = ['#EXTM3U'].concat(test[1], ['#EXTINF:6,', 'one.m4s',
        '#EXT-X-DISCONTINUITY', '#EXTINF:6,', 'two.m4s', '#EXT-X-ENDLIST']).join('\n');
      var original = await parse(source);
      var restored = Parser.M3U.unserialize(original.serialize());
      var roundTrip = await parse(restored.toString());
      assert.deepStrictEqual(roundTrip.items.PlaylistItem.map(function(item) {
        return [item.get('mapKeys'), item.get('keys')];
      }), original.items.PlaylistItem.map(function(item) {
        return [item.get('mapKeys'), item.get('keys')];
      }));
      assert.strictEqual(roundTrip.totalDuration(), 12);
    });
  });

  it('clears encryption before a new clear initialization map', async function() {
    var playlist = await parse(['#EXTM3U', '#EXT-X-KEY:' + keyA,
      '#EXT-X-MAP:URI="init.mp4"', '#EXTINF:6,', 'one.m4s',
      '#EXT-X-KEY:METHOD=NONE', '#EXT-X-MAP:URI="clear.mp4"',
      '#EXTINF:6,', 'two.m4s'].join('\n'));
    var output = playlist.toString();
    assert.ok(output.includes('#EXT-X-KEY:METHOD=NONE\n#EXT-X-MAP:URI="clear.mp4"'));
    var restored = await parse(output);
    assert.deepStrictEqual(restored.items.PlaylistItem[1].get('mapKeys'), []);
  });

  it('rotates one key format while retaining other active formats', async function() {
    var other = 'METHOD=AES-128,URI="other.key",KEYFORMAT="example.keyformat"';
    var playlist = await parse(['#EXTM3U', '#EXT-X-KEY:' + keyA, '#EXT-X-KEY:' + other,
      '#EXT-X-MAP:URI="init.mp4"', '#EXTINF:6,', 'one.m4s',
      '#EXT-X-KEY:' + keyB, '#EXTINF:6,', 'two.m4s'].join('\n'));
    assert.deepStrictEqual(playlist.items.PlaylistItem[0].get('keys'), [keyA, other]);
    assert.deepStrictEqual(playlist.items.PlaylistItem[1].get('keys'), [other, keyB]);
    assert.deepStrictEqual(playlist.items.PlaylistItem[1].get('mapKeys'), [keyA, other]);
  });
});


describe('removed encryption key formats', function() {
  var other = 'METHOD=SAMPLE-AES,URI="other.key",KEYFORMAT="com.example"';
  [
    ['between segments', ['#EXTINF:6,', 'one.m4s'], []],
    ['with an unchanged map', ['#EXT-X-MAP:URI="init.mp4"', '#EXTINF:6,', 'one.m4s'], []],
    ['between a map and its segment', ['#EXT-X-MAP:URI="init.mp4"'], []],
    ['before a new map', ['#EXT-X-MAP:URI="init.mp4"', '#EXTINF:6,', 'one.m4s'], ['#EXT-X-MAP:URI="next.mp4"']]
  ].forEach(function(test) {
    [keyB, other].forEach(function(remaining) {
      it('round trips dropped formats ' + test[0] + ' retaining ' + remaining, async function() {
        var source = ['#EXTM3U', '#EXT-X-KEY:' + keyA, '#EXT-X-KEY:' + other]
          .concat(test[1], ['#EXT-X-KEY:METHOD=NONE', '#EXT-X-KEY:' + remaining],
            test[2], ['#EXTINF:6,', 'two.m4s', '#EXT-X-ENDLIST']).join('\n');
        var original = await parse(source);
        var restored = await parse(original.toString());
        function keys(playlist) {
          return playlist.items.PlaylistItem.map(function(item) {
            return [item.get('mapKeys'), item.get('keys')];
          });
        }
        assert.deepStrictEqual(keys(restored), keys(original));
      });
    });
  });
});
