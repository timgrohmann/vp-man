const MongoClient = require('mongodb')
const assert = require('assert')
const credentials = require('./credentials.secure.js')


var schoolList = null;

exports.querySchools = function(callback) {
    if (schoolList != null) {
        callback(schoolList)
    } else {
        MongoClient.connect(credentials.db.url, function(err, db) {
            assert.equal(null, err);
            console.log("Connected successfully to database");

            db.authenticate(credentials.db.username, credentials.db.password, function(err, res) {
                assert.equal(null, err);
                var schools = db.collection('schools')
                schools.find({}).toArray(function(error, docs) {
                    schoolList = docs
                    callback(docs)
                    db.close()
                })
            })

        })
    }
}
