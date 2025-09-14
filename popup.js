/**
 * Logique de la popup d'import CSV pour Trello Power-Up
 */

class CSVImporter {
    constructor() {
        this.t = TrelloPowerUp.iframe();
        this.currentStep = 1;
        this.maxSteps = 5;
        this.apiToken = '';
        this.csvData = [];
        this.listId = null;
        this.apiKey = '65bfcc2b535466b79e76dcbbc235cbd6';
        
        this.init();
    }

    /**
     * Initialise l'interface et les événements
     */
    init() {
        this.setupEventListeners();
        this.updateTokenLink();
        this.getCurrentListId();
        this.updateStepVisibility();
    }

    /**
     * Configure tous les événements de l'interface
     */
    setupEventListeners() {
        // Navigation
        document.getElementById('next-step').addEventListener('click', () => this.nextStep());
        document.getElementById('prev-step').addEventListener('click', () => this.prevStep());
        document.getElementById('close-popup').addEventListener('click', () => this.closePopup());

        // Étape 1: Validation du token
        document.getElementById('validate-token').addEventListener('click', () => this.validateToken());
        document.getElementById('api-token').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.validateToken();
        });

        // Étape 2: Sélection du fichier
        document.getElementById('csv-file').addEventListener('change', (e) => this.handleFileSelect(e));

        // Étape 3: Import
        document.getElementById('import-csv').addEventListener('click', () => this.importCSV());
    }

    /**
     * Met à jour le lien pour obtenir le token API
     */
    updateTokenLink() {
        const authUrl = `https://trello.com/1/authorize?expiration=never&scope=read,write&response_type=token&key=${this.apiKey}`;
        document.getElementById('get-token-link').href = authUrl;
    }

    /**
     * Récupère l'ID de la liste courante
     */
    async getCurrentListId() {
        try {
            const context = await this.t.getContext();
            this.listId = context.list;
        } catch (error) {
            this.showError('Impossible de récupérer la liste courante');
        }
    }

    /**
     * Valide le token API Trello
     */
    async validateToken() {
        const token = document.getElementById('api-token').value.trim();
        
        if (!token) {
            this.showError('Veuillez saisir un token API');
            return;
        }

        try {
            // Test du token avec une requête simple
            const response = await fetch(`https://api.trello.com/1/members/me?key=${this.apiKey}&token=${token}`);
            
            if (!response.ok) {
                throw new Error('Token invalide ou expiré');
            }

            const userData = await response.json();
            this.apiToken = token;
            this.showSuccess(`Token validé pour ${userData.fullName || userData.username}`);
            
            setTimeout(() => this.nextStep(), 1500);
            
        } catch (error) {
            this.showError('Token API invalide ou erreur de connexion');
        }
    }

    /**
     * Gère la sélection d'un fichier CSV
     */
    handleFileSelect(event) {
        const file = event.target.files[0];
        
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.csv')) {
            this.showError('Veuillez sélectionner un fichier CSV valide');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.parseCSV(e.target.result);
                this.nextStep();
            } catch (error) {
                this.showError('Erreur lors de la lecture du fichier CSV');
            }
        };
        
        reader.onerror = () => {
            this.showError('Erreur lors de la lecture du fichier');
        };
        
        reader.readAsText(file, 'utf-8');
    }

    /**
     * Parse le contenu CSV
     */
    parseCSV(content) {
        const lines = content.split('\n').filter(line => line.trim());
        const skipHeader = document.getElementById('skip-header').checked;
        
    // On va stocker csvData sous forme d’objets plutôt que tableaux simples
    this.csvData = lines
      .slice(skipHeader ? 1 : 0)
      .map(line => {
        const [name, ...cols] = this.parseCSVLine(line);
        const priority = cols.pop().trim();          // on récupère la dernière colonne
        const description = cols.join('\n').trim();  // le reste compose la description
        return { name, description, priority };
      })
      .filter(row => row.name);
    
            this.displayPreview();
        }

    /**
     * Parse une ligne CSV en gérant les guillemets et virgules
     */
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current);
        return result.map(field => field.trim().replace(/^"|"$/g, ''));
    }

    /**
     * Affiche la prévisualisation des données CSV
     */
    displayPreview() {
      const preview = document.getElementById('csv-preview');
      const info    = document.getElementById('preview-info');
      if (!this.csvData.length) {
        preview.innerHTML = 'Aucune donnée trouvée';
        return;
      }
      let html = `
        | Nom de la carte | Description | Priorité |
        | --- | --- | --- |
      `;
      this.csvData.slice(0, 5).forEach(row => {
        html += `| ${this.escapeHtml(row.name)} | ${this.escapeHtml(row.description)} | ${this.escapeHtml(row.priority)} |\n`;
      });
      if (this.csvData.length > 5) {
        html += `… et ${this.csvData.length - 5} ligne(s) supplémentaire(s)\n`;
      }
      preview.innerHTML = html;
      info.textContent  = `${this.csvData.length} carte(s) seront créées`;
    }


    /**
     * Importe les données CSV vers Trello
     */
    async importCSV() {
        if (!this.csvData.length || !this.apiToken || !this.listId) {
            this.showError('Données manquantes pour l\'import');
            return;
        }

        this.currentStep = 4;
        this.updateStepVisibility();

        const total = this.csvData.length;
        let success = 0;
        let errors = 0;
        const errorDetails = [];

        this.updateProgress(0, total);
        this.updateStatus('Début de l\'import...');

        for (let i = 0; i < this.csvData.length; i++) {
            const row = this.csvData[i];
            const cardName = row[0];
            const cardDescription = row.slice(1).join('\n');

            try {
                await this.createTrelloCard(cardName, cardDescription);
                success++;
                this.updateStatus(`Carte créée: "${cardName}" (${i + 1}/${total})`);
            } catch (error) {
                errors++;
                errorDetails.push(`${cardName}: ${error.message}`);
                this.updateStatus(`Erreur avec "${cardName}" (${i + 1}/${total})`);
            }

            this.updateProgress(i + 1, total);
            
            // Petit délai pour éviter de surcharger l'API
            await this.delay(200);
        }

        this.showResults(success, errors, errorDetails);
        this.nextStep();
    }

    /**
     * Crée une carte Trello via l'API
     */
    async createTrelloCard({ name, description, priority }) {
      const labelIds = await this.getLabelIds(priority);
      const params = new URLSearchParams({
        key: this.apiKey,
        token: this.apiToken,
        idList: this.listId,
        name,
        desc: description,
        idLabels: labelIds.join(',')
      });
      const response = await fetch('https://api.trello.com/1/cards', {
        method: 'POST',
        body: params
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Erreur API (${response.status}): ${error}`);
      }
      return response.json();
    }
    
    // Nouvelle méthode pour récupérer ou créer l’étiquette correspondant à la priorité
    async getLabelIds(priority) {
      // Mapping simple priorité → couleur
      const colorMap = { Haute: 'red', Moyenne: 'yellow', Basse: 'green' };
      const color = colorMap[priority] || 'blue';
      // Récupère les labels du board via l’API Trello
      const res = await fetch(`https://api.trello.com/1/boards/${this.t.getContext().board}/labels?key=${this.apiKey}&token=${this.apiToken}`);
      const labels = await res.json();
      let label = labels.find(l => l.name === priority);
      if (label) return [label.id];
      // Sinon crée l’étiquette
      const createRes = await fetch('https://api.trello.com/1/labels', {
        method: 'POST',
        body: new URLSearchParams({
          key: this.apiKey,
          token: this.apiToken,
          idBoard: this.t.getContext().board,
          name: priority,
          color
        })
      });
      const newLabel = await createRes.json();
      return [newLabel.id];
    }


    /**
     * Affiche les résultats de l'import
     */
    showResults(success, errors, errorDetails) {
        const resultsDiv = document.getElementById('import-results');
        
        let html = `
            <div class="result-summary">
                <p><strong>${success}</strong> carte(s) créée(s) avec succès</p>
                ${errors > 0 ? `<p class="error-count"><strong>${errors}</strong> erreur(s)</p>` : ''}
            </div>
        `;

        if (errorDetails.length > 0) {
            html += '<div class="error-details"><h4>Détails des erreurs :</h4><ul>';
            errorDetails.forEach(error => {
                html += `<li>${this.escapeHtml(error)}</li>`;
            });
            html += '</ul></div>';
        }

        resultsDiv.innerHTML = html;
    }

    /**
     * Met à jour la barre de progression
     */
    updateProgress(current, total) {
        const percentage = (current / total) * 100;
        document.getElementById('progress-bar').style.width = `${percentage}%`;
    }

    /**
     * Met à jour le statut de l'import
     */
    updateStatus(message) {
        document.getElementById('import-status').textContent = message;
    }

    /**
     * Navigation entre les étapes
     */
    nextStep() {
        if (this.canProceedToNextStep()) {
            this.currentStep++;
            this.updateStepVisibility();
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStepVisibility();
        }
    }

    /**
     * Vérifie si on peut passer à l'étape suivante
     */
    canProceedToNextStep() {
        switch (this.currentStep) {
            case 1:
                return !!this.apiToken;
            case 2:
                return this.csvData.length > 0;
            case 3:
                return this.csvData.length > 0;
            default:
                return true;
        }
    }

    /**
     * Met à jour la visibilité des étapes et boutons
     */
    updateStepVisibility() {
        // Masquer toutes les étapes
        for (let i = 1; i <= this.maxSteps; i++) {
            const step = document.getElementById(`step-${i}`);
            if (step) {
                step.classList.toggle('active', i === this.currentStep);
            }
        }

        // Mettre à jour les boutons
        const prevBtn = document.getElementById('prev-step');
        const nextBtn = document.getElementById('next-step');
        const importBtn = document.getElementById('import-csv');
        const closeBtn = document.getElementById('close-popup');

        prevBtn.style.display = this.currentStep > 1 && this.currentStep < 4 ? 'inline-block' : 'none';
        nextBtn.style.display = this.currentStep < 3 ? 'inline-block' : 'none';
        importBtn.style.display = this.currentStep === 3 ? 'inline-block' : 'none';
        closeBtn.style.display = this.currentStep === 5 ? 'inline-block' : 'none';

        // Désactiver le bouton suivant si nécessaire
        nextBtn.disabled = !this.canProceedToNextStep();
    }

    /**
     * Ferme la popup
     */
    closePopup() {
        return this.t.closePopup();
    }

    /**
     * Affiche un message d'erreur
     */
    showError(message) {
        const errorDiv = document.getElementById('error-message');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        errorDiv.className = 'error-message show';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
            errorDiv.classList.remove('show');
        }, 5000);
    }

    /**
     * Affiche un message de succès
     */
    showSuccess(message) {
        const errorDiv = document.getElementById('error-message');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        errorDiv.className = 'success-message show';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
            errorDiv.classList.remove('show');
        }, 3000);
    }

    /**
     * Échappe les caractères HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Utilitaire pour créer un délai
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialisation quand le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
    new CSVImporter();
});
