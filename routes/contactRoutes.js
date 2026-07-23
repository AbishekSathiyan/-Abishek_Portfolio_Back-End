import express from "express";
import Contact from "../models/contact.js";

const router = express.Router();

// POST /api/contact/submit – submit a new contact message
router.post("/contact/submit", async (req, res) => {
  try {
    // Remove any fields that shouldn't be set by client
    const { createdAt, updatedAt, isRead, ...formData } = req.body;
    const newContact = new Contact(formData);
    const saved = await newContact.save();

    res.status(201).json({
      success: true,
      message: "Message sent successfully!",
      data: saved,
    });
  } catch (error) {
    // Mongoose validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: messages,
      });
    }

    console.error("Submit error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while submitting message",
    });
  }
});

// GET /api/contact – get all submissions (admin)
router.get("/contact", async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.json({ success: true, contacts });
  } catch (error) {
    console.error("Fetch error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch contacts" });
  }
});

// DELETE /api/contact/:id – delete a submission
router.delete("/contact/:id", async (req, res) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);
    if (!contact) {
      return res.status(404).json({ success: false, message: "Contact not found" });
    }
    res.json({ success: true, message: "Contact deleted" });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ success: false, message: "Failed to delete contact" });
  }
});

// PATCH /api/contact/:id – mark as read
router.patch("/contact/:id", async (req, res) => {
  try {
    const { isRead } = req.body;
    const updateData = { isRead };
    if (isRead) {
      updateData.updatedAt = new Date().toISOString();
    }

    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({ success: false, message: "Contact not found" });
    }

    res.json({ success: true, message: "Updated", data: contact });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ success: false, message: "Failed to update contact" });
  }
});

export default router;