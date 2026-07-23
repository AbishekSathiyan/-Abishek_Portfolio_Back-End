import express from "express";
import Contact from "../models/contact.js";
import { sendMail } from "../utils/sendEmail.js";

const router = express.Router();

// POST /api/contact/submit
router.post("/contact/submit", async (req, res) => {
  try {
    const { createdAt, updatedAt, isRead, ...formData } = req.body;

    // ----- Duplicate check (prevents spam) -----
    const existing = await Contact.findOne({ email: formData.email });
    if (existing) {
      return res.json({
        success: true,
        message: "Your message has already been submitted. Thank you!",
      });
    }

    // Save new contact (always – even if emails fail later)
    const newContact = new Contact(formData);
    const saved = await newContact.save();

    // Try to send emails, but don't break the API if they fail
    try {
      // Confirmation to user
      await sendMail({
        to: saved.email,
        subject: "We received your message",
        html: `
          <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: auto; padding: 24px; background-color: #ffffff;">
            <div style="border-bottom: 4px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px;">
              <h2 style="color: #1e293b; margin: 0 0 4px 0;">Hello ${saved.name}</h2>
              <p style="color: #64748b; margin: 0;">Thank you for contacting me. Your message has been received.</p>
            </div>
            <p style="color: #334155; font-size: 16px;"><strong>Subject:</strong> ${saved.subject}</p>
            <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; margin: 24px 0;">
              <p style="color: #334155; margin: 0 0 8px 0; font-size: 14px;"><strong>Your message:</strong></p>
              <p style="color: #475569; margin: 0; font-size: 15px;">${saved.message}</p>
            </div>
            <p style="color: #64748b; font-size: 14px; margin: 24px 0 8px 0;">I'll get back to you as soon as possible.</p>
            <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px;">
              <p style="color: #1e293b; font-size: 15px; margin: 0 0 4px 0;">Best regards,</p>
              <p style="color: #1e293b; font-size: 16px; font-weight: bold; margin: 0;">Abishek Sathiyan</p>
              <p style="color: #64748b; font-size: 14px; margin: 12px 0 0 0;">
                You can contact me directly at 
                <a href="mailto:${process.env.EMAIL_USER}" style="color: #2563eb; text-decoration: none;">Mail</a> 
                or visit my portfolio at 
                <a href="https://abisheksathiyan-portfolio-front-end.vercel.app/" target="_blank" style="color: #2563eb; text-decoration: none;">AbishekSathiyan</a>.
              </p>
            </div>
          </div>
        `,
      });

      // Notification to admin
      await sendMail({
        to: process.env.EMAIL_USER,
        subject: `New Contact: ${saved.subject}`,
        html: `
          <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: auto; padding: 24px; background-color: #ffffff;">
            <div style="border-bottom: 4px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px;">
              <h2 style="color: #1e293b; margin: 0 0 4px 0;">New Contact Submission</h2>
              <p style="color: #64748b; margin: 0;">You received a new message from the portfolio.</p>
            </div>
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 24px;">
              <tr><td style="padding: 6px 0; color: #334155; font-weight: bold;">Name:</td><td style="padding: 6px 0; color: #1e293b;">${saved.name}</td></tr>
              <tr><td style="padding: 6px 0; color: #334155; font-weight: bold;">Email:</td><td style="padding: 6px 0; color: #1e293b;"><a href="mailto:${saved.email}" style="color: #2563eb; text-decoration: none;">${saved.email}</a></td></tr>
              <tr><td style="padding: 6px 0; color: #334155; font-weight: bold;">Phone:</td><td style="padding: 6px 0; color: #1e293b;">${saved.contact}</td></tr>
              <tr><td style="padding: 6px 0; color: #334155; font-weight: bold;">Subject:</td><td style="padding: 6px 0; color: #1e293b;">${saved.subject}</td></tr>
            </table>
            <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px;">
              <p style="color: #334155; margin: 0 0 8px 0; font-size: 14px;"><strong>Message:</strong></p>
              <p style="color: #475569; margin: 0; font-size: 15px;">${saved.message}</p>
            </div>
          </div>
        `,
      });
    } catch (mailError) {
      console.error("Could not send email:", mailError.message);
      // Optionally store this error in the contact document for later debugging
    }

    // Always return success – the message was saved
    res.status(201).json({
      success: true,
      message: "Message submitted successfully.",
      data: saved,
    });
  } catch (error) {
    console.error("Submit Error:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: messages,
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error while submitting message",
    });
  }
});

// GET all contacts
router.get("/contact", async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.json({ success: true, contacts });
  } catch (error) {
    console.error("Fetch error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch contacts" });
  }
});

// DELETE contact
router.delete("/contact/:id", async (req, res) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);
    if (!contact) {
      return res
        .status(404)
        .json({ success: false, message: "Contact not found" });
    }
    res.json({ success: true, message: "Contact deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete contact" });
  }
});

// Mark as read
router.patch("/contact/:id", async (req, res) => {
  try {
    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { isRead: req.body.isRead, updatedAt: new Date() },
      { new: true },
    );
    if (!contact) {
      return res
        .status(404)
        .json({ success: false, message: "Contact not found" });
    }
    res.json({ success: true, message: "Contact updated", data: contact });
  } catch (error) {
    console.error("Update error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update contact" });
  }
});

export default router;
