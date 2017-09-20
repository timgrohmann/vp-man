var express = require('express')
var app = express()

var Data = require('./api.js')

const PlanRetrieverIndie = require('./PlanRetrieverIndie.js')
const PlanRetrieverMgg = require('./PlanRetrieverMgg.js')
const XMOODRetriever = require('./xmoodretriever.js')
const credentials = require('./credentials.secure.js')

const MongoClient = require('mongodb')
const assert = require('assert')

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));

var retrievers = [];
var authRetrievers = [];

var url = 'mongodb://localhost:27017/vpman';

const systems = {
    'xmlindie': PlanRetrieverIndie,
    'mgg': PlanRetrieverMgg,
}

const authSystems = {
    'xmood': XMOODRetriever,
}

Data.querySchools((docs) => {
    for (var i = 0; i < docs.length; i++) {
        var row = docs[i];
        //if (row["plan_sys"] == 'xmlindie') continue
        if (systems[row['plan_sys']] != undefined){
            console.log("Sys:",row["plan_sys"]);
            retrievers.push(new systems[row['plan_sys']](row))
        }
        if (authSystems[row['plan_sys']] != undefined){
            console.log("AuthSys:",row["plan_sys"]);
            authRetrievers.push(new authSystems[row['plan_sys']](row))
        }
    }
    console.log("Länge:",retrievers.length);
})


function reload() {
    console.log('\x1b[32mNew update stated! at %s\x1b[0m', new Date());
    for (var i = 0; i < retrievers.length; i++) {
        var retriever = retrievers[i];
        retriever.update()
    }
    setTimeout(reload, 1000 * 60 * 10);
}
setTimeout(reload, 10000);

app.get('/', (req, res) => {
    var con = []
    for (var i = 0; i < retrievers.length; i++) {
        con.push(retrievers[i].plan);
    }
    res.send({
        status: 200,
        plans: con
    })
})

app.get('/plan/:schoolid', (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');

    var match = null;
    var auth = false;
    for (var i = 0; i < retrievers.length; i++) {
        var element = retrievers[i];
        if (element.school._id == req.params.schoolid) {
            match = element
        }
    }
    for (var i = 0; i < authRetrievers.length; i++) {
        var element = authRetrievers[i];
        if (element.school._id == req.params.schoolid) {
            match = element
            auth = true;
        }
    }

    if (match !== null) {
        if (!auth){
            if (req.query.filter != null) {
                res.send({
                    status: 200,
                    plan: match.getFilteredPlan(req.query.filter)
                })
            } else {
                res.send({
                    status: 200,
                    plan: match.plan
                })
            }
        }else{
            if (req.query.acun != null && req.query.acpw != null){
                match.authUpdate(req.query.acun,req.query.acpw,req.query.page, (data) => {
                    if (data['error'] == 'authError'){
                        res.send({
                            status: 401,
                            plan: data
                        })
                    }else{
                        res.send({
                            status: 200,
                            plan: data
                        })
                    }
                })
            }else{
                res.status(401);
                res.send({
                    status: 401,
                    reason: `Die Schule mit dieser ID (${req.params.schoolid}) benötigt Authenifizierung!`
                });
            }
        }
    } else {
        res.status(404);
        res.send({
            status: 404,
            reason: `Keine Schule mit dieser ID (${req.params.schoolid}) gefunden!`
        });
    }
})

app.get('/schools', (req, res) => {
    Data.querySchools((schools) => {
        res.send({
            status: 200,
            schools: schools
        })
    })
})

/*app.listen(3000, function() {
    console.log('Server is now listening on port 3000 (port forwarding active)');
})*/

require('greenlock-express').create({

    server: 'https://acme-v01.api.letsencrypt.org/directory',
    email: credentials.private.mail,
    agreeTos: true,
    approveDomains: ['vpman.146programming.de'],
    app: app

}).listen(3000, 3001);
