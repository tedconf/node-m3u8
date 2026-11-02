# @tedconf/m3u8

A streaming parser and writer for [HTTP Live Streaming](https://datatracker.ietf.org/doc/html/rfc8216) (HLS) playlists.

It reads master playlists and media playlists into an `M3U` object. You can
rewrite segment URIs, merge playlists, and write the result back out. TED's
[hls](https://github.com/tedconf/hls) service uses it to build the playlists
behind `hls.ted.com`.

- Requires Node.js 22 or later.
- Has no runtime dependencies.

> **Package name.** This repo used to publish `m3u8` on npm. That package is
> frozen at 0.0.10. From 1.0.0 onward, releases go to GitHub Packages as
> `@tedconf/m3u8`. Installing it under the alias `m3u8` keeps
> `require('m3u8')` working.

## Contents

- [Install](#install)
- [Quick start](#quick-start)
- [Parser](#parser)
- [M3U](#m3u)
- [Items](#items)
- [fMP4 / CMAF init segments](#fmp4--cmaf-init-segments)
- [Supported tags](#supported-tags)
- [Limitations](#limitations)
- [Upgrading from 0.0.10](#upgrading-from-0010)
- [Development](#development)
- [Releasing](#releasing)

## Install

GitHub Packages needs a token to install packages, even public ones.

1. Point the `@tedconf` scope at GitHub Packages. Add this to the project's
   `.npmrc`:

   ```
   @tedconf:registry=https://npm.pkg.github.com
   ```

2. Log in once with a GitHub personal access token that has `read:packages`:

   ```
   npm login --scope=@tedconf --registry=https://npm.pkg.github.com
   ```

3. Install under the `m3u8` alias:

   ```
   npm install m3u8@npm:@tedconf/m3u8@1.0.0-beta.1
   ```

In GitHub Actions:
- Give the job `packages: read`.
- Pass `registry-url: https://npm.pkg.github.com` and `scope: '@tedconf'` to
  `actions/setup-node`.
- Set `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` on the install step.
- In the package's settings, under **Manage Actions access**, give the
  consuming repository read access.

## Quick start

```js
const fs   = require('fs');
const m3u8 = require('m3u8');

const parser = m3u8.createStream();

parser.on('item', (item) => {
  // Runs for each PlaylistItem, StreamItem, IframeStreamItem and MediaItem.
  item.set('uri', 'https://cdn.example.com/' + item.get('uri'));
});

parser.on('m3u', (m3u) => {
  console.log(m3u.totalDuration());
  process.stdout.write(m3u.toString());
});

parser.on('error', (error) => {
  // The first line was not #EXTM3U.
});

fs.createReadStream('index.m3u8').pipe(parser);
```

To parse a string, call `parser.end(text)` instead of piping.

## Parser

`m3u8.createStream()` returns a writable stream. Pipe a playlist into it, or
call `write()` and `end()`. It accepts strings and Buffers. Lines may end in
LF or CRLF, and multi-byte UTF-8 characters can be split across chunks.

| Event   | Payload | When |
|---------|---------|------|
| `item`  | the item | Once per item. A `PlaylistItem` or `StreamItem` fires when its URI line is read, so its tags are already set. `MediaItem` and `IframeStreamItem` fire when their tag is read. |
| `m3u`   | `M3U`   | After the input ends. Fires on the tick after `end()`. |
| `error` | `Error` | When the first line is not `#EXTM3U`. |

## M3U

`m3u8.M3U` is also available as `require('m3u8').M3U`.

```js
const m3u = m3u8.M3U.create();
m3u.set('version', 3);
m3u.set('targetDuration', 10);
m3u.set('playlistType', 'VOD');
m3u.addPlaylistItem({ duration: 9.009, uri: 'segment-1.ts' });
m3u.toString();
```

### Playlist properties

`get(key)` and `set(key, value)` read and write playlist-level tags. Known
tags are stored under a camelCase key. `set()` also accepts the tag name.

| Key                     | Tag                            | Type    |
|-------------------------|--------------------------------|---------|
| `allowCache`            | `EXT-X-ALLOW-CACHE`            | string  |
| `discontinuitySequence` | `EXT-X-DISCONTINUITY-SEQUENCE` | integer |
| `iframesOnly`           | `EXT-X-I-FRAMES-ONLY`          | flag    |
| `independentSegments`   | `EXT-X-INDEPENDENT-SEGMENTS`   | flag    |
| `mediaSequence`         | `EXT-X-MEDIA-SEQUENCE`         | integer |
| `playlistType`          | `EXT-X-PLAYLIST-TYPE`          | string  |
| `targetDuration`        | `EXT-X-TARGETDURATION`         | integer |
| `version`               | `EXT-X-VERSION`                | integer |

Any other tag is stored under its own name, for example
`m3u.get('EXT-X-START')`. See [Limitations](#limitations).

### Methods

| Method | Description |
|--------|-------------|
| `M3U.create()` | Returns an empty playlist. |
| `items` | Arrays of each item type: `items.PlaylistItem`, `items.StreamItem`, `items.IframeStreamItem`, `items.MediaItem`. |
| `addItem(item)` | Appends an item object to the array for its type. |
| `addPlaylistItem(data)`, `addStreamItem(data)`, `addIframeStreamItem(data)`, `addMediaItem(data)` | Create an item from a plain object (see [Items](#items)) and append it. |
| `removePlaylistItem(index)` | Removes a segment. Throws `RangeError` if the index is out of range. |
| `totalDuration()` | Sum of segment durations, in seconds. |
| `domainDurations()` | Durations split at each discontinuity, e.g. `[intro, talk]`. |
| `merge(other)` | Appends another media playlist's segments. Marks the first appended segment as a discontinuity and keeps the larger `targetDuration`. Raises `version` to 6 if any segment has an init segment. Mutates and returns `this`. |
| `hasMap()` | `true` if any segment has an `EXT-X-MAP` init segment. |
| `toString()` | Writes the playlist. Media playlists end with `#EXT-X-ENDLIST` when `playlistType` is `VOD`. |
| `serialize()` | Returns a plain JSON-safe object, e.g. for a cache. |
| `M3U.unserialize(object)` | Rebuilds an `M3U` from `serialize()` output. |

## Items

All items share `get(key)`, `set(key, value)`, `setData(object)`,
`serialize()` and `toString()`. A key that is one of the item's properties
reads or writes that property. Any other key reads or writes an attribute
from the tag's attribute list, such as `bandwidth`, `codecs` or `resolution`.

### PlaylistItem: a media segment

| Property                  | Source tag | Notes |
|---------------------------|------------|-------|
| `uri`                     | URI line | |
| `duration`, `title`       | `EXTINF` | Written with four decimal places. |
| `byteRange`               | `EXT-X-BYTERANGE` | String, e.g. `"1000@0"`. |
| `discontinuity`           | `EXT-X-DISCONTINUITY` | `true` on the segment after the tag. |
| `date`                    | `EXT-X-PROGRAM-DATE-TIME` | String as parsed. A `Date` is written with `toISOString()`. |
| `map`, `mapByteRange`     | `EXT-X-MAP` | See [fMP4 / CMAF init segments](#fmp4--cmaf-init-segments). |
| `daiPlacementOpportunity` | none | Written only: set it to `true` to write `EXT-X-PLACEMENT-OPPORTUNITY`. |

### StreamItem, IframeStreamItem, MediaItem: master playlist entries

These come from `EXT-X-STREAM-INF`, `EXT-X-I-FRAME-STREAM-INF` and
`EXT-X-MEDIA`. Their attributes are read and written by lowercase name:

```js
item.get('bandwidth');                 // 1104484
item.get('resolution');                // [640, 480]
item.get('codecs');                    // 'avc1.64001f,mp4a.40.2'
item.set('uri', 'https://cdn.example.com/' + item.get('uri'));
```

Each attribute is parsed and written according to its HLS type: quoted
string, integer, decimal, resolution, `YES`/`NO` or enumerated string.
Attributes the library doesn't know are kept as they are and logged with
`console.error`.

## fMP4 / CMAF init segments

`EXT-X-MAP` applies to every segment after it until the next `EXT-X-MAP`.
The parser copies it onto each of those `PlaylistItem`s:

- `map` holds the URI.
- `mapByteRange` holds the `BYTERANGE` value, or `null`.

Because each segment holds its own copy, rewriting it in an `item` listener
works the same way as rewriting `uri`:

```js
parser.on('item', (item) => {
  item.set('uri', resolve(item.get('uri')));
  if (item.get('map')) {
    item.set('map', resolve(item.get('map')));
  }
});
```

`toString()`:

- writes `EXT-X-MAP` before a segment's `EXTINF`, on the first segment,
  after every `EXT-X-DISCONTINUITY`, and wherever the map changes;
- writes at least `EXT-X-VERSION:6` when any segment has a map.

`merge()` keeps each playlist's own init segment. An intro and a talk merged
into one playlist look like this:

```
#EXT-X-MAP:URI="https://cdn.example.com/intro/init.mp4"
#EXTINF:6.0060,
https://cdn.example.com/intro/segment-1.m4s
...
#EXT-X-DISCONTINUITY
#EXT-X-MAP:URI="https://cdn.example.com/talk/init.mp4"
#EXTINF:6.0060,
https://cdn.example.com/talk/segment-1.m4s
```

## Supported tags

| Tag | Stored as |
|-----|-----------|
| `EXTINF`, `EXT-X-BYTERANGE`, `EXT-X-DISCONTINUITY`, `EXT-X-PROGRAM-DATE-TIME`, `EXT-X-MAP` | `PlaylistItem` properties |
| `EXT-X-STREAM-INF` | `StreamItem` |
| `EXT-X-I-FRAME-STREAM-INF` | `IframeStreamItem` |
| `EXT-X-MEDIA` | `MediaItem` |
| `EXT-X-ENDLIST` | sets `playlistType` to `VOD` |
| Playlist properties table above | `M3U` properties |

## Limitations

These behave the same as in 0.0.10:

- **Unknown tags are playlist-level.** Any tag not listed above is stored as
  a playlist property and written back in the header. Only its last value is
  kept, and it is not tied to a segment. This affects segment-level tags such
  as `EXT-X-KEY`, `EXT-X-CUE-OUT`/`EXT-X-CUE-IN`, `EXT-X-DATERANGE` and
  `EXT-X-GAP`. Don't round-trip encrypted playlists or playlists with
  per-segment ad markers through this library.
- **Unknown tags with no value are written badly.** For example,
  `#EXT-X-PLACEMENT-OPPORTUNITY` in the input comes out as
  `#EXT-X-PLACEMENT-OPPORTUNITY:undefined`. Use the `daiPlacementOpportunity`
  segment property instead.
- **Don't mix TS and fMP4 in one playlist.** HLS has no tag that clears an
  init segment. If a segment without a map follows one with a map, players
  apply the earlier map to it. So merge a CMAF intro only with a CMAF talk,
  never with a TS one.

## Upgrading from 0.0.10

The public API is the same. These behaviours changed:

- The parser is a `Writable` stream only. It no longer emits a `data` event
  per line.
- The `m3u` event fires on the tick after `end()`, not synchronously inside
  it.
- `EXT-X-PROGRAM-DATE-TIME` sets `date` on the next segment. It is no longer
  a playlist header property.
- `EXT-X-MAP` is parsed per segment (see above). It is no longer a playlist
  header property, so `m3u.get('EXT-X-MAP')` is `undefined`. If you patched
  `PlaylistItem.prototype.toString` to write the map yourself, remove the
  patch, or the tag is written twice.
- `EXT-X-DISCONTINUITY-SEQUENCE` is the integer property
  `discontinuitySequence`.
- `M3U.unserialize` fills in properties missing from older cached data, such
  as `map`.

On every playlist TED serves today (TS master, media and iframe playlists,
and merged intro + talk playlists), the output is byte-for-byte the same as
0.0.10.

## Development

```
nvm use
npm ci
npm test
```

Tests use mocha, should and sinon:
- Unit tests are in `test/*.test.js`.
- Fixture-based tests are in `test/acceptance/`.
- Fixture playlists are in `test/fixtures/`.

CI runs `npm test` on Node 22 and 24 for every pull request and every push
to `main`. Merging to `main` needs passing CI and a review from a code owner.

## Releasing

1. Bump `version` in `package.json` and `package-lock.json` in a pull
   request, e.g. `npm version 1.0.0-beta.2 --no-git-tag-version`.
2. After it merges, create a GitHub release on `main` tagged
   `v<version>`. Mark prereleases as pre-release.
3. The `publish` workflow runs the tests, checks that the tag matches
   `package.json`, and publishes to GitHub Packages.
   - Versions with a hyphen (`1.0.0-beta.1`) get the `next` dist-tag.
   - Other versions get `latest`.

## License

MIT. See [LICENSE.txt](LICENSE.txt).
