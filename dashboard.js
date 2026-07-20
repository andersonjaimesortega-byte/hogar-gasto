document.addEventListener('DOMContentLoaded', async () => {
    const guestsBody = document.getElementById('guests-body');
    const totalGuestsEl = document.getElementById('total-guests');
    const totalResponsesEl = document.getElementById('total-responses');
    const attendingCountEl = document.getElementById('attending-count');

    try {
        const response = await fetch('/api/guests');
        if (!response.ok) throw new Error('Failed to fetch guests');

        const guests = await response.json();

        let totalAdults = 0;
        let confirmedYes = 0;

        guestsBody.innerHTML = guests.map(guest => {
            const isAttending = guest.attending === 'Sí';
            if (isAttending) {
                confirmedYes++;
                totalAdults += (1 + (parseInt(guest.guests_count) || 0));
            }

            const date = new Date(guest.created_at).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });

            return `
                <tr>
                    <td><strong>${guest.name}</strong></td>
                    <td>${guest.email || '-'}</td>
                    <td><span class="status-badge ${isAttending ? 'status-yes' : 'status-no'}">${guest.attending}</span></td>
                    <td>${guest.guests_count}</td>
                    <td style="font-size: 0.9rem; color: #666; font-style: italic;">"${guest.message || ''}"</td>
                    <td style="font-size: 0.8rem; color: #999;">${date}</td>
                </tr>
            `;
        }).join('');

        // Update Stats
        totalGuestsEl.textContent = totalAdults;
        totalResponsesEl.textContent = guests.length;
        attendingCountEl.textContent = confirmedYes;

    } catch (error) {
        console.error('Error loading dashboard:', error);
        guestsBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 50px;">Error al cargar la lista. Asegúrate de que el servidor esté corriendo.</td></tr>';
    }
});
