export function reportesAgentes(req, res) {
    res.render("reportViews/reportes_agentes", { layout: 'layouts/generalLayout' });
}

export function reportesCampanas(req, res) {
    res.render("reportViews/reportes_campañas", { layout: 'layouts/generalLayout' });
}