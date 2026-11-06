const APPOINTMENTS_KEY = 'petsync.appointments.v2';
const LEGACY_APPOINTMENTS_KEY = 'petsync.appointments.v1';

const appointmentForm = document.getElementById('appointment-form');
const appointmentPet = document.getElementById('appointment-pet');
const appointmentPetHelp = document.getElementById('appointment-pet-help');
const appointmentVeterinarian = document.getElementById('appointment-veterinarian');
const appointmentDate = document.getElementById('appointment-date');
const appointmentReason = document.getElementById('appointment-reason');
const appointmentMessage = document.getElementById('appointment-message');
const appointmentsList = document.getElementById('appointments-list');
const vetAppointmentsList = document.getElementById('vet-appointments-list');
const vetAppointmentsSummary = document.getElementById('vet-appointments-summary');
const vetAppointmentsMessage = document.getElementById('vet-appointments-message');

appointmentDate.min = toAppointmentDateTimeValue(new Date());
appointmentForm.addEventListener('submit', createAppointment);
appointmentsList.addEventListener('click', handleOwnerAppointmentAction);
vetAppointmentsList.addEventListener('click', handleVeterinarianAppointmentAction);
window.addEventListener('storage', event => {
    if (event.key === APPOINTMENTS_KEY) {
        refreshAppointments();
    }
});

refreshAppointments();

function refreshAppointments() {
    refreshSpeciesOptions();
    refreshVeterinarianOptions();
    renderOwnerAppointments();
    renderVeterinarianAppointments();
}

function createAppointment(event) {
    event.preventDefault();
    setAppointmentMessage('');

    const ownerEmail = normalizeAppointmentEmail(
        document.getElementById('view-client').dataset.ownerEmail || ''
    );
    const ownerName = document.getElementById('view-client').dataset.ownerName || '';
    const ownerPhone = document.getElementById('view-client').dataset.ownerPhone || '';
    const species = appointmentPet.value;
    const veterinarianEmail = normalizeAppointmentEmail(appointmentVeterinarian.value);
    const date = new Date(appointmentDate.value);
    const reason = appointmentReason.value.trim();

    if (!ownerEmail || !ownerName || !ownerPhone || !species || !veterinarianEmail ||
        !appointmentDate.value || !reason) {
        setAppointmentMessage(
            !ownerPhone
                ? 'Agrega un teléfono de contacto en tu perfil antes de solicitar una cita.'
                : 'Completa todos los campos para solicitar la cita.',
            true
        );
        return;
    }

    if (Number.isNaN(date.getTime()) || date <= new Date()) {
        setAppointmentMessage('Selecciona una fecha y hora futuras.', true);
        return;
    }

    try {
        const veterinarian = getVeterinarianDirectory().find(account =>
            normalizeAppointmentEmail(account.email) === veterinarianEmail
        );
        if (!['canino', 'felino'].includes(normalizeAppointmentSpecies(species)) || !veterinarian) {
            setAppointmentMessage(
                !veterinarian
                    ? 'El veterinario seleccionado ya no está disponible. Actualiza la página.'
                    : 'Selecciona Canino o Felino para continuar.',
                true
            );
            refreshAppointments();
            return;
        }

        const appointments = readAppointments();
        appointments.push({
            id: `appointment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            petId: '',
            pet: '',
            species,
            ownerEmail,
            ownerName,
            ownerPhone,
            veterinarianEmail: normalizeAppointmentEmail(veterinarian.email),
            veterinarianName: veterinarian.name,
            date: date.toISOString(),
            reason,
            status: 'pending',
            createdAt: new Date().toISOString()
        });
        appointments.sort((first, second) => new Date(first.date) - new Date(second.date));
        localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appointments));

        appointmentForm.reset();
        appointmentDate.min = toAppointmentDateTimeValue(new Date());
        setAppointmentMessage('Solicitud enviada al veterinario. La cita está pendiente de respuesta.');
        refreshAppointments();
    } catch (error) {
        setAppointmentMessage(
            error instanceof Error ? error.message : 'No se pudo enviar la solicitud de cita.',
            true
        );
    }
}

function refreshSpeciesOptions() {
    const previousSpecies = appointmentPet.value;
    appointmentPet.replaceChildren();

    appendAppointmentOption(appointmentPet, '', 'Selecciona Canino o Felino...');
    appendAppointmentOption(appointmentPet, 'Canino', 'Canino');
    appendAppointmentOption(appointmentPet, 'Felino', 'Felino');
    appointmentPetHelp.textContent = 'No necesitas registrar tu mascota para solicitar una cita.';
    if (['Canino', 'Felino'].includes(previousSpecies)) {
        appointmentPet.value = previousSpecies;
    }
}

function refreshVeterinarianOptions() {
    const previousEmail = appointmentVeterinarian.value;
    appointmentVeterinarian.replaceChildren();
    const veterinarians = getVeterinarianDirectory();
    appendAppointmentOption(
        appointmentVeterinarian,
        '',
        'Selecciona un veterinario...'
    );
    veterinarians.forEach(veterinarian => appendAppointmentOption(
        appointmentVeterinarian,
        normalizeAppointmentEmail(veterinarian.email),
        `${veterinarian.name} (${veterinarian.email})`
    ));
    if (veterinarians.some(veterinarian =>
        normalizeAppointmentEmail(veterinarian.email) === previousEmail
    )) {
        appointmentVeterinarian.value = previousEmail;
    }
}

function renderOwnerAppointments() {
    const ownerEmail = normalizeAppointmentEmail(
        document.getElementById('view-client').dataset.ownerEmail || ''
    );
    appointmentsList.replaceChildren();

    try {
        const appointments = readAppointments()
            .filter(appointment =>
                normalizeAppointmentEmail(appointment.ownerEmail) === ownerEmail
            )
            .sort((first, second) => new Date(second.date) - new Date(first.date));

        if (!ownerEmail || appointments.length === 0) {
            appendAppointmentMessage(
                appointmentsList,
                ownerEmail ? 'Aún no tienes citas agendadas.' : 'Inicia sesión para consultar tus citas.'
            );
            appendLegacyAppointmentsNotice();
            return;
        }

        appointments.forEach(appointment => {
            const card = createAppointmentCard(appointment);
            const status = document.createElement('p');
            status.textContent = `Estado: ${appointmentStatusLabel(appointment.status)}`;
            card.append(status);

            const veterinarian = document.createElement('p');
            veterinarian.textContent = `Veterinario: ${appointment.veterinarianName}`;
            card.append(veterinarian);

            if (appointment.status === 'pending' || appointment.status === 'accepted') {
                const cancelButton = createAppointmentAction(
                    'Cancelar cita',
                    appointment.id,
                    'cancel',
                    'btn btn-outline btn-sm'
                );
                card.append(cancelButton);
            } else {
                const deleteButton = createAppointmentAction(
                    'Eliminar',
                    appointment.id,
                    'delete',
                    'btn btn-outline btn-sm'
                );
                card.append(deleteButton);
            }

            appointmentsList.append(card);
        });
        appendLegacyAppointmentsNotice();
    } catch (error) {
        appointmentsList.replaceChildren();
        appendAppointmentMessage(
            appointmentsList,
            error instanceof Error ? error.message : 'No se pudieron cargar tus citas.',
            true
        );
    }
}

function appendLegacyAppointmentsNotice() {
    if (localStorage.getItem(LEGACY_APPOINTMENTS_KEY) === null) {
        return;
    }

    appendAppointmentMessage(
        appointmentsList,
        'Hay citas anteriores que no tienen dueño ni veterinario vinculado. Vuelve a solicitarlas para que el doctor pueda responder.'
    );
}

function renderVeterinarianAppointments() {
    vetAppointmentsList.replaceChildren();

    try {
        const veterinarianEmail = normalizeAppointmentEmail(
            document.getElementById('view-vet').dataset.veterinarianEmail || ''
        );
        const appointments = readAppointments()
            .filter(appointment =>
                normalizeAppointmentEmail(appointment.veterinarianEmail) === veterinarianEmail
            )
            .sort((first, second) => new Date(first.date) - new Date(second.date));
        const pendingCount = appointments.filter(appointment => appointment.status === 'pending').length;
        vetAppointmentsSummary.textContent =
            `${appointments.length} citas asignadas · ${pendingCount} solicitudes pendientes`;

        if (!veterinarianEmail || appointments.length === 0) {
            appendAppointmentTableMessage(
                veterinarianEmail
                    ? 'No tienes solicitudes ni citas asignadas.'
                    : 'Inicia sesión como veterinario para consultar tus citas.'
            );
            return;
        }

        appointments.forEach(appointment => {
            const row = document.createElement('tr');
            appendCell(row, formatAppointmentDate(appointment.date));
            appendCell(row, appointment.species);
            appendCell(row, appointment.reason);
            appendCell(
                row,
                `${appointment.ownerName} (${appointment.ownerEmail}) · Tel: ${appointment.ownerPhone || 'No registrado'}`
            );
            appendCell(row, appointmentStatusLabel(appointment.status));

            const actionCell = document.createElement('td');
            if (appointment.status === 'pending') {
                actionCell.append(
                    createAppointmentAction('Aceptar', appointment.id, 'accept', 'btn btn-vet btn-sm'),
                    createAppointmentAction('Rechazar', appointment.id, 'reject', 'btn btn-outline btn-sm')
                );
            } else if (appointment.status === 'accepted') {
                const accepted = document.createElement('span');
                accepted.textContent = 'Cita confirmada';
                actionCell.append(accepted);
            } else {
                actionCell.textContent = 'Sin acciones';
            }
            row.append(actionCell);
            vetAppointmentsList.append(row);
        });
    } catch (error) {
        vetAppointmentsSummary.textContent = 'No se pudo cargar la agenda.';
        appendAppointmentTableMessage(
            error instanceof Error ? error.message : 'No se pudieron cargar las citas.',
            true
        );
    }
}

function handleOwnerAppointmentAction(event) {
    const button = event.target.closest('button[data-appointment-action]');
    if (!button) {
        return;
    }

    const ownerEmail = normalizeAppointmentEmail(
        document.getElementById('view-client').dataset.ownerEmail || ''
    );
    updateAppointment(button.dataset.appointmentId, appointment =>
        normalizeAppointmentEmail(appointment.ownerEmail) === ownerEmail,
    current => {
        if (button.dataset.appointmentAction === 'cancel' &&
            (current.status === 'pending' || current.status === 'accepted')) {
            current.status = 'cancelled';
            current.updatedAt = new Date().toISOString();
            return true;
        }
        if (button.dataset.appointmentAction === 'delete' &&
            (current.status === 'cancelled' || current.status === 'rejected')) {
            return false;
        }
        return null;
    });
}

function handleVeterinarianAppointmentAction(event) {
    const button = event.target.closest('button[data-appointment-action]');
    if (!button) {
        return;
    }

    const veterinarianEmail = normalizeAppointmentEmail(
        document.getElementById('view-vet').dataset.veterinarianEmail || ''
    );
    const action = button.dataset.appointmentAction;
    updateAppointment(button.dataset.appointmentId, appointment =>
        normalizeAppointmentEmail(appointment.veterinarianEmail) === veterinarianEmail,
    current => {
        if (current.status !== 'pending') {
            return null;
        }
        current.status = action === 'accept' ? 'accepted' : 'rejected';
        current.updatedAt = new Date().toISOString();
        return true;
    });
}

function updateAppointment(appointmentId, isAuthorized, update) {
    try {
        const appointments = readAppointments();
        const index = appointments.findIndex(appointment => appointment.id === appointmentId);
        if (index < 0 || !isAuthorized(appointments[index])) {
            return;
        }

        const shouldKeep = update(appointments[index]);
        if (shouldKeep === null) {
            return;
        }
        if (!shouldKeep) {
            appointments.splice(index, 1);
        }
        localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appointments));
        refreshAppointments();
    } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo actualizar la cita.';
        if (!document.getElementById('view-vet').classList.contains('hidden')) {
            vetAppointmentsMessage.textContent = message;
            vetAppointmentsMessage.style.color = '#b91c1c';
        } else {
            setAppointmentMessage(message, true);
        }
    }
}

function readAppointments() {
    const savedAppointments = localStorage.getItem(APPOINTMENTS_KEY);
    if (savedAppointments === null) {
        return [];
    }

    let appointments;
    try {
        appointments = JSON.parse(savedAppointments);
    } catch {
        throw new Error('Los datos de las citas guardadas están dañados.');
    }

    const validStatuses = ['pending', 'accepted', 'rejected', 'cancelled'];
    if (!Array.isArray(appointments) || appointments.some(appointment =>
        !appointment ||
        typeof appointment.id !== 'string' ||
        typeof appointment.petId !== 'string' ||
        typeof appointment.pet !== 'string' ||
        typeof appointment.species !== 'string' ||
        typeof appointment.ownerEmail !== 'string' ||
        typeof appointment.ownerName !== 'string' ||
        typeof appointment.veterinarianEmail !== 'string' ||
        typeof appointment.veterinarianName !== 'string' ||
        typeof appointment.reason !== 'string' ||
        typeof appointment.date !== 'string' ||
        Number.isNaN(new Date(appointment.date).getTime()) ||
        !validStatuses.includes(appointment.status)
    )) {
        throw new Error('Las citas guardadas tienen un formato no válido.');
    }

    return appointments;
}

function createAppointmentCard(appointment) {
    const card = document.createElement('article');
    card.style.cssText =
        'padding: 16px; border-left: 4px solid var(--primary); background: #f8fafc; border-radius: 4px; margin-bottom: 12px;';
    const title = document.createElement('h3');
    title.style.margin = '0 0 8px';
    title.textContent = `${appointment.pet} · ${appointment.reason}`;
    const date = document.createElement('p');
    date.textContent = formatAppointmentDate(appointment.date);
    card.append(title, date);
    return card;
}

function createAppointmentAction(label, appointmentId, action, className) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.dataset.appointmentId = appointmentId;
    button.dataset.appointmentAction = action;
    button.textContent = label;
    return button;
}

function appendAppointmentOption(select, value, label) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.append(option);
}

function appendCell(row, text) {
    const cell = document.createElement('td');
    cell.textContent = text;
    row.append(cell);
}

function appendAppointmentMessage(container, message, isError = false) {
    const paragraph = document.createElement('p');
    paragraph.className = isError ? 'msg-error' : 'msg-muted';
    paragraph.textContent = message;
    container.append(paragraph);
}

function appendAppointmentTableMessage(message, isError = false) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    const paragraph = document.createElement('p');
    paragraph.className = isError ? 'msg-error' : 'msg-muted';
    paragraph.textContent = message;
    cell.append(paragraph);
    row.append(cell);
    vetAppointmentsList.append(row);
}

function appointmentStatusLabel(status) {
    return {
        pending: 'Pendiente de respuesta',
        accepted: 'Aceptada',
        rejected: 'Rechazada',
        cancelled: 'Cancelada'
    }[status] || 'Estado desconocido';
}

function formatAppointmentDate(value) {
    return new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'long',
        timeStyle: 'short'
    }).format(new Date(value));
}

function normalizeAppointmentEmail(email) {
    return email.trim().toLowerCase();
}

function normalizeAppointmentSpecies(species) {
    return species.trim().toLocaleLowerCase('es-MX');
}

function setAppointmentMessage(message, isError = false) {
    appointmentMessage.textContent = message;
    appointmentMessage.style.color = isError ? '#b91c1c' : '#047478';
}

function toAppointmentDateTimeValue(date) {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 16);
}