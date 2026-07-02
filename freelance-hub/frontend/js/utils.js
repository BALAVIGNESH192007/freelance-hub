// Small utility helpers for frontend formatting
export function formatNumber(value, options) {
    const val = value === undefined || value === null ? 0 : Number(value);
    if (Number.isNaN(val)) return '0';
    try {
        return new Intl.NumberFormat(undefined, options).format(val);
    } catch (e) {
        return String(val);
    }
}

export default { formatNumber };

export function formatDate(value, options) {
    try {
        if (value === undefined || value === null) return '';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return '';
        return new Intl.DateTimeFormat(undefined, options).format(d);
    } catch (e) {
        return '';
    }
}

export function formatTime(value, options) {
    try {
        if (value === undefined || value === null) return '';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return '';
        return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', ...options }).format(d);
    } catch (e) {
        return '';
    }
}