/**
 * Producción Escrita C2 - JavaScript Principal
 * Sistema de gestión del curso
 * Con soporte para API Backend y fallback a localStorage
 */

// ==========================================================================
// Configuración y Estado Global
// ==========================================================================

const CONFIG = {
    STORAGE_PREFIX: 'pe_c2_',
    // URL del backend API - cambiar en producción
    API_URL: localStorage.getItem('pe_c2_api_url') || '',
    // Si está vacío, usa localStorage como fallback
    USE_API: false, // Se actualiza automáticamente si la API responde
    COURSE_START: new Date('2026-02-02'),
    COURSE_END: new Date('2026-05-21'),
    SESSION_DAYS: [1, 3], // Lunes = 1, Miércoles = 3
};

// ==========================================================================
// Lazy Loading System
// ==========================================================================

const LazyLoader = {
    // Inicializar lazy loading nativo con fallback
    init() {
        // Si el navegador soporta loading="lazy", configurar todas las imágenes
        if ('loading' in HTMLImageElement.prototype) {
            // El navegador soporta lazy loading nativo
            this.setupNativeLazyLoading();
        } else {
            // Fallback con Intersection Observer
            this.setupIntersectionObserver();
        }
    },

    setupNativeLazyLoading() {
        // Añadir loading="lazy" a todas las imágenes sin el atributo
        const images = document.querySelectorAll('img:not([loading])');
        images.forEach(img => {
            img.loading = 'lazy';
        });
    },

    setupIntersectionObserver() {
        if (!('IntersectionObserver' in window)) return;

        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const src = img.dataset.src;

                    if (src) {
                        img.src = src;
                        img.onload = () => img.classList.add('loaded');
                        observer.unobserve(img);
                    }
                }
            });
        }, {
            rootMargin: '50px 0px',
            threshold: 0.01
        });

        // Observar imágenes con data-src
        const lazyImages = document.querySelectorAll('img[data-src]');
        lazyImages.forEach(img => imageObserver.observe(img));
    },

    // Método para añadir dinámicamente una imagen con lazy loading
    loadImage(src, alt = '', className = '') {
        const img = document.createElement('img');
        img.alt = alt;
        if (className) img.className = className;

        if ('loading' in HTMLImageElement.prototype) {
            img.loading = 'lazy';
            img.src = src;
        } else {
            img.dataset.src = src;
            this.setupIntersectionObserver();
        }

        return img;
    }
};

// ==========================================================================
// Skeleton Screen System
// ==========================================================================

const Skeleton = {
    // Crear un skeleton de texto
    text(lines = 3) {
        let html = '';
        for (let i = 0; i < lines; i++) {
            html += '<div class="skeleton skeleton-text"></div>';
        }
        return html;
    },

    // Crear un skeleton de título
    title() {
        return '<div class="skeleton skeleton-title"></div>';
    },

    // Crear un skeleton de card completo
    card() {
        return `
            <div class="skeleton-card">
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text"></div>
            </div>
        `;
    },

    // Crear un skeleton de botón
    button() {
        return '<div class="skeleton skeleton-button"></div>';
    },

    // Crear un skeleton de imagen
    image() {
        return '<div class="skeleton skeleton-image"></div>';
    },

    // Crear un skeleton de avatar
    avatar() {
        return '<div class="skeleton skeleton-avatar"></div>';
    },

    // Crear un skeleton de stat
    stat() {
        return `
            <div class="skeleton skeleton-stat">
                <div class="skeleton skeleton-stat-value"></div>
                <div class="skeleton skeleton-stat-label"></div>
            </div>
        `;
    },

    // Envolver contenido con skeleton mientras carga
    wrap(content, skeletonContent) {
        return `
            <div class="loading-container">
                ${skeletonContent}
                <div class="content" style="display: none;">
                    ${content}
                </div>
            </div>
        `;
    },

    // Mostrar contenido y ocultar skeleton
    reveal(container) {
        const loadingContainer = container.closest('.loading-container');
        if (loadingContainer) {
            loadingContainer.classList.add('loaded');
            const content = loadingContainer.querySelector('.content');
            if (content) {
                content.style.display = '';
            }
        }
    }
};

// Estado global de la aplicación
const AppState = {
    user: null,
    isAdmin: false,
    token: null,
    currentSession: null,
    submissions: [],
    notifications: [],
};

// ==========================================================================
// Cliente API
// ==========================================================================

const API = {
    // Verificar si la API está disponible
    async checkAvailability() {
        if (!CONFIG.API_URL) return false;
        try {
            const response = await fetch(`${CONFIG.API_URL}/api/health`, {
                method: 'GET',
                timeout: 3000
            });
            CONFIG.USE_API = response.ok;
            return response.ok;
        } catch {
            CONFIG.USE_API = false;
            return false;
        }
    },

    // Hacer petición a la API
    async request(endpoint, options = {}) {
        const url = `${CONFIG.API_URL}/api${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Añadir token de autenticación si existe
        if (AppState.token) {
            headers['Authorization'] = `Bearer ${AppState.token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error en la petición');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // Métodos de conveniencia
    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },

    post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    },

    put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    },

    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
};

// ==========================================================================
// Utilidades
// ==========================================================================

const Utils = {
    // Almacenamiento local
    storage: {
        get(key) {
            try {
                const item = localStorage.getItem(CONFIG.STORAGE_PREFIX + key);
                return item ? JSON.parse(item) : null;
            } catch {
                return null;
            }
        },
        set(key, value) {
            localStorage.setItem(CONFIG.STORAGE_PREFIX + key, JSON.stringify(value));
        },
        remove(key) {
            localStorage.removeItem(CONFIG.STORAGE_PREFIX + key);
        }
    },

    // Generar ID único
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // Formatear fecha
    formatDate(date, format = 'short') {
        const d = new Date(date);
        const options = format === 'long'
            ? { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
            : { day: '2-digit', month: '2-digit', year: 'numeric' };
        return d.toLocaleDateString('es-ES', options);
    },

    // Formatear hora
    formatTime(date) {
        return new Date(date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    },

    // Escapar HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Debounce
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Validar email
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    // Contar palabras
    countWords(text) {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    },

    // Contar caracteres
    countChars(text) {
        return text.length;
    }
};

// ==========================================================================
// Sistema de Autenticación (con soporte API y localStorage)
// ==========================================================================

const Auth = {
    // Inicializar usuarios de demostración (solo localStorage)
    init() {
        // Cargar token guardado
        const savedToken = Utils.storage.get('token');
        if (savedToken) {
            AppState.token = savedToken;
        }

        // Inicializar usuarios demo en localStorage si no hay API
        if (!CONFIG.USE_API && !Utils.storage.get('users')) {
            Utils.storage.set('users', [
                {
                    id: 'admin1',
                    email: 'benitezl@go.ugr.es',
                    password: 'admin123',
                    name: 'Javier Benítez Láinez',
                    role: 'admin',
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'user1',
                    email: 'estudiante@ejemplo.com',
                    password: 'estudiante123',
                    name: 'Estudiante Demo',
                    role: 'student',
                    level: 'C2',
                    createdAt: new Date().toISOString()
                }
            ]);
        }
    },

    // Registrar usuario
    async register(userData) {
        if (CONFIG.USE_API) {
            try {
                const response = await API.post('/auth/register', userData);
                return response.data;
            } catch (error) {
                throw error;
            }
        }

        // Fallback localStorage
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const users = Utils.storage.get('users') || [];

                if (users.find(u => u.email === userData.email)) {
                    reject(new Error('Este email ya está registrado'));
                    return;
                }

                const newUser = {
                    id: Utils.generateId(),
                    email: userData.email,
                    password: userData.password,
                    name: userData.name,
                    role: 'student',
                    level: userData.level || 'C2',
                    createdAt: new Date().toISOString()
                };

                users.push(newUser);
                Utils.storage.set('users', users);

                const { password, ...safeUser } = newUser;
                resolve(safeUser);
            }, 300);
        });
    },

    // Iniciar sesión
    async login(email, password) {
        if (CONFIG.USE_API) {
            try {
                const response = await API.post('/auth/login', { email, password });

                // Guardar token
                AppState.token = response.token;
                Utils.storage.set('token', response.token);

                // Guardar usuario
                const user = response.data;
                Utils.storage.set('currentUser', user);
                AppState.user = user;
                AppState.isAdmin = user.role === 'admin';

                return user;
            } catch (error) {
                throw error;
            }
        }

        // Fallback localStorage
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const users = Utils.storage.get('users') || [];
                const user = users.find(u => u.email === email && u.password === password);

                if (!user) {
                    reject(new Error('Email o contraseña incorrectos'));
                    return;
                }

                const { password: _, ...safeUser } = user;
                Utils.storage.set('currentUser', safeUser);
                AppState.user = safeUser;
                AppState.isAdmin = user.role === 'admin';

                resolve(safeUser);
            }, 300);
        });
    },

    // Cerrar sesión
    logout() {
        Utils.storage.remove('currentUser');
        Utils.storage.remove('token');
        AppState.user = null;
        AppState.token = null;
        AppState.isAdmin = false;
        const basePath = window.location.pathname.includes('/PE/') ? '/PE' : '';
        window.location.href = basePath + '/index.html';
    },

    // Verificar sesión actual
    async checkSession() {
        const user = Utils.storage.get('currentUser');
        const token = Utils.storage.get('token');

        if (user) {
            AppState.user = user;
            AppState.token = token;
            AppState.isAdmin = user.role === 'admin';

            // Si hay API y token, verificar que el token sigue siendo válido
            if (CONFIG.USE_API && token) {
                try {
                    const response = await API.get('/auth/me');
                    AppState.user = response.data;
                    Utils.storage.set('currentUser', response.data);
                } catch {
                    // Token inválido, limpiar sesión
                    this.logout();
                    return null;
                }
            }
        }
        return user;
    },

    // Obtener usuario actual
    getCurrentUser() {
        return AppState.user;
    },

    // Verificar si es admin
    isAdmin() {
        return AppState.isAdmin;
    },

    // Actualizar perfil
    async updateProfile(data) {
        if (CONFIG.USE_API) {
            const response = await API.put('/auth/profile', data);
            AppState.user = response.data;
            Utils.storage.set('currentUser', response.data);
            return response.data;
        }

        // Fallback localStorage
        const users = Utils.storage.get('users') || [];
        const index = users.findIndex(u => u.id === AppState.user.id);
        if (index !== -1) {
            users[index] = { ...users[index], ...data };
            Utils.storage.set('users', users);
            const { password, ...safeUser } = users[index];
            AppState.user = safeUser;
            Utils.storage.set('currentUser', safeUser);
            return safeUser;
        }
        throw new Error('Usuario no encontrado');
    },

    // Cambiar contraseña
    async changePassword(currentPassword, newPassword) {
        if (CONFIG.USE_API) {
            return API.put('/auth/password', { currentPassword, newPassword });
        }

        // Fallback localStorage
        const users = Utils.storage.get('users') || [];
        const user = users.find(u => u.id === AppState.user.id);
        if (!user || user.password !== currentPassword) {
            throw new Error('Contraseña actual incorrecta');
        }
        user.password = newPassword;
        Utils.storage.set('users', users);
        return { success: true };
    }
};

// ==========================================================================
// Sistema de Entregas (con soporte API y localStorage)
// ==========================================================================

const Submissions = {
    // Obtener todas las entregas
    async getAll() {
        if (CONFIG.USE_API) {
            try {
                const response = await API.get('/submissions');
                return response.data || [];
            } catch {
                return [];
            }
        }
        return Utils.storage.get('submissions') || [];
    },

    // Obtener entregas por usuario
    async getByUser(userId) {
        if (CONFIG.USE_API) {
            try {
                const response = await API.get(`/submissions?userId=${userId}`);
                return response.data || [];
            } catch {
                return [];
            }
        }
        const all = Utils.storage.get('submissions') || [];
        return all.filter(s => s.userId === userId);
    },

    // Obtener entregas por sesión
    async getBySession(sessionId) {
        if (CONFIG.USE_API) {
            try {
                const response = await API.get(`/submissions?sessionId=${sessionId}`);
                return response.data || [];
            } catch {
                return [];
            }
        }
        const all = Utils.storage.get('submissions') || [];
        return all.filter(s => s.sessionId === sessionId);
    },

    // Crear nueva entrega
    async create(submissionData) {
        if (CONFIG.USE_API) {
            const response = await API.post('/submissions', {
                sessionId: submissionData.sessionId,
                activityId: submissionData.activityId,
                activityTitle: submissionData.activityTitle,
                content: submissionData.content
            });
            return response.data;
        }

        // Fallback localStorage
        return new Promise((resolve) => {
            setTimeout(() => {
                const submissions = Utils.storage.get('submissions') || [];

                const newSubmission = {
                    id: Utils.generateId(),
                    userId: AppState.user?.id,
                    userName: AppState.user?.name,
                    sessionId: submissionData.sessionId,
                    activityId: submissionData.activityId,
                    activityTitle: submissionData.activityTitle,
                    content: submissionData.content,
                    wordCount: Utils.countWords(submissionData.content),
                    status: 'pending',
                    feedback: null,
                    grade: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                submissions.push(newSubmission);
                Utils.storage.set('submissions', submissions);

                resolve(newSubmission);
            }, 300);
        });
    },

    // Actualizar entrega
    async update(submissionId, updates) {
        if (CONFIG.USE_API) {
            const response = await API.put(`/submissions/${submissionId}`, updates);
            return response.data;
        }

        // Fallback localStorage
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const submissions = Utils.storage.get('submissions') || [];
                const index = submissions.findIndex(s => s.id === submissionId);

                if (index === -1) {
                    reject(new Error('Entrega no encontrada'));
                    return;
                }

                submissions[index] = {
                    ...submissions[index],
                    ...updates,
                    updatedAt: new Date().toISOString()
                };

                Utils.storage.set('submissions', submissions);
                resolve(submissions[index]);
            }, 300);
        });
    },

    // Añadir retroalimentación (profesor)
    async addFeedback(submissionId, feedback, grade) {
        if (CONFIG.USE_API) {
            const response = await API.post(`/submissions/${submissionId}/feedback`, {
                feedback,
                grade
            });
            return response.data;
        }

        return this.update(submissionId, {
            feedback,
            grade,
            status: 'reviewed',
            reviewedAt: new Date().toISOString()
        });
    },

    // Eliminar entrega
    async delete(submissionId) {
        if (CONFIG.USE_API) {
            return API.delete(`/submissions/${submissionId}`);
        }

        const submissions = Utils.storage.get('submissions') || [];
        const filtered = submissions.filter(s => s.id !== submissionId);
        Utils.storage.set('submissions', filtered);
        return { success: true };
    }
};

// ==========================================================================
// Datos del Curso
// ==========================================================================

const CourseData = {
    // Información de las sesiones
    sessions: [
        { id: 1, date: '2026-02-02', day: 'Lunes', title: 'Introducción al curso y diagnóstico', theme: 1, content: [1] },
        { id: 2, date: '2026-02-04', day: 'Miércoles', title: 'El proceso de escribir: planificación', theme: 1, content: [1] },
        { id: 3, date: '2026-02-09', day: 'Lunes', title: 'Escribir un perfil personal', theme: 1, content: [1, 2] },
        { id: 4, date: '2026-02-11', day: 'Miércoles', title: 'Escribir un perfil profesional', theme: 1, content: [2] },
        { id: 5, date: '2026-02-16', day: 'Lunes', title: 'Cartas formales: estructura y fórmulas', theme: 2, content: [2, 3] },
        { id: 6, date: '2026-02-18', day: 'Miércoles', title: 'Cartas de solicitud y reclamación', theme: 2, content: [3] },
        { id: 7, date: '2026-02-23', day: 'Lunes', title: 'Textos creativos: descripción de sensaciones', theme: 3, content: [4] },
        { id: 8, date: '2026-02-25', day: 'Miércoles', title: 'Valoraciones artísticas', theme: 3, content: [4, 5] },
        { id: 9, date: '2026-03-02', day: 'Lunes', title: 'TALLER: Mini serie web (I)', theme: 'taller', workshop: 1 },
        { id: 10, date: '2026-03-04', day: 'Miércoles', title: 'Textos de opinión: argumentación', theme: 4, content: [5, 6] },
        { id: 11, date: '2026-03-09', day: 'Lunes', title: 'Conectores y marcadores discursivos', theme: 4, content: [6] },
        { id: 12, date: '2026-03-11', day: 'Miércoles', title: 'Coherencia y cohesión textual', theme: 4, content: [6] },
        { id: 13, date: '2026-03-16', day: 'Lunes', title: 'Textos expositivos: ser wikipedista', theme: 5, content: [7, 8] },
        { id: 14, date: '2026-03-18', day: 'Miércoles', title: 'Precisión léxica: nominalización', theme: 5, content: [7] },
        { id: 15, date: '2026-03-23', day: 'Lunes', title: 'TALLER: Olvidos de Granada (I)', theme: 'taller', workshop: 2 },
        { id: 16, date: '2026-03-25', day: 'Miércoles', title: 'Preparar una entrevista', theme: 6, content: [7, 8] },
        { id: 17, date: '2026-03-30', day: 'Lunes', title: 'Vocabulario especializado', theme: 6, content: [8] },
        { id: 18, date: '2026-04-01', day: 'Miércoles', title: 'Pros y contras en textos académicos', theme: 7, content: [6, 11] },
        { id: 19, date: '2026-04-06', day: 'Lunes', title: 'Lenguaje académico (I)', theme: 7, content: [11] },
        { id: 20, date: '2026-04-08', day: 'Miércoles', title: 'TALLER: Safari fotográfico (I)', theme: 'taller', workshop: 3 },
        { id: 21, date: '2026-04-13', day: 'Lunes', title: 'Presentaciones especializadas', theme: 8, content: [8, 11] },
        { id: 22, date: '2026-04-15', day: 'Miércoles', title: 'Colocaciones e idiomatismos', theme: 8, content: [9] },
        { id: 23, date: '2026-04-20', day: 'Lunes', title: 'Participación en foros', theme: 9, content: [9, 10] },
        { id: 24, date: '2026-04-22', day: 'Miércoles', title: 'Variedades léxicas y registros', theme: 9, content: [10] },
        { id: 25, date: '2026-04-27', day: 'Lunes', title: 'TALLER: Granada 2031 (I)', theme: 'taller', workshop: 4 },
        { id: 26, date: '2026-04-29', day: 'Miércoles', title: 'Crítica cinematográfica', theme: 10, content: [3, 4] },
        { id: 27, date: '2026-05-04', day: 'Lunes', title: 'Textos periodísticos', theme: 11, content: [2, 8] },
        { id: 28, date: '2026-05-06', day: 'Miércoles', title: 'Lenguaje académico (II)', theme: 11, content: [11, 12] },
        { id: 29, date: '2026-05-11', day: 'Lunes', title: 'Resúmenes y síntesis', theme: 12, content: [12, 13] },
        { id: 30, date: '2026-05-13', day: 'Miércoles', title: 'Recursos para escribir y citación', theme: 12, content: [13, 15] },
        { id: 31, date: '2026-05-18', day: 'Lunes', title: 'Cuestiones ortográficas y formato', theme: 13, content: [14] },
        { id: 32, date: '2026-05-20', day: 'Miércoles', title: 'Repaso general y preparación examen', theme: 14, content: [14] },
    ],

    // Contenidos del curso
    contents: [
        { id: 1, title: 'Estrategias: el proceso de escribir' },
        { id: 2, title: 'Géneros textuales: características discursivas' },
        { id: 3, title: 'Fórmulas de tratamiento y peticiones con distintos grados de formalidad' },
        { id: 4, title: 'Recursos para intensificar: expresiones enfáticas, comparaciones, exageraciones' },
        { id: 5, title: 'Recursos para atenuar: modalizadores del discurso' },
        { id: 6, title: 'Conectores y marcadores discursivos. Coherencia y cohesión' },
        { id: 7, title: 'Precisión léxica: nominalización, hipónimos de verbos frecuentes' },
        { id: 8, title: 'Precisión léxica: vocabulario especializado' },
        { id: 9, title: 'Precisión léxica: colocaciones, combinaciones frecuentes e idiomatismos' },
        { id: 10, title: 'Variedades léxicas y registros' },
        { id: 11, title: 'Lenguaje y textos académicos (I)' },
        { id: 12, title: 'Lenguaje y textos académicos (II)' },
        { id: 13, title: 'Recursos para escribir: diccionarios, páginas en la red, corpus textuales' },
        { id: 14, title: 'Cuestiones ortográficas, acentuación y formato' },
        { id: 15, title: 'Formas de citación en textos académicos' },
    ],

    // Temas del curso
    themes: [
        { id: 1, title: 'Escribir un perfil', file: 'tema-01-perfil.html' },
        { id: 2, title: 'Cartas en el entorno laboral', file: 'tema-02-cartas.html' },
        { id: 3, title: 'Textos creativos', file: 'tema-03-creativos.html' },
        { id: 4, title: 'Textos de opinión', file: 'tema-04-opinion.html' },
        { id: 5, title: 'Textos expositivos', file: 'tema-05-expositivos.html' },
        { id: 6, title: 'Preparar una entrevista', file: 'tema-06-entrevista.html' },
        { id: 7, title: 'Pros y contras académicos', file: 'tema-07-proscontras.html' },
        { id: 8, title: 'Presentaciones especializadas', file: 'tema-08-presentacion.html' },
        { id: 9, title: 'Participación en foros', file: 'tema-09-foros.html' },
        { id: 10, title: 'Crítica cinematográfica', file: 'tema-10-critica.html' },
        { id: 11, title: 'Textos periodísticos', file: 'tema-11-periodisticos.html' },
        { id: 12, title: 'Resúmenes', file: 'tema-12-resumenes.html' },
        { id: 13, title: 'Artículos de opinión', file: 'tema-13-articulos.html' },
        { id: 14, title: 'La descripción', file: 'tema-14-descripcion.html' },
    ],

    // Talleres
    workshops: [
        { id: 1, title: 'La mini serie web', file: 'taller-01-miniserie.html' },
        { id: 2, title: 'Olvidos de Granada', file: 'taller-02-olvidos.html' },
        { id: 3, title: 'Safari fotográfico', file: 'taller-03-safari.html' },
        { id: 4, title: 'Granada 2031, Capital Cultural', file: 'taller-04-granada2031.html' },
    ],

    // Obtener sesión actual
    getCurrentSession() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < this.sessions.length; i++) {
            const sessionDate = new Date(this.sessions[i].date);
            sessionDate.setHours(0, 0, 0, 0);

            if (sessionDate >= today) {
                return this.sessions[i];
            }
        }
        return this.sessions[this.sessions.length - 1];
    },

    // Obtener progreso del curso
    getCourseProgress() {
        const today = new Date();
        let completed = 0;

        this.sessions.forEach(session => {
            if (new Date(session.date) < today) {
                completed++;
            }
        });

        return {
            completed,
            total: this.sessions.length,
            percentage: Math.round((completed / this.sessions.length) * 100)
        };
    }
};

// ==========================================================================
// Componentes UI
// ==========================================================================

const UI = {
    // Mostrar notificación
    notify(message, type = 'info', duration = 3000) {
        const container = document.getElementById('notifications') || this.createNotificationContainer();

        const notification = document.createElement('div');
        notification.className = `alert alert-${type} animate-slide-up`;
        notification.style.marginBottom = 'var(--spacing-sm)';
        notification.innerHTML = `
            <div class="alert-content">${message}</div>
        `;

        container.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    },

    createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'notifications';
        container.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            z-index: 3000;
            max-width: 400px;
        `;
        document.body.appendChild(container);
        return container;
    },

    // Mostrar modal
    showModal(title, content, actions = []) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                <div class="modal-body">${content}</div>
                <div class="modal-footer" id="modal-actions"></div>
            </div>
        `;

        const actionsContainer = overlay.querySelector('#modal-actions');
        actions.forEach(action => {
            const btn = document.createElement('button');
            btn.className = `btn ${action.class || 'btn-outline'}`;
            btn.textContent = action.text;
            btn.onclick = () => {
                if (action.callback) action.callback();
                if (action.close !== false) overlay.remove();
            };
            actionsContainer.appendChild(btn);
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        document.body.appendChild(overlay);
        return overlay;
    },

    // Confirmar acción
    confirm(message, onConfirm, onCancel) {
        return this.showModal('Confirmar', `<p>${message}</p>`, [
            { text: 'Cancelar', callback: onCancel },
            { text: 'Confirmar', class: 'btn-primary', callback: onConfirm }
        ]);
    },

    // Mostrar loader
    showLoader(element) {
        element.innerHTML = '<div class="loader" style="margin: 2rem auto;"></div>';
    },

    // Actualizar header según estado de autenticación
    updateAuthUI() {
        const authContainer = document.querySelector('.nav-auth');
        if (!authContainer) return;

        const user = Auth.getCurrentUser();
        const basePath = window.location.pathname.includes('/PE/') ? '/PE' : '';

        if (user) {
            authContainer.innerHTML = `
                <span style="color: rgba(255,255,255,0.8); margin-right: 1rem;">
                    Hola, ${Utils.escapeHtml(user.name)}
                </span>
                <a href="${user.role === 'admin' ? basePath + '/admin/index.html' : basePath + '/usuario/dashboard.html'}" class="btn btn-outline-white btn-sm">
                    ${user.role === 'admin' ? 'Panel admin' : 'Mi área'}
                </a>
                <button onclick="Auth.logout()" class="btn btn-accent btn-sm">Salir</button>
            `;
        }
    }
};

// ==========================================================================
// Editor de texto enriquecido
// ==========================================================================

const TextEditor = {
    init(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="text-editor">
                <div class="editor-toolbar">
                    <button class="editor-btn" data-command="bold" title="Negrita">
                        <strong>B</strong>
                    </button>
                    <button class="editor-btn" data-command="italic" title="Cursiva">
                        <em>I</em>
                    </button>
                    <button class="editor-btn" data-command="underline" title="Subrayado">
                        <u>U</u>
                    </button>
                    <div class="editor-separator"></div>
                    <button class="editor-btn" data-command="insertUnorderedList" title="Lista">
                        &bull;
                    </button>
                    <button class="editor-btn" data-command="insertOrderedList" title="Lista numerada">
                        1.
                    </button>
                    <div class="editor-separator"></div>
                    <button class="editor-btn" data-command="justifyLeft" title="Alinear izquierda">
                        &#8676;
                    </button>
                    <button class="editor-btn" data-command="justifyCenter" title="Centrar">
                        &#8596;
                    </button>
                    <button class="editor-btn" data-command="justifyRight" title="Alinear derecha">
                        &#8677;
                    </button>
                </div>
                <div class="editor-content" contenteditable="true" id="${containerId}-content"></div>
                <div class="editor-footer">
                    <span id="${containerId}-wordcount">0 palabras</span>
                    <span id="${containerId}-charcount">0 caracteres</span>
                </div>
            </div>
        `;

        const content = document.getElementById(`${containerId}-content`);
        const wordcount = document.getElementById(`${containerId}-wordcount`);
        const charcount = document.getElementById(`${containerId}-charcount`);

        // Comandos del toolbar
        container.querySelectorAll('.editor-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.execCommand(btn.dataset.command, false, null);
                content.focus();
            });
        });

        // Contador de palabras
        const updateCount = Utils.debounce(() => {
            const text = content.innerText;
            wordcount.textContent = `${Utils.countWords(text)} palabras`;
            charcount.textContent = `${Utils.countChars(text)} caracteres`;
        }, 200);

        content.addEventListener('input', updateCount);

        return {
            getContent: () => content.innerHTML,
            getText: () => content.innerText,
            setContent: (html) => { content.innerHTML = html; updateCount(); },
            clear: () => { content.innerHTML = ''; updateCount(); }
        };
    }
};

// ==========================================================================
// Actividades interactivas
// ==========================================================================

const Activities = {
    // Quiz de opciones múltiples
    initQuiz(containerId, questions) {
        const container = document.getElementById(containerId);
        if (!container) return;

        let currentQuestion = 0;
        let score = 0;
        let answers = [];

        function renderQuestion() {
            const q = questions[currentQuestion];
            container.innerHTML = `
                <div class="quiz-question">
                    <div class="progress mb-3">
                        <div class="progress-bar" style="width: ${((currentQuestion) / questions.length) * 100}%"></div>
                    </div>
                    <p class="text-secondary mb-2">Pregunta ${currentQuestion + 1} de ${questions.length}</p>
                    <p class="quiz-question-text">${q.question}</p>
                    <div class="quiz-options">
                        ${q.options.map((opt, i) => `
                            <label class="quiz-option" data-index="${i}">
                                <input type="radio" name="quiz-answer" value="${i}">
                                <span class="quiz-option-marker"></span>
                                <span>${opt}</span>
                            </label>
                        `).join('')}
                    </div>
                    <div class="mt-3">
                        <button class="btn btn-primary" id="quiz-submit" disabled>Comprobar</button>
                    </div>
                </div>
            `;

            container.querySelectorAll('.quiz-option').forEach(opt => {
                opt.addEventListener('click', () => {
                    container.querySelectorAll('.quiz-option').forEach(o => o.classList.remove('selected'));
                    opt.classList.add('selected');
                    opt.querySelector('input').checked = true;
                    container.querySelector('#quiz-submit').disabled = false;
                });
            });

            container.querySelector('#quiz-submit').addEventListener('click', checkAnswer);
        }

        function checkAnswer() {
            const selected = container.querySelector('.quiz-option.selected');
            if (!selected) return;

            const selectedIndex = parseInt(selected.dataset.index);
            const correct = questions[currentQuestion].correct;
            answers.push(selectedIndex);

            container.querySelectorAll('.quiz-option').forEach((opt, i) => {
                opt.style.pointerEvents = 'none';
                if (i === correct) {
                    opt.classList.add('correct');
                } else if (i === selectedIndex && selectedIndex !== correct) {
                    opt.classList.add('incorrect');
                }
            });

            if (selectedIndex === correct) {
                score++;
            }

            const submitBtn = container.querySelector('#quiz-submit');
            submitBtn.textContent = currentQuestion < questions.length - 1 ? 'Siguiente' : 'Ver resultados';
            submitBtn.onclick = () => {
                currentQuestion++;
                if (currentQuestion < questions.length) {
                    renderQuestion();
                } else {
                    showResults();
                }
            };
        }

        function showResults() {
            const percentage = Math.round((score / questions.length) * 100);
            container.innerHTML = `
                <div class="text-center p-4">
                    <h3>Resultados</h3>
                    <p class="text-secondary">Has completado el ejercicio</p>
                    <div class="hero-stat" style="margin: 2rem 0;">
                        <span class="hero-stat-value">${percentage}%</span>
                        <span class="hero-stat-label">${score} de ${questions.length} correctas</span>
                    </div>
                    <div class="progress mb-3" style="height: 20px;">
                        <div class="progress-bar ${percentage >= 70 ? 'success' : percentage >= 50 ? 'warning' : 'error'}"
                             style="width: ${percentage}%"></div>
                    </div>
                    <button class="btn btn-primary" onclick="location.reload()">Repetir ejercicio</button>
                </div>
            `;
        }

        renderQuestion();
    },

    // Ejercicio de completar espacios
    initFillBlanks(containerId, text, blanks) {
        const container = document.getElementById(containerId);
        if (!container) return;

        let html = text;
        blanks.forEach((blank, i) => {
            html = html.replace(`[${i + 1}]`,
                `<input type="text" class="fill-blank-input" data-answer="${blank}" data-index="${i}" placeholder="...">`
            );
        });

        container.innerHTML = `
            <div class="fill-blank">
                <p>${html}</p>
                <div class="mt-3">
                    <button class="btn btn-primary" id="fill-check">Comprobar</button>
                    <button class="btn btn-outline" id="fill-show">Mostrar respuestas</button>
                </div>
                <div id="fill-feedback" class="mt-3"></div>
            </div>
        `;

        container.querySelector('#fill-check').addEventListener('click', () => {
            let correct = 0;
            container.querySelectorAll('.fill-blank-input').forEach(input => {
                const answer = input.dataset.answer.toLowerCase().trim();
                const value = input.value.toLowerCase().trim();

                input.classList.remove('correct', 'incorrect');
                if (value === answer) {
                    input.classList.add('correct');
                    correct++;
                } else if (value) {
                    input.classList.add('incorrect');
                }
            });

            const feedback = container.querySelector('#fill-feedback');
            feedback.innerHTML = `
                <div class="alert alert-${correct === blanks.length ? 'success' : 'info'}">
                    Has acertado ${correct} de ${blanks.length} espacios.
                </div>
            `;
        });

        container.querySelector('#fill-show').addEventListener('click', () => {
            container.querySelectorAll('.fill-blank-input').forEach(input => {
                input.value = input.dataset.answer;
                input.classList.add('correct');
            });
        });
    },

    // Ejercicio de ordenar
    initOrder(containerId, items, correctOrder) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Mezclar items
        const shuffled = [...items].sort(() => Math.random() - 0.5);

        container.innerHTML = `
            <div class="drag-drop-container" style="grid-template-columns: 1fr;">
                <div class="drag-items" id="${containerId}-items">
                    ${shuffled.map((item, i) => `
                        <div class="drag-item" draggable="true" data-id="${items.indexOf(item)}">
                            ${item}
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="mt-3">
                <button class="btn btn-primary" id="${containerId}-check">Comprobar orden</button>
            </div>
            <div id="${containerId}-feedback" class="mt-3"></div>
        `;

        const itemsContainer = container.querySelector(`#${containerId}-items`);
        let draggedItem = null;

        itemsContainer.querySelectorAll('.drag-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                draggedItem = item;
                item.classList.add('dragging');
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                draggedItem = null;
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (draggedItem && draggedItem !== item) {
                    const rect = item.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    if (e.clientY < midY) {
                        itemsContainer.insertBefore(draggedItem, item);
                    } else {
                        itemsContainer.insertBefore(draggedItem, item.nextSibling);
                    }
                }
            });
        });

        container.querySelector(`#${containerId}-check`).addEventListener('click', () => {
            const currentOrder = Array.from(itemsContainer.querySelectorAll('.drag-item'))
                .map(item => parseInt(item.dataset.id));

            const isCorrect = currentOrder.every((id, i) => id === correctOrder[i]);

            container.querySelector(`#${containerId}-feedback`).innerHTML = `
                <div class="alert alert-${isCorrect ? 'success' : 'warning'}">
                    ${isCorrect ? '¡Correcto! Has ordenado los elementos correctamente.' :
                      'El orden no es correcto. Intenta de nuevo.'}
                </div>
            `;
        });
    }
};

// ==========================================================================
// Formularios
// ==========================================================================

const Forms = {
    // Validar formulario de registro
    validateRegistration(form) {
        const errors = [];
        const data = new FormData(form);

        const name = data.get('name')?.trim();
        const email = data.get('email')?.trim();
        const password = data.get('password');
        const confirmPassword = data.get('confirmPassword');
        const level = data.get('level');

        if (!name || name.length < 2) {
            errors.push('El nombre debe tener al menos 2 caracteres');
        }

        if (!email || !Utils.isValidEmail(email)) {
            errors.push('Introduce un email válido');
        }

        if (!password || password.length < 6) {
            errors.push('La contraseña debe tener al menos 6 caracteres');
        }

        if (password !== confirmPassword) {
            errors.push('Las contraseñas no coinciden');
        }

        if (!level) {
            errors.push('Selecciona tu nivel');
        }

        return { valid: errors.length === 0, errors, data: { name, email, password, level } };
    },

    // Manejar envío de formulario de registro
    async handleRegistration(e) {
        e.preventDefault();
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const errorContainer = form.querySelector('.form-errors') || document.createElement('div');
        errorContainer.className = 'form-errors';

        if (!form.contains(errorContainer)) {
            form.insertBefore(errorContainer, form.firstChild);
        }

        const validation = this.validateRegistration(form);

        if (!validation.valid) {
            errorContainer.innerHTML = validation.errors.map(e =>
                `<div class="alert alert-error">${e}</div>`
            ).join('');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="loader" style="width: 20px; height: 20px;"></div>';

        try {
            await Auth.register(validation.data);
            await Auth.login(validation.data.email, validation.data.password);
            UI.notify('Registro exitoso. Bienvenido/a al curso.', 'success');
            setTimeout(() => {
                const basePath = window.location.pathname.includes('/PE/') ? '/PE' : '';
                window.location.href = basePath + '/usuario/dashboard.html';
            }, 1000);
        } catch (error) {
            errorContainer.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
            submitBtn.disabled = false;
            submitBtn.textContent = 'Registrarse';
        }
    },

    // Manejar envío de formulario de login
    async handleLogin(e) {
        e.preventDefault();
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const errorContainer = form.querySelector('.form-errors') || document.createElement('div');
        errorContainer.className = 'form-errors';

        if (!form.contains(errorContainer)) {
            form.insertBefore(errorContainer, form.firstChild);
        }

        const email = form.email.value.trim();
        const password = form.password.value;

        if (!email || !password) {
            errorContainer.innerHTML = '<div class="alert alert-error">Introduce email y contraseña</div>';
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="loader" style="width: 20px; height: 20px;"></div>';

        try {
            const user = await Auth.login(email, password);
            UI.notify('Sesión iniciada correctamente', 'success');
            setTimeout(() => {
                const basePath = window.location.pathname.includes('/PE/') ? '/PE' : '';
                window.location.href = user.role === 'admin' ? basePath + '/admin/index.html' : basePath + '/usuario/dashboard.html';
            }, 500);
        } catch (error) {
            errorContainer.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
            submitBtn.disabled = false;
            submitBtn.textContent = 'Acceder';
        }
    }
};

// ==========================================================================
// Inicialización
// ==========================================================================

document.addEventListener('DOMContentLoaded', async () => {
    // Verificar disponibilidad de la API
    await API.checkAvailability();

    // Inicializar autenticación
    Auth.init();
    await Auth.checkSession();
    UI.updateAuthUI();

    // Mostrar indicador de modo
    if (CONFIG.USE_API) {
        console.log('Producción Escrita C2 - Modo API (Backend conectado)');
    } else {
        console.log('Producción Escrita C2 - Modo localStorage (sin backend)');
    }

    // Inicializar animaciones de scroll
    ScrollReveal.init();

    // Inicializar lazy loading de imágenes
    LazyLoader.init();

    // Menú móvil
    const menuToggle = document.getElementById('menu-toggle');
    const navMain = document.getElementById('nav-main');

    if (menuToggle && navMain) {
        menuToggle.addEventListener('click', () => {
            const isActive = navMain.classList.toggle('active');
            // Actualizar atributo ARIA para accesibilidad
            menuToggle.setAttribute('aria-expanded', isActive);
        });
    }

    // Cerrar menú al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (navMain && !navMain.contains(e.target) && !menuToggle?.contains(e.target)) {
            navMain.classList.remove('active');
            if (menuToggle) {
                menuToggle.setAttribute('aria-expanded', 'false');
            }
        }
    });

    // Formularios de autenticación
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => Forms.handleLogin(e));
    }

    if (registerForm) {
        registerForm.addEventListener('submit', (e) => Forms.handleRegistration(e));
    }

    // Formularios de entrega de actividades
    const submissionForms = document.querySelectorAll('[data-submission-form]');
    submissionForms.forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!AppState.user) {
                UI.notify('Debes iniciar sesión para entregar actividades', 'error');
                return;
            }

            const content = form.querySelector('[name="content"]')?.value ||
                           form.querySelector('.editor-content')?.innerHTML;

            if (!content || content.trim().length < 10) {
                UI.notify('El texto es demasiado corto', 'error');
                return;
            }

            try {
                await Submissions.create({
                    sessionId: form.dataset.sessionId,
                    activityId: form.dataset.activityId,
                    activityTitle: form.dataset.activityTitle,
                    content
                });
                UI.notify('Entrega realizada correctamente', 'success');
                form.reset();
                if (form.querySelector('.editor-content')) {
                    form.querySelector('.editor-content').innerHTML = '';
                }
            } catch (error) {
                UI.notify('Error al realizar la entrega', 'error');
            }
        });
    });

    console.log('Producción Escrita C2 - Aplicación iniciada');
});

// ==========================================================================
// Scroll Reveal System
// ==========================================================================

const ScrollReveal = {
    observer: null,

    init() {
        // Verificar soporte de Intersection Observer
        if (!('IntersectionObserver' in window)) {
            // Fallback para navegadores antiguos
            this.fallbackInit();
            return;
        }

        // Crear el observer
        this.observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        // Opcional: dejar de observar después de animar
                        this.observer.unobserve(entry.target);
                    }
                });
            },
            {
                root: null, // viewport
                rootMargin: '0px 0px -50px 0px', // activar un poco antes
                threshold: 0.1 // activar cuando 10% del elemento es visible
            }
        );

        // Observar todos los elementos con clase scroll-reveal
        const revealElements = document.querySelectorAll('.scroll-reveal');
        revealElements.forEach(el => this.observer.observe(el));
    },

    // Fallback simple para navegadores sin Intersection Observer
    fallbackInit() {
        const revealElements = document.querySelectorAll('.scroll-reveal');
        const checkVisibility = () => {
            revealElements.forEach(el => {
                const rect = el.getBoundingClientRect();
                const isVisible = rect.top < window.innerHeight - 100;
                if (isVisible) {
                    el.classList.add('is-visible');
                }
            });
        };

        // Verificar al cargar y al hacer scroll
        checkVisibility();
        window.addEventListener('scroll', Utils.debounce(checkVisibility, 100));
    },

    // Método para añadir dinámicamente elementos
    observe(element) {
        if (this.observer) {
            element.classList.add('scroll-reveal');
            this.observer.observe(element);
        }
    }
};

// ==========================================================================
// Configuración de API (para uso desde consola)
// ==========================================================================

const APIConfig = {
    // Configurar URL del backend
    setUrl(url) {
        localStorage.setItem('pe_c2_api_url', url);
        CONFIG.API_URL = url;
        console.log('URL de API configurada:', url);
        console.log('Recarga la página para aplicar los cambios.');
    },

    // Ver configuración actual
    getUrl() {
        return CONFIG.API_URL || '(no configurada - usando localStorage)';
    },

    // Limpiar configuración (volver a localStorage)
    clear() {
        localStorage.removeItem('pe_c2_api_url');
        CONFIG.API_URL = '';
        CONFIG.USE_API = false;
        console.log('Configuración de API eliminada. Usando localStorage.');
    }
};

// Exportar para uso global
window.PE = {
    Auth,
    Submissions,
    CourseData,
    UI,
    TextEditor,
    Activities,
    Forms,
    Utils,
    API,
    APIConfig,
    ScrollReveal,
    LazyLoader,
    Skeleton
};
