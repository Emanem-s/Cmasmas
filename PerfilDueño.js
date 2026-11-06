const PROFILE_OWNER_ACCOUNTS_KEY = 'petsync.ownerAccounts.v1';
const PROFILE_APPOINTMENTS_KEY = 'petsync.appointments.v2';
const PROFILE_PETS_KEY = 'petsync.pets.v1';
const PROFILE_CLINICAL_RECORDS_KEY = 'petsync.clinicalRecords.v1';

const ownerProfileForm = document.getElementById('owner-profile-form');
const ownerProfileName = document.getElementById('profile-owner-name');
const ownerProfileEmail = document.getElementById('profile-owner-email');
const ownerProfilePhone = document.getElementById('profile-owner-phone');
const ownerProfileMessage = document.getElementById('owner-profile-message');
const profilePhonePattern = /^[0-9+().\-\s]{7,20}$/;

ownerProfileForm.addEventListener('submit', saveOwnerProfile);
loadOwnerProfile();

function loadOwnerProfile() {
    setOwnerProfileMessage('');
    ownerProfileForm.reset();
    const currentEmail = normalizeProfileEmail(
        document.getElementById('view-client').dataset.ownerEmail || ''
    );

    if (!currentEmail) {
        setOwnerProfileMessage('Inicia sesión para consultar y editar tu perfil.', true);
        return;
    }

    try {
        const matchingOwners = readProfileOwners().filter(account =>
            normalizeProfileEmail(account.email) === currentEmail
        );
        if (matchingOwners.length !== 1) {
            if (matchingOwners.length > 1) {
                setOwnerProfileMessage(
                    'Hay más de una cuenta registrada con ese correo. Contacta con soporte para resolverlo.',
                    true
                );
                return;
            }
            setOwnerProfileMessage('No se encontró la cuenta de dueño activa.', true);
            return;
        }

        const owner = matchingOwners[0];
        ownerProfileName.value = owner.name;
        ownerProfileEmail.value = owner.email;
        ownerProfilePhone.value = owner.phone || '';
    } catch (error) {
        setOwnerProfileMessage(
            error instanceof Error ? error.message : 'No se pudo cargar el perfil.',
            true
        );
    }
}

function saveOwnerProfile(event) {
    event.preventDefault();
    setOwnerProfileMessage('');

    const currentEmail = normalizeProfileEmail(
        document.getElementById('view-client').dataset.ownerEmail || ''
    );
    const name = ownerProfileName.value.trim();
    const email = normalizeProfileEmail(ownerProfileEmail.value);
    const phone = ownerProfilePhone.value.trim();

    if (!currentEmail) {
        setOwnerProfileMessage('Inicia sesión para guardar los cambios de tu perfil.', true);
        return;
    }
    if (!name || !email || !phone) {
        setOwnerProfileMessage('Completa tu nombre, correo electrónico y teléfono.', true);
        return;
    }
    if (!profilePhonePattern.test(phone)) {
        setOwnerProfileMessage('Revisa el teléfono: usa de 7 a 20 números o caracteres + ( ) . -', true);
        ownerProfilePhone.focus();
        return;
    }

    try {
        const owners = readProfileOwners();
        const matchingOwnerIndexes = owners.reduce((indexes, account, index) => {
            if (normalizeProfileEmail(account.email) === currentEmail) {
                indexes.push(index);
            }
            return indexes;
        }, []);
        if (matchingOwnerIndexes.length !== 1) {
            setOwnerProfileMessage(
                matchingOwnerIndexes.length > 1
                    ? 'Hay más de una cuenta registrada con ese correo. Contacta con soporte para resolverlo.'
                    : 'No se encontró la cuenta de dueño activa.',
                true
            );
            return;
        }
        const ownerIndex = matchingOwnerIndexes[0];
        if (owners.some((account, index) =>
            index !== ownerIndex && normalizeProfileEmail(account.email) === email
        )) {
            setOwnerProfileMessage('Ya existe una cuenta registrada con ese correo electrónico.', true);
            ownerProfileEmail.focus();
            return;
        }

        const previousOwner = owners[ownerIndex];
        const previousEmail = normalizeProfileEmail(previousOwner.email);
        const appointments = readOptionalProfileArray(PROFILE_APPOINTMENTS_KEY, 'citas');
        const pets = readOptionalProfileArray(PROFILE_PETS_KEY, 'mascotas');
        const clinicalRecords = readOptionalProfileArray(
            PROFILE_CLINICAL_RECORDS_KEY,
            'expedientes clínicos'
        );

        owners[ownerIndex] = { ...previousOwner, name, email, phone };
        updateOwnedEntries(appointments, previousEmail, email, name, phone);
        updateOwnedEntries(pets, previousEmail, email, name, phone);
        updateOwnedEntries(clinicalRecords, previousEmail, email, name, phone);

        localStorage.setItem(PROFILE_OWNER_ACCOUNTS_KEY, JSON.stringify(owners));
        writeOptionalProfileArray(PROFILE_APPOINTMENTS_KEY, appointments);
        writeOptionalProfileArray(PROFILE_PETS_KEY, pets);
        writeOptionalProfileArray(PROFILE_CLINICAL_RECORDS_KEY, clinicalRecords);

        const clientView = document.getElementById('view-client');
        clientView.dataset.ownerEmail = email;
        clientView.dataset.ownerName = name;
        clientView.dataset.ownerPhone = phone;
        document.getElementById('user-name').textContent = `Hola, ${name}`;
        ownerProfileEmail.value = email;

        if (typeof refreshAppointments === 'function') {
            refreshAppointments();
        }
        if (typeof renderOwnerClinicalRecords === 'function') {
            renderOwnerClinicalRecords();
        }
        setOwnerProfileMessage('Perfil actualizado. Tus citas usarán el nombre, correo y teléfono nuevos.');
    } catch (error) {
        setOwnerProfileMessage(
            error instanceof Error ? error.message : 'No se pudieron guardar los cambios del perfil.',
            true
        );
    }
}

function updateOwnedEntries(entries, previousEmail, email, name, phone) {
    if (entries === null) {
        return;
    }

    entries.forEach(entry => {
        if (normalizeProfileEmail(entry.ownerEmail || '') !== previousEmail) {
            return;
        }

        entry.ownerEmail = email;
        entry.ownerName = name;
        if (Object.prototype.hasOwnProperty.call(entry, 'owner')) {
            entry.owner = name;
        }
        if (Object.prototype.hasOwnProperty.call(entry, 'ownerPhone') || entry.date) {
            entry.ownerPhone = phone;
        }
    });
}

function readProfileOwners() {
    const savedOwners = localStorage.getItem(PROFILE_OWNER_ACCOUNTS_KEY);
    if (savedOwners === null) {
        throw new Error('No se encontraron cuentas de dueños guardadas.');
    }

    let owners;
    try {
        owners = JSON.parse(savedOwners);
    } catch {
        throw new Error('Los datos de las cuentas de dueños están dañados.');
    }
    if (!Array.isArray(owners) || owners.some(owner =>
        !owner || typeof owner.email !== 'string' || typeof owner.name !== 'string'
    )) {
        throw new Error('Las cuentas de dueños guardadas tienen un formato no válido.');
    }
    return owners;
}

function readOptionalProfileArray(key, label) {
    const savedValue = localStorage.getItem(key);
    if (savedValue === null) {
        return null;
    }

    let entries;
    try {
        entries = JSON.parse(savedValue);
    } catch {
        throw new Error(`Los datos de ${label} guardados están dañados.`);
    }
    if (!Array.isArray(entries) || entries.some(entry => !entry || typeof entry !== 'object')) {
        throw new Error(`Los datos de ${label} guardados tienen un formato no válido.`);
    }
    return entries;
}

function writeOptionalProfileArray(key, entries) {
    if (entries !== null) {
        localStorage.setItem(key, JSON.stringify(entries));
    }
}

function normalizeProfileEmail(email) {
    return email.trim().toLowerCase();
}

function setOwnerProfileMessage(message, isError = false) {
    ownerProfileMessage.textContent = message;
    ownerProfileMessage.style.color = isError ? '#b91c1c' : '#047478';
}