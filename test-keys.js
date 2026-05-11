import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCmuMcyvBMd0psjRX6SfXEx9x9MFtTpnNs",
  authDomain: "smart-e-canteen-5f12d.firebaseapp.com",
  projectId: "smart-e-canteen-5f12d",
  storageBucket: "smart-e-canteen-5f12d.firebasestorage.app",
  messagingSenderId: "407062492823",
  appId: "1:407062492823:web:b56aac085325563c871bd2",
};

async function testFirebase() {
  try {
    console.log('1. Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    console.log('✅ Firebase App initialized');

    console.log('2. Testing Auth connection...');
    const auth = getAuth(app);
    console.log('✅ Auth instance created');

    console.log('3. Testing anonymous sign-in (validates API key)...');
    try {
      const result = await signInAnonymously(auth);
      console.log('✅ Anonymous sign-in SUCCESS!');
      console.log('   UID:', result.user.uid);
      await result.user.delete();
      console.log('✅ Test user cleaned up');
    } catch (authErr) {
      if (authErr.code === 'auth/admin-restricted-operation' || authErr.code === 'auth/operation-not-allowed') {
        console.log('⚠️ Anonymous sign-in is disabled in your Firebase console.');
        console.log('   However, the API key is VALID and connecting properly!');
      } else {
        throw authErr;
      }
    }
    
    console.log('\n🎉 ALL TESTS PASSED — Keys are valid and Firebase is connected!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ ERROR:', err.code, '—', err.message);
    process.exit(1);
  }
}

testFirebase();
