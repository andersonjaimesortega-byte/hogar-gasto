document.addEventListener('DOMContentLoaded', () => {
    const rsvpForm = document.getElementById('rsvp-form');
    const successMessage = document.getElementById('success-message');

    if (rsvpForm) {
        rsvpForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Simulate a slight delay for a premium feel
            const submitBtn = rsvpForm.querySelector('button');
            const originalText = submitBtn.textContent;

            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando...';

            // Collect data
            const formData = new FormData(rsvpForm);
            const data = Object.fromEntries(formData.entries());

            try {
                const response = await fetch('/api/rsvp', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                });

                if (!response.ok) throw new Error('Network response was not ok');

                const result = await response.json();
                console.log('RSVP Success:', result);

                // Show success state
                rsvpForm.classList.add('hidden');
                successMessage.classList.remove('hidden');
                successMessage.style.animation = 'fadeInUp 0.8s ease-out forwards';
            } catch (error) {
                console.error('Error submitting RSVP:', error);
                alert('Hubo un error al enviar tu confirmación. Por favor, inténtalo de nuevo.');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }

    // Optional: Add subtle parallax to background on mouse move
    document.addEventListener('mousemove', (e) => {
        const moveX = (e.clientX - window.innerWidth / 2) * 0.01;
        const moveY = (e.clientY - window.innerHeight / 2) * 0.01;

        const overlay = document.querySelector('.background-overlay');
        if (overlay) {
            overlay.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.05)`;
        }
    });
});
