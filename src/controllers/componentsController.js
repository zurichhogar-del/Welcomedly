/**
 * Components Showcase Controller - Sprint 3.0
 * Display and test all UI components
 */

class ComponentsController {
    /**
     * Show components showcase page
     */
    showComponentsPage(req, res) {
        res.render('componentsShowcase', {
            layout: 'layouts/modernLayout',
            usuario: req.session.usuario,
            session: req.session,
            title: 'Components Showcase - Sprint 3.0'
        });
    }
}

export default new ComponentsController();
