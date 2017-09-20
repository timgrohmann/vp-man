var http = require("http")
var https = require("https")
var urlParser = require('url')
var parseString = require('xml2js').parseString
const teachersCaro = require('./teachers-caro.js');

const PlanRetriever = require('./PlanRetriever.js');

const faecherStrings = {
    'deu': 'Deutsch',
    'mat': 'Mathe',
    'eng': 'Englisch',
    'frz': 'Französisch',
    'lat': 'Latein',
    'rus': 'Russisch',
    'bio': 'Biologie',
    'phy': 'Physik',
    'inf': 'Informatik',
    'eth': 'Ethik',
    'evr': 'Religion',
    'che': 'Chemie',
    'ges': 'Geschichte',
    'soz': 'Sozialkunde',
    'geo': 'Geografie',
    'mus': 'Musik',
    'kun': 'Kunst',
    'spo': 'Sport',
    'ski': 'Skikurs',
    'psy': 'Psychologie',
    '---': 'Entfall'
}
const weekdayStrings = {
    'Mo': 'Montag',
    'Di': 'Dienstag',
    'Mi': 'Mittwoch',
    'Do': 'Donnerstag',
    'Fr': 'Freitag'
}

module.exports = class PlanRetrieverIndie extends PlanRetriever{

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
        parseString(data, function(err, result) {
            if (err !== null) {
                console.log('Das XML konnte nicht geparsed werden.')
                return
            }

            self.plan = {
                url: self.url,
                school_name: self.school.name,
                lessons: []
            }

            if (result.vp == undefined) {
                return
            }
            var vertretungen = result.vp.haupt[0].aktion;
            for (var i = 0; i < vertretungen.length; i++) {
                var rawLesson = vertretungen[i]
                self.plan.lessons.push(self.parseLesson(rawLesson))
            }
            self.plan.forDay = result.vp.kopf[0].titel[0].split("(")[0]
            self.plan.forDate = self.formatDate(result.vp.kopf[0].titel[0].split("(")[0])
            self.plan.lastUpdated = result.vp.kopf[0].datum[0]
        });
    }

    formatDate(dateString){
        dateString = dateString.split(",")[1]
        var d = Date.parse(dateString)
        return d
    }

    parseLesson(data) {
        var lesson = {
            lesson: parseInt(data.stunde[0]),
            teacher: this.replaceTeacherName(this.unRaw(data.lehrer[0])),
            rawTeacher: this.unRaw(data.lehrer[0]),
            subject: this.replaceSubjectName(this.unRaw(data.fach[0])),
            course: this.replaceSubjectNameCourse(this.unRaw(data.klasse[0])),
            rawCourse: this.unRaw(data.klasse[0]),
            info: this.unRaw(data.info[0]),
            room: this.unRaw(data.raum[0]),
            actualLesson: true
        }

        if (lesson.teacher == undefined){
            lesson.actualLesson = false
        } else if (lesson.teacher != undefined && lesson.teacher.match(/\(.+\)/)) {
            lesson.actualLesson = false
        }

        if (lesson.info != undefined){
            lesson.info = lesson.info.replace('eigenverant.', 'eigenverantwortliches')
            lesson.info = this.parseInfo(lesson.info)
        }

        return lesson
    }

    unRaw(obj){
        return (obj.$ == null) ? obj : obj._
    }

    replaceTeacherName(string){
        if (string == null) {
            return
        }
        for (var i = 0; i < teachersCaro.length; i++) {
            string = string.replace(teachersCaro[i].short, teachersCaro[i].name)
        }
        return string
    }

    replaceSubjectName(subject){
        if (subject == null) {
            return
        }

        for (var fach in faecherStrings) {
            if (faecherStrings.hasOwnProperty(fach)) {
                var reg = new RegExp(fach,'i')
                if (subject.match(reg)) {
                    subject = subject.replace(reg, faecherStrings[fach])
                    break
                }
            }
        }
        return subject

    }

    replaceSubjectNameCourse(course){
        if (course == null) {
            return
        }
        for (var fach in faecherStrings) {
            if (faecherStrings.hasOwnProperty(fach)) {
                var reg = new RegExp(fach+'(?=\\d)','i')
                if (course.match(reg)) {
                    course = course.replace(reg, faecherStrings[fach] + " ")
                    break
                }
            }
        }
        return course
    }

    parseInfo(info){
        if (info == null) {
            return
        }

        //Replace subject strings
        for (var fach in faecherStrings) {
            if (faecherStrings.hasOwnProperty(fach)) {
                var reg = new RegExp(fach+'(?=[\\d\\s])','i')
                info = info.replace(reg, faecherStrings[fach] + " ")
            }
        }

        info = info.replace(/St\./g, 'Stunde ')

        for (var i = 0; i < teachersCaro.length; i++) {
            info = info.replace(teachersCaro[i].short, teachersCaro[i].name)
        }

        return info
    }
}
