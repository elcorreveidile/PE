/**
 * Sistema Multi-Curso - Redirección inteligente por curso
 */

window.PE = window.PE || {};

PE.CourseRedirect = {
    /**
     * Redirigir al dashboard correcto según el curso del usuario
     */
    async redirectBasedOnCourse() {
        const currentUser = PE.Utils.storage.get('currentUser');

        if (!currentUser) {
            // Si no hay usuario, redirigir al login
            window.location.href = '../auth/login.html';
            return;
        }

        // Obtener información actualizada del usuario
        try {
            const response = await PE.API.get('/auth/me');

            if (response.course_code === 'C1-ARTE-SOCIEDAD' || response.course_name?.includes('C1')) {
                // Usuario del curso C1 - redirigir a debates
                window.location.href = '../debates.html';
            } else {
                // Usuario del curso C2 - quedarse en dashboard
                // Ya estamos en el lugar correcto
                console.log('Usuario de C2 - staying in dashboard');
            }
        } catch (error) {
            console.error('Error al obtener información del curso:', error);
            // Si hay error, quedarse en el dashboard por defecto
        }
    },

    /**
     * Inicializar redirección en páginas de registro
     */
    initRegistrationRedirect() {
        const forms = document.querySelectorAll('form[data-registration-form]');
        forms.forEach(form => {
            form.addEventListener('submit', (e) => {
                // Guardar información del curso para redirección posterior
                const courseInfo = document.getElementById('course-info-display');
                if (courseInfo && courseInfo.dataset.courseCode) {
                    sessionStorage.setItem('pendingCourseRedirect', courseInfo.dataset.courseCode);
                }
            }, { once: true });
        });
    }
};

// Inicializar cuando el DOM esté listo
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        // Ejecutar redirección si estamos en el dashboard
        if (window.location.pathname.includes('dashboard.html')) {
            // Pequeño delay para permitir que el sistema de autenticación cargue
            setTimeout(() => {
                PE.CourseRedirect.redirectBasedOnCourse();
            }, 100);
        }
    });
}