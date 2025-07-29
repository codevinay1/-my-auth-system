// Firebase SDK imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    signInAnonymously, 
    signInWithCustomToken, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Firebase Initialization ---
// const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const firebaseConfig = {
  apiKey: "AIzaSyD6t3icRtZwrrea1iM8eLoN5yMStx-nFws",
  authDomain: "my-auth-app-465db.firebaseapp.com",
  projectId: "my-auth-app-465db",
  storageBucket: "my-auth-app-465db.firebasestorage.app",
  messagingSenderId: "911101003378",
  appId: "1:911101003378:web:2dd1ba805b02deed4e64eb"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Global app ID (for Firestore paths)
// const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- Utility: Custom Message Box (instead of alert/confirm) ---
function showMessageBox(title, message, type = 'info', onConfirm = null) {
    const messageBox = document.createElement('div');
    messageBox.classList.add('message-box');
    messageBox.innerHTML = `
        <h3>${title}</h3>
        <p>${message}</p>
        <button>${onConfirm ? 'OK' : 'Dismiss'}</button>
    `;
    document.body.appendChild(messageBox);

    // Show with a fade-in effect
    setTimeout(() => messageBox.classList.add('show'), 10);

    messageBox.querySelector('button').addEventListener('click', () => {
        messageBox.classList.remove('show');
        messageBox.addEventListener('transitionend', () => messageBox.remove());
        if (onConfirm) onConfirm();
    });
}

// --- Authentication State Listener ---
onAuthStateChanged(auth, async (user) => {
    const currentPath = window.location.pathname;

    if (user) {
        // User is signed in.
        const userId = user.uid;
        console.log("User is logged in:", user.email, "UID:", userId);

        // If on login/register page, redirect to dashboard
        if (currentPath.includes('index.html') || currentPath === '/') {
            window.location.href = 'dashboard.html';
        } else if (currentPath.includes('dashboard.html')) {
            // On dashboard, display user email
            const userEmailSpan = document.getElementById('user-email');
            if (userEmailSpan) {
                userEmailSpan.textContent = user.email;
            }
        }
    } else {
        // User is signed out.
        console.log("User is logged out.");

        // If on dashboard, redirect to login/register page
        if (currentPath.includes('dashboard.html')) {
            window.location.href = 'index.html';
        } else if (currentPath.includes('index.html') || currentPath === '/') {
            // On login/register page, attempt anonymous sign-in if no custom token
            // This is primarily for Canvas environment setup
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                try {
                    await signInWithCustomToken(auth, __initial_auth_token);
                    console.log("Signed in with custom token.");
                } catch (error) {
                    console.error("Error signing in with custom token:", error);
                    // Fallback to anonymous if custom token fails
                    try {
                        await signInAnonymously(auth);
                        console.log("Signed in anonymously.");
                    } catch (anonError) {
                        console.error("Error signing in anonymously:", anonError);
                        showMessageBox('Authentication Error', 'Could not initialize session. Please try again.');
                    }
                }
            } else {
                try {
                    await signInAnonymously(auth);
                    console.log("Signed in anonymously (no initial token).");
                } catch (anonError) {
                    console.error("Error signing in anonymously:", anonError);
                    showMessageBox('Authentication Error', 'Could not initialize session. Please try again.');
                }
            }
        }
    }
});

// --- Login/Register Page Logic ---
if (document.getElementById('login-form')) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');

    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    });

    // Handle Login Form Submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = loginForm['login-email'].value;
        const password = loginForm['login-password'].value;

        try {
            await signInWithEmailAndPassword(auth, email, password);
            showMessageBox('Success', 'Logged in successfully!', 'success');
            // onAuthStateChanged will handle redirection
        } catch (error) {
            console.error("Login Error:", error.code, error.message);
            let errorMessage = "An unknown error occurred during login.";
            switch (error.code) {
                case 'auth/invalid-email':
                    errorMessage = "Invalid email format.";
                    break;
                case 'auth/user-disabled':
                    errorMessage = "Your account has been disabled.";
                    break;
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    errorMessage = "Invalid email or password.";
                    break;
                case 'auth/too-many-requests':
                    errorMessage = "Too many login attempts. Please try again later.";
                    break;
                default:
                    errorMessage = error.message;
            }
            showMessageBox('Login Failed', errorMessage, 'error');
        }
    });

    // Handle Register Form Submission
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = registerForm['register-email'].value;
        const password = registerForm['register-password'].value;
        const confirmPassword = registerForm['register-confirm-password'].value;

        if (password !== confirmPassword) {
            showMessageBox('Registration Failed', 'Passwords do not match.', 'error');
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            const userId = user.uid;

            // Store user data in Firestore (e.g., email, creation date)
            // const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/profile/data`);
            const userDocRef = doc(db, `users/${userId}/profile/data`);
            await setDoc(userDocRef, {
                email: user.email,
                createdAt: new Date().toISOString(),
                // Add any other profile data you want to store
            });

            showMessageBox('Success', 'Account created successfully! You are now logged in.', 'success');
            // onAuthStateChanged will handle redirection
        } catch (error) {
            console.error("Registration Error:", error.code, error.message);
            let errorMessage = "An unknown error occurred during registration.";
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = "This email is already registered.";
                    break;
                case 'auth/invalid-email':
                    errorMessage = "Invalid email format.";
                    break;
                case 'auth/weak-password':
                    errorMessage = "Password is too weak. Please choose a stronger one.";
                    break;
                default:
                    errorMessage = error.message;
            }
            showMessageBox('Registration Failed', errorMessage, 'error');
        }
    });
}

// --- Dashboard Page Logic ---
if (document.getElementById('logout-btn')) {
    const logoutBtn = document.getElementById('logout-btn');

    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            showMessageBox('Logged Out', 'You have been successfully logged out.', 'info', () => {
                window.location.href = 'index.html'; // Redirect after user dismisses message
            });
        } catch (error) {
            console.error("Logout Error:", error);
            showMessageBox('Logout Failed', 'Could not log out. Please try again.', 'error');
        }
    });
}
