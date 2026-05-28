const mongoose = require('mongoose');
const dotenv = require('dotenv');
const crypto = require('crypto');
const path = require('path');

dotenv.config();

const StudyPack = require('./models/StudyPack');
require('./models/User');

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected!');

    // Find the first user in database to use as owner
    const User = mongoose.model('User');
    const user = await User.findOne();
    if (!user) {
      console.error('❌ No users found in database to run test!');
      process.exit(1);
    }
    console.log('Using test user:', user.email);

    // Payload from user request
    const packData = {
      "title": "dzfzdf",
      "subject": "physique",
      "description": "zdfzef",
      "notes": [
        {
          "id": "b1fc8b9b-e46e-42e1-a94e-95c8b424fb8a",
          "title": "Inheritance",
          "content": "Inheritance allows a class to acquire properties and behavior from another class.",
          "tags": ["java", "oop"],
          "isPinned": true,
          "createdAt": "2026-05-28T10:50:20.285Z",
          "updatedAt": "2026-05-28T10:50:20.285Z"
        }
      ],
      "flashcards": [
        {
          "id": "d893e41a-a1ec-48b5-b83e-423c4e53c312",
          "front": "QSDF",
          "back": "QSDFSQDF",
          "createdAt": "2026-05-28T09:50:08.527Z",
          "difficulty": "easy",
          "lastReviewed": "2026-05-28T10:46:33.505Z"
        }
      ],
      "qcm": [
        {
          "id": "8a4b528a-6f85-4a08-af45-9b0640c2c773",
          "question": "Which of these is not an OOP concept?",
          "type": "multiple-choice",
          "options": ["Inheritance", "Compilation", "Encapsulation", "Abstraction"],
          "correctAnswer": 1,
          "explanation": "Compilation is a translation process, not an OOP concept.",
          "createdAt": "2026-05-28T09:51:47.545Z"
        }
      ],
      "cheatsheets": [
        {
          "id": "aad4d0d9-20a9-491f-9a09-0ab8e014f697",
          "title": "OOP Basics",
          "category": "Java / OOP",
          "items": [
            { "key": "Class", "value": "Blueprint for creating objects" },
            { "key": "Object", "value": "Instance of a class" }
          ],
          "codeSample": "class Car { String model; }",
          "createdAt": "2026-05-28T11:19:53.788Z"
        }
      ],
      "exercises": [
        {
          "id": "7a024104-eca0-4bb3-980b-d3536b47609f",
          "title": "Select all students",
          "description": "Retrieve all students from the Students table.",
          "schemaContext": "Students(id, name, age, class)",
          "task": "Write a SQL query to select all students.",
          "correctSolution": "SELECT * FROM Students;",
          "solutionNote": "The * operator selects all columns.",
          "createdAt": "2026-05-28T11:41:07.616Z"
        }
      ]
    };

    console.log('Attempting to create pack with Mongoose...');
    
    // Exact mapping from router
    const notes = (packData.notes || []).map(n => ({
      id: n.id || crypto.randomUUID(),
      title: n.title || 'Note Importée',
      content: n.content || '',
      tags: Array.isArray(n.tags) ? n.tags : [],
      isPinned: !!n.isPinned,
      createdAt: n.createdAt ? new Date(n.createdAt) : new Date(),
      updatedAt: n.updatedAt ? new Date(n.updatedAt) : new Date()
    }));

    const flashcards = (packData.flashcards || []).map(f => ({
      id: f.id || crypto.randomUUID(),
      front: f.front || '',
      back: f.back || '',
      code: f.code || '',
      difficulty: f.difficulty || null,
      createdAt: f.createdAt ? new Date(f.createdAt) : new Date()
    }));

    const qcm = (packData.qcm || []).map(q => ({
      id: q.id || crypto.randomUUID(),
      question: q.question || '',
      type: q.type || 'multiple-choice',
      options: Array.isArray(q.options) ? q.options : [],
      correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : '',
      explanation: q.explanation || '',
      trapNote: q.trapNote || '',
      topic: q.topic || 'Général',
      createdAt: q.createdAt ? new Date(q.createdAt) : new Date()
    }));

    const cheatsheets = (packData.cheatsheets || []).map(cs => ({
      id: cs.id || crypto.randomUUID(),
      title: cs.title || '',
      category: cs.category || 'Général',
      items: Array.isArray(cs.items) ? cs.items.map(item => ({ key: item.key || '', value: item.value || '' })) : [],
      codeSample: cs.codeSample || '',
      createdAt: cs.createdAt ? new Date(cs.createdAt) : new Date()
    }));

    const exercises = (packData.exercises || []).map(ex => ({
      id: ex.id || crypto.randomUUID(),
      title: ex.title || '',
      description: ex.description || '',
      schemaContext: ex.schemaContext || '',
      task: ex.task || '',
      correctSolution: ex.correctSolution || '',
      solutionNote: ex.solutionNote || '',
      createdAt: ex.createdAt ? new Date(ex.createdAt) : new Date()
    }));

    const created = await StudyPack.create({
      user: user._id,
      title: packData.title || 'Pack Importé',
      subject: packData.subject || 'Général',
      description: packData.description || '',
      notes,
      flashcards,
      qcm,
      cheatsheets,
      exercises,
      progress: packData.progress || 0,
      streak: packData.streak || 0
    });

    console.log('✅ Save Success! Created Pack ID:', created._id);

    // clean up
    await StudyPack.deleteOne({ _id: created._id });
    console.log('Cleaned up test pack.');

  } catch (error) {
    console.error('❌ Error caught:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

run();
