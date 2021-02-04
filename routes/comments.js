var express = require("express"),
    router = express.Router({mergeParams: true}), // mergeParams to use id in app.js file where :id is called
    moment = require("moment"),
    Blog = require("../models/blogs"),
    Comment = require("../models/comments");

// for middleware
var middleware = require("../middleware/index"); 
// Works even if /index is not ther because express automatically seach for index.js

/* ====== New Route ====== */ 
router.get("/new", middleware.isLoggedIn ,function(req, res) {
    Blog.findById(req.params.id, function(err, foundBlog) {
        if(err){
            console.log(err);
        } else{
            res.render("Comments/new", {blog: foundBlog});
        }
    });
});

/* ====== Create Route ====== */ 
router.post("/", middleware.isLoggedIn,function(req, res){
    Blog.findById(req.params.id, function(err, foundBlog){
        if(err){
            console.log(err);
        } else {
            // console.log(req.body.comment);
            Comment.create(req.body.comment, function(err, comment){
                if(err){
                    req.flash("error", "Something went wrong");
                    console.log(err);
                } else {
                    // console.log(req.user);
                    comment.author.username=req.user.username;
                    comment.author.id=req.user._id;
                    // console.log(comment);
                    comment.save();
                    foundBlog.comments.push(comment);
                    foundBlog.save();
                    req.flash("success", "Sucessfully added comment");
                    res.redirect("/blogs/"+req.params.id);
                }
            });
        }
    });
});

/* ====== Edit Route ====== */ 

// "/blogs/:id/comments/:comment_id/edit"  :id cant be used twice
router.get("/:comment_id/edit", middleware.checkCommentOwnership ,function(req, res){
    Comment.findById(req.params.comment_id, function(err, foundComment){
        if(err){
            console.log(err);
            res.redirect("back");
        } else {
            res.render("Comments/edit", {blog_id: req.params.id, comment: foundComment});    
        }
    });
});

/* ====== Update Route ====== */ 
router.put("/:comment_id", middleware.checkCommentOwnership ,function(req, res){
    Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function(err, UpdatedComment){
        if(err){
            res.redirect("back");
        } else {
            // console.log(req.params.id);
            res.redirect("/blogs/"+ req.params.id);
        }
    });
});

/* ====== Delete Route ====== */ 
router.delete("/:comment_id", middleware.checkCommentOwnership ,function(req, res){
   Comment.findByIdAndRemove(req.params.comment_id, function(err){
      if(err){
          console.log(err);
          res.redirect("back");
      } else {
          req.flash("success", "Comment deleted");
          res.redirect("/blogs/" + req.params.id);
      }
   });
});

module.exports = router;
