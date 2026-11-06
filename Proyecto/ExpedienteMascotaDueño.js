const OWNER_CLINICAL_RECORDS_KEY = 'petsync.clinicalRecords.v1';

function renderOwnerClinicalRecords() {
    const recordsContainer = document.getElementById('owner-clinical-records');
    recordsContainer.replaceChildren();

    try {
        const ownerEmail = normalizeOwnerEmail(
            document.getElementById('view-client').dataset.ownerEmail || ''
        );
        if (!ownerEmail) {
            appendOwnerMessage(recordsContainer, 'Inicia sesión para consultar tus expedientes.');
            return;
        }

        const ownerRecords = readOwnerClinicalRecords()
            .filter(record => normalizeOwnerEmail(record.ownerEmail || '') === ownerEmail)
            .sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt));

        if (ownerRecords.length === 0) {
            appendOwnerMessage(
                recordsContainer,
                'Todavía no hay expedientes clínicos asociados a tu cuenta.'
            );
            return;
        }

        ownerRecords.forEach(record => {
            const card = document.createElement('article');
            card.className = 'card';

            const heading = document.createElement('h2');
            heading.textContent = record.patient;

            const summary = document.createElement('p');
            summary.className = 'muted';
            summary.textContent = `${record.species}${record.breed ? `, ${record.breed}` : ''} · ` +
                `Registro del ${formatOwnerDate(record.createdAt)} · ${record.status}`;

            const reason = document.createElement('p');
            reason.textContent = `Motivo de consulta: ${record.reason}`;

            const diagnosis = document.createElement('p');
            diagnosis.textContent = `Diagnóstico: ${record.diagnosis}`;

            const weight = document.createElement('p');
            weight.textContent = `Peso registrado: ${record.weight} kg`;

            const veterinarian = document.createElement('p');
            veterinarian.textContent = `Atendido por: ${record.veterinarian || 'Veterinario de la clínica'}`;

            card.append(heading, summary, reason, diagnosis, weight, veterinarian);

            if (record.treatment) {
                const treatment = document.createElement('p');
                treatment.textContent = `Tratamiento y receta: ${record.treatment}`;
                card.append(treatment);
            }

            if (record.followUp) {
                const followUp = document.createElement('p');
                followUp.textContent = `Próximo seguimiento: ${formatOwnerDate(record.followUp)}`;
                card.append(followUp);
            }

            recordsContainer.append(card);
        });
    } catch (error) {
        recordsContainer.replaceChildren();
        appendOwnerMessage(
            recordsContainer,
            error instanceof Error ? error.message : 'No se pudieron cargar tus expedientes.',
            true
        );
    }
}

function readOwnerClinicalRecords() {
    const savedRecords = localStorage.getItem(OWNER_CLINICAL_RECORDS_KEY);
    if (savedRecords === null) {
        return [];
    }

    let records;
    try {
        records = JSON.parse(savedRecords);
    } catch {
        throw new Error('Los expedientes clínicos guardados están dañados.');
    }

    if (!Array.isArray(records) || records.some(record =>
        !record ||
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
        throw new Error('Los expedientes clínicos guardados tienen un formato no válido.');
    }

    return records;
}

function normalizeOwnerEmail(email) {
    return email.trim().toLowerCase();
}

function formatOwnerDate(value) {
    return new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'long',
        timeStyle: 'short'
    }).format(new Date(value));
}

function appendOwnerMessage(container, message, isError = false) {
    const card = document.createElement('div');
    card.className = 'card';
    const paragraph = document.createElement('p');
    paragraph.className = isError ? 'msg-error' : 'msg-muted';
    paragraph.textContent = message;
    card.append(paragraph);
    container.append(card);
}

window.addEventListener('storage', event => {
    if (event.key === OWNER_CLINICAL_RECORDS_KEY) {
        renderOwnerClinicalRecords();
    }
});