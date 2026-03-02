const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');

const ALLOWED_CATEGORIES = new Set(['lecture', 'summary', 'formula', 'vocabulary', 'exercise', 'mindmap', 'question', 'other']);

// Protect all routes
router.use(protect);

// GET all notes with filters
router.get('/', async (req, res) => {
  try {
    const { category, subject, isPinned, isArchived, search, tag } = req.query;
    const filter = { user: req.user._id };

    if (category && category !== 'all') filter.category = category;
    if (subject) filter.subject = subject;
    if (isPinned === 'true') filter.isPinned = true;
    if (isArchived !== undefined) filter.isArchived = isArchived === 'true';
    else filter.isArchived = false; // default: hide archived
    if (tag) filter.tags = { $in: [tag] };
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { contentText: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    const notes = await Note.find(filter)
      .populate('subject', 'name color icon')
      .sort({ isPinned: -1, updatedAt: -1 });

    res.json({ success: true, data: notes });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching notes', error: error.message });
  }
});

// GET all tags for user
router.get('/tags', async (req, res) => {
  try {
    const notes = await Note.find({ user: req.user._id }).select('tags');
    const tagSet = new Set();
    notes.forEach(n => n.tags.forEach(t => tagSet.add(t)));
    res.json({ success: true, data: [...tagSet].sort() });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching tags', error: error.message });
  }
});

// POST create note
router.post('/', async (req, res) => {
  try {
    const { title, content, contentText, color, subject, tags, category, isPinned, hasPassword, password } = req.body;

    const normalizedTitle = ((typeof title === 'string' && title.trim()) ? title.trim() : 'Sans titre').slice(0, 200);
    const normalizedContent = typeof content === 'string' ? content : '';
    const normalizedContentText = typeof contentText === 'string' ? contentText : '';
    const normalizedColor = typeof color === 'string' && color.trim() ? color.trim() : '#6366f1';
    const normalizedSubject = subject && subject !== 'null' && subject !== 'undefined' && subject !== '' && mongoose.isValidObjectId(subject)
      ? subject
      : null;
    const normalizedCategory = (typeof category === 'string' && ALLOWED_CATEGORIES.has(category)) ? category : 'other';
    const normalizedTags = Array.isArray(tags)
      ? tags.map(tag => String(tag).trim()).filter(Boolean)
      : [];
    const normalizedPassword = password ? String(password).trim() : '';
    const normalizedHasPassword = Boolean(hasPassword) && Boolean(normalizedPassword);

    const noteData = {
      user: req.user._id,
      title: normalizedTitle,
      content: normalizedContent,
      contentText: normalizedContentText,
      color: normalizedColor,
      subject: normalizedSubject,
      tags: normalizedTags,
      category: normalizedCategory,
      isPinned: Boolean(isPinned),
      hasPassword: normalizedHasPassword
    };

    if (normalizedHasPassword) {
      noteData.password = normalizedPassword;
    }

    const note = await Note.create(noteData);
    const populated = await Note.findById(note._id).populate('subject', 'name color icon');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating note', error: error.message, details: error?.errors || null });
  }
});

// PUT update note
router.put('/:id', async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.user._id });
    if (!note) return res.status(404).json({ success: false, message: 'Note not found' });

    const { title, content, contentText, color, subject, tags, category, isPinned, isArchived, hasPassword, password } = req.body;

    if (title !== undefined) note.title = title;
    if (content !== undefined) note.content = content;
    if (contentText !== undefined) note.contentText = contentText;
    if (color !== undefined) note.color = color;
    if (subject !== undefined) note.subject = subject || null;
    if (tags !== undefined) note.tags = tags;
    if (category !== undefined) note.category = category;
    if (isPinned !== undefined) note.isPinned = isPinned;
    if (isArchived !== undefined) note.isArchived = isArchived;
    const normalizedPassword = password ? String(password).trim() : '';
    if (hasPassword === false) {
      note.password = undefined;
      note.hasPassword = false;
    } else if (hasPassword === true && normalizedPassword) {
      note.password = normalizedPassword;
      note.hasPassword = true;
    }

    await note.save();
    const populated = await Note.findById(note._id).populate('subject', 'name color icon');

    res.json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating note', error: error.message });
  }
});

// DELETE note
router.delete('/:id', async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!note) return res.status(404).json({ success: false, message: 'Note not found' });
    res.json({ success: true, message: 'Note deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting note', error: error.message });
  }
});

// PATCH toggle pin
router.patch('/:id/pin', async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.user._id });
    if (!note) return res.status(404).json({ success: false, message: 'Note not found' });
    note.isPinned = !note.isPinned;
    await note.save();
    const populated = await Note.findById(note._id).populate('subject', 'name color icon');
    res.json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error toggling pin', error: error.message });
  }
});

// PATCH toggle archive
router.patch('/:id/archive', async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.user._id });
    if (!note) return res.status(404).json({ success: false, message: 'Note not found' });
    note.isArchived = !note.isArchived;
    await note.save();
    const populated = await Note.findById(note._id).populate('subject', 'name color icon');
    res.json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error toggling archive', error: error.message });
  }
});

// PATCH change color
router.patch('/:id/color', async (req, res) => {
  try {
    const { color } = req.body;
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { color },
      { new: true }
    ).populate('subject', 'name color icon');
    if (!note) return res.status(404).json({ success: false, message: 'Note not found' });
    res.json({ success: true, data: note });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error changing color', error: error.message });
  }
});

// POST verify password
router.post('/:id/verify-password', async (req, res) => {
  try {
    const { password } = req.body;
    const note = await Note.findOne({ _id: req.params.id, user: req.user._id });
    if (!note) return res.status(404).json({ success: false, message: 'Note not found' });
    if (!note.hasPassword) return res.json({ success: true, message: 'No password required' });

    const isMatch = await note.checkPassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Mot de passe incorrect' });

    res.json({ success: true, message: 'Password verified' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error verifying password', error: error.message });
  }
});

module.exports = router;
