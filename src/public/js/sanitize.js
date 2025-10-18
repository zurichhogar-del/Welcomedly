import DOMPurify from 'dompurify';

/**
 * Función para sanitizar HTML y prevenir XSS
 * @param {string} html - HTML a sanitizar
 * @param {Object} options - Opciones de configuración de DOMPurify
 * @returns {string} HTML sanitizado seguro
 */
export function sanitizeHtml(html, options = {}) {
    const defaultOptions = {
        ALLOWED_TAGS: ['p', 'span', 'div', 'br', 'strong', 'em', 'b', 'i', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
        ALLOWED_ATTR: ['class', 'id', 'style', 'data-id', 'data-callback', 'for'],
        ALLOW_DATA_ATTR: true,
        KEEP_CONTENT: true,
        RETURN_DOM: false,
        RETURN_DOM_FRAGMENT: false,
        RETURN_DOM_IMPORT: false,
        SANITIZE_DOM: true,
        SAFE_FOR_TEMPLATES: false,
        WHOLE_DOCUMENT: false,
        CUSTOM_ELEMENT_HANDLING: {
            tagNameCheck: null,
            attributeNameCheck: null,
            allowCustomizedBuiltInElements: false
        }
    };

    const config = { ...defaultOptions, ...options };
    return DOMPurify.sanitize(html, config);
}

/**
 * Función para sanitizar texto que será insertado como HTML
 * @param {string} text - Texto a sanitizar
 * @returns {string} Texto escapado seguro para HTML
 */
export function escapeHtml(text) {
    if (typeof text !== 'string') {
        return '';
    }

    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };

    return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Función para crear elementos HTML de forma segura
 * @param {string} tagName - Nombre del tag HTML
 * @param {Object} attributes - Atributos del elemento
 * @param {string} textContent - Contenido de texto del elemento
 * @returns {HTMLElement} Elemento HTML creado
 */
export function createElementSecure(tagName, attributes = {}, textContent = '') {
    const element = document.createElement(tagName);

    // Solo permitir atributos seguros
    const allowedAttributes = ['class', 'id', 'style', 'type', 'name', 'value', 'placeholder', 'required', 'data-id', 'data-callback', 'for'];

    Object.keys(attributes).forEach(key => {
        if (allowedAttributes.includes(key)) {
            element.setAttribute(key, attributes[key]);
        }
    });

    if (textContent) {
        element.textContent = textContent; // Usar textContent en lugar de innerHTML para prevenir XSS
    }

    return element;
}