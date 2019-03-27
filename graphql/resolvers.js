const bcrypt = require("bcryptjs");
const { isEmail, isEmpty, isLength } = require("validator");

const User = require("../models/user");

module.exports = {
  // createUser(args, req){
  createUser: async function({ userInput }, req) {
    const { email, name, password } = userInput;

    // input validation
    const errors = [];
    if (!isEmail(email)) errors.push({ message: "E-Mail is invalid." });
    if (isEmpty(password) || !isLength(password, { min: 5 }))
      errors.push({ message: "Password to short." });

    if (errors.length > 0) {
      const error = new Error("Invalid input");
      error.data = errors;
      error.statusCode = 422;
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
  }
};
