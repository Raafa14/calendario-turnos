import {
    state,
    STORAGE_KEY,
    getSerializableState,
    applyParsedState,
    saveState,
    applyTheme,
    formatNowTime,
    registerCloudSaveHook,
    triggerRenderAll
} from './state.js';

const firebaseConfig = {
    apiKey: "AIzaSyD0scKnFJXER77flW5DURxxU4OyDW6o8uE",
    authDomain: "shifterpro-rafa.firebaseapp.com",
    projectId: "shifterpro-rafa",
    storageBucket: "shifterpro-rafa.firebasestorage.app",
    messagingSenderId: "1041726135541",
    appId: "1:1041726135541:web:c0f72d48154d8f7729f9bc",
    measurementId: "G-T9EWNNY049"
};

let fbAuth = null;
let fbDb = null;
let currentUser = null;
let unsubscribeSnapshot = null;
let isApplyingRemoteSnapshot = false;
let authMode = 'LOGIN';

if (typeof window.firebase !== 'undefined') {
    window.firebase.initializeApp(firebaseConfig);
    fbAuth = window.firebase.auth();
    fbDb = window.firebase.firestore();
    fbDb.enablePersistence({ synchronizeTabs: true }).catch(() => {});
}

function pulseCloudDot() {
    const dot = document.getElementById('cloudStatusDot');
    if (!dot) return;
    dot.classList.add('cloud-dot--syncing');
    setTimeout(() => dot.classList.remove('cloud-dot--syncing'), 450);
}

function showAuthSubView(viewName) {
    document.getElementById('authLoggedOutView').style.display = viewName === 'LOGGED_OUT' ? 'block' : 'none';
    document.getElementById('authVerifyView').style.display = viewName === 'VERIFY' ? 'block' : 'none';
    document.getElementById('authLoggedInView').style.display = viewName === 'LOGGED_IN' ? 'block' : 'none';
}

function hasLocalUserData() {
    return Object.keys(state.daysData).length > 0 ||
           state.walletMovements.length > 0 ||
           state.tasks.length > 0 ||
           state.weightLogs.length > 0 ||
           state.fixedExpenses.length > 0 ||
           state.debts.length > 0;
}

function pushToCloud(payload) {
    if (!fbDb || !currentUser || !currentUser.emailVerified || isApplyingRemoteSnapshot) return;

    pulseCloudDot();
    fbDb.collection('users').doc(currentUser.uid).set({
        ...payload,
        updatedAt: Date.now()
    }).then(() => {
        const syncLabel = document.getElementById('lastSyncTimeLabel');
        if (syncLabel) {
            syncLabel.textContent = `Última sincronización automática: ${formatNowTime()}`;
        }
    }).catch(err => {
        console.error('Error sincronizando con la nube:', err);
    });
}

async function handleVerifiedUserSession(user) {
    const dot = document.getElementById('cloudStatusDot');
    currentUser = user;
    dot.classList.remove('cloud-dot--pending');
    dot.classList.add('cloud-dot--online');
    showAuthSubView('LOGGED_IN');
    document.getElementById('authUserEmail').textContent = user.email;

    const userDocRef = fbDb.collection('users').doc(user.uid);
    const alreadyLinkedUid = localStorage.getItem('shifterpro_synced_uid');

    try {
        const snap = await userDocRef.get();
        if (!snap.exists) {
            await userDocRef.set({
                ...getSerializableState(),
                updatedAt: Date.now()
            });
        } else if (alreadyLinkedUid !== user.uid && hasLocalUserData()) {
            const useCloud = confirm(
                'Hemos encontrado datos guardados en la nube para tu cuenta.\n\n' +
                '• Pulsa ACEPTAR para descargar tus datos de la nube a este dispositivo.\n' +
                '• Pulsa CANCELAR para subir los datos actuales de este dispositivo y sobrescribir la nube.'
            );
            if (useCloud) {
                isApplyingRemoteSnapshot = true;
                applyParsedState(snap.data());
                localStorage.setItem(STORAGE_KEY, JSON.stringify(getSerializableState()));
                applyTheme();
                triggerRenderAll();
                isApplyingRemoteSnapshot = false;
            } else {
                await userDocRef.set({
                    ...getSerializableState(),
                    updatedAt: Date.now()
                });
            }
        } else {
            isApplyingRemoteSnapshot = true;
            applyParsedState(snap.data());
            localStorage.setItem(STORAGE_KEY, JSON.stringify(getSerializableState()));
            applyTheme();
            triggerRenderAll();
            isApplyingRemoteSnapshot = false;
        }

        localStorage.setItem('shifterpro_synced_uid', user.uid);
        document.getElementById('lastSyncTimeLabel').textContent = `Sincronizado automáticamente · ${formatNowTime()}`;
    } catch (err) {
        console.error('Error en sincronización inicial:', err);
    }

    if (unsubscribeSnapshot) unsubscribeSnapshot();
    unsubscribeSnapshot = userDocRef.onSnapshot((doc) => {
        if (!doc.exists || doc.metadata.hasPendingWrites) return;
        isApplyingRemoteSnapshot = true;
        applyParsedState(doc.data());
        localStorage.setItem(STORAGE_KEY, JSON.stringify(getSerializableState()));
        applyTheme();
        triggerRenderAll();
        pulseCloudDot();
        const syncLabel = document.getElementById('lastSyncTimeLabel');
        if (syncLabel) {
            syncLabel.textContent = `Actualizado desde otro dispositivo · ${formatNowTime()}`;
        }
        isApplyingRemoteSnapshot = false;
    });
}

function getSpanishAuthError(code) {
    switch (code) {
        case 'auth/invalid-email': return 'El formato del correo electrónico no es válido.';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential': return 'Correo o contraseña incorrectos.';
        case 'auth/email-already-in-use': return 'Este correo ya tiene una cuenta creada. Inicia sesión.';
        case 'auth/weak-password': return 'La contraseña debe tener al menos 6 caracteres.';
        case 'auth/too-many-requests': return 'Demasiados intentos seguidos. Espera un minuto e inténtalo de nuevo.';
        default: return 'No se pudo completar la operación (' + code + ').';
    }
}

export function initCloudSync() {
    registerCloudSaveHook(pushToCloud);
    if (!fbAuth || !fbDb) return;

    fbAuth.onAuthStateChanged(async (user) => {
        const dot = document.getElementById('cloudStatusDot');

        if (unsubscribeSnapshot) {
            unsubscribeSnapshot();
            unsubscribeSnapshot = null;
        }

        if (!user) {
            currentUser = null;
            dot.classList.remove('cloud-dot--online', 'cloud-dot--pending');
            showAuthSubView('LOGGED_OUT');
            return;
        }

        try {
            await user.reload();
        } catch (e) {
            console.warn('No se pudo recargar estado de usuario:', e);
        }

        if (!user.emailVerified) {
            currentUser = null;
            dot.classList.remove('cloud-dot--online');
            dot.classList.add('cloud-dot--pending');
            document.getElementById('verifyTargetEmail').textContent = user.email;
            document.getElementById('verifyStatusMsg').style.display = 'none';
            showAuthSubView('VERIFY');
            document.getElementById('authModal').classList.add('modal--open');
            return;
        }

        await handleVerifiedUserSession(user);
    });
}

export function bindCloudEvents() {
    document.getElementById('btnAuthAccount').addEventListener('click', () => {
        document.getElementById('authErrorMsg').style.display = 'none';
        document.getElementById('verifyStatusMsg').style.display = 'none';
        document.getElementById('authModal').classList.add('modal--open');
    });

    document.getElementById('btnCloseAuthModal').addEventListener('click', () => {
        document.getElementById('authModal').classList.remove('modal--open');
    });

    document.getElementById('authTabLogin').addEventListener('click', () => {
        authMode = 'LOGIN';
        document.getElementById('authTabLogin').classList.add('debt-tab-btn--active');
        document.getElementById('authTabRegister').classList.remove('debt-tab-btn--active');
        document.getElementById('btnAuthSubmit').textContent = 'Entrar en mi cuenta';
        document.getElementById('authErrorMsg').style.display = 'none';
    });

    document.getElementById('authTabRegister').addEventListener('click', () => {
        authMode = 'REGISTER';
        document.getElementById('authTabRegister').classList.add('debt-tab-btn--active');
        document.getElementById('authTabLogin').classList.remove('debt-tab-btn--active');
        document.getElementById('btnAuthSubmit').textContent = 'Crear cuenta y enviar correo';
        document.getElementById('authErrorMsg').style.display = 'none';
    });

    document.getElementById('authForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!fbAuth) return alert('Error cargando el servicio de cuentas.');

        const email = document.getElementById('authEmailInput').value.trim();
        const password = document.getElementById('authPasswordInput').value;
        const errBox = document.getElementById('authErrorMsg');
        const submitBtn = document.getElementById('btnAuthSubmit');

        errBox.style.display = 'none';
        submitBtn.disabled = true;
        submitBtn.textContent = authMode === 'LOGIN' ? 'Comprobando...' : 'Creando cuenta...';

        try {
            if (authMode === 'LOGIN') {
                const cred = await fbAuth.signInWithEmailAndPassword(email, password);
                await cred.user.reload();
                if (cred.user.emailVerified) {
                    document.getElementById('authPasswordInput').value = '';
                    document.getElementById('authModal').classList.remove('modal--open');
                }
            } else {
                const cred = await fbAuth.createUserWithEmailAndPassword(email, password);
                await cred.user.sendEmailVerification();
                document.getElementById('authPasswordInput').value = '';
            }
        } catch (err) {
            errBox.textContent = getSpanishAuthError(err.code);
            errBox.style.display = 'block';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = authMode === 'LOGIN' ? 'Entrar en mi cuenta' : 'Crear cuenta y enviar correo';
        }
    });

    document.getElementById('btnCheckVerified').addEventListener('click', async () => {
        const user = fbAuth ? fbAuth.currentUser : null;
        const msgBox = document.getElementById('verifyStatusMsg');
        if (!user) return;

        msgBox.style.display = 'none';
        try {
            await user.reload();
            if (user.emailVerified) {
                document.getElementById('authModal').classList.remove('modal--open');
                await handleVerifiedUserSession(user);
            } else {
                msgBox.style.color = 'var(--danger)';
                msgBox.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                msgBox.style.background = 'rgba(239, 68, 68, 0.15)';
                msgBox.textContent = 'Aún no consta como confirmado. Abre el enlace que te llegó al correo y vuelve a pulsar aquí.';
                msgBox.style.display = 'block';
            }
        } catch {
            msgBox.textContent = 'No se pudo comprobar en este momento. Inténtalo de nuevo.';
            msgBox.style.display = 'block';
        }
    });

    document.getElementById('btnResendVerifyEmail').addEventListener('click', async () => {
        const user = fbAuth ? fbAuth.currentUser : null;
        const msgBox = document.getElementById('verifyStatusMsg');
        if (!user) return;

        try {
            await user.sendEmailVerification();
            msgBox.style.color = 'var(--accent)';
            msgBox.style.borderColor = 'rgba(16, 185, 129, 0.4)';
            msgBox.style.background = 'rgba(16, 185, 129, 0.14)';
            msgBox.textContent = 'Correo reenviado. Revisa tu bandeja de entrada o Spam.';
            msgBox.style.display = 'block';
        } catch (err) {
            msgBox.textContent = getSpanishAuthError(err.code);
            msgBox.style.display = 'block';
        }
    });

    document.getElementById('btnCancelVerify').addEventListener('click', async () => {
        if (fbAuth) await fbAuth.signOut();
        showAuthSubView('LOGGED_OUT');
    });

    document.getElementById('btnAuthResetPass').addEventListener('click', async () => {
        const email = document.getElementById('authEmailInput').value.trim();
        if (!email) {
            alert('Escribe primero tu correo electrónico arriba y luego pulsa recuperar contraseña.');
            return;
        }
        try {
            await fbAuth.sendPasswordResetEmail(email);
            alert('Te hemos enviado un correo para restablecer tu contraseña.');
        } catch (err) {
            alert(getSpanishAuthError(err.code));
        }
    });

    document.getElementById('btnForceCloudPush').addEventListener('click', () => {
        if (!currentUser || !currentUser.emailVerified) return;
        saveState();
        alert('Datos subidos y sincronizados con la nube.');
    });

    document.getElementById('btnAuthLogout').addEventListener('click', async () => {
        if (!fbAuth) return;
        await fbAuth.signOut();
        localStorage.removeItem('shifterpro_synced_uid');
        document.getElementById('authModal').classList.remove('modal--open');
    });
}