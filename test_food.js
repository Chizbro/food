// Self-check for the non-trivial pure logic. Run: node test_food.js
const assert = require('assert');
const { wikiCountry, wikiCuisine, parseSelected, formatSelected } = require('./app.js');

assert.equal(wikiCountry('South Korea'), 'https://en.wikipedia.org/wiki/South_Korea');
assert.equal(wikiCuisine('Azerbaijani'), 'https://en.wikipedia.org/wiki/Azerbaijani_cuisine');
assert.equal(wikiCuisine('French', 'https://en.wikipedia.org/wiki/Cuisine_of_X'), 'https://en.wikipedia.org/wiki/Cuisine_of_X'); // override wins

const sel = parseSelected('Coq au vin | https://x.com/r | used as inspiration, halved the wine\nRatatouille | my own method\nAush | https://y.com');
assert.deepEqual(sel, [
  { n: 'Coq au vin', u: 'https://x.com/r', note: 'used as inspiration, halved the wine' },
  { n: 'Ratatouille', u: '', note: 'my own method' },
  { n: 'Aush', u: 'https://y.com', note: '' },
]);
assert.equal(formatSelected(sel), 'Coq au vin | https://x.com/r | used as inspiration, halved the wine\nRatatouille | my own method\nAush | https://y.com'); // round-trips
// url detected regardless of order
assert.deepEqual(parseSelected('X | a note | https://z.com'), [{ n: 'X', u: 'https://z.com', note: 'a note' }]);

console.log('ok');
const { googleUrl } = require('./app.js');
assert.equal(googleUrl('Afghanistan', 'kabuli pulao'), 'https://www.google.com/search?q=Afghanistan%20kabuli%20pulao%20recipe');
console.log('ok2');
const { isUrl } = require('./app.js');
assert.equal(isUrl('https://x.com/r'), true);
assert.equal(isUrl('I roasted the lamb first'), false);
assert.equal(isUrl(''), false);
console.log('ok3');
