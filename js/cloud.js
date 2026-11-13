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
let pendingRegAvatarDataUrl = '';

if (typeof window.firebase !== 'undefined') {
    window.firebase.initializeApp(firebaseConfig);
    fbAuth = window.firebase.auth();
    fbDb = window.firebase.firestore();
    fbDb.enablePersistence({ synchronizeTabs: true }).catch(() => {});
}

// Comprime la imagen de perfil a 180x180 JPEG (~12 KB) para sincronizarla en Firestore
function compressAvatarFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const size = 180;
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');

                const minSide = Math.min(img.width, img.height);
                const sx = (img.width - minSide) / 2;
                const sy = (img.height - minSide) / 2;
                ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function pulseCloudDot() {
    const dot = document.getElementById('cloudStatusDot');
    if (!dot) return;
    dot.classList.add('cloud-dot--syncing');
    setTimeout(() => dot.classList.remove('cloud-dot--syncing'), 450);
}

function openAuthScreen(subViewName) {
    document.getElementById('authFullScreen').style.display = 'flex';
    document.getElementById('registerOnlyView').style.display = subViewName === 'REGISTER' ? 'block' : 'none';
    document.getElementById('loginOnlyView').style.display = subViewName === 'LOGIN' ? 'block' : 'none';
    document.getElementById('authVerifyView').style.display = subViewName === 'VERIFY' ? 'block' : 'none';
    document.getElementById('authProfileView').style.display = subViewName === 'PROFILE' ? 'block' : 'none';
}

function closeAuthScreen() {
    document.getElementById('authFullScreen').style.display = 'none';
}

export function updateProfileUI() {
    const btn = document.getElementById('btnAuthAccount');
    const avatarImg = document.getElementById('headerUserAvatar');
    const userIcon = document.getElementById('headerUserIcon');
    const label = document.getElementById('headerAuthLabel');

    if (currentUser && currentUser.emailVerified) {
        btn.classList.add('header-auth-btn--logged');
        const displayName = state.profile.name.trim() || currentUser.email.split('@')[0];
        label.textContent = displayName;

        if (state.profile.avatar) {
            avatarImg.src = state.profile.avatar;
            avatarImg.style.display = 'block';
            userIcon.style.display = 'none';
        } else {
            avatarImg.style.display = 'none';
            userIcon.style.display = 'block';
        }

        // Rellenar también pantalla de perfil
        document.getElementById('profileEmailDisplay').textContent = currentUser.email;
        document.getElementById('profileNameInput').value = state.profile.name || '';
        document.getElementById('profileRoleInput').value = state.profile.role || '';
        document.getElementById('profileCompanyInput').value = state.profile.company || '';
        document.getElementById('profileBioInput').value = state.profile.bio || '';
        document.getElementById('profileVacationDaysInput').value = state.profile.vacationDays ?? 30;

        const profImg = document.getElementById('profileAvatarImg');
        const profInit = document.getElementById('profileAvatarInitials');
        if (state.profile.avatar) {
            profImg.src = state.profile.avatar;
            profImg.style.display = 'block';
            profInit.style.display = 'none';
        } else {
            profImg.style.display = 'none';
            profInit.style.display = 'block';
            profInit.textContent = displayName.charAt(0).toUpperCase();
        }
    } else {
        btn.classList.remove('header-auth-btn--logged');
        avatarImg.style.display = 'none';
        userIcon.style.display = 'block';
        label.textContent = 'Registrarse';
    }
}

function hasLocalUserData() {
    return Object.keys(state.daysData).length > 0 ||
           state.walletMovements.length > 0 ||
           state.tasks.length > 0 ||
           state.notes.length > 0 ||
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
            syncLabel.textContent = `Sincronizado automáticamente · ${formatNowTime()}`;
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
    updateProfileUI();

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
                updateProfileUI();
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
            updateProfileUI();
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
        updateProfileUI();
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
        case 'auth/email-already-in-use': return 'Este correo ya tiene una cuenta creada. Pulsa "Iniciar sesión aquí".';
        case 'auth/weak-password': return 'La contraseña debe tener al menos 6 caracteres.';
        case 'auth/too-many-requests': return 'Demasiados intentos seguidos. Espera un minuto e inténtalo de nuevo.';
        default: return 'No se pudo completar la operación (' + code + ').';
    }
}

export function initCloudSync() {
    registerCloudSaveHook(pushToCloud);
    updateProfileUI();
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
            updateProfileUI();
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
            updateProfileUI();
            document.getElementById('verifyTargetEmail').textContent = user.email;
            document.getElementById('verifyStatusMsg').style.display = 'none';
            openAuthScreen('VERIFY');
            return;
        }

        await handleVerifiedUserSession(user);
    });
}

export function bindCloudEvents() {
    // Botón superior derecho: abre pantalla exclusiva de Registro (o Perfil si ya inició sesión)
    document.getElementById('btnAuthAccount').addEventListener('click', () => {
        document.getElementById('regErrorMsg').style.display = 'none';
        document.getElementById('loginErrorMsg').style.display = 'none';
        document.getElementById('verifyStatusMsg').style.display = 'none';

        if (currentUser && currentUser.emailVerified) {
            updateProfileUI();
            openAuthScreen('PROFILE');
        } else if (fbAuth && fbAuth.currentUser && !fbAuth.currentUser.emailVerified) {
            openAuthScreen('VERIFY');
        } else {
            openAuthScreen('REGISTER');
        }
    });

    document.getElementById('btnCloseAuthScreen').addEventListener('click', closeAuthScreen);

    // Cambiar entre pantalla exclusiva de Registro y pantalla exclusiva de Login
    document.getElementById('btnGoToLoginView').addEventListener('click', () => {
        document.getElementById('loginErrorMsg').style.display = 'none';
        openAuthScreen('LOGIN');
    });

    document.getElementById('btnGoToRegisterView').addEventListener('click', () => {
        document.getElementById('regErrorMsg').style.display = 'none';
        openAuthScreen('REGISTER');
    });

    // Subir foto en pantalla de Registro
    document.getElementById('btnPickRegAvatar').addEventListener('click', () => {
        document.getElementById('inputRegAvatar').click();
    });

    document.getElementById('inputRegAvatar').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            pendingRegAvatarDataUrl = await compressAvatarFile(file);
            const img = document.getElementById('regAvatarImg');
            img.src = pendingRegAvatarDataUrl;
            img.style.display = 'block';
            document.getElementById('regAvatarPlaceholder').style.display = 'none';
        } catch {
            alert('No se pudo procesar la imagen.');
        }
    });

    // Formulario exclusivo de Registro
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!fbAuth) return alert('Error cargando el servicio de cuentas.');

        const name = document.getElementById('regNameInput').value.trim();
        const role = document.getElementById('regRoleInput').value.trim();
        const email = document.getElementById('regEmailInput').value.trim();
        const password = document.getElementById('regPasswordInput').value;
        const confirmPass = document.getElementById('regPasswordConfirmInput').value;
        const errBox = document.getElementById('regErrorMsg');
        const submitBtn = document.getElementById('btnRegisterSubmit');

        errBox.style.display = 'none';

        if (password !== confirmPass) {
            errBox.textContent = 'Las contraseñas no coinciden.';
            errBox.style.display = 'block';
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Creando cuenta...';

        try {
            state.profile.name = name;
            state.profile.role = role;
            if (pendingRegAvatarDataUrl) {
                state.profile.avatar = pendingRegAvatarDataUrl;
            }
            saveState();

            const cred = await fbAuth.createUserWithEmailAndPassword(email, password);
            await cred.user.sendEmailVerification();
            document.getElementById('regPasswordInput').value = '';
            document.getElementById('regPasswordConfirmInput').value = '';
        } catch (err) {
            errBox.textContent = getSpanishAuthError(err.code);
            errBox.style.display = 'block';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Registrarse y enviar correo de verificación';
        }
    });

    // Formulario exclusivo de Inicio de Sesión
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!fbAuth) return alert('Error cargando el servicio de cuentas.');

        const email = document.getElementById('loginEmailInput').value.trim();
        const password = document.getElementById('loginPasswordInput').value;
        const errBox = document.getElementById('loginErrorMsg');
        const submitBtn = document.getElementById('btnLoginSubmit');

        errBox.style.display = 'none';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Comprobando...';

        try {
            const cred = await fbAuth.signInWithEmailAndPassword(email, password);
            await cred.user.reload();
            if (cred.user.emailVerified) {
                document.getElementById('loginPasswordInput').value = '';
                closeAuthScreen();
            }
        } catch (err) {
            errBox.textContent = getSpanishAuthError(err.code);
            errBox.style.display = 'block';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Entrar en mi cuenta';
        }
    });

    // Verificación de correo
    document.getElementById('btnCheckVerified').addEventListener('click', async () => {
        const user = fbAuth ? fbAuth.currentUser : null;
        const msgBox = document.getElementById('verifyStatusMsg');
        if (!user) return;

        msgBox.style.display = 'none';
        try {
            await user.reload();
            if (user.emailVerified) {
                closeAuthScreen();
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
        openAuthScreen('REGISTER');
    });

    document.getElementById('btnAuthResetPass').addEventListener('click', async () => {
        const email = document.getElementById('loginEmailInput').value.trim();
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

    // Gestión de Foto y Datos de Perfil
    document.getElementById('btnChangeProfileAvatar').addEventListener('click', () => {
        document.getElementById('inputProfileAvatar').click();
    });

    document.getElementById('inputProfileAvatar').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            state.profile.avatar = await compressAvatarFile(file);
            saveState();
            updateProfileUI();
        } catch {
            alert('No se pudo cargar la foto.');
        }
        e.target.value = '';
    });

    document.getElementById('btnRemoveProfileAvatar').addEventListener('click', () => {
        state.profile.avatar = '';
        saveState();
        updateProfileUI();
    });

    document.getElementById('btnSaveProfile').addEventListener('click', () => {
        state.profile.name = document.getElementById('profileNameInput').value.trim();
        state.profile.role = document.getElementById('profileRoleInput').value.trim();
        state.profile.company = document.getElementById('profileCompanyInput').value.trim();
        state.profile.bio = document.getElementById('profileBioInput').value.trim();
        state.profile.vacationDays = parseInt(document.getElementById('profileVacationDaysInput').value, 10) || 30;

        saveState();
        updateProfileUI();
        triggerRenderAll();
        alert('Perfil guardado y sincronizado en todos tus dispositivos.');
    });

    document.getElementById('btnAuthLogout').addEventListener('click', async () => {
        if (!fbAuth) return;
        await fbAuth.signOut();
        localStorage.removeItem('shifterpro_synced_uid');
        updateProfileUI();
        closeAuthScreen();
    });
}
