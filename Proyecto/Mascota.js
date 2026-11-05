const APPOINTMENTS_KEY = 'petsync.appointments.v1';

const appointmentForm = document.getElementById('appointment-form');
const appointmentPet = document.getElementById('appointment-pet');
const appointmentDate = document.getElementById('appointment-date');
const appointmentReason = document.getElementById('appointment-reason');
const appointmentMessage = document.getElementById('appointment-message');
const appointmentsList = document.getElementById('appointments-list');

appointmentDate.min = toLocalDateTimeValue(new Date());
appointmentForm.addEventListener('submit', createAppointment);
renderAppointments();

function createAppointment(event) {
    event.preventDefault();
    setAppointmentMessage('');

    const date = new Date(appointmentDate.value);
    const reason = appointmentReason.value.trim();

    if (!appointmentPet.value || !appointmentDate.value || !reason) {
        setAppointmentMessage('Completa todos los campos para solicitar la cita.', true);
        return;
    }

    if (Number.isNaN(date.getTime()) || date <= new Date()) {
        setAppointmentMessage('Selecciona una fecha y hora futuras.', true);
        return;
    }

    try {
        const appointments = readAppointments();
        appointments.push({
            pet: appointmentPet.value,
            date: date.toISOString(),
            reason
        });
        appointments.sort((first, second) => new Date(first.date) - new Date(second.date));
        localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appointments));

        appointmentForm.reset();
        appointmentDate.min = toLocalDateTimeValue(new Date());
        setAppointmentMessage('Cita solicitada correctamente.');
        renderAppointments();
    } catch (error) {
        setAppointmentMessage(
            error instanceof Error ? error.message : 'No se pudo guardar la cita.',
            true
        );
    }
}

function renderAppointments() {
    try {
        const appointments = readAppointments();
        appointmentsList.replaceChildren();

        if (appointments.length === 0) {
            appendAppointmentMessage('Aún no tienes citas agendadas.');
            return;
        }

        appointments
            .filter(appointment => new Date(appointment.date) >= new Date())
            .forEach(appointment => {
                const card = document.createElement('article');
                card.style.cssText =
                    'padding: 16px; border-left: 4px solid var(--primary); background: #f8fafc; border-radius: 4px; margin-bottom: 12px;';

                const title = document.createElement('h4');
                title.style.margin = '0 0 4px';
                title.textContent = `${appointment.reason} - ${appointment.pet}`;

                const date = document.createElement('p');
                date.style.cssText = 'margin: 0; font-size: 14px; color: var(--text-muted);';
                date.textContent = new Intl.DateTimeFormat('es-MX', {
                    dateStyle: 'long',
                    timeStyle: 'short'
                }).format(new Date(appointment.date));

                card.append(title, date);
                appointmentsList.append(card);
            });

        if (!appointmentsList.hasChildNodes()) {
            appendAppointmentMessage('No tienes próximas citas.');
        }
    } catch (error) {
        appointmentsList.replaceChildren();
        appendAppointmentMessage(
            error instanceof Error ? error.message : 'No se pudieron cargar las citas.',
            true
        );
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

    if (!Array.isArray(appointments) || appointments.some(appointment =>
        !appointment ||
        typeof appointment.pet !== 'string' ||
        typeof appointment.reason !== 'string' ||
        typeof appointment.date !== 'string' ||
        Number.isNaN(new Date(appointment.date).getTime())
    )) {
        throw new Error('Los datos de las citas guardadas no tienen un formato válido.');
    }

    return appointments;
}

function appendAppointmentMessage(message, isError = false) {
    const paragraph = document.createElement('p');
    paragraph.style.color = isError ? '#b91c1c' : 'var(--text-muted)';
    paragraph.textContent = message;
    appointmentsList.append(paragraph);
}

function setAppointmentMessage(message, isError = false) {
    appointmentMessage.textContent = message;
    appointmentMessage.style.color = isError ? '#b91c1c' : '#047478';
}

function toLocalDateTimeValue(date) {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 16);
}