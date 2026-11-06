
const OWNER_ACCOUNTS_KEY = 'petsync.ownerAccounts.v1';
const PASSWORD_HASH_ITERATIONS = 120000;

let currentRole = '';
let authMode = 'login';

const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('auth-email');
const passwordInput = document.getElementById('auth-password');
const nameInput = document.getElementById('auth-name');
const vetIdInput = document.getElementById('vet-id');
const authMessage = document.getElementById('auth-message');

authForm.addEventListener('submit', handleAuthSubmit);

function showView(viewId) {
    document.querySelectorAll('body > div').forEach(div => div.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');

    if (viewId !== 'view-client') {
        document.getElementById('view-client').dataset.ownerEmail = '';
        document.getElementById('view-client').dataset.ownerName = '';
        document.getElementById('view-client').dataset.ownerPhone = '';
    }
    if (viewId !== 'view-vet') {
        document.getElementById('view-vet').dataset.veterinarianEmail = '';
        document.getElementById('view-vet').dataset.veterinarianName = '';
    }

    if (viewId === 'view-intro' || viewId === 'view-auth') {
        document.getElementById('user-menu').classList.add('hidden');
    } else {
        document.getElementById('user-menu').classList.remove('hidden');
    }

    if (viewId === 'view-vet') {
        if (typeof refreshAppointments === 'function') {
            refreshAppointments();
        }
    }
    if (viewId === 'view-client') {
        if (typeof switchTab === 'function') {
            switchTab('client', 'citas');
        }
        if (typeof loadOwnerProfile === 'function') {
            loadOwnerProfile();
        }
    }
}

function goToAuth(role) {
    currentRole = role;
    document.getElementById('view-auth').dataset.role = role;
    document.getElementById('auth-btn').className =
        role === 'client' ? 'btn btn-client' : 'btn btn-vet';
    switchAuthTab('login');
    showView('view-auth');
}

function switchAuthTab(tab) {
    authMode = currentRole === 'vet' ? 'login' : tab === 'register' ? 'register' : 'login';
    clearAuthFields();
    document.getElementById('auth-title').innerText =
        currentRole === 'vet' ? 'Acceso Veterinario' : 'Acceso Dueños';
    document.getElementById('auth-welcome-kicker').textContent =
        currentRole === 'vet' ? 'Tu clínica, mejor conectada' : 'Un espacio hecho para su bienestar';
    document.getElementById('auth-welcome-title').textContent =
        currentRole === 'vet'
            ? 'Todo listo para cuidar a tus pacientes.'
            : 'Cada mascota merece un cuidado extraordinario.';
    document.getElementById('auth-welcome-description').textContent =
        currentRole === 'vet'
            ? 'Gestiona pacientes, responde citas y consulta expedientes desde el espacio de tu clínica.'
            : 'Ten sus citas y su historial de salud siempre organizados en un espacio sencillo y seguro.';
    document.getElementById('auth-form-description').textContent =
        authMode === 'register'
            ? 'Crea tu cuenta para empezar a organizar el cuidado de tus mascotas.'
            : currentRole === 'vet'
                ? 'Ingresa tus credenciales de clínica para continuar.'
                : 'Ingresa a tu cuenta para continuar.';
    document.getElementById('tab-login').classList.toggle('active', authMode === 'login');
    document.getElementById('tab-register').classList.toggle('active', authMode === 'register');
    document.getElementById('tab-register').classList.toggle('hidden', currentRole === 'vet');
    document.getElementById('auth-btn').innerText =
        authMode === 'login' ? 'Entrar' : 'Crear Cuenta';

    nameInput.classList.toggle('hidden', authMode === 'login');
    nameInput.required = authMode === 'register';
    vetIdInput.classList.toggle('hidden', currentRole !== 'vet');
    vetIdInput.required = currentRole === 'vet';
    passwordInput.autocomplete = authMode === 'login' ? 'current-password' : 'new-password';
    passwordInput.minLength = authMode === 'register' ? 8 : 0;
    setAuthMessage('');
}

async function handleAuthSubmit(event) {
    event.preventDefault();
    setAuthMessage('');

    if (currentRole !== 'client') {
        return;
    }

    try {
        if (authMode === 'register') {
            await registerOwner();
        } else {
            await loginOwner();
        }
    } catch (error) {
        setAuthMessage(
            error instanceof Error ? error.message : 'Ocurrió un error al procesar la cuenta.',
            true
        );
    }
}

async function registerOwner() {
    const name = nameInput.value.trim();
    const email = normalizeOwnerEmail(emailInput.value);
    const password = passwordInput.value;

    if (name.length === 0) {
        setAuthMessage('Ingresa tu nombre completo.', true);
        return;
    }
    if (password.length < 8) {
        setAuthMessage('La contraseña debe tener al menos 8 caracteres.', true);
        return;
    }

    const owners = readOwnerAccounts();
    if (owners.some(owner => normalizeOwnerEmail(owner.email) === email)) {
        setAuthMessage('Ya existe una cuenta con ese correo electrónico.', true);
        return;
    }

    const salt = new Uint8Array(16);
    window.crypto.getRandomValues(salt);
    const passwordHash = await hashPassword(password, salt);

    owners.push({
        name,
        email,
        salt: bytesToBase64(salt),
        passwordHash
    });
    localStorage.setItem(OWNER_ACCOUNTS_KEY, JSON.stringify(owners));

    passwordInput.value = '';
    switchAuthTab('login');
    setAuthMessage('Cuenta creada en este navegador. Ya puedes iniciar sesión.');
}

async function loginOwner() {
    const email = normalizeOwnerEmail(emailInput.value);
    const password = passwordInput.value;
    const matchingOwners = readOwnerAccounts().filter(account =>
        normalizeOwnerEmail(account.email) === email
    );

    if (matchingOwners.length > 1) {
        setAuthMessage(
            'Hay más de una cuenta registrada con ese correo. Contacta con soporte para resolverlo.',
            true
        );
        return;
    }
    const owner = matchingOwners[0];

    if (!owner || !owner.salt || !owner.passwordHash) {
        setAuthMessage('Correo o contraseña incorrectos.', true);
        return;
    }

    const passwordHash = await hashPassword(password, base64ToBytes(owner.salt));
    if (passwordHash !== owner.passwordHash) {
        setAuthMessage('Correo o contraseña incorrectos.', true);
        return;
    }

    document.getElementById('user-name').innerText = `Hola, ${owner.name}`;
    document.getElementById('view-client').dataset.ownerEmail = owner.email;
    document.getElementById('view-client').dataset.ownerName = owner.name;
    document.getElementById('view-client').dataset.ownerPhone = owner.phone || '';
    clearAuthFields();
    showView('view-client');
}

function readOwnerAccounts() {
    const savedAccounts = localStorage.getItem(OWNER_ACCOUNTS_KEY);
    if (savedAccounts === null) {
        return [];
    }

    let owners;
    try {
        owners = JSON.parse(savedAccounts);
    } catch {
        throw new Error('Los datos de las cuentas guardadas están dañados.');
    }
    if (!Array.isArray(owners) || owners.some(owner =>
        !owner ||
        typeof owner.name !== 'string' ||
        typeof owner.email !== 'string' ||
        !owner.email.trim()
    )) {
        throw new Error('Los datos de las cuentas guardadas no tienen un formato válido.');
    }
    return owners;
}

function normalizeOwnerEmail(email) {
    return email.trim().toLowerCase();
}

function clearAuthFields() {
    emailInput.value = '';
    passwordInput.value = '';
    nameInput.value = '';
    vetIdInput.value = '';
}

async function hashPassword(password, salt) {
    if (!window.crypto || !window.crypto.subtle) {
        throw new Error('El navegador requiere HTTPS o localhost para proteger las contraseñas.');
    }

    const key = await window.crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    );
    const hash = await window.crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt,
            iterations: PASSWORD_HASH_ITERATIONS,
            hash: 'SHA-256'
        },
        key,
        256
    );
    return bytesToBase64(new Uint8Array(hash));
}

function bytesToBase64(bytes) {
    let binary = '';
    bytes.forEach(byte => {
        binary += String.fromCharCode(byte);
    });
    return window.btoa(binary);
}

function base64ToBytes(value) {
    return Uint8Array.from(window.atob(value), character => character.charCodeAt(0));
}

function setAuthMessage(message, isError = false) {
    authMessage.textContent = message;
    authMessage.style.color = isError ? '#b91c1c' : '#047478';
}
