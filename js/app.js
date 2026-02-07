/**
 * Producción Escrita C2 - JavaScript Principal
 * Sistema de gestión del curso
 * Con soporte para API Backend y fallback a localStorage
 */

// ==========================================================================
// Configuración y Estado Global
// ==========================================================================

function normalizeApiUrl(raw) {
    if (!raw || typeof raw !== 'string') return '';
    const trimmed = raw.trim();
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return '';

    try {
        if (/^https?:\/\//i.test(trimmed)) {
            const url = new URL(trimmed);
            return url.origin;
        }
    } catch {
        // ignore parse errors, fallback below
    }

    let normalized = trimmed.replace(/\/+$/, '');
    if (normalized.endsWith('/api')) {
        normalized = normalized.slice(0, -4);
    }

    if (!/^https?:\/\//i.test(normalized) && !normalized.startsWith('/')) {
        return '';
    }

    return normalized;
}

const CONFIG = (() => {
    const hostname = (typeof window !== 'undefined' && window.location) ? window.location.hostname : '';
    const protocol = (typeof window !== 'undefined' && window.location) ? window.location.protocol : '';
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || protocol === 'file:';

    const resolvedOrigin = normalizeApiUrl((typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin !== 'null')
        ? window.location.origin
        : '');
    const storedApiUrl = normalizeApiUrl(localStorage.getItem('pe_c2_api_url'));

    // URL de la API en Render (o tu backend desplegado)
    // Para cambiar la URL del backend, puedes:
    // 1. Añadir <script>window.PE_CONFIG = { API_URL: 'https://tu-api.onrender.com' }</script> antes de cargar este script
    // 2. O cambiar manualmente la URL aquí
    const productionApiUrl = (typeof window !== 'undefined' && window.PE_CONFIG && window.PE_CONFIG.API_URL)
        ? window.PE_CONFIG.API_URL
        : storedApiUrl;

    return {
        STORAGE_PREFIX: 'pe_c2_',
        // URL del backend API - usa productionApiUrl si está configurado, sino el origin actual
        API_URL: (!isLocal ? (productionApiUrl || resolvedOrigin) : (storedApiUrl || resolvedOrigin)),
        // En producción forzamos API para evitar datos inconsistentes
        ENFORCE_API: !isLocal,
        // Si está vacío, usa localStorage como fallback (solo en local)
        USE_API: false, // Se actualiza automáticamente si la API responde
        // Código de inscripción (solo para modo localStorage)
        REGISTRATION_CODE: (typeof window !== 'undefined' && window.PE_CONFIG && window.PE_CONFIG.registrationCode)
            ? window.PE_CONFIG.registrationCode
            : (localStorage.getItem('pe_c2_registration_code') || ''),
        COURSE_START: new Date('2026-02-03'),
        COURSE_END: new Date('2026-05-21'),
        SESSION_DAYS: [2, 4], // Martes = 2, Jueves = 4
    };
})();

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
    _availabilityPromise: null,
    _isAvailable: false,

    // Verificar si la API está disponible (con timeout)
    async checkAvailability() {
        if (!CONFIG.API_URL) return false;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        try {
            console.log('[API] Verificando disponibilidad del backend...');
            const response = await fetch(`${CONFIG.API_URL}/api/health`, {
                method: 'GET',
                signal: controller.signal,
                headers: { 'Cache-Control': 'no-cache' }
            });

            clearTimeout(timeoutId);

            const isAvailable = response.ok;
            CONFIG.USE_API = isAvailable;
            this._isAvailable = isAvailable;

            console.log(`[API] Backend ${isAvailable ? 'disponible' : 'no disponible'}`);
            return isAvailable;
        } catch (error) {
            clearTimeout(timeoutId);
            CONFIG.USE_API = false;
            this._isAvailable = false;
            console.warn('[API] Error al verificar disponibilidad:', error.message);
            return false;
        }
    },

    async ensureAvailability() {
        // Si ya sabemos que está disponible, retornar inmediatamente
        if (this._isAvailable && CONFIG.USE_API) return true;
        if (!CONFIG.API_URL) return false;

        // Si ya hay una verificación en curso, usarla
        if (!this._availabilityPromise) {
            this._availabilityPromise = this.checkAvailability();
        }

        try {
            const available = await this._availabilityPromise;
            return available;
        } catch (error) {
            // Reset cache on error to allow retry
            this._availabilityPromise = null;
            this._isAvailable = false;
            throw error;
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

            const text = await response.text();
            let data = {};
            if (text) {
                try {
                    data = JSON.parse(text);
                } catch {
                    data = { error: text };
                }
            }

            if (!response.ok) {
                const validationMessage = Array.isArray(data?.errors) && data.errors.length > 0
                    ? data.errors[0].msg
                    : null;
                const errorMessage = data.error || data.message || validationMessage || 'Error en la petición';

                // Mejorar el mensaje de error para incluir el código de estado
                throw new Error(`${errorMessage} (${response.status})`);
            }

            // Si la petición fue exitosa, confirmar que la API está disponible
            if (!CONFIG.USE_API) {
                CONFIG.USE_API = true;
                this._isAvailable = true;
                console.log('API confirmada disponible tras petición exitosa');
            }

            return data;
        } catch (error) {
            // Diferenciar entre errores de red y errores HTTP
            if (error.name === 'TypeError' || error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                console.error('Network error:', error);
                throw new Error('Error de conexión al servidor. Verifica tu conexión a internet.');
            }
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
        if (!CONFIG.ENFORCE_API && !CONFIG.USE_API && !Utils.storage.get('users')) {
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
        await API.ensureAvailability();
        if (CONFIG.USE_API) {
            const response = await API.post('/auth/register', userData);
            const user = response.user || response.data || response;

            if (response.token) {
                AppState.token = response.token;
                Utils.storage.set('token', response.token);
            }

            if (user) {
                Utils.storage.set('currentUser', user);
                AppState.user = user;
                AppState.isAdmin = user.role === 'admin';
            }

            return user;
        }

        if (CONFIG.ENFORCE_API) {
            throw new Error('El backend no está disponible. No se permite el registro en modo local en producción.');
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
        await API.ensureAvailability();
        if (CONFIG.USE_API) {
            const response = await API.post('/auth/login', { email, password });

            const user = response.user || response.data || response;
            if (response.token) {
                AppState.token = response.token;
                Utils.storage.set('token', response.token);
            }

            if (user) {
                Utils.storage.set('currentUser', user);
                AppState.user = user;
                AppState.isAdmin = user.role === 'admin';
            }

            return user;
        }

        if (CONFIG.ENFORCE_API) {
            throw new Error('El backend no está disponible. No se permite el inicio de sesión en modo local en producción.');
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

        if (!user) {
            return null;
        }

        AppState.user = user;
        AppState.token = token;
        AppState.isAdmin = user.role === 'admin';

        // Si hay API y token, verificar que el token sigue siendo válido
        if (token) {
            try {
                await API.ensureAvailability();
                if (CONFIG.USE_API) {
                    try {
                        const response = await API.get('/auth/me');
                        // Actualizar con datos frescos del servidor
                        AppState.user = response;
                        Utils.storage.set('currentUser', response);
                        AppState.isAdmin = response.role === 'admin';
                        return response;
                    } catch (error) {
                        // Solo hacer logout si es un error de autenticación (401/403)
                        // Errores de red o del servidor no deberían desconectar al usuario
                        if (error.message && (
                            error.message.includes('401') ||
                            error.message.includes('403') ||
                            error.message.includes('Token') ||
                            error.message.includes('No autorizado') ||
                            error.message.includes('autoriz')
                        )) {
                            console.warn('Token inválido o expirado, cerrando sesión');
                            this.logout();
                            return null;
                        }
                        // Para otros errores (red, servidor), mantener la sesión local
                        console.warn('Error verificando sesión, manteniendo sesión local:', error.message);
                        return user;
                    }
                }
            } catch (availabilityError) {
                // Si ensureAvailability falla en producción, mostrar error pero no desconectar
                if (CONFIG.ENFORCE_API) {
                    console.error('Backend no disponible:', availabilityError);
                    // No hacemos logout, permitimos continuar con datos locales
                    // pero el sistema mostrará error de conexión
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
        await API.ensureAvailability();
        if (CONFIG.USE_API) {
            await API.put('/auth/profile', data);
            const updated = await API.get('/auth/me');
            AppState.user = updated;
            Utils.storage.set('currentUser', updated);
            return updated;
        }

        if (CONFIG.ENFORCE_API) {
            throw new Error('El backend no está disponible. No se permiten cambios de perfil en modo local en producción.');
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
        await API.ensureAvailability();
        if (CONFIG.USE_API) {
            return API.put('/auth/password', { currentPassword, newPassword });
        }

        if (CONFIG.ENFORCE_API) {
            throw new Error('El backend no está disponible. No se permite cambiar contraseña en modo local en producción.');
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
    },

    // ==========================================================================
    // OAuth Authentication (Google, Apple)
    // ==========================================================================

    _oauthCallback: null,
    _oauthWindow: null,

    // Login con Google
    loginWithGoogle() {
        console.log('[Google OAuth] Iniciando login con Google');
        console.log('[Google OAuth] window.PE_CONFIG:', window.PE_CONFIG);

        if (!window.PE_CONFIG?.GOOGLE_CLIENT_ID) {
            console.error('[Google OAuth] GOOGLE_CLIENT_ID no encontrado');
            UI.notify('Configuración de Google no disponible', 'error');
            return;
        }

        console.log('[Google OAuth] Cliente ID encontrado:', window.PE_CONFIG.GOOGLE_CLIENT_ID);
        this._initiateOAuthFlow('google');
    },

    // Login con Apple
    loginWithApple() {
        console.log('[Apple OAuth] Iniciando login con Apple');

        if (!window.PE_CONFIG?.APPLE_CLIENT_ID) {
            console.error('[Apple OAuth] APPLE_CLIENT_ID no encontrado');
            UI.notify('Configuración de Apple no disponible', 'error');
            return;
        }

        this._initiateOAuthFlow('apple');
    },

    // Iniciar flujo OAuth
    _initiateOAuthFlow(provider) {
        console.log(`[OAuth] Iniciando flujo para provider: ${provider}`);

        const basePath = window.location.pathname.includes('/PE/') ? '/PE' : '';
        const redirectUri = provider === 'apple'
            ? `${window.location.origin}${basePath}/auth/oauth-callback.html`
            : `${window.location.origin}${basePath}/auth/oauth-callback`;
        const width = 500;
        const height = 600;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;

        console.log(`[OAuth] redirectUri: ${redirectUri}`);

        // Construir URL de autorización según el provider
        let authUrl;
        if (provider === 'google') {
            const scopes = 'openid email profile';
            authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
                `client_id=${encodeURIComponent(window.PE_CONFIG.GOOGLE_CLIENT_ID)}&` +
                `redirect_uri=${encodeURIComponent(redirectUri)}&` +
                `response_type=code&` +
                `scope=${encodeURIComponent(scopes)}&` +
                `access_type=offline`;
            console.log(`[OAuth] URL de autorización Google generada`);
        } else if (provider === 'apple') {
            // Apple exige response_mode=form_post cuando se solicita name/email.
            // Este flujo usa callback en popup con query params, por lo que evitamos scopes aquí.
            const scopes = '';
            const state = 'apple';
            authUrl = `https://appleid.apple.com/auth/authorize?` +
                `client_id=${encodeURIComponent(window.PE_CONFIG.APPLE_CLIENT_ID)}&` +
                `redirect_uri=${encodeURIComponent(redirectUri)}&` +
                `response_type=code&` +
                `response_mode=query&` +
                `state=${encodeURIComponent(state)}`;
            if (scopes) {
                authUrl += `&scope=${encodeURIComponent(scopes)}`;
            }
            console.log('[OAuth] URL de autorización Apple generada');
        } else {
            console.error(`[OAuth] Provider ${provider} no soportado`);
            UI.notify(`Provider ${provider} no soportado`, 'error');
            return;
        }

        console.log(`[OAuth] Abriendo popup...`);

        // Abrir popup
        this._oauthWindow = window.open(
            authUrl,
            `oauth-${provider}`,
            `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
        );

        if (!this._oauthWindow) {
            console.error('[OAuth] No se pudo abrir el popup (probablemente bloqueado)');
            UI.notify('No se pudo abrir la ventana de autenticación. Verifica los bloqueadores de popup y permite ventanas emergentes para este sitio.', 'error');
            return;
        }

        console.log('[OAuth] Popup abierto correctamente');

        // Esperar mensaje del popup
        this._waitForOAuthCallback(provider);
    },

    // Esperar callback del popup OAuth
    _waitForOAuthCallback(provider) {
        const messageHandler = (event) => {
            // Verificar origen (en producción, restringir a tu dominio)
            if (event.data && event.data.type === 'oauth-callback' && event.data.provider === provider) {
                window.removeEventListener('message', messageHandler);
                if (event.data.error) {
                    UI.notify(event.data.error, 'error');
                    return;
                }
                this._handleOAuthCallback(provider, event.data.code);
            }
        };

        window.addEventListener('message', messageHandler);

        // Timeout de 5 minutos
        setTimeout(() => {
            if (this._oauthWindow && !this._oauthWindow.closed) {
                this._oauthWindow.close();
                window.removeEventListener('message', messageHandler);
                UI.notify('Tiempo de espera agotado. Inténtalo de nuevo.', 'warning');
            }
        }, 5 * 60 * 1000);
    },

    // Manejar callback de OAuth
    async _handleOAuthCallback(provider, code) {
        if (!code) {
            UI.notify('No se recibió código de autorización', 'error');
            return;
        }

        UI.notify('Procesando autenticación...', 'info');

        try {
            await API.ensureAvailability();

            if (!CONFIG.USE_API) {
                throw new Error('OAuth requiere conexión al backend');
            }

            // Enviar código al backend para intercambiarlo por token
            const response = await API.post(`/auth/oauth/${provider}`, {
                code
            });

            if (response.needsRegistration || response.needsRegistrationCode) {
                // Usuario necesita completar registro con código
                this._showRegistrationModal(provider, response.email, response.name, response.pendingToken);
                return;
            }

            // Login exitoso
            if (response.user && response.token) {
                AppState.user = response.user;
                AppState.token = response.token;
                AppState.isAdmin = response.user.role === 'admin';
                Utils.storage.set('currentUser', response.user);
                Utils.storage.set('token', response.token);

                UI.notify(`Bienvenido/a, ${response.user.name}!`, 'success');

                // Redirigir al dashboard correspondiente
                setTimeout(() => {
                    const basePath = window.location.pathname.includes('/PE/') ? '/PE' : '';
                    window.location.href = response.user.role === 'admin'
                        ? basePath + '/admin/index.html'
                        : basePath + '/usuario/dashboard.html';
                }, 500);
            }
        } catch (error) {
            console.error('Error en OAuth callback:', error);
            UI.notify(error.message || 'Error al procesar la autenticación', 'error');
        }
    },

    // Mostrar modal de registro para usuarios OAuth
    _showRegistrationModal(provider, email, name, pendingToken) {
        const modal = document.getElementById('registration-modal');
        if (modal) {
            modal.classList.remove('hidden');
            // Guardar datos OAuth temporalmente
            this._pendingOAuth = { provider, email, name, pendingToken };
        }
    },

    // Completar registro OAuth con código de registro
    async completeOAuthRegistration(registrationCode) {
        if (!this._pendingOAuth) {
            throw new Error('No hay registro OAuth pendiente');
        }

        try {
            await API.ensureAvailability();

            if (!CONFIG.USE_API) {
                throw new Error('OAuth requiere conexión al backend');
            }

            const response = await API.post(`/auth/oauth/${this._pendingOAuth.provider}`, {
                pendingToken: this._pendingOAuth.pendingToken,
                registrationCode
            });

            if (response.user && response.token) {
                AppState.user = response.user;
                AppState.token = response.token;
                AppState.isAdmin = response.user.role === 'admin';
                Utils.storage.set('currentUser', response.user);
                Utils.storage.set('token', response.token);

                this._pendingOAuth = null;
                this.closeRegistrationModal();

                UI.notify(`Registro completado. Bienvenido/a, ${response.user.name}!`, 'success');

                setTimeout(() => {
                    const basePath = window.location.pathname.includes('/PE/') ? '/PE' : '';
                    window.location.href = response.user.role === 'admin'
                        ? basePath + '/admin/index.html'
                        : basePath + '/usuario/dashboard.html';
                }, 500);
            }
        } catch (error) {
            console.error('Error completando registro OAuth:', error);
            throw error;
        }
    },

    // Cerrar modal de registro
    closeRegistrationModal() {
        const modal = document.getElementById('registration-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
        this._pendingOAuth = null;
    }
};

// ==========================================================================
// Sistema de Entregas (con soporte API y localStorage)
// ==========================================================================

const Submissions = {
    normalize(submission) {
        if (!submission || typeof submission !== 'object') return submission;

        return {
            ...submission,
            userId: submission.user_id ?? submission.userId,
            userName: submission.user_name ?? submission.userName,
            userEmail: submission.user_email ?? submission.userEmail,
            sessionId: submission.session_id ?? submission.sessionId,
            activityId: submission.activity_id ?? submission.activityId,
            activityTitle: submission.activity_title ?? submission.activityTitle,
            wordCount: submission.word_count ?? submission.wordCount,
            grade: submission.grade,
            numericGrade: submission.numeric_grade ?? submission.numericGrade,
            feedback: submission.feedback_text ?? submission.feedback,
            feedbackDate: submission.feedback_date ?? submission.feedbackDate,
            reviewerName: submission.reviewer_name ?? submission.reviewerName,
            createdAt: submission.created_at ?? submission.createdAt,
            updatedAt: submission.updated_at ?? submission.updatedAt,
            reviewedAt: submission.reviewed_at ?? submission.reviewedAt
        };
    },
    // Obtener todas las entregas
    async getAll() {
        await API.ensureAvailability();
        if (CONFIG.USE_API) {
            try {
                const response = await API.get('/submissions');
                const submissions = response.submissions || response.data || response || [];
                return Array.isArray(submissions) ? submissions.map(this.normalize) : [];
            } catch {
                return [];
            }
        }
        if (CONFIG.ENFORCE_API) {
            throw new Error('Backend no disponible. No se permite usar entregas en modo local en producción.');
        }
        return Utils.storage.get('submissions') || [];
    },

    // Obtener entregas por usuario
    async getByUser(userId) {
        await API.ensureAvailability();
        if (CONFIG.USE_API) {
            try {
                const response = await API.get(`/submissions?user_id=${userId}`);
                const submissions = response.submissions || response.data || response || [];
                return Array.isArray(submissions) ? submissions.map(this.normalize) : [];
            } catch {
                return [];
            }
        }
        if (CONFIG.ENFORCE_API) {
            throw new Error('Backend no disponible. No se permiten consultas locales en producción.');
        }
        const all = Utils.storage.get('submissions') || [];
        return all.filter(s => s.userId === userId);
    },

    // Obtener entregas por sesión
    async getBySession(sessionId) {
        await API.ensureAvailability();
        if (CONFIG.USE_API) {
            try {
                const response = await API.get(`/submissions?session_id=${sessionId}`);
                const submissions = response.submissions || response.data || response || [];
                return Array.isArray(submissions) ? submissions.map(this.normalize) : [];
            } catch {
                return [];
            }
        }
        if (CONFIG.ENFORCE_API) {
            throw new Error('Backend no disponible. No se permiten consultas locales en producción.');
        }
        const all = Utils.storage.get('submissions') || [];
        return all.filter(s => s.sessionId === sessionId);
    },

    // Crear nueva entrega
    async create(submissionData) {
        await API.ensureAvailability();
        if (CONFIG.USE_API) {
            const response = await API.post('/submissions', {
                session_id: submissionData.sessionId,
                activity_id: submissionData.activityId,
                activity_title: submissionData.activityTitle,
                content: submissionData.content
            });
            const created = response.submission || response.data || response;
            return this.normalize(created);
        }

        if (CONFIG.ENFORCE_API) {
            throw new Error('Backend no disponible. No se permiten entregas en modo local en producción.');
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
        await API.ensureAvailability();
        if (CONFIG.USE_API) {
            const response = await API.put(`/submissions/${submissionId}`, {
                content: updates.content
            });
            return response.data || response;
        }

        if (CONFIG.ENFORCE_API) {
            throw new Error('Backend no disponible. No se permite editar entregas en modo local en producción.');
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
        await API.ensureAvailability();
        if (CONFIG.USE_API) {
            const response = await API.post(`/submissions/${submissionId}/feedback`, {
                feedback_text: feedback,
                grade
            });
            return response.data || response;
        }

        if (CONFIG.ENFORCE_API) {
            throw new Error('Backend no disponible. No se permite corregir en modo local en producción.');
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
        await API.ensureAvailability();
        if (CONFIG.USE_API) {
            return API.delete(`/submissions/${submissionId}`);
        }

        if (CONFIG.ENFORCE_API) {
            throw new Error('Backend no disponible. No se permite borrar entregas en modo local en producción.');
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
        { id: 1, date: '2026-02-03', day: 'Martes', title: 'Introducción al curso y diagnóstico', theme: 1, content: [1] },
        { id: 2, date: '2026-02-05', day: 'Jueves', title: 'El proceso de escribir: planificación', theme: 1, content: [1] },
        { id: 3, date: '2026-02-10', day: 'Martes', title: 'Escribir un perfil personal', theme: 1, content: [1, 2] },
        { id: 4, date: '2026-02-12', day: 'Jueves', title: 'Escribir un perfil profesional', theme: 1, content: [2] },
        { id: 5, date: '2026-02-17', day: 'Martes', title: 'Cartas formales: estructura y fórmulas', theme: 2, content: [2, 3] },
        { id: 6, date: '2026-02-19', day: 'Jueves', title: 'Cartas de solicitud y reclamación', theme: 2, content: [3] },
        { id: 7, date: '2026-02-24', day: 'Martes', title: 'Textos creativos: descripción de sensaciones', theme: 3, content: [4] },
        { id: 8, date: '2026-02-26', day: 'Jueves', title: 'Valoraciones artísticas', theme: 3, content: [4, 5] },
        { id: 9, date: '2026-03-03', day: 'Martes', title: 'TALLER: Mini serie web (I)', theme: 'taller', workshop: 1 },
        { id: 10, date: '2026-03-05', day: 'Jueves', title: 'Textos de opinión: argumentación', theme: 4, content: [5, 6] },
        { id: 11, date: '2026-03-10', day: 'Martes', title: 'Conectores y marcadores discursivos', theme: 4, content: [6] },
        { id: 12, date: '2026-03-12', day: 'Jueves', title: 'Coherencia y cohesión textual', theme: 4, content: [6] },
        { id: 13, date: '2026-03-17', day: 'Martes', title: 'Textos expositivos: ser wikipedista', theme: 5, content: [7, 8] },
        { id: 14, date: '2026-03-19', day: 'Jueves', title: 'Precisión léxica: nominalización', theme: 5, content: [7] },
        { id: 15, date: '2026-03-24', day: 'Martes', title: 'TALLER: Olvidos de Granada (I)', theme: 'taller', workshop: 2 },
        { id: 16, date: '2026-04-07', day: 'Martes', title: 'Bienvenida post-vacaciones: Puesta al día social y lingüística', theme: 6, content: [16] },
        { id: 17, date: '2026-04-09', day: 'Jueves', title: 'La entrevista: Estructura y tipos (Entrevistas de trabajo, a expertos)', theme: 6, content: [17] },
        { id: 18, date: '2026-04-14', day: 'Martes', title: 'Estrategias de interacción: Preguntas abiertas y seguir el hilo', theme: 7, content: [18] },
        { id: 19, date: '2026-04-16', day: 'Jueves', title: 'El estilo indirecto: Transmitir mensajes y opiniones de otros', theme: 7, content: [19] },
        { id: 20, date: '2026-04-21', day: 'Martes', title: 'Estrategias de influencia: Aconsejar, sugerir y advertir', theme: 8, content: [20] },
        { id: 21, date: '2026-04-23', day: 'Jueves', title: 'Lenguaje persuasivo: Insistir en una petición y gestionar conflictos', theme: 8, content: [21] },
        { id: 22, date: '2026-04-28', day: 'Martes', title: 'La Conferencia (I): Apertura, captar atención y presentar la idea central', theme: 9, content: [22] },
        { id: 23, date: '2026-04-30', day: 'Jueves', title: 'La Conferencia (II): Desarrollo, énfasis en detalles y cierre efectivo', theme: 9, content: [23] },
        { id: 24, date: '2026-05-05', day: 'Martes', title: 'TALLER: Safari fotográfico (I)', theme: 'taller', workshop: 3 },
        { id: 25, date: '2026-05-07', day: 'Jueves', title: 'TALLER: Granada 2031 (I)', theme: 'taller', workshop: 4 },
        { id: 26, date: '2026-05-12', day: 'Martes', title: 'Crítica cinematográfica', theme: 10, content: [3, 4] },
        { id: 27, date: '2026-05-14', day: 'Jueves', title: 'Última clase: Presentaciones finales y despedida', theme: 11, content: [25] },
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
        { id: 16, title: 'Puesta al día social y lingüística' },
        { id: 17, title: 'Entrevistas: estructura y tipos' },
        { id: 18, title: 'Interacción: preguntas abiertas y seguimiento' },
        { id: 19, title: 'Estilo indirecto: transmitir mensajes y opiniones' },
        { id: 20, title: 'Estrategias de influencia: aconsejar, sugerir y advertir' },
        { id: 21, title: 'Lenguaje persuasivo y gestión de conflictos' },
        { id: 22, title: 'Conferencia: apertura y presentación de la idea central' },
        { id: 23, title: 'Conferencia: desarrollo, énfasis y cierre' },
        { id: 24, title: 'Descripción visual: safari fotográfico' },
        { id: 25, title: 'Presentaciones finales y despedida' },
    ],

    // Temas del curso
    themes: [
        { id: 1, title: 'Escribir un perfil', file: 'tema-01-perfil.html' },
        { id: 2, title: 'Cartas en el entorno laboral', file: 'tema-02-cartas.html' },
        { id: 3, title: 'Textos creativos', file: 'tema-03-creativos.html' },
        { id: 4, title: 'Textos de opinión', file: 'tema-04-opinion.html' },
        { id: 5, title: 'Textos expositivos', file: 'tema-05-expositivos.html' },
        { id: 6, title: 'Entrevistas', file: 'tema-06-entrevista.html' },
        { id: 7, title: 'Interacción y estilo indirecto', file: 'tema-07-proscontras.html' },
        { id: 8, title: 'Lenguaje persuasivo', file: 'tema-08-presentacion.html' },
        { id: 9, title: 'Conferencias', file: 'tema-09-foros.html' },
        { id: 10, title: 'Crítica cinematográfica', file: 'tema-10-critica.html' },
        { id: 11, title: 'Presentaciones finales', file: 'tema-11-periodisticos.html' },
    ],

    // Talleres
    workshops: [
        { id: 1, title: 'La mini serie web', file: 'taller-01-miniserie.html' },
        { id: 2, title: 'Olvidos de Granada', file: 'taller-02-olvidos.html' },
        { id: 3, title: 'Safari fotográfico', file: 'taller-03-safari.html' },
        { id: 4, title: 'Granada 2031, Capital Cultural', file: 'taller-04-granada2031.html' },
    ],

    // Parsear fecha local (evita desfases por zona horaria)
    getSessionDate(dateStr) {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    },

    getTodayDate() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today;
    },

    // Obtener sesión actual
    getCurrentSession() {
        const today = this.getTodayDate();

        const exact = this.sessions.find(session => this.getSessionDate(session.date).getTime() === today.getTime());
        if (exact) {
            return exact;
        }

        const firstDate = this.getSessionDate(this.sessions[0].date);
        if (today < firstDate) {
            return this.sessions[0];
        }

        const upcoming = this.sessions.find(session => this.getSessionDate(session.date) > today);
        if (upcoming) {
            return upcoming;
        }

        return this.sessions[this.sessions.length - 1];
    },

    // Obtener progreso del curso
    getCourseProgress() {
        const today = this.getTodayDate();
        let completed = 0;

        this.sessions.forEach(session => {
            if (this.getSessionDate(session.date) < today) {
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

    showBlockingError(message) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Conexión no disponible</h3>
                </div>
                <div class="modal-body">
                    <p>${message}</p>
                    <p>Actualiza la página cuando el backend esté activo.</p>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
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
        const registrationCode = data.get('registrationCode')?.trim();
        const password = data.get('password');
        const confirmPassword = data.get('confirmPassword');
        const level = data.get('level');

        if (!name || name.length < 2) {
            errors.push('El nombre debe tener al menos 2 caracteres');
        }

        if (!email || !Utils.isValidEmail(email)) {
            errors.push('Introduce un email válido');
        }

        if (!registrationCode) {
            errors.push('Introduce el código de inscripción');
        } else if (!CONFIG.USE_API && CONFIG.REGISTRATION_CODE && registrationCode !== CONFIG.REGISTRATION_CODE) {
            errors.push('El código de inscripción es incorrecto');
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

        return { valid: errors.length === 0, errors, data: { name, email, password, level, registrationCode } };
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
    // Inicializar autenticación primero
    Auth.init();

    // Verificar disponibilidad de la API de forma asíncrona (sin bloquear)
    const hasExistingSession = !!(Utils.storage.get('token') && Utils.storage.get('currentUser'));

    // Iniciar verificación de API en background
    API.checkAvailability().then(isAvailable => {
        console.log(`[Init] Verificación de API completada: ${isAvailable ? 'disponible' : 'no disponible'}`);

        // Si no hay API y no hay sesión, mostrar advertencia pero NO bloquear
        if (CONFIG.ENFORCE_API && !isAvailable && !hasExistingSession) {
            console.warn('[Init] Backend no disponible, pero permitiendo navegación');
            UI.notify('El backend está temporalmente desconectado. Algunas funciones pueden no estar disponibles.', 'warning', 5000);
        }

        // Si hay sesión previa pero API no disponible, advertir
        if (hasExistingSession && !isAvailable) {
            console.warn('[Init] Sesión existente detectada pero backend no disponible');
            UI.notify('Conectando con el servidor...', 'info', 3000);
        }
    }).catch(error => {
        console.warn('[Init] Error verificando API, continuando:', error.message);
    });

    // Verificar sesión del usuario
    await Auth.checkSession();
    UI.updateAuthUI();

    // Mostrar indicador de modo
    if (CONFIG.USE_API) {
        console.log('[Init] Producción Escrita C2 - Modo API (Backend conectado)');
    } else {
        console.log('[Init] Producción Escrita C2 - Buscando backend...');
    }

    // Menú móvil
    const menuToggle = document.getElementById('menu-toggle');
    const navMain = document.getElementById('nav-main');

    if (menuToggle && navMain) {
        menuToggle.addEventListener('click', () => {
            navMain.classList.toggle('active');
        });
    }

    // Cerrar menú al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (navMain && !navMain.contains(e.target) && !menuToggle?.contains(e.target)) {
            navMain.classList.remove('active');
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

    // Formulario de registro OAuth (para usuarios de Google/Apple)
    const oauthRegistrationForm = document.getElementById('oauth-registration-form');
    if (oauthRegistrationForm) {
        oauthRegistrationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const code = oauthRegistrationForm.querySelector('#registration-code').value.trim();
            const errorContainer = document.getElementById('registration-error');

            if (!code) {
                errorContainer.textContent = 'Introduce el código de registro';
                errorContainer.style.display = 'block';
                return;
            }

            const submitBtn = oauthRegistrationForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Procesando...';

            try {
                await Auth.completeOAuthRegistration(code);
            } catch (error) {
                errorContainer.textContent = error.message || 'Error al completar el registro';
                errorContainer.style.display = 'block';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Completar registro';
            }
        });
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

    console.log('[Init] Producción Escrita C2 - Aplicación iniciada');
});

// ==========================================================================
// Configuración de API (para uso desde consola)
// ==========================================================================

const APIConfig = {
    // Configurar URL del backend
    setUrl(url) {
        const normalized = normalizeApiUrl(url);
        if (!normalized) {
            console.warn('URL de API inválida:', url);
            return;
        }
        localStorage.setItem('pe_c2_api_url', normalized);
        CONFIG.API_URL = normalized;
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
    APIConfig
};
