var http = require("http")
var https = require("https")
var urlParser = require('url')
var parseString = require('xml2js').parseString

const cheerio = require('cheerio');
const PlanRetriever = require('./PlanRetriever.js');

module.exports = class PlanRetrieverMgg extends PlanRetriever {

    update(callback) {
        const uri = urlParser.parse(this.url.replace(/\\/g, ""))
        const host = uri.hostname
        const path = uri.path
        var self = this
        var protocol = (uri.protocol == "http:") ? http : https

        protocol.request({
            host: host,
            path: path
        }, (res) => {
            var output = '';
            console.log('Request to', this.url, 'started!')
            res.setEncoding('utf8')
            res.on('data', function(chunk) {
                output += chunk
            });
            res.on('end', () => {
                self.processResponse(output, callback)
            });
        }).on('error',(error) => {console.log("Error occured:",error)}).end();
    }

    processResponse(data, callback) {
        var self = this
        data = data.replace(/tabelle-row-odd/g, '"tabelle-row-odd"')
        data = data.replace(/tabelle-row-even/g, '"tabelle-row-even"')
        data = data.replace(/<tbody><tbody>/g, "<tbody>")

        var ch = cheerio.load(data)
        var h = ch('.art-article table').html()
        var d = ch('h2.tabber_title').html()

        parseString(h, function(err, result) {
            if (err !== null) {
                console.log('Das XML konnte nicht geparsed werden.', err);
            }

            self.plan = {
                url: self.url,
                school_name: self.school.name,
                lessons: []
            }

            result = result['tbody']

            for (var i = 0; i < result['tr'].length; i++) {
                var element = result['tr'][i];
                if (element['td'] != undefined) {
                    var newLesson = self.parseLesson(element['td'])
                    self.plan.lessons.push(newLesson)
                }
            }
            self.plan.forDay = d
            self.plan.lastUpdated = 'unbekannt'
        });
    }

    parseLesson(data) {
        var lesson = {
            lesson: data[0],
            teacher: 'einem Lehrer',
            rawTeacher: '-',
            subject: data[3],
            course: data[1],
            info: data[6],
            room: data[5],
            actualLesson: true
        }

        return lesson
    }
}
