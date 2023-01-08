const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const mongoose = require('mongoose');
const bcrypt = require("bcrypt");
const saltRounds = 10;
const randCode = require(__dirname + "/create_code.js");

const app = express();
app.use(express.static(__dirname + "public"));

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static("public"));

////////////////// DATABASE //////////////////////////////////////////////////
mongoose.connect("mongodb://127.0.0.1:27017/surveyoursDB", {
    useNewUrlParser: true
});

const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String
});

const surveySchema = new mongoose.Schema({
    title: String,
    question: [],
    code: String,
    user: String
});

const respondentSchema = new mongoose.Schema({
    answer: [],
    code: String,
    feedback: String
})

const User = new mongoose.model("User", userSchema);
const Survey = new mongoose.model("Survey", surveySchema);
const Answer = new mongoose.model("Answer", respondentSchema);

////////////////////////// API /////////////////////////////////////////////////

app.get("/", function (req, res) {
    res.render("Respondent_Screen");
});

app.post("/", function (req, res) {
    res.redirect("/");
});

app.get("/survey/:surveyCode", function (req, res) {
    const requestedCode = req.params.surveyCode;
    Survey.findOne({
        code: requestedCode
    }, function (err, foundSurvey) {
        if (err) {
            console.log(err);
        } else {
            if (foundSurvey) {
                res.render("Survey_screen", {
                    title: foundSurvey.title,
                    question: foundSurvey.question,
                    requestedCode: requestedCode
                });
            }
        }
    });
});

app.post("/survey/:surveyCode", function (req, res) {
    const requestedCode = req.params.surveyCode;

    Survey.findOne({
        code: requestedCode
    }, function (err, foundSurvey) {
        const newAnswer = new Answer({
            answer: req.body.postAnswer,
            code: requestedCode,
            feedback: req.body.feedback
        })
        newAnswer.save(function (err) {
            if (!err) {
                res.redirect("/");
            } else {
                console.log(err);
            }
        })
    });
});

app.get("/register", function (req, res) {
    res.render("SignUp_Screen");
});

app.post("/register", function (req, res) {

    bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
        const newUser = new User({
            username: req.body.username,
            email: req.body.email,
            password: hash
        });

        newUser.save(function (err) {
            if (!err) {
                res.redirect("/login");
            } else {
                console.log(err);
            }
        });
    });
});

app.get("/login", function (req, res) {
    res.render("SignIn_Screen");
});

app.post("/login", function (req, res) {
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({
        username: username
    }, function (err, foundUser) {
        if (err) {
            console.log(err);
        } else {
            if (foundUser) {
                bcrypt.compare(password, foundUser.password, function (err, result) {
                    if (result === true) {
                        res.redirect("/dashboard/" + username);
                    }
                });
            }
        }
    });
});

app.get("/change", function(req, res){
    res.render("Change_screen");
})


app.post("/change", function(req, res){
    const email = req.body.email;
    const password = req.body.password;

    User.findOne({
        email: email
    }, function (err, foundUser) {
        if (err) {
            console.log(err);
        } else {
            if (foundUser) {
                bcrypt.compare(password, foundUser.password, function (err, result) {
                    if (result === true) {
                        bcrypt.hash(req.body.newPassword, saltRounds, function (err, hash){
                            User.updateOne({email: email},{ password: hash },function (err) {
                                if (!err) {
                                    res.redirect("/login");
                                }else{
                                    console.log(err);
                                }
                            }
                        );
                        })
                    }
                });
            }
        }
    });
})

app.get("/dashboard/:userName", function (req, res) {
    const requestedUser = req.params.userName;
    
    Survey.find({
        user: requestedUser
    }, function (err, foundSurveys) {
        res.render("Dashboard", {
            surveys: foundSurveys,
            requestedUser: requestedUser
        });
    });
});

app.post("/dashboard/:userName", function (req, res) {
    const requestedUser = req.params.userName;
    const deleteID = req.body.delete;

    Survey.findByIdAndRemove(deleteID, function (err) {
        if (!err) {
          console.log("Succesfully delete an item");
          res.redirect("/dashboard/" + requestedUser);
        }
      })
});

app.get("/surveyResponden/:userName/:surveyCode", function (req, res) {
    const requestedCode = req.params.surveyCode;
    const requestedUser = req.params.userName;
    Answer.find({
        code: requestedCode
    }, function (err, foundCode) {
        Survey.findOne({
            code: requestedCode
        }, function (err, foundTitle) {
            res.render("survey_respondent", {
                title: foundTitle.title,
                answers: foundCode,
                requestedCode: requestedCode,
                requestedUser: requestedUser
            });
        })
    });
});

app.post("/surveyResponden/:userName/:surveyCode", function (req, res) {
    const requestedCode = req.params.surveyCode;
    const requestedUser = req.params.userName;

    Survey.updateOne({code: requestedCode},{ title: req.body.newTitle},function (err) {
        if (!err) {
            res.redirect("/surveyResponden/" + requestedUser + "/" + requestedCode);
        }else{
            console.log(err);
        }
    });
});

app.get("/answer/:userName/:surveyCode/:respondentID", function (req, res) {
    const requestedUser = req.params.userName;
    const requestedID = req.params.respondentID;
    const requestedCode = req.params.surveyCode;
    Answer.findOne({
        _id: requestedID
    }, function (err, foundCode) {
        Survey.findOne({
            code: requestedCode
        }, function (err, foundSurvey) {
            res.render("Respondent_answer", {
                questions: foundSurvey.question,
                answers: foundCode,
                feedback: foundCode,
                requestedID: requestedID,
                requestedCode: requestedCode,
                requestedUser: requestedUser
            });
        })
    });
});

app.post("/answer/:userName/:surveyCode/:respondentID", function (req, res){
    const requestedUser = req.params.userName;
    const requestedCode = req.params.surveyCode;
    const deleteID = req.body.delete;

    Answer.findByIdAndRemove(deleteID, function (err) {
        if (!err) {
          console.log("Succesfully delete an item");
          res.redirect("/surveyResponden/" + requestedUser + "/" + requestedCode);
        }
      })
});

app.get("/create/:userName", function (req, res) {
    const requestedUser = req.params.userName;
    res.render("Create_screen", {
        requestedUser: requestedUser
    });
});

app.post("/create/:userName", function (req, res) {
    const requestedUser = req.params.userName;
    const newSurvey = new Survey({
        title: req.body.postTitle,
        question: req.body.postQuestion,
        code: randCode.randNum(4),
        user: requestedUser
    });


    newSurvey.save(function (err) {
        if (!err) {
            res.redirect("/dashboard/" + requestedUser);
        } else {
            console.log(err);
        }
    })
});

app.listen(3000, function () {
    console.log("Server started on port 3000")
});