export interface Produit {
  id?: number;
  nom: string;
  reference: string;
  codeBarre?: string | null;
  prixAchat: number;
  prixVente: number;
  stock: number;
  stockMin: number;
  imagePath?: string | null;
  createdAt?: string;
}

export interface Client {
  id?: number;
  nom: string;
  telephone?: string | null;
  adresse?: string | null;
}

export interface ParametresMagasin {
  nomMagasin: string;
  devise: string;
  logoPath?: string | null;
}

export interface VenteLigne {
  produitId: number;
  quantite: number;
  prixUnitaire: number;
  remise: number;
  total?: number;
  produit?: Produit;
}

export interface Vente {
  id?: number;
  date: string;
  totalHt: number;
  totalTtc: number;
  totalRemise: number;
  profitTotal: number;
  clientId?: number | null;
  client?: Client | null;
  items?: VenteLigne[];
}

export interface ResumeVente {
  sousTotal: number;
  remiseTotale: number;
  totalFinal: number;
  profitTotal: number;
  quantiteArticles: number;
}

export interface TableauDeBord {
  chiffreAffairesJour: number;
  profitJour: number;
  nombreProduits: number;
  nombreVentesJour: number;
  valeurStockTotal: number;
  produitsStockFaible: Produit[];
  meilleuresVentes: Array<{
    produitId: number;
    nom: string;
    quantiteVendue: number;
    chiffreAffaires: number;
    profit: number;
  }>;
  dernieresVentes: Vente[];
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface AnalyticsDashboard {
  kpis: TableauDeBord;
  ventesParJour: ChartDataPoint[];
  ventesParMois: ChartDataPoint[];
  profitParJour: ChartDataPoint[];
  topProduits: ChartDataPoint[];
  repartitionVentes: ChartDataPoint[];
}

export interface Cloture {
  id?: number;
  dateOuverture: string;
  dateCloture: string;
  totalVentes: number;
  totalProfit: number;
  nombreVentes: number;
  montantTheorique: number;
  montantSaisi?: number;
  ecart?: number;
}
