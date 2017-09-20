module.exports = class PlanRetriever{
    constructor(school){
        this.school = school
        this.url = this.school.plan_url
        this.plan = null

        this.update(()=>{})
    }

    getFilteredPlan(filter){
        var filtered = []
        if (this.plan == null) {
            return null;
        }
        for (var i = 0; i < this.plan.lessons.length; i++) {
            var lesson = this.plan.lessons[i]
            if (lesson.course.includes(filter)) {
                filtered.push(lesson)
            }
        }
        return {
            forDay: this.plan.forDay,
            lastUpdated: this.plan.lastUpdated,
            url: this.plan.url,
            school_name: this.plan.school_name,
            lessons: filtered
        }
    }
}
