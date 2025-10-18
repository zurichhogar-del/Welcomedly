// Constantes de mensajes del sistema

export const MESSAGES = {
    // Mensajes de éxito
    SUCCESS: {
        AGENT_CREATED: '✅ Agente creado exitosamente',
        AGENT_DELETED: '✅ Agente eliminado exitosamente',
        AGENT_UPDATED: '✅ Agente actualizado correctamente',
        AGENT_STATUS_CHANGED: (status) => `✅ Estado del agente actualizado a ${status ? 'Activo' : 'Inactivo'}`,

        CAMPAIGN_CREATED: (nombre, registros) => `✅ Campaña "${nombre}" creada exitosamente (${registros} contactos)`,
        CAMPAIGN_DELETED: '✅ Campaña eliminada exitosamente',
        CAMPAIGN_UPDATED: '✅ Campaña actualizada correctamente',

        FORM_CREATED: (nombre) => `✅ Formulario "${nombre}" creado exitosamente`,
        FORM_DELETED: '✅ Formulario eliminado exitosamente',
        FORM_UPDATED: '✅ Formulario actualizado correctamente',

        RECORD_ADDED: '✅ Registro agregado correctamente',
        RECORD_DELETED: '✅ Registro eliminado exitosamente',

        TYPIFICATION_SAVED: '✅ Tipificación guardada correctamente',

        LOGIN_SUCCESS: (username) => `✅ Bienvenido ${username}`,
        LOGOUT_SUCCESS: '✅ Sesión cerrada correctamente',
    },

    // Mensajes de error
    ERROR: {
        AGENT_NOT_FOUND: '⚠️ Agente no encontrado',
        AGENT_CREATE_FAILED: '❌ Error al crear el agente',
        AGENT_DELETE_FAILED: '❌ Error al eliminar el agente',
        AGENT_UPDATE_FAILED: '❌ Error al actualizar el agente',
        AGENT_ALREADY_EXISTS: '⚠️ El usuario ya existe',

        CAMPAIGN_NOT_FOUND: '⚠️ Campaña no encontrada',
        CAMPAIGN_CREATE_FAILED: '❌ Error al crear la campaña',
        CAMPAIGN_DELETE_FAILED: '❌ No se pudo eliminar la campaña',

        FORM_NOT_FOUND: '⚠️ Formulario no encontrado',
        FORM_CREATE_FAILED: '❌ Error al guardar el formulario',
        FORM_DELETE_FAILED: '❌ No se pudo eliminar el formulario',
        FORM_UPDATE_FAILED: '❌ Error al actualizar el formulario',
        FORM_NAME_EXISTS: '❌ Ya existe un formulario con ese nombre',
        FORM_MIN_FIELDS: '❌ Debe agregar al menos una opción de tipificación',

        RECORD_NOT_FOUND: '⚠️ Registro no encontrado',
        RECORD_ADD_FAILED: '❌ Error al guardar el registro',
        RECORD_LOAD_FAILED: '❌ Error al cargar los registros',
        RECORD_REQUIRED_FIELDS: '❌ Todos los campos obligatorios deben estar completos',

        CSV_UPLOAD_REQUIRED: '❌ Debes subir un archivo CSV',
        CSV_PROCESS_FAILED: '❌ Error al procesar el archivo CSV',
        CSV_ERRORS: (count) => `❌ Se encontraron ${count} errores en el archivo CSV`,

        LOGIN_INVALID_CREDENTIALS: '❌ Credenciales inválidas',
        LOGIN_ACCOUNT_INACTIVE: '⚠️ Tu cuenta está inactiva',
        LOGIN_FAILED: '❌ Error al iniciar sesión',

        UNAUTHORIZED: '⚠️ No tienes permisos para realizar esta acción',
        SESSION_EXPIRED: '⚠️ Tu sesión ha expirado',

        SERVER_ERROR: '❌ Error interno del servidor',
        DATABASE_ERROR: '❌ Error de base de datos',

        VALIDATION_FAILED: '❌ Error de validación',
        INVALID_INPUT: '❌ Datos de entrada inválidos',

        AGENTS_MIN_REQUIRED: '❌ Debes seleccionar al menos un agente',

        TYPIFICATION_REQUIRED: '❌ Debes seleccionar una tipificación válida',
        TYPIFICATION_SAVE_FAILED: '❌ Error al guardar la tipificación',
    },

    // Mensajes de información
    INFO: {
        NO_RECORDS: 'ℹ️ No hay registros disponibles',
        NO_CAMPAIGNS: 'ℹ️ No hay campañas creadas',
        NO_FORMS: 'ℹ️ No hay formularios creados',
        NO_AGENTS: 'ℹ️ No hay agentes disponibles',

        LOADING: '⏳ Cargando...',
        PROCESSING: '⏳ Procesando...',
    },

    // Mensajes de confirmación
    CONFIRM: {
        DELETE_AGENT: '¿Estás seguro de eliminar este agente?',
        DELETE_CAMPAIGN: '¿Estás seguro de eliminar esta campaña?',
        DELETE_FORM: '¿Estás seguro de eliminar este formulario?',
        DELETE_RECORD: '¿Estás seguro de eliminar este registro?',

        LOGOUT: '¿Deseas cerrar sesión?',
    }
};

// Constantes de configuración
export const CONFIG = {
    // Límites de paginación
    PAGINATION: {
        DEFAULT_PAGE_SIZE: 20,
        MAX_PAGE_SIZE: 100,
    },

    // Límites de archivos
    FILE: {
        MAX_CSV_SIZE: 10 * 1024 * 1024, // 10MB
        MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
        ALLOWED_CSV_MIMETYPES: ['text/csv', 'application/vnd.ms-excel'],
    },

    // Roles
    ROLES: {
        ADMIN: 'ADMIN',
        AGENT: 'AGENTE',
    },

    // Estados
    STATUS: {
        ACTIVE: true,
        INACTIVE: false,
    },
};

// Constantes de rutas
export const ROUTES = {
    AUTH: {
        LOGIN: '/auth/login',
        LOGOUT: '/auth/logout',
    },
    MARKET: {
        HOME: '/market/market',
        CAMPAIGNS: '/campaign/campanas',
        FORMS: '/market/formularios',
    },
    AGENTS: {
        LIST: '/agents/lista-agentes',
        CREATE: '/agents/crear-agente',
    },
};

export default { MESSAGES, CONFIG, ROUTES };
