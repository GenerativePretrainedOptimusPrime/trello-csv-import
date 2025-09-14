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
    this.boardId = null;
    this.apiKey = '65bfcc2b535466b79e76dcbbc235cbd6';  // Clé API unifiée avec manifest.json
    this.init();
  }

  /**
   * Initialise l'interface et les événements
   */
  init() {
    this.setupEventListeners();
    this.updateTokenLink();
    this.getCurrentContext();
    this.updateStepVisibility();
  }

  /**
   * Configure tous les événements de l'interface
   */
  setupEventListeners() {
    // Navigation entre étapes
    document.getElementById('next-step').addEventListener('click', () => this.nextStep());
    document.getElementById('prev-step').addEventListener('click', () => this.prevStep());
    document.getElementById('close-popup').addEventListener('click', () => this.closePopup());

    // Étape 1: Validation du token
    document.getElementById('validate-token').addEventListener('click', () => this.validateToken());
    document.getElementById('api-token').addEventListener('keypress', e => {
      if (e.key === 'Enter') this.validateToken();
    });

    // Étape 2: Sélection du fichier CSV
    document.getElementById('csv-file').addEventListener('change', e => this.handleFileSelect(e));

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
   * Récupère l'ID de la liste et du board courants
   */
  async getCurrentContext() {
    try {
      const context = await this.t.getContext();
      this.listId = context.list;
      this.boardId = context.board;
    } catch {
      this.showError('Impossible de récupérer le contexte Trello');
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
      const res = await fetch(`https://api.trello.com/1/members/me?key=${this.apiKey}&token=${token}`);
      if (!res.ok) throw new Error('Token invalide ou expiré');

      await res.json();
      this.apiToken = token;
      this.showSuccess('Token validé');
      setTimeout(() => this.nextStep(), 500);

    } catch {
      this.showError('Token API invalide ou erreur réseau');
    }
  }

  /**
   * Gère la sélection d'un fichier CSV
   */
  handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file || !file.name.toLowerCase().endsWith('.csv')) {
      this.showError('Sélectionnez un fichier CSV valide');
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      try {
        this.parseCSV(e.target.result);
        this.nextStep();
      } catch {
        this.showError('Erreur lors de la lecture du fichier CSV');
      }
    };
    reader.onerror = () => this.showError('Erreur lors de la lecture du fichier');
    reader.readAsText(file, 'utf-8');
  }

  /**
   * Parse le contenu CSV
   */
  parseCSV(content) {
    const lines = content.split('\n').filter(l => l.trim());
    const skip = document.getElementById('skip-header').checked;

    // On stocke csvData sous forme d’objets
    this.csvData = lines.slice(skip ? 1 : 0).map(line => {
      const cols = this.parseCSVLine(line);
      const name = cols[0] || '';
      const description = cols[1] || '';
      const priority = cols[2] || '';
      return { name, description, priority };
    }).filter(r => r.name);

    this.displayPreview();
  }

  /**
   * Parse une ligne CSV en gérant les guillemets et virgules
   */
  parseCSVLine(line) {
    const result = [];
    let curr = '', inQuotes = false;

    for (const ch of line) {
      if (ch === '"') inQuotes = !inQuotes;
      else if (ch === ',' && !inQuotes) {
        result.push(curr);
        curr = '';
      } else {
        curr += ch;
      }
    }
    result.push(curr);
    return result.map(f => f.trim().replace(/^"|"$/g, ''));
  }

  /**
   * Affiche la prévisualisation des données CSV
   */
  displayPreview() {
    const prev = document.getElementById('csv-preview');
    const info = document.getElementById('preview-info');
    if (!this.csvData.length) {
      prev.innerHTML = 'Aucune donnée trouvée';
      info.textContent = '';
      return;
    }
    let html = `| Nom de la carte | Description | Priorité |\n|---|---|---|\n`;
    this.csvData.slice(0, 5).forEach(r => {
      html += `| ${this.escapeHtml(r.name)} | ${this.escapeHtml(r.description)} | ${this.escapeHtml(r.priority)} |\n`;
    });
    if (this.csvData.length > 5) html += `… et ${this.csvData.length - 5} ligne(s) supplémentaire(s)\n`;
    prev.innerHTML = html;
    info.textContent = `${this.csvData.length} carte(s) seront créées`;
  }

  /**
   * Importe les données CSV vers Trello
   */
  async importCSV() {
      if (!this.csvData.length || !this.apiToken || !this.listId) {
        this.showError('Données manquantes');
        return;
      }
  
      this.currentStep = 4;
      this.updateStepVisibility();
  
      const total = this.csvData.length;
      let succ = 0, errs = 0, details = [];
  
      for (let i = 0; i < total; i++) {
        const { name, description, priority } = this.csvData[i];
        this.updateStatus(`Import de "${name}" (${i + 1}/${total})`);
        try {
          await this.createTrelloCard({ name, description, priority });
          succ++;
        } catch (e) {
          errs++;
          details.push(`${name}: ${e.message}`);
        }
        this.updateProgress(i + 1, total);
        await this.delay(200);
      }

  /**
   * Crée une carte Trello via l'API (avec étiquette priorité)
   */
     async createTrelloCard({ name, description, priority }) {
      // on ne demande les labels QUE si priorité non vide
      let labelParam = {};
      if (priority) {
        const labelIds = await this.getLabelIds(priority);
        if (labelIds.length) {
          labelParam.idLabels = labelIds.join(',');
        }
      }
      const params = new URLSearchParams({
        key: this.apiKey,
        token: this.apiToken,
        idList: this.listId,
        name,
        desc: description,
        ...labelParam
      });
      const res = await fetch('https://api.trello.com/1/cards', {
        method: 'POST',
        body: params
      });
      const text = await res.text();
      if (!res.ok) {
        // renvoyer le texte brut en message d'erreur
        throw new Error(text);
      }
      // tenter de parser le JSON uniquement si c'est valide
      try {
        return JSON.parse(text);
      } catch {
        return {};
      }
    }
    
  /**
   * Récupère ou crée l’étiquette correspondant à la priorité
   */
  async getLabelIds(priority) {
    const colorMap = { Haute: 'red', Moyenne: 'yellow', Basse: 'green' };
    const color = colorMap[priority] || 'blue';
    const { board } = await this.boardId;
    const res = await fetch(`https://api.trello.com/1/boards/${board}/labels?key=${this.apiKey}&token=${this.apiToken}`);
    const labels = await res.json();
    let lbl = labels.find(l => l.name === priority);
    if (lbl) return [lbl.id];
    const cr = await fetch('https://api.trello.com/1/labels', {
      method: 'POST',
      body: new URLSearchParams({
        key: this.apiKey,
        token: this.apiToken,
        idBoard: board,
        name: priority,
        color
      })
    });
    return [(await cr.json()).id];
  }

  /**
   * Affiche les résultats de l'import
   */
  showResults(s, e, det) {
    const div = document.getElementById('import-results');
    let html = `**${s}** carte(s) créée(s)`;
    if (e) html += `\n**${e}** erreur(s)\n${det.map(d => `* ${this.escapeHtml(d)}`).join('\n')}`;
    div.innerHTML = html;
  }

  /**
   * Met à jour la barre de progression
   */
  updateProgress(c, t) {
    document.getElementById('progress-bar').style.width = `${(c/t)*100}%`;
  }

  /**
   * Met à jour le statut de l'import
   */
  updateStatus(msg) {
    document.getElementById('import-status').textContent = msg;
  }

  // Navigation entre étapes
  nextStep() {
    if (this.canProceedToNextStep()) this.currentStep++;
    this.updateStepVisibility();
  }
  prevStep() {
    if (this.currentStep > 1) this.currentStep--;
    this.updateStepVisibility();
  }

  /**
   * Vérifie si on peut passer à l'étape suivante
   */
  canProceedToNextStep() {
    if (this.currentStep === 1) return !!this.apiToken;
    if (this.currentStep === 2) return this.csvData.length > 0;
    return true;
  }

  /**
   * Met à jour la visibilité des étapes et boutons
   */
  updateStepVisibility() {
    for (let i = 1; i <= this.maxSteps; i++) {
      document.getElementById(`step-${i}`).classList.toggle('active', i === this.currentStep);
    }
    document.getElementById('prev-step').style.display = this.currentStep > 1 && this.currentStep < 4 ? 'inline-block' : 'none';
    document.getElementById('next-step').style.display = this.currentStep < 3 ? 'inline-block' : 'none';
    document.getElementById('import-csv').style.display = this.currentStep === 3 ? 'inline-block' : 'none';
    document.getElementById('close-popup').style.display = this.currentStep === 5 ? 'inline-block' : 'none';
    document.getElementById('next-step').disabled = !this.canProceedToNextStep();
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
  showError(msg) {
    const e = document.getElementById('error-message');
    e.textContent = msg;
    e.className = 'error-message show';
    setTimeout(() => e.classList.remove('show'), 5000);
  }

  /**
   * Affiche un message de succès
   */
  showSuccess(msg) {
    const e = document.getElementById('error-message');
    e.textContent = msg;
    e.className = 'success-message show';
    setTimeout(() => e.classList.remove('show'), 3000);
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
    return new Promise(res => setTimeout(res, ms));
  }
}

// Initialisation quand le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
  new CSVImporter();
});
