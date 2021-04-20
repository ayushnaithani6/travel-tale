var express = require("express"),
    router = express.Router(),
    Blog = require("../models/blogs");

// for middleware
var middleware = require("../middleware/index"); 
// Works even if /index is not ther because express automatically search for index.js

// image upload
var multer = require('multer');
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})

var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: 'dyrc4utpz', 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET

});



/* ====== Blogs routes ====== */ 

// Index Blog Route showing all blog posts
router.get("/", function(req, res){
    if(req.query.search) {
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        Blog.find({name: regex}, function(err, allblogs){
            if(err){
                console.log(err);
            } else {
                if(allblogs.length < 1) {
                    req.flash("error", "No related content found");
                    return res.redirect("/blogs");
                } else {
                    res.render("Blogs/index", {blogs: allblogs});
                }
            }
        });

    } else {
        Blog.find({}, function(err, allblogs){
            if(err){
                console.log(err);
            } else {
                res.render("Blogs/index", {blogs: allblogs});
            }
        });
    }
});

/* ====== New Route ====== */ 
router.get("/new", middleware.isLoggedIn ,function(req, res){
   res.render("Blogs/new"); 
});

/* ====== Create Route ====== */ 
router.post("/", middleware.isLoggedIn, upload.single('image'), function(req, res) {
    cloudinary.v2.uploader.upload(req.file.path, function(err, result) {
      if(err) {
        req.flash('error', err.message);
        return res.redirect('back');
      }
      // add cloudinary url for the image to the blog object under image property
      req.body.blog.image = result.secure_url;
      // add image's public_id to blog object
      req.body.blog.imageId = result.public_id;
      // add author to blog
      req.body.blog.author = {
        id: req.user._id,
        username: req.user.username
      }
      
    //   sanitizing body to avoid running scripts 
      req.body.blog.description = req.sanitize(req.body.blog.description);
      
      Blog.create(req.body.blog, function(err, blog) {
        if (err) {
          req.flash('error', err.message);
          return res.redirect('back');
        }
        res.redirect('/blogs/' + blog._id);
      });
    });
});


/* ====== Show Route ====== */ 
router.get("/:id", function(req, res) {
    var id=req.params.id;
    Blog.findById(id).populate("comments").exec(function(err, foundBlog){
      if(err){
          console.log(err);
      }
      else{
        //   console.log("==================Found Blog==============");
        //   console.log(foundBlog);
          res.render("Blogs/show", {blog:foundBlog});
      }
    });
});

/* ====== Edit Route ====== */ 
router.get("/:id/edit", middleware.checkBlogOwnership ,function(req, res){
    Blog.findById( req.params.id, function(err, foundBlog){
        if(err){
            console.log(err);
        } else {
            res.render("Blogs/edit", {blog:foundBlog});
        }
    });
});

/* ====== Update Route ====== */ 
router.put("/:id", middleware.checkBlogOwnership, upload.single("image") ,async function(req, res){
    // checking for scirpts 
    req.body.blog.description = req.sanitize(req.body.blog.description);
    
    Blog.findById(req.params.id, async function(err, foundBlog){
        console.log(foundBlog);
        if(err){
            console.log(err);
            req.flash("error", err.message);
            res.redirect("back");
        } else {
            if(req.file) {
                try {
                    await cloudinary.v2.uploader.destroy(foundBlog.imageId)
                    var result = await cloudinary.v2.uploader.upload(req.file.path);
                    foundBlog.imageId = result.public_id;
                    foundBlog.image = result.secure_url;
                } catch(err) {
                    req.flash("error", err.message);
                    return res.redirect("back");
                }
            }
            foundBlog.name = req.body.blog.name;
            foundBlog.description = req.body.blog.description;
            foundBlog.price = req.body.blog.price;
            foundBlog.save();
            console.log("after updating");
            console.log(foundBlog);
            req.flash("success", "Successfully Updated!");
            res.redirect("/blogs/"+req.params.id);
        }
    });
});

/* ====== Delete Route ====== */ 
router.delete("/:id", middleware.checkBlogOwnership ,function(req, res){
    Blog.findById(req.params.id, async function(err, foundBlog){
        if(err){
            console.log(err);
            req.flash("error", err.message);
            return res.redirect("back");
        }
        try {
            // deleting from cloudinary
            console.log(foundBlog.imageId);
            await cloudinary.v2.uploader.destroy(foundBlog.imageId);
            // deleting from the database
            foundBlog.remove();
            req.flash("sucess", "Blog deleted Successfully !");
            res.redirect("/blogs")
        } catch(err) {
            if(err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
        }
    });
});


function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports = router;
