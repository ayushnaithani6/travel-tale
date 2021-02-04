require('dotenv').config()
var express = require("express"),
    app = express(),
    bodyParser = require("body-parser"),
    mongoose = require("mongoose"),
    passport = require("passport"),
    LocalStrategy = require("passport-local"),
    flash = require("connect-flash"),
    moment = require("moment"),
    methodOverride = require("method-override"),
    User = require("./models/user");

// requiring Routes
var commentRoutes = require("./routes/comments");
var blogsRoutes = require("./routes/blogs");
var indexRoutes = require("./routes/index");

var url = process.env.DATABASEURL || "mongodb://localhost/traveltale";
mongoose.connect(url, {useUnifiedTopology: true, useNewUrlParser: true, useCreateIndex: true });

app.locals.moment = moment;  // for using moment in ejs files
app.use(bodyParser.urlencoded( {extended: true}));
app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs");
mongoose.set('useFindAndModify', false); // for depreciation warning 
app.use(methodOverride("_method"));

app.use(flash());

// Auth CONFIG
app.use(require("express-session")({
    secret: "Rusty is Still the best",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// to use req.user information in all ejs files in order to campare for authorization
// or in partials inorder to decide to show login or sign up ---- or logout if login
app.use(function(req, res, next){
    res.locals.currentUser = req.user; // currentUser if not logged in is undefined 
    // if logged in then it has all which req.user have
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
});


// using routes
app.use("/", indexRoutes);
app.use("/blogs",blogsRoutes); // all BLOG routes starts with '/blogs'
app.use("/blogs/:id/comments", commentRoutes);


// Port listner
app.listen(process.env.PORT, process.env.IP, function(){
    console.log("TravelTale Server has Started!!");
});