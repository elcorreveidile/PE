/**
 * Sistema Multi-Curso - Módulo de gestión de cursos
 */

window.PE = window.PE || {};

PE.Courses = {
    /**
     * Validar código de registro y obtener información del curso
     */
    async validateRegistrationCode(code) {
        try {
            const response = await fetch(`${CONFIG.API_URL}/api/public/validate-code/${encodeURIComponent(code)}`);

            if (!response.ok) {
                throw new Error('Error al validar código');
            }

            const data = await response.json();

            return {
                valid: data.valid,
                course_info: data.data || null
            };
        } catch (error) {
            console.error('Error validando código:', error);
            return {
                valid: false,
                course_info: null,
                error: error.message
            };
        }
    },

    /**
     * Obtener lista de cursos disponibles
     */
    async getCourses() {
        try {
            const response = await fetch(`${CONFIG.API_URL}/api/public/courses`);

            if (!response.ok) {
                throw new Error('Error al obtener cursos');
            }

            const data = await response.json();

            return data.data || [];
        } catch (error) {
            console.error('Error obteniendo cursos:', error);
            return [];
        }
    },

    /**
     * Mostrar información del curso en el formulario de registro
     */
    showCourseInfo(courseInfo) {
        if (!courseInfo) return;

        const courseInfoDiv = document.getElementById('course-info-display');
        if (courseInfoDiv) {
            courseInfoDiv.innerHTML = `
                <div class="card" style="background: linear-gradient(135deg, var(--primary-color), var(--primary-light)); color: white; margin-top: 1rem;">
                    <div class="card-body">
                        <h4 style="margin: 0 0 0.5rem 0;">✓ Código válido</h4>
                        <p style="margin: 0; opacity: 0.9;">
                            <strong>${courseInfo.course_title}</strong><br/>
                            <small>Nivel: ${courseInfo.level}</small>
                        </p>
                    </div>
                </div>
            `;
            courseInfoDiv.style.display = 'block';
        }
    },

    /**
     * Ocultar información del curso
     */
    hideCourseInfo() {
        const courseInfoDiv = document.getElementById('course-info-display');
        if (courseInfoDiv) {
            courseInfoDiv.style.display = 'none';
        }
    },

    /**
     * Inicializar validación de código en tiempo real
     */
    initCodeValidation() {
        const codeInput = document.getElementById('registration-code');
        if (!codeInput) return;

        let debounceTimer;
        const debounceMs = 500;

        codeInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);

            const code = e.target.value.trim();

            if (!code) {
                this.hideCourseInfo();
                return;
            }

            debounceTimer = setTimeout(async () => {
                if (code.length >= 4) {
                    const validation = await this.validateRegistrationCode(code);

                    if (validation.valid) {
                        this.showCourseInfo(validation.course_info);
                        codeInput.classList.remove('is-invalid');
                        codeInput.classList.add('is-valid');
                    } else {
                        this.hideCourseInfo();
                        codeInput.classList.remove('is-valid');
                        codeInput.classList.add('is-invalid');
                    }
                }
            }, debounceMs);
        });
    }
};

// Inicializar cuando el DOM esté listo
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        PE.Courses.initCodeValidation();
    });
}