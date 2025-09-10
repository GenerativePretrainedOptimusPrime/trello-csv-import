/**
 * CSV Import Power-Up pour Trello
 * Permet d'importer des tâches depuis un fichier CSV dans une liste Trello
 */

// Configuration globale
const POWER_UP_CONFIG = {
    APP_NAME: 'CSV Import',
    API_KEY: '8a9262f535095e08c9fb470372d1c72f',
    POPUP_HEIGHT: 500,
    POPUP_WIDTH: 600
};

if (!apiKey) {
  throw new Error("La variable d'environnement TRELLO_API_KEY n'est pas définie");
}

/**
 * Initialise le Power-Up Trello avec les capacités nécessaires
 */
TrelloPowerUp.initialize({
    'list-actions': function(t, options) {
        // Ajoute un bouton "Importer CSV" sur chaque liste
        return [{
            text: '📄 Importer CSV',
            callback: function(t) {
                return t.popup({
                    title: 'Importer des cartes depuis un CSV',
                    url: './popup.html',
                    height: POWER_UP_CONFIG.POPUP_HEIGHT,
                    width: POWER_UP_CONFIG.POPUP_WIDTH
                });
            }
        }];
    },

    'card-buttons': function(t, options) {
        // Ajoute un bouton sur les cartes pour des fonctionnalités futures
        return [{
            icon: 'https://cdn.jsdelivr.net/npm/feather-icons@4.28.0/dist/icons/upload.svg',
            text: 'Import CSV',
            callback: function(t) {
                return t.popup({
                    title: 'Importer des cartes depuis un CSV',
                    url: './popup.html',
                    height: POWER_UP_CONFIG.POPUP_HEIGHT,
                    width: POWER_UP_CONFIG.POPUP_WIDTH
                });
            },
            condition: 'edit'
        }];
    },

    'authorization-status': function(t, options) {
        // Vérifie si l'utilisateur est autorisé à utiliser l'API Trello
        return new Promise(function(resolve) {
            const token = t.getRestApi().getToken();
            resolve({
                authorized: !!token
            });
        });
    },

    'show-authorization': function(t, options) {
        // Affiche la popup d'autorisation si nécessaire
        return t.popup({
            title: 'Autorisation Trello requise',
            url: './auth.html',
            height: 300,
            width: 500
        });
    }
}, {
    appKey: POWER_UP_CONFIG.API_KEY,
    appName: POWER_UP_CONFIG.APP_NAME
});

/**
 * Utilitaires globaux pour le Power-Up
 */
window.PowerUpUtils = {
    /**
     * Affiche une notification à l'utilisateur
     */
    showNotification: function(t, message, type = 'success') {
        return t.alert({
            message: message,
            duration: 3000,
            display: type === 'error' ? 'error' : 'success'
        });
    },

    /**
     * Valide le format d'un token Trello
     */
    validateToken: function(token) {
        return token && typeof token === 'string' && token.length === 64;
    },

    /**
     * Récupère la liste courante
     */
    getCurrentList: function(t) {
        return t.getContext().list;
    }
};
