var express = require("express"),
    router = express.Router(),
    User = require("../models/user"),
    passport = require("passport"),
    async = require("async"),
    nodemailer = require("nodemailer"),
    crypto = require("crypto");
var Blog = require("../models/blogs");


//  root route
router.get("/", function(req, res){
   res.render("landingPage");
});




// ===============Auth routes =================

// Register
router.get("/register", function(req, res){
    res.render("register");
});

// register logic goes here
router.post("/register", function(req, res){
    var newUser = new User({
      username: req.body.username, 
      email: req.body.email, 
      firstName: req.body.firstName,
      lastName: req.body.lastName
    });
    
    // eval(require("locus"));
    // console.log(process.env.SECRET);
    // console.log(req.body.adminCode);
    // console.log(typeof(process.env.SECRET));
    if(req.body.adminCode === process.env.SECRET) {
        newUser.isAdmin = true;
    }
    // console.log(newUser);
    User.register(newUser, req.body.password, function(err, user){
        if(err){
            // console.log(typeof(err));
            if(err.code === 11000 && err.name === "MongoError") {
              //console.log(typeof(err.message));
              req.flash("error", "User with email \"" + req.body.email + "\" already exists");
            }
            else {
              req.flash("error", err.message);
            }
            // console.log(err.name + err.code);
            res.redirect("back");
        } else {
            passport.authenticate("local")(req, res, function(){
                req.flash("success", "Welcome to TravelTale " + user.username);
                res.redirect("/blogs");
            });
        }
    });
});

// Login
router.get("/login",function(req, res){
    res.render("login");
});

// Login Logic goes here
//      Route name, middleware, callback
router.post("/login", passport.authenticate("local", 
    {
    successRedirect:"/blogs",
    failureRedirect:"/login",
    failureFlash: "Invalid Username or Password (username and password both are case sensitive)"
    }) , function(req,res){
});

// logout
router.get("/logout", function(req, res){
   req.logout();
   req.flash("success", "Logged you out!");
   res.redirect("/blogs");
});



// my implementation forgot password logic



router.get('/forgot', function(req, res) {
  res.render('forgot');
});

router.post('/forgot', function(req, res, next) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'traveltaleofficial@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'traveltaleofficail@gmail.com',
        subject: 'TravelTale forgotten username or password',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your travelTale account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'Username : '+ user.username + '\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        console.log('mail sent');
        req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/forgot');
  });
});

router.get('/reset/:token', function(req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('reset', {token: req.params.token});
  });
});

router.post('/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }
        if(req.body.password === req.body.confirm) {
          user.setPassword(req.body.password, function(err) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            user.save(function(err) {
              req.logIn(user, function(err) {
                done(err, user);
              });
            });
          })
        } else {
            req.flash("error", "Passwords do not match.");
            return res.redirect('back');
        }
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'traveltaleofficial@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'traveltaleofficial@gmail.com',
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your travelTale account ' + user.email + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
    res.redirect('/blogs');
  });
});



// User Profile 
router.get("/users/:id", function(req, res) {
  User.findById(req.params.id, function(err, foundUser){
    if(err) {
      req.flash("error", "Something went wrong");
      return res.redirect("/");
    }
      // console.log(foundUser);
      Blog.find().where('author.id').equals(foundUser._id).exec(function(err, blogs){
        if(err) {
          req.flash("error", "Something went wrong");
          return res.redirect("/");
        }
        res.render("Users/show", {user: foundUser, blogs: blogs});
      })
  });
});


module.exports = router;