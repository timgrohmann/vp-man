const credentials = require('./credentials.secure.js')

var le = require('greenlock').create({ server: 'staging' });

var opts = {
  domains: ['vpman.146programming.de'], email: credentials.private.mail, agreeTos: true
};

le.register(opts).then(function (certs) {
  console.log(certs);
  // privkey, cert, chain, expiresAt, issuedAt, subject, altnames
}, function (err) {
  console.error(err);
})
