const LOGEOS = [
    {
        name: 'Armando Ramos Corona',
        email: 'armando.ramos@petsync.com',
        password: 'Armandovet_2026',
        id: '2518'
    },
    {
        name: 'Tadeo Casados',
        email: 'tadeo.casados@petsync.com',
        password: 'Tadeovet_2026',
        id: '2519'
    }
];

const veterinarianForm = document.getElementById('auth-form');

veterinarianForm.addEventListener('submit', handleVeterinarianLogin);

function handleVeterinarianLogin(event) {
    if (document.getElementById('view-auth').dataset.role !== 'vet') {
        return;
    }

    event.preventDefault();

    const veterinarianId = document.getElementById('vet-id').value.trim();
    const email = document.getElementById('auth-email').value.trim().toLowerCase();
    const password = document.getElementById('auth-password').value;
    const authMessage = document.getElementById('auth-message');
    authMessage.textContent = '';

    const veterinarian = LOGEOS.find(account =>
        account.id === veterinarianId.toUpperCase() &&
        account.email === email &&
        account.password === password
    );

    if (!veterinarian) {
        authMessage.textContent = 'Correo, contraseña o identificador incorrectos.';
        authMessage.style.color = '#b91c1c';
        return;
    }

    document.getElementById('user-name').innerText = veterinarian.name;
    document.getElementById('auth-password').value = '';
    document.getElementById('auth-email').value = '';
    document.getElementById('vet-id').value = '';
    showView('view-vet');
}