const { validationResult } = require("express-validator/check");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/user");

exports.signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed");
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }

  const { email, password, name } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = new User({
      email,
      password: hashedPassword,
      name
    });

    const result = await newUser.save();
    res.status(201).json({ message: "User created!", userId: result._id });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const loadedUser = await User.findOne({ email });

    if (!loadedUser) {
      const error = new Error("User with that email not found!");
      error.statusCode = 404;
      throw error;
    }

    const isEqual = await bcrypt.compare(password, loadedUser.password);

    if (!isEqual) {
      const error = new Error("Password incorrect!");
      error.statusCode = 401;
      throw error;
    }

    const token = jwt.sign(
      {
        email: loadedUser.email,
        userId: loadedUser._id.toString()
      },
      "secretword",
      { expiresIn: "1h" }
    );
    res.status(200).json({ token, userId: loadedUser._id.toString() });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getStatus = async (req, res, next) => {
  const user = await User.findById(req.userId);
  try {
    if (!user) {
      const error = new Error("User not found!");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      message: `User status for ${req.userId}`,
      status: user.status
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed");
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }

  const newStatus = req.body.status;
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      const error = new Error("User not found!");
      error.statusCode = 404;
      throw error;
    }
    user.status = newStatus;
    await user.save();

    res.status(200).json({ message: "User status updated." });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
