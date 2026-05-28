const mongoose = require('mongoose');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const http = require('http');

dotenv.config();

// Register models
require('./models/User');
const StudyPack = require('./models/StudyPack');

const PORT = process.env.PORT || 5002;
const BASE_URL = `http://localhost:${PORT}`;

// Helper function to make HTTP requests
function makeRequest(options, payload = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (payload) {
      req.write(JSON.stringify(payload));
    }
    req.end();
  });
}

async function runTests() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected!');

  // Get test user
  const User = mongoose.model('User');
  const user = await User.findOne({ email: 'mestirirayen5@gmail.com' });
  if (!user) {
    console.error('❌ Could not find mestirirayen5@gmail.com in database!');
    process.exit(1);
  }

  // Generate a valid JWT token
  console.log('Generating JWT Token for:', user.email);
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  console.log('\n--- 📋 Starting API Tests ---');

  // Test 1: GET /api/study-packs
  console.log('\n[Test 1] GET /api/study-packs');
  const test1 = await makeRequest({
    host: 'localhost',
    port: PORT,
    path: '/api/study-packs',
    method: 'GET',
    headers
  });
  console.log(`Response Status: ${test1.status}`);
  console.log(`Success: ${test1.data?.success}`);
  console.log(`Packs found: ${test1.data?.data?.length || 0}`);

  // Test 2: POST /api/study-packs
  console.log('\n[Test 2] POST /api/study-packs (Create new pack)');
  const newPackPayload = {
    title: 'Test Premium Pack',
    subject: 'Informatique',
    description: 'Pack de test créé par le script de vérification automatisée'
  };
  const test2 = await makeRequest({
    host: 'localhost',
    port: PORT,
    path: '/api/study-packs',
    method: 'POST',
    headers
  }, newPackPayload);
  console.log(`Response Status: ${test2.status}`);
  console.log(`Success: ${test2.data?.success}`);
  console.log(`Created Pack Title: ${test2.data?.data?.title}`);
  
  const createdPackId = test2.data?.data?._id;
  if (!createdPackId) {
    console.error('❌ Failed to create pack, skipping dependent tests.');
    process.exit(1);
  }

  // Test 3: PUT /api/study-packs/:id (Update pack arrays)
  console.log(`\n[Test 3] PUT /api/study-packs/${createdPackId} (Update pack content arrays)`);
  const updatePayload = {
    notes: [
      {
        title: 'Vue JS vs Angular',
        content: 'Angular utilise du TypeScript strict par défaut, tandis que Vue supporte un modèle hybride.',
        tags: ['web', 'frontend'],
        isPinned: true
      }
    ],
    flashcards: [
      {
        front: 'What is DOM?',
        back: 'Document Object Model, representation of html tree.'
      }
    ],
    qcm: [
      {
        question: 'Quelle directive Angular est utilisée pour le data-binding bidirectionnel ?',
        type: 'multiple-choice',
        options: ['*ngIf', '[(ngModel)]', '*ngFor', 'ngStyle'],
        correctAnswer: 1,
        explanation: '[(ngModel)] associe la valeur du contrôle à une propriété du composant.',
        topic: 'Angular Basics'
      }
    ]
  };

  const test3 = await makeRequest({
    host: 'localhost',
    port: PORT,
    path: `/api/study-packs/${createdPackId}`,
    method: 'PUT',
    headers
  }, updatePayload);
  console.log(`Response Status: ${test3.status}`);
  console.log(`Success: ${test3.data?.success}`);
  console.log(`Updated notes length: ${test3.data?.data?.notes?.length}`);
  console.log(`Updated flashcards length: ${test3.data?.data?.flashcards?.length}`);
  console.log(`Updated qcm length: ${test3.data?.data?.qcm?.length}`);

  // Test 4: POST /api/study-packs/import (Bulk import exact user JSON)
  console.log('\n[Test 4] POST /api/study-packs/import (Bulk import user JSON array)');
  const importPayload = {
    packs: [
      {
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
        ]
      }
    ]
  };

  const test4 = await makeRequest({
    host: 'localhost',
    port: PORT,
    path: '/api/study-packs/import',
    method: 'POST',
    headers
  }, importPayload);
  console.log(`Response Status: ${test4.status}`);
  console.log(`Success: ${test4.data?.success}`);
  console.log(`Imported packs count: ${test4.data?.data?.length}`);
  
  const importedPackId = test4.data?.data?.[0]?._id;

  // Test 5: DELETE /api/study-packs/:id (Delete created pack)
  console.log(`\n[Test 5] DELETE /api/study-packs/${createdPackId}`);
  const test5 = await makeRequest({
    host: 'localhost',
    port: PORT,
    path: `/api/study-packs/${createdPackId}`,
    method: 'DELETE',
    headers
  });
  console.log(`Response Status: ${test5.status}`);
  console.log(`Success: ${test5.data?.success}`);

  // Test 6: DELETE imported pack to leave database clean
  if (importedPackId) {
    console.log(`\n[Cleaning up] DELETE /api/study-packs/${importedPackId}`);
    await makeRequest({
      host: 'localhost',
      port: PORT,
      path: `/api/study-packs/${importedPackId}`,
      method: 'DELETE',
      headers
    });
  }

  console.log('\n✅ All API Tests Completed Successfully!');
  await mongoose.disconnect();
}

runTests().catch(err => {
  console.error('❌ Test failed with error:', err);
  mongoose.disconnect();
});
