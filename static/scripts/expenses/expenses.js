 // Optional: Add some interactive features
        document.addEventListener('DOMContentLoaded', function() {
            // Add smooth hover effects and animations
            const cards = document.querySelectorAll('.expense-card');
            
            cards.forEach(card => {
                card.addEventListener('mouseenter', function() {
                    this.style.transform = 'translateY(-5px) scale(1.02)';
                });
                
                card.addEventListener('mouseleave', function() {
                    this.style.transform = 'translateY(0) scale(1)';
                });
            });

            // Simulate loading stats (you can replace this with actual data from your Google Sheets)
            setTimeout(() => {
                animateCounter('totalExpenses', 24);
                animateCounter('fabricCount', 15);
                animateCounter('otherCount', 9);
            }, 500);
        });

        function animateCounter(elementId, targetValue) {
            const element = document.getElementById(elementId);
            const duration = 1000;
            const start = 0;
            const startTime = performance.now();

            function updateCounter(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const current = Math.floor(start + (targetValue - start) * progress);
                
                element.textContent = current;

                if (progress < 1) {
                    requestAnimationFrame(updateCounter);
                }
            }

            requestAnimationFrame(updateCounter);
        }

        // Add keyboard navigation
        document.addEventListener('keydown', function(e) {
            if (e.key === '1') {
                window.location.href = 'fabric-expense.html';
            } else if (e.key === '2') {
                window.location.href = 'other-expense.html';
            }
        });