const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function fixIndexes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('dayplans');

    // Get current indexes
    const indexes = await collection.indexes();
    console.log('\n📋 Current indexes:');
    indexes.forEach(index => {
      console.log(`  - ${index.name}:`, index.key);
    });

    // Drop the problematic index if it exists
    try {
      await collection.dropIndex('date_1');
      console.log('\n✅ Dropped old "date_1" index');
    } catch (err) {
      if (err.code === 27) {
        console.log('\n⚠️ Index "date_1" does not exist (already removed)');
      } else {
        throw err;
      }
    }

    // Recreate the correct compound index
    await collection.createIndex({ user: 1, date: 1 }, { unique: true });
    console.log('✅ Created compound index on { user: 1, date: 1 }');

    // Show final indexes
    const finalIndexes = await collection.indexes();
    console.log('\n📋 Final indexes:');
    finalIndexes.forEach(index => {
      console.log(`  - ${index.name}:`, index.key);
    });

    console.log('\n✅ Index fix completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing indexes:', error);
    process.exit(1);
  }
}

fixIndexes();
