import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    contact: {
      type: String,
      required: [true, "Phone number is required"],
      validate: {
        validator: function (v) {
          return /^[0-9]{10}$/.test(v.replace(/\D/g, ""));
        },
        message: "Invalid 10-digit phone number",
      },
    },
    subject: {
      type: String,
      default: "General Inquiry",
      enum: [
        "General Inquiry",
        "Project Proposal",
        "Freelance Work",
        "Collaboration",
        "Other",
      ],
    },
    message: {
      type: String,
      required: [true, "Message is required"],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

const Contact = mongoose.model("Contact", contactSchema);
export default Contact;