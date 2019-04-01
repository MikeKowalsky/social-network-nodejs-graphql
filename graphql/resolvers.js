const bcrypt = require("bcryptjs");
const { isEmail, isEmpty, isLength } = require("validator");
const jwt = require("jsonwebtoken");

const User = require("../models/user");
const Post = require("../models/post");

const { clearImage } = require("../utils/file");

module.exports = {
  // createUser(args, req){
  createUser: async ({ userInput }, req) => {
    const { email, name, password } = userInput;

    // input validation
    const errors = [];
    if (!isEmail(email)) errors.push({ message: "E-Mail is invalid." });
    if (isEmpty(password) || !isLength(password, { min: 5 }))
      errors.push({ message: "Password to short." });

    if (errors.length > 0) {
      const error = new Error("Invalid input");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const error = new Error("User exists already.");
      throw error;
    }
    const hashedPw = await bcrypt.hash(password, 12);
    const user = new User({
      email,
      name,
      password: hashedPw
    });
    const createdUser = await user.save();
    return { ...createdUser._doc, _id: createdUser._id.toString() };
  },
  login: async ({ email, password }) => {
    const user = await User.findOne({ email });
    if (!user) {
      const error = new Error("User not found.");
      error.code = 401;
      throw error;
    }
    const isEqual = await bcrypt.compare(password, user.password);
    if (!isEqual) {
      const error = new Error("Password incorrect.");
      error.code = 401;
      throw error;
    }
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email
      },
      "somesupersecret",
      { expiresIn: "1h" }
    );
    return { token, userId: user._id.toString() };
  },
  createPost: async ({ postInput }, req) => {
    if (!req.isAuth) {
      const error = new Error("User not authenticated.");
      error.code = 401;
      throw error;
    }
    const { title, content, imageUrl } = postInput;
    const errors = [];
    if (isEmpty(title) || !isLength(title, { min: 5 }))
      errors.push({ message: "Title is incorrect." });
    if (isEmpty(content) || !isLength(content, { min: 5 }))
      errors.push({ message: "Content is incorrect." });

    if (errors.length > 0) {
      const error = new Error("Invalid input");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("User does not exist.");
      error.code = 401;
      throw error;
    }
    const post = new Post({ title, content, imageUrl, creator: user });
    const createdPost = await post.save();

    user.posts.push(createdPost);
    await user.save();

    return {
      ...createdPost._doc,
      _id: createdPost._id.toString(),
      createdAt: createdPost.createdAt.toISOString(),
      updatedAt: createdPost.updatedAt.toISOString()
    };
  },
  posts: async ({ page }, req) => {
    if (!req.isAuth) {
      const error = new Error("User not authenticated.");
      error.code = 401;
      throw error;
    }
    if (!page) {
      page = 1;
    }
    const perPage = 2;
    const totalPosts = await Post.find().countDocuments();
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .populate("creator");

    return {
      posts: posts.map(p => ({
        ...p._doc,
        _id: p._id.toString(),
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString()
      })),
      totalPosts
    };
  },
  post: async ({ id }, req) => {
    if (!req.isAuth) {
      const error = new Error("User not authenticated.");
      error.code = 401;
      throw error;
    }
    const post = await Post.findById(id).populate("creator");
    if (!post) {
      const error = new Error("Post not found.");
      error.code = 404;
      throw Error;
    }
    return {
      ...post._doc,
      _id: post._id.toString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString()
    };
  },
  updatePost: async ({ id, postInput }, req) => {
    if (!req.isAuth) {
      const error = new Error("User not authenticated.");
      error.code = 401;
      throw error;
    }
    const post = await Post.findById(id).populate("creator");
    if (!post) {
      const error = new Error("Post not found.");
      error.code = 404;
      throw Error;
    }
    if (post.creator._id.toString() !== req.userId.toString()) {
      const error = new Error("Not authorized.");
      error.code = 403;
      throw Error;
    }
    const { title, content, imageUrl } = postInput;
    const errors = [];
    if (isEmpty(title) || !isLength(title, { min: 5 }))
      errors.push({ message: "Title is incorrect." });
    if (isEmpty(content) || !isLength(content, { min: 5 }))
      errors.push({ message: "Content is incorrect." });

    if (errors.length > 0) {
      const error = new Error("Invalid input");
      error.data = errors;
      error.code = 422;
      throw error;
    }
    post.title = title;
    postcontent = content;
    if (postInput.imageUrl !== "undefined") post.imageUrl = imageUrl;
    const updatedPost = await post.save();
    return {
      ...updatedPost._doc,
      _id: updatedPost._id.toString(),
      createdAt: updatedPost.createdAt.toISOString(),
      updatedAt: updatedPost.updatedAt.toISOString()
    };
  },
  deletePost: async ({ id }, req) => {
    if (!req.isAuth) {
      const error = new Error("User not authenticated.");
      error.code = 401;
      throw error;
    }
    const post = await Post.findById(id);
    if (!post) {
      const error = new Error("Post not found.");
      error.code = 404;
      throw Error;
    }
    if (post.creator.toString() !== req.userId.toString()) {
      const error = new Error("Not authorized.");
      error.code = 403;
      throw Error;
    }
    clearImage(post.imageUrl);
    await Post.findOneAndDelete(id);
    const user = await User.findById(req.userId);
    user.posts.pull(id);
    await user.save;
    return true;
  },
  user: async (args, req) => {
    if (!req.isAuth) {
      const error = new Error("User not authenticated.");
      error.code = 401;
      throw error;
    }
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("User not found.");
      error.code = 404;
      throw Error;
    }
    return {
      ...user._doc,
      _id: user._id.toString()
    };
  },
  updateStatus: async ({ status }, req) => {
    if (!req.isAuth) {
      const error = new Error("User not authenticated.");
      error.code = 401;
      throw error;
    }
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("User not found.");
      error.code = 404;
      throw Error;
    }
    user.status = status;
    await user.save();
    return {
      ...user._doc,
      _id: user._id.toString()
    };
  }
};
