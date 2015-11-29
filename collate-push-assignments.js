var Promise = require("bluebird")
var fsp = Promise.promisifyAll(require("fs"))

module.exports = function (sprintNum, cohort, githubReposAsync, github) {
  collateAndPushAssignments()
  
  function collateAndPushAssignments() {
    githubReposAsync.getContentAsync({
      user: 'dev-academy-programme',
      repo: 'curriculum-private',
      path: 'assignment-programme.json'
    }).then(collateAssignmentsAndStudents)  // multiple, dependent
      .then(createAndPostIssues)
      .catch(function(err) {
        console.log(err);
      })
  }

  function collateAssignmentsAndStudents(data) {
    var allAssignments = convertToJSON(data.content)
    var assignments = allAssignments["sprint-" + sprintNum]
    var promises = [...assignments.map(function(assignment) {
      return fsp.readFileAsync('./assignments/' + assignment, "utf-8")
    }), githubReposAsync.getContentAsync({
      user: 'dev-academy-programme',
      repo: cohort,
      path: "students.json"
    })]
    return Promise.all(promises)
  }

  function createAndPostIssues(data) {
    var students = convertToJSON(data.pop().content).studentGithubNames
    var assignments = data.map(function(assignment) {
      return {
        title: assignment.match(/(?![#\s]).*$/m)[0],
        description: assignment.replace(/\[x\]/g, '[ ]')
      }
    })
    var issues = compileIssuesObject(assignments, students, sprintNum)
    postIssues(issues);
  }

  function compileIssuesObject(assignments, students, sprintNum){
    var issues = []
    for (var i = 0; i < students.length; i++) {
      for (var k = 0; k < assignments.length; k++) {
        issues.push({
          user: 'dev-academy-programme',
          repo: cohort,
          title: assignments[k].title,
          body: assignments[k].description,
          assignee: students[i],
          labels: ['sprint-' + sprintNum]
        })
      }  
    }
    return issues
  }

  function postIssues(issues) {
    for (var i = 0; i < issues.length; i++) {
      github.issues.create(issues[i], function(err, res) {
        if (err) { console.log(err) }
        console.log('assignment: ', res.title);
        printFilteredStudentBoardLink(res.assignee.login);
      })
    };
  }

  function printFilteredStudentBoardLink(student) {
    console.log("posted to: ", "https://waffle.io/dev-academy-programme/" + cohort + "?search=" + student);
  }

  function convertToJSON(data){
    var b = new Buffer(data, 'base64')
    return JSON.parse(b.toString())
  }

  function convertToString(data){
    var b = new Buffer(data, 'base64')
    return b.toString() 
  }
}



