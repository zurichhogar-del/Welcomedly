/**
 * Helper para manejo de tokens CSRF en el frontend
 */

// Obtener token CSRF del meta tag
export function getCSRFToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
}

// Agregar token CSRF a headers de AJAX/Fetch
export function addCSRFToHeaders(headers = {}) {
    const token = getCSRFToken();
    if (token) {
        headers['X-CSRF-Token'] = token;
    }
    return headers;
}

// Configurar jQuery para incluir CSRF en todas las peticiones AJAX
export function setupCSRFForjQuery() {
    if (typeof $ !== 'undefined') {
        // Obtener token
        const token = getCSRFToken();

        if (token) {
            // Configurar headers por defecto para AJAX
            $.ajaxSetup({
                headers: {
                    'X-CSRF-Token': token
                }
            });
        }
    }
}

// Wrapper para fetch con CSRF
export function fetchWithCSRF(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...addCSRFToHeaders()
        }
    };

    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };

    return fetch(url, finalOptions);
}

// Para formularios (POST) - agregar campo oculto si no existe
export function ensureCSRFInForm(form) {
    if (!form) return;

    const existingInput = form.querySelector('input[name="_csrf"]');
    const token = getCSRFToken();

    if (token && !existingInput) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = '_csrf';
        input.value = token;
        form.appendChild(input);
    } else if (existingInput && token) {
        existingInput.value = token;
    }
}

// Agregar CSRF a todos los formularios existentes
export function addCSRFToAllForms() {
    const forms = document.querySelectorAll('form[method="POST"], form[method="post"]');
    forms.forEach(form => ensureCSRFInForm(form));
}

// Inicializar protección CSRF
export function initCSRFProtection() {
    // Configurar jQuery si está disponible
    if (typeof $ !== 'undefined') {
        setupCSRFForjQuery();
    }

    // Agregar CSRF a formularios existentes
    addCSRFToAllForms();

    // Observar nuevos formularios que se agreguen dinámicamente
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // Si es un formulario
                    if (node.tagName === 'FORM') {
                        ensureCSRFInForm(node);
                    }
                    // Si contiene formularios
                    const forms = node.querySelectorAll && node.querySelectorAll('form[method="POST"], form[method="post"]');
                    if (forms) {
                        forms.forEach(form => ensureCSRFInForm(form));
                    }
                }
            });
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}