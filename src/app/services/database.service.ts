import { Injectable } from '@angular/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private readonly databaseName = 'stockou_v2';
  private readonly sqlite = new SQLiteConnection(CapacitorSQLite);
  private db?: SQLiteDBConnection;
  private isInitializing = false;

  readonly isReady = new BehaviorSubject<boolean>(false);
  readonly lastError = new BehaviorSubject<string | null>(null);

  async initializePlugin(): Promise<void> {
    if (this.isReady.value || this.isInitializing) {
      return;
    }

    this.isInitializing = true;
    this.lastError.next(null);

    try {
      await this.initializeConnection();
      await this.createSchema();
      await this.migrateLegacyTables();
      this.isReady.next(true);
    } catch (error) {
      const message = this.getErrorMessage(error);
      console.error('Erreur d initialisation SQLite', error);
      this.lastError.next(message);
    } finally {
      this.isInitializing = false;
    }
  }

  async query<T = Record<string, unknown>>(statement: string, values: unknown[] = []): Promise<T[]> {
    const connection = this.getDbOrThrow();
    const result = await connection.query(statement, values);
    return (result.values ?? []) as T[];
  }

  async run(statement: string, values: unknown[] = []): Promise<number | undefined> {
    const connection = this.getDbOrThrow();
    const result = await connection.run(statement, values);
    return result.changes?.lastId;
  }

  async execute(statement: string): Promise<void> {
    const connection = this.getDbOrThrow();
    await connection.execute(statement);
  }

  async transaction<T>(handler: () => Promise<T>): Promise<T> {
    await this.execute('BEGIN TRANSACTION;');
    try {
      const result = await handler();
      await this.execute('COMMIT;');
      return result;
    } catch (error) {
      await this.execute('ROLLBACK;');
      throw error;
    }
  }

  getDb(): SQLiteDBConnection | null {
    return this.db ?? null;
  }

  private async initializeConnection(): Promise<void> {
    const platform = Capacitor.getPlatform();

    if (platform === 'web' || platform === 'electron') {
      await this.prepareWebStore();
    }

    try {
      await this.sqlite.checkConnectionsConsistency();
    } catch (error) {
      console.warn('Consistency check ignoree', error);
    }

    const hasConnection = await this.sqlite.isConnection(this.databaseName, false);
    this.db = hasConnection.result
      ? await this.sqlite.retrieveConnection(this.databaseName, false)
      : await this.sqlite.createConnection(this.databaseName, false, 'no-encryption', 1, false);

    await this.db.open();
  }

  private async prepareWebStore(): Promise<void> {
    let element = document.querySelector('jeep-sqlite') as HTMLElement | null;

    if (!element) {
      element = document.createElement('jeep-sqlite');
      document.body.appendChild(element);
      await customElements.whenDefined('jeep-sqlite');
    }

    element.setAttribute('wasmPath', 'assets');
    element.setAttribute('autoSave', 'true');

    const component = element as HTMLElement & { componentOnReady?: () => Promise<void> };
    if (component.componentOnReady) {
      await component.componentOnReady();
    }

    await this.sqlite.initWebStore();
  }

  private async createSchema(): Promise<void> {
    const queries = [
      `PRAGMA foreign_keys = ON;`,
      `CREATE TABLE IF NOT EXISTS produits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nom TEXT NOT NULL,
        reference TEXT NOT NULL UNIQUE,
        code_barre TEXT UNIQUE,
        prix_achat REAL NOT NULL DEFAULT 0,
        prix_vente REAL NOT NULL DEFAULT 0,
        stock INTEGER NOT NULL DEFAULT 0,
        stock_min INTEGER NOT NULL DEFAULT 0,
        image_path TEXT,
        created_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nom TEXT NOT NULL,
        telephone TEXT,
        adresse TEXT
      );`,
      `CREATE TABLE IF NOT EXISTS ventes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        total_ht REAL NOT NULL DEFAULT 0,
        total_ttc REAL NOT NULL DEFAULT 0,
        total_remise REAL NOT NULL DEFAULT 0,
        profit_total REAL NOT NULL DEFAULT 0,
        client_id INTEGER,
        FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE SET NULL
      );`,
      `CREATE TABLE IF NOT EXISTS vente_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vente_id INTEGER NOT NULL,
        produit_id INTEGER NOT NULL,
        quantite INTEGER NOT NULL,
        prix_unitaire REAL NOT NULL,
        remise REAL NOT NULL DEFAULT 0,
        total REAL NOT NULL DEFAULT 0,
        FOREIGN KEY(vente_id) REFERENCES ventes(id) ON DELETE CASCADE,
        FOREIGN KEY(produit_id) REFERENCES produits(id) ON DELETE RESTRICT
      );`,
      `CREATE TABLE IF NOT EXISTS parametres (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        nom_magasin TEXT NOT NULL DEFAULT 'Stockou',
        devise TEXT NOT NULL DEFAULT 'DT',
        logo_path TEXT
      );`,
      `CREATE TABLE IF NOT EXISTS clotures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date_ouverture TEXT NOT NULL,
        date_cloture TEXT NOT NULL,
        total_ventes REAL NOT NULL,
        total_profit REAL NOT NULL,
        nombre_ventes INTEGER NOT NULL,
        montant_theorique REAL NOT NULL,
        montant_saisi REAL,
        ecart REAL
      );`,
      `INSERT OR IGNORE INTO parametres (id, nom_magasin, devise, logo_path)
       VALUES (1, 'Stockou', 'DT', NULL);`,
      `CREATE INDEX IF NOT EXISTS idx_produits_nom ON produits(nom);`,
      `CREATE INDEX IF NOT EXISTS idx_produits_reference ON produits(reference);`,
      `CREATE INDEX IF NOT EXISTS idx_produits_code_barre ON produits(code_barre);`,
      `CREATE INDEX IF NOT EXISTS idx_ventes_date ON ventes(date);`,
      `CREATE INDEX IF NOT EXISTS idx_clotures_date ON clotures(date_cloture);`,
      `CREATE INDEX IF NOT EXISTS idx_vente_items_vente_id ON vente_items(vente_id);`,
      `CREATE INDEX IF NOT EXISTS idx_vente_items_produit_id ON vente_items(produit_id);`
    ];

    for (const q of queries) {
      await this.execute(q);
    }
  }

  private async migrateLegacyTables(): Promise<void> {
    const legacyProducts = await this.tableExists('products');
    const legacySales = await this.tableExists('sales');
    const legacySaleItems = await this.tableExists('sale_items');

    if (legacyProducts) {
      const current = await this.query<{ total: number }>('SELECT COUNT(*) AS total FROM produits');
      if ((current[0]?.total ?? 0) === 0) {
        await this.execute(`
          INSERT INTO produits (nom, reference, code_barre, prix_achat, prix_vente, stock, stock_min, image_path, created_at)
          SELECT
            name,
            reference,
            reference,
            COALESCE(purchase_price, 0),
            COALESCE(selling_price, 0),
            COALESCE(stock, 0),
            0,
            image_path,
            DATETIME('now')
          FROM products;
        `);
      }
    }

    if (legacySales && legacySaleItems) {
      const current = await this.query<{ total: number }>('SELECT COUNT(*) AS total FROM ventes');
      if ((current[0]?.total ?? 0) === 0) {
        await this.execute(`
          INSERT INTO ventes (id, date, total_ht, total_ttc, total_remise, profit_total)
          SELECT id, date, total_price, total_price, 0, total_profit
          FROM sales;

          INSERT INTO vente_items (vente_id, produit_id, quantite, prix_unitaire, remise, total)
          SELECT
            sale_id,
            product_id,
            quantity,
            selling_price,
            COALESCE(discount, 0),
            (quantity * selling_price) - COALESCE(discount, 0)
          FROM sale_items;
        `);
      }
    }
  }

  private async tableExists(name: string): Promise<boolean> {
    const rows = await this.query<{ count: number }>(
      "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = ?",
      [name]
    );

    return (rows[0]?.count ?? 0) > 0;
  }

  private getDbOrThrow(): SQLiteDBConnection {
    if (!this.db) {
      throw new Error('La base locale n est pas encore prete.');
    }

    return this.db;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Erreur inconnue de base de donnees.';
  }
}
