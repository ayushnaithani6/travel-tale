var middlewareObj = {};

var Blog = require("../models/blogs");
var Comment = require("../models/comments");

middlewareObj.checkBlogOwnership = function (req, res, next){
    if(req.isAuthenticated()){
        // check if user owns blog
        Blog.findById(req.params.id, function(err, foundBlog){
            if(err){
                console.log(err);
                req.flash("error", "Blog not found");
                res.redirect("back");
            }
            else{
                // console.log(typeof(req.user._id) + " " + req.user._id);
                // console.log(typeof(foundBlog.author.id) + " " + foundBlog.author.id);
                if(foundBlog.author.id.equals(req.user._id) || req.user.isAdmin){
                    next();
                }
                else{
                    req.flash("error", "You don't have permission to do that");
                    res.redirect("back");
                }
            }
        });
        
    } else{
        req.flash("error", "You need to be logged in to do that");
        res.redirect("back");
    }
}

middlewareObj.checkCommentOwnership = function (req, res, next){
    if(req.isAuthenticated()){
        // check if the logged in user created comment
        // In database see whats going on it is finding in comments collection and deleting in
        // that and comment have refrence to blog and user to both comments and blogs...
        Comment.findById(req.params.comment_id, function(err, foundComment){
            if(err){
                console.log(err);
                res.redirect("back");
            } else {
                // console.log(typeof(foundComment.author.id));
                // console.log(typeof(req.user._id));
                if( foundComment.author.id.equals(req.user._id) || req.user.isAdmin){
                    next();    
                } else{
                    req.flash("error", "You don't have permission to do that");
                    res.redirect("back");
                }
            }
        });
    }
    else{
        req.flash("error", "You need to be logged in to do that");
        res.redirect("back");
    }
}

middlewareObj.isLoggedIn = function isLoggodIn(req, res ,next){
    if(req.isAuthenticated()){
        return next();
    }
    req.flash("error", "You need be logged in to do that");
    res.redirect("/login");
}

module.exports = middlewareObj;