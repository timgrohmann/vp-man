var http = require("http")
var https = require("https")
var urlParser = require('url')

const PlanRetriever = require('./PlanRetriever.js');

const teachersCaro = require('./teachers-caro.js');

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

module.exports = class XMOODRetriever{

    constructor(school){
        this.school = school
        this.url = this.school.plan_url.split("://")[1]
    }

    authUpdate(username, password, page, callback) {


        this.authenticate(username,password,(success, cookie) => {
            if (success){
                if (page == undefined) {
                    page = 0;
                }
                this.getData(cookie,parseInt(page, 0),(data)=>{
                    callback(this.format(data))
                })
            }else{
                callback({error:"authError"})
            }
        })

    }

    authenticate(username, password, callback){
        let post_data = JSON.stringify({
            "model": {
                "UserName": username,
                "Password": password,
                "RememberMe": false,
                "ReturnUrl": ""
            }
        })

        var post_options = {
            host: this.url,
            port: '443',
            path: '/Account/LogOn',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Length': Buffer.byteLength(post_data)
            }
        }
        // Set up the request
        var post_req = https.request(post_options, function(res) {
            res.setEncoding('utf8');
            let cookies = res.headers['set-cookie']
            let applicationCookie = cookies.filter((val) => {
                return val.startsWith('.AspNet.ApplicationCookie')
            })[0]
            var data = ""

            res.on('data', function(chunk) {
                data += chunk
            });
            res.on('end', (error) => {
                let ret = JSON.parse(data)
                //ret['applicationCookie'] = applicationCookie
                callback(ret['success'],applicationCookie)
            })
        });
        // post the data
        post_req.write(post_data);
        post_req.end();
    }

    getData(cookie, off_page, callback){

        var date = new Date()
        var page = 1
        var forToday = true
        if (date.getHours() > 15) {
            forToday = false
        }
        if (date.getDay() == 5 && !forToday) {
            page = 4
        }else if (date.getDay() == 6){
            page = 3
        }else if (date.getDay() == 0){
            page = 2
        }else if (!forToday){
            page = 2
        }

        page = page + off_page;
        console.log("Page",page,"Offpage",off_page);

        var post_options = {
            host: this.url,
            port: '443',
            path: '/Substitution/Home/Ajax_GetGridData?rows=1000&page=' + page + '&OwnSubstitutions=true',
            method: 'GET',
            headers: {
                'Cookie': cookie
            }
        }
        // Set up the request
        var post_req = https.request(post_options, function(res) {
            res.setEncoding('utf8');
            var data = ""

            res.on('data', function(chunk) {
                data += chunk
            });
            res.on('end', (error) => {
                let ret = JSON.parse(data)
                //ret['applicationCookie'] = applicationCookie
                callback(ret)
            })
        });

        post_req.end();
    }

    format(data){
        var plan = {
            url: this.url,
            school_name: this.school.name,
            lessons: [],
            forDay: this.formatDate(data['pageTitle']),
            lastUpdated: this.formatTimeStamp(data['shownTitle'])
        }
        console.log("Got personalized plan from", plan.school_name);

        let lessonData = data['invdata']
        for (var lesson of lessonData) {
            var cLesson = {
                actualLesson: true,
                withOData: true
            }
            cLesson.lesson = lesson['NumberOfLesson']
            cLesson.teacher = this.replaceTeacherName(lesson['RTeachers'])
            cLesson.rawTeacher = lesson['RTeachers']
            if(cLesson.teacher == '--'){
                cLesson.teacher = '---'
                cLesson.actualLesson = false
            }
            cLesson.oTeacher = lesson['Teachers']
            cLesson.subject = this.replaceSubjectName(lesson['RSubject'])
            cLesson.oSubject = lesson['Subject']
            cLesson.room = lesson['RRoom']
            cLesson.oRoom = lesson['Room']
            cLesson.info = lesson['RType']
            if (lesson['RType'] == "Entfall"){
                cLesson.actualLesson = false
                cLesson.info = "Entfall von " + this.replaceSubjectName(lesson['Subject']) + " bei " + this.replaceTeacherName(lesson['Teachers'])
            }
            if (lesson['Remark'] != "--") {
                cLesson.info = lesson['Remark'];
            }
            cLesson.course = lesson['Classes']
            plan.lessons.push(cLesson)
        }

        return plan
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

    formatTimeStamp(input){
        var parts = input.split(" ")
        var day = parts[4]
        var time = parts[7]
        return day + ", " + time
    }

    formatDate(input){
        var parts = input.split(" ")
        return parts[1] + ", " + parts[2] + "." + (new Date()).getFullYear()
    }

    /*{"lesson":1,"teacher":"Grimm","rawTeacher":"GRI","subject":"Sport","course":"5.4","rawCourse":"5.4","info":"für Mathe  Niekau Vertretung","room":"FTH","actualLesson":true}*/

}
