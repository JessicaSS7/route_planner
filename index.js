const express = require('express')
var bodyParser = require('body-parser');
const path = require('path')
const PORT = process.env.PORT || 5000
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

function capitalize(word) {
    return word.trim().split(' ').filter(function(w) {
        return w.length > 0;
    }).map(function(w) {
        return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');
}

/* Credit: https://stackoverflow.com/questions/27928/calculate-distance-between-two-latitude-longitude-points-haversine-formula. */
// Distance in miles between (lat, long) pairs.
function geoDistance(lat1, lng1, lat2, lng2) {
    const a = 3963.19059; // equitorial radius in miles
    const b = 3949.90257; // polar radius in miles

    var sq = x => (x * x);
    var sqr = x => Math.sqrt(x);
    var cos = x => Math.cos(x);
    var sin = x => Math.sin(x);
    var radius = lat => sqr((sq(a * a * cos(lat)) + sq(b * b * sin(lat))) / (sq(a * cos(lat)) + sq(b * sin(lat))));

    lat1 = lat1 * Math.PI / 180;
    lng1 = lng1 * Math.PI / 180;
    lat2 = lat2 * Math.PI / 180;
    lng2 = lng2 * Math.PI / 180;

    var R1 = radius(lat1);
    var x1 = R1 * cos(lat1) * cos(lng1);
    var y1 = R1 * cos(lat1) * sin(lng1);
    var z1 = R1 * sin(lat1);

    var R2 = radius(lat2);
    var x2 = R2 * cos(lat2) * cos(lng2);
    var y2 = R2 * cos(lat2) * sin(lng2);
    var z2 = R2 * sin(lat2);

    return sqr(sq(x1 - x2) + sq(y1 - y2) + sq(z1 - z2));
}

express()
    .use(express.static(path.join(__dirname, 'public')))
    .use(bodyParser.urlencoded({ extended: false }))
    .use(bodyParser.json())
    .use((req, res, next) => {
        res.set('Cache-Control', 'no-store')
        next()
    })
    .set('views', path.join(__dirname, 'views'))
    .set('view engine', 'ejs')
    .get('/', (req, res) => res.render('pages/index'))
    .get('/search_examples', (req, res) => {
        res.render('pages/search_tips');
    })
    .post('/search', async(req, res) => {
        try {
            var start = new Date().getTime();
            const client = await pool.connect();
            const query = req.body.query.toLowerCase();
            const long = req.body.long;
            const lat = req.body.lat;
            // Initializes with only the starting/end point.
            var results = [{
                'results': [{
                    'latitude': lat,
                    'longitude': long,
                }],
                'distance': 0,
            }];
            for (const location_query of query.split('then')) {
                var keywords = location_query.split(' ');
                // Gets the city longitude and latitude.
                var query_text = 'SELECT * FROM index WHERE latitude > ' + (lat - 1) + ' AND latitude < ' + (lat + 1) + ' AND longitude > ' + (long - 1) + ' AND longitude < ' + (long + 1) + ' ';
                var count = 1;
                var values = [];
                for (const keyword of keywords) {
                    if (keyword.trim() === '') {
                        continue;
                    }
                    query_text += ' AND '
                    query_text += ' (LOWER(categories) LIKE $' + count.toString() + ' OR LOWER(name) LIKE $' + count.toString() + ') ';
                    values.push('%' + keyword.trim() + '%');
                    ++count;
                }
                if (count === 1) {
                    res.render('pages/error', { 'query': query, 'error': 'Query is empty' });
                    client.release();
                    return;
                }
                var sql_query = {
                    text: query_text,
                    values: values,
                };
                const result = await client.query(sql_query);
                if (result.rows.length === 0) {
                    // No result available.
                    res.render('pages/error', { 'error': 'No result available', 'query': query });
                    client.release();
                    return;
                }
                new_results = [];
                // Expands the current results.
                for (const current_result of results) {
                    const last_result = current_result['results'].slice(-1)[0];
                    for (const entry of result.rows) {
                        const new_entry = JSON.parse(JSON.stringify(entry));
                        new_entry['raw_query'] = capitalize(location_query);
                        var duplicate = false;
                        for (const existing_result of current_result['results']) {
                            if (existing_result.name !== undefined && existing_result.name === new_entry.name && existing_result.address === new_entry.address) {
                                duplicate = true;
                                break;
                            }
                        }
                        if (duplicate) {
                            continue;
                        }
                        var expanded_result = JSON.parse(JSON.stringify(current_result));
                        expanded_result['distance'] += geoDistance(last_result['latitude'], last_result['longitude'], new_entry['latitude'], new_entry['longitude']);
                        expanded_result['results'].push(new_entry);
                        new_results.push(expanded_result);
                    }
                }
                new_results.sort((a, b) => a.distance - b.distance);
                new_results.splice(10, new_results.length);
                results = new_results;
            }
            // Updates the distance with the return to end location.
            for (result of results) {
                const last_result = result['results'].slice(-1)[0];
                result['distance'] += geoDistance(last_result['latitude'], last_result['longitude'], lat, long);
            }
            // Removes the first element which is the starting location itself.
            for (result of results) {
                result['results'].splice(0, 1);
            }
            results.sort((a, b) => a.distance - b.distance);
            results.splice(10, results.length);
            var end = new Date().getTime();
            var dur = end - start;
            res.render('pages/db', { 'results': results, 'query': query, 'long': long, 'lat': lat, 'dur': dur });
            client.release();
        } catch (err) {
            res.render('pages/error', { 'error': err, 'query': '' });
        }
    })
    .listen(PORT, () => console.log(`Listening on ${PORT}`))