const CLINICAL_RECORDS_KEY = 'petsync.clinicalRecords.v1';
const REGISTERED_OWNERS_KEY = 'petsync.ownerAccounts.v1';
const PETS_KEY = 'petsync.pets.v1';

const clinicalRecordForm = document.getElementById('clinical-record-form');
const clinicalPatient = document.getElementById('clinical-patient');
const clinicalWeight = document.getElementById('clinical-weight');
const clinicalReason = document.getElementById('clinical-reason');
const clinicalDiagnosis = document.getElementById('clinical-diagnosis');
const clinicalTreatment = document.getElementById('clinical-treatment');
const clinicalFollowUp = document.getElementById('clinical-follow-up');
const clinicalRecordMessage = document.getElementById('clinical-record-message');
const clinicalRecordsList = document.getElementById('clinical-records-list');
const petRegistrationForm = document.getElementById('pet-registration-form');
const petNameInput = document.getElementById('pet-name');
const petSpeciesInput = document.getElementById('pet-species');
const petBreedInput = document.getElementById('pet-breed');
const petOwnerInput = document.getElementById('pet-owner');
const petRegistrationMessage = document.getElementById('pet-registration-message');
const patientsList = document.getElementById('patients-list');
const patientSearch = document.getElementById('patient-search');

clinicalFollowUp.min = toLocalDateTimeValue(new Date());
clinicalRecordForm.addEventListener('submit', saveClinicalRecord);
petRegistrationForm.addEventListener('submit', registerPet);
patientSearch.addEventListener('input', renderPatientRegistry);
patientsList.addEventListener('click', handlePatientAction);
refreshPatientRegistry();
renderClinicalRecords();

function saveClinicalRecord(event) {
    event.preventDefault();
    setClinicalRecordMessage('');

    let patient;
    try {
        patient = readPets().find(pet => pet.id === clinicalPatient.value);
    } catch (error) {
        setClinicalRecordMessage(
            error instanceof Error ? error.message : 'No se pudieron cargar las mascotas.',
            true
        );
        return;
    }

    const weight = Number(clinicalWeight.value);
    const reason = clinicalReason.value.trim();
    const diagnosis = clinicalDiagnosis.value.trim();
    const treatment = clinicalTreatment.value.trim();
    const action = event.submitter && event.submitter.value === 'follow-up'
        ? 'follow-up'
        : 'discharge';
    const followUpDate = clinicalFollowUp.value ? new Date(clinicalFollowUp.value) : null;

    if (!patient || !Number.isFinite(weight) || weight <= 0 || !reason || !diagnosis) {
        setClinicalRecordMessage('Completa los datos obligatorios con valores válidos.', true);
        return;
    }

    if (action === 'follow-up' &&
        (!followUpDate || Number.isNaN(followUpDate.getTime()) || followUpDate <= new Date())) {
        setClinicalRecordMessage('Selecciona una fecha y hora futuras para el seguimiento.', true);
        clinicalFollowUp.focus();
        return;
    }

    try {
        const records = readClinicalRecords();
        const record = {
            id: `clinical-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            patientId: patient.id,
            patient: patient.name,
            owner: patient.ownerName,
            ownerEmail: patient.ownerEmail,
            species: patient.species,
            breed: patient.breed,
            weight,
            reason,
            diagnosis,
            treatment,
            veterinarian: document.getElementById('user-name').textContent.trim(),
            createdAt: new Date().toISOString(),
            status: action === 'follow-up' ? 'Seguimiento programado' : 'Alta',
            followUp: action === 'follow-up' ? followUpDate.toISOString() : ''
        };

        records.unshift(record);
        localStorage.setItem(CLINICAL_RECORDS_KEY, JSON.stringify(records));

        clinicalRecordForm.reset();
        clinicalFollowUp.min = toLocalDateTimeValue(new Date());
        setClinicalRecordMessage(
            action === 'follow-up'
                ? 'Registro guardado y seguimiento programado.'
                : 'Registro guardado y paciente dado de alta.'
        );
        renderClinicalRecords();
    } catch (error) {
        setClinicalRecordMessage(
            error instanceof Error ? error.message : 'No se pudo guardar el registro clínico.',
            true
        );
    }
}

function refreshPatientRegistry() {
    try {
        const owners = readRegisteredOwners();
        const pets = readPets();
        renderOwnerOptions(owners);
        renderPatientOptions(pets);
        renderPatientRegistry();
    } catch (error) {
        petOwnerInput.replaceChildren();
        appendOption(petOwnerInput, '', 'No se pudieron cargar las cuentas de dueños.');
        patientsList.replaceChildren();
        appendClinicalRecordMessage(
            error instanceof Error ? error.message : 'No se pudo cargar la lista de pacientes.',
            true,
            patientsList
        );
    }
}

function registerPet(event) {
    event.preventDefault();
    setPetRegistrationMessage('');

    const name = petNameInput.value.trim();
    const species = petSpeciesInput.value;
    const breed = petBreedInput.value.trim();
    const ownerEmail = petOwnerInput.value.trim().toLowerCase();

    try {
        const owner = readRegisteredOwners().find(account =>
            normalizeEmail(account.email) === ownerEmail
        );
        if (!name || !species || !owner) {
            setPetRegistrationMessage(
                'Completa el nombre, la especie y selecciona una cuenta de dueño registrada.',
                true
            );
            return;
        }

        const pets = readPets();
        const pet = {
            id: `pet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name,
            species,
            breed,
            ownerName: owner.name.trim(),
            ownerEmail: normalizeEmail(owner.email),
            createdAt: new Date().toISOString()
        };
        pets.push(pet);
        localStorage.setItem(PETS_KEY, JSON.stringify(pets));

        petRegistrationForm.reset();
        refreshPatientRegistry();
        clinicalPatient.value = pet.id;
        setPetRegistrationMessage(`Mascota registrada y vinculada con ${owner.email}.`);
    } catch (error) {
        setPetRegistrationMessage(
            error instanceof Error ? error.message : 'No se pudo registrar la mascota.',
            true
        );
    }
}

function renderOwnerOptions(owners) {
    petOwnerInput.replaceChildren();
    appendOption(
        petOwnerInput,
        '',
        owners.length ? 'Selecciona el correo del dueño...' : 'Aún no hay dueños registrados.'
    );

    owners
        .slice()
        .sort((first, second) => first.name.localeCompare(second.name, 'es'))
        .forEach(owner => {
            const option = document.createElement('option');
            option.value = normalizeEmail(owner.email);
            option.textContent = `${owner.name} (${owner.email})`;
            petOwnerInput.append(option);
        });
}

function renderPatientOptions(pets) {
    const selectedPetId = clinicalPatient.value;
    clinicalPatient.replaceChildren();
    appendOption(
        clinicalPatient,
        '',
        pets.length ? 'Selecciona un paciente...' : 'Registra una mascota para comenzar.'
    );

    pets.forEach(pet => {
        const option = document.createElement('option');
        option.value = pet.id;
        option.textContent = `${pet.name} - ${pet.ownerName} (${pet.ownerEmail})`;
        clinicalPatient.append(option);
    });

    if (pets.some(pet => pet.id === selectedPetId)) {
        clinicalPatient.value = selectedPetId;
    }
}

function renderPatientRegistry() {
    try {
        const pets = readPets();
        const records = readClinicalRecords();
        const query = patientSearch.value.trim().toLocaleLowerCase('es-MX');
        const visiblePets = pets.filter(pet =>
            `${pet.name} ${pet.ownerName} ${pet.ownerEmail} ${pet.species} ${pet.breed}`
                .toLocaleLowerCase('es-MX')
                .includes(query)
        );
        patientsList.replaceChildren();

        if (visiblePets.length === 0) {
            appendClinicalRecordMessage(
                pets.length ? 'No hay pacientes que coincidan con la búsqueda.' :
                    'Todavía no hay mascotas registradas.',
                false,
                patientsList
            );
            return;
        }

        visiblePets.forEach((pet, index) => {
            const row = document.createElement('tr');
            const idCell = document.createElement('td');
            idCell.textContent = pet.id;
            const nameCell = document.createElement('td');
            const name = document.createElement('strong');
            name.textContent = pet.name;
            nameCell.append(name);
            const speciesCell = document.createElement('td');
            speciesCell.textContent = [pet.species, pet.breed].filter(Boolean).join(', ');
            const ownerCell = document.createElement('td');
            ownerCell.textContent = `${pet.ownerName} (${pet.ownerEmail})`;
            const visitCell = document.createElement('td');
            const lastRecord = records.find(record => record.patientId === pet.id);
            visitCell.textContent = lastRecord ? formatClinicalDate(lastRecord.createdAt) : 'Sin consultas';
            const actionsCell = document.createElement('td');
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'btn btn-outline btn-sm';
            button.dataset.patientId = pet.id;
            button.textContent = 'Crear expediente';
            actionsCell.append(button);
            row.append(idCell, nameCell, speciesCell, ownerCell, visitCell, actionsCell);
            patientsList.append(row);
        });
    } catch (error) {
        patientsList.replaceChildren();
        appendClinicalRecordMessage(
            error instanceof Error ? error.message : 'No se pudieron cargar los pacientes.',
            true,
            patientsList
        );
    }
}

function handlePatientAction(event) {
    const button = event.target.closest('button[data-patient-id]');
    if (!button) {
        return;
    }

    clinicalPatient.value = button.dataset.patientId;
    switchTab('vet', 'registro');
    clinicalWeight.focus();
}

function renderClinicalRecords() {
    try {
        const records = readClinicalRecords();
        clinicalRecordsList.replaceChildren();

        if (records.length === 0) {
            appendClinicalRecordMessage('Todavía no hay registros clínicos guardados.');
            return;
        }

        records.forEach(record => {
            const card = document.createElement('article');
            card.style.cssText =
                'padding: 16px; border-left: 4px solid var(--primary); background: #f8fafc; border-radius: 4px; margin: 12px 0;';

            const heading = document.createElement('h3');
            heading.style.margin = '0 0 8px';
            heading.textContent = `${record.patient} - ${record.status}`;

            const details = document.createElement('p');
            details.textContent =
                `${formatClinicalDate(record.createdAt)} · ${record.species} · ${record.weight} kg · Dueño: ${record.owner}`;

            const reason = document.createElement('p');
            reason.textContent = `Motivo: ${record.reason}`;

            const diagnosis = document.createElement('p');
            diagnosis.textContent = `Diagnóstico: ${record.diagnosis}`;

            card.append(heading, details, reason, diagnosis);

            if (record.treatment) {
                const treatment = document.createElement('p');
                treatment.textContent = `Tratamiento: ${record.treatment}`;
                card.append(treatment);
            }

            if (record.followUp) {
                const followUp = document.createElement('p');
                followUp.textContent = `Seguimiento: ${formatClinicalDate(record.followUp)}`;
                card.append(followUp);
            }

            const veterinarian = document.createElement('p');
            veterinarian.textContent = `Veterinario: ${record.veterinarian || 'No especificado'}`;
            card.append(veterinarian);
            clinicalRecordsList.append(card);
        });
    } catch (error) {
        clinicalRecordsList.replaceChildren();
        appendClinicalRecordMessage(
            error instanceof Error ? error.message : 'No se pudieron cargar los registros clínicos.',
            true
        );
    }
}

function readClinicalRecords() {
    const savedRecords = localStorage.getItem(CLINICAL_RECORDS_KEY);
    if (savedRecords === null) {
        return [];
    }

    let records;
    try {
        records = JSON.parse(savedRecords);
    } catch {
        throw new Error('Los registros clínicos guardados están dañados.');
    }

    if (!Array.isArray(records) || records.some(record =>
        !record ||
        typeof record.patientId !== 'string' ||
        typeof record.patient !== 'string' ||
        typeof record.owner !== 'string' ||
        (record.ownerEmail !== undefined && typeof record.ownerEmail !== 'string') ||
        typeof record.species !== 'string' ||
        typeof record.weight !== 'number' ||
        typeof record.reason !== 'string' ||
        typeof record.diagnosis !== 'string' ||
        typeof record.treatment !== 'string' ||
        typeof record.createdAt !== 'string' ||
        Number.isNaN(new Date(record.createdAt).getTime()) ||
        typeof record.status !== 'string' ||
        typeof record.followUp !== 'string' ||
        (record.followUp !== '' && Number.isNaN(new Date(record.followUp).getTime()))
    )) {
        throw new Error('Los registros clínicos guardados tienen un formato no válido.');
    }

    return records;
}

function readRegisteredOwners() {
    const savedOwners = localStorage.getItem(REGISTERED_OWNERS_KEY);
    if (savedOwners === null) {
        return [];
    }

    let owners;
    try {
        owners = JSON.parse(savedOwners);
    } catch {
        throw new Error('Los datos de las cuentas de dueños están dañados.');
    }

    if (!Array.isArray(owners) || owners.some(owner =>
        !owner ||
        typeof owner.name !== 'string' ||
        typeof owner.email !== 'string' ||
        !owner.email.trim()
    )) {
        throw new Error('Las cuentas de dueños guardadas tienen un formato no válido.');
    }

    return owners;
}

function readPets() {
    const savedPets = localStorage.getItem(PETS_KEY);
    if (savedPets === null) {
        return [];
    }

    let pets;
    try {
        pets = JSON.parse(savedPets);
    } catch {
        throw new Error('Los datos de las mascotas guardadas están dañados.');
    }

    if (!Array.isArray(pets) || pets.some(pet =>
        !pet ||
        typeof pet.id !== 'string' ||
        typeof pet.name !== 'string' ||
        typeof pet.species !== 'string' ||
        typeof pet.breed !== 'string' ||
        typeof pet.ownerName !== 'string' ||
        typeof pet.ownerEmail !== 'string' ||
        !pet.ownerEmail.trim() ||
        typeof pet.createdAt !== 'string' ||
        Number.isNaN(new Date(pet.createdAt).getTime())
    )) {
        throw new Error('Las mascotas guardadas tienen un formato no válido.');
    }

    return pets;
}

function appendOption(select, value, label) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.append(option);
}

function normalizeEmail(email) {
    return email.trim().toLowerCase();
}

function setPetRegistrationMessage(message, isError = false) {
    petRegistrationMessage.textContent = message;
    petRegistrationMessage.style.color = isError ? '#b91c1c' : '#047478';
}

function appendClinicalRecordMessage(message, isError = false, container = clinicalRecordsList) {
    const paragraph = document.createElement('p');
    paragraph.style.color = isError ? '#b91c1c' : 'var(--text-muted)';
    paragraph.textContent = message;
    if (container === patientsList) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 6;
        cell.append(paragraph);
        row.append(cell);
        container.append(row);
    } else {
        container.append(paragraph);
    }
}

function setClinicalRecordMessage(message, isError = false) {
    clinicalRecordMessage.textContent = message;
    clinicalRecordMessage.style.color = isError ? '#b91c1c' : '#047478';
}

function formatClinicalDate(value) {
    return new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(new Date(value));
}

function toLocalDateTimeValue(date) {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 16);
}